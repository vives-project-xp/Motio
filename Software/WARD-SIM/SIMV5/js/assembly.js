(function () {
'use strict';
// Ordered mounting groups refer to the same BOM ids carried by model bodies.
const steps=[
 ['MDF-bovenplaat met voorbereide gaten',['BASE'],'Leg de MDF-bovenplaat van {dek} mm op werksteunen en houd de onderkant bereikbaar. De ronde asdoorvoeren en alle M4-doorvoeren zijn vooraf gemaakt; de animatie boort geen gaten.'],
 ['Geprinte motorbeugels',['BR'],'Breng de drie beugels van onderaf tegen de bovenplaat. Elke beugel heeft twee buitenliggende montageoren met vrije M4-gaten en vier M3-gaten voor de motor.'],
 ['Drie stappenmotoren',['MOTOR'],'Schuif elke motor van onderaf in zijn beugel. De as wijst omhoog; de centreerrand past in de vrije centrale opening.'],
 ['Motorbouten en sluitringen',['MOTOR-FIX'],'Leg de ringen op de vier M3-doorvoeren per beugel en steek de bouten erdoor. Alleen het uiteinde grijpt in het bestaande M3-schroefgat van de motor; maximaal 4,5 mm diep.'],
 ['Motorbeugels vastzetten',['BR-FIX'],'Steek de zes M4-bouten van boven door de voorbereide gaten in hout en montageoren. Breng de onderste ringen en moeren van onderaf aan. Deze verbindingen liggen buiten de voeten van de lagerhouders.'],
 ['Flexibele askoppelingen',['CP-A','CP-B','CP-C'],'Breng elke koppeling onder de bovenplaat eerst boven de motoras en schuif hem daarna omlaag over de as. De uitgangsboring blijft vrij. De twee radiale schroefgaten zijn fabrieksmatig aangebracht.'],
 ['Lagerhouders A en B voorbereiden',['H-A','H-B'],'Bouw deze houders eerst los van de machine op. De verhoogde weergave is de werkpositie. De twee lagerzittingen hebben een aanslag naar het midden en een borggroef aan de buitenzijde.'],
 ['Lagerhouder C voorbereiden',['H-C'],'Ook houder C wordt eerst los opgebouwd. De brede voet komt straks boven op het hout; alleen het smalle huis gaat door de centrale opening. Alle montagegaten zijn al aanwezig.'],
 ['Hoofdlagers in de losse houders',['608','6001'],'Breng elk onderste lager van onderaf en elk bovenste lager van bovenaf in zijn zitting, tot tegen de aanslag. Druk alleen op de buitenring. De koppelingen staan al op de motoren, buiten deze losse montage.'],
 ['Buitenringen van de lagers borgen',['BEARING-CLIPS'],'Breng de stalen binnenborgringen met een geschikte tang in de zichtbare groeven aan. Ze worden bij het insteken samengedrukt en veren in de groef uit. Aanslag en borgring houden de buitenring vast; dit zijn geen asborgingen.'],
 ['Onderste askragen vooraf plaatsen',['LOWER-LOCK'],'Schuif één gesloten askraag van onderaf tegen de binnenring van het onderste lager van elke losse houder. Houd hem daar tijdens het plaatsen van de houder. De aandrijfas gaat er later doorheen; de kraag hoeft nooit door een lager.'],
 ['Complete lagerhouders plaatsen',['H-INSTALL'],'Laat de drie complete houder-eenheden op de bovenplaat zakken. Lagers, borgringen en onderste askragen bewegen samen mee. Lijn de vrije M4-gaten uit; de motorbeugelbouten blijven buiten de voeten.'],
 ['Lagerhouders vastzetten',['H-FIX'],'Steek vier M4-bouten per voet van boven door de uitgelijnde gaten. Plaats de onderste ringen en moeren van onderaf. Ook bij C rust de voet boven op het hout.'],
 ['Aandrijfas A',['S-A'],'Schuif as A van boven door beide lagers en de vooraf geplaatste onderste askraag tot in koppeling A. Houd 1 mm tussen de beide aseinden. Het lokale vlak bij de kruk is zichtbaar.'],
 ['Aandrijfas B',['S-B'],'Schuif de langere as B van boven door de lagers en de onderste askraag tot in koppeling B. Houd 1 mm tussen de beide aseinden.'],
 ['Papierspindel C',['S-C'],'Schuif de stalen papierspindel van boven door de twee 6001-lagers en de onderste askraag tot in koppeling C. Het lokale vlak bovenaan is voor de plateauflens.'],
 ['Koppelingen borgen',['CP-FIX'],'Draai de stelschroeven radiaal in de bestaande schroefgaten van de metalen koppelingen. Ze grijpen op de motoras en uitgangsas. Er worden geen schroeven in de hoofdlagers gedraaid.'],
 ['Bovenste askragen plaatsen',['UPPER-LOCK'],'Schuif de bovenste askragen van boven over de assen tot tegen de binnenringen van de bovenste lagers. De onderste kragen zitten er al; geen enkele kraag gaat door een lager.'],
 ['Askragen vastzetten',['LOCK-FIX'],'Draai de radiale schroef van elke askraag vast op de as. De kleine gaten zitten in de kragen. Laat de lagers vrij draaien en stel de kragen zonder merkbare axiale voorspanning af.'],
 ['Plateauflens voorbereiden',['FL'],'Bekijk de losse geprinte flens: centrale asboring, vier boutgaten en een radiaal getrapt gat. Het brede buitendeel van dat gat neemt de messing inzet op; het smalle deel voert de stelschroef naar de as.'],
 ['Messing inzet in de plateauflens',['FL-INSERT'],'Plaats de M4-inzet in het reeds geprinte radiale opnamegat van de losse flens. Gebruik de inbouwmethode van het gekozen inzettype en laat de inzet afkoelen voordat de flens op de as gaat.'],
 ['Plateauflens op as C',['FL-INSTALL'],'Laat de flens met zijn inzet over as C zakken. Richt het radiale gat op het zichtbare vlak van de as.'],
 ['Plateauflens borgen',['FL-FIX'],'Draai de M4-stelschroef via de messing inzet tegen het vlak op as C. De schroef klemt tegen de buitenkant van de as: er hoort geen dwarsgat in de as. Test de klemming zonder het PETG te overbelasten.'],
 ['MDF-draaiplateau',['PL'],'Centreer de voorgeboorde MDF-schijf van {plateau} mm op de plateauflens en lijn de vier bevestigingsgaten uit.'],
 ['Draaiplateau vastzetten',['PL-FIX'],'Breng eerst de ringen en moeren zijdelings in de vrije ruimte onder de flens en houd ze uitgelijnd. Steek daarna de vier verzonken M4-bouten van boven in de gaten en moeren. De koppen liggen vlak met het hout.'],
 ['Rond papier',['PAPER'],'Leg het ronde papier in het midden van het plateau en zet het vlak vast. Houd de buitenste marge vrij.'],
 ['Krukken voorbereiden',['K-A','K-B'],'Bekijk de twee losse krukken. Elke naaf heeft een centrale asboring en een vooraf geprint radiaal opnamegat met een bredere kamer voor de messing M4-inzet.'],
 ['Messing inzetten in de kruknaven',['K-INSERT'],'Plaats één M4-inzet in het zichtbare opnamegat van elke losse naaf. Bouw de inzetten in volgens hun fabrikant en laat ze afkoelen. Er wordt geen gat door de naaf geboord.'],
 ['Krukken op de assen',['K-INSTALL'],'Schuif de krukken met hun inzetten van boven op de assen. Richt elk radiaal gat op het vlak van de betreffende as.'],
 ['Kruknaven borgen',['K-FIX'],'Draai elke stelschroef via de messing inzet tegen het zichtbare asvlak. De schroef gaat niet door de as; de verbinding draagt door klemming. Controleer de klemming op het prototype.'],
 ['Elleboogposten',['E'],'Plaats de stalen scharnierposten in de voorbereide gaten van de krukuiteinden. Het dunne uiteinde is voor de M6-borgmoer.'],
 ['Penarm A',['L-A'],'Plaats eerst de onderste arm A. Het kleine lageroog komt rond de scharnierpost en het grote lageroog boven het penpunt.'],
 ['Ellebooglager A',['608-JOINT-A'],'Plaats een 608-lager van boven in het kleine lageroog van arm A, rond de scharnierpost.'],
 ['Penlager A',['6804-A'],'Plaats het eerste 6804-lager in het grote lageroog van arm A.'],
 ['Afstandbus tussen penlagers',['SP-P'],'Laat de bus van boven op de binnenring van penlager A rusten. Arm B is nog niet geplaatst; zo hoeft de gesloten bus niet tussen twee al gemonteerde armen te worden gewrongen.'],
 ['Penarm B',['L-B'],'Plaats nu de bovenste arm B. Zijn grote lageroog komt boven de afstandbus; de onderste arm blijft vrij.'],
 ['Ellebooglager B',['608-JOINT-B'],'Plaats het tweede 608-ellebooglager in het kleine oog van arm B. Dit is hetzelfde lagertype als bij arm A.'],
 ['Penlager B',['6804-B'],'Plaats het tweede 6804-lager van boven in arm B. Zijn binnenring rust op de al geplaatste afstandbus.'],
 ['Elleboogscharnieren borgen',['ELBOW-FIX'],'Plaats de M6-sluitringen en borgmoeren van boven op de scharnierposten. Klem de draaiende armogen niet vast.'],
 ['Holle penas',['P'],'Steek de holle stalen as van boven door beide penlagers en de afstandbus. De centrale boring blijft open voor de tekenpen.'],
 ['Penas axiaal borgen',['P-LOCK'],'Breng de onderste borging van onderaf en de bovenste van bovenaf tegen de binnenringen. Beide armen moeten onafhankelijk kunnen draaien.'],
 ['Geprinte penhouder',['PEN'],'Breng de houder vanaf de zijkant onder de holle penas en schuif hem het laatste stukje omhoog. Richt de opening voor de klemschroef naar buiten.'],
 ['Centreerbus en zacht drukpad',['BUSH','PAD'],'Plaats de passende penbus in de houder en het zachte drukpad tussen de pen en de klemschroef.'],
 ['Klemschroef en draaiknop',['CLAMP-SCREW','KNOB'],'Breng de stalen klemschroef vanaf de zijkant aan. Plaats de geprinte knop op het uitstekende uiteinde.'],
 ['Tekenpen plaatsen',['PEN-TOOL'],'Laat de pen door de houder zakken tot de punt het papier raakt. Zet de klemschroef alleen met de hand vast.'],
 ['MDF-box sluiten',['BOTTOM','WALL-FB','WALL-LR'],'Gebruik MDF: bodem en bovenplaat {dek} mm, zijwanden {wand} mm. Sluit de box pas na het afstellen van de onderliggende verbindingen. Plaats bodem en wanden; maak de houtverbinding volgens het nog uit te werken bevestigingsplan.']
].map(([title,mounts,instruction])=>({title,mounts,instruction}));
const installations={housing:'H-INSTALL',flange:'FL-INSTALL',cranks:'K-INSTALL'};
function stageOf(part){
 const mount=part.bom==='608'&&part.id.startsWith('joint')?'608-JOINT-'+part.id.slice(-1):part.bom==='6804'?'6804-'+part.id.slice(-1):part.mount;
 return steps.findIndex(s=>s.mounts.includes(mount));
}
function isCurrent(part,step){return stageOf(part)===step||steps[step].mounts.includes(installations[part.assemblyGroup]);}
const remaining=(progress,start=.22,end=.90)=>{const t=Math.max(0,Math.min(1,(progress-start)/(end-start)));return 1-t*t*(3-2*t);};
function offset(part,step,progress){
 const out={x:0,y:0,z:0},install=steps.findIndex(s=>s.mounts.includes(installations[part.assemblyGroup]));
 if(install>=0&&step<=install)out.z=(part.assemblyGroup==='housing'?70:35)*(step===install?remaining(progress):1);
 if(stageOf(part)!==step)return out;
 const move=(distance,start,end)=>distance*remaining(progress,start,end),radial=distance=>{out.x+=Math.cos(part.angle||0)*distance;out.y+=Math.sin(part.angle||0)*distance;};
 if(part.id==='box-bottom'){out.z-=move(30);return out;}
 if(part.id.startsWith('box-')){out.x+=move(part.id==='box-left'?-45:part.id==='box-right'?45:0);out.y+=move(part.id==='box-back'?-45:part.id==='box-front'?45:0);return out;}
 if(part.bom==='BR'||part.bom==='MOTOR'){out.z-=move(50);return out;}
 if(part.bom.startsWith('CP-')&&part.mount!=='CP-FIX'){
  // Clear the motor shaft horizontally first, then lower onto it. The top stays below the deck.
  out.y+=move(40,.22,.58);out.z+=move(11,.58,.9);return out;
 }
 if(part.axis==='x'){radial(move(22,part.id.endsWith('-screw')?.50:.22,.9));return out;}
 if(part.id==='holder'){out.x+=move(40,.22,.6);out.z-=move(4,.6,.9);return out;}
 if(part.id==='clampKnob'||part.id==='clampPad'){radial(move(30));return out;}
 if(part.mount==='PL-FIX'){
  // Feed the nuts/washers into the narrow gap first; insert the bolts afterwards.
  if(part.id.endsWith('-washer')||part.id.endsWith('-nut'))radial(move(22,.22,.48));
  else out.z+=move(45,.5,.9);
  return out;
 }
 // Put a washer down first, insert its bolt, then fit the lower washer/nut from below.
 if(part.id.endsWith('-lower-washer')||part.id.endsWith('-nut')){out.z-=move(22,.62,.94);return out;}
 if(part.id.endsWith('-washer')){out.z+=move(part.mount==='MOTOR-FIX'?16:26,.22,.48);return out;}
 if(part.id.endsWith('-head')||part.id.endsWith('-stem')){out.z+=move(part.mount==='MOTOR-FIX'?20:45,.42,.78);return out;}
 if(part.id==='penShoulder'){out.z-=move(25);return out;}
 out.z+=move(part.approach??45);return out;
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
  const mount=steps[this.step].mounts[0],flange=mount.startsWith('FL'),crank=mount==='K-INSERT'||mount==='K-FIX',plate=mount==='PL-FIX';
  this.view=null;
  if(flange||crank||plate){
   const host=this.parts.find(p=>p.id===(flange||plate?'flange':'crankHubA')),shift=offset(host,this.step,1),angle=flange||plate?this.model.q.C+Math.PI/4:this.model.q.A+Math.PI/2;
   this.view={focus:{x:host.x,y:host.y,z:host.z+shift.z},width:140,height:155,axis:flange||plate?'C':'A'};
   this.renderer.yaw=Math.PI/2-angle;this.renderer.pitch=plate?.12:.42;
  }else if(['BR-FIX','H-FIX','CP-FIX','LOCK-FIX','BEARING-CLIPS','LOWER-LOCK','UPPER-LOCK','608'].includes(mount)){
   const host=this.parts.find(p=>p.id===(mount==='BR-FIX'?'motorA':mount==='CP-FIX'?'couplingA':'housingA')),shift=offset(host,this.step,1);
   this.view={focus:{x:host.x,y:host.y,z:mount==='BR-FIX'?-15:host.z+shift.z},width:160,height:190,axis:'A'};
   this.renderer.pitch=mount==='CP-FIX'?.18:.5;
   if(mount==='CP-FIX'||mount==='LOCK-FIX')this.renderer.yaw=Math.PI/2-this.model.q.A;
  }
  this.preview.resetCamera();
  if(flange||crank){this.preview.yaw=this.renderer.yaw;this.preview.pitch=.5;}
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
