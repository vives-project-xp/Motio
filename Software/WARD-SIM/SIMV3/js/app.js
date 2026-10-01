(function () {
'use strict';
const simulation=new window.MotioSimulation.Simulation();
const paper=new window.MotioRenderers.PaperRenderer(document.getElementById('paper-canvas'));
const spatial=new window.MotioSpatial.SpatialRenderer(document.getElementById('spatial-canvas'),label=>document.getElementById('part-label').textContent=label);
const ui=new window.MotioUI.UIController(simulation,spatial);
let previous=performance.now(),lastRender=-Infinity,accumulator=0;
function frame(now) {
 const elapsed=Math.min(Math.max(0,(now-previous)/1000),.1);previous=now;
 if(simulation.running||simulation.homing){accumulator+=elapsed*ui.speedMultiplier;while(accumulator>=.002){simulation.update(.002);accumulator-=.002;}}else accumulator=0;
 if(now-lastRender>=100){
  if(ui.view==='simulator'){document.getElementById('machine-diagram').innerHTML=window.MotioRenderers.mechanismSVG(simulation);paper.render(simulation);}
  if(ui.view==='mechanical'){
   if(ui.mode==='2d')document.getElementById('mechanical-diagram').innerHTML=window.MotioRenderers.mechanismSVG(simulation,true);
   else spatial.render(simulation,ui.exploded);
  }
  ui.render();lastRender=now;
 }
 requestAnimationFrame(frame);
}
// Visible API for reproducible local inspection; no hardware commands are emitted.
window.MotioV3={simulation,ui,spatial};requestAnimationFrame(frame);
})();
