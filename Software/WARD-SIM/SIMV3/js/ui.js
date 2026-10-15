(function () {
'use strict';
const {DEFAULT_CONFIG}=window.MotioGeometry;
const {TAU}=window.MotioMath;
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>v===null||v===undefined||Number.isNaN(v)?'—':Number.isFinite(v)?v.toFixed(d):'∞';
const fields={'rpm-a':'rpmA','rpm-b':'rpmB','rpm-c':'rpmC','phase-a':'phaseA','phase-b':'phaseB','phase-c':'phaseC','radius-a':'radiusA','radius-b':'radiusB','length-a':'lengthA','length-b':'lengthB'};
const axes=['A','B','C'];
function download(name,content,type) {
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function status(state){const value=['PASS','FAIL'].includes(state)?state:'NIET BEWEZEN';return '<span class="badge '+(value==='PASS'?'ok':value==='FAIL'?'danger':'warn')+'">'+esc(value)+'</span>';}
class UIController {
 constructor(sim,spatial) {
  this.sim=sim;this.spatial=spatial;this.view='simulator';this.mode='2d';this.engineeringMode='assembly';this.exploded=false;this.speedMultiplier=1;this.test=null;
  for(const id of ['power','home','play','pause','stop','reset','clear'])$(id+'-btn').addEventListener('click',()=>{sim[{power:'power',home:'home',play:'play',pause:'pause',stop:'stop',reset:'reset',clear:'clearTrace'}[id]]();this.render();});
  $('speed').addEventListener('input',e=>{this.speedMultiplier=[.25,.5,1,2,5][Number(e.target.value)];$('speed-value').textContent=this.speedMultiplier+'×';});
  for(const id of Object.keys(fields))$(id).addEventListener('change',()=>this.applyInputs(id));
  for(const key of axes)$('dir-'+key.toLowerCase()).addEventListener('change',()=>this.applyInputs('dir-'+key.toLowerCase()));
  for(const p of window.MotioPatterns.list)$('pattern-'+p.id).addEventListener('click',()=>{
   try{this.configure({...sim.config,patternId:p.id,rpmC:-p.rpm});$('config-message').textContent='';}catch(e){$('pattern-info').textContent=e.message;}
  });
  $('word-input').addEventListener('input',()=>{
   $('word-input').value=$('word-input').value.toUpperCase();this.updateWordPreview();
  });
  $('word-form').addEventListener('submit',e=>{
   e.preventDefault();const word=$('word-input').value.trim().toUpperCase();
   if(!/^[A-Z]{1,8}$/.test(word)){this.updateWordPreview();return;}
   try{
    this.configure({...sim.config,patternId:'word',wordText:word,rpmC:-window.MotioPatterns.get('word').rpm});
    $('word-message').textContent=word+' staat klaar · Power on → Home → Play.';
   }catch(error){$('word-message').textContent=error.message;}
  });
  $('custom-pattern').addEventListener('click',()=>this.configure({...sim.config,patternId:''}));
  $('show-preview').addEventListener('change',e=>{sim.showPreview=e.target.checked;});
  $('restore-btn').addEventListener('click',()=>this.configure(DEFAULT_CONFIG));
  for(const view of ['simulator','mechanical','validation','components'])$('nav-'+view).addEventListener('click',()=>this.navigate(view));
  for(const mode of ['2d','3d'])$('mode-'+mode).addEventListener('click',()=>{
   this.mode=mode;for(const m of ['2d','3d']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-pressed',String(mode===m));}
   $('mechanical-diagram').hidden=mode!=='2d';$('spatial-wrap').hidden=mode!=='3d';
  });
  for(const mode of ['iso','top','side'])$('camera-'+mode).addEventListener('click',()=>spatial.resetCamera(mode));
  $('export-svg').addEventListener('click',()=>download('MOTIO-V4-mechanical.svg',this.mechanicalSVG(),'image/svg+xml;charset=utf-8'));
  $('export-bom').addEventListener('click',()=>download('MOTIO-V4-BOM.csv',window.MotioBOM.csv(sim.geometry),'text/csv;charset=utf-8'));
  $('apply-config').addEventListener('click',()=>{try{this.configure(JSON.parse($('machine-config').value));$('config-message').textContent='Configuratie toegepast. Modellen en controles bijgewerkt.';}catch(e){$('config-message').textContent=e.message;}});
  $('export-config').addEventListener('click',()=>download('MOTIO-V4-config.json',JSON.stringify(sim.config,null,2),'application/json'));
  $('run-test').addEventListener('click',()=>{sim.halt();this.test=new window.MotioValidation.EngineeringTest(sim.config);this.refreshValidation();});
  $('cancel-test').addEventListener('click',()=>{this.test?.cancel();this.refreshValidation();});
  $('export-report').addEventListener('click',()=>download('MOTIO-V4-validation.json',JSON.stringify({created:new Date().toISOString(),units:'mm, rad, s, N, kg, motor torque Nm',configuration:sim.config,checks:window.MotioValidation.rows(sim,this.test),area:sim.drawingArea,test:this.test?.report||null},(k,v)=>typeof v==='number'&&!Number.isFinite(v)?null:v,2),'application/json'));
  const select=e=>{const target=e.target.closest?.('[data-bom]');if(target)this.selectPart({entry:window.MotioBOM.create(sim.geometry).find(r=>r.id===target.dataset.bom),id:target.dataset.bom});};
  $('mechanical-diagram').addEventListener('click',select);$('mechanical-diagram').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}});
  spatial.onSelect=p=>this.selectPart(p);
  this.populate(sim.config);this.refreshAudit();
 }
 updateWordPreview(){
  const text=$('word-input').value.trim().toUpperCase(),valid=/^[A-Z]{1,8}$/.test(text);
  $('word-count').textContent=text.length+' / 8';$('word-apply').disabled=!valid;
  $('word-input').setAttribute('aria-invalid',String(!valid&&text.length>0));
  if(!valid){
   $('word-preview').innerHTML='';
   $('word-message').textContent=text?'Gebruik maximaal 8 letters (A–Z), zonder spaties of cijfers.':'Typ een woord om het voorbeeld te zien.';
   return;
  }
  const config={...this.sim.config,wordText:text},pattern=window.MotioPatterns.get('word');
  $('word-preview').innerHTML=window.MotioPatterns.svg(this.sim.geometry,window.MotioPatterns.preview(config,pattern),text);
  $('word-message').textContent='Automatische lettergrootte en tussenruimte · één verbonden tekenpad.';
 }
 populate(config){
  for(const [id,key] of Object.entries(fields))$(id).value=key.startsWith('rpm')?Math.abs(config[key]):config[key]??0;
  for(const key of axes){$('dir-'+key.toLowerCase()).value=config['rpm'+key]<0?'-1':'1';$('rpm-'+key.toLowerCase()).max=key==='C'?config.maxPaperRPM:config.maxRPM;}
  $('machine-config').value=JSON.stringify(config,null,2);
  $('word-input').value=config.wordText;this.updateWordPreview();
  this.refreshPatterns();
 }
 configure(config){this.test?.cancel();this.sim.configure(config);this.test=null;this.populate(this.sim.config);this.refreshAudit();this.render();}
 applyInputs(changed){
  const config={...this.sim.config};
  if(/^(rpm|phase|dir)-/.test(changed))config.patternId='';
  for(const [id,key] of Object.entries(fields)){const input=$(id),v=Number(input.value);config[key]=input.value!==''&&Number.isFinite(v)?Math.max(Number(input.min),Math.min(Number(input.max),v)):DEFAULT_CONFIG[key]??0;if(key.startsWith('rpm'))config[key]*=Number($('dir-'+id.slice(-1)).value);}
  try{this.configure(config);$('config-message').textContent='';}catch(e){$('config-message').textContent=e.message;this.populate(this.sim.config);}
 }
 refreshPatterns(){
  const s=this.sim;
  for(const p of window.MotioPatterns.list){
   const button=$('pattern-'+p.id),selected=s.pattern?.id===p.id;
   button.innerHTML=window.MotioPatterns.svg(s.geometry,window.MotioPatterns.preview(s.config,p),p.name)+'<span><strong>'+esc(p.name)+'</strong><small>'+esc(p.detail)+'</small></span>';
   button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  }
  $('manual-controls').hidden=!!s.pattern;$('custom-pattern').classList.toggle('active',!s.pattern);$('custom-pattern').setAttribute('aria-pressed',String(!s.pattern));
  $('word-generator').classList.toggle('active',s.pattern?.id==='word');$('word-apply').setAttribute('aria-pressed',String(s.pattern?.id==='word'));
  $('show-preview').disabled=!s.pattern;$('show-preview').checked=s.showPreview;
  $('preview-caption').textContent=s.pattern?'Voorbeeld licht · getekend donker':'Eigen beweging · geen vast voorbeeld';
  $('pattern-info').textContent=s.pattern?(s.pattern.id==='word'?s.config.wordText:s.pattern.name)+' · '+window.MotioPatterns.motion(s.pattern)+'.':'Eigen snelheden en richtingen. De machine stopt bij een onveilige stand.';
 }
 // Kept for the existing animation loop; detailed section drawings are not part of the default screen.
 refreshSections(){}
 mechanicalSVG(){return window.MotioRenderers.mechanismSVG(this.sim,true,'assembly');}
 refreshAudit(){
  const g=this.sim.geometry;
  $('bom-head').innerHTML='<tr>'+window.MotioBOM.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>';
  $('bom-body').innerHTML=window.MotioBOM.create(g).map(r=>'<tr>'+window.MotioBOM.values(r).map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
  $('paper-size').textContent='Ø'+fmt(g.paper.radius*2,0)+' mm';$('paper-margin').textContent=fmt(g.paper.margin,0)+' mm marge · tekenzone Ø'+fmt((g.paper.radius-g.paper.margin)*2,0)+' mm';
  this.refreshValidation();
 }
 selectPart(part){
  if(typeof part==='string'){$('part-label').textContent=part;return;}
  const e=part.entry;$('part-label').textContent=e?.name||part.id;
  if(!e)return;
  $('component-details').innerHTML='<h3>'+esc(e.name)+'</h3><dl>'+[['Aantal',e.qty],['Afmetingen',e.dimensions],['Materiaal',e.material],['Opmerking',e.spec]].filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';
 }
 navigate(view){this.view=view;for(const name of ['simulator','mechanical','validation','components']){$(name+'-view').hidden=name!==view;$('nav-'+name).classList.toggle('active',name===view);$('nav-'+name).setAttribute('aria-pressed',String(name===view));}if(view==='validation')this.refreshValidation();}
 tickTest(){if(this.test?.running){this.test.step(18);this.refreshValidation();}}
 refreshValidation(){
  $('validation-body').innerHTML=window.MotioValidation.rows(this.sim,this.test).map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+status(r.state)+'</td><td>'+esc(r.value||'')+(r.state==='PASS'?'':r.evidence?'<p>'+esc(r.evidence)+'</p>':'')+'</td></tr>').join('');
  const t=this.test;$('run-test').disabled=!!t?.running;$('cancel-test').disabled=!t?.running;$('test-progress').value=t?.progress||0;
  $('test-status').textContent=!t?'Nog geen bewegingstest uitgevoerd.':t.running?'Controle bezig · '+Math.round(t.progress*100)+'%':t.report.complete?'Controle afgerond · '+t.report.samples.toLocaleString('nl-BE')+' standen onderzocht.':'Controle geannuleerd. Gedeeltelijke resultaten bewijzen geen veilige beweging.';
 }
 render(){
  const s=this.sim,p=s.pose,g=s.geometry;
  const boundaryStop=s.fault.startsWith('Grens veilige tekencirkel bereikt');
  const states={'POWER OFF':'UIT',INTERLOCK:'GESTOPT · PROBLEEM',HOMING:'NAAR HOME','NOT HOMED':'HOME VEREIST',BRAKING:'AFREMMEN',RUNNING:'TEKENEN',PAUSED:'GEPAUZEERD',HOMED:'KLAAR',COMPLETE:'PATROON KLAAR'};
  $('run-status').textContent=boundaryStop?'VEILIGE GRENS':states[s.state]||s.state;$('run-status').className='badge '+(boundaryStop?'warn':s.fault||!s.safe?'danger':s.running?'ok':'');
  $('power-btn').textContent=s.powered?'Power off':'Power on';$('home-btn').disabled=!s.powered||s.homing||!s.safe||!!this.test?.running;
  $('play-btn').disabled=!s.powered||!s.homed||s.homing||s.stopping||!s.safe||!s.insideSafe||!!s.fault||s.patternComplete||!!this.test?.running;$('machine-message').textContent=s.message;
  const boundary=$('boundary-status');boundary.textContent=boundaryStop?'Veilige grens bereikt':s.fault||!s.safe?'Beweging geblokkeerd':s.insideSafe?'Binnen veilige zone':'Buiten veilige zone';boundary.className='badge '+(boundaryStop?'warn':s.fault||!s.safe?'danger':s.insideSafe?'ok':'warn');
  const drive=window.MotioMotor.analyze(g,p,s.velocity,s.angularAcceleration),motor=axes.map(k=>drive[k]),overload=motor.some(m=>m&&m.safetyFactor!==null&&m.safetyFactor<1),qualified=motor.every(m=>m?.qualified&&m.safetyFactor>=1);
  const torque=overload?'Onvoldoende':qualified?'Voldoende':'Niet aangetoond';
  const motorReadings=axes.map(key=>{const angle=(((-s.q[key]*g[key].ratio*180/Math.PI)%360)+360)%360,rpm=-s.velocity[key]*g[key].ratio*60/TAU;return '<span class="motor-reading"><strong class="'+key.toLowerCase()+'">Motor '+key+'</strong><span>'+fmt(angle,1)+'°</span><span>'+fmt(rpm)+' RPM</span></span>';}).join('');
  const position=s.penLocal?'X '+fmt(s.penLocal.x)+' · Y '+fmt(s.penLocal.y)+' mm':'—';
  $('live-data').innerHTML='<div><dt>Penpositie X / Y<br><small>op het papier</small></dt><dd>'+esc(position)+'</dd></div><div class="motor-live"><dt>Motoren · actuele hoek en snelheid</dt><dd>'+motorReadings+'</dd></div><div><dt>Tekenbereik</dt><dd>'+esc(s.insideSafe?'Binnen veilige zone':'Buiten veilige zone')+'</dd></div><div><dt>Mechanica</dt><dd>'+esc(!s.safe||(s.fault&&!boundaryStop)?'Probleem':'OK')+'</dd></div><div><dt>Motorkoppel</dt><dd>'+esc(torque)+'</dd></div>';
  const check=$('live-check'),issue=s.fault||(!s.safe?p.issues?.join(' · '):'');check.hidden=!issue;check.className=boundaryStop?'check':'check bad';check.textContent=issue?issue+' · beweging gestopt op de laatste geldige positie.':'';
  $('point-count').textContent=s.trace.length.toLocaleString('nl-BE')+' spoorpunten';
 }
}
window.MotioUI={UIController};
})();
