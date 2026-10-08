const assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','machineGeometry','kinematics','paperTransform','singularityAnalysis','collisionDetection','structuralEstimate','motorAnalysis','mechanics','validation','bom','bubbleText','patterns','simulation'])require('../js/'+f+'.js');
const {TAU}=MotioMath;
const results=[];
const words=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','MOTIO','VIVES','ABCDEFGH','IIIIIIII','WWWWWWWW','MWMWMWMW','SSSSSSSS'];
const cases=[...MotioPatterns.list.map(pattern=>({pattern})),...words.map(wordText=>({pattern:MotioPatterns.get('word'),wordText}))];
for(const {pattern,wordText='MOTIO'} of cases){
 const label=pattern.id==='word'?wordText:pattern.id;
 const s=new MotioSimulation.Simulation({...MotioGeometry.DEFAULT_CONFIG,patternId:pattern.id,wordText,rpmC:-pattern.rpm,motorCurveConditionsConfirmed:1});
 assert.ok(s.drawingArea.proven,'Continuous route certificate, not a sample-only reach claim');
 assert.equal(s.geometry.base.width,605);assert.equal(s.geometry.base.height,605);
 assert.match(MotioBOM.create(s.geometry).find(r=>r.id==='BASE').dimensions,/605/);
 assert.ok(s.patternPreview.every(p=>Math.hypot(p.x,p.y)<95));
 s.power();s.home();s.update(2);s.play();
 let maxRadius=0,maxError=0,reversals={A:0,B:0},previous={A:0,B:0},paused=false,maxSpeed=0,maxAcceleration=0,maxTorque=0,minSafetyFactor=Infinity;
 const peaks={A:{rpm:0,acceleration:0},B:{rpm:0,acceleration:0},C:{rpm:0,acceleration:0}};
 const duration=MotioPatterns.timing(s.config,pattern,0).duration;
 // All complete profiles use the same 100 Hz step as the live simulator.
 const word=MotioPatterns.isText(pattern),dt=.01;
 for(let t=0;t<duration+10&&s.running;t+=dt){
  if(t>duration*.55&&!paused){
   s.pause();for(let i=0;i<410&&s.running;i++)s.update(.01);
   assert.equal(s.state,'PAUSED');const q={...s.q};s.update(1);assert.deepEqual(s.q,q);s.play();paused=true;
  }
  s.update(dt);
  assert.equal(s.fault,'',label+' '+s.fault);
  maxSpeed=Math.max(maxSpeed,s.penSpeed);maxAcceleration=Math.max(maxAcceleration,s.penAcceleration);
  const load=MotioMotor.analyze(s.geometry,s.pose,s.velocity,s.angularAcceleration);
  for(const key of ['A','B','C']){
   peaks[key].rpm=Math.max(peaks[key].rpm,Math.abs(s.velocity[key])*60/TAU);
   peaks[key].acceleration=Math.max(peaks[key].acceleration,Math.abs(s.angularAcceleration[key]));
   maxTorque=Math.max(maxTorque,load[key].required);
   if(load[key].qualified){assert.ok(load[key].safetyFactor>=2,label+' motor torque reserve');minSafetyFactor=Math.min(minSafetyFactor,load[key].safetyFactor);}
  }
  maxRadius=Math.max(maxRadius,Math.hypot(s.penLocal.x,s.penLocal.y));
  const r=MotioPatterns.radius(pattern,s.patternPhase,s.geometry).value;
  if(word){
   const target=MotioPatterns.textPoint(s.patternPhase,s.geometry,pattern);
   maxError=Math.max(maxError,MotioMath.distance(s.penLocal,target));
  }else{
   const a=(s.geometry.reachAngle-s.config.phaseC)*Math.PI/180-Math.sign(s.config.rpmC)*s.patternPhase;
   maxError=Math.max(maxError,Math.hypot(s.penLocal.x-r*Math.cos(a),s.penLocal.y-r*Math.sin(a)));
  }
  for(const key of ['A','B'])if(Math.abs(s.velocity[key])>1e-7){const sign=Math.sign(s.velocity[key]);if(previous[key]&&sign!==previous[key])reversals[key]++;previous[key]=sign;}
 }
 assert.equal(s.state,'COMPLETE',label+' completes');assert.ok(maxError<1e-6,label+' FK matches exact reference');
 for(const key of ['A','B','C']){
  assert.ok(peaks[key].rpm<=.85*(key==='C'?s.geometry.maxPaperRPM:s.geometry.maxRPM),label+' RPM reserve');
  assert.ok(peaks[key].acceleration<=.85*(key==='C'?s.geometry.paperAcceleration:s.geometry.acceleration),label+' acceleration reserve');
 }
 assert.ok(MotioMath.distance(s.trace.at(-1),s.penLocal)<1e-8,'Final endpoint is recorded even below the normal point spacing');
 assert.ok(maxRadius<=(word?82.7:81.7)+1e-8);assert.ok(s.trace.every(p=>Math.hypot(p.x,p.y)<=95));
 if(word)for(const vertex of s.patternPreview)assert.ok(s.trace.some(p=>MotioMath.distance(vertex,p)<.17),'The full curved letter path is drawn');
 if(pattern.frequency>0)assert.ok(reversals.A>=2&&reversals.B>=2,'Both cranks oscillate');
 const q={...s.q};s.play();s.update(1);assert.deepEqual(s.q,q,'Completed pattern stays stopped');
 if(pattern.id==='circle'){
  s.home();s.update(s.homeDuration+.1);const before=s.q.C;s.play();s.update(.1);
  assert.equal(s.fault,'');assert.ok(Math.abs(s.q.C-before)<.001,'Home preserves complete-turn winding when a pattern restarts');
 }
 results.push({pattern:label,duration:+duration.toFixed(1),peaks,maxSpeed,maxAcceleration,maxTorque,minSafetyFactor:Number.isFinite(minSafetyFactor)?minSafetyFactor:null,maxRadius:+maxRadius.toFixed(2),maxError});
 console.log(label+' completed without a fault, including pause/resume and speed/acceleration reserves.');
}
const s=new MotioSimulation.Simulation(),config=s.config;
assert.throws(()=>s.configure({...config,lengthA:10}),/Patroon/);assert.equal(s.config,config,'Rejected pattern geometry preserves current config');
assert.throws(()=>s.configure({...config,rpmC:0}),/papierrotatie/);
assert.throws(()=>s.configure({...config,patternId:'missing'}),/Onbekend patroon/);
console.log('Thirteen patterns and 33 words completed at 100 Hz, including pause/resume, motor speed/acceleration reserves and torque reserve within the published curve. Low-RPM motor capacity remains unmeasured.');
console.log(JSON.stringify(results));
