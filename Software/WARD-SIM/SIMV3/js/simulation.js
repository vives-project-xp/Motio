(function () {
'use strict';
const {TAU,distance}=window.MotioMath;
const {DEFAULT_CONFIG,inspect,audit}=window.MotioMechanics;
const approach=(value,target,step)=>value+Math.max(-step,Math.min(step,target-value));
class Simulation {
 constructor(config=DEFAULT_CONFIG) {
  this.powered=false;this.trace=[];this.configure(config);
 }
 configure(config) {
  const next=window.MotioGeometry.normalize(config),geometry=window.MotioGeometry.build(next);
  this.config=next;this.geometry=geometry;
  this.audit=audit(this.config);this.workspace=window.MotioValidation.workspace(this.config);this.drawingArea=window.MotioValidation.drawingArea(this.config);this.reset();
 }
 reset() {
  this.running=false;this.stopping=false;this.afterStopHome=false;this.homing=false;this.homed=false;this.time=0;this.penSpeed=0;this.penAcceleration=0;this.fault='';this.trace=[];this.strokeBreak=true;this.branchEvents=[];this.angularAcceleration={A:0,B:0,C:0};
  this.q={A:this.config.phaseA*Math.PI/180,B:this.config.phaseB*Math.PI/180,C:0};this.velocity={A:0,B:0,C:0};this.penVelocity={x:0,y:0};
  this.setPose(inspect(this.config,this.q));this.message=this.powered?'Home vereist · pen handmatig op vaste hoogte':'Power on → Home → Play · pen handmatig vastgezet';
 }
 setPose(pose) {
  this.pose=pose;this.linkageValid=pose.valid;this.safe=pose.safe;
  if(pose.valid) {
   this.penWorld=pose.pen;this.penLocal=window.MotioPaper.machineToPaper(pose.pen,this.q.C,this.geometry);
   this.insidePaper=window.MotioPaper.inside(this.penLocal,this.geometry);
   this.insideSafe=window.MotioPaper.inside(this.penLocal,this.geometry,this.geometry.paper.margin);
  } else {this.penWorld=null;this.penLocal=null;this.insidePaper=false;this.insideSafe=false;}
 }
 halt() {this.running=false;this.stopping=false;this.afterStopHome=false;this.homing=false;this.velocity={A:0,B:0,C:0};this.angularAcceleration={A:0,B:0,C:0};this.penVelocity={x:0,y:0};this.penSpeed=0;this.penAcceleration=0;}
 stop() {
  if(this.running){this.stopping=true;this.message='Gecoördineerd afremmen · pen blijft op papier';return;}
  this.halt();this.message='Gestopt · pen blijft op vaste hoogte';
 }
 pause() {this.stop();}
 power() {this.halt();this.powered=!this.powered;this.homed=false;this.fault='';this.message=this.powered?'Home vereist':'Power off';}
 trip(reason) {this.halt();this.homed=false;this.fault=reason;this.message='INTERLOCK · '+reason;}
 home() {
  const DESIGN=this.geometry;
  if(!this.powered||this.homing)return;
  if(this.running){this.stop();this.afterStopHome=true;return;}
  this.stop();this.fault='';
  if(!this.safe){this.trip(this.pose.issues.join(' · '));return;}
  this.homeStart={...this.q};this.homeTarget={};let duration=2;
  for(const key of ['A','B','C']) {
   const phase=key==='C'?0:this.config['phase'+key]*Math.PI/180;
   const target=phase+TAU*Math.round((this.q[key]-phase)/TAU),delta=Math.abs(target-this.q[key]);
   this.homeTarget[key]=target;
   duration=Math.max(duration,1.875*delta/((key==='C'?DESIGN.maxPaperRPM:DESIGN.maxRPM)*TAU/60),Math.sqrt(5.78*delta/(key==='C'?DESIGN.paperAcceleration:DESIGN.acceleration)));
  }
  // Validate the coordinated path before any reference motion. Runtime checks also apply.
  for(let i=0;i<=200;i++) {
   const t=i/200,s=t*t*t*(10+t*(-15+6*t)),q={};
   for(const key of ['A','B','C'])q[key]=this.homeStart[key]+(this.homeTarget[key]-this.homeStart[key])*s;
   const pose=inspect(this.config,q);if(!pose.safe){this.trip('Referentiepad onveilig: '+pose.issues[0]);return;}
  }
  this.homeDuration=duration;this.homeElapsed=0;this.homed=false;this.homing=true;this.message='Virtuele Home · A/B gecoördineerd, C afzonderlijk';
 }
 play() {
  const DESIGN=this.geometry;
  if(!this.powered||!this.homed||this.homing||this.stopping||!this.safe||this.fault)return;
  if(Math.abs(this.config.rpmA)>DESIGN.maxRPM||Math.abs(this.config.rpmB)>DESIGN.maxRPM||Math.abs(this.config.rpmC)>DESIGN.maxPaperRPM){this.trip('Toerental buiten prototypebereik');return;}
  this.running=true;this.message='Drie motorprofielen · gesloten keten bewaakt';
 }
 clearTrace(){this.trace=[];this.strokeBreak=true;}
 get state(){return !this.powered?'POWER OFF':this.fault||!this.safe?'INTERLOCK':this.homing?'HOMING':!this.homed?'NOT HOMED':this.stopping?'BRAKING':this.running?'RUNNING':this.time?'PAUSED':'HOMED';}
 advance(q,velocity,dt) {
  const DESIGN=this.geometry;
  const candidate=inspect(this.config,q);
  if(!candidate.safe){this.trip(candidate.issues[0]);return false;}
  const changed=window.MotioKinematics.branchChange(this.pose,candidate);
  if(changed.assembly){this.trip('Assembly branch switching geweigerd');return false;}
  if(changed.working){this.branchEvents.push({time:this.time,q:{...q},kind:'SERIAL WORKING BRANCH CROSSING'});if(this.branchEvents.length>100)this.branchEvents.shift();}
  const pv={x:candidate.J.ax*velocity.A+candidate.J.bx*velocity.B,y:candidate.J.ay*velocity.A+candidate.J.by*velocity.B};
  const speed=Math.hypot(pv.x,pv.y),acceleration=distance(pv,this.penVelocity)/dt;
  if(speed>DESIGN.maxPenSpeed||acceleration>DESIGN.maxPenAcceleration){this.trip(speed>DESIGN.maxPenSpeed?'Pensnelheid > '+DESIGN.maxPenSpeed+' mm/s':'Penversnelling > '+DESIGN.maxPenAcceleration+' mm/s²');return false;}
  this.angularAcceleration=Object.fromEntries(['A','B','C'].map(k=>[k,(velocity[k]-this.velocity[k])/dt]));
  this.q=q;this.velocity=velocity;this.penVelocity=pv;this.penSpeed=speed;this.penAcceleration=acceleration;this.setPose(candidate);this.recordTrace();return true;
 }
 update(dt) {
  if(!Number.isFinite(dt)||dt<=0)return;
  // All caller intervals are subdivided; no large step may jump across a forbidden pose.
  let remaining=dt;
  while(remaining>1e-10&&(this.homing||this.running)){const step=Math.min(.002,remaining);this.step(step);remaining-=step;}
 }
 step(dt) {
  const DESIGN=this.geometry;
  if(this.homing) {
   this.homeElapsed=Math.min(this.homeDuration,this.homeElapsed+dt);
   if(this.homeDuration-this.homeElapsed<1e-9)this.homeElapsed=this.homeDuration;
   const t=this.homeElapsed/this.homeDuration,s=t*t*t*(10+t*(-15+6*t)),ds=30*t*t*(1-t)**2/this.homeDuration,q={},velocity={};
   for(const key of ['A','B','C']){q[key]=this.homeStart[key]+(this.homeTarget[key]-this.homeStart[key])*s;velocity[key]=(this.homeTarget[key]-this.homeStart[key])*ds;}
   if(!this.advance(q,velocity,dt))return;
   if(t>=1){this.homing=false;this.homed=true;this.time=0;this.message='Virtuele Home voltooid · sensoren vereist bij echte bouw';}
   return;
  }
  if(!this.running||!this.powered||!this.homed)return;
  const q={},velocity={};
  for(const key of ['A','B','C']) {
   velocity[key]=approach(this.velocity[key],this.stopping?0:this.config['rpm'+key]*TAU/60,(key==='C'?DESIGN.paperAcceleration:DESIGN.acceleration)*dt);
   q[key]=this.q[key]+(this.velocity[key]+velocity[key])/2*dt;
  }
  if(!this.advance(q,velocity,dt))return;
  this.time+=dt;
  if(this.stopping&&Object.values(velocity).every(v=>Math.abs(v)<1e-10)) {
   const goHome=this.afterStopHome;this.halt();this.message='Gestopt op actuele positie · pen blijft op papier';if(goHome)this.home();return;
  }
 }
 recordTrace() {
  if(!this.insidePaper){this.strokeBreak=true;return;}
  const previous=this.trace[this.trace.length-1];
  if(this.strokeBreak||!previous||distance(this.penLocal,previous)>=.16){this.trace.push({...this.penLocal,break:this.strokeBreak});this.strokeBreak=false;}
  if(this.trace.length>150000){this.trace.splice(0,25000);this.trace[0].break=true;}
 }
}
window.MotioSimulation={Simulation};
})();
