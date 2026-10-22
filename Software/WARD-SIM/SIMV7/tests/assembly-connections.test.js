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

const deck=find('BASE');close(deck.h,6);
for(const hole of deck.holes){const x=deck.x+hole.x,y=deck.y+hole.y;assert.equal(blocked(deck,{x,y,z:-1},{x,y,z:10}),false,'Actual rendered motor passage');}
assert.equal(blocked(deck,{x:20,y:20,z:-1},{x:20,y:20,z:10}),true);
assert.equal(MotioGeometry.mountingFit(g).state,'PASS');
for(const key of ['A','B','C']){
 const hub=find('hub'+key),shaft=find('motorShaft'+key),motor=find('motor'+key);
 close(motor.z+motor.h/2,0);close(shaft.z+shaft.h/2,24);
 assert.ok(hub.z+hub.h/2<=23,'Whole 5 mm hub lies on minimum shaft');
 close(hub.h,5);close(hub.r,9.5);
 for(const v of parts.filter(p=>p.mount==='MOTOR-FIX'&&p.id.includes(key)&&p.id.endsWith('-stem'))){close(v.z-v.h/2,-3.2);for(const p of samples(v))assert.equal(solid(deck,p),false);}
 const group=parts.filter(p=>p.assemblyGroup==='unit'+key),install=stage('INSTALL-'+key);
 for(let frame=0;frame<=20;frame++)for(const b of group)assert.deepEqual(offset(b,install,frame/20),offset(group[0],install,frame/20),'Rigid preassembled unit');
 assert.equal(parts.filter(p=>p.id==='hubSet'+key).length,1);
 assert.ok(stage('HUB-LOCK-'+key)>install);
}
for(const key of ['A','B']){
 const bearing=find('jointE'+key),neck=find('elbowNeck'+key),spacer=find('elbowSpacer'+key),washer=find('elbowWasher'+key+'1'),nut=find('elbowNut'+key),bolt=find('elbowBolt'+key);
 close(neck.z+neck.h/2,bearing.z-bearing.h/2);
 close(spacer.z-spacer.h/2,bearing.z+bearing.h/2);
 close(spacer.z+spacer.h/2,washer.z-washer.h/2);
 close(washer.z+washer.h/2,nut.z-nut.h/2);
 assert.ok(bolt.z+bolt.h/2-(nut.z+nut.h/2)>=2.5,'Two M8 thread pitches beyond nylon nut');
 for(const end of ['E','P']){const bearing=find('joint'+end+key),shelf=find('armShoulder'+end+key);close(shelf.z+shelf.h/2,bearing.z-bearing.h/2);}
}
const low=find('jointPA'),high=find('jointPB'),carrier=find('penSleeve'),flange=find('penShoulder'),middle=find('penSpacer'),upper=find('penTopSpacer'),holder=find('holder');
close(flange.z+flange.h/2,low.z-low.h/2);
close(middle.z-middle.h/2,low.z+low.h/2);close(middle.z+middle.h/2,high.z-high.h/2);
close(upper.z-upper.h/2,high.z+high.h/2);close(upper.z+upper.h/2,holder.z-holder.h/2);
close(carrier.z+carrier.h/2,holder.z-3.5); // 0.5 mm tip-to-step reserve.
assert.ok(stage('P')>stage('6804-B'));assert.ok(stage('SP-P')<stage('L-B'));
for(let i=0;i<=20;i++){const a=offset(carrier,stage('P'),i/20),b=offset(flange,stage('P'),i/20);assert.deepEqual(a,b);assert.ok(a.z<=0,'Carrier is inserted from below');}
assert.ok(stage('PAD')<stage('BUSH'));
const pad=find('clampPad');
for(let f=0;f<=100;f++)for(const p of samples(world(pad,stage('PAD'),f/100)))assert.equal(solid(holder,p),false,'Pad enters through open central bore and radial chamber');
for(const b of parts)assert.ok(stageOf(b)>=0,'Explicit assembly stage: '+b.id);
for(const row of MotioBOM.create(g))assert.equal(row.qty,new Set(parts.filter(p=>p.bom===row.id).map(p=>p.instance)).size);
console.log('SIMV7: real mounting bores, full hub engagement, M8 clamp stacks, continuous pen bearing stack, carrier and pad insertion paths, and '+steps.length+' assembly steps passed.');

