(function () {
'use strict';
const {solve}=window.MotioKinematics;
const axes=['A','B'];
function available(g,key,rpm) {
 const curve=g.motorCurves?.[key];if(!curve)return {torque:null,state:'UNKNOWN · torque-speed curve unavailable'};
 const x=Math.abs(rpm),pts=curve.points;if(x<pts[0][0]||x>pts.at(-1)[0])return {torque:null,state:'UNKNOWN · outside supplied curve'};
 for(let i=1;i<pts.length;i++)if(x<=pts[i][0])return {torque:pts[i-1][1]+(pts[i][1]-pts[i-1][1])*(x-pts[i-1][0])/(pts[i][0]-pts[i-1][0]),state:'REQUIRES VALIDATION',source:curve.source};
 return {torque:null,state:'UNKNOWN'};
}
function massMatrix(g,p) {
 const j=p.J,vp=[[j.ax/1000,j.bx/1000],[j.ay/1000,j.by/1000]],M=[[0,0],[0,0]];
 for(let i=0;i<2;i++)for(let k=0;k<2;k++)M[i][k]=g.penMass*(vp[0][i]*vp[0][k]+vp[1][i]*vp[1][k]);
 for(let a=0;a<2;a++) {
  const key=axes[a],r=g['radius'+key]/1000,L=g['length'+key]/1000,q=p.q[key],u=key==='A'?p.ua:p.ub;
  const rodMass=g.tubeArea*L*1e-6*g.density,crankMass=g.crankWidth*g.crankHeight*r*1e-6*g.density;
  const vE=[[a===0?-r*Math.sin(q):0,a===1?-r*Math.sin(q):0],[a===0?r*Math.cos(q):0,a===1?r*Math.cos(q):0]];
  const w=[0,1].map(i=>(u.x*(vp[1][i]-vE[1][i])-u.y*(vp[0][i]-vE[0][i]))/L);
  for(let i=0;i<2;i++)for(let k=0;k<2;k++)M[i][k]+=rodMass*((vp[0][i]+vE[0][i])*(vp[0][k]+vE[0][k])+(vp[1][i]+vE[1][i])*(vp[1][k]+vE[1][k]))/4+rodMass*L*L/12*w[i]*w[k];
  M[a][a]+=crankMass*r*r/3+g.pulleyInertia;
 }
 return M;
}
function analyze(g,p,velocity={A:0,B:0,C:0},acceleration={A:0,B:0,C:0}) {
 if(!p.valid)return {state:'NOT CALCULATED'};
 const M=massMatrix(g,p),h=1e-5,dM=[];
 for(const key of axes) {
  const plus=solve(g,{...p.q,[key]:p.q[key]+h}),minus=solve(g,{...p.q,[key]:p.q[key]-h});
  if(!plus.valid||!minus.valid)return {state:'NOT CALCULATED',reason:'Mass-matrix derivative crosses closure boundary'};
  const a=massMatrix(g,plus),b=massMatrix(g,minus);dM.push(a.map((row,i)=>row.map((v,j)=>(v-b[i][j])/(2*h))));
 }
 const result={state:'ESTIMATE',massMatrix:M};
 for(let i=0;i<2;i++) {
  const key=axes[i];let inertia=0,coriolis=0;
  for(let j=0;j<2;j++) {
   inertia+=M[i][j]*acceleration[axes[j]];
   for(let k=0;k<2;k++)coriolis+=.5*(dM[k][i][j]+dM[j][i][k]-dM[i][j][k])*velocity[axes[j]]*velocity[axes[k]];
  }
  const staticLoad=g.dragForce*Math.hypot(p.J[i?'bx':'ax'],p.J[i?'by':'ay'])/1000;
  result[key]=axis(g,key,velocity[key],acceleration[key],staticLoad,Math.abs(inertia+coriolis),g.frictionAB);
 }
 const radius=Math.hypot(p.pen.x-g.paper.x,p.pen.y-g.paper.y)/1000,I=g.paper.mass*(g.paper.radius/1000)**2/2+g.pulleyInertia;
 result.C=axis(g,'C',velocity.C,acceleration.C,g.dragForce*radius,I*Math.abs(acceleration.C),g.frictionC);
 result.platterInertia=I;result.spindleAxial=g.paper.mass*9.80665+g.verticalForce;
 result.spindleMoment=g.verticalForce*radius;result.spindleRadialMomentPair=result.spindleMoment/((g.C.bearings[1]-g.C.bearings[0])/1000);
 result.bearingLoads=null;return result;
}
function axis(g,key,w,alpha,staticLoad,dynamic,friction) {
 const ratio=g[key].ratio,rpm=w*60/(2*Math.PI)*ratio,required=(staticLoad+dynamic+friction)/(ratio*g.efficiency)+g.rotorInertia*Math.abs(alpha)*ratio;
 const avail=available(g,key,rpm),torque=avail.torque;
 return {rpm,ratio,staticLoad,dynamic,friction,required,available:torque,curveState:avail.state,curveSource:avail.source,utilisation:torque===null?null:torque>0?required/torque*100:Infinity,safetyFactor:torque===null?null:required>0?torque/required:Infinity,beltSpeed:Math.abs(w)*g.pitchRadius(g[key].outputTeeth)/1000,state:'ESTIMATE'};
}
window.MotioMotor={analyze,available,massMatrix};
})();
