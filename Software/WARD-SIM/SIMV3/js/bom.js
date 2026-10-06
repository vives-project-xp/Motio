(function () {
'use strict';
const headers=['ID','Aantal','Onderdeel','Type','Afmetingen mm','Materiaal','Specificatie','Functie','Status','Massa kg','Geschatte kost EUR','Leverancier','Part number','Critical dimension','Tolerance','Validation state','Verbonden componenten','Lagering'];
function create(g) {
 const rows=[],add=(id,qty,name,type,dimensions,material,spec,role,status='CONCEPT',mass=null,critical='REQUIRES VALIDATION',connected='',bearing='n.v.t.',part='UNKNOWN',supplier='UNKNOWN')=>rows.push({id,qty,name,type,dimensions,material,spec,role,status,mass:mass===null?'UNKNOWN':mass.toFixed(4)+' ESTIMATE',cost:'UNKNOWN',supplier,part,critical,tolerance:'REQUIRES VALIDATION',validation:'REQUIRES VALIDATION',connected,bearing});
 for(const key of ['A','B','C']) {
  const d=g[key];
  add('M-'+key,1,'Motor '+key,'NEMA17','42 × 42 × 48; as Ø5','Staal / koper','0.45 Nm holding ONLY; torque-speed curve UNKNOWN','Aandrijving '+key,'SELECTED',null,'Motorkoppel bij RPM + radiale riemlast','P20','Motorlagers: toegestane riemlast onbekend','17HS19-1684S1 (kandidaat)','STEPPERONLINE');
  add('S-'+key,1,'Werkas '+key,'Geslepen schouderas',key==='C'?`Ø12 × ${(g.paper.z-g.C.bearings[0]+29).toFixed(1)}`:`Ø8 × ${(d.crankZ+34).toFixed(1)}`,'Staal','Schouder + borgmoer; één zwevende buitenring','Moment / radiale last naar frame','CONCEPT',null,'Paralleliteit / lagerzitting','P-'+key+', H-'+key,key==='C'?'6001 × 2':'608 × 2');
  add('H-'+key,1,'Lagersteun '+key,key==='C'?'Twee gescheiden zittingen + zijposts':'Torenvormig lagerhuis',key==='C'?`Ø42; lagerafstand ${d.bearings[1]-d.bearings[0]}`:`Ø44; top z${d.bearings[1]+4}`,'Aluminium','C: open riemvlak; boven axiaal vast, onder buitenring schuivend','Radiale steun, geen onbedoelde voorspanning','CONCEPT',null,'Coaxialiteit zittingen','S-'+key+', BASE',key==='C'?'6001':'608');
  add('P-'+key,1,'Uitgangspulley '+key,'HTD '+g.beltPitch+'M',`${d.outputTeeth}T · steek Ø${(2*g.pitchRadius(d.outputTeeth)).toFixed(3)} · breedte ${g.beltWidth}`,'Aluminium',`Ratio ${d.ratio.toFixed(3)}:1; boring Ø${key==='C'?12:8}`,'Riemreductie','CALCULATED',null,'Steekdiameter / naafpassing','S-'+key+', T-'+key);
  add('T-'+key,1,'Tandriem '+key,'HTD '+g.beltPitch+'M',`${d.beltLength} × ${g.beltWidth}; hartafstand ${d.center.toFixed(3)}`,'Elastomeer / trekkoord','Beschikbaarheid, spanning en draagvermogen onbekend','Parallelle assen verbinden','CALCULATED',null,'Hartafstand / tandensteek','P20, P-'+key);
  if(key!=='C'){
   add('K-'+key,1,'Kruk '+key,'Klemnaaf + strip',`${g['radius'+key]} h.o.h. × ${g.crankWidth} × ${g.crankHeight}`,'6061-T6 · ASSUMPTION','Klemverbinding Ø8; elleboog Ø8','Aangedreven eerste link','CONCEPT',g.crankWidth*g.crankHeight*g['radius'+key]*1e-9*g.density,'Hartafstand','S-'+key+', E','608 op E');
   add('L-'+key,1,'Arm '+key,'Koker + metalen eindstukken',`${g['length'+key]} h.o.h. × ${g.rodWidth} × ${g.rodHeight} × ${g.rodWall}`,'6061-T6 · ASSUMPTION',`E ${g.materialE} N/mm²; z${d.rodZ}; massa alleen kale koker`,'Passieve link naar P','CONCEPT',g.tubeArea*g['length'+key]*1e-9*g.density,'Hartafstand / vlakheid / parallelle boringen','E, P','608 op E; 6804 op P');
  }
 }
 add('P20',3,'Motorpulley','HTD '+g.beltPitch+'M',`${g.motorTeeth}T · steek Ø${(2*g.pitchRadius(g.motorTeeth)).toFixed(3)} · Ø5 boring`,'Aluminium','Klemnaaf; riembreedte '+g.beltWidth,'Motorriemaandrijving','CALCULATED');
 add('BR',3,'Motorbeugel','Open plaat + stijlen','54 × 54 × 5; sleuven','Aluminium','31 mm boutafstand NEMA17','Uitlijnen en riemspannen');
 add('608',6,'Groefkogellager','608-2RS','8 × 22 × 7','Lagerstaal','4 hoofdlagers + 2 ellebogen','Vrije rotatie','SELECTED',null,'Ø8 / Ø22 fits','S-A, S-B, E','Eén lokaliserende en één zwevende positie per hoofd-as','608-2RS','UNKNOWN');
 add('6804',2,'Penlager','6804-2RS · kandidaat','20 × 32 × 7','Lagerstaal','Afmetingen catalogus te bevestigen vóór aankoop','Onafhankelijke armrotatie rond holle bus','CONCEPT',null,'Ø20 / Ø32 fits','L-A, L-B, P','Afzonderlijke buitenringen; bovenste zitting axiaal vrij');
 add('6001',2,'Papierspindellager','6001-2RS','12 × 28 × 8','Lagerstaal','Boven lokaliserend; onder buitenring schuivend','Radiaal + axiaal ondersteunen','SELECTED',null,'Zittingen / vereiste interne speling','H-C, S-C','Boven shoulder / nut; onder geen axiale buitenringklem','6001-2RS');
 add('E',2,'Elleboogpost','Schouderpost','Ø8; M6 borging','Staal','Schroefdraad buiten belastingsvlak','Volledige passieve omloop');
 add('P',1,'Holle centrale penas','Gedraaide bus',`Ø${2*g.pen.shaftRadius} / boring Ø${2*g.pen.boreRadius}; z${g.pen.clampZ}…${Math.max(g.A.rodZ,g.B.rodZ)+14}`,'Staal','Pen door beide lagers; geen massieve as in penbaan','Coaxiale verbinding van beide armen','CONCEPT',null,'Coaxialiteit / lagerschouders','6804, SP-P, PEN','Twee onafhankelijke 6804');
 add('SP-P',1,'Spacer + schouder + borgmoer','Binnenring hardware',`Ø24/20; spacer ${Math.abs(g.B.rodZ-g.A.rodZ)-7} lang`,'Staal','Klem alleen binnenringen; één buitenring vrij in Z','Borging zonder overconstraint');
 add('PEN',1,'Manuele penhouder','Doorboorde klemhouder',`Ø${2*g.pen.holderRadius} × 22; pen Ø${g.pen.min}–${g.pen.max}`,'Aluminium + verwisselbare splitbussen','Pen van boven insteken, hoogte handmatig, knop vastzetten','Vaste penhoogte; nul aangedreven Z-assen','CONCEPT',null,'Boring, busdiameter / uitlijning','P, CLAMP, PAD');
 add('CLAMP',1,'Kartelknop + klemschroef','M4 handknop','Ø16 greep; radiale M4 × 24','Staal / polymeer','Zonder gereedschap; captive zachte drukpad','Handmatige penklem');
 add('PAD',1,'Zacht contactvlak + splitbus','Vervangbaar','6 × 6 × 2; bussen per pendiameter','TPU / nylon · ASSUMPTION','Geen direct staalcontact met pen; splitbus centreert','Bescherming en centrering');
 add('PL',1,'Papierplateau','Ronde plaat',`Ø${2*g.paper.radius} × ${g.paper.thickness}`,'Aluminium',`Totale draaiende massa ${g.paper.mass} kg ASSUMPTION; plaatmassa afzonderlijk`,'Papier vlak dragen','CONCEPT',Math.PI*g.paper.radius**2*g.paper.thickness*1e-9*g.density,'Vlakheid / slingering','FL, S-C');
 add('FL',1,'Spindelflens','Geboute flens','Ø60 × 8','Aluminium','Schouder onder plateau; geborgde bevestiging','Koppelt plateau met spindel');
 add('BASE',1,'Draagplaat + 2020 frame','Gefreesde plaat',`${g.base.width} × ${g.base.height} × ${g.base.thickness}`,'Aluminium','Doorvoeren op alle werkassen; lokale uitsparingen in detail-CAD','Vaste machinereferentie','CONCEPT',g.base.width*g.base.height*g.base.thickness*1e-9*g.density,'Vlakheid / lagerpositie','H-A, H-B, H-C, BR');
 add('FIX',1,'Bevestiging','M3 / M5 / M6','Definitieve aantallen UNKNOWN','Staal','Borging, paspennen, shims; detail-CAD nodig','Demonteerbare montage');
 return rows;
}
const values=r=>[r.id,r.qty,r.name,r.type,r.dimensions,r.material,r.spec,r.role,r.status,r.mass,r.cost,r.supplier,r.part,r.critical,r.tolerance,r.validation,r.connected,r.bearing];
const csv=g=>'\uFEFF'+[headers,...create(g).map(values)].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
window.MotioBOM={create,headers,values,csv};
})();
