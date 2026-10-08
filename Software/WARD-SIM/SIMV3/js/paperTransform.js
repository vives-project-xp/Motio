(function () {
'use strict';
// Paper coordinates have their origin at the spindle. +Y down, positive rotation clockwise.
function machineToPaper(p,theta,g){const x=p.x-g.paper.x,y=p.y-g.paper.y,c=Math.cos(theta),s=Math.sin(theta);return {x:c*x+s*y,y:-s*x+c*y};}
function paperToMachine(p,theta,g){const c=Math.cos(theta),s=Math.sin(theta);return {x:g.paper.x+c*p.x-s*p.y,y:g.paper.y+s*p.x+c*p.y};}
function inside(p,g,margin=0){return Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.hypot(p.x,p.y)<=g.paper.radius-margin+1e-9;}
window.MotioPaper={machineToPaper,paperToMachine,inside};
})();
