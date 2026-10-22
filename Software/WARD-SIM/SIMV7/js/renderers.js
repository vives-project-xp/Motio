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
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" role="img"><title>SIMV7 · drie directe aandrijvingen</title>';
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
  s+='<g '+(hidden?'opacity=".45"':'')+'><g data-bom="MOTOR" tabindex="0" role="button" aria-label="Motor '+key+'"><rect x="'+n(m.x-mw/2)+'" y="'+n(m.y-mw/2)+'" width="'+mw+'" height="'+mw+'" fill="'+(hidden?'none':'#263443')+'" stroke="'+color+'" '+(hidden?'stroke-dasharray="3 4"':'')+'/>';
  for(const x of [-hole,hole])for(const y of [-hole,hole])s+=circle({x:m.x+x,y:m.y+y},1.5,hidden?'none':'#0d1621',color,.5);
  s+=text('M-'+key,m.x-mw/2,m.y-mw/2-9,color,12)+'</g>';
  s+='<g data-bom="HUB" tabindex="0" role="button" aria-label="Naaf '+key+'">'+circle(o,d.hub.radius,'none',color,.7)+'</g></g>';
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
  s+=text('BOX '+b.width+' × '+b.height+' × '+d.box.height+' mm · plaat '+b.thickness+' mm MDF · plateau Ø'+2*paper.radius,b.x+10,b.y+b.height+26,'#b5c7d7',10);
  s+=text('Papier Ø'+2*paper.radius+' · tekenzone Ø'+2*paper.safeRadius+' · direct 1:1 · microsteps 1/'+d.motorStepsPerFullStep,b.x+10,b.y+b.height+45,'#b5c7d7',10);
 }
 return s+'</svg>';
}
// Real axial section: holes subtract material in the actual cut plane.
function sectionBody(b,focus){
 const offset=b.x-focus.x,w=b.w||2*b.r,h=b.h,lo=-b.z-h/2;
 if(b.shape==='beam'||b.axis==='x')return '';
 const rect=(x,y,w,h)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>';
 const mask='cut-'+b.id;
 let holes=b.inner?rect(offset-b.inner,lo-.01,2*b.inner,h+.02):'';
 for(const c of b.holes||[]){
  if(c.axis==='x')continue;
  const dy=focus.y-b.y-(c.y||0);if(Math.abs(dy)>=c.r)continue;
  const dx=Math.sqrt(c.r*c.r-dy*dy),z=b.z+(c.z||0),H=c.h||h+2;
  holes+=rect(offset+(c.x||0)-dx,-z-H/2,2*dx,H);
 }
 const color=b.bom==='BASE'||b.bom==='PL'?'#c7ac7e':b.bom==='MOTOR'?'#657a8c':b.bom==='HUB'?'#f4c367':b.bom==='REINF'?'#bac9d4':b.group==='pen'?'#77b4c0':'#c9d6df';
 return '<defs><mask id="'+mask+'" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000"><g fill="white">'+rect(offset-w/2,lo,w,h)+'</g><g fill="black">'+holes+'</g></mask></defs><g fill="'+color+'" stroke="#40576a" stroke-width=".35" mask="url(#'+mask+')">'+rect(offset-w/2,lo,w,h)+'</g>';
}
function detailSVG(sim,kind){
 const g=sim.geometry,p=sim.pose,pen=kind==='pen';
 if(pen&&!p.valid)return '<p>Ongeldige ketensluiting</p>';
 const focus=pen?p.pen:g.paper;
 const parts=window.MotioGeometry.bodies(g,p).filter(b=>pen?b.group==='pen'||b.id.startsWith('endP')||b.id.startsWith('jointP')||b.id.startsWith('armShoulderP'):['BASE','stiffenerC','motorC','motorShaftC','motorBossC','hubC','hubPilotC','platter'].includes(b.id));
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(pen?'-40 -130 210 125':'-120 -55 300 110')+'"><title>SIMV7 · '+(pen?'bovenliggende penklem':'motor C direct onder bovenplaat')+'</title>';
 for(const b of parts)svg+=sectionBody(b.id==='BASE'?{...b,x:focus.x,w:235,holes:b.holes.map(h=>({...h,x:h.x+b.x-focus.x}))}:b,focus);
 svg+=line({x:0,y:pen?-125:-50},{x:0,y:pen?-10:45},'#62d7dc',.35,'2 2');
 const labels=pen?[[g.pen.clampZ,'M4 handklem boven armen'],[g.pen.clampZ-9,'M3-klem om gladde PLA-penas'],[g.B.rodZ,'B · 6804 + bovenste borging'],[(g.A.rodZ+g.B.rodZ)/2,'Holle PLA Ø19,9/13 + binnenringbus'],[g.A.rodZ,'A · 6804 + onderste borging']]:[[32,'Plateau Ø210 × 6; onderzijde z=20'],[22,'Pololu Ø19/5 × 5; 4× M3×10'],[12,'As 24 ±1 vanaf motorflens'],[5.5,'6 mm MDF + twee gelijmde ribben'],[-7,'Flens rechtstreeks tegen z=0'],[-27,'SY42STH38-1684A · 42,3 × 38']];
 for(const [z,label] of labels)svg+=text(label,pen?28:31,-z,pen?'#c2d6e4':'#b5c7d7',pen?4:4.2);
 return svg+'</svg>';
}
function mountingSVG(sim){
 const g=sim.geometry;
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="170mm" viewBox="0 0 390 225"><rect width="390" height="225" fill="#fff"/><g font-family="Arial" fill="#172d3c"><text x="12" y="15" font-size="9">MOTIO SIMV7 · motorflens direct onder MDF · maten mm</text>';
 for(const [i,key] of ['A','B','C'].entries()){
  const x=60+i*125,d=g[key],z0=115;
  svg+='<g transform="translate('+x+' '+z0+')">';
  for(const b of window.MotioGeometry.bodies(g,sim.pose).filter(b=>['motor'+key,'motorBoss'+key,'motorShaft'+key,'stiffener'+key,'hub'+key,'hubPilot'+key].includes(b.id)))svg+=sectionBody(b,d.pivot);
  svg+='<path d="M-42 0 H-11.25 V-6 H-42 Z M11.25 0 H42 V-6 H11.25 Z" fill="#d4bb91" stroke="#172d3c" stroke-width=".4"/>';
  for(const left of [-17,2.8])svg+='<rect x="'+left+'" y="'+(-(key==='C'?g.paper.z+g.paper.thickness/2:d.crankZ+g.crankHeight/2))+'" width="14.2" height="'+(key==='C'?g.paper.thickness:g.crankHeight)+'" fill="#a4bbcb" stroke="#172d3c" stroke-width=".4"/>';
  if(key==='B')svg+='<rect x="-14" y="-27" width="11.2" height="4" fill="#a4bbcb"/><rect x="2.8" y="-27" width="11.2" height="4" fill="#a4bbcb"/>';
  svg+='<g font-size="5"><text x="-42" y="-63">'+key+' · naaf '+d.hubBottom+'…'+d.hubTop+'</text><text x="-42" y="-53">'+(key==='C'?'Plateau': 'Kruk')+' onderkant z='+d.hubTop+'</text><text x="-42" y="-43">Armlaag '+(d.rodZ??'—')+'</text><text x="-42" y="52">Montagevlak z=0</text></g></g>';
 }
 svg+='<g font-size="5.4"><text x="12" y="184">M3×10 − ring 0,8 − MDF 6 → 3,2 mm draad (motor max. 4,5).</text><text x="12" y="195">Motoras min. 23; alle Pololu-naven volledig 5 mm op de as. Papier boven z=26.</text><text x="12" y="206">PLA-krukken; M8-scharnieren; PLA-penas zonder draad. Fysieke passing en warmte testen.</text></g></g></svg>';
 return svg;
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
window.MotioRenderers={mechanismSVG,sectionSVG,detailSVG,mountingSVG,PaperRenderer,colors};
})();
