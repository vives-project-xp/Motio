(function () {
'use strict';
// Length mm, angle rad, time s, force N, mass kg; motor calculations convert to SI.
const DEFAULT_CONFIG=Object.freeze({patternId:'flower5',wordText:'MOTIO',rpmA:.8,rpmB:-.425,rpmC:-1.8,phaseA:49.0031578912355,phaseB:154.84031330144893,phaseC:0,radiusA:65,radiusB:65,lengthA:180,lengthB:160,
 pivotAx:280,pivotAy:180,pivotBx:160,pivotBy:100,paperX:150,paperY:280,paperRadius:105,paperMargin:10,paperThickness:4,paperMass:.45,
 couplingRadius:9,couplingHeight:18,
 motorStepAngle:1.8,motorCurrent:1.68,motorVoltage:2.8,motorHoldingTorque:.36,motorWidth:42.3,motorLength:38,motorShaftDiameter:5,motorMountPitch:31,
 motorSupplyVoltage:24,motorDriveCurrent:1.68,motorStepsPerFullStep:16,motorCurveConditionsConfirmed:0,motorRadialLimit:28,motorRadialReference:20,motorAxialLimit:10,
 rodWidth:20,rodHeight:20,rodWall:1.5,materialE:69000,density:2700,crankWidth:16,crankHeight:8,rodZA:84,rodZB:116,crankZA:64,crankZB:96,
 baseX:0,baseY:0,baseWidth:358,baseHeight:404,baseThickness:8,boxHeight:108,wallThickness:8,frameBraceX:8,paperZ:30,clearance:3,branch:-1,
 // Direct 1:1 drive: motor and output have the same speed and direction.
 // Keep SIMV4-5 motion limits. The half-step datasheet curve cannot prove
 // capacity at these low speeds or with the default 1/16 driver setting.
 maxRPM:8,maxPaperRPM:16,acceleration:1,paperAcceleration:3,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,efficiency:.95,frictionAB:.025,frictionC:.03,rotorInertia:0.0000068,couplingInertia:0.000002,penMass:.10,
 penDiameter:10,penMinDiameter:6,penMaxDiameter:12,holderRadius:14,jointRadius:20,jointShaftRadius:10,jointBoreRadius:6.5,
 conditionCaution:10,conditionCritical:100,transmissionCaution:.20,transmissionCritical:.05,parallelStop:.10,workspaceStep:10,testResolution:48,positionTolerance:.5,deflectionLimit:.5,spindleBearingLow:-7,spindleBearingHigh:9,reachAngle:-140});
const cache=new WeakMap();
function normalize(input={}) {
 const c={...DEFAULT_CONFIG,...input};
 // Imported SIMV4-5 configurations keep their motion settings; obsolete gearing
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
  motor:{model:'SY42STH38-1684A',width:c.motorWidth,length:c.motorLength,shaftRadius:c.motorShaftDiameter/2,shaftLength:24,mountingPitch:c.motorMountPitch,mountingHole:'M3',z:motorZ},coupling:{z:shaftTop,radius:c.couplingRadius,height:c.couplingHeight,shaftBottom:shaftTop+1},bearingAB:{inner:4,outer:11,height:7},bearingP:{inner:10,outer:16,height:7},bearingC:{inner:6,outer:14,height:8},
  pen:{min:c.penMinDiameter,max:c.penMaxDiameter,radius:c.penDiameter/2,holderRadius:c.holderRadius,jointRadius:c.jointRadius,shaftRadius:c.jointShaftRadius,boreRadius:c.jointBoreRadius,clampZ:c.paperZ+28,knobRadius:8,knobReach:32},
  material:{name:'6061-T6 aluminium · ASSUMPTION',E:c.materialE,density:c.density}};
 for(const key of ['A','B','C']) {
  const pivot=key==='C'?{x:paper.x,y:paper.y}:{x:c['pivot'+key+'x'],y:c['pivot'+key+'y']};
  g[key]={pivot,motor:{...pivot},crankZ:c['crankZ'+key],rodZ:c['rodZ'+key],bearings:key==='C'?[c.spindleBearingLow,c.spindleBearingHigh]:[c['crankZ'+key]-52,c['crankZ'+key]-20],ratio:1,motorSign:1};
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
 const wall=g.box.wall,lo=g.box.bottom+b.thickness,wallHeight=-lo;
 box('box-bottom','BASE','frame',b.x+b.width/2,b.y+b.height/2,g.box.bottom+b.thickness/2,b.width,b.height,b.thickness);
 box('box-back','BASE','frame',b.x+b.width/2,b.y+wall/2,lo/2,b.width,wall,wallHeight);
 box('box-front','BASE','frame',b.x+b.width/2,b.y+b.height-wall/2,lo/2,b.width,wall,wallHeight);
 box('box-left','BASE','frame',b.x+wall/2,b.y+b.height/2,lo/2,wall,b.height-2*wall,wallHeight);
 box('box-right','BASE','frame',b.x+b.width-wall/2,b.y+b.height/2,lo/2,wall,b.height-2*wall,wallHeight);
 for(const key of ['A','B','C']) {
  const d=g[key],m=d.motor,o=d.pivot;
  box('motor'+key,'M-'+key,'drive',m.x,m.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length);
  const faceZ=g.motor.z+g.motor.length/2,bracketTop=faceZ+5;
  for(const sign of [-1,1]) {
   box('bracket'+key+sign,'BR','support',m.x+sign*19.5,m.y,faceZ+2.5,15,54,5);
   box('bracketCross'+key+sign,'BR','support',m.x,m.y+sign*19.5,faceZ+2.5,24,15,5);
   box('riser'+key+sign,'BR','support',m.x+sign*29,m.y,bracketTop/2,5,54,-bracketTop);
  }
  cyl('motorShaft'+key,'M-'+key,'shaft',m.x,m.y,faceZ+g.motor.shaftLength/2,g.motor.shaftRadius,g.motor.shaftLength);
  const outputRadius=key==='C'?6:4,cp=g.coupling;
  cyl('coupling'+key,'CP-'+key,'drive',o.x,o.y,cp.z,cp.radius,cp.height,outputRadius);
  // Stepped bore: Ø5 motor side, Ø8/12 output side; shaft ends have a 1 mm gap.
  cyl('couplingBush'+key,'CP-'+key,'shaft',o.x,o.y,cp.z-cp.height/4,outputRadius,cp.height/2,g.motor.shaftRadius);
  for(const [i,z] of d.bearings.entries())cyl('bearing'+key+i,key==='C'?'6001':'608','bearing',o.x,o.y,z,key==='C'?14:11,key==='C'?8:7,key==='C'?6:4);
  if(key==='C'){
   // One hollow housing connects both bearing seats to the motor-mount risers.
   cyl('housingC','H-C','support',o.x,o.y,(d.bearings[0]+d.bearings[1])/2,21,d.bearings[1]-d.bearings[0]+12,14);
   for(const sign of [-1,1])cyl('bearingCapC'+sign,'H-C','support',o.x,o.y,d.bearings[1]+sign*5,21,2,12);
   cyl('footC','H-C','support',o.x,o.y,d.bearings[0],34,5,14);
  } else {
   cyl('housing'+key,'H-'+key,'support',o.x,o.y,(8+d.bearings[1]+4)/2,22,d.bearings[1]-4,11);
   box('foot'+key,'H-'+key,'support',o.x,o.y,10.5,60,60,5);
  }
  const top=key==='C'?g.paper.z:d.crankZ+4,bottom=g.coupling.shaftBottom;
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
 box('clampScrew','PEN','pen',pt.x+(screwStart+33)/2,pt.y,z,33-screwStart,4,4);
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','PEN','pen',pt.x+29,pt.y,z,6,16,16);
 const tip=p.z+p.thickness/2+.2,penTop=high+32;
 cyl('pen','PEN','pen',pt.x,pt.y,(tip+penTop)/2,g.pen.radius,penTop-tip);
 return all;
}
window.MotioGeometry={DEFAULT_CONFIG,normalize,build,bodies};
})();
