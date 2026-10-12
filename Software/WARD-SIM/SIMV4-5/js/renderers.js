(function () {
'use strict';

const {TAU}=window.MotioMath;
const colors={A:'#b9a0ff',B:'#64d8a1',C:'#f4c367'};
const n=v=>Number(v).toFixed(2);
const line=(a,b,color,width=2,dash='')=>`<line x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const circle=(p,r,fill,stroke='#a9becd',w=1.5)=>`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const text=(str,x,y,color='#b5c7d7',size=11)=>`<text x="${n(x)}" y="${n(y)}" fill="${color}" font-size="${size}" font-family="Consolas,monospace">${str}</text>`;
function tracePath(trace,limit=12000) {
 let s='';
 for(let i=Math.max(0,trace.length-limit);i<trace.length;i++){const p=trace[i];s+=(p.break||i===Math.max(0,trace.length-limit)?'M':'L')+n(p.x)+','+n(p.y);}
 return s;
}
function mechanismSVG(sim,technical=false,mode='assembly') {
 const d=sim.geometry,p=sim.pose,c=sim.config,b=d.base,paper=d.paper;
 const vb=[b.x-25,b.y-25,b.width+50,b.height+90];
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" role="img"><title>SIMV4-5 · drie directe aandrijvingen</title>';
 s+='<rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" fill="#b89b6b" stroke="#725a39"/>';
 s+='<rect x="'+(b.x+d.box.wall)+'" y="'+(b.y+d.box.wall)+'" width="'+(b.width-2*d.box.wall)+'" height="'+(b.height-2*d.box.wall)+'" fill="none" stroke="#d8be95" stroke-width=".7"/>';
 const exposed=mode==='drive'||mode==='bearing';
 if(!exposed) {
  s+=circle(paper,paper.radius,'#334650cc','#899eae',2);
  s+='<g transform="translate('+paper.x+' '+paper.y+') rotate('+n(sim.q.C*180/Math.PI)+')">'+circle({x:0,y:0},paper.radius,'#f4f0e7','#a7bccb',.7)+'<circle r="'+paper.safeRadius+'" fill="none" stroke="#b5a284" stroke-width=".7" stroke-dasharray="3 4"/>';
  s+=circle({x:paper.radius-paper.margin/2,y:0},1.5,'#b5a284','none',0);
  if(!technical)s+='<path d="'+tracePath(sim.trace)+'" fill="none" stroke="#263846" stroke-width=".8"/>';
  s+='</g>';
 }
 if(sim.showWorkspace&&sim.workspace) {
  s+='<g opacity=".26" pointer-events="none">';
  for(const cell of sim.workspace.cells){const color={SAFE:'#64d8a1',CAUTION:'#f4c367',CRITICAL:'#ed6778',UNREACHABLE:'#b44455'}[cell.state];s+='<rect x="'+(cell.x-sim.workspace.step/2)+'" y="'+(cell.y-sim.workspace.step/2)+'" width="'+sim.workspace.step+'" height="'+sim.workspace.step+'" fill="'+color+'"/>';}
  s+='</g>';
 }
 for(const key of ['A','B','C']) {
  const a=d[key],m=a.motor,o=a.pivot,color=colors[key];
  const mw=d.motor.width,hole=d.motor.mountingPitch/2,hidden=!exposed;
  s+='<g '+(hidden?'opacity=".45"':'')+'><g data-bom="M-'+key+'" tabindex="0" role="button" aria-label="Motor '+key+'"><rect x="'+n(m.x-mw/2)+'" y="'+n(m.y-mw/2)+'" width="'+mw+'" height="'+mw+'" fill="'+(hidden?'none':'#263443')+'" stroke="'+color+'" '+(hidden?'stroke-dasharray="3 4"':'')+'/>';
  for(const x of [-hole,hole])for(const y of [-hole,hole])s+=circle({x:m.x+x,y:m.y+y},1.5,hidden?'none':'#0d1621',color,.5);
  s+=text('M-'+key,m.x-mw/2,m.y-mw/2-9,color,12)+'</g>';
  s+='<g data-bom="CP-'+key+'" tabindex="0" role="button" aria-label="Askoppeling '+key+'">'+circle(o,d.coupling.radius,'none',color,.7)+line(o,{x:o.x+d.coupling.radius*Math.cos(sim.q[key]),y:o.y+d.coupling.radius*Math.sin(sim.q[key])},color,1)+'</g></g>';
  if(key!=='C')s+=circle(o,4,'#c6d4de',color);
 }
 if(!exposed)for(const key of ['A','B']) {
  const o=d[key].pivot,e=key==='A'?p.a:p.b,color=colors[key];if(!e)continue;
  s+='<g data-bom="K-'+key+'" tabindex="0" role="button">'+line(o,e,'#071019',d.crankWidth+3)+line(o,e,color,d.crankWidth)+'</g>';
  if(p.valid)s+='<g data-bom="L-'+key+'" tabindex="0" role="button">'+line(e,p.pen,'#071019',d.rodWidth+4)+line(e,p.pen,color,d.rodWidth)+line(e,p.pen,'#e4edf4',1)+'</g>';
  s+=circle(o,4,'#c6d4de')+circle(e,11,'#dce5eb',color,2)+circle(e,4,'#273a49');
 }
 if(p.valid&&!exposed){
  s+='<g data-bom="PEN" tabindex="0" role="button">'+circle(p.pen,d.pen.jointRadius,'#273a49','#d9e6ed',2)+circle(p.pen,d.pen.boreRadius,'#09121b')+circle(p.pen,d.pen.radius,'#f4c367');
  s+=line({x:p.pen.x+d.pen.radius,y:p.pen.y},{x:p.pen.x+29,y:p.pen.y},'#a8cbd2',4)+'<rect x="'+(p.pen.x+26)+'" y="'+(p.pen.y-8)+'" width="6" height="16" fill="#62d7dc"/>'+text('Pen',p.pen.x+22,p.pen.y-23,'#62d7dc',11)+'</g>';
 }
 if(technical){
  s+=text('A '+c.lengthA+' / B '+c.lengthB+' mm h.o.h. · krukken '+c.radiusA+' / '+c.radiusB+' mm',b.x+20,b.y+30,'#62d7dc',12);
  s+=text('BOX '+b.width+' × '+b.height+' × '+d.box.height+' mm · plaat '+b.thickness+' mm · plateau Ø'+2*paper.radius,b.x+10,b.y+b.height+26,'#b5c7d7',10);
  s+=text('Papier Ø'+2*paper.radius+' · tekenzone Ø'+2*paper.safeRadius+' · direct 1:1 · microsteps 1/'+d.motorStepsPerFullStep,b.x+10,b.y+b.height+45,'#b5c7d7',10);
 }
 return s+'</svg>';
}
function detailSVG(sim,kind,exploded=false) {
 const g=sim.geometry,p=sim.pose,pen=kind==='pen';
 if(pen&&!p.valid)return '<p>NOT CALCULATED · ongeldige ketensluiting</p>';
 const focus=pen?p.pen:g.paper,parts=window.MotioGeometry.bodies(g,p).filter(b=>pen?b.group==='pen'||b.id.startsWith('endP')||b.id.startsWith('jointP'):b.id.includes('C')||['platter','flange','BASE'].includes(b.id));
 const minX=pen?-35:-g.paper.radius-15,maxX=pen?162:g.paper.radius+15,minZ=pen?g.paper.z-5:g.motor.z-g.motor.length/2-8,maxZ=pen?Math.max(g.A.rodZ,g.B.rodZ)+45:g.paper.z+40;
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[minX,-maxZ,maxX-minX,maxZ-minZ].join(' ')+'"><title>'+(pen?'P · holle penas en manuele klem':'C · lokaliserende en zwevende lagering')+'</title>';
 for(const b of parts){
  const isBox=b.shape==='box',isBeam=b.shape==='beam';let x=isBox||!isBeam?b.x-focus.x:(b.a.x+b.b.x)/2-focus.x,w=isBox?b.w:isBeam?Math.hypot(b.b.x-b.a.x,b.b.y-b.a.y):2*b.r,z=b.z;
  if(b.id==='BASE'){x=(minX+maxX)/2;w=maxX-minX;}
  if(exploded)z+=b.group==='joint'?15:b.group==='platter'?20:0;
  const color=b.group==='joint'||b.group==='bearing'?'#dde7ed':b.group==='moving'?(b.id.endsWith('A')?colors.A:colors.B):b.id==='pen'?colors.C:b.id==='BASE'?'#344658':b.group==='pen'?'#588fa1':'#8a9fb0';
  // Section through the axis: ring bores are open, never filled with fictitious material.
  if(b.inner){const wall=b.r-b.inner;for(const sign of [-1,1])s+='<rect data-bom="'+b.bom+'" x="'+(x+sign*(b.inner+wall/2)-wall/2)+'" y="'+(-z-b.h/2)+'" width="'+wall+'" height="'+b.h+'" fill="'+color+'" stroke="#263e52" stroke-width=".4"/>';}
  else s+='<rect data-bom="'+b.bom+'" x="'+(x-w/2)+'" y="'+(-z-b.h/2)+'" width="'+w+'" height="'+b.h+'" fill="'+color+'" stroke="#263e52" stroke-width=".4"/>';
 }
 s+=line({x:0,y:-maxZ},{x:0,y:-minZ},'#62d7dc',.4,'2 2');
 if(pen){
  const labels=[[Math.max(g.A.rodZ,g.B.rodZ)+30,'Pen Ø'+2*g.pen.radius],[Math.max(g.A.rodZ,g.B.rodZ)+8,'Borgmoer / binnenring'],[g.B.rodZ,'B · onafhankelijk 6804'],[(g.A.rodZ+g.B.rodZ)/2,'Afstandsbus + holle as'],[g.A.rodZ,'A · onafhankelijk 6804'],[g.pen.clampZ+6,'Manuele houder + splitbus'],[g.pen.clampZ-5,'M4 handknop + zacht pad']];
  for(const [z,label] of labels){s+=line({x:22,y:-z},{x:45,y:-z},'#8ca7b9',.5)+text(label,48,-z+1.8,'#c2d6e4',4.5);}
 }else{
  s+=text('Papier / plateau Ø'+2*g.paper.radius+' / flens Ø60',-g.paper.radius+10,-g.paper.z-17,'#f4c367',9);
  s+=text('Boven: 6001 axiaal vast',35,-g.C.bearings[1]-8,'#c2d6e4',8)+text('Onder: buitenring schuivend',35,-g.C.bearings[0]+8,'#c2d6e4',8);
  s+=text('Koppeling Ø5 → Ø12 · direct 1:1',32,-g.coupling.z+3,'#f4c367',7)+text('Motor C · eigen gelagerde as',-g.paper.radius+10,-g.motor.z+30,'#c2d6e4',8);
 }
 if(!pen)s+=line({x:-g.paper.radius,y:-g.paper.z-g.paper.thickness/2-.2},{x:g.paper.radius,y:-g.paper.z-g.paper.thickness/2-.2},'#f4f0e7',1);
 return s+'</svg>';
}
function sectionSVG(sim,exploded=false){return detailSVG(sim,'spindle',exploded);}
class PaperRenderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cache=document.createElement('canvas');this.cacheContext=this.cache.getContext('2d');this.lastTrace=null;this.count=0;}
 render(sim) {
  const paper=sim.geometry.paper;const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),ctx=this.ctx;
  if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
  if(this.lastTrace!==sim.trace||sim.trace.length<this.count||this.cache.width!==paper.width*2||this.cache.height!==paper.height*2){this.cache.width=paper.width*2;this.cache.height=paper.height*2;this.cacheContext.clearRect(0,0,this.cache.width,this.cache.height);this.count=0;this.lastTrace=sim.trace;}
  const cc=this.cacheContext;cc.setTransform(2,0,0,2,0,0);cc.strokeStyle='#233b50';cc.lineWidth=.55;cc.beginPath();
  if(this.count>0){const p=sim.trace[this.count-1];cc.moveTo(p.x+paper.width/2,p.y+paper.height/2);}
  for(let i=this.count;i<sim.trace.length;i++){const p=sim.trace[i];if(p.break||i===0)cc.moveTo(p.x+paper.width/2,p.y+paper.height/2);else cc.lineTo(p.x+paper.width/2,p.y+paper.height/2);}
  cc.stroke();this.count=sim.trace.length;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  const scale=Math.min((rect.width-32)/paper.width,(rect.height-32)/paper.height),ox=(rect.width-paper.width*scale)/2,oy=(rect.height-paper.height*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.beginPath();ctx.arc(paper.radius,paper.radius,paper.radius,0,TAU);ctx.fillStyle='#f4f0e7';ctx.fill();ctx.clip();
  if(sim.showPreview&&sim.patternPreview.length){ctx.beginPath();for(const [i,p] of sim.patternPreview.entries()){if(i===0)ctx.moveTo(p.x+paper.radius,p.y+paper.radius);else ctx.lineTo(p.x+paper.radius,p.y+paper.radius);}ctx.strokeStyle='#c8b48e';ctx.lineWidth=1/scale;ctx.stroke();}
  ctx.drawImage(this.cache,0,0,paper.width,paper.height);ctx.strokeStyle='#b5a284';ctx.lineWidth=1/scale;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(paper.radius,paper.radius,paper.safeRadius,0,TAU);ctx.stroke();ctx.setLineDash([]);
  if(sim.penLocal&&sim.insidePaper){ctx.beginPath();ctx.arc(sim.penLocal.x+paper.width/2,sim.penLocal.y+paper.height/2,3/scale,0,TAU);ctx.fillStyle='#44788c';ctx.fill();}
  ctx.restore();
 }
}
window.MotioRenderers={mechanismSVG,sectionSVG,detailSVG,PaperRenderer,colors};
})();
