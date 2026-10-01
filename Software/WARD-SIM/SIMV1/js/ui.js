(function () {
'use strict';

const { normalizeDegrees, reducedFraction } = window.MotioMath;

const $ = id => document.getElementById(id);
const minus = value => value < 0 ? '−' + Math.abs(value) : String(value);

class UIController {
  constructor(simulation, onConfigChange) {
    this.sim = simulation;
    this.onConfigChange = onConfigChange;
    this.speedValues = [0.25, 0.5, 1, 2, 5];
    this.speedMultiplier = 1;
    this.bindControls();
    this.refreshStatic();
  }

  bindControls() {
    $('play-btn').addEventListener('click', () => this.sim.running = true);
    $('pause-btn').addEventListener('click', () => this.sim.running = false);
    $('stop-btn').addEventListener('click', () => this.sim.stop());
    $('reset-btn').addEventListener('click', () => this.sim.reset(true));
    $('clear-btn').addEventListener('click', () => this.sim.clearTrace());
    $('speed').addEventListener('input', event => {
      this.speedMultiplier = this.speedValues[Number(event.target.value)];
      $('speed-value').textContent = `${this.speedMultiplier}×`;
    });
    ['driver-teeth','paper-teeth','arm-a-teeth','arm-b-teeth','driver-rpm',
      'arm-a-pivot-x','arm-a-pivot-y','arm-a-crank','arm-a-length','arm-a-phase',
      'arm-b-pivot-x','arm-b-pivot-y','arm-b-crank','arm-b-length','arm-b-phase'].forEach(id => {
      $(id).addEventListener('change', () => this.applyInputs());
    });
    $('preset').addEventListener('change', event => {
      const [driver, paper, armA, armB] = event.target.value.split(',').map(Number);
      $('driver-teeth').value = driver; $('paper-teeth').value = paper;
      $('arm-a-teeth').value = armA; $('arm-b-teeth').value = armB;
      this.applyInputs();
    });
  }

  readConfig() {
    const integer = (id, min, max) => Math.max(min, Math.min(max, Math.round(Number($(id).value))));
    const number = (id, min, max) => Math.max(min, Math.min(max, Number($(id).value)));
    return {
      driverTeeth: integer('driver-teeth',12,120), paperTeeth: integer('paper-teeth',12,120),
      armATeeth: integer('arm-a-teeth',12,120), armBTeeth: integer('arm-b-teeth',12,120),
      driverRPM: number('driver-rpm',.1,120),
      armAPivotX: number('arm-a-pivot-x',430,650), armAPivotY: number('arm-a-pivot-y',-100,397),
      armACrankRadius: number('arm-a-crank',10,100), armALength: number('arm-a-length',200,600), armAPhase: number('arm-a-phase',0,360),
      armBPivotX: number('arm-b-pivot-x',-100,520), armBPivotY: number('arm-b-pivot-y',-180,-10),
      armBCrankRadius: number('arm-b-crank',10,100), armBLength: number('arm-b-length',150,500), armBPhase: number('arm-b-phase',0,360)
    };
  }

  applyInputs() {
    const config = this.readConfig();
    for (const [id, key] of [
      ['driver-teeth','driverTeeth'],['paper-teeth','paperTeeth'],['arm-a-teeth','armATeeth'],['arm-b-teeth','armBTeeth'],['driver-rpm','driverRPM'],
      ['arm-a-pivot-x','armAPivotX'],['arm-a-pivot-y','armAPivotY'],['arm-a-crank','armACrankRadius'],['arm-a-length','armALength'],['arm-a-phase','armAPhase'],
      ['arm-b-pivot-x','armBPivotX'],['arm-b-pivot-y','armBPivotY'],['arm-b-crank','armBCrankRadius'],['arm-b-length','armBLength'],['arm-b-phase','armBPhase']
    ]) $(id).value = config[key];
    this.sim.configure(config);
    this.refreshStatic();
    this.onConfigChange?.();
  }

  refreshStatic() {
    const { gears, config } = this.sim;
    $('active-config').textContent = `${gears.driverTeeth} / ${gears.paperTeeth} / ${gears.armATeeth} / ${gears.armBTeeth}`;
    $('paper-ratio').textContent = `${minus(gears.paperRatio.toFixed(4))}×`;
    $('arm-a-ratio').textContent = `${minus(gears.armARatio.toFixed(4))}×`;
    $('arm-b-ratio').textContent = `${minus(gears.armBRatio.toFixed(4))}×`;
    $('paper-direction').textContent = gears.paperRatio < 0 ? 'CCW' : 'CW';
    $('arm-a-direction').textContent = gears.armARatio < 0 ? 'CCW' : 'CW';
    $('arm-b-direction').textContent = gears.armBRatio < 0 ? 'CCW' : 'CW';
    $('repeat-rotations').textContent = `${gears.repeatRotations} driver rotations`;
    $('repeat-period').textContent = `${(gears.repeatRotations / config.driverRPM * 60).toFixed(1)} s at ${config.driverRPM.toFixed(1)} RPM`;
  }

  render() {
    const { sim } = this;
    const state = $('run-status');
    state.textContent = sim.running ? 'RUNNING' : (sim.time === 0 ? 'READY / PAUSED' : 'PAUSED');
    state.className = `status-badge ${sim.running ? 'running' : 'paused'}`;
    const boundary = $('boundary-status');
    if (!sim.linkageValid) { boundary.textContent='LINKAGE GEOMETRY INVALID'; boundary.className='status-badge danger'; }
    else if (!sim.insidePaper) { boundary.textContent='PEN OUTSIDE PAPER'; boundary.className='status-badge danger'; }
    else if (!sim.insideSafe) { boundary.textContent='SAFE AREA EXCEEDED'; boundary.className='status-badge warn'; }
    else { boundary.textContent='PEN INSIDE SAFE AREA'; boundary.className='status-badge ok'; }

    $('data-time').textContent = `${sim.time.toFixed(2)} s`;
    $('data-rotations').textContent = sim.driverRotations.toFixed(3);
    $('data-driver-angle').textContent = `${normalizeDegrees(sim.driverAngle).toFixed(1)}°`;
    $('data-paper-angle').textContent = `${normalizeDegrees(sim.paperAngle).toFixed(1)}°`;
    $('data-arm-a-angle').textContent = `${normalizeDegrees(sim.armAAngle).toFixed(1)}°`;
    $('data-arm-b-angle').textContent = `${normalizeDegrees(sim.armBAngle).toFixed(1)}°`;
    $('data-driver-rpm').textContent = sim.config.driverRPM.toFixed(2);
    $('data-paper-rpm').textContent = minus((sim.config.driverRPM * sim.gears.paperRatio).toFixed(2));
    $('data-arm-a-rpm').textContent = minus((sim.config.driverRPM * sim.gears.armARatio).toFixed(2));
    $('data-arm-b-rpm').textContent = minus((sim.config.driverRPM * sim.gears.armBRatio).toFixed(2));
    $('data-teeth').textContent = `${sim.gears.driverTeeth}T / ${sim.gears.paperTeeth}T / ${sim.gears.armATeeth}T / ${sim.gears.armBTeeth}T`;
    const pr = reducedFraction(-sim.gears.driverTeeth, sim.gears.paperTeeth);
    const arA = reducedFraction(-sim.gears.driverTeeth, sim.gears.armATeeth);
    const arB = reducedFraction(-sim.gears.driverTeeth, sim.gears.armBTeeth);
    $('data-paper-ratio').textContent = `−${Math.abs(pr.numerator)} / ${pr.denominator}`;
    $('data-arm-a-ratio').textContent = `−${Math.abs(arA.numerator)} / ${arA.denominator}`;
    $('data-arm-b-ratio').textContent = `−${Math.abs(arB.numerator)} / ${arB.denominator}`;
    $('data-pen-x').textContent = `${sim.penLocal.x.toFixed(2)} mm`;
    $('data-pen-y').textContent = `${sim.penLocal.y.toFixed(2)} mm`;
    $('data-inside').textContent = sim.insidePaper ? 'YES' : 'NO';
    $('data-safe').textContent = sim.insideSafe ? 'YES' : 'NO';
    $('point-count').textContent = `${sim.trace.length.toLocaleString()} trace points`;
  }
}

window.MotioUI = { UIController };
})();
