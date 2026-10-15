(function () {
'use strict';
const TAU = 2 * Math.PI;
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const cross = (a,b) => a.x*b.y-a.y*b.x;
const subtract = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
function pointSegment(p,a,b) {
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)) : 0;
 return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
function segmentsDistance(a,b,c,d) {
 const ab=subtract(b,a),cd=subtract(d,c),den=cross(ab,cd);
 if(Math.abs(den)>1e-9) {
  const ca=subtract(c,a),t=cross(ca,cd)/den,u=cross(ca,ab)/den;
  if(t>=0&&t<=1&&u>=0&&u<=1)return 0;
 }
 return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
const gearPitchRadius=(teeth,module)=>teeth*module/2;
const gearCenter=(motorTeeth,outputTeeth,module)=>gearPitchRadius(motorTeeth,module)+gearPitchRadius(outputTeeth,module);
window.MotioMath={TAU,distance,cross,subtract,pointSegment,segmentsDistance,gearPitchRadius,gearCenter};
})();
