const assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','machineGeometry','kinematics','bom','paperTransform','renderers'])require('../js/'+f+'.js');
const {normalize,build,bodies}=MotioGeometry,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≈ ${b}`);
const current=build(normalize()),old=build(normalize({baseThickness:8,wallThickness:8}));
close(current.base.thickness,4);close(current.box.wall,4);close(current.paper.thickness,4);
const woodIds=['BASE','box-bottom','box-front','box-back','box-left','box-right','platter'];
const parts=bodies(current,MotioBOM.referencePose(current)),get=id=>parts.find(p=>p.id===id),rows=MotioBOM.create(current);
for(const id of woodIds){
 const p=get(id);close(id==='box-front'||id==='box-back'?p.l:id==='box-left'||id==='box-right'?p.w:p.h,4);
 assert.equal(rows.find(r=>r.id===p.bom).material,'MDF');
}
assert.equal(rows.filter(r=>r.material==='MDF').reduce((sum,r)=>sum+r.qty,0),7);
close(current.hardware.mountBolt,20);assert.match(rows.find(r=>r.id==='M4-BOLT').dimensions,/20 mm/);
close(current.hardware.plateBolt,18);close(old.hardware.mountBolt,25);
close(get('box-front').h,100);close(get('box-left').l,396);
// Exercise the thickness dependency, including a saved 8 mm configuration.
for(const thickness of [4,6,8]){
 const g=build(normalize({baseThickness:thickness,wallThickness:thickness})),p=bodies(g,MotioBOM.referencePose(g)),find=id=>p.find(b=>b.id===id),deck=find('BASE'),floor=find('box-bottom');
 close(deck.z-deck.h/2,0);close(deck.z+deck.h/2,thickness);
 close(deck.z+deck.h/2-(floor.z-floor.h/2),108);
 for(const id of ['box-front','box-back','box-left','box-right']){
  const wall=find(id);close(wall.z-wall.h/2,floor.z+floor.h/2);close(wall.z+wall.h/2,0);
 }
 close(find('box-left').y-find('box-left').l/2,find('box-back').y+find('box-back').l/2);
 close(find('box-left').y+find('box-left').l/2,find('box-front').y-find('box-front').l/2);
 for(const key of ['A','B','C']){
  const foot=find('foot'+key),motor=find('motor'+key),shaft=find('shaft'+key),motorShaft=find('motorShaft'+key);
  close(foot.z-foot.h/2,deck.z+deck.h/2);
  close(motor.z-motor.h/2-(floor.z+floor.h/2),4);
  close(shaft.z-shaft.h/2-(motorShaft.z+motorShaft.h/2),1);
  close(shaft.z-shaft.h/2+shaft.approach,g[key].bearings[1]+(key==='C'?g.bearingC.height:g.bearingAB.height)/2+15);
  for(const b of p.filter(b=>b.mount==='H-FIX'&&b.id.includes(key)&&b.id.endsWith('-washer')&&!b.id.endsWith('-lower-washer')))close(b.z-b.h/2,foot.z+foot.h/2);
  if(key!=='C')for(const post of p.filter(b=>b.id.startsWith('housingPost'+key))){close(post.z-post.h/2,foot.z+foot.h/2);close(post.z+post.h/2,g[key].bearings[0]-g.bearingAB.height/2-2);}
 }
 for(const stem of p.filter(b=>['BR-FIX','H-FIX'].includes(b.mount)&&b.id.endsWith('-stem'))){
  const nut=find(stem.id.replace('-stem','-nut')),tip=stem.z-stem.h/2;
  assert.ok(tip<=nut.z-nut.h/2-2,'At least 2 mm thread beyond the modelled nut');
 }
}
const oldParts=bodies(old,MotioBOM.referencePose(old));
for(const key of ['A','B','C']){
 close(get('shaft'+key).h-oldParts.find(p=>p.id==='shaft'+key).h,8);
 close(current.coupling.z-old.coupling.z,-8);
 assert.deepEqual(current[key].bearings,old[key].bearings);
}
const svg=MotioRenderers.mechanismSVG({geometry:current,config:current,pose:MotioBOM.referencePose(current),q:{A:0,B:0,C:0},trace:[]},true);
assert.match(svg,/plaat 4 mm MDF/);assert.doesNotMatch(svg,/NaN|undefined/);
console.log('4 mm MDF: seven panels, closed 358 × 404 × 108 mm box, supported feet, motor floor clearance, longer coaxial shafts, washer contact, M4×20 clamp stacks, shared BOM and SVG passed.');
