(function () {
'use strict';

const { PAPER } = window.MotioSimulation;
const { paperToWorld, TAU } = window.MotioMath;

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(rect.width * dpr) || this.canvas.height !== Math.round(rect.height * dpr)) {
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
    }
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  }
}

function drawGear(ctx, x, y, radius, teeth, angle, color, label) {
  const visibleTeeth = Math.min(teeth, 72);
  const root = radius * 0.88;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < visibleTeeth * 2; i++) {
    const a = i / (visibleTeeth * 2) * TAU;
    const r = i % 2 === 0 ? radius : root;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color + '19';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, radius * .2, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(radius * .2, 0); ctx.lineTo(radius * .72, 0); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#aab5c2';
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${label} · ${teeth}T`, x, y + radius + 14);
}

function clipPaper(ctx, transform) {
  const corners = [[0,0], [PAPER.width,0], [PAPER.width,PAPER.height], [0,PAPER.height]].map(([x,y]) => transform(x,y));
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath(); ctx.clip();
}

function strokeTrace(ctx, trace, transform, color = '#25333b') {
  if (trace.length < 2) return;
  ctx.beginPath();
  const first = transform(trace[0].x, trace[0].y);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < trace.length; i++) {
    const p = transform(trace[i].x, trace[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}

class PaperRenderer extends CanvasRenderer {
  render(sim) {
    const { width, height } = this.resize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    const padding = 28;
    const scale = Math.min((width - padding * 2) / PAPER.width, (height - padding * 2) / PAPER.height);
    const ox = (width - PAPER.width * scale) / 2;
    const oy = (height - PAPER.height * scale) / 2;
    const tr = (x, y) => ({ x: ox + x * scale, y: oy + y * scale });
    ctx.fillStyle = '#f2f0e9'; ctx.fillRect(ox, oy, PAPER.width * scale, PAPER.height * scale);
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, oy, PAPER.width * scale, PAPER.height * scale); ctx.clip();
    strokeTrace(ctx, sim.trace, tr, '#17272e');
    ctx.restore();
    ctx.strokeStyle = '#a9b0b4'; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, PAPER.width * scale, PAPER.height * scale);
    ctx.strokeStyle = '#d39c36'; ctx.setLineDash([5, 4]); ctx.strokeRect(ox + PAPER.margin * scale, oy + PAPER.margin * scale, (PAPER.width - PAPER.margin * 2) * scale, (PAPER.height - PAPER.margin * 2) * scale); ctx.setLineDash([]);
    const p = tr(sim.penLocal.x, sim.penLocal.y);
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fillStyle = sim.insidePaper ? '#e14f64' : '#ff293f'; ctx.fill();
    ctx.fillStyle = '#6e7478'; ctx.font = '9px ui-monospace, monospace'; ctx.fillText('A3 · 420 mm', ox, oy - 8);
  }
}

class MachineRenderer extends CanvasRenderer {
  render(sim) {
    const { width, height } = this.resize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    this.drawGrid(ctx, width, height);

    const gearZone = Math.min(170, width * .28);
    const worldMinX = -40;
    const worldMaxX = 580;
    const worldMinY = -170;
    const worldMaxY = 340;
    const scale = Math.min((width - gearZone - 44) / (worldMaxX - worldMinX), (height - 44) / (worldMaxY - worldMinY));
    const paperCx = gearZone + 22 + (PAPER.centerX - worldMinX) * scale;
    const paperCy = 22 + (PAPER.centerY - worldMinY) * scale;
    const world = (x, y) => ({ x: paperCx + (x - PAPER.centerX) * scale, y: paperCy + (y - PAPER.centerY) * scale });
    const localToScreen = (x, y) => {
      const p = paperToWorld(x, y, sim.paperAngle, PAPER.centerX, PAPER.centerY);
      return world(p.x, p.y);
    };

    const gearScale = Math.min(1, height / 530);
    const driverR = 27 * gearScale;
    const paperR = Math.min(55, driverR * Math.sqrt(sim.gears.paperTeeth / sim.gears.driverTeeth));
    const gx = 48 + driverR, gy = height / 2;
    const pivotA = world(sim.config.armAPivotX, sim.config.armAPivotY);
    const pivotB = world(sim.config.armBPivotX, sim.config.armBPivotY);
    const gearARadius = Math.min(42, 25 + sim.gears.armATeeth * .16) * gearScale;
    const gearBRadius = Math.min(42, 25 + sim.gears.armBTeeth * .16) * gearScale;
    drawGear(ctx, gx, gy, driverR, sim.gears.driverTeeth, sim.driverAngle, '#45d4df', 'DRIVER');
    drawGear(ctx, gx, gy - driverR - paperR + 3, paperR, sim.gears.paperTeeth, sim.paperAngle, '#f2b84b', 'PAPER');
    drawGear(ctx, pivotA.x, pivotA.y, gearARadius, sim.gears.armATeeth, sim.armAAngle, '#a98bff', 'ARM A');
    drawGear(ctx, pivotB.x, pivotB.y, gearBRadius, sim.gears.armBTeeth, sim.armBAngle, '#58d68d', 'ARM B');
    ctx.strokeStyle = '#4c5968'; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(gx + paperR, gy - driverR - paperR + 3); ctx.lineTo(paperCx, paperCy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + driverR, gy); ctx.lineTo(pivotA.x - gearARadius, pivotA.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + driverR, gy); ctx.lineTo(pivotB.x - gearBRadius, pivotB.y); ctx.stroke(); ctx.setLineDash([]);

    ctx.save();
    clipPaper(ctx, localToScreen);
    const corners = [[0,0],[PAPER.width,0],[PAPER.width,PAPER.height],[0,PAPER.height]].map(([x,y]) => localToScreen(x,y));
    ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y); corners.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.fillStyle='#e9e7df'; ctx.fill();
    strokeTrace(ctx, sim.trace, localToScreen, '#24343b');
    ctx.restore();
    const paperCorners = [[0,0],[PAPER.width,0],[PAPER.width,PAPER.height],[0,PAPER.height]].map(([x,y]) => localToScreen(x,y));
    ctx.beginPath(); ctx.moveTo(paperCorners[0].x,paperCorners[0].y); paperCorners.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.strokeStyle='#cfd4d6'; ctx.lineWidth=1.3; ctx.stroke();
    const safe = [[20,20],[400,20],[400,277],[20,277]].map(([x,y])=>localToScreen(x,y));
    ctx.beginPath(); ctx.moveTo(safe[0].x,safe[0].y); safe.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.strokeStyle='#b68b3f'; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);

    const crankA = world(sim.armACrankPin.x, sim.armACrankPin.y);
    const crankB = world(sim.armBCrankPin.x, sim.armBCrankPin.y);
    const pen = world(sim.penWorld.x, sim.penWorld.y);

    ctx.strokeStyle = '#a98bff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(pivotA.x,pivotA.y); ctx.lineTo(crankA.x,crankA.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crankA.x,crankA.y); ctx.lineTo(pen.x,pen.y); ctx.stroke();
    ctx.strokeStyle = '#d7c9ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(crankA.x,crankA.y); ctx.lineTo(pen.x,pen.y); ctx.stroke();
    ctx.strokeStyle = '#58d68d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(pivotB.x,pivotB.y); ctx.lineTo(crankB.x,crankB.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crankB.x,crankB.y); ctx.lineTo(pen.x,pen.y); ctx.stroke();
    ctx.strokeStyle = '#c3f2d6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(crankB.x,crankB.y); ctx.lineTo(pen.x,pen.y); ctx.stroke();
    for (const [point, color] of [[pivotA,'#a98bff'],[crankA,'#a98bff'],[pivotB,'#58d68d'],[crankB,'#58d68d']]) {
      ctx.beginPath(); ctx.arc(point.x,point.y,5,0,TAU); ctx.fillStyle=color; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(pen.x,pen.y,6,0,TAU); ctx.fillStyle='#e14f64'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#9aa7b5'; ctx.font='9px ui-monospace, monospace'; ctx.fillText('PEN',pen.x+9,pen.y-8);
    ctx.beginPath(); ctx.arc(paperCx,paperCy,4,0,TAU); ctx.fillStyle='#f2b84b'; ctx.fill();
  }

  drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(110,130,150,.09)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x=0;x<width;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,height);} for(let y=0;y<height;y+=24){ctx.moveTo(0,y);ctx.lineTo(width,y);} ctx.stroke();
  }
}

window.MotioRenderers = { MachineRenderer, PaperRenderer };
})();
