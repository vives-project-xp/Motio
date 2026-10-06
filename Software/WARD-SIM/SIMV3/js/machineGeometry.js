(function () {
'use strict';
const {TAU,beltCenter}=window.MotioMath;
// Length mm, angle rad, time s, force N, mass kg; motor calculations convert to SI.
const DEFAULT_CONFIG=Object.freeze({rpmA:-6.486,rpmB:-4.528,rpmC:-4,phaseA:0,phaseB:0,radiusA:40,radiusB:40,lengthA:360,lengthB:340,
 pivotAx:550,pivotAy:148.5,pivotBx:210,pivotBy:-185,paperX:210,paperY:148.5,paperRadius:263,paperWidth:420,paperHeight:297,paperMargin:20,paperThickness:4,paperMass:2.5,
 outputTeethA:60,outputTeethB:60,outputTeethC:80,motorTeeth:20,beltPitch:3,beltAB:270,beltC:519,motorDirectionA:0,motorDirectionB:-90,motorDirectionC:0,
 rodWidth:20,rodHeight:20,rodWall:1.5,materialE:69000,density:2700,crankWidth:16,crankHeight:8,rodZA:84,rodZB:116,crankZA:64,crankZB:96,
 baseX:-90,baseY:-310,baseWidth:790,baseHeight:770,baseThickness:8,frameBraceX:90,paperZ:30,clearance:3,branch:-1,
 maxRPM:8,maxPaperRPM:4,acceleration:.4,paperAcceleration:.2,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,efficiency:.85,frictionAB:.025,frictionC:.03,rotorInertia:0.0000068,pulleyInertia:0.00002,penMass:.10,
 penDiameter:10,penMinDiameter:6,penMaxDiameter:12,holderRadius:14,jointRadius:20,jointShaftRadius:10,jointBoreRadius:6.5,
 conditionCaution:10,conditionCritical:100,transmissionCaution:.20,transmissionCritical:.05,parallelStop:.10,workspaceStep:10,testResolution:48,positionTolerance:.5,deflectionLimit:.5,spindleBearingLow:-36,spindleBearingHigh:8});
const cache=new WeakMap();
function normalize(input={}) {
 const c={...DEFAULT_CONFIG,...input};
 for(const k of Object.keys(DEFAULT_CONFIG))if(!Number.isFinite(c[k]))throw Error('Ongeldige parameter: '+k);
 for(const k of ['radiusA','radiusB','lengthA','lengthB','paperRadius','paperWidth','paperHeight','paperThickness','paperMass','rodWidth','rodHeight','rodWall','materialE','density','efficiency','workspaceStep','baseWidth','baseHeight','penDiameter','motorTeeth','outputTeethA','outputTeethB','outputTeethC','beltPitch','beltAB','beltC'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 if(c.rodWall*2>=Math.min(c.rodWidth,c.rodHeight))throw Error('Kokerwand sluit de doorsnede');
 if(![-1,1].includes(c.branch)||c.clearance<0||c.efficiency>1)throw Error('Ongeldige branch, vrijloop of efficiëntie');
 if(c.penDiameter<c.penMinDiameter||c.penDiameter>c.penMaxDiameter||c.penMaxDiameter>=c.jointBoreRadius*2)throw Error('Pen past niet in doorlopende boring');
 if(c.paperMargin<0||c.paperMargin*2>=Math.min(c.paperWidth,c.paperHeight))throw Error('Ongeldige papiermarge');
 if(c.spindleBearingHigh-c.spindleBearingLow<16)throw Error('Papierspindel: lagerafstand te klein');
 for(const key of ['A','B','C'])if(c.motorCurves?.[key]) {
  const curve=c.motorCurves[key];
  if(!Array.isArray(curve.points)||curve.points.length<2||!curve.source)throw Error('Motorcurve vereist bron en minstens twee [RPM, Nm]-punten');
  curve.points.forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0)||(i&&p[0]<=curve.points[i-1][0]))throw Error('Motorcurve: oplopende RPM en niet-negatief koppel vereist');});
 }
 // A frozen snapshot prevents cached geometry drifting away from its configuration.
 for(const k of ['maxRPM','maxPaperRPM','acceleration','paperAcceleration','maxPenSpeed','maxPenAcceleration','positionTolerance','deflectionLimit'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 for(const k of ['dragForce','verticalForce','penMass','rotorInertia','pulleyInertia','frictionAB','frictionC'])if(c[k]<0)throw Error(k+' mag niet negatief zijn');
 if(c.workspaceStep<2||c.workspaceStep>50||c.testResolution<8||c.testResolution>180||!Number.isInteger(c.testResolution))throw Error('Workspace stap 2–50 mm; testresolutie 8–180 geheel');
 for(const k of ['motorTeeth','outputTeethA','outputTeethB','outputTeethC'])if(!Number.isInteger(c[k]))throw Error('Tandenaantal moet geheel zijn');
 if(!(0<c.transmissionCritical&&c.transmissionCritical<c.transmissionCaution&&c.transmissionCaution<1&&c.conditionCaution>1&&c.conditionCritical>c.conditionCaution&&c.parallelStop>0&&c.parallelStop<1))throw Error('Ongeldige singulariteitsgrenzen');
 const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 return freeze(structuredClone(c));
}
function build(c=DEFAULT_CONFIG) {
 if(cache.has(c))return cache.get(c);
 const pitchRadius=teeth=>teeth*c.beltPitch/TAU;
 const paper={x:c.paperX,y:c.paperY,radius:c.paperRadius,z:c.paperZ,thickness:c.paperThickness,width:c.paperWidth,height:c.paperHeight,margin:c.paperMargin,mass:c.paperMass};
 const g={...c,base:{x:c.baseX,y:c.baseY,width:c.baseWidth,height:c.baseHeight,z:0,thickness:c.baseThickness},paper,beltZ:-12,beltWidth:9,frameZ:-18,frameSize:20,frameHeight:90,towerRadius:22,
  motor:{width:42,length:48,shaftRadius:2.5,z:-54},bearingAB:{inner:4,outer:11,height:7},bearingP:{inner:10,outer:16,height:7},bearingC:{inner:6,outer:14,height:8},
  pen:{min:c.penMinDiameter,max:c.penMaxDiameter,radius:c.penDiameter/2,holderRadius:c.holderRadius,jointRadius:c.jointRadius,shaftRadius:c.jointShaftRadius,boreRadius:c.jointBoreRadius,clampZ:c.paperZ+28,knobRadius:8,knobReach:32},
  material:{name:'6061-T6 aluminium · ASSUMPTION',E:c.materialE,density:c.density},pitchRadius};
 for(const key of ['A','B','C']) {
  const pivot=key==='C'?{x:paper.x,y:paper.y}:{x:c['pivot'+key+'x'],y:c['pivot'+key+'y']};
  const teeth=c['outputTeeth'+key],length=key==='C'?c.beltC:c.beltAB,rs=pitchRadius(c.motorTeeth),rl=pitchRadius(teeth);
  if(teeth<c.motorTeeth||length<=TAU*rl)throw Error('Riemlengte / pulleyselectie '+key+' past niet');
  const center=beltCenter(length,rs,rl),angle=c['motorDirection'+key]*Math.PI/180;
  g[key]={pivot,motor:{x:pivot.x+center*Math.cos(angle),y:pivot.y+center*Math.sin(angle)},crankZ:c['crankZ'+key],rodZ:c['rodZ'+key],bearings:key==='C'?[c.spindleBearingLow,c.spindleBearingHigh]:[c['crankZ'+key]-52,c['crankZ'+key]-20],ratio:teeth/c.motorTeeth,outputTeeth:teeth,center,beltLength:length};
 }
 g.tubeArea=c.rodWidth*c.rodHeight-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall);
 g.tubeI=(c.rodWidth*c.rodHeight**3-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall)**3)/12;
 g.tubeIxy=(c.rodHeight*c.rodWidth**3-(c.rodHeight-2*c.rodWall)*(c.rodWidth-2*c.rodWall)**3)/12;
 cache.set(c,g);cache.set(g,g);return g;
}
// The same primitive envelopes feed 3D, sections, picking and collision checking.
function bodies(g,pose) {
 const all=[],add=(id,bom,group,shape,props)=>{all.push({id,bom,group,shape,...props});};
 const box=(id,bom,group,x,y,z,w,l,h)=>add(id,bom,group,'box',{x,y,z,w,l,h});
 const cyl=(id,bom,group,x,y,z,r,h,inner=0)=>add(id,bom,group,inner?'ring':'cylinder',{x,y,z,r,h,inner});
 const beam=(id,bom,group,a,b,z,w,h)=>add(id,bom,group,'beam',{a,b,z,w,h});
 const b=g.base;
 box('BASE','BASE','frame',b.x+b.width/2,b.y+b.height/2,b.thickness/2,b.width,b.height,b.thickness);
 for(const [i,y] of [b.y+10,b.y+b.height-10].entries())box('railY'+i,'BASE','frame',b.x+b.width/2,y,-18,b.width,20,20);
 for(const [i,x] of [b.x+10,b.x+b.width-10,g.frameBraceX].entries())box('railX'+i,'BASE','frame',x,b.y+b.height/2,-18,20,b.height,20);
 for(const x of [b.x+10,b.x+b.width-10])for(const y of [b.y+10,b.y+b.height-10])box('leg'+x+','+y,'BASE','frame',x,y,-55,20,20,70);
 for(const key of ['A','B','C']) {
  const d=g[key],m=d.motor,o=d.pivot;
  box('motor'+key,'M-'+key,'drive',m.x,m.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length);
  for(const sign of [-1,1]) {
   box('bracket'+key+sign,'BR','support',m.x+sign*19.5,m.y,-27.5,15,54,5);
   box('bracketCross'+key+sign,'BR','support',m.x,m.y+sign*19.5,-27.5,24,15,5);
   box('riser'+key+sign,'BR','support',m.x+(key==='B'?sign*27:0),m.y+(key==='B'?0:sign*27),-12.5,key==='B'?5:54,key==='B'?54:5,25);
  }
  cyl('motorShaft'+key,'M-'+key,'shaft',m.x,m.y,-18,2.5,24);
  cyl('pulleyM'+key,'P20','drive',m.x,m.y,g.beltZ,g.pitchRadius(g.motorTeeth),g.beltWidth);
  cyl('pulley'+key,'P-'+key,'drive',o.x,o.y,g.beltZ,g.pitchRadius(d.outputTeeth),g.beltWidth);
  const small=g.pitchRadius(g.motorTeeth),large=g.pitchRadius(d.outputTeeth),phi=Math.atan2(o.y-m.y,o.x-m.x),alpha=Math.asin((large-small)/d.center);
  for(const sign of [-1,1]){const t=phi+sign*(Math.PI/2+alpha);beam('belt'+key+sign,'T-'+key,'drive',{x:m.x+small*Math.cos(t),y:m.y+small*Math.sin(t)},{x:o.x+large*Math.cos(t),y:o.y+large*Math.sin(t)},g.beltZ,1.5,g.beltWidth);}
  for(const [i,z] of d.bearings.entries())cyl('bearing'+key+i,key==='C'?'6001':'608','bearing',o.x,o.y,z,key==='C'?14:11,key==='C'?8:7,key==='C'?6:4);
  if(key==='C'){
   // Two short seats leave the belt plane open. Side posts clear the large pulley.
   for(const [i,z] of d.bearings.entries())cyl('housingC'+i,'H-C','support',o.x,o.y,z,21,12,14);
   for(const sign of [-1,1])cyl('bearingCapC'+sign,'H-C','support',o.x,o.y,d.bearings[1]+sign*5,21,2,12);
   for(const sign of [-1,1])box('postC'+sign,'H-C','support',o.x,o.y+sign*(large+12),(d.bearings[0]+8)/2,10,10,8-d.bearings[0]);
   box('footC','H-C','support',o.x,o.y,d.bearings[0]-8,50,2*(large+17),8);
  } else {
   cyl('housing'+key,'H-'+key,'support',o.x,o.y,(8+d.bearings[1]+4)/2,22,d.bearings[1]-4,11);
   box('foot'+key,'H-'+key,'support',o.x,o.y,10.5,60,60,5);
  }
  const top=key==='C'?g.paper.z:d.crankZ+4,bottom=key==='C'?d.bearings[0]-29:-30;
  cyl('shaft'+key,'S-'+key,'shaft',o.x,o.y,(top+bottom)/2,key==='C'?6:4,top-bottom);
  // C upper bearing locates; lower outer ring has axial sliding allowance.
  const loc=key==='C'?d.bearings[1]:d.bearings[0];
  cyl('shoulder'+key,'FIX','shaft',o.x,o.y,loc+7,key==='C'?9:7,5);
  cyl('nut'+key,'FIX','shaft',o.x,o.y,loc-7,key==='C'?9:7,5);
 }
 const p=g.paper;
 cyl('flange','FL','platter',p.x,p.y,p.z-p.thickness/2-4,30,8);
 cyl('platter','PL','platter',p.x,p.y,p.z,p.radius,p.thickness);
 if(!pose?.valid)return all;
 for(const key of ['A','B']) {
  const d=g[key],e=key==='A'?pose.a:pose.b;
  beam('crank'+key,'K-'+key,'moving',d.pivot,e,d.crankZ,g.crankWidth,g.crankHeight);
  const L=g['length'+key],u={x:(pose.pen.x-e.x)/L,y:(pose.pen.y-e.y)/L};
  // Tube lands on the bearing carriers outside their bores; it cannot occupy the pen axis.
  beam('rod'+key,'L-'+key,'moving',{x:e.x+12*u.x,y:e.y+12*u.y},{x:pose.pen.x-(g.pen.jointRadius-2)*u.x,y:pose.pen.y-(g.pen.jointRadius-2)*u.y},d.rodZ,g.rodWidth,g.rodHeight);
  cyl('elbow'+key,'E','moving',e.x,e.y,(d.crankZ+d.rodZ+12)/2,4,d.rodZ-d.crankZ+24);
  for(const [id,pt] of [['E',e],['P',pose.pen]]) {
   cyl('end'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ,id==='P'?g.pen.jointRadius:14,g.rodHeight,id==='P'?16:11);
   cyl('joint'+id+key,id==='P'?'6804':'608','joint',pt.x,pt.y,d.rodZ,id==='P'?16:11,7,id==='P'?10:4);
  }
 }
 const pt=pose.pen,low=Math.min(g.A.rodZ,g.B.rodZ),high=Math.max(g.A.rodZ,g.B.rodZ),z=g.pen.clampZ;
 cyl('penSleeve','P','pen',pt.x,pt.y,(z+11+high+14)/2,g.pen.shaftRadius,high+14-z-11,g.pen.boreRadius);
 cyl('penSpacer','SP-P','pen',pt.x,pt.y,(low+high)/2,12,Math.max(0,high-low-7),10);
 cyl('penShoulder','SP-P','pen',pt.x,pt.y,low-6,12,5,10);
 cyl('penNut','SP-P','pen',pt.x,pt.y,high+6,12,5,10);
 cyl('holder','PEN','pen',pt.x,pt.y,z,g.pen.holderRadius,22,g.pen.boreRadius);
 cyl('centeringBush','PAD','pen',pt.x,pt.y,z,g.pen.boreRadius,22,g.pen.radius+.1);
 // Radial M4 screw, replaceable soft pad and knurled knob; hand operation only.
 const screwStart=g.pen.radius+2;
 box('clampScrew','CLAMP','pen',pt.x+(screwStart+33)/2,pt.y,z,33-screwStart,4,4);
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','CLAMP','pen',pt.x+29,pt.y,z,6,16,16);
 const tip=p.z+p.thickness/2+.2,penTop=high+32;
 cyl('pen','PEN','pen',pt.x,pt.y,(tip+penTop)/2,g.pen.radius,penTop-tip);
 return all;
}
window.MotioGeometry={DEFAULT_CONFIG,normalize,build,bodies};
})();
