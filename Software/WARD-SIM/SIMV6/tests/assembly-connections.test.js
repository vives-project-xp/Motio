const assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','machineGeometry','kinematics','bom','assembly'])require('../js/'+f+'.js');
const g=MotioGeometry.build(MotioGeometry.normalize()),pose=MotioBOM.referencePose(g),parts=MotioGeometry.bodies(g,pose),find=id=>parts.find(p=>p.id===id);
const {steps,stageOf,offset,isCurrent}=MotioAssembly,stage=mount=>steps.findIndex(s=>s.mounts.includes(mount));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);
const world=(b,step,t)=>{const d=offset(b,step,t);return {...b,x:b.x+d.x,y:b.y+d.y,z:b.z+d.z};};
// Independent solid sampling: a passage must actually be empty at each sampled point.
function solid(b,p){
 const x=p.x-b.x,y=p.y-b.y,z=p.z-b.z,eps=1e-5;
 if(Math.abs(z)>=b.h/2-eps)return false;
 if(b.shape==='box'){if(Math.abs(x)>=b.w/2-eps||Math.abs(y)>=b.l/2-eps)return false;}
 else if(Math.hypot(x,y)>=b.r-eps||Math.hypot(x,y)<=(b.inner||0)+eps)return false;
 for(const flat of b.flats||[])if(Math.abs(z-flat.z)<flat.h/2&&x*Math.cos(flat.angle)+y*Math.sin(flat.angle)>b.r-flat.depth-eps)return false;
 return !(b.holes||[]).some(h=>{
  const dx=x-(h.x||0),dy=y-(h.y||0),dz=z-(h.z||0),a=h.angle||0;
  return h.axis==='x'?Math.abs(dx*Math.cos(a)+dy*Math.sin(a))<=h.h/2+eps&&Math.hypot(-dx*Math.sin(a)+dy*Math.cos(a),dz)<h.r+eps:Math.abs(dz)<=h.h/2+eps&&Math.hypot(dx,dy)<h.r+eps;
 });
}
function samples(b){
 const out=[];
 for(const z of [-.45,0,.45])for(let i=0;i<16;i++){
  const angle=i*Math.PI/8;
  if(b.shape==='box')out.push({x:b.x+Math.cos(angle)*b.w*.48,y:b.y+Math.sin(angle)*b.l*.48,z:b.z+z*b.h});
  else for(const r of [((b.inner||0)+b.r)/2,b.r*.96])out.push({x:b.x+Math.cos(angle)*r,y:b.y+Math.sin(angle)*r,z:b.z+z*b.h});
 }
 return out.filter(p=>solid(b,p));
}
// Ray/triangle test against the actual rendered polygons, independent of hole metadata.
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
function hitTriangle(o,d,a,b,c){
 const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-9)return false;
 const s=sub(o,a),u=dot(s,h)/det;if(u<-1e-7||u>1+1e-7)return false;
 const q=cross(s,e1),v=dot(d,q)/det;if(v<-1e-7||u+v>1+1e-7)return false;
 const t=dot(e2,q)/det;return t>1e-5&&t<1-1e-5;
}
function blocked(b,a,c){const d=sub(c,a);return MotioGeometry.surfaces(b).some(f=>f.points.slice(2).some((p,i)=>hitTriangle(a,d,f.points[0],f.points[i+1],p)));}

const deck=find('BASE');
for(const hole of deck.holes){const x=deck.x+hole.x,y=deck.y+hole.y;assert.equal(blocked(deck,{x,y,z:-1},{x,y,z:10}),false,'Rendered passage must be empty');}
assert.equal(blocked(deck,{x:20,y:20,z:-1},{x:20,y:20,z:10}),true);
for(const key of ['A','B','C']){
 const motor=find('motor'+key),shaft=find('motorShaft'+key),boss=find('motorBoss'+key),plate=find('stiffener'+key),hub=find('hub'+key);
 close(motor.z+motor.h/2,0);close(shaft.z-shaft.h/2,0);close(shaft.z+shaft.h/2,24);
 close(boss.z+boss.h/2,4.5);close(plate.z-plate.h/2,4);
 assert.ok(hub.z-hub.h/2>4.5);assert.ok(hub.z+hub.h/2<=23);
 for(const v of parts.filter(p=>p.mount==='MOTOR-FIX'&&p.id.includes(key)&&p.id.endsWith('-stem'))){
  close(v.z-v.h/2,-3.5);assert.ok(v.z-v.h/2>-.0-g.motor.holeDepth);
  for(const p of samples(v))for(const host of [deck,plate,motor])assert.equal(solid(host,p),false,v.id+' has a real prepared passage in '+host.id);
 }
 const install=stage('INSTALL-'+key),group=parts.filter(p=>p.assemblyGroup==='unit'+key);
 assert.ok(group.length>=10);
 for(let frame=0;frame<=40;frame++){
  const t=frame/40,d=offset(group[0],install,t);
  for(const b of group){assert.deepEqual(offset(b,install,t),d,'Rigid preassembled unit');
   if(b.shape!=='beam')for(const p of samples(world(b,install,t)))for(const host of [deck,plate,boss])assert.equal(solid(host,p),false,b.id+' clears '+host.id+' while lowering');
  }
 }
 const screws=parts.filter(b=>b.id.startsWith('hubClamp'+key)&&b.id.endsWith('-stem'));
 assert.equal(screws.length,2);
 for(const screw of screws){
  const a=screw.angle,from={x:screw.x-20*Math.cos(a),y:screw.y-20*Math.sin(a),z:screw.z},to={x:screw.x+20*Math.cos(a),y:screw.y+20*Math.sin(a),z:screw.z};
  assert.equal(blocked(hub,from,to),false,'Actual mesh tangent clamp-bolt passage');
  assert.ok(stageOf(screw)>install,'Tighten only after the unit is on the real shaft');
 }
}
// Each arm bearing rests on a real outer-ring shoulder; the inner stack is connected.
for(const key of ['A','B']){
 const journal=find('elbowJournal'+key),bearing=find('jointE'+key),shoulder=find('elbow'+key),spacer=find('elbowSpacer'+key),ring=find('elbowWasher'+key+'1');
 close(journal.z,bearing.z);close(journal.r,bearing.inner);close(shoulder.z+shoulder.h/2,bearing.z-bearing.h/2);
 close(spacer.z-spacer.h/2,bearing.z+bearing.h/2);close(spacer.z+spacer.h/2,ring.z-ring.h/2);
 for(const end of ['E','P']){
  const bearing=find('joint'+end+key),shelf=find('armShoulder'+end+key);
  close(shelf.z+shelf.h/2,bearing.z-bearing.h/2);
 }
}
// Pad takes an open central route before the slotted pen bush, never the M4 hole.
assert.ok(stage('PAD')<stage('BUSH'));
const pad=find('clampPad'),holder=find('holder');
for(let f=0;f<=100;f++)for(const p of samples(world(pad,stage('PAD'),f/100)))assert.equal(solid(holder,p),false,'Pad has a possible assembly path');
assert.ok(stage('SP-P')<stage('L-B'));
for(const b of parts)assert.ok(stageOf(b)>=0,'Explicit stage for '+b.id);
for(const row of MotioBOM.create(g))assert.equal(row.qty,new Set(parts.filter(p=>p.bom===row.id).map(p=>p.instance)).size);
console.log('SIMV6 connections: real deck/naaf bores, flange contact, bolt depth, minimum shaft engagement, rigid unit installation, connected bearing stacks and reachable pad path passed ('+steps.length+' steps).');
