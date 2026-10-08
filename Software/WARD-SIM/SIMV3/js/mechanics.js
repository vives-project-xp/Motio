(function () {
'use strict';
const {DEFAULT_CONFIG,build}=window.MotioGeometry;
const {solve,inverse}=window.MotioKinematics;
function inspect(config,q) {
 const g=build(config),pose=solve(config,q),issues=[];
 if(!pose.valid)return {...pose,safe:false,issues:[pose.reason],clearance:null};
 const singularity=window.MotioSingularity.analyze(pose,g),collision=window.MotioCollision.analyze(g,pose);
 if(pose.sin<g.parallelStop)issues.push('Parallelle singulariteit: onder geconfigureerde transmissiegrens');
 if(singularity.state==='CRITICAL')issues.push('Singulariteit: onveilige kruk-/armstand');
 if(collision.violations.length)issues.push(...collision.violations.slice(0,3).map(v=>v.a+' / '+v.b+': '+v.gap.toFixed(2)+' mm'));
 return {...pose,singularity,collision,safe:!issues.length,issues,clearance:collision.minimum,force:g.dragForce/pose.sin};
}
window.MotioMechanics={DEFAULT_CONFIG,solve,inverse,inspect,audit:(config,resolution=36)=>window.MotioValidation.audit(config,resolution)};
})();
