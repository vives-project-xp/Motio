(function () {
'use strict';

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
    const contains=points=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;};
    const visible=(this.pickFaces||[]).filter(f=>f.part&&f.part.id!=='BASE'&&contains(f.points)).sort((a,b)=>b.depth-a.depth)[0];
    const hit=visible?{part:visible.part}:this.hits.filter(h=>Math.hypot(h.x-x,h.y-y)<Math.min(h.radius,24)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    if(hit)this.onSelect(hit.part || hit.label);else this.onSelect('Klik dichter bij een motor, as, pulley, arm, lager of penhouder.');
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
 render(sim,exploded=false,mode='assembly') {
  const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),ctx=this.ctx;
  if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.fillStyle='#0d1621';ctx.fillRect(0,0,rect.width,rect.height);
  const DESIGN=sim.geometry,detail=mode==='pen',focus=detail&&sim.pose.valid?sim.pose.pen:{x:DESIGN.base.x+DESIGN.base.width/2,y:DESIGN.base.y+DESIGN.base.height/2};
  const scale=Math.min(rect.width/(detail?190:DESIGN.base.width+180),rect.height/(detail?210:DESIGN.base.height+100))*this.zoom,cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
  const project=p=>{
   const x=p.x-focus.x,y=p.y-focus.y,z=p.z-(detail?85:30),rx=x*cy-y*sy,ry=x*sy+y*cy;
   return {x:rect.width/2+this.panX+rx*scale,y:rect.height*.56+this.panY+(ry*sp-z*cp)*scale,depth:ry*cp+z*sp};
  };
  const faces=[],labels=[];this.hits=[];let currentPart=null;
  const face=(points,color,shade=1)=>{
   if(mode==='section'||mode==='pen'){
    const cut=mode==='pen'?focus.y:DESIGN.paper.y,clipped=[];
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ina=a.y<=cut,inb=b.y<=cut;if(ina)clipped.push(a);if(ina!==inb){const t=(cut-a.y)/(b.y-a.y);clipped.push({x:a.x+t*(b.x-a.x),y:cut,z:a.z+t*(b.z-a.z)});}}
    points=clipped;if(points.length<3)return;
   }
   const pp=points.map(project);faces.push({points:pp,depth:pp.reduce((s,p)=>s+p.depth,0)/pp.length,color,shade,part:currentPart});};
  const register=(p,label,radius=22,visibleLabel='')=>{const pp=project(p);this.hits.push({...pp,label,part:currentPart,radius:Math.max(12,radius*scale)});if(visibleLabel)labels.push({...pp,text:visibleLabel});};
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
  const ring=(b,color)=>{
   const count=40;
   for(let i=0;i<count;i++){
    const a=i*TAU/count,t=(i+1)*TAU/count,pt=(angle,r,z)=>({x:b.x+r*Math.cos(angle),y:b.y+r*Math.sin(angle),z});
    const lo=b.z-b.h/2,hi=b.z+b.h/2;
    face([pt(a,b.r,hi),pt(t,b.r,hi),pt(t,b.inner,hi),pt(a,b.inner,hi)],color,1);
    face([pt(a,b.r,lo),pt(t,b.r,lo),pt(t,b.inner,lo),pt(a,b.inner,lo)],color,.6);
    face([pt(a,b.r,lo),pt(t,b.r,lo),pt(t,b.r,hi),pt(a,b.r,hi)],color,.8);
    face([pt(a,b.inner,lo),pt(t,b.inner,lo),pt(t,b.inner,hi),pt(a,b.inner,hi)],color,.55);
   }
   register({x:b.x,y:b.y,z:b.z+b.h/2},b.id,b.r);
  };
  const catalog=window.MotioBOM.create(DESIGN);
  const parts=window.MotioGeometry.bodies(DESIGN,sim.pose);
  for(const source of parts) {
   if(mode==='drive'&&!['drive','shaft','bearing','support'].includes(source.group))continue;
   if(mode==='bearing'&&!['shaft','bearing','joint','pen'].includes(source.group))continue;
   if(mode==='pen'&&!['pen','joint'].includes(source.group)&&!source.id.startsWith('endP')&&!source.id.startsWith('rod'))continue;
   const b={...source},entry=catalog.find(r=>r.id===b.bom);
   currentPart={...b,entry};
   if(exploded||mode==='exploded')b.z+=b.group==='moving'||b.group==='joint'?(b.id.endsWith('B')?85:50):b.group==='platter'?30:b.group==='pen'?105:0;
   const key=b.id.slice(-1),col=colors[key]||'#8ba7ba';
   const color=b.group==='frame'?(b.id==='BASE'?'#33465a44':'#344c61'):b.group==='bearing'||b.group==='joint'?'#d6e1e7':b.group==='moving'?col:b.group==='drive'?col:b.group==='platter'?'#8a9ba9':b.group==='pen'?(b.id==='pen'?'#f4c367':'#62a7bb'):b.group==='support'?'#4b6377':'#b2c4d3';
   if(b.shape==='box')box(b.x,b.y,b.z,b.w,b.l,b.h,color,b.id);
   else if(b.shape==='beam')beam(b.a,b.b,b.z,b.w,b.h,color,b.id);
   else if(b.shape==='ring')ring(b,color);
   else cylinder(b.x,b.y,b.z,b.r,b.h,color,b.id);
  }
  if(['assembly','section','exploded'].includes(mode)){
   currentPart=null;
   const p=DESIGN.paper,z=p.z+p.thickness/2+.2+((exploded||mode==='exploded')?30:0);
   const corners=[[-p.width/2,-p.height/2],[p.width/2,-p.height/2],[p.width/2,p.height/2],[-p.width/2,p.height/2]].map(([x,y])=>({...window.MotioPaper.paperToMachine({x,y},sim.q.C,DESIGN),z}));
   face(corners,'#f4f0e7',1);
  }
  faces.sort((a,b)=>a.depth-b.depth);
  this.pickFaces=faces;
  if(!this.drawDepth(faces,rect.width,rect.height)) {
   ctx.font='14px system-ui,sans-serif';ctx.fillStyle='#c5dceb';ctx.fillText('3D vraagt WebGL in deze browser.',20,60);ctx.fillText('Open de 2D-tekening en doorsnede voor de mechanische opbouw.',20,88);return;
  }
  for(const label of labels){ctx.font='bold 11px Consolas,monospace';ctx.fillStyle='#0a1421';ctx.fillRect(label.x-18,label.y-24,38,17);ctx.fillStyle='#d7e8f5';ctx.fillText(label.text,label.x-14,label.y-12);}
  ctx.font='11px Consolas,monospace';ctx.fillStyle='#97b2c8';ctx.fillText((exploded||mode==='exploded')?'EXPLODED · geen bedrijfsstand':'MAATGEBASEERD 3D · '+mode.toUpperCase(),16,22);
  ctx.fillText(mode==='pen'?'Holle penas · onafhankelijke 6804-lagers · manuele M4-klem':'Gedeelde geometrie · klik onderdeel voor BOM en maatvoering',16,rect.height-16);
 }
}
window.MotioSpatial={SpatialRenderer};
})();
