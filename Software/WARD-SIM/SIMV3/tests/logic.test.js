const assert=require('node:assert/strict');
global.window=global;
const modules=['math','machineGeometry','kinematics','paperTransform','singularityAnalysis','collisionDetection','structuralEstimate','motorAnalysis','mechanics','validation','bom','simulation','renderers'];
for(const f of modules)require('../js/'+f+'.js');
const {TAU,distance,beltLength}=MotioMath,{normalize,build,bodies,DEFAULT_CONFIG}=MotioGeometry,{solve,inverse,branchChange}=MotioKinematics;
const c=normalize(),g=build(c),close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} ~= ${b}`);
const start=s=>{s.power();s.home();s.update(2);assert.equal(s.state,'HOMED');s.play();};
let inverseCount=0;
for(let a=0;a<72;a++)for(let b=0;b<72;b++){
 const q={A:a*TAU/72,B:b*TAU/72,C:.123},p=solve(c,q);
 close(distance(p.a,p.pen),c.lengthA);close(distance(p.b,p.pen),c.lengthB);
 assert.ok(MotioMath.cross(MotioMath.subtract(p.b,p.a),MotioMath.subtract(p.pen,p.a))<0);
 const h=1e-6,pa=solve(c,{...q,A:q.A+h}),pb=solve(c,{...q,B:q.B+h});
 close((pa.pen.x-p.pen.x)/h,p.J.ax,.0001);close((pa.pen.y-p.pen.y)/h,p.J.ay,.0001);close((pb.pen.x-p.pen.x)/h,p.J.bx,.0001);close((pb.pen.y-p.pen.y)/h,p.J.by,.0001);
 const ik=inverse(c,p.pen,p,true);assert.ok(ik.valid);close(distance(ik.pose.pen,p.pen),0,1e-5);close(ik.q.A,q.A,1e-5);close(ik.q.B,q.B,1e-5);inverseCount++;
}
assert.equal(inverse(c,{x:20,y:20}).valid,false);
const p=solve(c,{A:.7,B:1.2,C:0}),other=solve(normalize({...c,branch:1}),p.q);
assert.equal(branchChange(p,other).assembly,true);
const singular=MotioSingularity.analyze({...p,J:{ax:1,ay:0,bx:0,by:0},serialA:0},g);assert.equal(singular.state,'CRITICAL');assert.equal(singular.condition,Infinity);
const isotropic=MotioSingularity.analyze({...p,J:{ax:1,ay:0,bx:0,by:1},serialA:1,serialB:1,sin:1},g);close(isotropic.condition,1);assert.equal(isotropic.state,'SAFE');
for(const key of ['A','B','C'])close(beltLength(g[key].center,g.pitchRadius(g.motorTeeth),g.pitchRadius(g[key].outputTeeth)),g[key].beltLength);
for(const theta of [0,.5,Math.PI/2,3.7,TAU]){const paper={x:72.3,y:-80.4},world=MotioPaper.paperToMachine(paper,theta,g);close(distance(MotioPaper.machineToPaper(world,theta,g),paper),0);}
const quarter=MotioPaper.machineToPaper({x:g.paper.x+10,y:g.paper.y},Math.PI/2,g);close(quarter.x,0);close(quarter.y,-10);
const moved=build(normalize({...c,paperX:300,paperY:200}));close(distance(MotioPaper.machineToPaper({x:300,y:200},1.1,moved),{x:0,y:0}),0);
const gap=MotioCollision.gap;
close(gap({shape:'cylinder',x:0,y:0,r:5,z:10,h:4},{shape:'cylinder',x:15,y:0,r:5,z:10,h:4}),5);
close(gap({shape:'cylinder',x:0,y:0,r:5,z:10,h:4},{shape:'cylinder',x:0,y:0,r:5,z:10,h:4}),-4);
close(gap({shape:'box',x:0,y:0,w:10,l:10,z:0,h:2},{shape:'beam',a:{x:20,y:-20},b:{x:20,y:20},w:4,z:0,h:2}),13);
const overlapping=normalize({...c,rodZB:c.rodZA});assert.ok(MotioCollision.analyze(build(overlapping),solve(overlapping,p.q)).minima.arm<0);
const low=normalize({...c,rodZA:30});assert.ok(MotioCollision.analyze(build(low),solve(low,p.q)).minima.platform<0);
const nearFrame=normalize({...c,frameBraceX:g.C.motor.x});assert.ok(MotioCollision.analyze(build(nearFrame),solve(nearFrame,p.q)).minima.drive<0);
const s=MotioStructure.analyze(g,p),I=(20**4-17**4)/12,L=360,mass=(20*20-17*17)*L*1e-9*2700;
close(s.arms.A.vertical,2*L**3/(3*69000*I)+mass*9.80665*L**3/(8*69000*I));assert.equal(s.totalPositionError,null);
const softer=MotioStructure.analyze(build(normalize({...c,materialE:34500})),p);close(softer.arms.A.vertical,2*s.arms.A.vertical);
// Independent kinetic-energy check of coupled mass matrix using finite difference body motion.
const v={A:.3,B:-.2,C:.1},h=1e-6,p2=solve(c,{A:p.q.A+h*v.A,B:p.q.B+h*v.B,C:0}),M=MotioMotor.massMatrix(g,p);
let energy=.5*g.penMass*(distance(p.pen,p2.pen)/(h*1000))**2;
for(const key of ['A','B']){const e=key==='A'?p.a:p.b,e2=key==='A'?p2.a:p2.b,L=c['length'+key]/1000,r=c['radius'+key]/1000,m=g.tubeArea*L*1e-6*g.density,mc=g.crankWidth*g.crankHeight*r*1e-6*g.density;const com={x:(e.x+p.pen.x)/2,y:(e.y+p.pen.y)/2},com2={x:(e2.x+p2.pen.x)/2,y:(e2.y+p2.pen.y)/2},w=(p2['armAngle'+key]-p['armAngle'+key])/h;energy+=.5*m*(distance(com,com2)/(h*1000))**2+.5*m*L*L/12*w*w+.5*(mc*r*r/3+g.pulleyInertia)*v[key]**2;}
close(energy,.5*(M[0][0]*v.A*v.A+2*M[0][1]*v.A*v.B+M[1][1]*v.B*v.B),1e-10);
const motor=MotioMotor.analyze(g,p,v,{A:.4,B:-.4,C:.2});assert.equal(motor.A.available,null);assert.equal(motor.A.utilisation,null);assert.ok(motor.A.required>0);
const cg=build(normalize({...c,motorCurves:{A:{source:'TEST FIXTURE, NOT A REAL MOTOR',points:[[0,.4],[100,.2]]}}}));close(MotioMotor.available(cg,'A',50).torque,.3);assert.equal(MotioMotor.available(cg,'A',101).torque,null);
assert.throws(()=>normalize({...c,rodWall:12}));assert.throws(()=>normalize({...c,workspaceStep:0}));assert.throws(()=>normalize({...c,acceleration:0}));assert.throws(()=>normalize({...c,motorCurves:{A:{source:'x',points:[[10,.1],[0,.2]]}}}));
const sim=new MotioSimulation.Simulation();assert.equal(sim.state,'POWER OFF');assert.equal('penDown' in sim,false);assert.equal('togglePen' in sim,false);start(sim);sim.update(12);assert.equal(sim.state,'RUNNING');assert.ok(sim.trace.length>100);const count=sim.trace.length;sim.stop();sim.update(4);assert.equal(sim.state,'PAUSED');assert.ok(sim.trace.length>count,'The physical pen continues drawing while braking');const stopped={...sim.q};sim.update(1);assert.deepEqual(sim.q,stopped);sim.home();sim.update(sim.homeDuration+.1);assert.equal(sim.state,'HOMED');
const paperOnly=new MotioSimulation.Simulation({...c,rpmA:0,rpmB:0});start(paperOnly);const fixed={...paperOnly.penWorld},before={...paperOnly.penLocal};paperOnly.update(4);close(distance(fixed,paperOnly.penWorld),0);assert.ok(distance(before,paperOnly.penLocal)>1);assert.ok(paperOnly.trace.length>10);
const bad=normalize({...c,lengthA:10,lengthB:10});assert.equal(solve(bad,{A:0,B:0}).valid,false);
const scan=sim.audit;assert.equal(scan.failures,0);assert.ok(scan.closureAll);assert.ok(scan.sinBound>.93);assert.ok(scan.critical>0);assert.equal(sim.drawingArea.reachState,'FAIL');assert.ok(sim.drawingArea.missing>0);
const test=new MotioValidation.EngineeringTest(c);while(test.running)test.step(50);assert.ok(test.report.complete);assert.ok(test.report.critical>0);assert.equal(test.report.assemblyChanges,0);assert.ok(test.report.maxRPM>20);assert.ok(test.report.maxTorque.C>0);assert.ok(test.report.curveMissing);assert.equal(MotioValidation.rows(sim,test).find(r=>r.name==='Bearing loads / life').state,'NOT CALCULATED');
const cancelled=new MotioValidation.EngineeringTest(c);cancelled.step(5);cancelled.cancel();assert.ok(!cancelled.report.complete);
// Changing core geometry propagates to primitives, solver, transform, SVG and BOM.
const changed=normalize({...c,lengthA:370,pivotAx:560,paperRadius:280,outputTeethA:64}),gc=build(changed),pc=solve(changed,p.q),parts=bodies(gc,pc),bom=MotioBOM.create(gc);
close(distance(parts.find(b=>b.id==='rodA').a,parts.find(b=>b.id==='rodA').b),370-12-(gc.pen.jointRadius-2));close(parts.find(b=>b.id==='platter').r,280);close(parts.find(b=>b.id==='pulleyA').r,64*3/TAU);assert.match(bom.find(b=>b.id==='L-A').dimensions,/370/);assert.match(bom.find(b=>b.id==='PL').dimensions,/560/);assert.ok(bom.every(b=>b.status!=='VALIDATED'));
const svg=MotioRenderers.mechanismSVG({geometry:gc,config:changed,pose:pc,q:p.q,trace:[]},true);assert.match(svg,/A 370/);assert.match(svg,/Ø560/);assert.doesNotMatch(svg,/NaN|undefined/);
console.log(`V3 engineering: ${inverseCount} FK/IK/Jacobian poses, coordinates, collision fixtures, coupled inertia, structural scaling, manual pen, shared geometry and stress report passed.`);
console.log(JSON.stringify({samples:test.report.samples,critical:test.report.critical,collisions:test.report.collisions,minClearance:test.report.minClearance,maxTorque:test.report.maxTorque}));
