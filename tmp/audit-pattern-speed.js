const path=require('node:path');
global.window=global;
for(const f of ['math','machineGeometry','kinematics','paperTransform','bubbleText','patterns','motorAnalysis'])require(path.join(__dirname,'../Software/WARD-SIM/SIMV3/js',f+'.js'));
const {TAU}=MotioMath;
function audit(p,wordText='MOTIO'){
 const c=MotioPatterns.prepare(MotioGeometry.normalize({...MotioGeometry.DEFAULT_CONFIG,patternId:p.id,wordText,rpmC:-p.rpm})),g=MotioGeometry.build(c);
 const speed=MotioPatterns.timing(c,p,10).speed,limit=TAU*p.turns;
 const n=MotioPatterns.isText(p)?Math.max(12000,MotioBubbleText.path(g).length*100):Math.max(4000,360*p.turns);
 let previous=null,lastV=null,maxV={A:0,B:0,C:0},maxAlpha={A:0,B:0,C:0},penSpeed=0,penAcceleration=0,torque={A:0,B:0,C:0},minSF=Infinity;
 for(let i=0;i<=n;i++){
  const next=MotioPatterns.pose(c,p,limit*i/n,previous);if(!next.valid)throw Error('IK '+p.id);previous=next.pose;
  const a=g.reachAngle*Math.PI/180,v=next.r.derivative*speed,px=Math.cos(a)*v,py=Math.sin(a)*v,J=next.pose.J,det=J.ax*J.by-J.ay*J.bx;
  const velocity={A:(J.by*px-J.bx*py)/det,B:(J.ax*py-J.ay*px)/det,C:next.paperDerivative*speed};
  const dt=limit/n/speed,alpha={};
  for(const k of ['A','B','C']){maxV[k]=Math.max(maxV[k],Math.abs(velocity[k])*60/TAU);alpha[k]=lastV?(velocity[k]-lastV[k])/dt:0;maxAlpha[k]=Math.max(maxAlpha[k],Math.abs(alpha[k]));}
  penSpeed=Math.max(penSpeed,Math.abs(v));if(lastV)penAcceleration=Math.max(penAcceleration,Math.abs(v-lastV.radial)/dt);
  const load=MotioMotor.analyze(g,next.pose,velocity,alpha);
  for(const k of ['A','B','C']){torque[k]=Math.max(torque[k],load[k].required);if(load[k].safetyFactor!==null)minSF=Math.min(minSF,load[k].safetyFactor);}
  lastV={...velocity,radial:v};
 }
 const factor=Math.min(.8*g.maxRPM/Math.max(maxV.A,maxV.B),.8*g.maxPaperRPM/maxV.C,Math.sqrt(.8*g.acceleration/Math.max(maxAlpha.A,maxAlpha.B)),Math.sqrt(.8*g.paperAcceleration/maxAlpha.C),.8*g.maxPenSpeed/penSpeed,Math.sqrt(.8*g.maxPenAcceleration/penAcceleration));
 const round=v=>Math.round(v*1000)/1000;
 console.log(JSON.stringify({id:p.id,wordText:MotioPatterns.isText(p)?wordText:undefined,rpm:p.rpm,factor:round(factor),maxV,maxAlpha,penSpeed:round(penSpeed),penAcceleration:round(penAcceleration),torque,minSF:round(minSF)}));
}
for(const p of MotioPatterns.list)audit(p);
for(const w of ['MOTIO','VIVES','I','W','S','B','ABCDEFGH','IIIIIIII','WWWWWWWW','MWMWMWMW','SSSSSSSS'])audit(MotioPatterns.get('word'),w);
