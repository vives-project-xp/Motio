const assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','mechanics','simulation'])require('../js/'+f+'.js');
const {TAU,distance,worldToPaper,paperToWorld,beltLength}=MotioMath;
const {DESIGN,DEFAULT_CONFIG,solve,inspect,audit,pitchRadius}=MotioMechanics;
const {Simulation}=MotioSimulation;
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} ≈ ${b}`);
const start=s=>{s.power();s.home();s.update(2);assert.equal(s.state,'HOMED');s.togglePen();s.play();};
const scan=audit(DEFAULT_CONFIG,144);
assert.equal(scan.failures,0);assert.ok(scan.closureAll);assert.ok(scan.sinBound>.93);assert.ok(scan.minClearance>=6);
assert.ok(scan.maxTorqueA<.51&&scan.maxTorqueB<.51&&scan.maxTorqueC<.68);
assert.ok(scan.deflection<.2);assert.ok(scan.buckling>30000);
for(let a=0;a<72;a++)for(let b=0;b<72;b++){
 const q={A:a*TAU/72,B:b*TAU/72,C:.123},p=solve(DEFAULT_CONFIG,q);
 close(distance(p.a,p.pen),360);close(distance(p.b,p.pen),340);
 assert.ok(MotioMath.cross(MotioMath.subtract(p.b,p.a),MotioMath.subtract(p.pen,p.a))<0,'Assembly branch stays fixed');
 const h=1e-6,pa=solve(DEFAULT_CONFIG,{...q,A:q.A+h}),pb=solve(DEFAULT_CONFIG,{...q,B:q.B+h});
 close((pa.pen.x-p.pen.x)/h,p.J.ax,.0001);close((pa.pen.y-p.pen.y)/h,p.J.ay,.0001);
 close((pb.pen.x-p.pen.x)/h,p.J.bx,.0001);close((pb.pen.y-p.pen.y)/h,p.J.by,.0001);
}
close(beltLength(DESIGN.ABcenter,pitchRadius(20),pitchRadius(60)),270);
close(beltLength(DESIGN.Ccenter,pitchRadius(20),pitchRadius(80)),519);
const original={x:72.3,y:223.4},world=paperToWorld(original.x,original.y,1.9),local=worldToPaper(world.x,world.y,1.9);close(distance(original,local),0);
const s=new Simulation();assert.equal(s.state,'POWER OFF');s.play();s.update(1);close(s.q.A,0);start(s);
let previous={...s.penWorld};for(let i=0;i<20000;i++){s.update(.002);assert.ok(s.safe);assert.ok(distance(previous,s.penWorld)<.25);previous={...s.penWorld};}
assert.ok(s.trace.length>100);assert.ok(s.q.A<0&&s.q.B<0&&s.q.C<0);
const count=s.trace.length;s.togglePen();s.update(.2);assert.equal(s.trace.length,count);s.togglePen();s.update(.002);assert.equal(s.trace[count].break,true);
s.stop();assert.equal(s.state,'BRAKING');assert.equal(s.penDown,false);s.update(4);assert.equal(s.state,'PAUSED');const stopped={...s.q};s.update(1);assert.deepEqual(s.q,stopped);
s.home();const duration=s.homeDuration;s.update(duration+.1);assert.equal(s.state,'HOMED');close(s.q.A/TAU,Math.round(s.q.A/TAU));close(s.q.B/TAU,Math.round(s.q.B/TAU));
const independent=new Simulation({...DEFAULT_CONFIG,rpmA:0,rpmB:2,rpmC:-1});start(independent);independent.update(10);close(independent.q.A,0);assert.ok(independent.q.B>0&&independent.q.C<0);
const paperOnly=new Simulation({...DEFAULT_CONFIG,rpmA:0,rpmB:0});start(paperOnly);const fixed={...paperOnly.penWorld};paperOnly.update(4);close(distance(fixed,paperOnly.penWorld),0);assert.ok(distance(paperOnly.penLocal,fixed)>1);
const high=new Simulation({...DEFAULT_CONFIG,rpmA:50});start(high);assert.equal(high.state,'INTERLOCK');assert.equal(high.penDown,false);
const bad=new Simulation({...DEFAULT_CONFIG,lengthA:240,lengthB:240,radiusA:70,radiusB:70});assert.ok(bad.audit.failures>0);bad.power();bad.home();bad.update(20);assert.equal(bad.homed,false);
// Approach a singularity from a valid pose: proposed unsafe move must never commit.
const near=new Simulation({...DEFAULT_CONFIG,lengthA:240,lengthB:240,radiusA:20,radiusB:20,phaseA:180,phaseB:0,rpmA:8,rpmB:0,rpmC:0});
assert.ok(near.safe);start(near);for(let i=0;i<20000&&near.running;i++)near.update(.002);assert.equal(near.state,'INTERLOCK');assert.ok(near.pose.safe);assert.equal(near.penDown,false);
assert.equal(inspect({...DEFAULT_CONFIG,lengthA:10,lengthB:10},{A:0,B:0}).valid,false);
console.log('V3: 20,736 phase combinations, closure, Jacobian, force budgets, ramps, interlocks, homing and independent motors passed.');
