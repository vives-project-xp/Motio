(function () {
'use strict';

const { Simulation } = window.MotioSimulation;
const { MachineRenderer, PaperRenderer } = window.MotioRenderers;
const { UIController } = window.MotioUI;

const initialConfig = {
  driverTeeth: 20, paperTeeth: 60, armATeeth: 37, armBTeeth: 53, driverRPM: 12,
  armAPivotX: 500, armAPivotY: 148.5, armACrankRadius: 55, armALength: 360, armAPhase: 0,
  armBPivotX: 210, armBPivotY: -100, armBCrankRadius: 45, armBLength: 270, armBPhase: 0
};

const simulation = new Simulation(initialConfig);
const machineRenderer = new MachineRenderer(document.getElementById('machine-canvas'));
const paperRenderer = new PaperRenderer(document.getElementById('paper-canvas'));
const ui = new UIController(simulation);

const fixedStep = 0.002;
let previousTime = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  if (simulation.running || simulation.homing) {
    accumulator += elapsed * ui.speedMultiplier;
    while (accumulator >= fixedStep) {
      simulation.update(fixedStep);
      accumulator -= fixedStep;
    }
  } else {
    accumulator = 0;
  }
  machineRenderer.render(simulation);
  paperRenderer.render(simulation);
  ui.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
})();
