(function () {
'use strict';
const {DESIGN,pitchRadius}=window.MotioMechanics;
const {TAU}=window.MotioMath;
const colors={A:'#b9a0ff',B:'#64d8a1',C:'#f4c367'};
const n=v=>Number(v).toFixed(2);
const line=(a,b,color,width=2,dash='')=>`<line x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const circle=(p,r,fill,stroke='#a9becd',w=1.5)=>`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const text=(str,x,y,color='#b5c7d7',size=11)=>`<text x="${n(x)}" y="${n(y)}" fill="${color}" font-size="${size}" font-family="Consolas,monospace">${str}</text>`;
function pulley(p,teeth,angle,color) {
 const r=pitchRadius(teeth);
 return circle(p,r,'#172733',color)+circle(p,4,'#9aadb9',color)+line({x:p.x+6*Math.cos(angle),y:p.y+6*Math.sin(angle)},{x:p.x+r*Math.cos(angle),y:p.y+r*Math.sin(angle)},color,2);
}
function belt(a,b,small,large) {
 // Actual open-belt tangent points, not a decorative center-to-center line.
 const phi=Math.atan2(b.y-a.y,b.x-a.x),alpha=Math.asin((large-small)/Math.hypot(b.x-a.x,b.y-a.y));
 let s='';
 for(const sign of [-1,1]){const theta=phi+sign*(Math.PI/2+alpha);s+=line({x:a.x+small*Math.cos(theta),y:a.y+small*Math.sin(theta)},{x:b.x+large*Math.cos(theta),y:b.y+large*Math.sin(theta)},'#7797ab',3,'5 3');}
 return s;
}
function tracePath(trace,limit=12000) {
 let s='';
 for(let i=Math.max(0,trace.length-limit);i<trace.length;i++){const p=trace[i];s+=(p.break||i===Math.max(0,trace.length-limit)?'M':'L')+n(p.x)+','+n(p.y);}
 return s;
}
function mechanismSVG(sim,technical=false) {
 const d=DESIGN,p=sim.pose,c=sim.config,base=d.base;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-115 -335 850 850" role="img"><title>Sim V3 — drie afzonderlijke motoren en gesloten vijfstangenketen</title><desc>O_A 550,148.5; O_B 210,-185. Twee krukken koppelen via vrije ellebogen en twee armen aan dezelfde pen P. Motor C draait het gelagerde papierplatform.</desc><defs><clipPath id="${technical?'tech':'live'}-paper"><rect x="0" y="0" width="420" height="297"/></clipPath></defs>`;
 s+=`<rect x="${base.x}" y="${base.y}" width="${base.width}" height="${base.height}" rx="6" fill="#192633" stroke="#57718a" stroke-width="2"/>`;
 for(const x of [base.x+15,base.x+base.width-15])for(const y of [base.y+15,base.y+base.height-15])s+=circle({x,y},4,'#080d13','#9cadbd');
 s+=text('BASE · 790 × 770 × 8 · Al + 2020 onderframe',-60,440,'#b0c4d5',12);
 // All motors and belts are below the support plate, exposed as a cutaway.
 for(const key of ['A','B','C']) {
  const branch=d[key],m=branch.motor,o=branch.pivot,color=colors[key];
  s+=`<rect x="${n(m.x-27)}" y="${n(m.y-27)}" width="54" height="54" fill="#101c29" stroke="#587386" stroke-dasharray="4 3"/>`;
  s+=`<rect x="${n(m.x-21)}" y="${n(m.y-21)}" width="42" height="42" fill="#263443" stroke="${color}"/>`;
  for(const dx of [-15.5,15.5])for(const dy of [-15.5,15.5])s+=circle({x:m.x+dx,y:m.y+dy},1.8,'#09101a');
  s+=belt(m,o,pitchRadius(20),pitchRadius(branch.outputTeeth));
  s+=pulley(m,20,sim.q[key]*branch.ratio,color)+pulley(o,branch.outputTeeth,sim.q[key],color);
  if(key!=='C'){
   s+=`<rect x="${n(o.x-30)}" y="${n(o.y-30)}" width="60" height="60" fill="#34465888" stroke="#829eb3"/>`;
   for(const dx of [-25,25])for(const dy of [-25,25])s+=circle({x:o.x+dx,y:o.y+dy},2.5,'#111c29','#829eb3');
   s+=circle(o,22,'#34465888','#829eb3')+circle(o,11,'#9baebf',color)+circle(o,4,'#0e1724',color);
  }
 }
 s+=circle(d.paper,263,'#334650cc','#899eae',2);
 s+=`<g transform="translate(210 148.5) rotate(${n(sim.q.C*180/Math.PI)}) translate(-210 -148.5)"><rect width="420" height="297" fill="#f4f0e7" stroke="#a7bccb"/><rect x="20" y="20" width="380" height="257" fill="none" stroke="#b88b43" stroke-dasharray="5 5"/>`;
 if(!technical)s+=`<path d="${tracePath(sim.trace)}" fill="none" stroke="#263846" stroke-width=".8" clip-path="url(#live-paper)"/>`;
 for(const x of [10,400])for(const y of [4,285])s+=`<rect x="${x}" y="${y}" width="10" height="8" fill="#526a7c"/>`;
 s+='</g>';
 s+=circle(d.paper,8,'#f4c367','#182634')+text('C · gelagerde spindel Ø12',230,245,'#344658',10);
 // Dashed inspection overlay exposes C's true position below the platform.
 s+=`<g opacity=".75">${belt(d.C.motor,d.C.pivot,pitchRadius(20),pitchRadius(80))}${pulley(d.C.pivot,80,sim.q.C,colors.C)}${pulley(d.C.motor,20,sim.q.C*4,colors.C)}</g>`;
 s+=text('M-C · 4:1 · onder plaat',335,205,'#89632a',11);
 for(const key of ['A','B']) {
  const o=d[key].pivot,e=key==='A'?p.a:p.b,color=colors[key];
  s+=circle(o,c['radius'+key],'none',color,1).replace('fill="none"','fill="none" stroke-dasharray="3 4"');
  s+=line(o,e,'#071019',19)+line(o,e,color,16);
  if(p.valid)s+=line(e,p.pen,'#071019',24)+line(e,p.pen,color,20)+line(e,p.pen,'#e4edf4',1);
  s+=circle(o,7,'#c6d4de','#182634')+circle(o,3,'#172634')+circle(e,11,'#dce5eb',color,2)+circle(e,4,'#273a49');
  s+=text('O_'+key,o.x+14,o.y-14,color,12)+text('E_'+key,e.x+14,e.y+18,color,12);
 }
 if(p.valid){s+=circle(p.pen,14,'#273a49','#d9e6ed',2)+circle(p.pen,5,sim.penDown?'#ff818c':'#f4f0e7','#182634')+text('P · PEN '+(sim.penDown?'↓':'↑'),p.pen.x+18,p.pen.y-18,'#223746',12);}
 s+=text('M-A · 3:1',592,210,colors.A,12)+text('M-B · 3:1',250,-270,colors.B,12);
 if(technical){
  s+=text('PIVOTS VAST · ALLE MATEN mm',-60,-278,'#64d7dd',12);
  s+=text('O_B (210, −185) · z96 kruk / z116 arm',-45,-224,colors.B,11);
  s+=text('O_A (550, 148,5)',477,285,colors.A,11)+text('z64 kruk / z84 arm',477,302,colors.A,11);
  s+=text('A: '+c.lengthA+' hart-op-hart',430,65,colors.A,11)+text('B: '+c.lengthB+' hart-op-hart',65,20,'#285e49',11);
  s+=line({x:-53,y:420},{x:473,y:420},'#9fb7c7',1)+line({x:-53,y:412},{x:-53,y:426},'#9fb7c7',1)+line({x:473,y:412},{x:473,y:426},'#9fb7c7',1)+text('Ø526 plateau · 4 mm aluminium',100,415,'#c2d6e6',11);
  s+=text('Onderplaat: 20T → 60T A/B · 20T → 80T C',-60,-250,'#98acbf',11);
  s+=text('z−12 riemvlak · motoren naast gelagerde werkassen',-60,481,'#98acbf',11);
 }else{s+=text('WERELD X → / Y ↓ · mm',-60,-278,'#64d7dd',12);}
 return s+'</svg>';
}
function sectionSVG(exploded=false) {
 const lift=exploded?35:0,scale=1.4,Y=z=>230-z*scale;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -55 960 410"><title>Montagehoogtes en onafhankelijk gelagerde penarmen</title>';
 const rect=(x,z,w,h,fill)=>`<rect x="${x}" y="${Y(z+h/2)}" width="${w}" height="${h*scale}" fill="${fill}" stroke="#8da7bb"/>`;
 s+=rect(15,4,670,8,'#2c4052')+text('Draagplaat z0…8',20,Y(-13),'#a5bdcf',12);
 for(const [key,x] of [['A',120],['B',315]]) {
  const d=DESIGN[key],color=colors[key],offset=key==='B'?lift:0;
  s+=rect(x-22,(8+d.bearings[1]+4)/2,44,d.bearings[1]-4,'#2d4558');
  s+=rect(x-30,10.5,60,5,'#2d4558');
  s+=rect(x-4,(d.crankZ+4-30)/2,8,d.crankZ+34,'#a5b6c2');
  for(const z of d.bearings)s+=rect(x-11,z,22,7,'#d4dfeb');
  s+=rect(x-29,-12,58,9,color)+rect(x,d.crankZ+offset,45,8,color)+rect(x+35,d.rodZ+offset,110,20,color);
  s+=rect(x+36,(d.crankZ+d.rodZ)/2+offset,8,d.rodZ-d.crankZ+15,'#bdcbd6');
  s+=text(key+' · 608 × 2',x-35,Y(-35),color,12)+text('Kruk z'+d.crankZ,x-15,Y(d.crankZ+12+offset),color,11)+text('Arm z'+d.rodZ,x+40,Y(d.rodZ+15+offset),color,11);
 }
 s+=rect(548,-14,42,52,'#2d4558')+rect(563,-17.5,12,95,'#a5b6c2');
 for(const z of [-36,8])s+=rect(555,z,28,8,'#d4dfeb');
 s+=rect(530,-12,77,9,colors.C)+rect(505,30+lift,125,4,colors.C)+rect(540,24+lift,60,8,'#a5b6c2');
 s+=text('C · 6001 × 2',512,Y(-60),colors.C,12)+text('Papier z28…32',498,Y(43+lift),colors.C,11);
 s+=line({x:710,y:-35},{x:710,y:295},'#58748d',1,'4 4')+text('P · GEMEENSCHAPPELIJKE PENAS',730,-30,'#62d7dc',11);
 s+=rect(811,88,8,94,'#b9c8d5')+rect(785,84,60,20,colors.A)+rect(785,116+lift,60,20,colors.B);
 for(const z of [84,116+lift])s+=rect(804,z,22,7,'#edf3f7');
 s+=rect(820,60,18,50,'#435d72')+rect(827,38,5,32,'#e0dacb');
 s+=text('2 × 608, losse buitenringen',730,Y(-15),'#b3cada',11)+text('Pen schuift in Z / veer 2 N',730,Y(-35),'#b3cada',11)+text('32 mm armvlakafstand',730,Y(-55),'#b3cada',11);
 if(exploded)s+=text('SEMI-EXPLODED: B + plateau omhoog; geen bedrijfsstand',15,345,'#f4c367',12);
 else s+=text('Riemen z−12 · motoren onder de draagplaat · doorsnede schematisch in X',15,345,'#8faabd',11);
 return s+'</svg>';
}
class PaperRenderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cache=document.createElement('canvas');this.cache.width=840;this.cache.height=594;this.cacheContext=this.cache.getContext('2d');this.lastTrace=null;this.count=0;}
 render(sim) {
  const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),ctx=this.ctx;
  if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
  if(this.lastTrace!==sim.trace||sim.trace.length<this.count){this.cacheContext.clearRect(0,0,840,594);this.count=0;this.lastTrace=sim.trace;}
  const cc=this.cacheContext;cc.setTransform(2,0,0,2,0,0);cc.strokeStyle='#233b50';cc.lineWidth=.55;cc.beginPath();
  if(this.count>0){const p=sim.trace[this.count-1];cc.moveTo(p.x,p.y);}
  for(let i=this.count;i<sim.trace.length;i++){const p=sim.trace[i];if(p.break||i===0)cc.moveTo(p.x,p.y);else cc.lineTo(p.x,p.y);}
  cc.stroke();this.count=sim.trace.length;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  const scale=Math.min((rect.width-32)/420,(rect.height-32)/297),ox=(rect.width-420*scale)/2,oy=(rect.height-297*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.fillStyle='#f4f0e7';ctx.fillRect(0,0,420,297);ctx.drawImage(this.cache,0,0,420,297);ctx.strokeStyle='#b58c42';ctx.lineWidth=1/scale;ctx.setLineDash([4,4]);ctx.strokeRect(20,20,380,257);ctx.setLineDash([]);
  if(sim.penLocal&&sim.insidePaper){ctx.beginPath();ctx.arc(sim.penLocal.x,sim.penLocal.y,3/scale,0,TAU);ctx.fillStyle=sim.penDown?'#d94e64':'#44788c';ctx.fill();}
  ctx.restore();
 }
}
window.MotioRenderers={mechanismSVG,sectionSVG,PaperRenderer,colors};
})();
