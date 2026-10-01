(function () {
'use strict';
const {TAU,distance,cross,subtract,pointSegment,segmentsDistance,beltCenter}=window.MotioMath;
const pitchRadius=teeth=>teeth*3/TAU;
const ABcenter=beltCenter(270,pitchRadius(20),pitchRadius(60)),Ccenter=beltCenter(519,pitchRadius(20),pitchRadius(80));
const DESIGN=Object.freeze({
 base:{x:-90,y:-310,width:790,height:770,z:0,thickness:8},
 paper:{x:210,y:148.5,radius:263,z:30,thickness:4,width:420,height:297,margin:20,mass:2.5},
 A:{pivot:{x:550,y:148.5},motor:{x:550+ABcenter,y:148.5},crankZ:64,rodZ:84,bearings:[12,44],ratio:3,outputTeeth:60},
 B:{pivot:{x:210,y:-185},motor:{x:210,y:-185-ABcenter},crankZ:96,rodZ:116,bearings:[44,76],ratio:3,outputTeeth:60},
 C:{pivot:{x:210,y:148.5},motor:{x:210+Ccenter,y:148.5},bearings:[-36,8],ratio:4,outputTeeth:80},
 beltZ:-12,ABcenter,Ccenter,frameBraceX:90,rodWidth:20,rodHeight:20,crankWidth:16,crankHeight:8,
 towerRadius:22,clearance:3,penRadius:14,branch:-1,
 minSin:.25,maxRPM:8,maxPaperRPM:4,acceleration:.4,paperAcceleration:.2,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,motorDynamicTorque:.20,efficiency:.85,materialE:69000,tubeI:(20**4-17**4)/12
});
const DEFAULT_CONFIG=Object.freeze({rpmA:-6.486,rpmB:-4.528,rpmC:-4,phaseA:0,phaseB:0,radiusA:40,radiusB:40,lengthA:360,lengthB:340});
function solve(config,q) {
 const a={x:DESIGN.A.pivot.x+config.radiusA*Math.cos(q.A),y:DESIGN.A.pivot.y+config.radiusA*Math.sin(q.A)};
 const b={x:DESIGN.B.pivot.x+config.radiusB*Math.cos(q.B),y:DESIGN.B.pivot.y+config.radiusB*Math.sin(q.B)};
 const d=distance(a,b),la=config.lengthA,lb=config.lengthB;
 if(!Number.isFinite(d)||d<=1e-8||d>=la+lb||d<=Math.abs(la-lb))return {valid:false,a,b,reason:'Keten kan niet sluiten / dode stand'};
 const t=(la*la-lb*lb+d*d)/(2*d),h2=la*la-t*t;
 if(h2<=1e-8)return {valid:false,a,b,reason:'Samenvallende oplossing: singulariteit'};
 const h=Math.sqrt(h2)*DESIGN.branch,dx=(b.x-a.x)/d,dy=(b.y-a.y)/d;
 const pen={x:a.x+t*dx-h*dy,y:a.y+t*dy+h*dx};
 const ua={x:(pen.x-a.x)/la,y:(pen.y-a.y)/la},ub={x:(pen.x-b.x)/lb,y:(pen.y-b.y)/lb};
 const sin=Math.abs(cross(ua,ub)),gamma=Math.acos(Math.max(-1,Math.min(1,ua.x*ub.x+ua.y*ub.y)))*180/Math.PI;
 const dotA=ua.x*(-config.radiusA*Math.sin(q.A))+ua.y*config.radiusA*Math.cos(q.A);
 const dotB=ub.x*(-config.radiusB*Math.sin(q.B))+ub.y*config.radiusB*Math.cos(q.B);
 const determinant=cross(ua,ub);
 const J={ax:ub.y*dotA/determinant,ay:-ub.x*dotA/determinant,bx:-ua.y*dotB/determinant,by:ua.x*dotB/determinant};
 return {valid:true,a,b,pen,sin,gamma,J,serialA:Math.abs(dotA/config.radiusA),serialB:Math.abs(dotB/config.radiusB),closureMargin:Math.min(la+lb-d,d-Math.abs(la-lb))};
}
function inspect(config,q) {
 const pose=solve(config,q),issues=[];
 if(!pose.valid)return {...pose,safe:false,issues:[pose.reason],clearance:-Infinity};
 if(pose.sin<DESIGN.minSin)issues.push('Parallelle singulariteit: |sin γ| < 0,25');
 let minClear=Infinity;
 const check=(gap,label)=>{minClear=Math.min(minClear,gap);if(gap<DESIGN.clearance)issues.push(label);};
 // Capsule envelopes. Intentional joints E_A, E_B and P are excluded.
 const rods=[{a:pose.a,b:pose.pen,z:DESIGN.A.rodZ},{a:pose.b,b:pose.pen,z:DESIGN.B.rodZ}];
 const cranks=[{a:DESIGN.A.pivot,b:pose.a,z:DESIGN.A.crankZ},{a:DESIGN.B.pivot,b:pose.b,z:DESIGN.B.crankZ}];
 check(DESIGN.B.rodZ-DESIGN.A.rodZ-DESIGN.rodHeight,'Armen raken in hoogte');
 rods.forEach((rod,i)=>{
  check(rod.z-DESIGN.rodHeight/2-(DESIGN.paper.z+DESIGN.paper.thickness/2),'Arm raakt papierplaat');
  for(const crank of cranks){
   const vertical=Math.abs(rod.z-crank.z)-(DESIGN.rodHeight+DESIGN.crankHeight)/2;
   const horizontal=segmentsDistance(rod.a,rod.b,crank.a,crank.b)-(DESIGN.rodWidth+DESIGN.crankWidth)/2;
   check(Math.max(vertical,horizontal),'Arm raakt een kruk');
  }
  for(const key of ['A','B']) {
   const tower=DESIGN[key],top=tower.bearings[1]+4;
   check(Math.max(rod.z-DESIGN.rodHeight/2-top,pointSegment(tower.pivot,rod.a,rod.b)-DESIGN.towerRadius-DESIGN.rodWidth/2),'Arm raakt lagersteun '+key);
  }
  const base=DESIGN.base;
  for(const p of [rod.a,rod.b])check(Math.min(p.x-base.x,base.x+base.width-p.x,p.y-base.y,base.y+base.height-p.y)-10,'Arm buiten draagplaat');
  check(distance(pose.pen,DESIGN[i?'B':'A'].pivot)-DESIGN.towerRadius-DESIGN.penRadius,'Penhouder raakt vaste steun');
 });
 for(const key of ['A','B'])check(distance(DESIGN[key].pivot,DESIGN.paper)-DESIGN.paper.radius-DESIGN.towerRadius,'Papierplaat raakt vaste lagersteun');
 // Under-deck static layout: pulleys, motor bodies and bearing houses must clear frame rails.
 const base=DESIGN.base,rails=[{a:{x:base.x+10,y:base.y},b:{x:base.x+10,y:base.y+base.height}},{a:{x:base.x+base.width-10,y:base.y},b:{x:base.x+base.width-10,y:base.y+base.height}},{a:{x:DESIGN.frameBraceX,y:base.y},b:{x:DESIGN.frameBraceX,y:base.y+base.height}},{a:{x:base.x,y:base.y+10},b:{x:base.x+base.width,y:base.y+10}},{a:{x:base.x,y:base.y+base.height-10},b:{x:base.x+base.width,y:base.y+base.height-10}}];
 for(const key of ['A','B','C'])for(const rail of rails) {
  const d=DESIGN[key];
  check(pointSegment(d.motor,rail.a,rail.b)-21-10,'Motor '+key+' raakt onderframe');
  check(pointSegment(d.pivot,rail.a,rail.b)-pitchRadius(d.outputTeeth)-10,'Werkaspulley '+key+' raakt onderframe');
 }
 const force=DESIGN.dragForce/pose.sin;
 const torqueA=DESIGN.dragForce*Math.hypot(pose.J.ax,pose.J.ay)/1000+.025,torqueB=DESIGN.dragForce*Math.hypot(pose.J.bx,pose.J.by)/1000+.025;
 const torqueC=DESIGN.dragForce*distance(pose.pen,DESIGN.paper)/1000+DESIGN.paper.mass*(DESIGN.paper.radius/1000)**2/2*DESIGN.paperAcceleration+.03;
 const availableAB=DESIGN.motorDynamicTorque*3*DESIGN.efficiency,availableC=DESIGN.motorDynamicTorque*4*DESIGN.efficiency;
 if(torqueA>availableAB||torqueB>availableAB||torqueC>availableC)issues.push('Aangenomen koppelbudget overschreden');
 return {...pose,safe:!issues.length,issues,clearance:minClear,force,torqueA,torqueB,torqueC,availableAB,availableC};
}
function audit(config,resolution=72) {
 let failures=0,minSin=1,minClearance=Infinity,minGamma=180,maxGamma=0,maxForce=0,maxTorqueA=0,maxTorqueB=0,maxTorqueC=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,firstIssue='';
 for(let a=0;a<resolution;a++)for(let b=0;b<resolution;b++) {
  const p=inspect(config,{A:a*TAU/resolution,B:b*TAU/resolution,C:0});
  if(!p.safe){failures++;firstIssue ||= p.issues[0];}
  if(!p.valid)continue;
  minSin=Math.min(minSin,p.sin);minClearance=Math.min(minClearance,p.clearance);minGamma=Math.min(minGamma,p.gamma);maxGamma=Math.max(maxGamma,p.gamma);
  maxForce=Math.max(maxForce,p.force);maxTorqueA=Math.max(maxTorqueA,p.torqueA);maxTorqueB=Math.max(maxTorqueB,p.torqueB);maxTorqueC=Math.max(maxTorqueC,p.torqueC);
  minX=Math.min(minX,p.pen.x);maxX=Math.max(maxX,p.pen.x);minY=Math.min(minY,p.pen.y);maxY=Math.max(maxY,p.pen.y);
 }
 const d=distance(DESIGN.A.pivot,DESIGN.B.pivot),r=config.radiusA+config.radiusB,l=config.lengthA,m=config.lengthB,dmin=Math.max(0,d-r),dmax=d+r;
 const closureAll=dmin>Math.abs(l-m)&&dmax<l+m;
 const sinBound=closureAll ? Math.min(Math.sqrt(1-((l*l+m*m-dmin*dmin)/(2*l*m))**2),Math.sqrt(1-((l*l+m*m-dmax*dmax)/(2*l*m))**2)) : 0;
 const deflection=5*Math.max(l,m)**3/(3*DESIGN.materialE*DESIGN.tubeI),buckling=Math.PI**2*DESIGN.materialE*DESIGN.tubeI/Math.max(l,m)**2;
 return {samples:resolution**2,failures,firstIssue,minSin,minClearance,minGamma,maxGamma,maxForce,maxTorqueA,maxTorqueB,maxTorqueC,minX,maxX,minY,maxY,closureAll,sinBound,deflection,buckling};
}
const BOM=[
 ['M-A/B/C',3,'Stappenmotor','NEMA 17 · 42 × 42 × 48 · as Ø5','1,8° · 0,45 Nm houdkoppel','Drie aandrijvingen; 0,20 Nm dynamisch te verifiëren.'],
 ['BR',3,'Motorbeugel','Aluminium 5 mm · gaten 31 mm','Sleuf ±5 mm · M3 motor / M5 basis','Uitlijning en instelbare riemspanning.'],
 ['S-A/B',2,'Krukas','Geslepen staal Ø8 · circa 100 / 132 mm','Klemnaven · lagerafstand 32 mm','Arm- en riemlast naar frame.'],
 ['S-C',1,'Papierspindel','Staal Ø12 · circa 95 mm','Lagerafstand 44 mm · flens Ø60','Draagt plateau en kantelmoment.'],
 ['608',8,'Groefkogellager','608-2RS · 8 × 22 × 7 mm','4 aslagers + 2 ellebogen + 2 penlagers','Vrije draaipunten; onafhankelijke armen aan P.'],
 ['6001',2,'Spindellager','6001-2RS · 12 × 28 × 8 mm','Eén lokaliserend, één axiaal zwevend','Radiale en lichte axiale last; geen ongecontroleerde voorspanning.'],
 ['H',3,'Lagersteun','2 torens Ø44 / 1 spindelhuis','Aluminium · boringen in één opspanning','Parallelle assen; zittingen op fabrikantpassing afstemmen.'],
 ['P20',3,'Motorpulley','HTD 3M · 20T · Ø5 klemnaaf','Steekdiameter 19,10 mm · riem 9 mm','Geen losse tandwielparen.'],
 ['P60',2,'Krukpulley','HTD 3M · 60T · Ø8 klemnaaf','Steekdiameter 57,30 mm · reductie 3:1','Meer koppel en fijner uitgangsstappen.'],
 ['P80',1,'Papierpulley','HTD 3M · 80T · Ø12 klemnaaf','Steekdiameter 76,39 mm · reductie 4:1','Eigen trage papierrotatie.'],
 ['T-AB',2,'Gesloten tandriem','270-3M-09 · 90 tanden','Hartafstand '+ABcenter.toFixed(2)+' mm · circa 149° omwikkeling','Spanning volgens leverancier; geen overmatig voorspannen.'],
 ['T-C',1,'Gesloten tandriem','519-3M-09 · 173 tanden','Hartafstand '+Ccenter.toFixed(2)+' mm · circa 162° omwikkeling','Motor onder tafel; beschikbaarheid controleren.'],
 ['K-A/B',2,'Kruk','Aluminium 8 mm · hartafstand 40 mm','16 mm breed · split-klemnaaf Ø8','Star aan as; elleboog draait vrij.'],
 ['L-A/B',2,'Koppelarm','Aluminium koker 20 × 20 × 1,5 mm','A 360 / B 340 mm tussen lagercentra','Licht en stijf; metalen eindstukken.'],
 ['E',2,'Elleboog-schouderpost','Staal Ø8 schouder · M6 doorbout + borgmoer','608 · binnenring-spacers · vrij 360°','Korte uitkraging, geen vorkwand in de volledige armomloop.'],
 ['P',1,'Gemeenschappelijke penas','Ø8 schouderas · twee losse 608-zittingen','Armvlakken z84 / z116 · axiale shim 0,2–0,5 mm','Coaxiaal XY; geen starre hoekverbinding.'],
 ['PEN',1,'Veerbelaste penhouder','Pen Ø8–12 · verticale schuifbus','Circa 2 N druk · 5 mm veerweg · handlift','Schuift alleen Z; geen extra XY-geleiding.'],
 ['PL',1,'Papierplaat','Ø526 × 4 mm aluminium · flens Ø60','A3 420 × 297 · clips max. z36','Vlakheid en slingering bij bouw meten.'],
 ['BASE',1,'Draagplaat + onderframe','790 × 770 × 8 mm aluminium','2020 profielen + dwarssteun · 90 mm vrije hoogte','Stijve referentie zonder behuizing.'],
 ['FIX',1,'Montageset','M3/M5/M6 · paspennen · shims · askragen','Circa 12 M3 + 32 M5 + 6 M6; 6 askragen','Boutborging; spacers voorkomen lagerklemming.'],
 ['REF',3,'Referentievlag + sensorsteun','Eén per uitgaande as','Gecoördineerd referentiepad','Echte homing vereist sensoren; hier virtueel.']
];
window.MotioMechanics={DESIGN,DEFAULT_CONFIG,solve,inspect,audit,BOM,pitchRadius};
})();
