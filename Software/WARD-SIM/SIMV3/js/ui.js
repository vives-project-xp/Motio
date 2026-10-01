(function () {
'use strict';
const {DEFAULT_CONFIG,DESIGN,BOM}=window.MotioMechanics;
const $=id=>document.getElementById(id);
const fields={'rpm-a':'rpmA','rpm-b':'rpmB','rpm-c':'rpmC','phase-a':'phaseA','phase-b':'phaseB','radius-a':'radiusA','radius-b':'radiusB','length-a':'lengthA','length-b':'lengthB'};
function download(name,content,type) {
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function report(a) {
 const item=(value,label)=>`<div><strong>${value}</strong><small>${label}</small></div>`;
 return `<div class="report-grid">${item(a.failures+' / '+a.samples,'afgekeurde rasterstanden')}${item(a.minSin.toFixed(3),'kleinste |sin γ|, grens 0,25')}${item(a.minGamma.toFixed(1)+'…'+a.maxGamma.toFixed(1)+'°','hoek tussen koppelarmen')}${item(a.minClearance.toFixed(1)+' mm','minimale gemodelleerde vrijloop')}${item(a.maxForce.toFixed(2)+' N','armkracht bij 2 N penlast')}${item(a.maxTorqueA.toFixed(3)+' / '+a.maxTorqueB.toFixed(3)+' Nm','vereist uitgangskoppel A / B')}${item(a.maxTorqueC.toFixed(3)+' Nm','vereist C bij 2 N penlast')}${item(a.deflection.toFixed(3)+' mm','kokerbuiging bij 5 N, ideaal')}${item((a.buckling/1000).toFixed(1)+' kN','ideale Eulerkniklast koker')}${item(a.closureAll?'ALLE HOEKEN':'NIET ALLE HOEKEN','analytische sluiting')}</div><p>Analytische grens |sin γ| ≥ ${a.sinBound.toFixed(3)}. Rasterbereik P: X ${a.minX.toFixed(1)}…${a.maxX.toFixed(1)}, Y ${a.minY.toFixed(1)}…${a.maxY.toFixed(1)} mm. ${a.firstIssue?'Eerste fout: '+a.firstIssue+'.':''}</p>`;
}
class UIController {
 constructor(sim,spatial) {
  this.sim=sim;this.spatial=spatial;this.view='simulator';this.mode='2d';this.exploded=false;this.speedMultiplier=1;
  for(const id of ['power','home','pen','play','pause','stop','reset','clear'])$(id+'-btn').addEventListener('click',()=>{
   const method={power:'power',home:'home',pen:'togglePen',play:'play',pause:'pause',stop:'stop',reset:'reset',clear:'clearTrace'}[id];sim[method]();this.render();
  });
  $('speed').addEventListener('input',e=>{this.speedMultiplier=[.25,.5,1,2,5][Number(e.target.value)];$('speed-value').textContent=this.speedMultiplier+'×';});
  for(const id of Object.keys(fields))$(id).addEventListener('change',()=>this.applyInputs());
  $('preset').addEventListener('change',e=>{
   const profiles={v2:{rpmA:-6.486,rpmB:-4.528,rpmC:-4,phaseA:0,phaseB:0},flower:{rpmA:-4,rpmB:3,rpmC:-1.5,phaseA:90,phaseB:15},slow:{rpmA:-1,rpmB:-.8,rpmC:-.5,phaseA:45,phaseB:90},stationary:{rpmA:-4,rpmB:-3,rpmC:0,phaseA:90,phaseB:0}};
   this.populate({...sim.config,...profiles[e.target.value]});this.applyInputs();
  });
  $('restore-btn').addEventListener('click',()=>{this.populate(DEFAULT_CONFIG);$('preset').value='v2';this.applyInputs();});
  for(const view of ['simulator','mechanical','components'])$('nav-'+view).addEventListener('click',()=>this.navigate(view));
  for(const mode of ['2d','3d'])$('mode-'+mode).addEventListener('click',()=>{
   this.mode=mode;for(const m of ['2d','3d']){$('mode-'+m).classList.toggle('active',mode===m);$('mode-'+m).setAttribute('aria-pressed',String(mode===m));}
   $('mechanical-diagram').hidden=mode!=='2d';$('spatial-wrap').hidden=mode!=='3d';
  });
  $('exploded').addEventListener('change',e=>{this.exploded=e.target.checked;$('section-diagram').innerHTML=window.MotioRenderers.sectionSVG(this.exploded);});
  for(const mode of ['iso','top','side'])$('camera-'+mode).addEventListener('click',()=>spatial.resetCamera(mode));
  $('export-svg').addEventListener('click',()=>download('MOTIO-SimV3-mechanical.svg',window.MotioRenderers.mechanismSVG(sim,true),'image/svg+xml;charset=utf-8'));
  $('export-bom').addEventListener('click',()=>{
   const rows=[['ID','Aantal','Onderdeel','Type / maat','Specificatie','Functie / reden'],...BOM];
   download('MOTIO-SimV3-BOM.csv','\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8');
  });
  $('bom-body').innerHTML=BOM.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('');
  $('section-diagram').innerHTML=window.MotioRenderers.sectionSVG(false);this.refreshAudit();
 }
 populate(config){for(const [id,key] of Object.entries(fields))$(id).value=config[key];}
 applyInputs() {
  const config={};
  for(const [id,key] of Object.entries(fields)) {
   const input=$(id),v=Number(input.value),finite=input.value!==''&&Number.isFinite(v)?v:DEFAULT_CONFIG[key];
   config[key]=Math.max(Number(input.min),Math.min(Number(input.max),finite));input.value=config[key];
  }
  this.sim.configure(config);this.refreshAudit();
 }
 refreshAudit() {
  const a=this.sim.audit;
  $('scan-summary').innerHTML=`<strong>${a.failures===0?'✓':'⚠'} ${a.samples} standen · ${a.failures} afgekeurd</strong><p>Analytische sluiting: ${a.closureAll?'voor alle hoeken':'niet voor alle hoeken'}<br>Vrijloop ≥ ${a.minClearance.toFixed(1)} mm in raster<br>|sin γ| ≥ ${a.sinBound.toFixed(3)} analytisch</p>`;
  $('engineering-report').innerHTML=report(a);
 }
 navigate(view) {
  this.view=view;
  for(const name of ['simulator','mechanical','components']){$(name+'-view').hidden=name!==view;$('nav-'+name).classList.toggle('active',name===view);$('nav-'+name).setAttribute('aria-pressed',String(name===view));}
 }
 render() {
  const s=this.sim,p=s.pose;
  $('run-status').textContent=s.state;$('run-status').className='badge '+(s.fault||!s.safe?'danger':s.running?'ok':'warn');
  $('power-btn').textContent=s.powered?'Power off':'Power on';$('home-btn').disabled=!s.powered||s.homing||!s.safe;
  $('play-btn').disabled=!s.powered||!s.homed||s.homing||s.stopping||!s.safe||!!s.fault;$('pen-btn').disabled=$('play-btn').disabled;
  $('pen-btn').textContent=s.penDown?'Pen ↑ heffen':'Pen ↓ zakken';$('machine-message').textContent=s.message;
  const boundary=$('boundary-status');boundary.textContent=s.fault||!s.safe?'MECHANISCHE INTERLOCK':!s.insidePaper?'BUITEN PAPIER':!s.insideSafe?'BUITEN 20 mm MARGE':'PEN BINNEN MARGE';boundary.className='badge '+(s.fault||!s.safe?'danger':s.insideSafe?'ok':'warn');
  const rows=[['Tijd',s.time.toFixed(2)+' s']];
  for(const key of ['A','B','C']){rows.push(['As '+key+' hoek',(((s.q[key]*180/Math.PI)%360+360)%360).toFixed(1)+'°']);rows.push(['As '+key+' / motor RPM',(s.velocity[key]*60/TAU).toFixed(2)+' / '+(s.velocity[key]*60/TAU*DESIGN[key].ratio).toFixed(2)]);}
  rows.push(['Pen XY',s.penLocal?s.penLocal.x.toFixed(1)+', '+s.penLocal.y.toFixed(1)+' mm':'—'],['Pensnelheid',(s.penSpeed||0).toFixed(1)+' mm/s'],['Penversnelling',(s.penAcceleration||0).toFixed(1)+' mm/s²'],['Armhoek γ',p.valid?p.gamma.toFixed(1)+'°':'—'],['Vrijloop',p.valid?p.clearance.toFixed(1)+' mm':'—'],['Armkracht ≤',p.valid?p.force.toFixed(2)+' N':'—']);
  $('live-data').innerHTML=rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  const serial=p.valid&&(p.serialA<.08||p.serialB<.08);
  $('live-check').className='check '+(s.fault||!s.safe?'bad':'');$('live-check').textContent=s.fault?'Interlock: '+s.fault+' · laatste veilige pose behouden':!s.safe?p.issues.join(' · '):serial?'✓ Keten sluit. Kruk/arm bijna collineair: lokaal minder Cartesian bewegingsvrijheid; geen parallelle blokkering.':'✓ Keten sluit · branch vast · geen gemodelleerde botsing';
  $('point-count').textContent=s.trace.length.toLocaleString('nl-BE')+' spoorpunten';
 }
}
const {TAU}=window.MotioMath;
window.MotioUI={UIController};
})();
