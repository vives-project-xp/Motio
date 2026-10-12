(function () {
'use strict';
const {TAU,distance}=window.MotioMath;
const {build}=window.MotioGeometry;
const {inverse}=window.MotioKinematics;
function workspace(config) {
 const g=build(config),step=g.workspaceStep,cells=[];let reachable=0,comfortable=0;
 for(let x=g.paper.x-g.paper.radius+step/2;x<g.paper.x+g.paper.radius;x+=step)for(let y=g.paper.y-g.paper.radius+step/2;y<g.paper.y+g.paper.radius;y+=step) {
  if(Math.hypot(x-g.paper.x,y-g.paper.y)>g.paper.radius)continue;
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
// Reachability is radial when paper rotation is independent: a continuous safe
// machine-space route from radius 0 to R, plus unrestricted C rotation, covers
// every point of the paper disk. The small intervals below are proved with
// analytic distance bounds and conservative motion envelopes, not point samples.
function drawingArea(config) {
 const g=build(config),angle=g.reachAngle*Math.PI/180,u={x:Math.cos(angle),y:Math.sin(angle)},R=g.paper.safeRadius;
 const result={count:0,missing:0,singular:0,unsafe:0,step:.5,angles:'360° continu',reachState:'NIET BEWEZEN',singularState:'NIET BEWEZEN',collisionState:'NIET BEWEZEN',minClearanceBound:Infinity,minSinBound:1,minSerialBound:1,maxConditionBound:0,routeAngle:g.reachAngle,routeRadius:R,
  scope:'Continue radiale penroute + onafhankelijke papierrotatie; analytische annulusgrenzen en bewegingsenveloppen over elk interval. Geen bewijs voor alle willekeurige motorstanden.'};
 const point=t=>({x:g.paper.x+t*u.x,y:g.paper.y+t*u.y});
 const home=window.MotioKinematics.solve(config,{A:g.phaseA*Math.PI/180,B:g.phaseB*Math.PI/180,C:g.phaseC*Math.PI/180});
 const centre=inverse(config,point(0),home.valid?home:null,true);
 if(!centre.valid){result.missing=1;result.reachState='FAIL';result.reason='Het papiercentrum is niet bereikbaar op de gekozen bewegingsconfiguratie; papierrotatie verplaatst dit punt niet.';return result;}
 let previous=centre.pose;
 const fail=reason=>{result.reason=reason;return result;};
 // Exact distance range from a pivot to a radial line segment.
 function legBound(key,lo,hi) {
  const o=g[key].pivot,x=g.paper.x-o.x,y=g.paper.y-o.y,dot=x*u.x+y*u.y,at=Math.max(lo,Math.min(hi,-dot));
  const d2=t=>(x+t*u.x)**2+(y+t*u.y)**2,low=d2(at),high=Math.max(d2(lo),d2(hi)),r=g['radius'+key],l=g['length'+key];
  if(low<=(r-l)**2||high>=(r+l)**2)return null;
  const cos=d=>(d-r*r-l*l)/(2*r*l),extreme=Math.max(Math.abs(cos(low)),Math.abs(cos(high)));
  return Math.sqrt(Math.max(0,1-extreme*extreme));
 }
 const intervals=Math.ceil(R/result.step);
 for(let i=0;i<intervals;i++) {
  const lo=R*i/intervals,hi=R*(i+1)/intervals,mid=(lo+hi)/2,delta=(hi-lo)/2;result.count++;
  const serialA=legBound('A',lo,hi),serialB=legBound('B',lo,hi);
  if(serialA===null||serialB===null){result.missing++;return fail('Deze radiale route verlaat een armannulus. Een andere route of aangepaste kruklengte is nodig.');}
  if(Math.min(serialA,serialB)<=g.transmissionCritical){result.singular++;return fail('Seriële singulariteitsmarge van de radiale route is te klein.');}
  const ik=inverse(config,point(mid),previous,true);
  if(!ik.valid){result.missing++;return fail('De radiale route kan niet op dezelfde assembly- en working branch worden gevolgd.');}
  const p=ik.pose;previous=p;
  // From the rod constraint: |dq/ds| <= 1 / (crankRadius * serial).
  // Thus each elbow moves at most delta/serial from the interval midpoint.
  const elbowA=delta/serialA,elbowB=delta/serialB,d=distance(p.a,p.b),la=g.lengthA,lb=g.lengthB;
  const dLo=Math.max(0,d-elbowA-elbowB),dHi=d+elbowA+elbowB;
  if(dLo<=Math.abs(la-lb)||dHi>=la+lb){result.singular++;return fail('Parallelle sluiting niet over het volledige interval bewezen.');}
  const sinAt=v=>Math.sqrt(Math.max(0,1-((la*la+lb*lb-v*v)/(2*la*lb))**2)),sin=Math.min(sinAt(dLo),sinAt(dHi));
  const cos=Math.sqrt(Math.max(0,1-sin*sin)),condition=Math.sqrt((1+cos)/(1-cos))*Math.max(g.radiusA,g.radiusB)/Math.min(g.radiusA*serialA,g.radiusB*serialB);
  result.minSerialBound=Math.min(result.minSerialBound,serialA,serialB);result.minSinBound=Math.min(result.minSinBound,sin);result.maxConditionBound=Math.max(result.maxConditionBound,condition);
  if(sin<=g.parallelStop||sin<=g.transmissionCritical||condition>=g.conditionCritical){result.singular++;return fail('Singulariteitsgrens niet over het volledige route-interval bewezen.');}
  // Rod end trimming also changes with arm direction: |du/ds| <=
  // (1 + 1/serial)/L. Include both configured endpoint trims conservatively.
  const trim=Math.max(12,g.pen.jointRadius-2),motion={A:elbowA+trim/la*(delta+elbowA),B:elbowB+trim/lb*(delta+elbowB),pen:delta};
  const collision=window.MotioCollision.analyze(g,p,motion);
  result.minClearanceBound=Math.min(result.minClearanceBound,collision.minimum);
  if(collision.minimum<g.clearance){result.unsafe++;const actual=window.MotioCollision.analyze(g,p);if(actual.minimum<0)result.collisionState='FAIL';return fail('Geen voldoende vrijloop bewezen: '+collision.closest.join(' / ')+'.');}
 }
 result.start=centre.q;result.end=inverse(config,point(R),previous,true).q;
 result.reachState=result.singularState=result.collisionState='PASS';result.proven=true;
 return result;
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
 constructor(config){this.config=config;this.g=build(config);this.resolution=config.testResolution;this.index=0;this.trajectoryIndex=0;this.duration=20;this.dt=.01;this.total=this.resolution**2+Math.round(this.duration/this.dt);this.running=true;this.previous=null;this.q={A:config.phaseA*Math.PI/180,B:config.phaseB*Math.PI/180,C:config.phaseC*Math.PI/180};this.v={A:0,B:0,C:0};this.preview=null;this.report={scope:'Discrete phase sweep + 20 s ramp/reversal stress profile; no continuous global certification',samples:0,invalid:0,collisions:0,critical:0,cautions:0,workingChanges:0,assemblyChanges:0,minClearance:Infinity,minima:{arm:Infinity,frame:Infinity,holder:Infinity,platform:Infinity,drive:Infinity},maxRPM:0,maxSpeed:0,maxAcceleration:0,maxDeflection:0,maxElasticXY:0,maxTorque:{A:0,B:0,C:0},minSafety:{A:Infinity,B:Infinity,C:Infinity},curveMissing:false,missingCurve:{A:false,B:false,C:false},worst:[],complete:false};}
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
  // The phase sweep detects forbidden poses; they cannot be requested drawing
  // loads. Analyse motor duty only where the simulator permits physical drawing.
  if(!continuous||!p.safe||!window.MotioPaper.inside(window.MotioPaper.machineToPaper(p.pen,q.C,g),g,g.paper.margin)){if(continuous)this.previous=null;return;}
  const pv={x:p.J.ax*v.A+p.J.bx*v.B,y:p.J.ay*v.A+p.J.by*v.B},speed=Math.hypot(pv.x,pv.y);
  r.maxSpeed=Math.max(r.maxSpeed,speed);
  if(this.previous){r.maxAcceleration=Math.max(r.maxAcceleration,distance(pv,this.previous.pv)/this.dt);const change=window.MotioKinematics.branchChange(this.previous.pose,p);r.workingChanges+=Number(change.working);r.assemblyChanges+=Number(change.assembly);}
  this.previous={pose:p,pv};
  const motor=window.MotioMotor.analyze(g,p,v,alpha);
  for(const key of ['A','B','C']) {
   r.maxRPM=Math.max(r.maxRPM,Math.abs(v[key]*g[key].ratio*60/TAU));
   if(motor[key]){r.maxTorque[key]=Math.max(r.maxTorque[key],motor[key].required);if(motor[key].safetyFactor===null||!motor[key].qualified){r.curveMissing=true;r.missingCurve[key]=true;}else r.minSafety[key]=Math.min(r.minSafety[key],motor[key].safetyFactor);}else {r.curveMissing=true;r.missingCurve[key]=true;}
  }
 }
 get progress(){return (this.index+this.trajectoryIndex)/this.total;}
}
function rows(sim,test) {
 const g=sim.geometry,a=sim.audit,area=sim.drawingArea,r=test?.report,complete=r?.complete;
 const result=[],add=(name,state,value,evidence)=>result.push({name,state,value,evidence});
 add('Volledige veilige tekencirkel bereikbaar',area.reachState,area.proven?'Ø'+(2*g.paper.safeRadius)+' mm via pen + papierrotatie':area.reason||'Bereik nog niet bewezen',area.scope);
 add('Mechanische botsingen',area.collisionState,area.proven?'Geen op de bewezen tekenroute':area.reason||'Tekenroute nog niet vrijgegeven','Continue envelopcontrole van de radiale route, inclusief draaiende tandkoppen en plateau. Andere onveilige motorstanden worden tijdens de simulatie geblokkeerd.');
 add('Problematische singulariteiten',area.singularState,area.proven?'Geen op de bewezen tekenroute':area.reason||'Route nog niet bewezen','Zowel seriële als parallelle marges zijn over volledige route-intervallen begrensd; alle willekeurige krukstanden zijn niet vrijgegeven.');
 const overload=complete&&Object.values(r.minSafety).some(v=>Number.isFinite(v)&&v<1),motorState=overload?'FAIL':'NIET BEWEZEN';
 add('Motoren kunnen de beweging aan',motorState,overload?'Gevraagd koppel te hoog':'Driver en belastingen bevestigen','SY42STH38-1684A: afgelezen koppelcurve geldt voor 24 V, 1,68 A, halfstep en 30–750 RPM. Houdkoppel 0,36 Nm bewijst geen dynamische capaciteit; belasting, wrijving en inertie zijn ontwerpschattingen.');
 const fitFail=area.proven&&area.minClearanceBound<g.clearance;
 add('Belangrijkste mechanische spelingen',fitFail?'FAIL':'NIET BEWEZEN',area.proven?'Modelvrijloop ≥ '+area.minClearanceBound.toFixed(1)+' mm; passing nog testen':'Vrijloop nog niet bewezen','Het model gebruikt '+g.clearance+' mm minimale vrijloop. Lagerspeling, tandflankspeling, aspassing, fabricagetoleranties en papierloop moeten aan het prototype worden gecontroleerd.');
 return result;
}
window.MotioValidation={workspace,drawingArea,audit,EngineeringTest,rows};
})();
