(function () {
'use strict';
// Ordered mounting groups refer to the same BOM ids carried by model bodies.
const steps=[
 [
  "Bovenplaat voorbereiden",
  [
   "BASE"
  ],
  "Boor Ø22,5 en per motor 4× Ø3,6 op 31 × 31. Leg de bovenplaat op hoge werksteunen. Onderzijde blijft bereikbaar."
 ],
 [
  "Vlakke verstevigingsplaatjes",
  [
   "REINF"
  ],
  "Leg de drie stalen plaatjes boven op het MDF. Lijn de openingen uit. De motor komt rechtstreeks tegen de MDF-onderkant, zonder beugel of afstandbus."
 ],
 [
  "Motoren rechtstreeks onder de plaat",
  [
   "MOTOR"
  ],
  "Breng de drie motoren van onderaf omhoog. Centreerrand Ø22 door Ø22,5; montagevlak raakt z=0. Assen steken 24 ±1 mm vanaf dit vlak omhoog."
 ],
 [
  "Motoren met M3×10 vastzetten",
  [
   "MOTOR-FIX"
  ],
  "Leg eerst de 1 mm dikke brede ringen op staal; steek daarna de motorbouten van boven in. Bij 4 mm MDF + 1,5 mm staal + 1 mm ring grijpt 3,5 mm draad in de motor. Maximaal 4,5 mm. Werkelijke stapel meten, licht en kruislings vastzetten."
 ],
 [
  "Plateau-naaf los voorbereiden",
  [
   "HUB-C"
  ],
  "Naaf C eerst los boven de machine voorbereiden. Gespleten boring Ø5 en vier M4-gaten op 16 × 16. De centreerrand Ø14 wijst omlaag. Laat beide klembouten los. Geen extra as of flens."
 ],
 [
  "Plateau op losse naaf",
  [
   "PL"
  ],
  "Leg de 4 mm MDF-schijf op de naaf. De vier gaten en de centrale Ø5,6-doorvoer zijn vooraf gemaakt; verzink de koppen passend en vlak."
 ],
 [
  "Plateau aan naaf vastschroeven",
  [
   "PL-FIX"
  ],
  "Steek vier verzonken M4×10 van boven in de getapte aluminiumnaaf. Ze grijpen 6 mm in; geen moeren nodig. Controleer vlakke koppen vóór papier."
 ],
 [
  "Plateau-eenheid op motor C",
  [
   "INSTALL-C"
  ],
  "Laat plateau en naaf samen recht over motoras C zakken. Onderkant plateau z=22; naaflichaam z=14…22 met centreerrand z=12…14. Ook op minimumas 23 mm is de volledige 10 mm boring gevuld. Houd op hoogte terwijl je borgt."
 ],
 [
  "Klemnaaf C vastzetten",
  [
   "HUB-LOCK-C"
  ],
  "Draai de twee meegeleverde M4-klembouten met een 3 mm inbus beurtelings vast. Zij sluiten de boring om de ronde as; ze raken de as niet. De sleutel kan onder de schijf. Geen axiale voorspanning op motorlagers. Test omkeerbelasting en slingering zonder papier."
 ],
 [
  "Kruknaaf A voorbereiden",
  [
   "HUB-A"
  ],
  "Bouw de onderste kruk als losse eenheid op. De metalen Ø5-naaf draagt de asverbinding; de vlakke kruk wordt ertegen geschroefd."
 ],
 [
  "Geprinte PETG-kruk A",
  [
   "K-A"
  ],
  "Plaats de 6 mm geprinte kruk op naaf A. Centrale Ø5,6-doorvoer en vier Ø4,4-gaten op vierkante steek 16 × 16 moeten vrij blijven."
 ],
 [
  "Kruk A aan naaf vastschroeven",
  [
   "K-FIX-A"
  ],
  "Vier M4×12 met 0,5 mm ringen; 5,5 mm inschroefdiepte. Doe dit los, met alle koppen bereikbaar. Licht en kruislings vastzetten; PETG niet indrukken. Licht en kruislings vastzetten; PETG niet indrukken."
 ],
 [
  "Kruk A op motoras",
  [
   "INSTALL-A"
  ],
  "Laat de complete eenheid over as A zakken: naaflichaam z=7…15 met de centreerrand omlaag z=5…7; kruk z=15…21. De naaf staat vrij van de centreerrand en de motorboutkoppen."
 ],
 [
  "Klemnaaf A vastzetten",
  [
   "HUB-LOCK-A"
  ],
  "Draai beide tangentiële M4-klembouten vanaf hun vrije zijden beurtelings vast. De naaf klemt rondom de ronde motoras. Naafklemming met wisselkoppel fysiek testen."
 ],
 [
  "Kruknaaf B voorbereiden",
  [
   "HUB-B"
  ],
  "Bereid de tweede eenheid op dezelfde manier los voor. De montagehoogte is hoger om kruisende krukken vrij te houden."
 ],
 [
  "Geprinte PETG-kruk B",
  [
   "K-B"
  ],
  "Leg kruk B op naaf B; zelfde vlakke krukuitvoering en gaten als A."
 ],
 [
  "Kruk B aan naaf vastschroeven",
  [
   "K-FIX-B"
  ],
  "Vier M4×12 met 0,5 mm ringen. Alle bouten zijn bereikbaar vóór montage op motor."
 ],
 [
  "Kruk B op motoras",
  [
   "INSTALL-B"
  ],
  "Laat de eenheid op B zakken: naaflichaam z=16…24, centreerrand z=14…16, kruk z=24…30. De minimale motoras eindigt op z=23: 9 mm overlap, waarvan 7 mm in het naaflichaam. De klemzone blijft volledig op de as. Geen verlengas."
 ],
 [
  "Klemnaaf B vastzetten",
  [
   "HUB-LOCK-B"
  ],
  "Houd de eenheid op de opgegeven hoogte en draai de twee M4-klembouten gelijkmatig vast. Tussen de twee vlakke krukken blijft 3 mm nominale vrije hoogte."
 ],
 [
  "Getrapte elleboogposten",
  [
   "E-A",
   "E-B"
  ],
  "Steek de onderste M6-einden van boven in de krukken. De Ø10-schouders rusten echt op het PETG; de onderste M6-draad is nu 13 mm lang. De verschillende hoogtes sluiten aan op de twee armlagen."
 ],
 [
  "Elleboogposten onderaan borgen",
  [
   "ELBOW-LOW"
  ],
  "Breng de M6-ringen en moeren van onder de krukuiteinden aan. Hier is plaats voor de sleutel, boven de bovenplaat. Doe dit vóór de armen."
 ],
 [
  "Onderste arm A",
  [
   "L-A"
  ],
  "Laat het kleine lageroog over de post zakken. Aanslag in het lageroog ondersteunt straks de buitenring; de post blijft vrij in de onderzijde van het oog."
 ],
 [
  "Ellebooglager A",
  [
   "608-JOINT-A"
  ],
  "Breng 608 van boven in het oog rond Ø8-journal. Buitenring tegen aanslag; definitieve lichte perspassing / lagerborging op proefstuk bepalen."
 ],
 [
  "Penlager A",
  [
   "6804-A"
  ],
  "Breng 6804 van boven tot de aanslag in het grote armuiteinde. Houd de centrale asboring vrij."
 ],
 [
  "Bus tussen penlagers",
  [
   "SP-P"
  ],
  "Plaats de gesloten bus op de binnenring van het onderste penlager voordat arm B wordt geplaatst."
 ],
 [
  "Bovenste arm B",
  [
   "L-B"
  ],
  "Plaats de bovenste arm; groot oog boven de bus en klein oog rond post B. Beide armen moeten onafhankelijk draaien."
 ],
 [
  "Ellebooglager B",
  [
   "608-JOINT-B"
  ],
  "Plaats de tweede 608 van boven tot de aanslag."
 ],
 [
  "Penlager B",
  [
   "6804-B"
  ],
  "Laat de tweede 6804 op de binnenringbus rusten. De buitenring zit op de aanslag in arm B."
 ],
 [
  "Ellebooglagers opsluiten",
  [
   "ELBOW-FIX"
  ],
  "Schuif de stalen bussen op de bovenste M6-einden, daarna ringen en borgmoeren. De klemkracht loopt door de binnenringen en Ø10-postschouders. Armogen vrij laten draaien."
 ],
 [
  "Holle penas",
  [
   "P"
  ],
  "Steek de holle Ø20/13-penas van boven door de penlagers en bus. De gladde journals passen in de lagers. Draadposities M20×1 zijn vooraf gemaakt."
 ],
 [
  "Penas borgen",
  [
   "P-LOCK"
  ],
  "Draai de dunne M20×1-moeren vanaf onder en boven op de passende posities. Ze raken alleen binnenringen; geen klemkracht op de armogen."
 ],
 [
  "Penhouder boven de armen",
  [
   "PEN"
  ],
  "Schroef de losse, vooraf getapte houder van boven op de bovenste 8 mm M20×1 van de holle penas. De opening van de klemschroef wijst naar buiten."
 ],
 [
  "Drukpad via centrale opening",
  [
   "PAD"
  ],
  "Laat het pad eerst centraal door de vrije penopening zakken en schuif het daarna naar buiten in de binnenste zijkamer. Het pad hoeft niet door het M4-schroefgat. De penbus en pen zijn nog niet geplaatst."
 ],
 [
  "Gesleufde penbus",
  ["BUSH"],
  "Laat de bus van boven in de houder zakken, met de sleuf naar het drukpad. De bovenflens rust op de bovenkant van de houder."
 ],
 [
  "Handschroef en knop",
  [
   "CLAMP-SCREW",
   "KNOB"
  ],
  "Draai de M4-schroef vanaf de zijkant in het getapte gat. Plaats de knop op de schroefkop. De klem zit toegankelijk boven de bovenste arm."
 ],
 [
  "Papier",
  [
   "PAPER"
  ],
  "Controleer eerst vrijloop en vlakke boutkoppen. Centreer dan papier op de schijf."
 ],
 [
  "Tekenpen",
  [
   "PEN-TOOL"
  ],
  "Laat de pen van boven door houder en holle as zakken tot de punt op het papier rust. Alleen handvast klemmen; werkelijke penlengte controleren."
 ],
 [
  "MDF-box sluiten",
  [
   "BOTTOM",
   "WALL-FB",
   "WALL-LR"
  ],
  "Stel eerst alle verbindingen af. Lijm de wanden haaks en houd de bodem voor onderhoud afneembaar. Meet MDF-doorbuiging bij echte motor- en penlast voordat je gaat tekenen."
 ]
].map(([title,mounts,instruction])=>({title,mounts,instruction}));
const installations={unitA:'INSTALL-A',unitB:'INSTALL-B',unitC:'INSTALL-C'};
function stageOf(part){
 const mount=part.bom==='608'&&part.id.startsWith('joint')?'608-JOINT-'+part.id.slice(-1):part.bom==='6804'?'6804-'+part.id.slice(-1):part.mount;
 return steps.findIndex(s=>s.mounts.includes(mount));
}
function isCurrent(part,step){return stageOf(part)===step||steps[step].mounts.includes(installations[part.assemblyGroup]);}
const remaining=(progress,start=.22,end=.90)=>{const t=Math.max(0,Math.min(1,(progress-start)/(end-start)));return 1-t*t*(3-2*t);};
function offset(part,step,progress){
 const out={x:0,y:0,z:0},install=steps.findIndex(s=>s.mounts.includes(installations[part.assemblyGroup]));
 if(install>=0&&step<=install)out.z=45*(step===install?remaining(progress):1);
 if(stageOf(part)!==step)return out;
 const move=(d,a,b)=>d*remaining(progress,a,b),radial=d=>{out.x+=Math.cos(part.angle||0)*d;out.y+=Math.sin(part.angle||0)*d;};
 if(part.id==='box-bottom'){out.z-=move(30);return out;}
 if(part.id.startsWith('box-')){out.x+=move(part.id==='box-left'?-45:part.id==='box-right'?45:0);out.y+=move(part.id==='box-back'?-45:part.id==='box-front'?45:0);return out;}
 if(part.bom==='MOTOR'){out.z-=move(50);return out;}
 if(part.axis==='x'){radial(move(22)*(part.approachSign||1));return out;}
 if(part.id==='clampPad'){out.x-=move(3,.6,.9);out.z+=move(25,.22,.6);return out;}
 if(part.id==='clampKnob'){radial(move(30));return out;}
 if(part.id.endsWith('-1')&&part.id.startsWith('elbow')||part.id==='penShoulder'){out.z-=move(6);return out;}
 if(part.id.endsWith('-washer')){out.z+=move(15,.22,.48);return out;}
 if(part.id.endsWith('-head')||part.id.endsWith('-stem')){out.z+=move(30,.50,.9);return out;}
 out.z+=move(part.approach??35);return out;
}
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class AssemblyGuide {
 constructor(sim){
  this.sim=sim;this.step=0;this.active=false;this.duration=5000;
  this.renderer=new window.MotioSpatial.SpatialRenderer($('assembly-canvas'),()=>{});this.renderer.zoom=.88;
  this.preview=new window.MotioSpatial.SpatialRenderer($('assembly-part-canvas'),()=>{});
  $('assembly-prev').addEventListener('click',()=>this.go(this.step-1));
  $('assembly-next').addEventListener('click',()=>this.go(this.step+1));
  $('assembly-replay').addEventListener('click',()=>this.replay());
  this.replay();
 }
 open(){this.active=true;this.replay();}
 close(){this.active=false;this.startedAt=null;}
 go(step){if(step<0||step>=steps.length)return;this.step=step;this.replay();}
 replay(){
  const g=this.sim.geometry,q={A:g.phaseA*Math.PI/180,B:g.phaseB*Math.PI/180,C:g.phaseC*Math.PI/180};
  this.schematic=!window.MotioKinematics.solve(g,q).valid;
  // This independent, fixed pose never changes live drawing state.
  this.model={geometry:g,pose:window.MotioBOM.referencePose(g),q,trace:[]};
  this.parts=window.MotioGeometry.bodies(g,this.model.pose);
  this.current=this.parts.filter(p=>stageOf(p)<=this.step&&isCurrent(p,this.step));
  this.renderer.resetCamera();this.renderer.zoom=.88;
  const mount=steps[this.step].mounts[0];
  this.view=null;
  if(/HUB|K-FIX|PL-FIX|INSTALL/.test(mount)){
   const key=mount.endsWith('B')?'B':mount.endsWith('C')||mount==='PL-FIX'?'C':'A',host=this.parts.find(p=>p.id==='hub'+key),shift=offset(host,this.step,1);
   this.view={focus:{x:host.x,y:host.y,z:host.z+shift.z},width:key==='C'?270:160,height:170,axis:key};
   this.renderer.yaw=Math.PI/2-(this.model.q[key]+Math.PI/4);this.renderer.pitch=.32;
  }
  this.preview.resetCamera();
  // One complete example of each new component type, separated for inspection.
  const groups=[...new Set(this.current.map(p=>p.bom))].map(bom=>{
   const first=this.current.find(p=>p.bom===bom),parts=this.current.filter(p=>p.bom===bom&&p.instance===first.instance);
   return {parts,bounds:window.MotioGeometry.bounds(parts)};
  });
  const gap=Math.max(4,...groups.map(g=>g.bounds.w*.1));let cursor=0;
  this.previewParts=groups.flatMap(({parts,bounds:b})=>{
   const dx=cursor+b.w/2-b.x,dy=-b.y;cursor+=b.w+gap;
   return parts.map(p=>p.shape==='beam'?{...p,z:p.z-b.z,a:{x:p.a.x+dx,y:p.a.y+dy},b:{x:p.b.x+dx,y:p.b.y+dy}}:{...p,x:p.x+dx,y:p.y+dy,z:p.z-b.z});
  });
  this.progress=0;this.startedAt=null;this.lastRender=-Infinity;this.previewSize='';this.updateText();
 }
 updateText(){
  const item=steps[this.step],g=this.sim.geometry,catalog=window.MotioBOM.create(g);
  const instruction=item.instruction.replaceAll('{dek}',g.base.thickness).replaceAll('{wand}',g.box.wall).replaceAll('{plateau}',g.paper.thickness);
  $('assembly-counter').textContent='Stap '+(this.step+1)+' van '+steps.length;
  $('assembly-camera-hint').textContent=(this.view?'Detail '+this.view.axis+' · scroll uit voor de overige onderdelen. ':'')+'Sleep: draaien · scroll: zoom · pijltjestoetsen: draaien';
  $('assembly-title').textContent=item.title;$('assembly-instruction').textContent=instruction+(this.schematic?' Deze configuratie sluit de armketen niet. Het armvoorbeeld is schematisch; herstel de bouwgeometrie voor een geldige opbouw.':'');
  $('assembly-progress').max=steps.length;$('assembly-progress').value=this.step+1;
  $('assembly-prev').disabled=this.step===0;$('assembly-next').disabled=this.step===steps.length-1;
  const entries=catalog.filter(r=>this.current.some(p=>p.bom===r.id));
  $('assembly-parts').innerHTML=entries.map(r=>{
   const count=new Set(this.current.filter(p=>p.bom===r.id).map(p=>p.instance)).size;
   return '<div class="assembly-part"><h3>'+esc(r.name)+'</h3><dl><dt>Aantal</dt><dd>'+count+' in deze stap · '+r.qty+' totaal</dd><dt>Afmetingen</dt><dd>'+esc(r.dimensions)+'</dd><dt>Materiaal</dt><dd>'+esc(r.material)+'</dd><dt>Uitvoering</dt><dd>'+esc(r.method)+'</dd></dl><details><summary>Montagedetails en aannames</summary><p class="hint">'+esc(r.spec)+'</p></details></div>';
  }).join('');
  const samples=catalog.filter(r=>this.previewParts.some(p=>p.bom===r.id));
  $('assembly-part-caption').textContent='Los getoond · '+samples.map(r=>r.name).join(' / ');
  $('assembly-reference').hidden=!item.mounts.includes('MOTOR');
  $('assembly-canvas').setAttribute('aria-label','Montageanimatie · stap '+(this.step+1)+' van '+steps.length+' · '+item.title+'. '+instruction);
  $('assembly-part-canvas').setAttribute('aria-label','Uitvergrote losse onderdelen: '+samples.map(r=>r.name+' · '+r.dimensions+' · '+r.material).join('; '));
 }
 render(now){
  if(!this.active||now-this.lastRender<1000/30)return;this.lastRender=now;
  if(this.startedAt===null)this.startedAt=now;
  this.progress=Math.min(1,Math.max(0,(now-this.startedAt)/this.duration));
  this.renderer.render(this.model,false,'assembly',{step:this.step,progress:this.progress,parts:this.parts,view:this.view});
  const rect=$('assembly-part-canvas').getBoundingClientRect(),size=rect.width+','+rect.height;
  if(size!==this.previewSize){this.preview.render(this.model,false,'assembly',{step:this.step,progress:1,parts:this.previewParts,preview:true});this.previewSize=size;}
 }
}
window.MotioAssembly={AssemblyGuide,steps,stageOf,isCurrent,offset};
})();
