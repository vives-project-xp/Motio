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
for(const hole of deck.holes){
 const x=deck.x+hole.x,y=deck.y+hole.y;
 assert.equal(blocked(deck,{x,y,z:-1},{x,y,z:10}),false,'Rendered deck passage is open');
}
assert.equal(blocked(deck,{x:20,y:20,z:-1},{x:20,y:20,z:10}),true,'Mesh test also detects solid wood');
for(const id of ['flange','crankHubA','crankHubB','couplingA','couplingB','couplingC','nutA','shoulderC']){
 const b=find(id),h=b.holes.find(h=>h.axis==='x'),a=h.angle||0,r=b.r+.5;
 assert.equal(blocked(b,{x:b.x+r*Math.cos(a),y:b.y+r*Math.sin(a),z:b.z+(h.z||0)},{x:b.x,y:b.y,z:b.z+(h.z||0)}),false,id+' has a visible open radial passage');
 assert.equal(blocked({...b,holes:[]},{x:b.x+r*Math.cos(a),y:b.y+r*Math.sin(a),z:b.z+(h.z||0)},{x:b.x,y:b.y,z:b.z+(h.z||0)}),true,id+' would be blocked without its hole');
}
// Bolt shafts, heads and washers never cut through the wood or printed mount material.
for(const mount of ['MOTOR-FIX','BR-FIX','H-FIX','PL-FIX']){
 const step=stage(mount),hardware=parts.filter(p=>p.mount===mount),hosts=parts.filter(p=>p.shape!=='beam'&&(['BASE','BR','MOTOR','FL','PL'].includes(p.bom)||p.bom.startsWith('H-'))&&stageOf(p)<step);
 for(let frame=0;frame<=40;frame++){
  const t=frame/40;
  for(const source of hardware){const body=world(source,step,t);
   for(const point of samples(body))for(const host of hosts)assert.equal(solid(world(host,step,t),point),false,`${source.id} cuts ${host.id} at ${t}`);
   const fixture=id=>id.replace(/-(?:head|stem|lower-washer|washer|nut)$/,'');
   if(source.bom.endsWith('WASHER'))for(const head of hardware.filter(p=>p.id.endsWith('-head')&&fixture(p.id)===fixture(source.id)))for(const point of samples(body))assert.equal(solid(world(head,step,t),point),false,'Washer cannot pass through its bolt head');
  }
 }
}
// Couplings have a two-segment approach through the open side of the brackets.
for(const key of ['A','B','C']){
 const cp=find('coupling'+key),step=stageOf(cp),hosts=parts.filter(p=>['BR','BASE','MOTOR'].includes(p.bom));
 for(let frame=0;frame<=40;frame++)for(const point of samples(world(cp,step,frame/40)))for(const host of hosts)assert.equal(solid(world(host,step,frame/40),point),false,`Coupling ${key} approach intersects ${host.id}`);
}
// Holders are preassembled above the machine and then lowered as rigid units.
for(const key of ['A','B','C']){
 const bearingLow=find('bearing'+key+0),bearingHigh=find('bearing'+key+1),step=stageOf(bearingLow),bh=bearingLow.h;
 const shell=parts.filter(p=>p.bom==='H-'+key),wallRadius=bearingLow.r+2,low=bearingLow.z-bh/2-2,high=bearingHigh.z+bh/2+2;
 for(let z=low+.01;z<high;z+=.025)assert.ok(shell.some(p=>solid(p,{x:bearingLow.x+wallRadius,y:bearingLow.y,z})),'Bearing housing has a continuous outer wall at z='+z);
 assert.ok(stage('CP-A')<step,'Couplings are introduced first');
 for(let frame=0;frame<=30;frame++){
  const t=frame/30,lower=world(bearingLow,step,t),upper=world(bearingHigh,step,t);
  assert.ok(lower.z<=bearingLow.z+70+1e-8,'Lower bearing approaches from below');
  assert.ok(upper.z>=bearingHigh.z+70-1e-8,'Upper bearing approaches from above');
  for(const bearing of [lower,upper])for(const point of samples(bearing))for(const host of parts.filter(p=>p.bom==='H-'+key))assert.equal(solid(world(host,step,t),point),false,'Bearing fits its prepared seat');
 }
 const lower=find('nut'+key),upper=find('shoulder'+key),pre=stageOf(lower),post=stageOf(upper);
 assert.ok(pre<stage('H-INSTALL')&&post>stage('S-'+key));
 close(lower.z+lower.h/2,bearingLow.z-bh/2);close(upper.z-upper.h/2,bearingHigh.z+bh/2);
 for(let frame=0;frame<=30;frame++){
  const t=frame/30;
  assert.ok(world(lower,pre,t).z+lower.h/2<=world(bearingLow,pre,t).z-bh/2+1e-7,'Lower collar never passes through bearing');
  assert.ok(world(upper,post,t).z-upper.h/2>=bearingHigh.z+bh/2-1e-7,'Upper collar never passes through bearing');
 }
}
const install=stage('H-INSTALL'),group=parts.filter(p=>p.assemblyGroup==='housing');
for(let frame=0;frame<=30;frame++){
 const t=frame/30,d=offset(group[0],install,t);
 for(const body of group){assert.deepEqual(offset(body,install,t),d,'Preassembled bodies move as one unit');
  for(const point of samples(world(body,install,t)))assert.equal(solid(deck,point),false,body.id+' clears deck during installation');
 }
}
// Existing bracket heads/nuts are outside every holder foot throughout lowering.
for(const key of ['A','B','C'])for(const part of parts.filter(p=>p.mount==='BR-FIX'&&p.id.includes(key))){
 const foot=find('foot'+key);
 assert.ok(Math.abs(part.x-foot.x)-(key==='C'?foot.r:foot.w/2)>part.r,'Foot clears earlier bracket hardware');
}
// Inserts have a real counterbore, are fitted while loose, and follow the host on installation.
for(const [id,hostId,insertMount,installMount] of [['flangeFix','flange','FL-INSERT','FL-INSTALL'],['crankFixA','crankHubA','K-INSERT','K-INSTALL'],['crankFixB','crankHubB','K-INSERT','K-INSTALL']]){
 const insert=find(id+'-insert'),host=find(hostId),screw=find(id+'-screw'),a=screw.angle;
 assert.ok(stageOf(host)<stage(insertMount)&&stage(insertMount)<stage(installMount)&&stage(installMount)<stageOf(screw));
 for(let frame=0;frame<=30;frame++){
  const t=frame/30,b=world(insert,stage(insertMount),t),h=world(host,stage(insertMount),t);
  // Axis-x bodies use axial length h and a circular section in the perpendicular plane.
  for(const axial of [-.49,0,.49])for(let i=0;i<16;i++){
   const v=i*Math.PI/8,r=(insert.r+insert.inner)/2,point={x:b.x+axial*b.h*Math.cos(a)-r*Math.sin(v)*Math.sin(a),y:b.y+axial*b.h*Math.sin(a)+r*Math.sin(v)*Math.cos(a),z:b.z+r*Math.cos(v)};
   assert.equal(solid(h,point),false,id+' insert enters an existing counterbore');
  }
  assert.deepEqual(offset(insert,stage(installMount),t),offset(host,stage(installMount),t));
 }
 const shaft=find('shaft'+(hostId==='flange'?'C':hostId.slice(-1))),flat=shaft.flats.at(-1),tip={x:screw.x-Math.cos(a)*screw.h/2,y:screw.y-Math.sin(a)*screw.h/2};
 close((tip.x-shaft.x)*Math.cos(a)+(tip.y-shaft.y)*Math.sin(a),shaft.r-flat.depth);
}
// No screw crossing the four vertical platter fasteners.
const radial=find('flangeFix-screw');
close(find('shaftC').z+find('shaftC').h/2,find('platter').z-find('platter').h/2);
for(const bolt of parts.filter(p=>p.id.startsWith('plateFix')&&p.id.endsWith('-stem'))){const dx=bolt.x-g.paper.x,dy=bolt.y-g.paper.y;assert.ok(Math.abs(-dx*Math.sin(radial.angle)+dy*Math.cos(radial.angle))>bolt.r+radial.r);}
assert.ok(stage('SP-P')<stage('L-B'),'Closed pen spacer is loaded before the upper arm');
for(const part of parts)assert.ok(stageOf(part)>=0,'Explicit mounting stage for '+part.id);
for(const row of MotioBOM.create(g))assert.equal(row.qty,new Set(parts.filter(p=>p.bom===row.id).map(p=>p.instance)).size);
console.log(`SIMV5 assembly connections: real rendered passages, prepared bolt patterns, staged hardware, clear coupling paths, opposed bearing seats, rigid holder installation, collars outside bearings, preloaded inserts and clamping flats passed (${steps.length} steps).`);
