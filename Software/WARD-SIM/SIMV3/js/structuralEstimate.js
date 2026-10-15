(function () {
'use strict';
function analyze(g,p) {
 if(!p.valid)return {state:'NOT CALCULATED'};
 const armForce=g.dragForce/Math.max(p.sin,1e-12),arms={};
 for(const key of ['A','B']) {
  const L=g['length'+key],mass=g.tubeArea*L*1e-9*g.density;
  // Cantilever surrogate: ALL pen normal force on each arm + uniform own weight.
  const vertical=g.verticalForce*L**3/(3*g.materialE*g.tubeI)+mass*9.80665*L**3/(8*g.materialE*g.tubeI);
  const axial=armForce*L/(g.materialE*g.tubeArea);
  arms[key]={vertical,axial,mass,force:armForce,buckling:Math.PI**2*g.materialE*Math.min(g.tubeI,g.tubeIxy)/L**2};
 }
 // Worst signed rod extensions, propagated through the two unit-length constraints.
 const det=p.ua.x*p.ub.y-p.ua.y*p.ub.x;let errorXY=0;
 for(const sa of [-1,1])for(const sb of [-1,1])errorXY=Math.max(errorXY,Math.hypot((p.ub.y*arms.A.axial*sa-p.ua.y*arms.B.axial*sb)/det,(-p.ub.x*arms.A.axial*sa+p.ua.x*arms.B.axial*sb)/det));
 return {state:'ESTIMATE',arms,errorXY,verticalEnvelope:Math.max(arms.A.vertical,arms.B.vertical),totalPositionError:null,
  assumptions:'Cantilever upper-bound surrogate for Z bending; axial tube stretch propagated to XY. End fittings, joint play, shaft bending, tooth backlash and paper runout unmodelled.'};
}
window.MotioStructure={analyze};
})();
