(function () {
'use strict';
const {distance,cross,subtract,TAU}=window.MotioMath;
const clamp=x=>Math.max(-1,Math.min(1,x));
function solve(config,q) {
 const g=window.MotioGeometry.build(config);
 const a={x:g.A.pivot.x+config.radiusA*Math.cos(q.A),y:g.A.pivot.y+config.radiusA*Math.sin(q.A)};
 const b={x:g.B.pivot.x+config.radiusB*Math.cos(q.B),y:g.B.pivot.y+config.radiusB*Math.sin(q.B)};
 const d=distance(a,b),la=config.lengthA,lb=config.lengthB;
 if(!Number.isFinite(d)||d<=1e-9||d>=la+lb||d<=Math.abs(la-lb))return {valid:false,a,b,reason:'Keten kan niet sluiten / parallelle dode stand',branch:g.branch};
 const t=(la*la-lb*lb+d*d)/(2*d),h2=la*la-t*t;
 if(h2<=1e-10)return {valid:false,a,b,reason:'Samenvallende assembly branches',branch:g.branch};
 const h=Math.sqrt(h2)*g.branch,dx=(b.x-a.x)/d,dy=(b.y-a.y)/d;
 const pen={x:a.x+t*dx-h*dy,y:a.y+t*dy+h*dx};
 const ua={x:(pen.x-a.x)/la,y:(pen.y-a.y)/la},ub={x:(pen.x-b.x)/lb,y:(pen.y-b.y)/lb};
 const determinant=cross(ua,ub),dotA=ua.x*(-config.radiusA*Math.sin(q.A))+ua.y*config.radiusA*Math.cos(q.A),dotB=ub.x*(-config.radiusB*Math.sin(q.B))+ub.y*config.radiusB*Math.cos(q.B);
 const J={ax:ub.y*dotA/determinant,ay:-ub.x*dotA/determinant,bx:-ua.y*dotB/determinant,by:ua.x*dotB/determinant};
 return {valid:true,a,b,pen,ua,ub,J,q:{...q},branch:g.branch,workingBranch:{A:Math.sign(dotA),B:Math.sign(dotB)},sin:Math.abs(determinant),gamma:Math.acos(clamp(ua.x*ub.x+ua.y*ub.y))*180/Math.PI,
  armAngleA:Math.atan2(ua.y,ua.x),armAngleB:Math.atan2(ub.y,ub.x),serialA:Math.abs(dotA/config.radiusA),serialB:Math.abs(dotB/config.radiusB),closureMargin:Math.min(la+lb-d,d-Math.abs(la-lb))};
}
function inverse(config,pen,previous=null,lockWorking=false) {
 const g=window.MotioGeometry.build(config),angles={};
 for(const key of ['A','B']) {
  const o=g[key].pivot,r=config['radius'+key],l=config['length'+key],d=distance(o,pen);
  if(!Number.isFinite(d)||d<1e-9||d>r+l+1e-8||d<Math.abs(r-l)-1e-8)return {valid:false,solutions:[],reason:'P buiten annulus '+key};
  const alpha=Math.acos(clamp((r*r+d*d-l*l)/(2*r*d))),phi=Math.atan2(pen.y-o.y,pen.x-o.x);
  angles[key]=[phi-alpha,phi+alpha];
 }
 const solutions=[];
 for(const A of angles.A)for(const B of angles.B) {
  const q={A,B,C:previous?.q?.C||0};
  for(const key of ['A','B'])if(previous?.q)q[key]+=TAU*Math.round((previous.q[key]-q[key])/TAU);
  const pose=solve(config,q);
  if(!pose.valid||distance(pose.pen,pen)>1e-5)continue;
  if(lockWorking&&previous?.workingBranch&&['A','B'].some(k=>previous.workingBranch[k]!==pose.workingBranch[k]))continue;
  if(previous&&pose.branch!==previous.branch)continue;
  solutions.push(pose);
 }
 solutions.sort((a,b)=>previous?.q?(a.q.A-previous.q.A)**2+(a.q.B-previous.q.B)**2-((b.q.A-previous.q.A)**2+(b.q.B-previous.q.B)**2):0);
 return {valid:!!solutions.length,solutions,pose:solutions[0],q:solutions[0]?.q,reason:solutions.length?'':'P vereist andere assembly/working branch'};
}
function branchChange(previous,next) {
 if(!previous?.valid||!next?.valid)return {assembly:false,working:false};
 return {assembly:previous.branch!==next.branch||Math.sign(cross(subtract(previous.b,previous.a),subtract(previous.pen,previous.a)))!==Math.sign(cross(subtract(next.b,next.a),subtract(next.pen,next.a))),working:['A','B'].some(k=>previous.workingBranch[k]*next.workingBranch[k]<0)};
}
window.MotioKinematics={solve,inverse,branchChange};
})();
