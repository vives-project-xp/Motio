const assert=require('node:assert/strict');global.window=global;
for(const f of ['math','machineGeometry','kinematics','bom','fabrication','assembly'])require('../js/'+f+'.js');
const g=MotioGeometry.build(MotioGeometry.normalize()),p=MotioBOM.referencePose(g),parts=MotioGeometry.bodies(g,p),find=id=>parts.find(b=>b.id===id),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≈ ${b}`);
assert.equal(MotioGeometry.mountingFit(g).state,'PASS');
assert.equal(MotioBOM.create(g).find(r=>r.id==='HUB').qty,3);assert.equal(MotioBOM.create(g).find(r=>r.id==='HUB-CLAMP').qty,6);
assert.ok(!parts.some(b=>b.id.startsWith('hubSet')||b.bom==='HUB-SET'));
for(const key of ['A','B','C']){
 const hub=find('hub'+key),pilot=find('hubPilot'+key),d=g[key];
 close(hub.r,16);close(hub.h,8);close(pilot.r,7);close(pilot.h,2);close(pilot.z+1,hub.z-4);
 close(Math.min(23,d.hubTop)-(d.hubBottom-2),10);assert.ok(d.hubBottom-2>=5);
 assert.ok(hub.slots.length===2,'Visible split bore');
 for(const screw of parts.filter(b=>b.id.startsWith('hubClamp'+key)&&b.id.endsWith('-stem'))){
  const u={x:Math.cos(screw.angle),y:Math.sin(screw.angle)},a={x:screw.x-u.x*7,y:screw.y-u.y*7},b={x:screw.x+u.x*7,y:screw.y+u.y*7};
  assert.ok(MotioMath.segmentsDistance(a,b,d.pivot,d.pivot)-screw.r>2.5,'Pinch bolt must never press against motor shaft');
 }
 const holes=hub.holes.filter(h=>!h.axis);assert.equal(holes.length,4);
 for(const h of holes){close(Math.abs(h.x*Math.cos(p.q[key])+h.y*Math.sin(p.q[key])),8);close(Math.abs(-h.x*Math.sin(p.q[key])+h.y*Math.cos(p.q[key])),8);}
 if(key!=='C'){
  const beam=find('crank'+key),dx=beam.b.x-beam.a.x,dy=beam.b.y-beam.a.y,L=Math.hypot(dx,dy);
  for(const bolt of parts.filter(b=>b.id.startsWith('crankFix'+key)&&b.id.endsWith('-stem'))){
   const x=bolt.x-beam.a.x,y=bolt.y-beam.a.y,t=(x*dx+y*dy)/L,n=(-x*dy+y*dx)/L;
   assert.ok(t+bolt.r<0||t-bolt.r>L||Math.abs(n)-bolt.r>beam.w/2,'Crank strip must not fill root screw holes');
   close(bolt.z-bolt.h/2,d.hubTop-5.5);
  }
 }
}
const blanks=MotioFabrication.parts(g);for(const id of ['crank','platter'])assert.equal(blanks.find(p=>p.id===id).holes.filter(h=>h.r===2.2).length,4);
console.log('Three Ø5 clamping hubs: 10 mm shaft overlap, six tangential pinch bolts, square M4 patterns, clear root holes and unchanged mounting heights passed.');
