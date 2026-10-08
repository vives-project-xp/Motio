(function () {
'use strict';
const {distance,pointSegment,segmentsDistance}=window.MotioMath;
function polygon(b){return [{x:b.x-b.w/2,y:b.y-b.l/2},{x:b.x+b.w/2,y:b.y-b.l/2},{x:b.x+b.w/2,y:b.y+b.l/2},{x:b.x-b.w/2,y:b.y+b.l/2}];}
const inside=(p,b)=>Math.abs(p.x-b.x)<=b.w/2&&Math.abs(p.y-b.y)<=b.l/2;
function capsule(b){return b.shape==='beam'?{a:b.a,b:b.b,r:b.w/2}:{a:b,b:b,r:b.r};}
function planar(a,b) {
 if(a.shape==='box'&&b.shape==='box')return Math.hypot(Math.max(0,Math.abs(a.x-b.x)-(a.w+b.w)/2),Math.max(0,Math.abs(a.y-b.y)-(a.l+b.l)/2))||Math.max(Math.abs(a.x-b.x)-(a.w+b.w)/2,Math.abs(a.y-b.y)-(a.l+b.l)/2);
 if(a.shape==='box'||b.shape==='box') {
  const box=a.shape==='box'?a:b,c=capsule(a.shape==='box'?b:a),poly=polygon(box);
  if(inside(c.a,box)||inside(c.b,box))return -c.r;
  return Math.min(...poly.map((p,i)=>segmentsDistance(c.a,c.b,p,poly[(i+1)%4])))-c.r;
 }
 const x=capsule(a),y=capsule(b);return segmentsDistance(x.a,x.b,y.a,y.b)-x.r-y.r;
}
function gap(a,b){const xy=planar(a,b),z=Math.abs(a.z-b.z)-(a.h+b.h)/2;return xy>0&&z>0?Math.hypot(xy,z):Math.max(xy,z);}
const staticCache=new WeakMap(),staticChecks=new WeakMap();
function analyze(g,pose) {
 const minima={arm:Infinity,frame:Infinity,holder:Infinity,platform:Infinity,drive:Infinity,support:Infinity},violations=[];let minimum=Infinity,closest=null;
 const check=(a,b,category)=>{const d=gap(a,b);minima[category]=Math.min(minima[category],d);if(d<minimum){minimum=d;closest=[a.id,b.id];}if(d<g.clearance)violations.push({a:a.id,b:b.id,gap:d,category,state:d<0?'COLLISION':'CLEARANCE'});};
 if(!pose.valid)return {minimum:null,minima,violations:[],state:'NOT CALCULATED'};
 let fixed=staticCache.get(g);if(!fixed){fixed=window.MotioGeometry.bodies(g,null);staticCache.set(g,fixed);}
 const full=window.MotioGeometry.bodies(g,pose),moving=full.filter(b=>b.group==='moving'),pen=full.filter(b=>b.group==='pen'&&!['pen','penSpacer','penShoulder','penNut'].includes(b.id));
 const obstacles=fixed.filter(b=>['frame','support','drive','platter'].includes(b.group));
 for(const a of moving)for(const b of obstacles)check(a,b,b.group==='frame'?'frame':b.group==='platter'?'platform':b.group==='drive'?'drive':'support');
 for(let i=0;i<moving.length;i++)for(let j=i+1;j<moving.length;j++){
  const a=moving[i],b=moving[j];
  // Own elbow/crank/arm interfaces are deliberate joints. Cross-chain pairs are checked.
  if(a.id.slice(-1)===b.id.slice(-1))continue;
  check(a,b,'arm');
 }
 for(const a of pen) {
  for(const b of obstacles)check(a,b,'holder');
  for(const b of moving.filter(v=>v.id.startsWith('crank')||v.id.startsWith('elbow')||(['clampKnob','clampScrew','holder'].includes(a.id)&&v.id.startsWith('rod'))))check(a,b,'holder');
 }
 // Static platter-to-tower and under-deck drive-to-frame/support installation checks.
 let installation=staticChecks.get(g);
 if(!installation){
  installation=[];const platter=fixed.find(b=>b.id==='platter');
  for(const b of fixed.filter(b=>/^housing[AB]|^foot[AB]/.test(b.id)))installation.push({a:platter,b,category:'platform',d:gap(platter,b)});
  for(const a of fixed.filter(b=>b.group==='drive'))for(const b of fixed.filter(b=>b.group==='frame'||b.group==='support')) {
   if(a.id.startsWith('motor')&&['bracket','bracketCross','riser'].some(prefix=>b.id.startsWith(prefix+a.id.slice(-1))))continue;
   installation.push({a,b,category:'drive',d:gap(a,b)});
  }
  staticChecks.set(g,installation);
 }
 for(const {a,b,category,d} of installation){minima[category]=Math.min(minima[category],d);if(d<minimum){minimum=d;closest=[a.id,b.id];}if(d<g.clearance)violations.push({a:a.id,b:b.id,gap:d,category,state:d<0?'COLLISION':'CLEARANCE'});}
 return {minimum,minima,closest,violations,state:violations.some(v=>v.gap<0)?'COLLISION':violations.length?'CAUTION':'CLEAR',model:'Conservative 2.5D envelopes; rings treated as solid except designated joints'};
}
window.MotioCollision={analyze,gap};
})();
