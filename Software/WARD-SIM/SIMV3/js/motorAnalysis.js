(function () {
'use strict';
const {solve}=window.MotioKinematics;
const axes=['A','B'];
// Approximate readings from the supplied SY42STH38-1684A graph, not measured data.
// Graph: PPS, 24 VDC, constant current 1.68 A, HALF STEP (400 pulses/revolution).
const DATASHEET_CURVE=Object.freeze({source:'SY42STH38-1684A.pdf · pull-out curve (afgelezen, circa)',supplyVoltage:24,current:1.68,stepsPerFullStep:2,approximate:true,
 points:Object.freeze([[30,.26],[75,.29],[105,.30],[135,.28],[180,.24],[270,.24],[360,.23],[450,.22],[600,.20],[750,.19]].map(Object.freeze))});
function available(g,key,rpm) {
 const custom=g.motorCurves?.[key],curve=custom||DATASHEET_CURVE;
 const qualified=!!g.motorCurveConditionsConfirmed&&(custom?!!custom.conditionsConfirmed:
  g.motorSupplyVoltage===curve.supplyVoltage&&g.motorDriveCurrent===curve.current&&g.motorStepsPerFullStep===curve.stepsPerFullStep);
 const x=Math.abs(rpm),pts=curve.points;
 if(x<pts[0][0]||x>pts.at(-1)[0])return {torque:null,state:'Niet aangetoond · buiten curvebereik',source:curve.source,qualified:false};
 for(let i=1;i<pts.length;i++)if(x<=pts[i][0])return {torque:pts[i-1][1]+(pts[i][1]-pts[i-1][1])*(x-pts[i-1][0])/(pts[i][0]-pts[i-1][0]),state:qualified?'Curvecondities bevestigd':'Niet aangetoond · drivercondities bevestigen',source:curve.source,qualified,approximate:curve.approximate!==false};
 return {torque:null,state:'Niet aangetoond',qualified:false};
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
  M[a][a]+=crankMass*r*r/3+g.gearInertia;
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
 const radius=Math.hypot(p.pen.x-g.paper.x,p.pen.y-g.paper.y)/1000,I=g.paper.mass*(g.paper.radius/1000)**2/2+g.gearInertia;
 result.C=axis(g,'C',velocity.C,acceleration.C,g.dragForce*radius,I*Math.abs(acceleration.C),g.frictionC);
 result.platterInertia=I;result.spindleAxial=g.paper.mass*9.80665+g.verticalForce;
 result.spindleMoment=g.verticalForce*radius;result.spindleRadialMomentPair=result.spindleMoment/((g.C.bearings[1]-g.C.bearings[0])/1000);
 result.bearingLoads=null;return result;
}
function axis(g,key,w,alpha,staticLoad,dynamic,friction) {
 const ratio=g[key].ratio,rpm=(g.driveSign||-1)*w*60/(2*Math.PI)*ratio,required=(staticLoad+dynamic+friction)/(ratio*g.efficiency)+g.rotorInertia*Math.abs(alpha)*ratio;
 const avail=available(g,key,rpm),torque=avail.torque;
 const fullSteps=360/g.motorStepAngle,pulsesPerRevolution=fullSteps*g.motorStepsPerFullStep;
 // Tangential tooth force is an indicative lower bound on shaft radial load.
 const toothForce=(staticLoad+dynamic+friction)/(g.pitchRadius(g[key].outputTeeth)/1000);
 return {rpm,ratio,staticLoad,dynamic,friction,required,available:torque,qualified:avail.qualified,curveState:avail.state,curveSource:avail.source,utilisation:torque===null?null:torque>0?required/torque*100:Infinity,safetyFactor:torque===null?null:required>0?torque/required:Infinity,
  fullStepsPerOutputRevolution:fullSteps*ratio,pulsesPerOutputRevolution:pulsesPerRevolution*ratio,pulseRate:Math.abs(rpm)*pulsesPerRevolution/60,toothForce,state:'ESTIMATE'};
}
window.MotioMotor={analyze,available,massMatrix,DATASHEET_CURVE};
})();
