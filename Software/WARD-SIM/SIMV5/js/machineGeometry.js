(function () {
'use strict';
// Length mm, angle rad, time s, force N, mass kg; motor calculations convert to SI.
const DEFAULT_CONFIG=Object.freeze({patternId:'flower5',wordText:'MOTIO',rpmA:.8,rpmB:-.425,rpmC:-1.8,phaseA:49.0031578912355,phaseB:154.84031330144893,phaseC:0,radiusA:65,radiusB:65,lengthA:180,lengthB:160,
 pivotAx:280,pivotAy:180,pivotBx:160,pivotBy:100,paperX:150,paperY:280,paperRadius:105,paperMargin:10,paperThickness:4,paperMass:.45,
 couplingRadius:9,couplingHeight:18,
 motorStepAngle:1.8,motorCurrent:1.68,motorVoltage:2.8,motorHoldingTorque:.36,motorWidth:42.3,motorLength:38,motorShaftDiameter:5,motorMountPitch:31,
 motorSupplyVoltage:24,motorDriveCurrent:1.68,motorStepsPerFullStep:16,motorCurveConditionsConfirmed:0,motorRadialLimit:28,motorRadialReference:20,motorAxialLimit:10,
 rodWidth:24,rodHeight:24,rodWall:3,materialE:1500,density:1270,crankWidth:18,crankHeight:8,rodZA:86,rodZB:118,crankZA:64,crankZB:96,
 baseX:0,baseY:0,baseWidth:358,baseHeight:404,baseThickness:8,boxHeight:108,wallThickness:8,frameBraceX:8,paperZ:30,clearance:3,branch:-1,
 // Direct 1:1 drive: motor and output have the same speed and direction.
 // Keep SIMV5 motion limits. The half-step datasheet curve cannot prove
 // capacity at these low speeds or with the default 1/16 driver setting.
 maxRPM:8,maxPaperRPM:16,acceleration:1,paperAcceleration:3,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,efficiency:.95,frictionAB:.025,frictionC:.03,rotorInertia:0.0000068,couplingInertia:0.000002,penMass:.10,
 penDiameter:10,penMinDiameter:6,penMaxDiameter:12,holderRadius:14,jointRadius:20,jointShaftRadius:10,jointBoreRadius:6.5,
 conditionCaution:10,conditionCritical:100,transmissionCaution:.20,transmissionCritical:.05,parallelStop:.10,workspaceStep:10,testResolution:48,positionTolerance:.5,deflectionLimit:.5,spindleBearingLow:-7,spindleBearingHigh:9,reachAngle:-140});
const cache=new WeakMap();
function normalize(input={}) {
 const c={...DEFAULT_CONFIG,...input};
 // Imported SIMV5 configurations keep their motion settings; obsolete gearing
 // parameters cannot introduce a transmission into this direct-drive version.
 for(const k of ['outputTeethA','outputTeethB','outputTeethC','motorTeeth','gearModule','motorDirectionA','motorDirectionB','motorDirectionC','gearInertia'])delete c[k];
 for(const k of Object.keys(DEFAULT_CONFIG))if(!['patternId','wordText'].includes(k)&&!Number.isFinite(c[k]))throw Error('Ongeldige parameter: '+k);
 if(typeof c.wordText!=='string')throw Error('Gebruik 1 tot 8 letters (A–Z).');
 c.wordText=c.wordText.trim().toUpperCase();
 if(!/^[A-Z]{1,8}$/.test(c.wordText))throw Error('Gebruik 1 tot 8 letters (A–Z), zonder spaties of cijfers.');
 if(typeof c.patternId!=='string'||(c.patternId&&window.MotioPatterns&&!window.MotioPatterns.get(c.patternId)))throw Error('Onbekend patroon');
 for(const k of ['radiusA','radiusB','lengthA','lengthB','paperRadius','paperThickness','paperMass','rodWidth','rodHeight','rodWall','materialE','density','efficiency','workspaceStep','baseWidth','baseHeight','baseThickness','boxHeight','wallThickness','penDiameter','couplingRadius','couplingHeight','motorStepAngle','motorCurrent','motorVoltage','motorWidth','motorLength','motorShaftDiameter','motorMountPitch','motorStepsPerFullStep'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 if(c.couplingRadius<=Math.max(6,c.motorShaftDiameter/2)||c.couplingHeight<10)throw Error('Koppeling: boring en voldoende insteeklengte vereist');
 if(![1,2,4,8,16,32].includes(c.motorStepsPerFullStep))throw Error('Microstepping: kies 1, 2, 4, 8, 16 of 32');
 if(c.boxHeight<=2*c.baseThickness||2*c.wallThickness>=Math.min(c.baseWidth,c.baseHeight))throw Error('Ongeldige box- of wandafmetingen');
 if(c.rodWall*2>=Math.min(c.rodWidth,c.rodHeight))throw Error('Kokerwand sluit de doorsnede');
 if(![-1,1].includes(c.branch)||c.clearance<0||c.efficiency>1)throw Error('Ongeldige branch, vrijloop of efficiëntie');
 if(c.penDiameter<c.penMinDiameter||c.penDiameter>c.penMaxDiameter||c.penMaxDiameter>=c.jointBoreRadius*2)throw Error('Pen past niet in doorlopende boring');
 if(c.paperMargin<0||c.paperMargin>=c.paperRadius)throw Error('Ongeldige papiermarge');
 if(c.spindleBearingHigh-c.spindleBearingLow<16)throw Error('Papierspindel: lagerafstand te klein');
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
 const motorZ=2*c.baseThickness-c.boxHeight+4+c.motorLength/2;
 const shaftTop=motorZ+c.motorLength/2+24;
 const g={...c,base:{x:c.baseX,y:c.baseY,width:c.baseWidth,height:c.baseHeight,z:0,thickness:c.baseThickness},box:{height:c.boxHeight,wall:c.wallThickness,bottom:c.baseThickness-c.boxHeight},paper,driveSign:1,frameZ:-18,frameSize:20,frameHeight:c.boxHeight,towerRadius:22,
  motor:{model:'SY42STH38-1684A',width:c.motorWidth,length:c.motorLength,shaftRadius:c.motorShaftDiameter/2,shaftLength:24,mountingPitch:c.motorMountPitch,mountingHole:'M3',holeDepth:4.5,bossRadius:11,bossHeight:4.5,z:motorZ},coupling:{z:shaftTop,radius:c.couplingRadius,height:c.couplingHeight,shaftBottom:shaftTop+1},bearingAB:{inner:4,outer:11,height:7},bearingP:{inner:10,outer:16,height:7},bearingC:{inner:6,outer:14,height:8},
  pen:{min:c.penMinDiameter,max:c.penMaxDiameter,radius:c.penDiameter/2,holderRadius:c.holderRadius,jointRadius:c.jointRadius,shaftRadius:c.jointShaftRadius,boreRadius:c.jointBoreRadius,clampZ:c.paperZ+28,knobRadius:8,knobReach:32},
  material:{name:'PETG · voorlopige printkeuze',E:c.materialE,density:c.density,verified:false},
  hardware:{motorBolt:8,mountBolt:25,washerM3:.5,washerM4:1,bracketMountPitch:78,holderMountPitch:42,spindleMountPitch:36.8,flangeRadius:30,flangeThickness:8,flangePitch:24,crankSetScrew:8,flangeSetScrew:25}};
 g.hardware.plateBolt=g.paper.thickness+g.hardware.flangeThickness+6;
 for(const key of ['A','B','C']) {
  const pivot=key==='C'?{x:paper.x,y:paper.y}:{x:c['pivot'+key+'x'],y:c['pivot'+key+'y']};
  g[key]={pivot,motor:{...pivot},crankZ:c['crankZ'+key],rodZ:c['rodZ'+key],bearings:key==='C'?[c.spindleBearingLow,c.spindleBearingHigh]:[c['crankZ'+key]-44,c['crankZ'+key]-20],ratio:1,motorSign:1};
 }
 g.tubeArea=c.rodWidth*c.rodHeight-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall);
 g.tubeI=(c.rodWidth*c.rodHeight**3-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall)**3)/12;
 g.tubeIxy=(c.rodHeight*c.rodWidth**3-(c.rodHeight-2*c.rodWall)*(c.rodWidth-2*c.rodWall)**3)/12;
 cache.set(c,g);cache.set(g,g);return g;
}
// The same primitive envelopes feed 3D, sections, picking and collision checking.
function bodies(g,pose,detail=true) {
 const all=[],add=(id,bom,group,shape,props)=>{
  if(!detail&&group==='fastener'&&!id.startsWith('elbow'))return;
  const instance=bom==='MOTOR'?'motor'+id.slice(-1):bom==='BR'?'BR-'+id.match(/([ABC])(?:-?1)?$/)[1]:bom==='E'?'elbow'+id.slice(-1):/^(H|CP|K|L)-[ABC]$/.test(bom)?bom:id;
  all.push({id,bom,group,shape,instance,mount:bom,...props});
 };
 const box=(id,bom,group,x,y,z,w,l,h)=>add(id,bom,group,'box',{x,y,z,w,l,h});
 const cyl=(id,bom,group,x,y,z,r,h,inner=0)=>add(id,bom,group,inner?'ring':'cylinder',{x,y,z,r,h,inner});
 const beam=(id,bom,group,a,b,z,w,h)=>add(id,bom,group,'beam',{a,b,z,w,h});
 const holderOffset=key=>(key==='C'?g.hardware.spindleMountPitch:g.hardware.holderMountPitch)/2;
 const fixing=(id,mount,x,y,top,bottom,size=4)=>{
  if(!detail)return;
  const screw=size===3?'M3-BOLT':'M4-BOLT',washer=size===3?'M3-WASHER':'M4-WASHER',t=size===3?g.hardware.washerM3:g.hardware.washerM4;
  const length=size===3?g.hardware.motorBolt:g.hardware.mountBolt;
  add(id+'-stem',screw,'fastener','cylinder',{x,y,z:top+t-length/2,r:size/2,h:length,mount,instance:id});
  add(id+'-head',screw,'fastener','cylinder',{x,y,z:top+t+size/2,r:size*.85,h:size,mount,instance:id,segments:6});
  add(id+'-washer',washer,'fastener','ring',{x,y,z:top+t/2,r:size,inner:size/2+.2,h:t,mount});
  if(bottom!==null){
   add(id+'-lower-washer',washer,'fastener','ring',{x,y,z:bottom-t/2,r:size,inner:size/2+.2,h:t,mount});
   add(id+'-nut','M4-NUT','fastener','ring',{x,y,z:bottom-t-1.6,r:4,inner:2,h:3.2,mount,segments:6});
  }
 };
 const radialFixing=(id,mount,x,y,z,angle,bore,length,bom)=>{
  if(!detail)return;
  const point=r=>({x:x+r*Math.cos(angle),y:y+r*Math.sin(angle),z,axis:'x',angle,mount});
  const rim=mount==='FL-FIX'?g.hardware.flangeRadius:12,assemblyGroup=mount==='FL-FIX'?'flange':'cranks';
  add(id+'-insert','M4-INSERT','fastener','ring',{...point(rim-2.7),r:3,inner:2,h:5,mount:mount.replace('FIX','INSERT'),assemblyGroup});
  add(id+'-screw',bom,'fastener','cylinder',{...point(bore-.4+length/2),r:2,h:length});
 };
 const radialHoles=(r,inner,angle,insert=false,z=0)=>[
  {axis:'x',angle,x:Math.cos(angle)*(r+inner)/2,y:Math.sin(angle)*(r+inner)/2,z,r:insert?2.1:1.6,h:r-inner+2},
  ...(insert?[{axis:'x',angle,x:Math.cos(angle)*(r-2.5),y:Math.sin(angle)*(r-2.5),z,r:3.1,h:5.4}]:[])
 ];
 const b=g.base;
 box('BASE','BASE','frame',b.x+b.width/2,b.y+b.height/2,b.thickness/2,b.width,b.height,b.thickness);
 const deck=all.at(-1);deck.holes=[];
 for(const key of ['A','B','C']){
  const o=g[key].pivot,put=(x,y,r)=>deck.holes.push({x:x-deck.x,y:y-deck.y,r,h:b.thickness+2});
  put(o.x,o.y,key==='C'?22:14);
  for(const sign of [-1,1])put(o.x+sign*g.hardware.bracketMountPitch/2,o.y,2.3);
  for(const x of [-1,1])for(const y of [-1,1])put(o.x+x*holderOffset(key),o.y+y*holderOffset(key),2.3);
 }
 const wall=g.box.wall,lo=g.box.bottom+b.thickness,wallHeight=-lo;
 box('box-bottom','BOTTOM','frame',b.x+b.width/2,b.y+b.height/2,g.box.bottom+b.thickness/2,b.width,b.height,b.thickness);
 box('box-back','WALL-FB','frame',b.x+b.width/2,b.y+wall/2,lo/2,b.width,wall,wallHeight);
 box('box-front','WALL-FB','frame',b.x+b.width/2,b.y+b.height-wall/2,lo/2,b.width,wall,wallHeight);
 box('box-left','WALL-LR','frame',b.x+wall/2,b.y+b.height/2,lo/2,wall,b.height-2*wall,wallHeight);
 box('box-right','WALL-LR','frame',b.x+b.width-wall/2,b.y+b.height/2,lo/2,wall,b.height-2*wall,wallHeight);
 for(const key of ['A','B','C']) {
  const d=g[key],m=d.motor,o=d.pivot;
  box('motor'+key,'MOTOR','drive',m.x,m.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length);
  all.at(-1).holes=[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*g.motor.mountingPitch/2,y:y*g.motor.mountingPitch/2,z:g.motor.length/2-g.motor.holeDepth/2,r:1.5,h:g.motor.holeDepth})));
  const faceZ=g.motor.z+g.motor.length/2,bracketTop=faceZ+5;
  for(const sign of [-1,1]) {
   box('bracket'+key+sign,'BR','support',m.x+sign*19.5,m.y,faceZ+2.5,15,54,5);
   all.at(-1).holes=[-1,1].map(s=>({x:sign*g.motor.mountingPitch/2-sign*19.5,y:s*g.motor.mountingPitch/2,r:1.7,h:7}));
   box('bracketCross'+key+sign,'BR','support',m.x,m.y+sign*19.5,faceZ+2.5,24,15,5);
   box('riser'+key+sign,'BR','support',m.x+sign*29,m.y,bracketTop/2,5,54,-bracketTop);
   box('bracketLug'+key+sign,'BR','support',m.x+sign*34.5,m.y,-2.5,16,54,5);
   all.at(-1).holes=[{x:sign*4.5,y:0,r:2.3,h:7}];
  }
  cyl('motorShaft'+key,'MOTOR','shaft',m.x,m.y,faceZ+g.motor.shaftLength/2,g.motor.shaftRadius,g.motor.shaftLength);
  cyl('motorBoss'+key,'MOTOR','shaft',m.x,m.y,faceZ+g.motor.bossHeight/2,g.motor.bossRadius,g.motor.bossHeight,g.motor.shaftRadius);
  for(const x of [-g.motor.mountingPitch/2,g.motor.mountingPitch/2])for(const y of [-g.motor.mountingPitch/2,g.motor.mountingPitch/2])fixing('motorFix'+key+x+','+y,'MOTOR-FIX',m.x+x,m.y+y,bracketTop,null,3);
  for(const sign of [-1,1])fixing('bracketFix'+key+sign,'BR-FIX',m.x+sign*g.hardware.bracketMountPitch/2,m.y,b.thickness,-5);
  const outputRadius=key==='C'?6:4,cp=g.coupling;
  cyl('coupling'+key,'CP-'+key,'drive',o.x,o.y,cp.z,cp.radius,cp.height,outputRadius);
  const motorAngle=pose?.q?.[key]||0;
  all.at(-1).holes=[-1,1].flatMap(sign=>radialHoles(cp.radius,sign<0?g.motor.shaftRadius:outputRadius,motorAngle,false,sign*cp.height/4));
  // Stepped bore: Ø5 motor side, Ø8/12 output side; shaft ends have a 1 mm gap.
  cyl('couplingBush'+key,'CP-'+key,'shaft',o.x,o.y,cp.z-cp.height/4,outputRadius,cp.height/2,g.motor.shaftRadius);
  all.at(-1).holes=radialHoles(outputRadius,g.motor.shaftRadius,motorAngle);
  for(const sign of [-1,1]){
   const tip=sign<0?g.motor.shaftRadius:outputRadius-.4,length=cp.radius-tip;
   add('couplingScrew'+key+sign,'CP-SCREW','fastener','cylinder',{x:o.x+(tip+length/2)*Math.cos(motorAngle),y:o.y+(tip+length/2)*Math.sin(motorAngle),z:cp.z+sign*cp.height/4,r:1.5,h:length,axis:'x',angle:motorAngle,mount:'CP-FIX'});
  }
  const radius=key==='C'?14:11,bh=key==='C'?8:7,outer=key==='C'?21:22,throat=key==='C'?10:8;
  const lo=d.bearings[0]-bh/2,hi=d.bearings[1]+bh/2;
  const housing=(id,z,h,inner)=>{cyl(id,'H-'+key,'support',o.x,o.y,z,outer,h,inner);all.at(-1).assemblyGroup='housing';};
  // Opposed bearing seats: a real inner shoulder and an external circlip groove.
  housing('housing'+key,(lo+hi)/2,hi-lo-bh*2,throat);
  for(const [i,z] of d.bearings.entries()){
   cyl('bearing'+key+i,key==='C'?'6001':'608','bearing',o.x,o.y,z,radius,bh,outputRadius);
   Object.assign(all.at(-1),{assemblyGroup:'housing',approach:i===0?-25:25});
   housing('seat'+key+i,z,bh,radius+.15);
   const sign=i===0?-1:1,edge=z+sign*bh/2;
   housing('groove'+key+i,edge+sign*.7,1.4,radius+.8);
   housing('lip'+key+i,edge+sign*1.7,.6,radius+.15);
   add('retainerClip'+key+i,key==='C'?'CLIP-28':'CLIP-22','fastener','ring',{x:o.x,y:o.y,z:edge+sign*.8,r:radius+.65,inner:radius-2,h:1.2,mount:'BEARING-CLIPS',assemblyGroup:'housing',approach:sign*18,arc:Math.PI*1.75});
  }
  if(key==='C'){
   cyl('footC','H-C','support',o.x,o.y,10.5,34,5,radius+.15);
   all.at(-1).holes=[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*holderOffset(key),y:y*holderOffset(key),r:2.3,h:7})));
   all.at(-1).assemblyGroup='housing';
  }else{
   box('foot'+key,'H-'+key,'support',o.x,o.y,10.5,60,60,5);
   Object.assign(all.at(-1),{assemblyGroup:'housing',holes:[{x:0,y:0,r:14,h:7},...[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*holderOffset(key),y:y*holderOffset(key),r:2.3,h:7})))]});
   for(const x of [-14,14])for(const y of [-14,14]){
    cyl('housingPost'+key+x+','+y,'H-'+key,'support',o.x+x,o.y+y,(13+lo-2)/2,3,lo-2-13);
    all.at(-1).assemblyGroup='housing';
   }
  }
  for(const x of [-1,1])for(const y of [-1,1]){
   // One shared hole pattern for the wood, foot and hardware.
   fixing('housingFix'+key+x+','+y,'H-FIX',o.x+x*holderOffset(key),o.y+y*holderOffset(key),13,0);
  }
  const top=key==='C'?g.paper.z-g.paper.thickness/2:d.crankZ+4,bottom=g.coupling.shaftBottom;
  cyl('shaft'+key,'S-'+key,'shaft',o.x,o.y,(top+bottom)/2,key==='C'?6:4,top-bottom);
  const shaft=all.at(-1),clampAngle=key==='C'?motorAngle+Math.PI/4:Math.atan2((key==='A'?pose?.a:pose?.b)?.y-o.y,(key==='A'?pose?.a:pose?.b)?.x-o.x)+Math.PI/2;
  shaft.flats=[{z:cp.z+cp.height/4-shaft.z,h:6,angle:motorAngle,depth:.4},{z:(key==='C'?g.paper.z-g.paper.thickness/2-g.hardware.flangeThickness/2:d.crankZ)-shaft.z,h:key==='C'?8:g.crankHeight,angle:Number.isFinite(clampAngle)?clampAngle:0,depth:.4}];
  for(const sign of [-1,1]){
   const z=(sign<0?lo-2.5:hi+2.5),angle=motorAngle;
   cyl((sign===1?'shoulder':'nut')+key,key==='C'?'LOCK-12':'LOCK-8','shaft',o.x,o.y,z,outputRadius+3,5,outputRadius);
   Object.assign(all.at(-1),{mount:sign<0?'LOWER-LOCK':'UPPER-LOCK',assemblyGroup:sign<0?'housing':null,approach:sign*25,holes:radialHoles(outputRadius+3,outputRadius,angle,false,sign*.8)});
   add('collarScrew'+key+sign,'LOCK-SCREW','fastener','cylinder',{x:o.x+(outputRadius+1.5)*Math.cos(angle),y:o.y+(outputRadius+1.5)*Math.sin(angle),z:z+sign*.8,r:1.5,h:3,axis:'x',angle,mount:'LOCK-FIX'});
  }
 }
 const p=g.paper;
 cyl('flange','FL','platter',p.x,p.y,p.z-p.thickness/2-g.hardware.flangeThickness/2,g.hardware.flangeRadius,g.hardware.flangeThickness,6);
 Object.assign(all.at(-1),{assemblyGroup:'flange',holes:[...radialHoles(g.hardware.flangeRadius,6,(pose?.q?.C||0)+Math.PI/4,true),...Array.from({length:4},(_,i)=>({x:g.hardware.flangePitch*Math.cos(i*Math.PI/2+(pose?.q?.C||0)),y:g.hardware.flangePitch*Math.sin(i*Math.PI/2+(pose?.q?.C||0)),r:2.3,h:g.hardware.flangeThickness+2}))]});
 radialFixing('flangeFix','FL-FIX',p.x,p.y,p.z-p.thickness/2-g.hardware.flangeThickness/2,(pose?.q?.C||0)+Math.PI/4,6,g.hardware.flangeSetScrew,'M4-SET-F');
 cyl('platter','PL','platter',p.x,p.y,p.z,p.radius,p.thickness);
 all.at(-1).holes=Array.from({length:4},(_,i)=>{
  const x=g.hardware.flangePitch*Math.cos(i*Math.PI/2+(pose?.q?.C||0)),y=g.hardware.flangePitch*Math.sin(i*Math.PI/2+(pose?.q?.C||0));
  return [{x,y,r:2.3,h:p.thickness+2},{x,y,z:p.thickness/2-1.5,r:3.6,h:3.02}];
 }).flat();
 cyl('paper','PAPER','paper',p.x,p.y,p.z+p.thickness/2+.1,p.radius,.2);
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+(pose?.q?.C||0),x=p.x+g.hardware.flangePitch*Math.cos(a),y=p.y+g.hardware.flangePitch*Math.sin(a),top=p.z+p.thickness/2;
  // Countersunk heads remain flush so the paper stays flat.
  add('plateFix'+i+'-stem','M4-CSK','fastener','cylinder',{x,y,z:top-g.hardware.plateBolt/2,r:2,h:g.hardware.plateBolt,mount:'PL-FIX',instance:'plateFix'+i});
  add('plateFix'+i+'-head','M4-CSK','fastener','cylinder',{x,y,z:top-1.5,r:3.5,h:3,mount:'PL-FIX',instance:'plateFix'+i});
  add('plateFix'+i+'-washer','M4-WASHER','fastener','ring',{x,y,z:top-p.thickness-g.hardware.flangeThickness-.5,r:4,inner:2.2,h:1,mount:'PL-FIX',angle:a});
  add('plateFix'+i+'-nut','M4-NUT','fastener','ring',{x,y,z:top-p.thickness-g.hardware.flangeThickness-2.6,r:4,inner:2,h:3.2,mount:'PL-FIX',angle:a,segments:6});
 }
 if(!pose?.valid)return all;
 for(const key of ['A','B']) {
  const d=g[key],e=key==='A'?pose.a:pose.b;
  const uK={x:(e.x-d.pivot.x)/g['radius'+key],y:(e.y-d.pivot.y)/g['radius'+key]},trim=Math.min(10,g['radius'+key]/3);
  beam('crank'+key,'K-'+key,'moving',{x:d.pivot.x+trim*uK.x,y:d.pivot.y+trim*uK.y},{x:e.x-trim*uK.x,y:e.y-trim*uK.y},d.crankZ,g.crankWidth,g.crankHeight);
  cyl('crankHub'+key,'K-'+key,'moving',d.pivot.x,d.pivot.y,d.crankZ,12,g.crankHeight,4);
  all.at(-1).holes=radialHoles(12,4,Math.atan2(uK.y,uK.x)+Math.PI/2,true);
  cyl('crankEnd'+key,'K-'+key,'moving',e.x,e.y,d.crankZ,10,g.crankHeight,4);
  radialFixing('crankFix'+key,'K-FIX',d.pivot.x,d.pivot.y,d.crankZ,Math.atan2(uK.y,uK.x)+Math.PI/2,4,g.hardware.crankSetScrew,'M4-SET-K');
  all.filter(part=>part.bom==='K-'+key).forEach(part=>part.assemblyGroup='cranks');
  const L=g['length'+key],u={x:(pose.pen.x-e.x)/L,y:(pose.pen.y-e.y)/L};
  // Tube lands on the bearing carriers outside their bores; it cannot occupy the pen axis.
  beam('rod'+key,'L-'+key,'moving',{x:e.x+12*u.x,y:e.y+12*u.y},{x:pose.pen.x-(g.pen.jointRadius-2)*u.x,y:pose.pen.y-(g.pen.jointRadius-2)*u.y},d.rodZ,g.rodWidth,g.rodHeight);
  cyl('elbow'+key,'E','moving',e.x,e.y,(d.crankZ+d.rodZ+12)/2-3,4,d.rodZ-d.crankZ+18);
  cyl('elbowThread'+key,'E','moving',e.x,e.y,d.rodZ+15,3,6);
  add('elbowWasher'+key,'M6-WASHER','fastener','ring',{x:e.x,y:e.y,z:d.rodZ+g.rodHeight/2+.5,r:6,inner:3.2,h:1,mount:'ELBOW-FIX'});
  add('elbowNut'+key,'M6-NUT','fastener','ring',{x:e.x,y:e.y,z:d.rodZ+g.rodHeight/2+3.5,r:5.5,inner:3,h:5,mount:'ELBOW-FIX',segments:6});
  for(const [id,pt] of [['E',e],['P',pose.pen]]) {
   cyl('end'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ,id==='P'?g.pen.jointRadius:15,g.rodHeight,id==='P'?16:11);
   cyl('joint'+id+key,id==='P'?'6804':'608','joint',pt.x,pt.y,d.rodZ,id==='P'?16:11,7,id==='P'?10:4);
  }
 }
 const pt=pose.pen,low=Math.min(g.A.rodZ,g.B.rodZ),high=Math.max(g.A.rodZ,g.B.rodZ),z=g.pen.clampZ;
 cyl('penSleeve','P','pen',pt.x,pt.y,(z+11+high+14)/2,g.pen.shaftRadius,high+14-z-11,g.pen.boreRadius);
 cyl('penSpacer','SP-P','pen',pt.x,pt.y,(low+high)/2,12,Math.max(0,high-low-7),10);
 cyl('penShoulder','P-LOCK','pen',pt.x,pt.y,low-6,12,5,10);
 cyl('penNut','P-LOCK','pen',pt.x,pt.y,high+6,12,5,10);
 cyl('holder','PEN','pen',pt.x,pt.y,z,g.pen.holderRadius,22,g.pen.boreRadius);
 cyl('centeringBush','BUSH','pen',pt.x,pt.y,z,g.pen.boreRadius,22,g.pen.radius+.1);
 // Radial M4 screw, replaceable soft pad and knurled knob; hand operation only.
 const screwStart=g.pen.radius+2;
 add('clampScrew','CLAMP-SCREW','pen','cylinder',{x:pt.x+(screwStart+33)/2,y:pt.y,z,r:2,h:33-screwStart,axis:'x'});
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','KNOB','pen',pt.x+29,pt.y,z,6,16,16);
 const tip=p.z+p.thickness/2+.2,penTop=high+32;
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
 if(!b.holes?.length)return faces;
 const holes=b.holes.map(h=>prism({x:b.x+(h.x||0),y:b.y+(h.y||0),z:b.z+(h.z||0)},h.r,h.h,h.axis,h.angle));
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
 return [...result,...walls];
}
window.MotioGeometry={DEFAULT_CONFIG,normalize,build,bodies,bounds,surfaces,clipPolygon};
})();
