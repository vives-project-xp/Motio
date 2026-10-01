(function () {
'use strict';
const {DESIGN,pitchRadius}=window.MotioMechanics;
const {colors}=window.MotioRenderers;
const {TAU}=window.MotioMath;
class SpatialRenderer {
 constructor(canvas,onSelect) {
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onSelect=onSelect;this.resetCamera();this.hits=[];this.initDepthRenderer();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pan:e.shiftKey||e.button===2};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
   if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
   if(this.drag.pan){this.panX+=dx;this.panY+=dy;}else{this.yaw+=dx*.008;this.pitch=Math.max(-.75,Math.min(Math.PI/2, this.pitch+dy*.006));}
   this.drag.x=e.clientX;this.drag.y=e.clientY;
  });
  canvas.addEventListener('pointerup',e=>{
   if(this.drag&&Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)<5){
    const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const hit=this.hits.filter(h=>Math.hypot(h.x-x,h.y-y)<h.radius).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    if(hit)this.onSelect(hit.label);else this.onSelect('Klik dichter bij een motor, as, pulley, arm, lager of penhouder.');
   }this.drag=null;
  });
  canvas.addEventListener('pointercancel',()=>this.drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.4,Math.min(3,this.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
  canvas.addEventListener('keydown',e=>{
   const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'];if(!keys.includes(e.key))return;e.preventDefault();
   if(e.key==='ArrowLeft')this.yaw-=.1;if(e.key==='ArrowRight')this.yaw+=.1;
   if(e.key==='ArrowUp')this.pitch=Math.min(Math.PI/2,this.pitch+.1);if(e.key==='ArrowDown')this.pitch=Math.max(-.75,this.pitch-.1);
   if(e.key==='+'||e.key==='=')this.zoom=Math.min(3,this.zoom*1.1);if(e.key==='-')this.zoom=Math.max(.4,this.zoom/1.1);if(e.key==='0')this.resetCamera();
  });
 }
 resetCamera(mode='iso'){this.yaw=mode==='side'?0:mode==='top'?0:-.65;this.pitch=mode==='top'?Math.PI/2:mode==='side'?.12:.70;this.zoom=1;this.panX=0;this.panY=0;}
 initDepthRenderer() {
  this.depthCanvas=document.createElement('canvas');
  try {
   const gl=this.depthCanvas.getContext('webgl',{antialias:true,alpha:false});if(!gl)return;
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader unavailable');return s;};
   const program=gl.createProgram();
   gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 position; attribute vec4 color; varying vec4 vertexColor; void main(){gl_Position=vec4(position,1.0);vertexColor=color;}'));
   gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec4 vertexColor; void main(){gl_FragColor=vertexColor;}'));
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
   this.gl=gl;this.program=program;this.buffer=gl.createBuffer();this.positionLocation=gl.getAttribLocation(program,'position');this.colorLocation=gl.getAttribLocation(program,'color');
  }catch {this.gl=null;}
 }
 drawDepth(faces,width,height) {
  const gl=this.gl;if(!gl)return false;
  if(this.depthCanvas.width!==this.canvas.width||this.depthCanvas.height!==this.canvas.height){this.depthCanvas.width=this.canvas.width;this.depthCanvas.height=this.canvas.height;}
  gl.viewport(0,0,this.depthCanvas.width,this.depthCanvas.height);gl.clearColor(13/255,22/255,33/255,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.useProgram(this.program);
  const opaque=[],transparent=[];
  for(const f of faces) {
   const hex=f.color.slice(1),alpha=hex.length===8?parseInt(hex.slice(6,8),16)/255:1,shade=.5+.5*f.shade;
   const rgba=[parseInt(hex.slice(0,2),16)/255*shade,parseInt(hex.slice(2,4),16)/255*shade,parseInt(hex.slice(4,6),16)/255*shade,alpha],array=alpha<1?transparent:opaque;
   for(let i=1;i<f.points.length-1;i++)for(const p of [f.points[0],f.points[i],f.points[i+1]])array.push(p.x/width*2-1,1-p.y/height*2,-p.depth/2000,...rgba);
  }
  const draw=vertices=>{
   gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(this.positionLocation);gl.vertexAttribPointer(this.positionLocation,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(this.colorLocation);gl.vertexAttribPointer(this.colorLocation,4,gl.FLOAT,false,28,12);gl.drawArrays(gl.TRIANGLES,0,vertices.length/7);
  };
  gl.depthMask(true);gl.disable(gl.BLEND);draw(opaque);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);draw(transparent);gl.depthMask(true);
  this.ctx.drawImage(this.depthCanvas,0,0,width,height);return true;
 }
 render(sim,exploded=false) {
  const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),ctx=this.ctx;
  if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.fillStyle='#0d1621';ctx.fillRect(0,0,rect.width,rect.height);
  const scale=Math.min(rect.width/970,rect.height/730)*this.zoom,cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
  const project=p=>{
   const x=p.x-305,y=p.y-75,z=p.z-30,rx=x*cy-y*sy,ry=x*sy+y*cy;
   return {x:rect.width/2+this.panX+rx*scale,y:rect.height*.56+this.panY+(ry*sp-z*cp)*scale,depth:ry*cp+z*sp};
  };
  const faces=[],labels=[];this.hits=[];
  const face=(points,color,shade=1)=>{const pp=points.map(project);faces.push({points:pp,depth:pp.reduce((s,p)=>s+p.depth,0)/pp.length,color,shade});};
  const register=(p,label,radius=22,visibleLabel='')=>{const pp=project(p);this.hits.push({...pp,label,radius:Math.max(12,radius*scale)});if(visibleLabel)labels.push({...pp,text:visibleLabel});};
  const box=(x,y,z,w,l,h,color,label)=>{
   const p=[{x:x-w/2,y:y-l/2,z:z-h/2},{x:x+w/2,y:y-l/2,z:z-h/2},{x:x+w/2,y:y+l/2,z:z-h/2},{x:x-w/2,y:y+l/2,z:z-h/2}, {x:x-w/2,y:y-l/2,z:z+h/2},{x:x+w/2,y:y-l/2,z:z+h/2},{x:x+w/2,y:y+l/2,z:z+h/2},{x:x-w/2,y:y+l/2,z:z+h/2}];
   for(const [indices,shade] of [[[0,1,2,3],.55],[[0,1,5,4],.72],[[1,2,6,5],.82],[[2,3,7,6],.64],[[3,0,4,7],.75],[[4,5,6,7],1]])face(indices.map(i=>p[i]),color,shade);
   if(label)register({x,y,z:z+h/2},label,Math.max(w,l)/2);
  };
  const cylinder=(x,y,z,r,h,color,label)=>{
   const bottom=[],top=[];
   const segments=r>100?72:18;
   for(let i=0;i<segments;i++){const a=i*TAU/segments;bottom.push({x:x+r*Math.cos(a),y:y+r*Math.sin(a),z:z-h/2});top.push({x:x+r*Math.cos(a),y:y+r*Math.sin(a),z:z+h/2});}
   face(bottom,color,.55);face(top,color,1);
   for(let i=0;i<segments;i++)face([bottom[i],bottom[(i+1)%segments],top[(i+1)%segments],top[i]],color,.65+.15*Math.cos(i*TAU/segments));
   if(label)register({x,y,z:z+h/2},label,r+10);
  };
  const beam=(a,b,z,w,h,color,label)=>{
   const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length*w/2,ny=dx/length*w/2;
   const p=[{x:a.x+nx,y:a.y+ny,z:z-h/2},{x:b.x+nx,y:b.y+ny,z:z-h/2},{x:b.x-nx,y:b.y-ny,z:z-h/2},{x:a.x-nx,y:a.y-ny,z:z-h/2}];
   const top=p.map(v=>({...v,z:z+h/2}));face(p,color,.55);face(top,color,1);
   for(let i=0;i<4;i++)face([p[i],p[(i+1)%4],top[(i+1)%4],top[i]],color,.75);
   if(label)register({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:z+h/2},label,30);
  };
  const base=DESIGN.base;
  for(const y of [base.y+10,base.y+base.height-10])box(base.x+base.width/2,y,-18,base.width,20,20,'#344c61');
  for(const x of [base.x+10,base.x+base.width-10,DESIGN.frameBraceX])box(x,base.y+base.height/2,-18,20,base.height,20,'#344c61');
  for(const x of [base.x+10,base.x+base.width-10])for(const y of [base.y+10,base.y+base.height-10])box(x,y,-55,20,20,70,'#344c61');
  // Base intentionally transparent in the projection: under-deck belt drives stay inspectable.
  box(base.x+base.width/2,base.y+base.height/2,4,base.width,base.height,8,'#33465a55');
  for(const key of ['A','B','C']) {
   const d=DESIGN[key],m=d.motor,o=d.pivot,color=colors[key];
   box(m.x,m.y,-54,42,42,48,'#3a4a5b','Motor '+key+' · NEMA17, frontvlak z−30');
   // Open mounting plate around the Ø22 motor pilot; risers stay away from belt tangents.
   for(const sign of [-1,1]) {
    box(m.x+sign*19.5,m.y,-27.5,15,54,5,'#7895ac','Motorbeugel '+key+' · 5 mm plaat, centrale doorvoer');
    box(m.x,m.y+sign*19.5,-27.5,24,15,5,'#7895ac');
    if(key==='B')box(m.x+sign*27,m.y,-12.5,5,54,25,'#7895ac');
    else box(m.x,m.y+sign*27,-12.5,54,5,25,'#7895ac');
   }
   cylinder(m.x,m.y,-18,2.5,24,'#c7d6e0','Motoras '+key+' · Ø5 × 24, z−30…−6');
   cylinder(m.x,m.y,-12,pitchRadius(20),9,color,'20T motorpulley '+key+' · klemnaaf Ø5');
   cylinder(o.x,o.y,-12,pitchRadius(d.outputTeeth),9,color,d.outputTeeth+'T werkaspulley '+key+' · '+d.ratio+':1 reductie');
   const small=pitchRadius(20),large=pitchRadius(d.outputTeeth),phi=Math.atan2(o.y-m.y,o.x-m.x),alpha=Math.asin((large-small)/Math.hypot(o.x-m.x,o.y-m.y));
   for(const sign of [-1,1]){const theta=phi+sign*(Math.PI/2+alpha);beam({x:m.x+small*Math.cos(theta),y:m.y+small*Math.sin(theta)},{x:o.x+large*Math.cos(theta),y:o.y+large*Math.sin(theta)},-12,1.5,9,'#8fa9bb','Tandriem '+key+' · HTD 3M, 9 mm breed');}
   for(const z of [-17,-7]){cylinder(m.x,m.y,z,pitchRadius(20)+1,1,color);cylinder(o.x,o.y,z,pitchRadius(d.outputTeeth)+1,1,color);}
   const zs=d.bearings,houseBottom=key==='C'?zs[0]-4:8,houseTop=zs[1]+4;
   cylinder(o.x,o.y,(houseBottom+houseTop)/2,key==='C'?21:22,houseTop-houseBottom,'#4b6377','Vast lagerhuis '+key+' · doorlopend tot draagplaat, één zwevende zitting');
   if(key!=='C')box(o.x,o.y,10.5,60,60,5,'#4b6377','Geboute montagevoet lagersteun '+key);
   for(const z of zs)cylinder(o.x,o.y,z,key==='C'?14:11,key==='C'?8:7,'#d6e1e7','Lager '+key+' · '+(key==='C'?'6001 12×28×8':'608 8×22×7'));
   const top=key==='C'?30:d.crankZ+4,bottom=key==='C'?-65:-30;
   cylinder(o.x,o.y,(top+bottom)/2,key==='C'?6:4,top-bottom,'#b2c4d3','Gelagerde werkas '+key+' · Ø'+(key==='C'?'12':'8')+' mm');
   cylinder(o.x,o.y,zs[0]-7,key==='C'?9:7,5,'#a8bcca','Axiaal lokaliserende askraag '+key+' · lagerafstand geborgd');
   register({x:m.x,y:m.y,z:4},'Motor '+key+' · '+(key==='C'?'papier':'kruk '+key),25,'M-'+key);
  }
  const plateLift=exploded?30:0;
  cylinder(210,148.5,24+plateLift,30,8,'#b5c5d2','Spindelflens · Ø60, gebout aan plateau');
  cylinder(210,148.5,30+plateLift,263,4,'#8a9ba9','Papierplateau · Ø526 × 4 mm, draait met C');
  const paperCorners=[[-210,-148.5],[210,-148.5],[210,148.5],[-210,148.5]].map(([x,y])=>({x:210+x*Math.cos(sim.q.C)-y*Math.sin(sim.q.C),y:148.5+x*Math.sin(sim.q.C)+y*Math.cos(sim.q.C),z:32.2+plateLift}));
  face(paperCorners,'#f4f0e7',1);
  for(const key of ['A','B']) {
   const d=DESIGN[key],e=key==='A'?sim.pose.a:sim.pose.b,color=colors[key],lift=exploded?(key==='A'?50:85):0;
   beam(d.pivot,e,d.crankZ+lift,16,8,color,'Kruk '+key+' · '+sim.config['radius'+key]+' mm, star aan uitgaande as');
   cylinder(d.pivot.x,d.pivot.y,d.crankZ+lift,12,8,color,'Klemnaaf kruk '+key+' · torsiestijf aan de as');
   cylinder(e.x,e.y,(d.crankZ-4+d.rodZ+16)/2+lift,4,d.rodZ-d.crankZ+20,'#b8c9d6','Elleboog '+key+' · Ø8 schouderpost, volledige vrije omloop');
   // A cantilevered shoulder post has no fork wall in the rod's 360° swept volume.
   const lowerLength=d.rodZ-3.5-(d.crankZ+4);
   cylinder(e.x,e.y,d.crankZ+4+lowerLength/2+lift,5,lowerLength,'#b8c9d6','Binnenring-afstandsbus '+key+' · klemkracht op de binnenring');
   cylinder(e.x,e.y,d.rodZ+7.75+lift,5,8.5,'#b8c9d6');
   cylinder(e.x,e.y,d.rodZ+13+lift,7,2,'#b8c9d6');
   cylinder(e.x,e.y,d.rodZ+15+lift,6,2,'#b8c9d6','Geborgde schouderpost '+key+' · buitenring blijft vrij');
   if(sim.pose.valid)beam(e,sim.pose.pen,d.rodZ+lift,20,20,color,'Arm '+key+' · koker 20×20×1,5; lengte '+sim.config['length'+key]+' mm');
   cylinder(e.x,e.y,d.rodZ+lift,14,20,color,'Metalen armeindstuk '+key+' · Ø22 lagerzitting');
   cylinder(e.x,e.y,d.rodZ+lift,11,7,'#dce5ec','Vrij 608-scharnier E_'+key);
   if(sim.pose.valid){cylinder(sim.pose.pen.x,sim.pose.pen.y,d.rodZ+lift,14,20,color,'Penlagerhuis '+key+' · vrij draaibaar');cylinder(sim.pose.pen.x,sim.pose.pen.y,d.rodZ+lift,11,7,'#dce5ec','Onafhankelijk penlager '+key+' · geen starre koppeling aan de andere arm');}
  }
  if(sim.pose.valid) {
   const p=sim.pose.pen;
   cylinder(p.x,p.y,88,4,94,'#c6d6e1','Gemeenschappelijke penas P · twee losse lagers, coaxiaal XY');
   cylinder(p.x,p.y,58,9,38,'#526d85','Veerbelaste penbus · circa 2 N, vrije Z-schuif');
   cylinder(p.x,p.y,38.2+(sim.penDown?0:5),2,12,'#f4c367','Pen · tip op papier z32,2 bij pen down');
   register({x:p.x,y:p.y,z:134},'P · gemeenschappelijke penhouder',18,'P');
  }
  faces.sort((a,b)=>a.depth-b.depth);
  if(!this.drawDepth(faces,rect.width,rect.height)) {
   ctx.font='14px system-ui,sans-serif';ctx.fillStyle='#c5dceb';ctx.fillText('3D vraagt WebGL in deze browser.',20,60);ctx.fillText('Open de 2D-tekening en doorsnede voor de mechanische opbouw.',20,88);return;
  }
  for(const label of labels){ctx.font='bold 11px Consolas,monospace';ctx.fillStyle='#0a1421';ctx.fillRect(label.x-18,label.y-24,38,17);ctx.fillStyle='#d7e8f5';ctx.fillText(label.text,label.x-14,label.y-12);}
  ctx.font='11px Consolas,monospace';ctx.fillStyle='#97b2c8';ctx.fillText(exploded?'SEMI-EXPLODED · onderdelen verticaal ontkoppeld':'MAATGEBASEERD 3D · montage zonder behuizing',16,22);
  ctx.fillText('Transparante draagplaat toont aandrijvingen onder de tafel',16,rect.height-16);
 }
}
window.MotioSpatial={SpatialRenderer};
})();
