(function () {
'use strict';
const {DEFAULT_CONFIG}=window.MotioGeometry;
const {TAU}=window.MotioMath;
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>v===null||v===undefined||Number.isNaN(v)?'NOT CALCULATED':Number.isFinite(v)?v.toFixed(d):'∞';
const fields={'rpm-a':'rpmA','rpm-b':'rpmB','rpm-c':'rpmC','phase-a':'phaseA','phase-b':'phaseB','radius-a':'radiusA','radius-b':'radiusB','length-a':'lengthA','length-b':'lengthB'};
function download(name,content,type) {
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function status(state){return '<span class="badge '+(state==='PASS'?'ok':state==='FAIL'?'danger':'warn')+'">'+esc(state)+'</span>';}
class UIController {
 constructor(sim,spatial) {
  this.sim=sim;this.spatial=spatial;this.view='simulator';this.mode='2d';this.engineeringMode='assembly';this.exploded=false;this.speedMultiplier=1;this.test=null;
  for(const id of ['power','home','play','pause','stop','reset','clear'])$(id+'-btn').addEventListener('click',()=>{sim[{power:'power',home:'home',play:'play',pause:'pause',stop:'stop',reset:'reset',clear:'clearTrace'}[id]]();this.render();});
  $('speed').addEventListener('input',e=>{this.speedMultiplier=[.25,.5,1,2,5][Number(e.target.value)];$('speed-value').textContent=this.speedMultiplier+'×';});
  for(const id of Object.keys(fields))$(id).addEventListener('change',()=>this.applyInputs());
  $('preset').addEventListener('change',e=>{
   const profiles={v2:{rpmA:-6.486,rpmB:-4.528,rpmC:-4,phaseA:0,phaseB:0},flower:{rpmA:-4,rpmB:3,rpmC:-1.5,phaseA:90,phaseB:15},slow:{rpmA:-1,rpmB:-.8,rpmC:-.5,phaseA:45,phaseB:90},stationary:{rpmA:-4,rpmB:-3,rpmC:0,phaseA:90,phaseB:0}};
   this.populate({...sim.config,...profiles[e.target.value]});this.applyInputs();
  });
  $('restore-btn').addEventListener('click',()=>this.configure(DEFAULT_CONFIG));
  for(const view of ['simulator','mechanical','validation','components'])$('nav-'+view).addEventListener('click',()=>this.navigate(view));
  for(const mode of ['2d','3d'])$('mode-'+mode).addEventListener('click',()=>{
   this.mode=mode;for(const m of ['2d','3d']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-pressed',String(mode===m));}
   $('mechanical-diagram').hidden=mode!=='2d';$('spatial-wrap').hidden=mode!=='3d';
  });
  $('engineering-mode').addEventListener('change',e=>{this.engineeringMode=e.target.value;if(this.engineeringMode==='pen'||this.engineeringMode==='section')spatial.resetCamera('side');else spatial.resetCamera('iso');this.refreshSections();});
  $('exploded').addEventListener('change',e=>{this.exploded=e.target.checked;this.refreshSections();});
  for(const mode of ['iso','top','side'])$('camera-'+mode).addEventListener('click',()=>spatial.resetCamera(mode));
  $('export-svg').addEventListener('click',()=>download('MOTIO-SimV3-mechanical.svg',this.mechanicalSVG(),'image/svg+xml;charset=utf-8'));
  $('export-bom').addEventListener('click',()=>download('MOTIO-SimV3-BOM.csv',window.MotioBOM.csv(sim.geometry),'text/csv;charset=utf-8'));
  $('workspace-toggle').addEventListener('change',e=>sim.showWorkspace=e.target.checked);
  $('ik-solve').addEventListener('click',()=>{
   const x=Number($('ik-x').value),y=Number($('ik-y').value),ik=window.MotioKinematics.inverse(sim.config,{x,y},sim.pose,$('ik-lock').checked);
   if(!ik.valid){$('ik-result').textContent=ik.reason;return;}
   const p=window.MotioMechanics.inspect(sim.config,ik.q);
   $('ik-result').textContent=ik.solutions.length+' oplossingen op assembly branch '+p.branch+' · as A '+fmt(ik.q.A*180/Math.PI)+'° · as B '+fmt(ik.q.B*180/Math.PI)+'° · '+p.singularity.state+' · clearance '+fmt(p.clearance)+' mm. P is berekend; geen beweging uitgevoerd.';
  });
  $('apply-config').addEventListener('click',()=>{try{this.configure(JSON.parse($('machine-config').value));$('config-message').textContent='Configuratie toegepast; alle views en controles opnieuw berekend.';}catch(e){$('config-message').textContent=e.message;}});
  $('export-config').addEventListener('click',()=>download('MOTIO-SimV3-config.json',JSON.stringify(sim.config,null,2),'application/json'));
  $('run-test').addEventListener('click',()=>{sim.halt();this.test=new window.MotioValidation.EngineeringTest(sim.config);this.refreshValidation();});
  $('cancel-test').addEventListener('click',()=>{this.test?.cancel();this.refreshValidation();});
  $('export-report').addEventListener('click',()=>download('MOTIO-SimV3-validation.json',JSON.stringify({created:new Date().toISOString(),units:'mm, rad, s, N, kg, motor torque Nm',configuration:sim.config,checks:window.MotioValidation.rows(sim,this.test),area:sim.drawingArea,test:this.test?.report||null},(k,v)=>typeof v==='number'&&!Number.isFinite(v)?'NOT FINITE':v,2),'application/json'));
  for(const id of ['mechanical-diagram','section-diagram','pen-detail']){
   const select=e=>{const target=e.target.closest?.('[data-bom]');if(target)this.selectPart({entry:window.MotioBOM.create(sim.geometry).find(r=>r.id===target.dataset.bom),id:target.dataset.bom});};
   $(id).addEventListener('click',select);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}});
  }
  spatial.onSelect=p=>this.selectPart(p);
  this.populate(sim.config);this.refreshAudit();
 }
 populate(config){for(const [id,key] of Object.entries(fields))$(id).value=config[key];$('machine-config').value=JSON.stringify(config,null,2);}
 configure(config){this.test?.cancel();this.sim.configure(config);this.test=null;this.populate(this.sim.config);this.refreshAudit();}
 applyInputs(){
  const config={...this.sim.config};
  for(const [id,key] of Object.entries(fields)){const input=$(id),v=Number(input.value);config[key]=input.value!==''&&Number.isFinite(v)?Math.max(Number(input.min),Math.min(Number(input.max),v)):DEFAULT_CONFIG[key];input.value=config[key];}
  try{this.configure(config);}catch(e){$('config-message').textContent=e.message;this.populate(this.sim.config);}
 }
 refreshSections(){const R=window.MotioRenderers,explode=this.exploded||this.engineeringMode==='exploded';$('section-diagram').innerHTML=R.sectionSVG(this.sim,explode);$('pen-detail').innerHTML=R.detailSVG(this.sim,'pen',explode);}
 mechanicalSVG(){const R=window.MotioRenderers;return this.engineeringMode==='pen'?R.detailSVG(this.sim,'pen',this.exploded):this.engineeringMode==='section'?R.sectionSVG(this.sim,this.exploded):R.mechanismSVG(this.sim,true,this.engineeringMode);}
 refreshAudit(){
  const a=this.sim.audit,g=this.sim.geometry;
  $('scan-summary').innerHTML='<strong>'+a.samples+' standen · '+a.failures+' interlocks · '+a.critical+' kritisch voor XY</strong><p>Sluiting alle hoeken: '+(a.closureAll?'bewezen':'niet bewezen')+'<br>Gemodelleerde vrijloop: '+fmt(a.minClearance)+' mm<br>Parallelle |sin γ| ≥ '+fmt(a.sinBound,4)+'</p>';
  $('engineering-report').innerHTML='<p>Workspace P: X '+fmt(a.minX)+'…'+fmt(a.maxX)+' / Y '+fmt(a.minY)+'…'+fmt(a.maxY)+' mm (raster).</p><p>Volledig tekenvlak: '+status(this.sim.drawingArea.reachState)+'<br>'+this.sim.drawingArea.missing+' onbereikbare papierpunten in de scan.</p>';
  $('bom-head').innerHTML='<tr>'+window.MotioBOM.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>';
  $('bom-body').innerHTML=window.MotioBOM.create(g).map(r=>'<tr>'+window.MotioBOM.values(r).map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
  $('paper-size').textContent=g.paper.width+' × '+g.paper.height+' mm';$('paper-margin').textContent=g.paper.margin+' mm marge · oorsprong in papiercentrum';
  this.refreshSections();this.refreshValidation();
 }
 selectPart(part){
  if(typeof part==='string'){$('part-label').textContent=part;return;}
  const e=part.entry;$('part-label').textContent=(e?.name||part.id)+' · '+part.id;
  if(!e)return;
  $('component-details').innerHTML='<h3>'+esc(e.name)+'</h3><dl>'+[['ID / BOM',e.id],['Geometrie-ID',part.id],['Materiaal',e.material],['Afmetingen',e.dimensions+' mm'],['Functie',e.role],['Lagering',e.bearing],['Verbonden',e.connected||'Detail-CAD vereist'],['Status',e.status],['Validatie',e.validation]].map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';
 }
 navigate(view){this.view=view;for(const name of ['simulator','mechanical','validation','components']){$(name+'-view').hidden=name!==view;$('nav-'+name).classList.toggle('active',name===view);$('nav-'+name).setAttribute('aria-pressed',String(name===view));}if(view==='validation')this.refreshValidation();}
 tickTest(){if(this.test?.running){this.test.step(18);this.refreshValidation();}}
 refreshValidation(){
  $('validation-body').innerHTML=window.MotioValidation.rows(this.sim,this.test).map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+status(r.state)+'</td><td>'+esc(r.value)+'</td><td>'+esc(r.evidence)+'</td></tr>').join('');
  const t=this.test;$('run-test').disabled=!!t?.running;$('cancel-test').disabled=!t?.running;$('test-progress').value=t?.progress||0;
  $('test-status').textContent=!t?'Nog geen engineering test uitgevoerd.':t.running?'Test bezig · '+Math.round(t.progress*100)+'% · '+t.report.samples+' poses':t.report.complete?'Validation Report · '+t.report.samples+' poses · '+t.report.critical+' kritisch · '+t.report.collisions+' collisions':'Test geannuleerd · gedeeltelijke maxima geven geen validatie.';
  if(t?.preview)$('test-preview').innerHTML=window.MotioRenderers.mechanismSVG(t.preview);
  $('test-findings').innerHTML=t?'<p>Assembly switches: '+t.report.assemblyChanges+' · seriële passages: '+t.report.workingChanges+'</p>'+t.report.worst.map(w=>'<p>A '+fmt(w.q.A*180/Math.PI,1)+'° / B '+fmt(w.q.B*180/Math.PI,1)+'° · κ '+fmt(w.condition,1)+' · '+fmt(w.clearance)+' mm</p>').join(''):'';
 }
 render(){
  const s=this.sim,p=s.pose,g=s.geometry;
  $('run-status').textContent=s.state;$('run-status').className='badge '+(s.fault||!s.safe?'danger':'');
  $('power-btn').textContent=s.powered?'Power off':'Power on';$('home-btn').disabled=!s.powered||s.homing||!s.safe||!!this.test?.running;
  $('play-btn').disabled=!s.powered||!s.homed||s.homing||s.stopping||!s.safe||!!s.fault||!!this.test?.running;$('machine-message').textContent=s.message;
  const boundary=$('boundary-status');boundary.textContent=s.fault||!s.safe?'MECHANISCHE INTERLOCK':!s.insidePaper?'BUITEN PAPIER':!s.insideSafe?'BUITEN MARGE':'PEN BINNEN MARGE';boundary.className='badge '+(s.fault||!s.safe?'danger':s.insideSafe?'ok':'warn');
  const rows=[['KINEMATICS',''],['Tijd',fmt(s.time)+' s']];
  for(const key of ['A','B','C']){rows.push(['As '+key+' hoek',fmt(s.q[key]*180/Math.PI)+'°'],['Motor '+key+' hoek',fmt(s.q[key]*g[key].ratio*180/Math.PI)+'°'],['As / motor '+key+' RPM',fmt(s.velocity[key]*60/TAU)+' / '+fmt(s.velocity[key]*g[key].ratio*60/TAU)]);}
  rows.push(['Machine X / Y',s.penWorld?fmt(s.penWorld.x)+' / '+fmt(s.penWorld.y)+' mm':'NOT CALCULATED'],['Paper X / Y',s.penLocal?fmt(s.penLocal.x)+' / '+fmt(s.penLocal.y)+' mm':'NOT CALCULATED'],['Paper angle',fmt(s.q.C*180/Math.PI)+'°'],['Pen velocity (machine)',fmt(s.penSpeed)+' mm/s'],['Pen acceleration (machine)',fmt(s.penAcceleration)+' mm/s²'],['Assembly branch',String(g.branch)],['Working branch A / B',p.valid?p.workingBranch.A+' / '+p.workingBranch.B:'—'],['Branch crossings',s.branchEvents.length+' gemeld']);
  const structure=window.MotioStructure.analyze(g,p),drive=window.MotioMotor.analyze(g,p,s.velocity,s.angularAcceleration);
  if(p.valid){
   const k=p.singularity;rows.push(['Singularity state',k.state],['Jacobian condition κ₂',fmt(k.condition)],['Transmission quality',fmt(k.quality*100)+' %'],['Distance to critical',fmt(k.distanceDeg)+'° collineariteit'],['Jacobian gain σmax',fmt(k.gain)+' mm/rad'],['MECHANICAL',''],['Arm A / B angle',fmt(p.armAngleA*180/Math.PI)+'° / '+fmt(p.armAngleB*180/Math.PI)+'°'],['Minimum arm clearance',fmt(p.collision.minima.arm)+' mm'],['Minimum frame clearance',fmt(p.collision.minima.frame)+' mm'],['Minimum total clearance',fmt(p.clearance)+' mm'],['Closest components',p.collision.closest.join(' / ')],['Arm A Z deflection',fmt(structure.arms.A.vertical,4)+' mm ESTIMATE'],['Arm B Z deflection',fmt(structure.arms.B.vertical,4)+' mm ESTIMATE'],['Elastic tube XY error',fmt(structure.errorXY,5)+' mm ESTIMATE'],['Total pen-position error','NOT CALCULATED']);
  }
  rows.push(['DRIVE · ESTIMATE','']);
  for(const key of ['A','B','C'])if(drive[key]){const m=drive[key];rows.push(['Motor '+key+' torque state',m.utilisation===null?'UNKNOWN':m.utilisation>100?'OVERLOAD · ESTIMATE':'REQUIRES VALIDATION'],['Motor '+key+' required',fmt(m.required,4)+' Nm'],['Motor '+key+' available',m.available===null?m.curveState:fmt(m.available,4)+' Nm'],['Motor '+key+' utilisation / SF',m.utilisation===null?'NOT CALCULATED':fmt(m.utilisation,1)+' % / '+fmt(m.safetyFactor)],['Belt '+key+' speed / ratio',fmt(m.beltSpeed,4)+' m/s · '+fmt(m.ratio)+':1']);}
  $('live-data').innerHTML=rows.map(([label,value])=>value?'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>':'<h3>'+esc(label)+'</h3>').join('');
  $('live-check').className='check '+(s.fault||!s.safe||p.singularity?.state==='CRITICAL'?'bad':p.singularity?.state==='CAUTION'?'caution':'');
  $('live-check').textContent=s.fault?'Interlock: '+s.fault+' · laatste toegestane pose behouden':!s.safe?p.issues.join(' · '):p.singularity.state+' · keten sluit · '+(p.singularity.state==='SAFE'?'gunstige lokale transmissie':'verlies aan XY-overdracht; forward krukprofiel kan doorlopen')+' · vrijloop getoetst aan '+g.clearance+' mm';
  $('point-count').textContent=s.trace.length.toLocaleString('nl-BE')+' spoorpunten';
 }
}
window.MotioUI={UIController};
})();
