(function(){
'use strict';
const headers=['Onderdeel','Aantal','Afmetingen','Materiaal','Specificatie / opmerking'],cache=new WeakMap();
function referencePose(g){const q={A:g.phaseA*Math.PI/180,B:g.phaseB*Math.PI/180,C:g.phaseC*Math.PI/180},p=window.MotioKinematics.solve(g,q);return p.valid?p:{valid:true,q,a:{x:g.pivotAx+g.radiusA,y:g.pivotAy},b:{x:g.pivotBx+g.radiusB,y:g.pivotBy},pen:{x:g.paper.x,y:g.paper.y}};}
function create(g){
 if(cache.has(g))return cache.get(g);
 const parts=window.MotioGeometry.bodies(g,referencePose(g)),rows=[],n=v=>+v.toFixed(2);
 const dim=id=>{const p=parts.find(v=>v.id===id);return p.shape==='box'?`${n(p.w)} × ${n(p.l)} × ${n(p.h)} mm`:`Ø${n(2*p.r)}${p.inner?'/'+n(2*p.inner):''} × ${n(p.h)} mm`;};
 const add=(id,name,dimensions,material,method,spec)=>rows.push({id,name,qty:new Set(parts.filter(v=>v.bom===id).map(v=>v.instance)).size,dimensions,material,method,spec});
 add('BASE','Bovenplaat',dim('BASE'),'MDF','Zagen / boren','Drie openingen Ø22,5; per motor 4× Ø3,6 op 31 × 31 mm. Montageflens rechtstreeks tegen onderkant op z=0. Oorsprong linkerbovenhoek, zie bovenplaattekening. Geen schroefdraad in MDF.');
 add('REINF','Vlak motorverstevigingsplaatje',dim('stiffenerA'),'Staal','Laseren / boren','Drie identieke plaatjes boven op MDF; Ø22,5 en 4× Ø3,6 op 31 × 31. Dezelfde motorbouten verdelen de boutdruk. Geen afstandhouder onder motor. Ontbramen. Globale MDF-stijfheid fysiek testen.');
 add('MOTOR','SY42STH38-1684A-stappenmotor',`${g.motor.width} × ${g.motor.width} × ${g.motor.length} mm; as Ø5 × 24 ±1 mm`,'Staal / koper','Kopen','4× M3 op 31 ±0,2; gatdiepte 4,5 mm; centreerrand Ø22 +0/−0,05 × 4,5 mm; as Ø5 +0/−0,012. Motor z=−38…0. Limieten 10 N axiaal en 28 N radiaal op 20 mm. Aslasten berekend, dynamisch koppel nog niet bewezen.');
 add('M3-BOLT','Motorbout M3×10',`M3 × ${g.hardware.motorBolt} mm`,'Staal','Kopen',`12 stuks van boven vóór naven. Klempakket ${g.base.thickness}+${g.stiffenerThickness}+${g.hardware.washerM3} mm; inschroefdiepte ${n(g.mounting.threadEngagement)} mm, maximaal 4,5. Voorlopig handvast ≤0,15 Nm; MDF-aandraaimoment fysiek bepalen. Dikte en lengte vóór montage meten.`);
 add('M3-WASHER','Brede sluitring M3',`Ø9/3,4 × ${g.hardware.washerM3} mm`,'Staal','Kopen','Eén per motorbout op staalplaatje. Dikte 1 mm is onderdeel van lengtestapel.');
 add('HUB','Metalen Ø5-klemnaaf',`Ø32/5 × 8 mm; Ø14 × 2 mm centreerrand; 4× M4 op 16 × 16`,'Aluminium','Kopen',`goBILDA 1309-0016-0005 Sonic Hub, drie stuks. Twee meegeleverde M4×14-klembouten per naaf trekken de gespleten boring rondom de ronde motoras dicht. Centreerrand Ø14 wijst omlaag, geen vlak op de as nodig. Naaflichaam A z=7…15, B 16…24, C 14…22; centreerrand steeds 2 mm lager. Op minimumas 23 mm: A/C 10 mm overlap, B 9 mm (7 mm in het lichaam); beide klemzones blijven op de as. Vereenvoudigde envelop en splitboring in model; kooponderdeel volgens fabrikantdiagram.`);
 add('HUB-CLAMP','Meegeleverde klemnaafbout M4×14','M4 × 14 mm; inbus 3 mm','Staal','Bij klemnaaf','Twee per naaf, zes totaal. Tangentiële bouten sluiten de splitboring; zij drukken niet tegen de motoras. Laat ze eerst los, plaats de naaf op hoogte en draai beide beurtelings gelijkmatig vast volgens fabrikant. Wisselkoppel en eventuele naafslip fysiek testen.');
 for(const key of ['A','B']){
  add('K-'+key,'Geprinte PETG-kruk '+key,`${g['radius'+key]} mm h.o.h.; ${g.crankWidth} × ${g.crankHeight} mm; z=${g[key].crankZ}`,'PETG · 3D-geprint','3D-printen',`Wortel Ø34: centraal Ø5,6 + 4× Ø4,4 op vierkante steek 16 × 16. Uiteinde Ø24 met Ø6,6. Vlak printen, 0,2 mm lagen, 6 wanden en 100% infill als uitgangspunt. Gaten op maat nabewerken. Vier M4×12 + 0,5 mm ringen naar getapte naaf. Geen motorverlengas.`);
  add('E-'+key,'Getrapte scharnierpost '+key,`Ø10-steun ${n(g[key].rodZ-3.5-g[key].crankZ-g.crankHeight/2)} mm; journal Ø8 × 7; M6-einden`,'Staal','Eenvoudig draaien',`Ø10-schouder rust op krukbovenkant z=${g[key].crankZ+g.crankHeight/2}. Onderste M6-einde 13 mm; bovenste 16,5 mm vanaf lagerbovenkant. Twee ringen en moeren sluiten post en binnenring op. Hoogteverschil verbindt echte armlagen.`);
  add('L-'+key,'Penarm '+key,`${g['length'+key]} mm h.o.h.; koker ${g.rodWidth} × ${g.rodHeight}, wand ${g.rodWall}; z=${g[key].rodZ} mm`,'PETG · 3D-geprint','3D-printen','Lagerogen Ø30/22 en Ø40/32 met onderste aanslag. Lichte perspassing / passende lagerborging op proefstuk bepalen. Geen isotroop sterktebewijs voor specifieke print.');
 }
 add('HUB-BOLT','Krukbout M4×12','M4 × 12 mm','Staal','Kopen','Vier per kruk; 6 mm PETG + 0,5 mm ring → 5,5 mm draad in 8 mm klemnaaf. Losse kruk-naaf-eenheid opbouwen, daarna op as. Alleen handvast, kruislings: PETG niet indrukken. Printsterkte en kruip niet gevalideerd.');
 add('HUB-WASHER','Kruksluitring M4','Ø8/4,4 × 0,5 mm','Staal','Kopen','Acht onder krukboutkoppen.');
 add('PL','MDF-draaiplateau',dim('platter'),'MDF','Zagen / boren','Ø210 × 4. Centraal Ø5,6; 4× Ø4,4 op 16 × 16, 90° verzinken. Direct op naaf C. Onderkant z=22, bovenkant 26; maximumas 25 → 1 mm reserve. Draaiende massa 0,45 kg is invoer; wegen.');
 add('PL-BOLT','Verzonken plateaubout M4×10','M4 × 10 mm, 90°','Staal','Kopen','Vier; 4 mm MDF + 6 mm draad in naaf. Geen moeren. Kop passend binnen verzinking Ø8,2 en vlak onder papier. Losse eenheid opbouwen vóór montage op motor.');
 add('PAPER','Rond tekenpapier',`Ø${2*g.paper.radius}; tekenzone Ø${2*g.paper.safeRadius} mm`,'Papier','Gebruiksonderdeel','Pas na alle naafcontroles aanbrengen.');
 add('608','Ellebooglager 608-2RS','8 × 22 × 7 mm','Lagerstaal','Kopen','Alleen twee ellebooglagers; geen motorhoofdlagering.');
 add('6804','Penlager 6804','20 × 32 × 7 mm','Lagerstaal','Kopen','Twee; onafhankelijke armdraaiing om holle penas.');
 add('E-SPACER','Bus boven ellebooglager','Ø12/6,4 × 4,5 mm','Staal','Afkorten / kopen','Eén per 608-binnenring; M6-klemkracht buiten armvlak.');
 add('M6-WASHER','Sluitring M6','Ø12/6,4 × 1 mm','Staal','Kopen','Vier: onder krukken en boven elleboogbussen.');
 add('M6-NUT','Moer M6 met draadborging','M6; hoogte 5 mm','Staal','Kopen','Vier normale M6-moeren met passende draadborging. Onderste vóór armen. Bovenste klemt alleen bus en binnenring; vrije rotatie controleren. Hogere borgmoeren passen niet automatisch in dezelfde ruimte.');
 add('P','Holle penas',dim('penSleeve'),'Staal','Buis afkorten / draaien','Boring Ø13, buiten Ø20. M20×1 op borgposities en bovenste 8 mm naar houder. Lagerjournal glad met schuifpassing. Twee dunne M20×1-moeren sluiten binnenringen op.');
 add('SP-P','Bus tussen penlagers',dim('penSpacer'),'PETG · 3D-geprint','3D-printen','Gesloten bus vóór bovenste arm; raakt alleen binnenringen. Passing en kruip testen.');
 add('P-LOCK','Ronde borgmoer penas',dim('penShoulder'),'Staal','Eenvoudig draaien','Twee M20×1, Ø24 × 5, pensleutelopname aanbrengen. Geen standaard M20-zeskantmoer: die is te groot. Geen voorspanning op armogen.');
 add('PEN','Bovenliggende penhouder',dim('holder'),'PETG · 3D-geprint','3D-printen',`Onderste 8 mm M20×1 in losse houder tappen, naar penas. Klemcentrum z=${g.pen.clampZ}, boven armen. Radiaal M4 tappen; penbus vrijmaken bij drukpad.`);
 add('BUSH','Penbus met bovenflens',dim('centeringBush')+'; flens Ø16 × 1 mm','PETG · 3D-geprint','3D-printen','Van boven plaatsen; flens rust op houderbovenkant. Sleuf bij M4-schroef en pad. Aan pen aanpassen.');
 add('PAD','Zacht drukpad',dim('clampPad'),'TPU / zacht kunststof','3D-printen','Beschermt pen tegen M4-schroef.');
 add('CLAMP-SCREW','Handklemschroef M4','M4 × 25 mm','Staal','Kopen','In getapte houder, knop op einde. Alleen handvast.');
 add('KNOB','Handknop',dim('clampKnob'),'PETG · 3D-geprint','3D-printen','M4-kop in zeskantopname verlijmen.');
 add('PEN-TOOL','Tekenpen',dim('pen'),'Gebruiksonderdeel','Kopen','Voldoende rechte schacht voor hoge houder; circa 100 mm punt tot bovenkant. Lengte en diameter nameten.');
 add('BOTTOM','Bodem',dim('box-bottom'),'MDF','Zagen / lijmen','Na afstelling sluiten; voor onderhoud afneembaar houden.');
 add('WALL-FB','Voor- en achterwand',dim('box-front'),'MDF','Zagen / lijmen','Rondom bovenplaat haaks verlijmen; boxstijfheid fysiek meten.');
 add('WALL-LR','Zijwanden',dim('box-left'),'MDF','Zagen / lijmen','Tussen voor- en achterwand; paneelverbinding als SIMV5.');
 cache.set(g,rows);return rows;
}
const values=r=>[r.name,r.qty,r.dimensions,r.material,r.method+' · '+r.spec];
const csv=g=>'\uFEFF'+[headers,...create(g).map(values)].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
window.MotioBOM={create,headers,values,csv,referencePose};
})();
