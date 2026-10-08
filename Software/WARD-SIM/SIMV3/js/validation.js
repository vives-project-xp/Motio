(function () {
'use strict';
const {TAU,distance}=window.MotioMath;
const {build}=window.MotioGeometry;
const {inverse}=window.MotioKinematics;
function workspace(config) {
 const g=build(config),step=g.workspaceStep,cells=[];let reachable=0,comfortable=0;
 for(let x=g.base.x+step/2;x<g.base.x+g.base.width;x+=step)for(let y=g.base.y+step/2;y<g.base.y+g.base.height;y+=step) {
  let state='UNREACHABLE',condition=null,clearance=null,best=-1;
  const ik=inverse(config,{x,y});
  if(ik.valid){reachable++;state='CRITICAL';
   for(const p of ik.solutions){const s=window.MotioSingularity.analyze(p,g),c=window.MotioCollision.analyze(g,p),rank=c.minimum<0||s.state==='CRITICAL'?0:c.minimum<g.clearance||s.state==='CAUTION'?1:2;
    if(rank>best){best=rank;state=['CRITICAL','CAUTION','SAFE'][rank];condition=s.condition;clearance=c.minimum;}
   }
   if(state==='SAFE')comfortable++;
  }
  cells.push({x,y,state,condition,clearance});
 }
 return {step,cells,reachable,comfortable,scope:'Discrete cell centres; any working branch within fixed assembly branch. No continuous-path proof.'};
}
function drawingArea(config) {
 const g=build(config),step=g.workspaceStep,angles=24;let count=0,missing=0,singular=0,unsafe=0,example=null;
 const halfX=g.paper.width/2-g.paper.margin,halfY=g.paper.height/2-g.paper.margin,nx=Math.ceil(2*halfX/step),ny=Math.ceil(2*halfY/step);
 for(let a=0;a<angles;a++)for(let ix=0;ix<=nx;ix++)for(let iy=0;iy<=ny;iy++) {
  const local={x:-halfX+2*halfX*ix/nx,y:-halfY+2*halfY*iy/ny},p=window.MotioPaper.paperToMachine(local,a*TAU/angles,g),ik=inverse(config,p);count++;
  if(!ik.valid){missing++;example ||= {paper:local,angle:a*360/angles,machine:p};continue;}
  if(!ik.solutions.some(p=>window.MotioSingularity.analyze(p,g).state==='SAFE'))singular++;
  if(!ik.solutions.some(p=>window.MotioCollision.analyze(g,p).minimum>=g.clearance))unsafe++;
 }
 return {count,missing,singular,unsafe,example,angles,step,reachState:missing?'FAIL':'WARNING',singularState:missing||singular?'FAIL':'WARNING',scope:'15° paper angles + Cartesian grid including margins/corners. No PASS from sampling alone.'};
}
function audit(config,resolution=36) {
 const g=build(config);let failures=0,critical=0,minSin=1,minClearance=Infinity,minGamma=180,maxGamma=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,firstIssue='';
 for(let a=0;a<resolution;a++)for(let b=0;b<resolution;b++) {
  const p=window.MotioMechanics.inspect(config,{A:a*TAU/resolution,B:b*TAU/resolution,C:0});
  if(!p.safe){failures++;firstIssue ||= p.issues[0];}if(!p.valid)continue;
  if(p.singularity.state==='CRITICAL')critical++;
  minSin=Math.min(minSin,p.sin);minClearance=Math.min(minClearance,p.clearance);minGamma=Math.min(minGamma,p.gamma);maxGamma=Math.max(maxGamma,p.gamma);
  minX=Math.min(minX,p.pen.x);maxX=Math.max(maxX,p.pen.x);minY=Math.min(minY,p.pen.y);maxY=Math.max(maxY,p.pen.y);
 }
 const d=distance(g.A.pivot,g.B.pivot),r=config.radiusA+config.radiusB,l=config.lengthA,m=config.lengthB,dmin=Math.max(0,d-r),dmax=d+r,closureAll=dmin>Math.abs(l-m)&&dmax<l+m;
 const sinBound=closureAll?Math.min(...[dmin,dmax].map(v=>Math.sqrt(Math.max(0,1-((l*l+m*m-v*v)/(2*l*m))**2)))):0;
 return {samples:resolution**2,failures,critical,firstIssue,minSin,minClearance,minGamma,maxGamma,minX,maxX,minY,maxY,closureAll,sinBound};
}
// Independent phase samples are a sweep; the second stage is a continuous ramp/reversal profile.
class EngineeringTest {
 constructor(config){this.config=config;this.g=build(config);this.resolution=config.testResolution;this.index=0;this.trajectoryIndex=0;this.duration=20;this.dt=.01;this.total=this.resolution**2+Math.round(this.duration/this.dt);this.running=true;this.previous=null;this.q={A:config.phaseA*Math.PI/180,B:config.phaseB*Math.PI/180,C:0};this.v={A:0,B:0,C:0};this.preview=null;this.report={scope:'Discrete phase sweep + 20 s ramp/reversal stress profile; no continuous global certification',samples:0,invalid:0,collisions:0,critical:0,cautions:0,workingChanges:0,assemblyChanges:0,minClearance:Infinity,minima:{arm:Infinity,frame:Infinity,holder:Infinity,platform:Infinity,drive:Infinity},maxRPM:0,maxSpeed:0,maxAcceleration:0,maxDeflection:0,maxElasticXY:0,maxTorque:{A:0,B:0,C:0},minSafety:{A:Infinity,B:Infinity,C:Infinity},curveMissing:false,missingCurve:{A:false,B:false,C:false},worst:[],complete:false};}
 cancel(){this.running=false;this.report.cancelled=true;}
 step(budget=25) {
  const end=performance.now()+budget;
  while(this.running&&performance.now()<end) {
   let q,v={A:0,B:0,C:0},alpha={A:0,B:0,C:0},continuous=false;
   if(this.index<this.resolution**2){const a=Math.floor(this.index/this.resolution),b=this.index%this.resolution;q={A:a*TAU/this.resolution,B:b*TAU/this.resolution,C:this.index*TAU/(this.resolution**2-1)};this.index++;}
   else {
    if(this.trajectoryIndex>=this.duration/this.dt){this.running=false;this.report.complete=true;break;}
    continuous=true;const t=this.trajectoryIndex*this.dt;q={...this.q};
    for(const key of ['A','B','C']) {
     const max=(key==='C'?this.g.maxPaperRPM:this.g.maxRPM)*TAU/60,acc=key==='C'?this.g.paperAcceleration:this.g.acceleration,target=(t<10?1:-1)*max*(key==='B'?-.83:1);
     v[key]=this.v[key]+Math.max(-acc*this.dt,Math.min(acc*this.dt,target-this.v[key]));alpha[key]=(v[key]-this.v[key])/this.dt;q[key]+=(v[key]+this.v[key])/2*this.dt;
    }
    this.q=q;this.v=v;this.trajectoryIndex++;
   }
   this.sample(q,v,alpha,continuous);
  }
  return this.report;
 }
 sample(q,v,alpha,continuous) {
  const g=this.g,r=this.report,p=window.MotioMechanics.inspect(this.config,q);r.samples++;this.preview={pose:p,q,geometry:g,config:this.config,trace:[]};
  if(!p.valid){r.invalid++;if(continuous)this.previous=null;return;}
  const s=p.singularity,c=p.collision;
  if(s.state==='CRITICAL')r.critical++;if(s.state==='CAUTION')r.cautions++;if(c.minimum<0)r.collisions++;
  if(c.minimum<r.minClearance){r.minClearance=c.minimum;r.closest=c.closest;}
  for(const k of Object.keys(r.minima))r.minima[k]=Math.min(r.minima[k],c.minima[k]);
  if(r.worst.length<12&&(s.state==='CRITICAL'||c.minimum<g.clearance))r.worst.push({q:{...q},machine:p.pen,condition:s.condition,clearance:c.minimum,pair:c.closest});
  const structure=window.MotioStructure.analyze(g,p);r.maxDeflection=Math.max(r.maxDeflection,structure.verticalEnvelope);r.maxElasticXY=Math.max(r.maxElasticXY,structure.errorXY);
  if(!continuous)return;
  const pv={x:p.J.ax*v.A+p.J.bx*v.B,y:p.J.ay*v.A+p.J.by*v.B},speed=Math.hypot(pv.x,pv.y);
  r.maxSpeed=Math.max(r.maxSpeed,speed);
  if(this.previous){r.maxAcceleration=Math.max(r.maxAcceleration,distance(pv,this.previous.pv)/this.dt);const change=window.MotioKinematics.branchChange(this.previous.pose,p);r.workingChanges+=Number(change.working);r.assemblyChanges+=Number(change.assembly);}
  this.previous={pose:p,pv};
  const motor=window.MotioMotor.analyze(g,p,v,alpha);
  for(const key of ['A','B','C']) {
   r.maxRPM=Math.max(r.maxRPM,Math.abs(v[key]*g[key].ratio*60/TAU));
   if(motor[key]){r.maxTorque[key]=Math.max(r.maxTorque[key],motor[key].required);if(motor[key].safetyFactor===null){r.curveMissing=true;r.missingCurve[key]=true;}else r.minSafety[key]=Math.min(r.minSafety[key],motor[key].safetyFactor);}else {r.curveMissing=true;r.missingCurve[key]=true;}
  }
 }
 get progress(){return (this.index+this.trajectoryIndex)/this.total;}
}
function rows(sim,test) {
 const g=sim.geometry,a=sim.audit,area=sim.drawingArea,r=test?.report,complete=r?.complete;
 const result=[],add=(name,state,value,evidence)=>result.push({name,state,value,evidence});
 add('Full drawing area reachable',area.reachState,`${area.missing} / ${area.count} onbereikbaar`,area.scope);
 add('Singularity-free drawing area',area.singularState,`${area.singular} gevoelige punten; ${area.missing} onbereikbaar`,area.scope);
 add('Analytische sluiting · alle A/B-hoeken',a.closureAll?'PASS':'WARNING',`|sin γ| ≥ ${a.sinBound.toFixed(4)}`,'Exacte driehoeksgrenzen; geen bewijs van seriële singulariteitsvrijheid');
 for(const [k,name] of [['arm','Arm-arm collision'],['frame','Arm-frame collision'],['holder','Pen-holder clearance'],['platform','Paper-platform clearance'],['drive','Drive / frame clearance']]) {
  const val=complete?r.minima[k]:null;
  add(name,val===null?'NOT CALCULATED':val<g.clearance?'FAIL':'WARNING',val===null?'Voer engineering test uit':val.toFixed(2)+' mm','Gemodelleerde enveloppen, steekproef; geen toleranties of continue collision proof');
 }
 for(const key of ['A','B','C'])add('Maximum motor '+key+' torque',!complete?'NOT CALCULATED':r.minSafety[key]<1?'FAIL':'WARNING',complete?r.maxTorque[key].toFixed(4)+' Nm · ESTIMATE':'—','20 s stressprofiel; gemeten torque-speed curve vereist voor motorvrijgave');
 for(const [name,key,unit,limit] of [['Maximum motor RPM','maxRPM','RPM',Infinity],['Maximum pen velocity','maxSpeed','mm/s',g.maxPenSpeed],['Maximum pen acceleration','maxAcceleration','mm/s²',g.maxPenAcceleration],['Maximum predicted arm deflection','maxDeflection','mm',g.deflectionLimit],['Elastic tube XY error only','maxElasticXY','mm',g.positionTolerance]])add(name,!complete?'NOT CALCULATED':r[key]>limit?'FAIL':'WARNING',complete?r[key].toFixed(3)+' '+unit:'—','Sample maximum / ESTIMATE; geen globaal maximum');
 add('Estimated maximum positioning error','NOT CALCULATED','UNKNOWN','Lagerspeling, riemelasticiteit, shaft- en eindstukcompliance ontbreken');
 add('Bearing loads / life','NOT CALCULATED','REQUIRES VALIDATION','Riemvoorspanning, lagercapaciteit, fits en belastingrichting ontbreken');
 add('Paper spindle axial load','WARNING',(g.paper.mass*9.80665+g.verticalForce).toFixed(2)+' N · ESTIMATE','Eigengewicht + aangenomen pendruk; kanteling en riemlast apart');
 add('Minimum mechanical clearance',!complete?'NOT CALCULATED':r.minClearance<g.clearance?'FAIL':'WARNING',complete?r.minClearance.toFixed(2)+' mm':'—','Envelopmodel + sampled poses; hardware/toleranties nog te testen');
 add('Paper supported by circular platter',Math.hypot(g.paper.width/2,g.paper.height/2)<=g.paper.radius?'PASS':'FAIL','Hoekradius '+Math.hypot(g.paper.width/2,g.paper.height/2).toFixed(2)+' mm','Exacte rechthoek-hoekradius versus plateauradius');
 return result;
}
window.MotioValidation={workspace,drawingArea,audit,EngineeringTest,rows};
})();
