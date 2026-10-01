const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

global.window = global;
const root = path.resolve(__dirname, '..');
for (const file of ['js/math.js', 'js/simulation.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}

const { repeatDriverRotations, paperToWorld, worldToPaper } = MotioMath;
const { Simulation } = MotioSimulation;

assert.equal(repeatDriverRotations(20, 60, 37), 111, '20/60/37 must repeat after 111 driver rotations');
assert.equal(repeatDriverRotations(20, 60, 37, 53), 5883, '20/60/37/53 must include both arm cycles');
assert.equal(repeatDriverRotations(20, 40, 60), 6, '20/40/60 must repeat after 6 driver rotations');

const source = { x: 73.2, y: 221.7 };
const world = paperToWorld(source.x, source.y, 1.234);
const restored = worldToPaper(world.x, world.y, 1.234);
assert.ok(Math.abs(restored.x - source.x) < 1e-10, 'X transform must be reversible');
assert.ok(Math.abs(restored.y - source.y) < 1e-10, 'Y transform must be reversible');

const sim = new Simulation({
  driverTeeth: 20, paperTeeth: 60, armATeeth: 37, armBTeeth: 53, driverRPM: 12,
  armAPivotX: 500, armAPivotY: 148.5, armACrankRadius: 55, armALength: 360, armAPhase: 0,
  armBPivotX: 210, armBPivotY: -100, armBCrankRadius: 45, armBLength: 270, armBPhase: 0
});
sim.running = true;
for (let i = 0; i < 500; i++) sim.update(0.002);
assert.ok(sim.driverRotations > 0, 'Driver must rotate while playing');
assert.ok(sim.paperAngle < 0, 'Paper must counter-rotate');
assert.ok(sim.armAAngle < 0, 'Arm A must counter-rotate');
assert.ok(sim.armBAngle < 0, 'Arm B must counter-rotate');
assert.ok(sim.trace.length > 10, 'Trace must grow while playing');
assert.ok(sim.insidePaper, 'Default pen position must remain on paper after one second');
assert.ok(sim.linkageValid, 'Default dual-arm geometry must remain valid');
assert.ok(sim.config.armAPivotX > 420, 'Arm A pivot must be beside the A3 paper');
assert.ok(sim.config.armBPivotY < 0, 'Arm B pivot must be above the A3 paper');
assert.ok(Math.abs(Math.hypot(sim.armACrankPin.x - sim.penWorld.x, sim.armACrankPin.y - sim.penWorld.y) - sim.config.armALength) < 1e-8, 'Arm A length must remain constant');
assert.ok(Math.abs(Math.hypot(sim.armBCrankPin.x - sim.penWorld.x, sim.armBCrankPin.y - sim.penWorld.y) - sim.config.armBLength) < 1e-8, 'Arm B length must remain constant');

let previousPen = { ...sim.penWorld };
let largestSampleStep = 0;
for (let i = 1; i <= 5000; i++) {
  sim.driverRotations = i / 25;
  sim.updateKinematics();
  assert.ok(sim.linkageValid, `Dual-arm geometry must stay valid at sample ${i}`);
  largestSampleStep = Math.max(largestSampleStep, Math.hypot(sim.penWorld.x - previousPen.x, sim.penWorld.y - previousPen.y));
  previousPen = { ...sim.penWorld };
}
assert.ok(largestSampleStep < 25, 'Pen carriage must follow a continuous intersection branch');

console.log('MOTIO logic tests passed.');
