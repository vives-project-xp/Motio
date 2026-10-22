from pathlib import Path

root = Path('Software/WARD-SIM/SIMV7')
p = root / 'js/machineGeometry.js'
s = p.read_text(encoding='utf-8')
s = s.replace('stiffenerThickness:1.5,hubHeight:8,hubRadius:16,hubBoltRadius:Math.SQRT2*8', 'stiffenerThickness:0,hubHeight:5,hubRadius:9.5,hubBoltRadius:6.35')
s = s.replace('crankDensity:1270', 'crankDensity:1240').replace('rodZA:41,rodZB:62,crankZA:18,crankZB:27', 'rodZA:42,rodZB:63,crankZA:19,crankZB:28')
s = s.replace('materialE:1500,density:1270', 'materialE:1800,density:1240')
s = s.replace('baseThickness:4,boxHeight:108', 'baseThickness:8,bottomThickness:4,boxHeight:112')
s = s.replace("'penDiameter','stiffenerThickness','hubHeight'", "'penDiameter','bottomThickness','hubHeight'")
s = s.replace("if(c.hubRadius<=c.hubBoltRadius+1.5", "if(c.stiffenerThickness!==0)throw Error('SIMV7 gebruikt geen metalen verstevigingsplaatjes');\n if(c.hubRadius<=c.hubBoltRadius+1.5")
s = s.replace('box:{height:c.boxHeight,wall:c.wallThickness,bottom:c.baseThickness-c.boxHeight}', 'box:{height:c.boxHeight,wall:c.wallThickness,bottom:c.baseThickness-c.boxHeight,bottomThickness:c.bottomThickness}')
s = s.replace("source:'goBILDA 1309-0016-0005',pilotRadius:7,pilotHeight:2", "source:'Pololu 1998',pilotRadius:0,pilotHeight:0")
s = s.replace("name:'PETG · voorlopige printkeuze'", "name:'PLA · E conservatief 1800 MPa, printproef vereist'")
s = s.replace('motorBolt:10,washerM3:1,hubWasher:.5,hubBolt:12,plateBolt:10', 'motorBolt:12,washerM3:.8,hubWasher:.5,hubBolt:10,hubBoltB:12,plateBolt:8,washerM8:1.6,nutM8:8')
s = s.replace("const top=key==='C'?paper.z-paper.thickness/2:c['crankZ'+key]-c.crankHeight/2;", "const top=key==='C'?paper.z-paper.thickness/2:c['crankZ'+key]-c.crankHeight/2-(key==='B'?2:0);")
s = s.replace('shaftAboveDeck:24-c.baseThickness', 'shaftAboveDeck:24-c.baseThickness')
start=s.index('function bodies(')
end=s.index('// Shared exterior bounds',start)
s=s[:start]+r'''function bodies(g,pose,detail=true) {
 const all=[],add=(id,bom,group,shape,props)=>all.push({id,bom,group,shape,instance:id,mount:bom,...props});
 const box=(id,bom,group,x,y,z,w,l,h,props={})=>add(id,bom,group,'box',{x,y,z,w,l,h,...props});
 const cyl=(id,bom,group,x,y,z,r,h,inner=0,props={})=>add(id,bom,group,inner?'ring':'cylinder',{x,y,z,r,h,inner,...props});
 const beam=(id,bom,group,a,b,z,w,h,props={})=>add(id,bom,group,'beam',{a,b,z,w,h,...props});
 const pitch=g.motor.mountingPitch/2,b=g.base;
 const motorHoles=()=>[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*pitch,y:y*pitch,r:1.8,h:20})));
 const hubHoles=(angle,h,r=1.7)=>Array.from({length:4},(_,i)=>({x:g.hub.boltRadius*Math.cos(angle+i*Math.PI/2),y:g.hub.boltRadius*Math.sin(angle+i*Math.PI/2),r,h}));
 const bolt=(id,bom,mount,x,y,top,length,washer=0,csk=false,key=null)=>{
  const props={mount,instance:id,...(key?{assemblyGroup:'unit'+key}:{})};
  cyl(id+'-stem',bom,'fastener',x,y,top+washer-length/2,1.5,length,0,props);
  cyl(id+'-head',bom,'fastener',x,y,csk?top-.85:top+washer+1.5,csk?2.8:2.75,csk?1.7:3,0,props);
  if(washer)cyl(id+'-washer',bom==='M3-BOLT'?'M3-WASHER':'HUB-WASHER','fastener',x,y,top+washer/2,bom==='M3-BOLT'?4.5:3.5,washer,1.6,{...props,instance:id+'-washer'});
 };
 for(const [id,z] of [['BASE',2],['base-upper',6]]){
  box(id,'BASE','frame',b.x+b.width/2,b.y+b.height/2,z,b.width,b.height,4);
  all.at(-1).holes=[];
  for(const key of ['A','B','C']){const o=g[key].pivot;all.at(-1).holes.push({x:o.x-b.width/2,y:o.y-b.height/2,r:11.25,h:20},...motorHoles().map(h=>({...h,x:h.x+o.x-b.width/2,y:h.y+o.y-b.height/2})));}
  all.at(-1).slots=[140,240].flatMap(y=>[100,250].map(x=>({x:x-b.width/2,y:y-b.height/2,w:20.2,l:4.2})));
 }
 const wall=g.box.wall,lo=g.box.bottom+g.box.bottomThickness;
 box('box-bottom','BOTTOM','frame',b.width/2,b.height/2,g.box.bottom+g.box.bottomThickness/2,b.width,b.height,g.box.bottomThickness);
 box('box-back','WALL-FB','frame',b.width/2,wall/2,lo/2,b.width,wall,-lo);
 box('box-front','WALL-FB','frame',b.width/2,b.height-wall/2,lo/2,b.width,wall,-lo);
 box('box-left','WALL-LR','frame',wall/2,b.height/2,lo/2,wall,b.height-2*wall,-lo);
 box('box-right','WALL-LR','frame',b.width-wall/2,b.height/2,lo/2,wall,b.height-2*wall,-lo);
 for(const [i,y] of [140,240].entries()){
  const props={instance:'brace'+i};
  box('brace'+i,'RIB','frame',b.width/2,y,-15,b.width-2*wall,4,30,props);
  for(const [j,x] of [100,250].entries())box('braceTab'+i+j,'RIB','frame',x,y,4,20,4,8,props);
 }
 for(const key of ['A','B','C']){
  const d=g[key],o=d.pivot,a=pose?.q?.[key]||0,unit={instance:'motor'+key};
  box('motor'+key,'MOTOR','drive',o.x,o.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length,{...unit,holes:motorHoles().map(h=>({...h,z:g.motor.length/2-g.motor.holeDepth/2,r:1.5,h:g.motor.holeDepth}))});
  cyl('motorShaft'+key,'MOTOR','shaft',o.x,o.y,12,g.motor.shaftRadius,24,0,unit);
  cyl('motorBoss'+key,'MOTOR','shaft',o.x,o.y,2.25,11,4.5,g.motor.shaftRadius,unit);
  for(const x of [-1,1])for(const y of [-1,1])bolt('motorFix'+key+x+','+y,'M3-BOLT','MOTOR-FIX',o.x+x*pitch,o.y+y*pitch,b.thickness,g.hardware.motorBolt,g.hardware.washerM3);
  const hc={instance:'hub'+key,mount:'HUB-'+key,assemblyGroup:'unit'+key};
  cyl('hub'+key,'HUB','drive',o.x,o.y,(d.hubBottom+d.hubTop)/2,g.hub.radius,g.hub.height,g.hub.bore,{...hc,holes:[...hubHoles(a,7,1.5),{axis:'x',angle:a+Math.PI/4,x:6*Math.cos(a+Math.PI/4),y:6*Math.sin(a+Math.PI/4),r:1.5,h:10}]});
  // One supplied radial M3 set screw; the 1.5 mm Allen key reaches it from outside.
  const ang=a+Math.PI/4;
  cyl('hubSet'+key,'HUB-SET','fastener',o.x+6.5*Math.cos(ang),o.y+6.5*Math.sin(ang),(d.hubBottom+d.hubTop)/2,1.5,8,0,{axis:'x',angle:ang,mount:'HUB-LOCK-'+key,approachSign:1,instance:'hubSet'+key});
 }
 const p=g.paper,angle=pose?.q?.C||0;
 cyl('platter','PL','platter',p.x,p.y,p.z,p.radius,p.thickness,0,{assemblyGroup:'unitC',holes:[{x:0,y:0,r:2.8,h:p.thickness+2},...hubHoles(angle,p.thickness+2),...hubHoles(angle,1.72,2.9).map(h=>({...h,z:p.thickness/2-.85}))]});
 for(let i=0;i<4;i++){const a=angle+i*Math.PI/2;bolt('plateFix'+i,'PL-BOLT','PL-FIX',p.x+g.hub.boltRadius*Math.cos(a),p.y+g.hub.boltRadius*Math.sin(a),p.z+p.thickness/2,g.hardware.plateBolt,0,true,'C');}
 cyl('paper','PAPER','paper',p.x,p.y,p.z+p.thickness/2+.1,p.radius,.2);
 if(!pose?.valid)return all;
 for(const key of ['A','B']){
  const d=g[key],e=key==='A'?pose.a:pose.b,a=pose.q[key],uK={x:(e.x-d.pivot.x)/g['radius'+key],y:(e.y-d.pivot.y)/g['radius'+key]},crank={instance:'K-'+key,assemblyGroup:'unit'+key};
  beam('crank'+key,'K-'+key,'moving',{x:d.pivot.x+12*uK.x,y:d.pivot.y+12*uK.y},{x:e.x-5*uK.x,y:e.y-5*uK.y},d.crankZ,g.crankWidth,g.crankHeight,crank);
  cyl('crankHub'+key,'K-'+key,'moving',d.pivot.x,d.pivot.y,d.crankZ,g.hub.rootRadius,g.crankHeight,2.8,{...crank,holes:hubHoles(a,12)});
  if(key==='B')cyl('crankBossB','K-B','moving',d.pivot.x,d.pivot.y,d.hubTop+1,14,2,2.8,{...crank,holes:hubHoles(a,12)});
  cyl('crankEnd'+key,'K-'+key,'moving',e.x,e.y,d.crankZ,12,g.crankHeight,4.2,crank);
  for(let i=0;i<4;i++){const q=a+i*Math.PI/2;bolt('crankFix'+key+i,key==='A'?'HUB-BOLT-A':'HUB-BOLT-B','K-FIX-'+key,d.pivot.x+g.hub.boltRadius*Math.cos(q),d.pivot.y+g.hub.boltRadius*Math.sin(q),d.crankZ+g.crankHeight/2,key==='A'?g.hardware.hubBolt:g.hardware.hubBoltB,.5,false,key);}
  const L=g['length'+key],u={x:(pose.pen.x-e.x)/L,y:(pose.pen.y-e.y)/L},arm={instance:'L-'+key};
  beam('rod'+key,'L-'+key,'moving',{x:e.x+12*u.x,y:e.y+12*u.y},{x:pose.pen.x-(g.pen.jointRadius-2)*u.x,y:pose.pen.y-(g.pen.jointRadius-2)*u.y},d.rodZ,g.rodWidth,g.rodHeight,{...arm,wall:g.rodWall});
  const top=d.crankZ+g.crankHeight/2,seat=d.rodZ-3.5,post={instance:'E-'+key};
  cyl('elbow'+key,'E-'+key,'moving',e.x,e.y,(top+seat-2)/2,7,seat-top-2,4.2,post);
  cyl('elbowNeck'+key,'E-'+key,'moving',e.x,e.y,seat-1,6,2,4.2,post);
  const under=d.crankZ-g.crankHeight/2-g.hardware.washerM8,length=key==='A'?50:60,mount='ELBOW-BOLT-'+key;
  cyl('elbowBolt'+key,key==='A'?'M8-BOLT-A':'M8-BOLT-B','moving',e.x,e.y,under+length/2,4,length,0,{mount,instance:'elbowBolt'+key});
  cyl('elbowHead'+key,key==='A'?'M8-BOLT-A':'M8-BOLT-B','moving',e.x,e.y,under-2.65,7.51,5.3,0,{mount,instance:'elbowBolt'+key,segments:6});
  cyl('elbowWasher'+key+'-1','M8-WASHER','moving',e.x,e.y,under+.8,8,1.6,4.2,{mount});
  const upper=d.rodZ+g.rodHeight/2;
  cyl('elbowSpacer'+key,'E-SPACER','moving',e.x,e.y,d.rodZ+5.75,6,4.5,4.2,{mount:'ELBOW-FIX'});
  cyl('elbowWasher'+key+'1','M8-WASHER','moving',e.x,e.y,upper+.8,8,1.6,4.2,{mount:'ELBOW-FIX'});
  cyl('elbowNut'+key,'M8-NUT','moving',e.x,e.y,upper+1.6+4,7.51,8,4,{mount:'ELBOW-FIX',segments:6});
  for(const [id,pt] of [['E',e],['P',pose.pen]]){
   const big=id==='P',outer=big?16:11.05,bore=big?12.3:7.3;
   cyl('end'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ,big?g.pen.jointRadius:15,g.rodHeight,outer,arm);
   cyl('armShoulder'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ-5.75,outer,4.5,bore,arm);
   cyl('joint'+id+key,big?'6804':'608','joint',pt.x,pt.y,d.rodZ,big?16:11,7,big?10:4,{mount:(big?'6804-':'608-JOINT-')+key});
  }
 }
 const pt=pose.pen,low=g.A.rodZ,high=g.B.rodZ,z=g.pen.clampZ,bottom=low-8.5,top=z-3;
 const carrier={instance:'penCarrier'};
 cyl('penSleeve','P','pen',pt.x,pt.y,(bottom+top)/2,9.95,top-bottom,6.5,carrier);
 cyl('penShoulder','P','pen',pt.x,pt.y,low-6,12,5,6.5,carrier);
 cyl('penSpacer','SP-P','pen',pt.x,pt.y,(low+high)/2,12,high-low-7,10.1);
 cyl('penTopSpacer','SP-P-TOP','pen',pt.x,pt.y,(high+3.5+z-11)/2,12,z-11-high-3.5,10.1);
 const holder={instance:'holder',holes:[{x:0,y:0,z:-7,r:10.1,h:8.02},{axis:'x',x:10,y:0,r:2.2,h:12},{axis:'x',x:7,y:0,r:4.4,h:5},{axis:'x',x:12.7,y:0,r:4.15,h:3.6,segments:6}],slots:[{x:12,y:0,z:-7,w:24,l:1,h:8.02}]};
 cyl('holder','PEN','pen',pt.x,pt.y,z,g.pen.holderRadius,22,g.pen.boreRadius,holder);
 for(const sign of [-1,1])box('holderEar'+sign,'PEN','pen',pt.x+15.5,pt.y+sign*3.75,z-7,11,6.5,8,{instance:'holder',holes:[{axis:'x',angle:Math.PI/2,x:1.5,y:0,z:0,r:1.7,h:20},...(sign>0?[{axis:'x',angle:Math.PI/2,x:1.5,y:1.8,r:3.3,h:3,segments:6}]:[])]});
 cyl('holderClampBolt','COLLAR-BOLT','pen',pt.x+17,pt.y,z-7,1.5,20,0,{axis:'x',angle:Math.PI/2});
 cyl('holderClampHead','COLLAR-BOLT','pen',pt.x+17,pt.y-8.5,z-7,2.75,3,0,{axis:'x',angle:Math.PI/2,instance:'holderClampBolt'});
 // Count both screw primitives as one purchased screw.
 all.find(v=>v.id==='holderClampBolt').instance='holderClampBolt';
 cyl('holderClampNut','M3-NUT','pen',pt.x+17,pt.y+5.7,z-7,3.18,2.4,1.5,{axis:'x',angle:Math.PI/2,segments:6});
 cyl('penClampNut','M4-NUT','pen',pt.x+12.3,pt.y,z,4.04,3.2,2,{axis:'x',segments:6});
 const bush={instance:'penBush'};
 cyl('centeringBush','BUSH','pen',pt.x,pt.y,z+4,g.pen.boreRadius,14,g.pen.radius+.15,{...bush,slots:[{x:6,y:0,w:5,l:1}],holes:[{axis:'x',x:5.5,y:0,z:-4,r:4.4,h:8}]});
 cyl('bushFlange','BUSH','pen',pt.x,pt.y,z+11.5,8,1,g.pen.radius+.15,bush);
 const screwStart=g.pen.radius+2;
 cyl('clampScrew','CLAMP-SCREW','pen',pt.x+(screwStart+32)/2,pt.y,z,2,25,0,{axis:'x'});
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','KNOB','pen',pt.x+29,pt.y,z,6,16,16,{holes:[{axis:'x',x:0,y:0,r:2.2,h:10},{axis:'x',x:1.5,y:0,r:4.15,h:3.1,segments:6}]});
 const tip=p.z+p.thickness/2+.2,penTop=z+21;
 cyl('pen','PEN-TOOL','pen',pt.x,pt.y,(tip+penTop)/2,g.pen.radius,penTop-tip);
 return all;
}
''' + s[end:]
start=s.index('function mountingFit(')
end=s.index('window.MotioGeometry=',start)
s=s[:start]+r'''function mountingFit(g){
 const issues=[],engagement=g.mounting.threadEngagement;
 if(engagement<3||engagement>g.motor.holeDepth-.3)issues.push('M3-motorbout heeft onvoldoende draad of bodemt in motor');
 if(g.base.thickness!==8||g.box.wall!==4||g.paper.thickness!==4)issues.push('Bouwbestanden vereisen 2×4 mm dek, 4 mm wanden en 4 mm plateau');
 for(const key of ['A','B','C']){
  const d=g[key],overlap=Math.min(d.hubTop,g.motor.shaftMin)-d.hubBottom;
  if(overlap<5-1e-6)issues.push('Naaf '+key+' zit niet volledig op de minimale motoras');
  if(d.hubBottom-g.base.thickness<2.5)issues.push('Naaf '+key+' te dicht bij bovenplaat');
 }
 if(g.paper.z+g.paper.thickness/2<g.motor.shaftMax+1-1e-6)issues.push('Motoras C raakt papier');
 if(g.B.rodZ-g.A.rodZ<g.rodHeight+g.clearance)issues.push('Armlagen hebben onvoldoende hoogte');
 for(const key of ['A','B']){
  const d=g[key],under=d.crankZ-g.crankHeight/2-1.6,length=key==='A'?50:60,nutTop=d.rodZ+g.rodHeight/2+1.6+8;
  if(under+length-nutTop<2.5)issues.push('M8-bout '+key+' heeft te weinig uitstekende draad voorbij borgmoer');
 }
 return {state:issues.length?'FAIL':'PASS',issues,threadEngagement:engagement,minimumShaft:23,maximumShaft:25};
}
''' + s[end:]
# Actual rendered pockets use the same polygon counts as the manufacturing solids.
s=s.replace('h.r,h.h,h.axis,h.angle)', 'h.r,h.h,h.axis,h.angle,h.segments||32)')
# A partial-height slit must not remove the upper bridge of the printed holder.
s=s.replace('const planes=[{x:c,y:s', 'const planes=[{x:c,y:s')
s=s.replace("visible=visible.flatMap(f=>subtractPolygon(f.points,planes)", "if(slot.h)planes.push({x:0,y:0,z:1,d:b.z+(slot.z||0)+slot.h/2},{x:0,y:0,z:-1,d:-b.z-(slot.z||0)+slot.h/2});\n  visible=visible.flatMap(f=>subtractPolygon(f.points,planes)")
p.write_text(s,encoding='utf-8')

# All three-dimensional materials are PLA; the old numeric estimate stays conservative.
p=root/'js/structuralEstimate.js';s=p.read_text(encoding='utf-8').replace('PETG','PLA');p.write_text(s,encoding='utf-8')
p=root/'js/spatial.js';s=p.read_text(encoding='utf-8').replace('PETG','PLA');s=s.replace("b.id==='BASE'", "b.bom==='BASE'").replace("['BASE','box-front','box-right'].includes(b.id)", "(b.bom==='BASE'||['box-front','box-right'].includes(b.id))");p.write_text(s,encoding='utf-8')
p=root/'js/collisionDetection.js';s=p.read_text(encoding='utf-8');s=s.replace("if(a.id.startsWith('motor')&&b.id==='BASE')", "if(a.id.startsWith('motor')&&b.bom==='BASE')");p.write_text(s,encoding='utf-8')
p=root/'tests/serve.js';s=p.read_text(encoding='utf-8').replace('4177','4178');p.write_text(s,encoding='utf-8')
print('SIMV7 physical geometry written')
