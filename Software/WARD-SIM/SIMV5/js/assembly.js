(function () {
'use strict';
const steps=[
 {title:'Bodem en wanden',instruction:'Zet de vier zijwanden op de bodemplaat en maak de hoeken vast.'},
 {title:'Motoren plaatsen',instruction:'Bevestig de drie motoren met hun beugels in de box. Richt de motorassen naar boven.'},
 {title:'Bovenplaat en assen',instruction:'Monteer de lagerhouders en assen op de bovenplaat. Laat de plaat zakken en verbind de assen via de koppelingen met de motoren.'},
 {title:'Draaiplateau en papier',instruction:'Bevestig het draaiplateau op as C en leg het ronde papier in het midden.'},
 {title:'Krukken en penarmen',instruction:'Zet de krukken op as A en B. Verbind de penarmen via de scharnieren, met beide uiteinden boven hetzelfde penpunt.'},
 {title:'Penhouder en pen',instruction:'Plaats de penhouder door de uiteinden van beide armen. Schuif de pen tot op het papier en draai de klemschroef met de hand vast.'}
];
// Reuse the existing model groups; every body belongs to one assembly step.
function stageOf(part){
 if(part.id.startsWith('box-'))return 0;
 if(/^motor(?:Shaft)?[ABC]$/.test(part.id)||/^(bracket|riser)/.test(part.id))return 1;
 if(part.group==='platter')return 3;
 if(part.group==='moving'||part.group==='joint')return 4;
 if(part.group==='pen')return 5;
 return 2;
}
const $=id=>document.getElementById(id);
class AssemblyGuide {
 constructor(sim){
  this.sim=sim;this.step=0;this.progress=0;this.active=false;this.startedAt=null;this.duration=2600;
  this.renderer=new window.MotioSpatial.SpatialRenderer($('assembly-canvas'),()=>{});
  this.renderer.zoom=.88;
  $('assembly-prev').addEventListener('click',()=>this.go(this.step-1));
  $('assembly-next').addEventListener('click',()=>this.go(this.step+1));
  $('assembly-replay').addEventListener('click',()=>this.replay());
  this.updateText();
 }
 open(){this.active=true;this.replay();}
 close(){this.active=false;this.startedAt=null;}
 go(step){
  if(step<0||step>=steps.length)return;
  this.step=step;this.updateText();this.replay();
 }
 updateText(){
  const item=steps[this.step];
  $('assembly-counter').textContent='Stap '+(this.step+1)+' van '+steps.length;
  $('assembly-title').textContent=item.title;$('assembly-instruction').textContent=item.instruction;
  $('assembly-progress').value=this.step+1;
  $('assembly-prev').disabled=this.step===0;$('assembly-next').disabled=this.step===steps.length-1;
  $('assembly-canvas').setAttribute('aria-label','Montageanimatie · stap '+(this.step+1)+' van '+steps.length+' · '+item.title+'. '+item.instruction);
 }
 replay(){
  // A fixed pose from the current configuration keeps the build independent of live motion.
  const c=this.sim.config,q={A:c.phaseA*Math.PI/180,B:c.phaseB*Math.PI/180,C:c.phaseC*Math.PI/180};
  this.model={geometry:this.sim.geometry,pose:window.MotioKinematics.solve(c,q),q,trace:[]};
  this.progress=0;this.startedAt=null;this.lastRender=-Infinity;
 }
 render(now){
  if(!this.active||now-this.lastRender<1000/30)return;
  this.lastRender=now;
  if(this.startedAt===null)this.startedAt=now;
  this.progress=Math.min(1,Math.max(0,(now-this.startedAt)/this.duration));
  this.renderer.render(this.model,false,'assembly',{step:this.step,progress:this.progress});
 }
}
window.MotioAssembly={AssemblyGuide,steps,stageOf};
})();
