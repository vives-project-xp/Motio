const assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','machineGeometry','kinematics','paperTransform','singularityAnalysis','collisionDetection','structuralEstimate','motorAnalysis','mechanics','validation','bom','bubbleText','patterns','simulation'])require('../js/'+f+'.js');
const {TAU}=MotioMath;
const results=[];
for(const pattern of MotioPatterns.list){
 const s=new MotioSimulation.Simulation({...MotioGeometry.DEFAULT_CONFIG,patternId:pattern.id,rpmC:-pattern.rpm});
 assert.ok(s.drawingArea.proven,'Continuous route certificate, not a sample-only reach claim');
 assert.equal(s.geometry.base.width,605);assert.equal(s.geometry.base.height,605);
 assert.match(MotioBOM.create(s.geometry).find(r=>r.id==='BASE').dimensions,/605/);
 assert.ok(s.patternPreview.every(p=>Math.hypot(p.x,p.y)<95));
 s.power();s.home();s.update(2);s.play();
 let maxRadius=0,maxError=0,reversals={A:0,B:0},previous={A:0,B:0},paused=false;
 const duration=MotioPatterns.timing(s.config,pattern,0).duration;
 // Run the default with the real 100 Hz update; the other entire profiles at
 // 20 Hz supplement the continuous geometry certificate and runtime guards.
 const word=pattern.id==='vives',live=pattern.id==='flower5'||word,dt=live?.01:.05;
 for(let t=0;t<duration+10&&s.running;t+=dt){
  if(live&&t>duration*.55&&!paused){
   s.pause();for(let i=0;i<410&&s.running;i++)s.update(.01);
   assert.equal(s.state,'PAUSED');const q={...s.q};s.update(1);assert.deepEqual(s.q,q);s.play();paused=true;
  }
  if(live)s.update(dt);else s.step(dt);
  assert.equal(s.fault,'',pattern.id+' '+s.fault);
  maxRadius=Math.max(maxRadius,Math.hypot(s.penLocal.x,s.penLocal.y));
  const r=MotioPatterns.radius(pattern,s.patternPhase,s.geometry).value;
  if(word){
   const pts=s.patternPreview;let gap=Infinity;
   for(let i=1;i<pts.length;i++)gap=Math.min(gap,MotioMath.pointSegment(s.penLocal,pts[i-1],pts[i]));
   maxError=Math.max(maxError,gap);
  }else{
   const a=(s.geometry.reachAngle-s.config.phaseC)*Math.PI/180-Math.sign(s.config.rpmC)*s.patternPhase;
   maxError=Math.max(maxError,Math.hypot(s.penLocal.x-r*Math.cos(a),s.penLocal.y-r*Math.sin(a)));
  }
  for(const key of ['A','B'])if(Math.abs(s.velocity[key])>1e-7){const sign=Math.sign(s.velocity[key]);if(previous[key]&&sign!==previous[key])reversals[key]++;previous[key]=sign;}
 }
 assert.equal(s.state,'COMPLETE',pattern.id+' completes');assert.ok(maxError<(word?.03:1e-6),pattern.id+' FK matches reference (sampled curves for VIVES)');
 assert.ok(MotioMath.distance(s.trace.at(-1),s.penLocal)<1e-8,'Final endpoint is recorded even below the normal point spacing');
 assert.ok(maxRadius<=(word?82.7:81.7)+1e-8);assert.ok(s.trace.every(p=>Math.hypot(p.x,p.y)<=95));
 if(word)for(const vertex of s.patternPreview)assert.ok(s.trace.some(p=>MotioMath.distance(vertex,p)<.17),'The full curved letter path is drawn');
 if(pattern.frequency>0)assert.ok(reversals.A>=2&&reversals.B>=2,'Both cranks oscillate');
 const q={...s.q};s.play();s.update(1);assert.deepEqual(s.q,q,'Completed pattern stays stopped');
 if(pattern.id==='circle'){
  s.home();s.update(s.homeDuration+.1);const before=s.q.C;s.play();s.update(.1);
  assert.equal(s.fault,'');assert.ok(Math.abs(s.q.C-before)<.001,'Home preserves complete-turn winding when a pattern restarts');
 }
 results.push({pattern:pattern.id,maxRadius:+maxRadius.toFixed(2),maxError});
}
const s=new MotioSimulation.Simulation(),config=s.config;
assert.throws(()=>s.configure({...config,lengthA:10}),/Patroon/);assert.equal(s.config,config,'Rejected pattern geometry preserves current config');
assert.throws(()=>s.configure({...config,rpmC:0}),/papierrotatie/);
assert.throws(()=>s.configure({...config,patternId:'missing'}),/Onbekend patroon/);
console.log('Nine complete patterns including VIVES, pause/resume, FK/reference agreement, safe radii, route certificate and smaller shared base passed.');
console.log(JSON.stringify(results));
