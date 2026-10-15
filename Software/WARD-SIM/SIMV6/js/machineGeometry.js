(function () {
'use strict';
// Length mm, angle rad, time s, force N, mass kg; motor calculations convert to SI.
const DEFAULT_CONFIG=Object.freeze({patternId:'flower5',wordText:'MOTIO',rpmA:.8,rpmB:-.425,rpmC:-1.8,phaseA:49.0031578912355,phaseB:154.84031330144893,phaseC:0,radiusA:65,radiusB:65,lengthA:180,lengthB:160,
 pivotAx:280,pivotAy:180,pivotBx:160,pivotBy:100,paperX:150,paperY:280,paperRadius:105,paperMargin:10,paperThickness:4,paperMass:.45,
 stiffenerThickness:1.5,hubHeight:8,hubRadius:16,hubBoltRadius:Math.SQRT2*8,armHardwareMass:.03,crankDensity:1270,loadReserve:1.1,
 motorStepAngle:1.8,motorCurrent:1.68,motorVoltage:2.8,motorHoldingTorque:.36,motorWidth:42.3,motorLength:38,motorShaftDiameter:5,motorMountPitch:31,
 motorSupplyVoltage:24,motorDriveCurrent:1.68,motorStepsPerFullStep:16,motorCurveConditionsConfirmed:0,motorRadialLimit:28,motorRadialReference:20,motorAxialLimit:10,
 rodWidth:24,rodHeight:16,rodWall:3,materialE:1500,density:1270,crankWidth:24,crankHeight:6,rodZA:41,rodZB:62,crankZA:18,crankZB:27,
 baseX:0,baseY:0,baseWidth:358,baseHeight:404,baseThickness:4,boxHeight:108,wallThickness:4,frameBraceX:8,paperZ:24,clearance:3,branch:-1,
 // Direct 1:1 drive: motor and output have the same speed and direction.
 // Keep SIMV6 motion limits. The half-step datasheet curve cannot prove
 // capacity at these low speeds or with the default 1/16 driver setting.
 maxRPM:8,maxPaperRPM:16,acceleration:1,paperAcceleration:3,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,efficiency:.95,frictionAB:.025,frictionC:.03,rotorInertia:0.0000068,couplingInertia:0.0000005,penMass:.10,
 penDiameter:10,penMinDiameter:6,penMaxDiameter:12,holderRadius:14,jointRadius:20,jointShaftRadius:10,jointBoreRadius:6.5,
 conditionCaution:10,conditionCritical:100,transmissionCaution:.20,transmissionCritical:.05,parallelStop:.10,workspaceStep:10,testResolution:48,positionTolerance:.5,deflectionLimit:.5,reachAngle:-130});
const cache=new WeakMap();
function normalize(input={}) {
 const c={...DEFAULT_CONFIG,...input};
 // Imported SIMV6 configurations keep their motion settings; obsolete gearing
 // parameters cannot introduce a transmission into this direct-drive version.
 for(const k of ['outputTeethA','outputTeethB','outputTeethC','motorTeeth','gearModule','motorDirectionA','motorDirectionB','motorDirectionC','gearInertia','couplingRadius','couplingHeight','spindleBearingLow','spindleBearingHigh'])delete c[k];
 for(const k of Object.keys(DEFAULT_CONFIG))if(!['patternId','wordText'].includes(k)&&!Number.isFinite(c[k]))throw Error('Ongeldige parameter: '+k);
 if(typeof c.wordText!=='string')throw Error('Gebruik 1 tot 8 letters (A–Z).');
 c.wordText=c.wordText.trim().toUpperCase();
 if(!/^[A-Z]{1,8}$/.test(c.wordText))throw Error('Gebruik 1 tot 8 letters (A–Z), zonder spaties of cijfers.');
 if(typeof c.patternId!=='string'||(c.patternId&&window.MotioPatterns&&!window.MotioPatterns.get(c.patternId)))throw Error('Onbekend patroon');
 for(const k of ['radiusA','radiusB','lengthA','lengthB','paperRadius','paperThickness','paperMass','rodWidth','rodHeight','rodWall','materialE','density','efficiency','workspaceStep','baseWidth','baseHeight','baseThickness','boxHeight','wallThickness','penDiameter','stiffenerThickness','hubHeight','hubRadius','hubBoltRadius','crankDensity','loadReserve','motorStepAngle','motorCurrent','motorVoltage','motorWidth','motorLength','motorShaftDiameter','motorMountPitch','motorStepsPerFullStep','motorRadialLimit','motorRadialReference','motorAxialLimit'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 if(c.hubRadius<=c.hubBoltRadius+1.5||c.hubHeight<5||c.loadReserve<1)throw Error('Naafgeometrie of belastingsreserve ongeldig');
 if(![1,2,4,8,16,32].includes(c.motorStepsPerFullStep))throw Error('Microstepping: kies 1, 2, 4, 8, 16 of 32');
 if(c.boxHeight<=2*c.baseThickness||2*c.wallThickness>=Math.min(c.baseWidth,c.baseHeight))throw Error('Ongeldige box- of wandafmetingen');
 if(c.rodWall*2>=Math.min(c.rodWidth,c.rodHeight))throw Error('Kokerwand sluit de doorsnede');
 if(![-1,1].includes(c.branch)||c.clearance<0||c.efficiency>1)throw Error('Ongeldige branch, vrijloop of efficiëntie');
 if(c.penDiameter<c.penMinDiameter||c.penDiameter>c.penMaxDiameter||c.penMaxDiameter>=c.jointBoreRadius*2)throw Error('Pen past niet in doorlopende boring');
 if(c.paperMargin<0||c.paperMargin>=c.paperRadius)throw Error('Ongeldige papiermarge');

 for(const key of ['A','B','C'])if(c.motorCurves?.[key]) {
  const curve=c.motorCurves[key];
  if(!Array.isArray(curve.points)||curve.points.length<2||!curve.source)throw Error('Motorcurve vereist bron en minstens twee [RPM, Nm]-punten');
  curve.points.forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0)||(i&&p[0]<=curve.points[i-1][0]))throw Error('Motorcurve: oplopende RPM en niet-negatief koppel vereist');});
 }
 // A frozen snapshot prevents cached geometry drifting away from its configuration.
 for(const k of ['maxRPM','maxPaperRPM','acceleration','paperAcceleration','maxPenSpeed','maxPenAcceleration','positionTolerance','deflectionLimit'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 for(const k of ['dragForce','verticalForce','penMass','rotorInertia','couplingInertia','frictionAB','frictionC'])if(c[k]<0)throw Error(k+' mag niet negatief zijn');
 if(c.workspaceStep<2||c.workspaceStep>50||c.testResolution<8||c.testResolution>180||!Number.isInteger(c.testResolution))throw Error('Workspace stap 2–50 mm; testresolutie 8–180 geheel');
 if(![0,1].includes(c.motorCurveConditionsConfirmed))throw Error('Drivercondities moeten 0 of 1 zijn');
 if(!(0<c.transmissionCritical&&c.transmissionCritical<c.transmissionCaution&&c.transmissionCaution<1&&c.conditionCaution>1&&c.conditionCritical>c.conditionCaution&&c.parallelStop>0&&c.parallelStop<1))throw Error('Ongeldige singulariteitsgrenzen');
 const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 return freeze(structuredClone(c));
}
function build(c=DEFAULT_CONFIG) {
 if(cache.has(c))return cache.get(c);
 const paper={x:c.paperX,y:c.paperY,radius:c.paperRadius,safeRadius:c.paperRadius-c.paperMargin,z:c.paperZ,thickness:c.paperThickness,width:2*c.paperRadius,height:2*c.paperRadius,margin:c.paperMargin,mass:c.paperMass};
 const motorZ=-c.motorLength/2;
 const g={...c,base:{x:c.baseX,y:c.baseY,width:c.baseWidth,height:c.baseHeight,z:0,thickness:c.baseThickness},box:{height:c.boxHeight,wall:c.wallThickness,bottom:c.baseThickness-c.boxHeight},paper,driveSign:1,
  motor:{model:'SY42STH38-1684A',width:c.motorWidth,length:c.motorLength,shaftRadius:c.motorShaftDiameter/2,shaftLength:24,shaftMin:23,shaftMax:25,mountingPitch:c.motorMountPitch,mountingHole:'M3',holeDepth:4.5,bossRadius:11,bossHeight:4.5,z:motorZ},
  hub:{radius:c.hubRadius,height:c.hubHeight,boltRadius:c.hubBoltRadius,source:'goBILDA 1309-0016-0005',pilotRadius:7,pilotHeight:2,rootRadius:17,bore:c.motorShaftDiameter/2},bearingP:{inner:10,outer:16,height:7},
  pen:{min:c.penMinDiameter,max:c.penMaxDiameter,radius:c.penDiameter/2,holderRadius:c.holderRadius,jointRadius:c.jointRadius,shaftRadius:c.jointShaftRadius,boreRadius:c.jointBoreRadius,clampZ:Math.max(c.rodZA,c.rodZB)+c.rodHeight/2+c.clearance+13,knobRadius:8,knobReach:32},
  material:{name:'PETG · voorlopige printkeuze',E:c.materialE,density:c.density,verified:false},
  hardware:{motorBolt:10,washerM3:1,hubWasher:.5,hubBolt:12,plateBolt:10,stiffenerSize:60,stiffenerThickness:c.stiffenerThickness,flangeThickness:c.hubHeight,flangeRadius:c.hubRadius,flangePitch:c.hubBoltRadius}};
 for(const key of ['A','B','C']) {
  const pivot=key==='C'?{x:paper.x,y:paper.y}:{x:c['pivot'+key+'x'],y:c['pivot'+key+'y']};
  const top=key==='C'?paper.z-paper.thickness/2:c['crankZ'+key]-c.crankHeight/2;
  g[key]={pivot,motor:{...pivot},crankZ:c['crankZ'+key],rodZ:c['rodZ'+key],hubBottom:top-c.hubHeight,hubTop:top,ratio:1,motorSign:1};
 }
 g.mounting={threadEngagement:g.hardware.motorBolt-c.baseThickness-c.stiffenerThickness-g.hardware.washerM3,shaftAboveDeck:24-c.baseThickness,bossAboveDeck:4.5-c.baseThickness};
 g.tubeArea=c.rodWidth*c.rodHeight-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall);
 g.tubeI=(c.rodWidth*c.rodHeight**3-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall)**3)/12;
 g.tubeIxy=(c.rodHeight*c.rodWidth**3-(c.rodHeight-2*c.rodWall)*(c.rodWidth-2*c.rodWall)**3)/12;
 cache.set(c,g);cache.set(g,g);return g;
}
// The same primitive envelopes feed 3D, sections, picking and collision checking.
function bodies(g,pose,detail=true) {
 const all=[],add=(id,bom,group,shape,props)=>{
  if(!detail&&group==='fastener'&&!/^(elbow|crankFix)/.test(id))return;
  const instance=bom==='MOTOR'?'motor'+id.slice(-1):/^(E|K|L)-[ABC]$/.test(bom)?bom:id;
  all.push({id,bom,group,shape,instance,mount:bom,...props});
 };
 const box=(id,bom,group,x,y,z,w,l,h)=>add(id,bom,group,'box',{x,y,z,w,l,h});
 const cyl=(id,bom,group,x,y,z,r,h,inner=0)=>add(id,bom,group,inner?'ring':'cylinder',{x,y,z,r,h,inner});
 const beam=(id,bom,group,a,b,z,w,h)=>add(id,bom,group,'beam',{a,b,z,w,h});
 const b=g.base;
 const motorHoles=()=>[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*g.motor.mountingPitch/2,y:y*g.motor.mountingPitch/2,r:1.8,h:20})));
 const hubHoles=(angle,h,r=2)=>Array.from({length:4},(_,i)=>({x:g.hub.boltRadius*Math.cos(angle+Math.PI/4+i*Math.PI/2),y:g.hub.boltRadius*Math.sin(angle+Math.PI/4+i*Math.PI/2),r,h}));
 const bolt=(id,bom,mount,x,y,top,length,washer=.5,csk=false)=>{
  if(!detail&&!id.startsWith('crankFix'))return;
  add(id+'-stem',bom,'fastener','cylinder',{x,y,z:top+washer-length/2,r:(bom==='M3-BOLT'?1.5:2),h:length,mount,instance:id});
  add(id+'-head',bom,'fastener','cylinder',{x,y,z:csk?top-1:top+washer+(bom==='M3-BOLT'?1.5:2),r:csk?4:(bom==='M3-BOLT'?2.7:3.5),h:csk?2:(bom==='M3-BOLT'?3:4),mount,instance:id});
  if(washer)cyl(id+'-washer',bom==='M3-BOLT'?'M3-WASHER':'HUB-WASHER','fastener',x,y,top+washer/2,bom==='M3-BOLT'?4.5:4,washer,bom==='M3-BOLT'?1.7:2.2),all.at(-1).mount=mount;
 };
 box('BASE','BASE','frame',b.x+b.width/2,b.y+b.height/2,b.thickness/2,b.width,b.height,b.thickness);
 const deck=all.at(-1);deck.holes=[];
 for(const key of ['A','B','C']){
  const o=g[key].pivot;
  deck.holes.push({x:o.x-deck.x,y:o.y-deck.y,r:11.25,h:b.thickness+2},...motorHoles().map(h=>({...h,x:h.x+o.x-deck.x,y:h.y+o.y-deck.y})));
 }
 const wall=g.box.wall,lo=g.box.bottom+b.thickness,wallHeight=-lo;
 box('box-bottom','BOTTOM','frame',b.x+b.width/2,b.y+b.height/2,g.box.bottom+b.thickness/2,b.width,b.height,b.thickness);
 box('box-back','WALL-FB','frame',b.x+b.width/2,b.y+wall/2,lo/2,b.width,wall,wallHeight);
 box('box-front','WALL-FB','frame',b.x+b.width/2,b.y+b.height-wall/2,lo/2,b.width,wall,wallHeight);
 box('box-left','WALL-LR','frame',b.x+wall/2,b.y+b.height/2,lo/2,wall,b.height-2*wall,wallHeight);
 box('box-right','WALL-LR','frame',b.x+b.width-wall/2,b.y+b.height/2,lo/2,wall,b.height-2*wall,wallHeight);
 for(const key of ['A','B','C']) {
  const d=g[key],o=d.pivot,a=pose?.q?.[key]||0;
  box('motor'+key,'MOTOR','drive',o.x,o.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length);
  all.at(-1).holes=motorHoles().map(h=>({...h,z:g.motor.length/2-g.motor.holeDepth/2,r:1.5,h:g.motor.holeDepth}));
  cyl('motorShaft'+key,'MOTOR','shaft',o.x,o.y,12,g.motor.shaftRadius,24);
  cyl('motorBoss'+key,'MOTOR','shaft',o.x,o.y,2.25,11,4.5,g.motor.shaftRadius);
  box('stiffener'+key,'REINF','support',o.x,o.y,b.thickness+g.stiffenerThickness/2,g.hardware.stiffenerSize,g.hardware.stiffenerSize,g.stiffenerThickness);
  all.at(-1).holes=[{x:0,y:0,r:11.25,h:10},...motorHoles()];
  for(const x of [-1,1])for(const y of [-1,1])bolt('motorFix'+key+x+','+y,'M3-BOLT','MOTOR-FIX',o.x+x*15.5,o.y+y*15.5,b.thickness+g.stiffenerThickness,g.hardware.motorBolt,g.hardware.washerM3);
  cyl('hub'+key,'HUB','drive',o.x,o.y,(d.hubBottom+d.hubTop)/2,g.hub.radius,g.hub.height,g.hub.bore);
  // Simplified vendor envelope: Ø32 × 8 body, Ø14 × 2 pilot facing DOWN.
  // Two tangential M4 pinch bolts close the split bore; neither presses on the shaft.
  const clampAngle=a+Math.PI/4,u={x:Math.cos(clampAngle),y:Math.sin(clampAngle)},v={x:-u.y,y:u.x};
  const holes=[...hubHoles(a,g.hub.height+2)];
  for(const sign of [-1,1]){
   holes.push({axis:'x',angle:clampAngle+Math.PI/2,x:sign*5*u.x,y:sign*5*u.y,r:2.1,h:34});
   holes.push({axis:'x',angle:clampAngle+Math.PI/2,x:sign*5*u.x-sign*12*v.x,y:sign*5*u.y-sign*12*v.y,r:3.6,h:10});
  }
  const slots=[-1,1].map(sign=>({x:sign*4.9*u.x,y:sign*4.9*u.y,w:5.2,l:.6,angle:clampAngle}));
  Object.assign(all.at(-1),{instance:'hub'+key,mount:'HUB-'+key,assemblyGroup:'unit'+key,holes,slots});
  cyl('hubPilot'+key,'HUB','drive',o.x,o.y,d.hubBottom-1,g.hub.pilotRadius,2,g.hub.bore);
  Object.assign(all.at(-1),{instance:'hub'+key,mount:'HUB-'+key,assemblyGroup:'unit'+key,slots});
  if(detail)for(const sign of [-1,1]){
   const id='hubClamp'+key+(sign<0?0:1),common={axis:'x',angle:clampAngle+Math.PI/2,mount:'HUB-LOCK-'+key,instance:id,approachSign:-sign};
   add(id+'-stem','HUB-CLAMP','fastener','cylinder',{...common,x:o.x+sign*5*u.x,y:o.y+sign*5*u.y,z:(d.hubBottom+d.hubTop)/2,r:2,h:14});
   add(id+'-head','HUB-CLAMP','fastener','cylinder',{...common,x:o.x+sign*5*u.x-sign*9*v.x,y:o.y+sign*5*u.y-sign*9*v.y,z:(d.hubBottom+d.hubTop)/2,r:3.5,h:4});
  }
 }
 const p=g.paper,angle=pose?.q?.C||0;
 cyl('platter','PL','platter',p.x,p.y,p.z,p.radius,p.thickness);
 Object.assign(all.at(-1),{assemblyGroup:'unitC',holes:[{x:0,y:0,r:2.8,h:p.thickness+2},...hubHoles(angle,p.thickness+2,2.2),...hubHoles(angle,2.02,4.1).map(h=>({...h,z:p.thickness/2-1}))]});
 for(let i=0;i<4;i++){
  const a=angle+Math.PI/4+i*Math.PI/2,id='plateFix'+i;
  bolt(id,'PL-BOLT','PL-FIX',p.x+g.hub.boltRadius*Math.cos(a),p.y+g.hub.boltRadius*Math.sin(a),p.z+p.thickness/2,g.hardware.plateBolt,0,true);
  all.filter(v=>v.instance===id).forEach(v=>v.assemblyGroup='unitC');
 }
 cyl('paper','PAPER','paper',p.x,p.y,p.z+p.thickness/2+.1,p.radius,.2);
 if(!pose?.valid)return all;
 for(const key of ['A','B']) {
  const d=g[key],e=key==='A'?pose.a:pose.b;
  const uK={x:(e.x-d.pivot.x)/g['radius'+key],y:(e.y-d.pivot.y)/g['radius'+key]},trim=Math.min(5,g['radius'+key]/3),rootTrim=Math.min(12,g['radius'+key]/3);
  beam('crank'+key,'K-'+key,'moving',{x:d.pivot.x+rootTrim*uK.x,y:d.pivot.y+rootTrim*uK.y},{x:e.x-trim*uK.x,y:e.y-trim*uK.y},d.crankZ,g.crankWidth,g.crankHeight);
  const angle=pose.q[key];
  cyl('crankHub'+key,'K-'+key,'moving',d.pivot.x,d.pivot.y,d.crankZ,g.hub.rootRadius,g.crankHeight,2.8);
  all.at(-1).holes=hubHoles(angle,g.crankHeight+2,2.2);
  cyl('crankEnd'+key,'K-'+key,'moving',e.x,e.y,d.crankZ,12,g.crankHeight,3.3);
  for(let i=0;i<4;i++){
   const a=angle+Math.PI/4+i*Math.PI/2,id='crankFix'+key+i;
   bolt(id,'HUB-BOLT','K-FIX-'+key,d.pivot.x+g.hub.boltRadius*Math.cos(a),d.pivot.y+g.hub.boltRadius*Math.sin(a),d.crankZ+g.crankHeight/2,g.hardware.hubBolt,.5);
   all.filter(v=>v.instance===id||v.id===id+'-washer').forEach(v=>v.assemblyGroup='unit'+key);
  }
  all.filter(v=>v.bom==='K-'+key).forEach(v=>v.assemblyGroup='unit'+key);
  const L=g['length'+key],u={x:(pose.pen.x-e.x)/L,y:(pose.pen.y-e.y)/L};
  // Tube lands on the bearing carriers outside their bores; it cannot occupy the pen axis.
  beam('rod'+key,'L-'+key,'moving',{x:e.x+12*u.x,y:e.y+12*u.y},{x:pose.pen.x-(g.pen.jointRadius-2)*u.x,y:pose.pen.y-(g.pen.jointRadius-2)*u.y},d.rodZ,g.rodWidth,g.rodHeight);
  const top=d.crankZ+g.crankHeight/2,seat=d.rodZ-3.5;
  cyl('elbow'+key,'E-'+key,'moving',e.x,e.y,(top+seat)/2,5,seat-top);
  cyl('elbowJournal'+key,'E-'+key,'moving',e.x,e.y,d.rodZ,4,7);
  cyl('elbowThread'+key,'E-'+key,'moving',e.x,e.y,d.rodZ+11.75,3,16.5);
  cyl('elbowLowerThread'+key,'E-'+key,'moving',e.x,e.y,top-6.5,3,13);
  for(const sign of [-1,1]){
   const z=sign<0?d.crankZ-g.crankHeight/2:d.rodZ+g.rodHeight/2;
   add('elbowWasher'+key+sign,'M6-WASHER','fastener','ring',{x:e.x,y:e.y,z:z+sign*.5,r:6,inner:3.2,h:1,mount:sign<0?'ELBOW-LOW':'ELBOW-FIX'});
   add('elbowNut'+key+sign,'M6-NUT','fastener','ring',{x:e.x,y:e.y,z:z+sign*3.5,r:5.5,inner:3,h:5,mount:sign<0?'ELBOW-LOW':'ELBOW-FIX',segments:6});
  }
  cyl('elbowSpacer'+key,'E-SPACER','moving',e.x,e.y,d.rodZ+(3.5+g.rodHeight/2)/2,6,g.rodHeight/2-3.5,3.2);
  all.at(-1).mount='ELBOW-FIX';
  for(const [id,pt] of [['E',e],['P',pose.pen]]) {
   cyl('end'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ,id==='P'?g.pen.jointRadius:15,g.rodHeight,id==='P'?16:11);
   cyl('armShoulder'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ-(3.5+g.rodHeight/2)/2,id==='P'?16:11,g.rodHeight/2-3.5,id==='P'?12.3:6.3);
   cyl('joint'+id+key,id==='P'?'6804':'608','joint',pt.x,pt.y,d.rodZ,id==='P'?16:11,7,id==='P'?10:4);
  }
 }
 const pt=pose.pen,low=Math.min(g.A.rodZ,g.B.rodZ),high=Math.max(g.A.rodZ,g.B.rodZ),z=g.pen.clampZ;
 const sleeveBottom=low-8.5,sleeveTop=z-3;
 cyl('penSleeve','P','pen',pt.x,pt.y,(sleeveBottom+sleeveTop)/2,g.pen.shaftRadius,sleeveTop-sleeveBottom,g.pen.boreRadius);
 cyl('penSpacer','SP-P','pen',pt.x,pt.y,(low+high)/2,12,Math.max(0,high-low-7),10);
 cyl('penShoulder','P-LOCK','pen',pt.x,pt.y,low-6,12,5,10);
 cyl('penNut','P-LOCK','pen',pt.x,pt.y,high+6,12,5,10);
 cyl('holder','PEN','pen',pt.x,pt.y,z,g.pen.holderRadius,22,g.pen.boreRadius);
 all.at(-1).holes=[{x:0,y:0,z:-7,r:10,h:8.02},{axis:'x',x:10,y:0,z:0,r:2.1,h:12},{axis:'x',x:7,y:0,z:0,r:4.4,h:5}];
 cyl('centeringBush','BUSH','pen',pt.x,pt.y,z+4,g.pen.boreRadius,14,g.pen.radius+.1);
 all.at(-1).holes=[{axis:'x',x:5.5,y:0,z:-4,r:4.4,h:8}];
 all.at(-1).instance='penBush';
 cyl('bushFlange','BUSH','pen',pt.x,pt.y,z+11.5,8,1,g.pen.radius+.1);
 all.at(-1).instance='penBush';
 // Radial M4 screw, replaceable soft pad and knurled knob; hand operation only.
 const screwStart=g.pen.radius+2;
 add('clampScrew','CLAMP-SCREW','pen','cylinder',{x:pt.x+(screwStart+32)/2,y:pt.y,z,r:2,h:32-screwStart,axis:'x'});
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','KNOB','pen',pt.x+29,pt.y,z,6,16,16);
 const tip=p.z+p.thickness/2+.2,penTop=z+21;
 cyl('pen','PEN-TOOL','pen',pt.x,pt.y,(tip+penTop)/2,g.pen.radius,penTop-tip);
 return all;
}
// Shared exterior bounds for the isolated component view and compound BOM dimensions.
function bounds(parts){
 const limits=parts.map(b=>{
  const a=b.angle||0,beam=b.shape==='beam';
  return {x:beam?(b.a.x+b.b.x)/2:b.x,y:beam?(b.a.y+b.b.y)/2:b.y,z:b.z,
   w:beam?Math.abs(b.b.x-b.a.x)+b.w:b.axis==='x'?Math.abs(Math.cos(a))*b.h+Math.abs(Math.sin(a))*2*b.r:b.w||2*b.r,
   l:beam?Math.abs(b.b.y-b.a.y)+b.w:b.axis==='x'?Math.abs(Math.sin(a))*b.h+Math.abs(Math.cos(a))*2*b.r:b.l||2*b.r,h:b.axis==='x'?2*b.r:b.h};
 });
 const result={};for(const [axis,size] of [['x','w'],['y','l'],['z','h']]){
  const lo=Math.min(...limits.map(b=>b[axis]-b[size]/2)),hi=Math.max(...limits.map(b=>b[axis]+b[size]/2));result[axis]=(lo+hi)/2;result[size]=hi-lo;
 }return result;
}
// Small polygon cuts for visible drilled passages. No CSG dependency or thread model.
// Planes use n·p <= d; subtracting a convex hole leaves convex drawable fragments.
function clipPolygon(points,plane){
 const out=[],distance=p=>plane.x*p.x+plane.y*p.y+plane.z*p.z-plane.d;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],da=distance(a),db=distance(b),ina=da<=1e-8,inb=db<=1e-8;
  if(ina)out.push(a);
  if(ina!==inb){const t=da/(da-db);out.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)});}
 }
 if(out.length<3)return [];
 const area={x:0,y:0,z:0};
 for(let i=0;i<out.length;i++){const a=out[i],b=out[(i+1)%out.length];area.x+=a.y*b.z-a.z*b.y;area.y+=a.z*b.x-a.x*b.z;area.z+=a.x*b.y-a.y*b.x;}
 return Math.hypot(area.x,area.y,area.z)>1e-7?out:[];
}
function subtractPolygon(points,planes){
 if(points.length<3)return [];
 if(planes.some(n=>points.every(p=>n.x*p.x+n.y*p.y+n.z*p.z>n.d-1e-8)))return [points];
 const pieces=[];let inside=points;
 for(const plane of planes){
  if(inside.length<3)break;
  const outside=clipPolygon(inside,{x:-plane.x,y:-plane.y,z:-plane.z,d:-plane.d});
  if(outside.length>=3)pieces.push(outside);
  inside=clipPolygon(inside,plane);
 }
 return pieces;
}
function prism(center,r,h,axis='z',angle=0,count=24){
 const n=axis==='x'?{x:Math.cos(angle),y:Math.sin(angle),z:0}:{x:0,y:0,z:1};
 const u=axis==='x'?{x:0,y:0,z:1}:{x:1,y:0,z:0},v=axis==='x'?{x:-Math.sin(angle),y:Math.cos(angle),z:0}:{x:0,y:1,z:0};
 const plane=(normal,offset)=>({...normal,d:normal.x*center.x+normal.y*center.y+normal.z*center.z+offset});
 const planes=[plane(n,h/2),plane({x:-n.x,y:-n.y,z:-n.z},h/2)];
 const point=(a,t)=>({x:center.x+n.x*t+r*(u.x*Math.cos(a)+v.x*Math.sin(a)),y:center.y+n.y*t+r*(u.y*Math.cos(a)+v.y*Math.sin(a)),z:center.z+n.z*t+r*(u.z*Math.cos(a)+v.z*Math.sin(a))});
 for(let i=0;i<count;i++){const a=(i+.5)*Math.PI*2/count;planes.push(plane({x:u.x*Math.cos(a)+v.x*Math.sin(a),y:u.y*Math.cos(a)+v.y*Math.sin(a),z:u.z*Math.cos(a)+v.z*Math.sin(a)},r*Math.cos(Math.PI/count)));}
 return {planes,point,count};
}
function surfaces(b){
 const faces=[],push=(points,shade=1)=>{if(points.length>=3)faces.push({points,shade});},lo=b.z-b.h/2,hi=b.z+b.h/2;
 const quad=(a,c,d,e,shade)=>push([a,c,d,e],shade),p=(x,y,z)=>({x,y,z});
 if(b.shape==='box'){
  const x=b.x-b.w/2,X=b.x+b.w/2,y=b.y-b.l/2,Y=b.y+b.l/2;
  quad(p(x,y,lo),p(X,y,lo),p(X,Y,lo),p(x,Y,lo),.55);quad(p(x,y,hi),p(X,y,hi),p(X,Y,hi),p(x,Y,hi));
  quad(p(x,y,lo),p(X,y,lo),p(X,y,hi),p(x,y,hi),.72);quad(p(X,y,lo),p(X,Y,lo),p(X,Y,hi),p(X,y,hi),.82);
  quad(p(X,Y,lo),p(x,Y,lo),p(x,Y,hi),p(X,Y,hi),.64);quad(p(x,Y,lo),p(x,y,lo),p(x,y,hi),p(x,Y,hi),.75);
 }else{
  const count=b.segments||(b.r>100?72:b.r<=7?16:32),arc=b.arc||Math.PI*2;
  if(b.inner){
   for(let i=0;i<count;i++){
    const a=i*arc/count,t=(i+1)*arc/count,pt=(angle,r,z)=>p(b.x+r*Math.cos(angle),b.y+r*Math.sin(angle),z);
    quad(pt(a,b.r,hi),pt(t,b.r,hi),pt(t,b.inner,hi),pt(a,b.inner,hi));
    quad(pt(a,b.r,lo),pt(t,b.r,lo),pt(t,b.inner,lo),pt(a,b.inner,lo),.6);
    quad(pt(a,b.r,lo),pt(t,b.r,lo),pt(t,b.r,hi),pt(a,b.r,hi),.8);
    quad(pt(a,b.inner,lo),pt(t,b.inner,lo),pt(t,b.inner,hi),pt(a,b.inner,hi),.5);
   }
   if(b.arc)for(const a of [0,arc])quad(p(b.x+b.r*Math.cos(a),b.y+b.r*Math.sin(a),lo),p(b.x+b.inner*Math.cos(a),b.y+b.inner*Math.sin(a),lo),p(b.x+b.inner*Math.cos(a),b.y+b.inner*Math.sin(a),hi),p(b.x+b.r*Math.cos(a),b.y+b.r*Math.sin(a),hi),.75);
  }else{
   const cuts=[lo,hi,...(b.flats||[]).flatMap(f=>[b.z+f.z-f.h/2,b.z+f.z+f.h/2])].filter(z=>z>=lo&&z<=hi).sort((a,c)=>a-c);
   for(let band=1;band<cuts.length;band++){
    const z0=cuts[band-1],z1=cuts[band];if(z1-z0<1e-8)continue;
    let profile=Array.from({length:count},(_,i)=>p(b.x+b.r*Math.cos(i*Math.PI*2/count),b.y+b.r*Math.sin(i*Math.PI*2/count),z0));
    for(const flat of b.flats||[])if(Math.abs((z0+z1)/2-b.z-flat.z)<flat.h/2)profile=clipPolygon(profile,{x:Math.cos(flat.angle),y:Math.sin(flat.angle),z:0,d:b.x*Math.cos(flat.angle)+b.y*Math.sin(flat.angle)+b.r-flat.depth});
    const top=profile.map(pt=>({...pt,z:z1}));push(profile,.55);push(top);
    for(let i=0;i<profile.length;i++)quad(profile[i],profile[(i+1)%profile.length],top[(i+1)%profile.length],top[i],.75);
   }
  }
 }
 if(!b.holes?.length&&!b.slots?.length)return faces;
 const holes=(b.holes||[]).map(h=>prism({x:b.x+(h.x||0),y:b.y+(h.y||0),z:b.z+(h.z||0)},h.r,h.h,h.axis,h.angle));
 const host=b.shape==='box'?[
  {x:1,y:0,z:0,d:b.x+b.w/2},{x:-1,y:0,z:0,d:-b.x+b.w/2},{x:0,y:1,z:0,d:b.y+b.l/2},{x:0,y:-1,z:0,d:-b.y+b.l/2},{x:0,y:0,z:1,d:hi},{x:0,y:0,z:-1,d:-lo}
 ]:prism(b,b.r,b.h,'z',0,b.segments||(b.r>100?72:b.r<=7?16:32)).planes;
 const bore=b.inner?prism(b,b.inner,b.h+2,'z',0,b.segments||(b.r>100?72:b.r<=7?16:32)).planes:null;
 const walls=[];
 for(const [index,hole] of holes.entries()){
  const candidates=Array.from({length:hole.count},(_,i)=>[hole.point(i*Math.PI*2/hole.count,-b.holes[index].h/2),hole.point((i+1)*Math.PI*2/hole.count,-b.holes[index].h/2),hole.point((i+1)*Math.PI*2/hole.count,b.holes[index].h/2),hole.point(i*Math.PI*2/hole.count,b.holes[index].h/2)]);
  for(const sign of [-1,1]){
   const cap=Array.from({length:hole.count},(_,i)=>hole.point(i*Math.PI*2/hole.count,sign*b.holes[index].h/2)),center=cap.reduce((s,v)=>({x:s.x+v.x/hole.count,y:s.y+v.y/hole.count,z:s.z+v.z/hole.count}),{x:0,y:0,z:0});
   if(host.every(n=>n.x*center.x+n.y*center.y+n.z*center.z<n.d-1e-5))candidates.push(cap);
  }
  for(let polygon of candidates){
   for(const plane of host)polygon=clipPolygon(polygon,plane);
   let pieces=bore?subtractPolygon(polygon,bore):[polygon];
   for(const [j,other] of holes.entries())if(j!==index)pieces=pieces.flatMap(f=>subtractPolygon(f,other.planes));
   walls.push(...pieces.filter(f=>f.length>=3).map(points=>({points,shade:.42})));
  }
 }
 let result=faces;
 for(const hole of holes)result=result.flatMap(f=>subtractPolygon(f.points,hole.planes).map(points=>({points,shade:f.shade})));
 let visible=[...result,...walls];
 for(const slot of b.slots||[]){
  const a=slot.angle||0,c=Math.cos(a),s=Math.sin(a),cx=b.x+slot.x,cy=b.y+slot.y;
  const planes=[{x:c,y:s,z:0,d:c*cx+s*cy+slot.w/2},{x:-c,y:-s,z:0,d:-c*cx-s*cy+slot.w/2},{x:-s,y:c,z:0,d:-s*cx+c*cy+slot.l/2},{x:s,y:-c,z:0,d:s*cx-c*cy+slot.l/2}];
  visible=visible.flatMap(f=>subtractPolygon(f.points,planes).map(points=>({points,shade:f.shade})));
 }
 return visible;
}
function mountingFit(g){
 const issues=[],engagement=g.mounting.threadEngagement;
 if(engagement<3||engagement>g.motor.holeDepth-.3)issues.push('M3-motorbout heeft onvoldoende draad of bodemt in motor');
 for(const key of ['A','B','C']){
  const d=g[key],overlap=Math.max(0,Math.min(d.hubTop,g.motor.shaftMin)-Math.max(d.hubBottom-g.hub.pilotHeight,g.motor.bossHeight));
  // Printed cranks place B 1 mm higher: at least 7 mm of the 8 mm body
  // and the entire clamp zone (centre +/- 2 mm) must remain on the shaft.
  const bodyOverlap=Math.max(0,Math.min(d.hubTop,g.motor.shaftMin)-d.hubBottom);
  if(overlap<9-1e-6||bodyOverlap<7-1e-6||(d.hubBottom+d.hubTop)/2+2>g.motor.shaftMin)issues.push('Klemnaaf '+key+' heeft onvoldoende asoverlap of een ongedekte klemzone');
  if(d.hubBottom-g.hub.pilotHeight<g.motor.bossHeight+.5-1e-6)issues.push('Klemnaaf '+key+' raakt centreerrand');
  if(d.hubBottom-g.base.thickness-g.stiffenerThickness<1)issues.push('Klemnaaf '+key+' te dicht bij verstevigingsplaat');
 }
 if(g.paper.z+g.paper.thickness/2<g.motor.shaftMax+1-1e-6)issues.push('Motoras C raakt papier');
 if(g.rodHeight<12||g.B.rodZ-g.A.rodZ<g.rodHeight+g.clearance)issues.push('Armlagen of lagerogen hebben onvoldoende hoogte');
 return {state:issues.length?'FAIL':'PASS',issues,threadEngagement:engagement,minimumShaft:23,maximumShaft:25};
}
window.MotioGeometry={DEFAULT_CONFIG,normalize,build,bodies,bounds,surfaces,clipPolygon,mountingFit};
})();
