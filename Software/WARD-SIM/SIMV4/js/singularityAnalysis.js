(function () {
'use strict';
function analyze(p,g) {
 if(!p.valid)return {state:'CRITICAL',condition:Infinity,quality:0,distanceDeg:0,gain:Infinity,minGain:0};
 const j=p.J,a=j.ax*j.ax+j.ay*j.ay,d=j.bx*j.bx+j.by*j.by,b=j.ax*j.bx+j.ay*j.by;
 const maxEigen=(a+d+Math.hypot(a-d,2*b))/2,det=j.ax*j.by-j.ay*j.bx;
 const max=Math.sqrt(Math.max(0,maxEigen)),min=max>1e-12?Math.abs(det)/max:0,condition=min<1e-9?Infinity:max/min;
 const quality=Math.min(p.sin,p.serialA,p.serialB),distanceDeg=Math.asin(Math.min(1,quality))*180/Math.PI;
 const state=condition>=g.conditionCritical||quality<=g.transmissionCritical?'CRITICAL':condition>=g.conditionCaution||quality<=g.transmissionCaution?'CAUTION':'SAFE';
 return {state,condition,quality,distanceDeg,gain:max,minGain:min,parallel:p.sin,serialA:p.serialA,serialB:p.serialB};
}
window.MotioSingularity={analyze};
})();
