const assert=require('node:assert/strict');
global.window=global;
const modules=['math','machineGeometry','kinematics','paperTransform','singularityAnalysis','collisionDetection','structuralEstimate','motorAnalysis','mechanics','validation','bom','bubbleText','patterns','simulation','renderers'];
for(const f of modules)require('../js/'+f+'.js');
const {TAU,distance}=MotioMath,{normalize,build,bodies,DEFAULT_CONFIG}=MotioGeometry,{solve,inverse,branchChange}=MotioKinematics;
const c=normalize({patternId:'',rpmC:-1.2}),g=build(c),close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} ~= ${b}`);
const start=s=>{s.power();s.home();s.update(2);assert.equal(s.state,'HOMED');s.play();};
let inverseCount=0,unreachableCount=0;
for(let a=0;a<72;a++)for(let b=0;b<72;b++){
 const q={A:a*TAU/72,B:b*TAU/72,C:.123},p=solve(c,q);
 if(!p.valid){unreachableCount++;assert.ok(p.reason);continue;}
 close(distance(p.a,p.pen),c.lengthA);close(distance(p.b,p.pen),c.lengthB);
 assert.ok(MotioMath.cross(MotioMath.subtract(p.b,p.a),MotioMath.subtract(p.pen,p.a))<0);
 const h=1e-6,pa=solve(c,{...q,A:q.A+h}),ma=solve(c,{...q,A:q.A-h}),pb=solve(c,{...q,B:q.B+h}),mb=solve(c,{...q,B:q.B-h});
 close((pa.pen.x-ma.pen.x)/(2*h),p.J.ax,.0001);close((pa.pen.y-ma.pen.y)/(2*h),p.J.ay,.0001);close((pb.pen.x-mb.pen.x)/(2*h),p.J.bx,.0001);close((pb.pen.y-mb.pen.y)/(2*h),p.J.by,.0001);
 const ik=inverse(c,p.pen,p,true);assert.ok(ik.valid);close(distance(ik.pose.pen,p.pen),0,1e-5);close(ik.q.A,q.A,1e-5);close(ik.q.B,q.B,1e-5);inverseCount++;
}
assert.equal(inverseCount+unreachableCount,5184);assert.ok(inverseCount>1000,'Broad valid-pose coverage');
assert.equal(inverse(c,{x:10000,y:10000}).valid,false);
const p=solve(c,{A:c.phaseA*Math.PI/180,B:c.phaseB*Math.PI/180,C:0}),other=solve(normalize({...c,branch:1}),p.q);
assert.equal(branchChange(p,other).assembly,true);
const singular=MotioSingularity.analyze({...p,J:{ax:1,ay:0,bx:0,by:0},serialA:0},g);assert.equal(singular.state,'CRITICAL');assert.equal(singular.condition,Infinity);
const isotropic=MotioSingularity.analyze({...p,J:{ax:1,ay:0,bx:0,by:1},serialA:1,serialB:1,sin:1},g);close(isotropic.condition,1);assert.equal(isotropic.state,'SAFE');

const sim=new MotioSimulation.Simulation();
assert.ok(sim.drawingArea.proven);assert.ok(sim.drawingArea.minClearanceBound>=3);
assert.equal(sim.drawingArea.routeAngle,-130);
assert.equal(MotioValidation.rows(sim).length,8);
sim.power();sim.home();sim.update(2);sim.play();sim.update(2);
assert.equal(sim.state,'RUNNING');assert.equal(sim.fault,'');assert.ok(sim.trace.length>20);
sim.pause();sim.update(2);assert.equal(sim.state,'PAUSED');
const bad=normalize({patternId:'',rodZB:38});assert.equal(MotioMechanics.inspect(bad,p.q).safe,false);
const heavy=normalize({patternId:'',paperMass:2});assert.equal(MotioMotor.shaftLoads(build(heavy),p).state,'LIMIT EXCEEDED');
assert.ok(MotioMechanics.inspect(heavy,p.q).issues.some(s=>s.includes('motoraslast')));
const rows=MotioBOM.create(g),parts=bodies(g,p);
for(const row of rows){assert.ok(row.qty>0);assert.equal(row.qty,new Set(parts.filter(b=>b.bom===row.id).map(b=>b.instance)).size);}
for(const body of parts)assert.ok(rows.some(r=>r.id===body.bom),body.id);
for(const [id,qty] of [['MOTOR',3],['BASE',1],['RIB',2],['HUB',3],['M3-BOLT',12],['HUB-BOLT-A',4],['HUB-BOLT-B',4],['PL-BOLT',4],['608',2],['6804',2],['M8-NUT',2]])assert.equal(rows.find(r=>r.id===id).qty,qty);
assert.ok(!parts.some(p=>/^(shaft[ABC]|bracket|riser|coupling|housing|foot[ABC])/.test(p.id)));
assert.equal(MotioGeometry.mountingFit(g).state,'PASS');
assert.equal(MotioGeometry.mountingFit(build(normalize({crankZB:40}))).state,'FAIL');
assert.equal(MotioGeometry.mountingFit(build(normalize({baseThickness:10}))).state,'FAIL');
for(const svg of [MotioRenderers.mechanismSVG(sim,true),MotioRenderers.sectionSVG(sim),MotioRenderers.detailSVG(sim,'pen'),MotioRenderers.mountingSVG(sim)])assert.doesNotMatch(svg,/NaN|undefined|6001/);
console.log('SIMV7: '+inverseCount+' FK/IK/Jacobian poses; route certificate, simulation, excess-load guard, physical BOM counts, direct flanges and drawing exports passed.');
