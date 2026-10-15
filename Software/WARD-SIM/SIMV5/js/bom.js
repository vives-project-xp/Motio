(function () {
'use strict';
const headers=['Onderdeel','Aantal','Afmetingen','Materiaal','Specificatie / opmerking'],cache=new WeakMap();
const methods={wood:'Uit MDF maken',print:'3D-printen',buy:'Kopen',use:'Gebruiksonderdeel'};
const number=v=>Number(v.toFixed(2));
function referencePose(g){
 const q={A:g.phaseA*Math.PI/180,B:g.phaseB*Math.PI/180,C:g.phaseC*Math.PI/180},p=window.MotioKinematics.solve(g,q);
 // Invalid custom poses must not remove required parts from the BOM.
 return p.valid?p:{valid:true,q,a:{x:g.A.pivot.x+g.radiusA,y:g.A.pivot.y},b:{x:g.B.pivot.x+g.radiusB,y:g.B.pivot.y},pen:{x:g.paper.x,y:g.paper.y}};
}
function create(g) {
 if(cache.has(g))return cache.get(g);
 const parts=window.MotioGeometry.bodies(g,referencePose(g)),rows=[];
 const dims=id=>{const p=parts.find(b=>b.id===id);return p.shape==='box'?`${number(p.w)} × ${number(p.l)} × ${number(p.h)} mm`:`Ø${number(2*p.r)}${p.inner?'/'+number(2*p.inner):''} × ${number(p.h)} mm`;};
 const compound=bom=>{const instance=parts.find(p=>p.bom===bom).instance,b=window.MotioGeometry.bounds(parts.filter(p=>p.bom===bom&&p.instance===instance));return `${number(b.w)} × ${number(b.l)} × ${number(b.h)} mm`;};
 const add=(id,name,dimensions,material,method,spec)=>rows.push({id,qty:new Set(parts.filter(p=>p.bom===id).map(p=>p.instance)).size,name,dimensions,material,method:methods[method],spec});
 const printed='PETG · 3D-geprint',printNote='Voorlopige printkeuze; passing, printrichting en sterkte fysiek testen.';
 add('BOTTOM','Bodemplaat',dims('box-bottom'),'MDF','wood','Vier MDF-wanden op de bodem lijmen; lijmverbinding en paneelstijfheid nog fysiek beoordelen.');
 add('WALL-FB','Voor- en achterwand',dims('box-front'),'MDF','wood','Twee gelijke panelen; haaks op de bodem plaatsen.');
 add('WALL-LR','Linker- en rechterwand',dims('box-left'),'MDF','wood','Tussen de voor- en achterwand plaatsen.');
 add('BASE','Bovenplaat',dims('BASE'),'MDF','wood',`Box ${g.base.width} × ${g.base.height} × ${g.box.height} mm buitenmaat; vrije asdoorvoeren Ø28 bij A/B en Ø44 bij C. M4-doorvoeren Ø4,6 volgen dezelfde posities als de voeten en montageoren in het model. Houtverbinding nog uitwerken.`);
 add('BR','Motorbeugel met zijsteunen',compound('BR'),printed,'print',`Vier Ø3,4-doorvoeren op ${g.motor.mountingPitch} × ${g.motor.mountingPitch} mm; centrale opening 24 × 24 mm. Twee 5 mm dikke montageoren met Ø4,6-gaten op ${g.hardware.bracketMountPitch} mm h.o.h., buiten de lagerhoudervoet. De moeren zitten vrij naast de verticale steunen. ${printNote}`);
 add('MOTOR','SY42STH38-1684A-stappenmotor',`${g.motor.width} × ${g.motor.width} × ${g.motor.length} mm; as Ø${2*g.motor.shaftRadius} × ${g.motor.shaftLength} mm`,'Staal / koper','buy',`Referentietekening: buitenmaat 42,3 max.; lengte 38 ±1; aslengte 24 ±1; as Ø5 +0/−0,012; centreerpassing Ø22 +0/−0,05, hoogte 4,5; 4× M3, diepte ${g.motor.holeDepth}; steek 31 ±0,2 mm. Huidige nominale modelmaten staan bij afmetingen. ${g.motorStepAngle}°; ${g.motorCurrent} A; houdkoppel ${g.motorHoldingTorque} Nm.`);
 for(const key of ['A','B','C']){
  const d=g[key],shaft=key==='C'?12:8;
  add('H-'+key,'Lagerhouder '+key,`Buitenmaat ${compound('H-'+key)}; lagerafstand ${d.bearings[1]-d.bearings[0]} mm`,printed,'print',`Twee tegenovergestelde zittingen voor ${key==='C'?'6001':'608'}, met aanslag en zichtbare borggroef. Beide lagers worden buiten de machine geplaatst; voet met vier Ø4,6-doorvoeren op ${key==='C'?g.hardware.spindleMountPitch:g.hardware.holderMountPitch} mm vierkante steek rust boven op het hout. Nominale zitting Ø${key==='C'?'28,3':'22,3'}; definitieve passing, groefmaten en thermische axiale speling afstemmen op het gekozen lager/borgring en proefprint. ${printNote}`);
  add('CP-'+key,'Flexibele askoppeling '+key,dims('coupling'+key)+`; boring Ø${g.motorShaftDiameter} → Ø${shaft} mm`,'Aluminium / elastisch element','buy','Direct 1:1. Twee zichtbare radiale schroefgaten in de koppeling, niet in de lagers. Motor- en uitgangsas coaxiaal; uiteinden 1 mm vrij. Exact type en toegestane uitlijnfout nog kiezen.');
  add('S-'+key,'Stalen aandrijfas '+key,dims('shaft'+key),'Staal','buy','Afzonderlijk gelagerd. Twee lokale klemvlakken van voorlopig 0,4 mm diep, bij koppeling en naaf. Geen dwarsgat: de stelschroeven drukken tegen die vlakken. Lagerpassing en afwerking nog testen.');
  if(key!=='C'){
   add('K-'+key,'Geprinte kruk '+key,`${g['radius'+key]} mm h.o.h.; ${g.crankWidth} × ${g.crankHeight} mm; naaf Ø24/8 mm`,printed,'print','Verdikte naaf met radiale M4-inzetmoer en stelschroef. De as krijgt lokaal een vlak; passing en klemming nog testen. '+printNote);
   add('L-'+key,'Geprinte penarm '+key,`${g['length'+key]} mm h.o.h.; koker ${g.rodWidth} × ${g.rodHeight} mm; wand ${g.rodWall} mm`,printed,'print','Grotere doorsnede en dikkere wand dan de oude aluminiumarm; geïntegreerde lagerogen Ø30/22 en Ø40/32 mm. '+printNote);
  }
 }
 add('608','Groefkogellager 608-2RS','8 × 22 × 7 mm','Lagerstaal','buy','Vier in de hoofdlagers van A/B; twee in de ellebogen.');
 add('6001','Groefkogellager 6001','12 × 28 × 8 mm','Lagerstaal','buy','Twee lagerposities op de papierspindel C.');
 add('6804','Penlager 6804','20 × 32 × 7 mm','Lagerstaal','buy','Eén in elk armuiteinde, vrij roterend rond de holle penas.');
 add('CLIP-22','Binnenborgring lagerzitting Ø22','Voorlopig buiten Ø23,3 / binnen Ø18 × 1,2 mm','Veerstaal','buy','Vier in de lagerhouders A/B. Houdt de buitenring tegen de binnenste aanslag. Open ring, met tang samendrukken. Definitieve koopmaat en groef volgens gekozen leverancier nog bepalen.');
 add('CLIP-28','Binnenborgring lagerzitting Ø28','Voorlopig buiten Ø29,3 / binnen Ø24 × 1,2 mm','Veerstaal','buy','Twee in houder C; montage van boven en onder. Definitieve koopmaat en groef nog bepalen; het model is geen genormeerd productietekenplan.');
 add('LOCK-8','Askraag Ø8',dims('shoulderA'),'Staal','buy','Twee per as A/B, met radiale stelschroef. Onderste vóór het plaatsen van de houder aanbrengen, bovenste ná de as; contact alleen met de binnenringen. Exact kooptype en axiale speling nog testen.');
 add('LOCK-12','Askraag Ø12',dims('shoulderC'),'Staal','buy','Twee op as C, buiten de twee lageruiteinden. Onderste vooraf plaatsen, bovenste over de as laten zakken. Schroef aan de vrije buitenzijde van de kraag; exacte koopuitvoering nog kiezen.');
 add('LOCK-SCREW','Stelschroef askraag','Voorlopig M3 × 3 mm','Staal','buy','Eén per askraag, in een vooraf aanwezig radiaal schroefgat. Zet de kraag op de as vast zonder axiale lagervoorspanning.');
 add('FL','Plateauflens',dims('flange'),printed,'print',`Vier bevestigingen op straal ${g.hardware.flangePitch} mm; radiale M4-inzetmoer en stelschroef op een vlak van de as. ${printNote}`);
 add('PL','MDF-draaiplateau',dims('platter'),'MDF','wood',`Vier verzonken boutkoppen; papier moet vlak liggen. Draaiende massa inclusief flens voorlopig ${g.paper.mass} kg; nameten.`);
 add('PAPER','Rond tekenpapier',`Ø${2*g.paper.radius} mm; tekenzone Ø${2*g.paper.safeRadius} mm`,'Papier','use','Centreren en vlak vastzetten op het MDF-plateau.');
 add('E','Stalen elleboogpost','Schouder Ø8 mm; einde Ø6 mm; lengte '+number(g.A.rodZ-g.A.crankZ+24)+' mm','Staal','buy','Eén per kruk; M6-borging buiten het lagervlak. Uitvoering en onderste borging nog uitwerken.');
 add('P','Holle penas',dims('penSleeve'),'Staal','buy','Door beide penlagers steken; axiale borging en aansluiting op de houder nog uitwerken.');
 add('SP-P','Afstandbus tussen penlagers',dims('penSpacer'),printed,'print','Houdt de binnenringen op afstand; geen klemkracht op de draaiende armogen. '+printNote);
 add('P-LOCK','Axiale penborging',dims('penShoulder'),'Staal','buy','Twee borgringen; exacte draad of klemborging nog te bepalen.');
 add('PEN','Penhouder',dims('holder')+`; pen Ø${g.pen.min}–${g.pen.max} mm`,printed,'print','Handmatige penhoogte. Aansluiting op holle penas nog detailleren. '+printNote);
 add('BUSH','Centreerbus voor de pen',dims('centeringBush'),printed,'print','Aanpassen aan de werkelijk gebruikte pen. '+printNote);
 add('PAD','Zacht drukpad',dims('clampPad'),'TPU / zacht kunststof','print','Tussen klemschroef en pen plaatsen.');
 add('CLAMP-SCREW','Manuele klemschroef',`M4; gemodelleerde schacht ${number(33-g.pen.radius-2)} mm`,'Staal','buy','Inkooplengte en schroefdraadverbinding met de houder nog te bepalen; alleen handvast klemmen.');
 add('KNOB','Draaiknop klemschroef',dims('clampKnob'),printed,'print','Op de stalen klemschroef; bevestiging nog uitwerken. '+printNote);
 add('PEN-TOOL','Tekenpen',`Ø${2*g.pen.radius} mm; gemodelleerde lengte ${number(parts.find(p=>p.id==='pen').h)} mm`,'Gewone tekenpen','use','Werkelijke pen opmeten; punt tot op het papier laten zakken.');
 add('M3-BOLT','Motorbout M3',`M3 × ${g.hardware.motorBolt} mm`,'Staal','buy',`Vier per motor. Bij 5 mm beugel en ${g.hardware.washerM3} mm ring circa ${g.hardware.motorBolt-5-g.hardware.washerM3} mm inschroeven; maximaal ${g.motor.holeDepth} mm volgens tekening. Kop schematisch.`);
 add('M3-WASHER','Sluitring M3','Ø6/3,4 × '+g.hardware.washerM3+' mm','Staal','buy','Eén onder elke motorboutkop.');
 add('M4-BOLT','Montagebout M4',`M4 × ${g.hardware.mountBolt} mm`,'Staal','buy','Zes bij motorbeugels en twaalf bij lagerhouders. Lengte volgt uit MDF-plaat, geprinte montagevoet, twee sluitringen, moer en schroefdraadtoeslag. Doorlopende bouten gebruiken; MDF niet pletten door te hard aandraaien. Definitieve borgmoer en boutlengte samen controleren.');
 add('M4-CSK','Verzonken plateaubout',`Voorlopig M4 × ${g.hardware.plateBolt} mm`,'Staal','buy',`Vier door hout en flens; koppen vlak verzinken. Lengte afgestemd op ${g.paper.thickness} mm hout, ${g.hardware.flangeThickness} mm flens, ring en moer, zonder in de C-houder te steken. Zo nodig een langere koopbout op lengte maken; definitieve lengte bij prototype controleren. Ringen en moeren eerst zijdelings onder de flens plaatsen. Kopvorm schematisch.`);
 add('M4-WASHER','Sluitring M4','Ø8/4,4 × '+g.hardware.washerM4+' mm','Staal','buy','Boven en onder beugel-/houderverbindingen; alleen onder bij verzonken plateaubouten.');
 add('M4-NUT','Borgmoer M4','M4; sleutelwijdte circa 7 mm','Staal','buy','Eén per doorlopende montagebout; definitieve uitvoering nog kiezen.');
 add('M6-WASHER','Sluitring M6','Ø12/6,4 × 1 mm','Staal','buy','Boven de ellebooglagers plaatsen.');
 add('M6-NUT','Borgmoer M6','M6; sleutelwijdte circa 10 mm','Staal','buy','Eén per elleboog; vrije lagerrotatie behouden.');
 add('CP-SCREW','Koppelingsstelschroef','M3; lengte per boring nog te bepalen','Staal','buy','Twee per koppeling, in vooraf getapte radiale gaten. Gemodelleerde lengte loopt van de buitenrand tot de betreffende as; geen te korte schroef die de as niet raakt. Definitieve maat volgt uit het gekozen kooptype.');
 add('M4-INSERT','Schroefdraadinzet M4','Voorlopig Ø6/4 × 5 mm','Messing','buy','Twee in kruknaven, één in de plateauflens. Het getrapte gat is vooraf zichtbaar: nominale opname Ø6,2 × 5,4 mm en doorvoer Ø4,2 mm. Inzetten in de losse onderdelen vóór montage op de as. Exact inzettype en printpassing nog kiezen.');
 add('M4-SET-K','Stelschroef kruknaaf',`M4 × ${g.hardware.crankSetScrew} mm`,'Staal','buy','Eén per kruk, via de messing inzet tegen een vlak op de stalen as. Klemming fysiek testen.');
 add('M4-SET-F','Stelschroef plateauflens',`M4 × ${g.hardware.flangeSetScrew} mm`,'Staal','buy','Via de messing inzet vanaf de flensrand tot tegen as C; toegang onder de houten schijf. Klemming fysiek testen.');
 cache.set(g,rows);return rows;
}
const values=r=>[r.name,r.qty,r.dimensions,r.material,r.method+' · '+r.spec];
const csv=g=>'\uFEFF'+[headers,...create(g).map(values)].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
window.MotioBOM={create,headers,values,csv,referencePose};
})();
