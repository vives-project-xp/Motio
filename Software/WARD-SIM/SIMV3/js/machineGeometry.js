(function () {
'use strict';
const {gearPitchRadius,gearCenter}=window.MotioMath;
// Length mm, angle rad, time s, force N, mass kg; motor calculations convert to SI.
const DEFAULT_CONFIG=Object.freeze({patternId:'flower5',wordText:'MOTIO',rpmA:.8,rpmB:-.425,rpmC:-.9,phaseA:77.22318703736887,phaseB:-.20186710707678643,phaseC:0,radiusA:65,radiusB:65,lengthA:360,lengthB:340,
 pivotAx:550,pivotAy:148.5,pivotBx:210,pivotBy:-185,paperX:210,paperY:148.5,paperRadius:105,paperMargin:10,paperThickness:4,paperMass:.45,
 outputTeethA:60,outputTeethB:60,outputTeethC:80,motorTeeth:20,gearModule:1.5,motorDirectionA:0,motorDirectionB:-90,motorDirectionC:0,
 motorStepAngle:1.8,motorCurrent:1.68,motorVoltage:2.8,motorHoldingTorque:.36,motorWidth:42.3,motorLength:38,motorShaftDiameter:5,motorMountPitch:31,
 motorSupplyVoltage:24,motorDriveCurrent:1.68,motorStepsPerFullStep:2,motorCurveConditionsConfirmed:0,motorRadialLimit:28,motorRadialReference:20,motorAxialLimit:10,
 rodWidth:20,rodHeight:20,rodWall:1.5,materialE:69000,density:2700,crankWidth:16,crankHeight:8,rodZA:84,rodZB:116,crankZA:64,crankZB:96,
 baseX:75,baseY:-320,baseWidth:605,baseHeight:605,baseThickness:8,frameBraceX:85,paperZ:30,clearance:3,branch:-1,
 // Output-axis limits, with 3:1 A/B and 4:1 C reduction. At the new VIVES
 // tempo, estimated peaks are 8.3/4.5/48 motor RPM and about 0.06 Nm load.
 // Provisional build settings for the datasheet's 24 V, 1.68 A drive; the
 // published torque curve does not establish capacity below 30 motor RPM.
 maxRPM:8,maxPaperRPM:16,acceleration:1,paperAcceleration:3,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,efficiency:.85,frictionAB:.025,frictionC:.03,rotorInertia:0.0000068,gearInertia:0.00002,penMass:.10,
 penDiameter:10,penMinDiameter:6,penMaxDiameter:12,holderRadius:14,jointRadius:20,jointShaftRadius:10,jointBoreRadius:6.5,
 conditionCaution:10,conditionCritical:100,transmissionCaution:.20,transmissionCritical:.05,parallelStop:.10,workspaceStep:10,testResolution:48,positionTolerance:.5,deflectionLimit:.5,spindleBearingLow:-36,spindleBearingHigh:8,reachAngle:-140});
const cache=new WeakMap();
function normalize(input={}) {
 const c={...DEFAULT_CONFIG,...input};
 for(const k of Object.keys(DEFAULT_CONFIG))if(!['patternId','wordText'].includes(k)&&!Number.isFinite(c[k]))throw Error('Ongeldige parameter: '+k);
 if(typeof c.wordText!=='string')throw Error('Gebruik 1 tot 8 letters (A–Z).');
 c.wordText=c.wordText.trim().toUpperCase();
 if(!/^[A-Z]{1,8}$/.test(c.wordText))throw Error('Gebruik 1 tot 8 letters (A–Z), zonder spaties of cijfers.');
 if(typeof c.patternId!=='string'||(c.patternId&&window.MotioPatterns&&!window.MotioPatterns.get(c.patternId)))throw Error('Onbekend patroon');
 for(const k of ['radiusA','radiusB','lengthA','lengthB','paperRadius','paperThickness','paperMass','rodWidth','rodHeight','rodWall','materialE','density','efficiency','workspaceStep','baseWidth','baseHeight','penDiameter','motorTeeth','outputTeethA','outputTeethB','outputTeethC','gearModule','motorStepAngle','motorCurrent','motorVoltage','motorWidth','motorLength','motorShaftDiameter','motorMountPitch','motorStepsPerFullStep'])if(c[k]<=0)throw Error(k+' moet positief zijn');
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
 for(const k of ['dragForce','verticalForce','penMass','rotorInertia','gearInertia','frictionAB','frictionC'])if(c[k]<0)throw Error(k+' mag niet negatief zijn');
 if(c.workspaceStep<2||c.workspaceStep>50||c.testResolution<8||c.testResolution>180||!Number.isInteger(c.testResolution))throw Error('Workspace stap 2–50 mm; testresolutie 8–180 geheel');
 for(const k of ['motorTeeth','outputTeethA','outputTeethB','outputTeethC'])if(!Number.isInteger(c[k]))throw Error('Tandenaantal moet geheel zijn');
 if(Math.min(c.motorTeeth,c.outputTeethA,c.outputTeethB,c.outputTeethC)<17)throw Error('Minstens 17 tanden voor standaard rechte 20°-tandwielen');
 if(![0,1].includes(c.motorCurveConditionsConfirmed))throw Error('Drivercondities moeten 0 of 1 zijn');
 if(!(0<c.transmissionCritical&&c.transmissionCritical<c.transmissionCaution&&c.transmissionCaution<1&&c.conditionCaution>1&&c.conditionCritical>c.conditionCaution&&c.parallelStop>0&&c.parallelStop<1))throw Error('Ongeldige singulariteitsgrenzen');
 const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 return freeze(structuredClone(c));
}
function build(c=DEFAULT_CONFIG) {
 if(cache.has(c))return cache.get(c);
 const pitchRadius=teeth=>gearPitchRadius(teeth,c.gearModule);
 const paper={x:c.paperX,y:c.paperY,radius:c.paperRadius,safeRadius:c.paperRadius-c.paperMargin,z:c.paperZ,thickness:c.paperThickness,width:2*c.paperRadius,height:2*c.paperRadius,margin:c.paperMargin,mass:c.paperMass};
 const g={...c,base:{x:c.baseX,y:c.baseY,width:c.baseWidth,height:c.baseHeight,z:0,thickness:c.baseThickness},paper,gearZ:-12,gearWidth:9,driveSign:-1,frameZ:-18,frameSize:20,frameHeight:90,towerRadius:22,
  motor:{model:'SY42STH38-1684A',width:c.motorWidth,length:c.motorLength,shaftRadius:c.motorShaftDiameter/2,mountingPitch:c.motorMountPitch,mountingHole:'M3',z:-49},bearingAB:{inner:4,outer:11,height:7},bearingP:{inner:10,outer:16,height:7},bearingC:{inner:6,outer:14,height:8},
  pen:{min:c.penMinDiameter,max:c.penMaxDiameter,radius:c.penDiameter/2,holderRadius:c.holderRadius,jointRadius:c.jointRadius,shaftRadius:c.jointShaftRadius,boreRadius:c.jointBoreRadius,clampZ:c.paperZ+28,knobRadius:8,knobReach:32},
  material:{name:'6061-T6 aluminium · ASSUMPTION',E:c.materialE,density:c.density},pitchRadius};
 for(const key of ['A','B','C']) {
  const pivot=key==='C'?{x:paper.x,y:paper.y}:{x:c['pivot'+key+'x'],y:c['pivot'+key+'y']};
  const teeth=c['outputTeeth'+key],center=gearCenter(c.motorTeeth,teeth,c.gearModule),angle=c['motorDirection'+key]*Math.PI/180;
  g[key]={pivot,motor:{x:pivot.x+center*Math.cos(angle),y:pivot.y+center*Math.sin(angle)},crankZ:c['crankZ'+key],rodZ:c['rodZ'+key],bearings:key==='C'?[c.spindleBearingLow,c.spindleBearingHigh]:[c['crankZ'+key]-52,c['crankZ'+key]-20],ratio:teeth/c.motorTeeth,motorSign:-1,outputTeeth:teeth,center};
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
 for(const [i,x] of [...new Set([b.x+10,b.x+b.width-10,g.frameBraceX])].entries())box('railX'+i,'BASE','frame',x,b.y+b.height/2,-18,20,b.height,20);
 for(const x of [b.x+10,b.x+b.width-10])for(const y of [b.y+10,b.y+b.height-10])box('leg'+x+','+y,'BASE','frame',x,y,-55,20,20,70);
 for(const key of ['A','B','C']) {
  const d=g[key],m=d.motor,o=d.pivot;
  box('motor'+key,'M-'+key,'drive',m.x,m.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length);
  const angle=g['motorDirection'+key]*Math.PI/180,outward={x:20*Math.cos(angle),y:20*Math.sin(angle)};
  for(const sign of [-1,1]) {
   box('bracket'+key+sign,'BR','support',m.x+sign*19.5,m.y,-27.5,15,54,5);
   box('bracketCross'+key+sign,'BR','support',m.x,m.y+sign*19.5,-27.5,24,15,5);
   box('riser'+key+sign,'BR','support',m.x+outward.x+(key==='B'?sign*27:0),m.y+outward.y+(key==='B'?0:sign*27),-12.5,key==='B'?5:54,key==='B'?54:5,25);
  }
  cyl('motorShaft'+key,'M-'+key,'shaft',m.x,m.y,-18,g.motor.shaftRadius,24);
  add('gearM'+key,'G20','drive','gear',{x:m.x,y:m.y,z:g.gearZ,r:g.pitchRadius(g.motorTeeth),h:g.gearWidth,teeth:g.motorTeeth,module:g.gearModule,key,motor:true});
  add('gear'+key,'G-'+key,'drive','gear',{x:o.x,y:o.y,z:g.gearZ,r:g.pitchRadius(d.outputTeeth),h:g.gearWidth,teeth:d.outputTeeth,module:g.gearModule,key,motor:false});
  const large=g.pitchRadius(d.outputTeeth);
  for(const [i,z] of d.bearings.entries())cyl('bearing'+key+i,key==='C'?'6001':'608','bearing',o.x,o.y,z,key==='C'?14:11,key==='C'?8:7,key==='C'?6:4);
  if(key==='C'){
   // Two short seats leave the gear plane open. Side posts clear the output gear.
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
 box('clampScrew','PEN','pen',pt.x+(screwStart+33)/2,pt.y,z,33-screwStart,4,4);
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','PEN','pen',pt.x+29,pt.y,z,6,16,16);
 const tip=p.z+p.thickness/2+.2,penTop=high+32;
 cyl('pen','PEN','pen',pt.x,pt.y,(tip+penTop)/2,g.pen.radius,penTop-tip);
 return all;
}
window.MotioGeometry={DEFAULT_CONFIG,normalize,build,bodies};
})();
