(function () {
'use strict';

const { TAU, repeatDriverRotations, worldToPaper } = window.MotioMath;

const PAPER = Object.freeze({ width: 420, height: 297, margin: 20, centerX: 210, centerY: 148.5 });

class GearTrain {
  constructor(driverTeeth, paperTeeth, armATeeth, armBTeeth) { this.configure(driverTeeth, paperTeeth, armATeeth, armBTeeth); }
  configure(driverTeeth, paperTeeth, armATeeth, armBTeeth) {
    this.driverTeeth = driverTeeth;
    this.paperTeeth = paperTeeth;
    this.armATeeth = armATeeth;
    this.armBTeeth = armBTeeth;
    this.paperRatio = -driverTeeth / paperTeeth;
    this.armARatio = -driverTeeth / armATeeth;
    this.armBRatio = -driverTeeth / armBTeeth;
    this.repeatRotations = repeatDriverRotations(driverTeeth, paperTeeth, armATeeth, armBTeeth);
  }
}

class Simulation {
  constructor(config) {
    this.trace = [];
    this.running = false;
    this.powered = false; this.homed = false; this.penDown = false; this.homing = false; this.message = "Power on → Home";
    this.time = 0;
    this.driverRotations = 0;
    this.configure(config);
  }

  configure(config) {
    this.config = { direction: 1, ...config };
    this.gears = new GearTrain(config.driverTeeth, config.paperTeeth, config.armATeeth, config.armBTeeth);
    this.penWorld = null;
    this.reset(true);
  }

  reset(clearTrace = true) {
    this.running = false; this.homing = false; this.homed = false; this.penDown = false; this.message = this.powered ? 'Home required' : 'Power on → Home';
    this.time = 0;
    this.driverRotations = 0;
    if (clearTrace) this.trace = [];
    this.penWorld = null; this.strokeBreak = true;
    this.updateKinematics();
  }

  stop() { this.running = false; this.homing = false; this.penDown = false; this.strokeBreak = true; this.message = 'Stopped at current position'; }
  power() { this.powered = !this.powered; this.stop(); this.homed = false; this.message = this.powered ? 'Home required' : 'Power off'; }
  play() { if (this.powered && this.homed && !this.homing && this.linkageValid) { this.running = true; this.message = 'Drawing follows the physical linkage'; } }
  home() { if (!this.powered) return; this.stop(); this.homed = false; this.homing = true; this.homeStart = this.driverRotations; this.homeElapsed = 0; this.message = 'Homing · returning the coupled axes to reference'; }
  togglePen() { if (!this.powered || !this.homed || this.homing) return; this.penDown = !this.penDown; this.strokeBreak = true; }
  get state() { return !this.powered ? 'POWER OFF' : this.homing ? 'HOMING' : !this.linkageValid ? 'WARNING' : !this.homed ? 'NOT HOMED' : this.running ? 'RUNNING' : this.time ? 'PAUSED' : 'HOMED'; }
  clearTrace() { this.trace = []; this.strokeBreak = true; }

  update(dt) {
    if (this.homing) {
      this.homeElapsed += dt; const t = Math.min(1, this.homeElapsed / 2);
      this.driverRotations = this.homeStart * (1 - t * t * (3 - 2 * t)); this.updateKinematics();
      if (t === 1) { this.homing = false; this.homed = true; this.time = 0; this.message = 'Homing complete'; }
      return;
    }
    if (!this.running || !this.powered || !this.homed) return;
    this.time += dt;
    this.driverRotations += this.config.direction * this.config.driverRPM / 60 * dt;
    this.updateKinematics();
    if (!this.linkageValid) { this.stop(); this.message = 'WARNING · unreachable linkage. Adjust geometry and home.'; this.homed = false; return; }
    if (!this.penDown || !this.insidePaper) { this.strokeBreak = true; return; }
    const previous = this.trace[this.trace.length - 1];
    if (this.linkageValid && (this.strokeBreak || !previous || Math.hypot(this.penLocal.x - previous.x, this.penLocal.y - previous.y) >= 0.16)) {
      this.trace.push({ x: this.penLocal.x, y: this.penLocal.y, break: this.strokeBreak }); this.strokeBreak = false;
    }
    if (this.trace.length > 350000) this.trace.splice(0, 50000);
  }

  updateKinematics() {
    const phaseA = this.config.armAPhase * Math.PI / 180;
    const phaseB = this.config.armBPhase * Math.PI / 180;
    this.driverAngle = this.driverRotations * TAU;
    this.paperAngle = this.driverAngle * this.gears.paperRatio;
    this.armAAngle = this.driverAngle * this.gears.armARatio + phaseA;
    this.armBAngle = this.driverAngle * this.gears.armBRatio + phaseB;
    this.armACrankPin = {
      x: this.config.armAPivotX + this.config.armACrankRadius * Math.cos(this.armAAngle),
      y: this.config.armAPivotY + this.config.armACrankRadius * Math.sin(this.armAAngle)
    };
    this.armBCrankPin = {
      x: this.config.armBPivotX + this.config.armBCrankRadius * Math.cos(this.armBAngle),
      y: this.config.armBPivotY + this.config.armBCrankRadius * Math.sin(this.armBAngle)
    };
    const candidates = this.circleIntersections(this.armACrankPin, this.config.armALength, this.armBCrankPin, this.config.armBLength);
    this.linkageValid = candidates.length === 2;
    if (this.linkageValid) {
      const target = this.penWorld || { x: PAPER.centerX, y: PAPER.centerY };
      this.penWorld = candidates.reduce((best, point) => {
        const score = Math.hypot(point.x - target.x, point.y - target.y);
        return !best || score < best.score ? { ...point, score } : best;
      }, null);
    } else {
      this.penWorld = {
        x: (this.armACrankPin.x + this.armBCrankPin.x) / 2,
        y: (this.armACrankPin.y + this.armBCrankPin.y) / 2
      };
    }
    this.penLocal = worldToPaper(this.penWorld.x, this.penWorld.y, this.paperAngle, PAPER.centerX, PAPER.centerY);
    this.insidePaper = this.penLocal.x >= 0 && this.penLocal.x <= PAPER.width && this.penLocal.y >= 0 && this.penLocal.y <= PAPER.height;
    this.insideSafe = this.penLocal.x >= PAPER.margin && this.penLocal.x <= PAPER.width - PAPER.margin && this.penLocal.y >= PAPER.margin && this.penLocal.y <= PAPER.height - PAPER.margin;
  }

  pointInsidePaper(point) {
    return point.x >= 0 && point.x <= PAPER.width && point.y >= 0 && point.y <= PAPER.height;
  }

  circleIntersections(a, radiusA, b, radiusB) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance > radiusA + radiusB || distance < Math.abs(radiusA - radiusB)) return [];
    const along = (radiusA ** 2 - radiusB ** 2 + distance ** 2) / (2 * distance);
    const heightSquared = radiusA ** 2 - along ** 2;
    if (heightSquared < -1e-8) return [];
    const height = Math.sqrt(Math.max(0, heightSquared));
    const baseX = a.x + along * dx / distance;
    const baseY = a.y + along * dy / distance;
    const offsetX = -dy * height / distance;
    const offsetY = dx * height / distance;
    return [
      { x: baseX + offsetX, y: baseY + offsetY },
      { x: baseX - offsetX, y: baseY - offsetY }
    ];
  }
}

window.MotioSimulation = { PAPER, GearTrain, Simulation };
})();
