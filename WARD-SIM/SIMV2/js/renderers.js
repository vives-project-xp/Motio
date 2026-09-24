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
  const visibleTeeth = teeth;
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
    trace[i].break ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
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
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fillStyle = sim.penDown ? (sim.insidePaper ? '#e14f64' : '#ff293f') : '#74899a'; ctx.fill();
    ctx.fillStyle = '#6e7478'; ctx.font = '9px ui-monospace, monospace'; ctx.fillText('A3 · 420 mm', ox, oy - 8);
  }
}


class MachineRenderer extends CanvasRenderer {
 render(sim) {
  const {width,height}=this.resize(), ctx=this.ctx, c=sim.config;
  ctx.clearRect(0,0,width,height);
  const minX=-155,minY=Math.min(-215,c.armBPivotY-100),maxX=Math.max(685,c.armAPivotX+95),maxY=Math.max(440,c.armAPivotY+100);
  const scale=Math.min((width-30)/(maxX-minX),(height-45)/(maxY-minY));
  const ox=(width-(maxX-minX)*scale)/2,oy=(height-(maxY-minY)*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.translate(-minX,-minY);
  const line=(a,b,color,w=2,dash=[])=>{ctx.beginPath();ctx.setLineDash(dash);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();ctx.setLineDash([]);};
  const circle=(x,y,r,fill,stroke)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}};
  const text=(t,x,y,color='#aebcc9')=>{ctx.fillStyle=color;ctx.font='11px ui-monospace, monospace';ctx.textAlign='left';ctx.fillText(t,x,y);};
  ctx.fillStyle='#17212b';ctx.fillRect(minX+5,minY+5,maxX-minX-10,maxY-minY-10);ctx.strokeStyle='#47596a';ctx.strokeRect(minX+5,minY+5,maxX-minX-10,maxY-minY-10);
  for(const x of [minX+18,maxX-18])for(const y of [minY+18,maxY-18]) {circle(x,y,5,'#080e15','#607080');line({x:x-3,y},{x:x+3,y},'#8694a2');}
  text('MOTIO / TABLETOP PROTOTYPE',minX+30,minY+30);
  const driver={x:-100,y:100},center={x:210,y:148.5};
  ctx.fillStyle='#263b48';ctx.fillRect(-133,65,66,75);text('M1',-110,155);text('ONE MOTOR',-137,170);
  const branches=[{p:center,t:c.paperTeeth,a:sim.paperAngle,color:'#f2b84b',name:'PAPER'}, {p:{x:c.armAPivotX,y:c.armAPivotY},t:c.armATeeth,a:sim.armAAngle,color:'#a98bff',name:'ARM A'}, {p:{x:c.armBPivotX,y:c.armBPivotY},t:c.armBTeeth,a:sim.armBAngle,color:'#58d68d',name:'ARM B'}];
  // Module 1 mm: pitch radius z/2. Identical remote pinions are belt-coupled 1:1.
  branches.forEach((b,i)=>{
   b.pin={x:b.p.x-(b.t+c.driverTeeth)/2,y:b.p.y};
   for(const dy of [-7,7])line({x:driver.x,y:driver.y+dy},{x:b.pin.x,y:b.pin.y+dy},'#607683',2,[6,4]);
   circle(b.pin.x,b.pin.y,7,'#17212b','#788e9f');
   drawGear(ctx,b.pin.x,b.pin.y,c.driverTeeth/2+1,c.driverTeeth,sim.driverAngle,'#45d4df','1:1');
   drawGear(ctx,b.p.x,b.p.y,b.t/2+1,b.t,b.a,b.color,b.name);
  });
  drawGear(ctx,driver.x,driver.y,c.driverTeeth/2+1,c.driverTeeth,sim.driverAngle,'#45d4df','DRIVER');
  // Rotating platform and all paper-local geometry use the same rigid transform.
  circle(210,148.5,263,'#273744','#586f7b');
  ctx.save();ctx.translate(210,148.5);ctx.rotate(sim.paperAngle);ctx.translate(-210,-148.5);
  ctx.fillStyle='#f4f0e5';ctx.fillRect(0,0,420,297);ctx.strokeStyle='#a5b7bd';ctx.strokeRect(0,0,420,297);
  ctx.save();ctx.beginPath();ctx.rect(0,0,420,297);ctx.clip();strokeTrace(ctx,sim.trace,(x,y)=>({x,y}));ctx.restore();
  ctx.strokeStyle='#bc954e';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.strokeRect(20,20,380,257);ctx.setLineDash([]);
  for(const x of [12,398])for(const y of [4,283]){ctx.fillStyle='#8a9aa3';ctx.fillRect(x,y,10,10);}
  if(sim.engineering){line({x:0,y:0},{x:55,y:0},'#bd5b45',2);line({x:0,y:0},{x:0,y:55},'#368567',2);text('LOCAL',5,70,'#33434f');}
  ctx.restore();
  circle(210,148.5,6,'#f2b84b','#26333c');
  // Inspection window: same paper gear pair, offset as an explicitly labelled cutaway.
  const ix=maxX-100,iy=minY+115;
  ctx.fillStyle='#0e1922';ctx.fillRect(ix-192,iy-85,270,170);ctx.strokeStyle='#405565';ctx.strokeRect(ix-192,iy-85,270,170);
  text('PAPER DRIVE / CUTAWAY',ix-184,iy-69);
  drawGear(ctx,ix,iy,c.paperTeeth/2+1,c.paperTeeth,sim.paperAngle,'#f2b84b','PAPER');
  drawGear(ctx,ix-(c.paperTeeth+c.driverTeeth)/2,iy,c.driverTeeth/2+1,c.driverTeeth,sim.driverAngle,'#45d4df','1:1');
  // Dashed under-deck gear outline exposes the actual paper shaft connection.
  if(sim.engineering){ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(210,148.5,c.paperTeeth/2,0,TAU);ctx.strokeStyle='#b88a2e';ctx.stroke();ctx.setLineDash([]);text('PAPER GEAR / BELOW DECK',225,148.5);}
  branches.slice(1).forEach((b,i)=>{
   ctx.fillStyle='#354957';ctx.fillRect(b.p.x-12,b.p.y-12,24,24);
   const crank=i===0?sim.armACrankPin:sim.armBCrankPin;
   line(b.p,crank,b.color,9);
   if(sim.linkageValid){line(crank,sim.penWorld,'#0b141c',12);line(crank,sim.penWorld,b.color,8);line(crank,sim.penWorld,'#e1e9ed',1);}
   for(const p of [b.p,crank]){circle(p.x,p.y,6,'#ccd6da','#15212c');circle(p.x,p.y,2,'#263843');}
   const sensor={x:b.p.x+14,y:b.p.y-18};ctx.fillStyle=sim.homed?'#58d68d':'#f2b84b';ctx.fillRect(sensor.x,sensor.y,8,6);
   if(sim.engineering){ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(b.p.x,b.p.y,b.t/2,0,TAU);ctx.strokeStyle=b.color;ctx.stroke();ctx.beginPath();ctx.arc(b.p.x,b.p.y,i===0?c.armACrankRadius:c.armBCrankRadius,0,TAU);ctx.stroke();ctx.setLineDash([]);text(b.name+' '+b.t+'T '+(sim.running?c.direction*c.driverRPM*(-c.driverTeeth/b.t):0).toFixed(2)+' RPM',b.p.x-40,b.p.y-70,b.color);text(c.direction===1?'↶ CCW':'↷ CW',b.p.x-30,b.p.y-52,b.color);}
  });
  if(sim.linkageValid){const p=sim.penWorld;ctx.fillStyle='#27333e';ctx.fillRect(p.x-11,p.y-11,22,22);circle(p.x,p.y,6,sim.penDown?'#ef6477':'#faf0da','#ffffff');text(sim.penDown?'PEN ↓':'PEN ↑',p.x+16,p.y-12);}
  ctx.fillStyle='#17463e';ctx.fillRect(-135,245,72,45);text('CTRL PCB',-133,265);text('24V / I/O',-133,282);line({x:-99,y:245},{x:-100,y:175},'#58d68d',2);
  if(sim.engineering){text('WORLD X → / Y ↓ · mm',minX+30,maxY-45);text('PEN '+sim.penWorld.x.toFixed(1)+', '+sim.penWorld.y.toFixed(1),minX+30,maxY-27);}
  text('Ø526 PLATFORM · A3 420 × 297 · TRANSMISSIONS BELOW DECK',-30,maxY-13);
  ctx.restore();
 }
}
window.MotioRenderers = { MachineRenderer, PaperRenderer };
})();
