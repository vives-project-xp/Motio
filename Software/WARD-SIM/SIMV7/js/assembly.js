(function () {
'use strict';
// Ordered mounting groups refer to the same BOM ids carried by model bodies.
const steps=[
 {
  "title": "Bovenplaat voorbereiden",
  "mounts": [
   "BASE"
  ],
  "instruction": "Lasersnij de 6 mm MDF-bovenplaat met motoropeningen en ribslots. Meet de werkelijke plaatdikte vóór montage."
 },
 {
  "title": "Twee houten ribben",
  "mounts": [
   "RIB"
  ],
  "instruction": "Steek de 6 mm tanden door de bovenplaat, bovenzijde vlak. Verlijm ribben op y=140 en 240 en later tegen de zijwanden."
 },
 {
  "title": "Motoren onder de plaat",
  "mounts": [
   "MOTOR"
  ],
  "instruction": "Motorflens tegen de MDF-onderzijde. Centreerrand vrij in Ø22,5; assen zijn Ø5 × 24 ±1. Houd de onderzijde bereikbaar."
 },
 {
  "title": "Motoren vastzetten",
  "mounts": [
   "MOTOR-FIX"
  ],
  "instruction": "12× M3×10 met brede Ø9×0,8-ringen. 10−6−0,8=3,2 mm draad in maximaal 4,5 mm diepe gaten. Licht kruislings vastzetten."
 },
 {
  "title": "Naaf C voorbereiden",
  "mounts": [
   "HUB-C"
  ],
  "instruction": "Pololu 1998: Ø19×5, vier M3 op steekcirkel Ø12,7. Laat de ene radiale stelschroef los."
 },
 {
  "title": "Plateau op naaf C",
  "mounts": [
   "PL"
  ],
  "instruction": "Leg 6 mm MDF op naaf. Maak na lasersnijden vier 90° verzinkingen passend bij de echte M3-koppen."
 },
 {
  "title": "Plateau vastschroeven",
  "mounts": [
   "PL-FIX"
  ],
  "instruction": "Vier verzonken M3×10; 4 mm draad in de naaf. Koppen vlak onder papier."
 },
 {
  "title": "Plateau-eenheid op as C",
  "mounts": [
   "INSTALL-C"
  ],
  "instruction": "Samen recht omlaag schuiven. Naaf z=15…20, plateau z=20…26. De maximale as van 25 blijft 1 mm onder papier."
 },
 {
  "title": "Naaf C borgen",
  "mounts": [
   "HUB-LOCK-C"
  ],
  "instruction": "Eén meegeleverde M3-stelschroef met 1,5 mm inbus radiaal aandraaien. Houd hoogte vast, test slip en slingering."
 },
 {
  "title": "Naaf A voorbereiden",
  "mounts": [
   "HUB-A"
  ],
  "instruction": "Bereid de onderste kruk los op de werkbank voor; gebruik Pololu 1998, geen geprinte motorasklem."
 },
 {
  "title": "PLA-kruk A",
  "mounts": [
   "K-A"
  ],
  "instruction": "De vlakke kruk is 6 mm dik. Vier Ø3,4-gaten op steekcirkel Ø12,7 en centrale Ø5,6 moeten open zijn."
 },
 {
  "title": "Kruk A aan naaf",
  "mounts": [
   "K-FIX-A"
  ],
  "instruction": "Vier M3×10 met standaard Ø7×0,5-ringen. 3,5 mm draad. Licht vastzetten, PLA niet indrukken."
 },
 {
  "title": "Kruk A op motor",
  "mounts": [
   "INSTALL-A"
  ],
  "instruction": "Naaf z=13…18, kruk z=18…24. Motorbouten blijven vrij. Niet op de motorcentreerrand laten zakken."
 },
 {
  "title": "Naaf A borgen",
  "mounts": [
   "HUB-LOCK-A"
  ],
  "instruction": "Eén radiale M3-stelschroef; markeer as/naaf en test omkeerbelasting zonder slip."
 },
 {
  "title": "Naaf B voorbereiden",
  "mounts": [
   "HUB-B"
  ],
  "instruction": "Zelfde naaf; de PLA-wortelboss overbrugt het hoogteverschil zonder verlengas."
 },
 {
  "title": "PLA-kruk B",
  "mounts": [
   "K-B"
  ],
  "instruction": "6 mm hoofdkruk plus 4 mm wortelboss. Bosszijde naar beneden in montage; bij printen juist omhoog."
 },
 {
  "title": "Kruk B aan naaf",
  "mounts": [
   "K-FIX-B"
  ],
  "instruction": "Vier M3×14 met 0,5 mm ringen. 10 mm PLA-wortel geeft 3,5 mm naafdraad."
 },
 {
  "title": "Kruk B op motor",
  "mounts": [
   "INSTALL-B"
  ],
  "instruction": "Naaf z=18…23, boss z=23…27, hoofdkruk z=27…33. De hele naaf zit op de minimale as van 23 mm."
 },
 {
  "title": "Naaf B borgen",
  "mounts": [
   "HUB-LOCK-B"
  ],
  "instruction": "Eén radiale stelschroef. Hoofdkrukken hebben 3 mm verticale tussenruimte; werkelijke hoogtes nameten."
 },
 {
  "title": "Standaard scharnierbouten",
  "mounts": [
   "ELBOW-BOLT-A",
   "ELBOW-BOLT-B"
  ],
  "instruction": "Steek M8×50 bij A en M8×60 bij B van ONDER met elk een Ø16×1,6-ring in de Ø8,4-krukgaten. Geen bewerkte metalen posten."
 },
 {
  "title": "PLA-afstandsbussen",
  "mounts": [
   "E-A",
   "E-B"
  ],
  "instruction": "Schuif de juiste bus over elke bout tot op de kruk. A is 16,5 mm en B 28,5 mm hoog; laatste 2 mm Ø12 bovenaan."
 },
 {
  "title": "Onderste arm A",
  "mounts": [
   "L-A"
  ],
  "instruction": "Plaats klein oog over bout A. Lagerogen hebben een onderste aanslag voor de buitenring."
 },
 {
  "title": "Ellebooglager A",
  "mounts": [
   "608-JOINT-A"
  ],
  "instruction": "608-2RS van boven in de zitting. Binnenring rust op de Ø12-top van de bus. Geen boutkracht gebruiken voor perspassing."
 },
 {
  "title": "Penlager A",
  "mounts": [
   "6804-A"
  ],
  "instruction": "61804-2RS / 6804 van boven in grote oog. Binnenring en doorvoer vrij houden."
 },
 {
  "title": "Bus tussen penlagers",
  "mounts": [
   "SP-P"
  ],
  "instruction": "Plaats Ø24/20,2×14 op de onderste binnenring vóór arm B."
 },
 {
  "title": "Bovenste arm B",
  "mounts": [
   "L-B"
  ],
  "instruction": "Plaats B boven de binnenringbus en over scharnierbout B. Armlagen z=44/65."
 },
 {
  "title": "Ellebooglager B",
  "mounts": [
   "608-JOINT-B"
  ],
  "instruction": "Plaats tweede 608 op bus B en op de aanslag in de arm."
 },
 {
  "title": "Penlager B",
  "mounts": [
   "6804-B"
  ],
  "instruction": "Plaats tweede 6804; beide armen draaien onafhankelijk."
 },
 {
  "title": "Scharnieren borgen",
  "mounts": [
   "ELBOW-FIX"
  ],
  "instruction": "PLA-bus Ø12/8,4×4,5, M8-ring en DIN985-borgmoer op elke bout. Alleen binnenringstapel spelingvrij klemmen. Houd boutkop tegen, arm moet vrij blijven."
 },
 {
  "title": "Holle PLA-penas van onder",
  "mounts": [
   "P"
  ],
  "instruction": "Steek de penas van ONDER door beide penlagers en middenbus. De geïntegreerde flens stopt tegen de onderste binnenring. Geen schroefdraad."
 },
 {
  "title": "Bovenste binnenringbus",
  "mounts": [
   "SP-P-TOP"
  ],
  "instruction": "Schuif Ø24/20,2×9,5 van boven op de bovenste binnenring."
 },
 {
  "title": "Penhouder op penas",
  "mounts": [
   "PEN"
  ],
  "instruction": "Schuif de onderste Ø20,2-boring over de penas tot de houder op de bovenbus rust. Geen lagervoorspanning."
 },
 {
  "title": "Metalen moeren in de houder",
  "mounts": [
   "M3-NUT",
   "M4-NUT"
  ],
  "instruction": "Druk M3-moer in klemoor en M4-moer in radiaal zijvak. Beide zeskantvakken zijn open vanaf de buitenkant."
 },
 {
  "title": "Penhouder vastklemmen",
  "mounts": [
   "COLLAR-BOLT"
  ],
  "instruction": "Steek M3×20 tangentieel door beide oren in de M3-moer. Licht sluiten; test of penas en houder axiaal vast blijven zonder de lagers te klemmen."
 },
 {
  "title": "PLA-drukblok",
  "mounts": [
   "PAD"
  ],
  "instruction": "Breng het blok via de centrale opening naar de radiale kamer. Penbus en pen zijn nog niet geplaatst."
 },
 {
  "title": "Penbus van boven",
  "mounts": [
   "BUSH"
  ],
  "instruction": "Laat bus met flens van boven zakken, sleuf naar drukblok. Meet de echte pen en pas boring zo nodig aan."
 },
 {
  "title": "Handschroef en knop",
  "mounts": [
   "CLAMP-SCREW",
   "KNOB"
  ],
  "instruction": "M4×25 door metalen zijmoer tot aan het drukblok. 7 mm zeskantkop in PLA-knop, met druppel lijm borgen. Alleen handvast."
 },
 {
  "title": "Papier",
  "mounts": [
   "PAPER"
  ],
  "instruction": "Na controle van boutkoppen, plateauhoogte en slingering papier Ø210 uit A4 aanbrengen."
 },
 {
  "title": "Tekenpen",
  "mounts": [
   "PEN-TOOL"
  ],
  "instruction": "Pen van boven door houder en holle as. Punt licht op papier, handvast klemmen. Begin met lage penkracht."
 },
 {
  "title": "Boxwanden en bodem",
  "mounts": [
   "WALL-FB",
   "WALL-LR",
   "BOTTOM"
  ],
  "instruction": "Wanden haaks tegen dek/ribben verlijmen, bodem met tape afneembaar sluiten. Box 358×404×112. Controleer temperatuur, speling en doorbuiging vóór tekenen."
 }
];
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
 if(part.bom==='P'){out.z-=move(35);return out;}
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
