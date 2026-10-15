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
for(const key of ['A','B','C']) {
 close(distance(g[key].pivot,g[key].motor),0);
 close(g[key].ratio,1);close(g[key].motorSign,1);
 const parts=bodies(g,null),motorShaft=parts.find(b=>b.id==='motorShaft'+key),shaft=parts.find(b=>b.id==='shaft'+key),coupling=parts.find(b=>b.id==='coupling'+key);
 close(distance(motorShaft,shaft),0);close(distance(shaft,coupling),0);
 close(shaft.z-shaft.h/2-(motorShaft.z+motorShaft.h/2),1);
 assert.ok(coupling.z-coupling.h/2<motorShaft.z+motorShaft.h/2);
 assert.ok(coupling.z+coupling.h/2>shaft.z-shaft.h/2);
 for(const bearing of parts.filter(b=>b.id.startsWith('bearing'+key)))close(distance(bearing,shaft),0);
}
close(g.paper.radius,105);close(g.paper.safeRadius,95);
close(g.base.width,358);close(g.base.height,404);close(g.box.height,108);
const enclosure=bodies(g,p).filter(b=>b.id==='BASE'||b.id.startsWith('box-'));
assert.equal(enclosure.length,6,'Top, bottom and four separate walls');
const axisSpan=(items,axis,size)=>Math.max(...items.map(b=>b[axis]+b[size]/2))-Math.min(...items.map(b=>b[axis]-b[size]/2));
close(axisSpan(enclosure,'x','w'),358);close(axisSpan(enclosure,'y','l'),404);close(axisSpan(enclosure,'z','h'),108);
for(const id of ['box-front','box-back','box-left','box-right','box-bottom'])assert.ok(enclosure.some(b=>b.id===id));
assert.deepEqual(bodies(g,p).filter(b=>b.id.startsWith('motor')&&b.shape==='box').map(b=>b.id),['motorA','motorB','motorC']);
assert.equal(bodies(g,p).filter(b=>b.shape==='gear').length,0,'No gear transmission');
assert.deepEqual(bodies(g,p).filter(b=>b.group==='drive'&&b.id.startsWith('coupling')).map(b=>b.id),['couplingA','couplingB','couplingC']);
assert.ok(MotioPaper.inside({x:95,y:0},g,10));assert.ok(!MotioPaper.inside({x:95,y:1},g,10));
assert.ok(!MotioPaper.inside({x:80,y:80},g));
close(g.motor.width,42.3);close(g.motor.length,38);close(c.motorStepAngle,1.8);
for(const theta of [0,.5,Math.PI/2,3.7,TAU]){const paper={x:72.3,y:-80.4},world=MotioPaper.paperToMachine(paper,theta,g);close(distance(MotioPaper.machineToPaper(world,theta,g),paper),0);}
const quarter=MotioPaper.machineToPaper({x:g.paper.x+10,y:g.paper.y},Math.PI/2,g);close(quarter.x,0);close(quarter.y,-10);
const moved=build(normalize({...c,paperX:300,paperY:200}));close(distance(MotioPaper.machineToPaper({x:300,y:200},1.1,moved),{x:0,y:0}),0);
const gap=MotioCollision.gap;
close(gap({shape:'cylinder',x:0,y:0,r:5,z:10,h:4},{shape:'cylinder',x:15,y:0,r:5,z:10,h:4}),5);
close(gap({shape:'cylinder',x:0,y:0,r:5,z:10,h:4},{shape:'cylinder',x:0,y:0,r:5,z:10,h:4}),-4);
close(gap({shape:'box',x:0,y:0,w:10,l:10,z:0,h:2},{shape:'beam',a:{x:20,y:-20},b:{x:20,y:20},w:4,z:0,h:2}),13);
const overlapping=normalize({...c,rodZB:c.rodZA});assert.ok(MotioCollision.analyze(build(overlapping),solve(overlapping,p.q)).minima.arm<0);
const low=normalize({...c,rodZA:c.paperZ});assert.ok(MotioCollision.analyze(build(low),solve(low,p.q)).minima.platform<0);
const nearWall=normalize({...c,paperX:c.baseX+20});assert.ok(MotioCollision.analyze(build(nearWall),solve(nearWall,p.q)).minima.drive<0);
const s=MotioStructure.analyze(g,p),I=(c.rodWidth*c.rodHeight**3-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall)**3)/12,L=c.lengthA,mass=(c.rodWidth*c.rodHeight-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall))*L*1e-9*c.density;
close(s.arms.A.vertical,c.verticalForce*L**3/(3*c.materialE*I)+mass*9.80665*L**3/(8*c.materialE*I));assert.equal(s.totalPositionError,null);
const softer=MotioStructure.analyze(build(normalize({...c,materialE:34500})),p);close(softer.arms.A.vertical,2*s.arms.A.vertical);
// Independent kinetic-energy check of coupled mass matrix using finite difference body motion.
const v={A:.3,B:-.2,C:.1},h=1e-6,p2=solve(c,{A:p.q.A+h*v.A,B:p.q.B+h*v.B,C:0}),M=MotioMotor.massMatrix(g,p);
let energy=.5*g.penMass*(distance(p.pen,p2.pen)/(h*1000))**2;
for(const key of ['A','B']){const e=key==='A'?p.a:p.b,e2=key==='A'?p2.a:p2.b,L=c['length'+key]/1000,r=c['radius'+key]/1000,m=g.tubeArea*L*1e-6*g.density,mc=g.crankWidth*g.crankHeight*r*1e-6*g.density;const com={x:(e.x+p.pen.x)/2,y:(e.y+p.pen.y)/2},com2={x:(e2.x+p2.pen.x)/2,y:(e2.y+p2.pen.y)/2},w=(p2['armAngle'+key]-p['armAngle'+key])/h;energy+=.5*m*(distance(com,com2)/(h*1000))**2+.5*m*L*L/12*w*w+.5*(mc*r*r/3+g.couplingInertia)*v[key]**2;}
close(energy,.5*(M[0][0]*v.A*v.A+2*M[0][1]*v.A*v.B+M[1][1]*v.B*v.B),1e-10);
const motor=MotioMotor.analyze(g,p,v,{A:.4,B:-.4,C:.2});assert.equal(motor.A.available,null);assert.equal(motor.A.utilisation,null);assert.ok(motor.A.required>0);
const cg=build(normalize({...c,motorCurves:{A:{source:'TEST FIXTURE, NOT A REAL MOTOR',points:[[0,.4],[100,.2]]}}}));close(MotioMotor.available(cg,'A',50).torque,.3);assert.equal(MotioMotor.available(cg,'A',101).torque,null);
close(MotioMotor.available(g,'A',30).torque,.26);assert.equal(MotioMotor.available(g,'A',29).torque,null);assert.equal(MotioMotor.available(g,'A',751).torque,null);
assert.equal(MotioMotor.available(g,'A',30).qualified,false);
const qualified=build(normalize({...c,motorCurveConditionsConfirmed:1,motorStepsPerFullStep:2}));assert.equal(MotioMotor.available(qualified,'A',30).qualified,true);
assert.equal(MotioMotor.available(build(normalize({...c,motorCurveConditionsConfirmed:1})),'A',30).qualified,false,'Half-step curve cannot qualify 1/16 drive');
assert.equal(MotioMotor.available(build(normalize({...c,motorCurveConditionsConfirmed:1,motorSupplyVoltage:12})),'A',30).qualified,false);
for(const key of ['A','B','C']){close(motor[key].rpm,v[key]*60/TAU);close(motor[key].fullStepsPerOutputRevolution,200);close(motor[key].pulsesPerOutputRevolution,3200);close(motor[key].pulseRate,Math.abs(v[key])*3200/TAU);close(motor[key].required,motor[key].outputTorque/c.efficiency+c.rotorInertia*Math.abs(key==='C'?.2:.4));assert.equal('toothForce' in motor[key],false);}
const micro32=MotioMotor.analyze(build(normalize({...c,motorStepsPerFullStep:32})),p,v,{A:.4,B:-.4,C:.2});
close(micro32.A.pulsesPerOutputRevolution,6400);close(micro32.A.required,motor.A.required);
assert.throws(()=>normalize({...c,motorStepsPerFullStep:3}));assert.throws(()=>normalize({...c,couplingRadius:5}));
assert.throws(()=>normalize({...c,rodWall:12}));assert.throws(()=>normalize({...c,workspaceStep:0}));assert.throws(()=>normalize({...c,acceleration:0}));assert.throws(()=>normalize({...c,motorCurves:{A:{source:'x',points:[[10,.1],[0,.2]]}}}));
const sim=new MotioSimulation.Simulation(c);assert.equal(sim.state,'POWER OFF');assert.equal('penDown' in sim,false);assert.equal('togglePen' in sim,false);
// Actuate one output at a time. No other shaft follows it; C preserves world pen position.
for(const key of ['A','B','C']){
 const independent=new MotioSimulation.Simulation({...c,rpmA:0,rpmB:0,rpmC:0,['rpm'+key]:.1});
 start(independent);const initial={...independent.q},pen={...independent.penWorld};independent.update(.15);
 assert.equal(independent.fault,'',key+' can move independently');assert.ok(Math.abs(independent.q[key]-initial[key])>1e-6);
 for(const other of ['A','B','C'].filter(k=>k!==key))close(independent.q[other],initial[other]);
 if(key==='C')close(distance(independent.penWorld,pen),0);else assert.ok(distance(independent.penWorld,pen)>0);
}
start(sim);sim.update(2);assert.equal(sim.state,'RUNNING');assert.ok(sim.trace.length>60);const count=sim.trace.length;sim.stop();sim.update(1);assert.equal(sim.state,'PAUSED');assert.ok(sim.trace.length>count,'Fixed physical pen draws while braking');const stopped={...sim.q};sim.update(1);assert.deepEqual(sim.q,stopped);sim.home();sim.update(sim.homeDuration+.1);assert.equal(sim.state,'HOMED');
const route=r=>({x:g.paper.x+r*Math.cos(c.reachAngle*Math.PI/180),y:g.paper.y+r*Math.sin(c.reachAngle*Math.PI/180)});
const centre=solve(c,{A:c.phaseA*Math.PI/180,B:c.phaseB*Math.PI/180,C:0});
const offset=inverse(c,route(40),centre,true);assert.ok(offset.valid);
const paperOnly=new MotioSimulation.Simulation({...c,phaseA:offset.q.A*180/Math.PI,phaseB:offset.q.B*180/Math.PI,rpmA:0,rpmB:0,phaseC:25});
start(paperOnly);close(paperOnly.q.C,25*Math.PI/180);const fixed={...paperOnly.penWorld},before={...paperOnly.penLocal};paperOnly.update(2);close(distance(fixed,paperOnly.penWorld),0);assert.ok(distance(before,paperOnly.penLocal)>1);assert.ok(paperOnly.trace.length>10);
const bad=normalize({...c,lengthA:10,lengthB:10});assert.equal(solve(bad,{A:0,B:0}).valid,false);
const edge=inverse(c,route(95),centre,true),outside=inverse(c,route(96),edge.pose,true);assert.ok(outside.valid);
const guard=new MotioSimulation.Simulation({...c,phaseA:edge.q.A*180/Math.PI,phaseB:edge.q.B*180/Math.PI});
const held={...guard.q},heldPen={...guard.penWorld};assert.equal(guard.advance(outside.q,{A:0,B:0,C:0},.01),false);assert.deepEqual(guard.q,held);assert.deepEqual(guard.penWorld,heldPen);assert.match(guard.fault,/veilige tekencirkel/);assert.equal(guard.trace.length,0);
const invalid=new MotioSimulation.Simulation({...c,lengthA:10,lengthB:10});const invalidQ={...invalid.q};assert.equal(invalid.advance({...invalid.q,A:1},{A:0,B:0,C:0},.01),false);assert.deepEqual(invalid.q,invalidQ);assert.equal(invalid.penWorld,null);
for(const t of [...sim.trace,...paperOnly.trace])assert.ok(Math.hypot(t.x,t.y)<=95+1e-8);
const scan=sim.audit;assert.ok(scan.critical>0);assert.equal(sim.drawingArea.reachState,'PASS');assert.equal(sim.drawingArea.missing,0);assert.ok(sim.drawingArea.minClearanceBound>=g.clearance);
// All radii are covered by the proved continuous route; independently check paper angle mapping.
for(let r=0;r<=95;r+=5){const ik=inverse(c,route(r),centre,true);assert.ok(ik.valid);assert.ok(MotioMechanics.inspect(c,ik.q).safe);for(let angle=0;angle<360;angle+=15){const theta=(c.reachAngle-angle)*Math.PI/180,local=MotioPaper.machineToPaper(ik.pose.pen,theta,g);close(local.x,r*Math.cos(angle*Math.PI/180),1e-6);close(local.y,r*Math.sin(angle*Math.PI/180),1e-6);}}
assert.notEqual(MotioValidation.drawingArea(normalize({...c,radiusA:10,radiusB:10})).reachState,'PASS');
assert.equal(MotioValidation.drawingArea(normalize({...c,paperX:1000})).reachState,'FAIL');
assert.equal(MotioValidation.drawingArea(normalize({...c,rodZB:c.rodZA})).collisionState,'FAIL');
const test=new MotioValidation.EngineeringTest(c);while(test.running)test.step(50);assert.ok(test.report.complete);assert.ok(test.report.critical>0);assert.equal(test.report.assemblyChanges,0);assert.ok(test.report.curveMissing);assert.equal(MotioValidation.rows(sim,test).length,5);assert.equal(MotioValidation.rows(sim,test)[3].state,'NIET BEWEZEN');
const cancelled=new MotioValidation.EngineeringTest(c);cancelled.step(5);cancelled.cancel();assert.ok(!cancelled.report.complete);
// Core geometry propagates to primitives, solver, coordinates, SVG, BOM and coaxial shafts.
const changed=normalize({...c,lengthA:190,pivotAx:285,couplingRadius:10}),gc=build(changed),pc=solve(changed,p.q),parts=bodies(gc,pc),bom=MotioBOM.create(gc);
close(distance(parts.find(b=>b.id==='rodA').a,parts.find(b=>b.id==='rodA').b),190-12-(gc.pen.jointRadius-2));close(parts.find(b=>b.id==='platter').r,105);close(parts.find(b=>b.id==='couplingA').r,10);assert.match(bom.find(b=>b.id==='L-A').dimensions,/190/);assert.match(bom.find(b=>b.id==='PL').dimensions,/210/);assert.match(bom.find(b=>b.id==='CP-A').dimensions,/Ø20/);
assert.ok(!bom.some(b=>b.id.startsWith('G-')||b.id==='G20'));
const imported=normalize({...c,outputTeethA:64,motorTeeth:20,gearModule:1.5});assert.equal(build(imported).A.ratio,1);assert.equal('outputTeethA' in imported,false);
assert.equal(MotioBOM.headers.length,5);assert.ok(MotioBOM.create(g).every(r=>MotioBOM.values(r).length===5));assert.doesNotMatch(MotioBOM.csv(g),/UNKNOWN|riem|pulley|poelie|Massa kg|Status/i);
const svg=MotioRenderers.mechanismSVG({geometry:gc,config:changed,pose:pc,q:p.q,trace:[]},true);assert.match(svg,/A 190/);assert.match(svg,/210/);assert.doesNotMatch(svg,/NaN|undefined/);
console.log(`V4-5: ${inverseCount} FK/IK/Jacobian poses; independent direct drive, coaxial shafts, 1/16 microstepping, radial reach, datasheet conditions, inertia, controls and BOM passed.`);
console.log(JSON.stringify({reach:sim.drawingArea.reachState,clearanceBound:sim.drawingArea.minClearanceBound,samples:test.report.samples,critical:test.report.critical,collisions:test.report.collisions,maxTorque:test.report.maxTorque}));
