(function () {
'use strict';
const headers=['Onderdeel','Aantal','Afmetingen','Materiaal','Specificatie / opmerking'];
function create(g) {
 const rows=[],add=(id,qty,name,dimensions,material,spec)=>rows.push({id,qty,name,dimensions,material,spec});
 for(const key of ['A','B','C']) {
  const d=g[key],shaft=key==='C'?12:8;
  add('M-'+key,1,'Stappenmotor '+key+' · SY42STH38-1684A',`${g.motor.width} × ${g.motor.width} × ${g.motor.length} mm; as Ø${g.motorShaftDiameter} mm`,'Staal / koper',`${g.motorStepAngle}°; ${g.motorCurrent} A; ${g.motorVoltage} V per fase; houdkoppel ${g.motorHoldingTorque} Nm. 4 × M3 op ${g.motorMountPitch} mm. Dynamisch koppel: datasheetcurve bij 24 V / 1,68 A / halfstap.`);
  add('S-'+key,1,'Aandrijfas '+key,`Ø${shaft} × ${(key==='C'?g.paper.z-d.bearings[0]+29:d.crankZ+34).toFixed(0)} mm`,'Staal','Schouderas met borging; lagerpassingen nog vastleggen.');
  add('H-'+key,1,'Lagersteun '+key,`Ø${key==='C'?42:44} mm; lagerafstand ${d.bearings[1]-d.bearings[0]} mm`,'Aluminium','Eén lager lokaliseert axiaal; tweede buitenring kan axiaal schuiven.');
  add('G-'+key,1,'Uitgangstandwiel '+key,`${d.outputTeeth} tanden; module ${g.gearModule}; steek Ø${2*g.pitchRadius(d.outputTeeth)} × ${g.gearWidth} mm; boring Ø${shaft}`,'Nog kiezen',`Rechte tanden, 20° drukhoek; reductie ${d.ratio}:1; hartafstand ${d.center} mm. Motor en uitgang draaien tegengesteld. Naaf en materiaal vóór bouw kiezen.`);
  if(key!=='C') {
   add('K-'+key,1,'Kruk '+key,`${g['radius'+key]} mm h.o.h. × ${g.crankWidth} × ${g.crankHeight} mm`,'Aluminium','Klemnaaf Ø8; elleboogscharnier Ø8.');
   add('L-'+key,1,'Penarm '+key,`${g['length'+key]} mm h.o.h.; koker ${g.rodWidth} × ${g.rodHeight} × ${g.rodWall} mm`,'Aluminium','Met eindstukken en vrije scharnieren; armlaag z'+d.rodZ+' mm.');
  }
 }
 add('G20',3,'Motortandwiel',`${g.motorTeeth} tanden; module ${g.gearModule}; steek Ø${2*g.pitchRadius(g.motorTeeth)} × ${g.gearWidth} mm; boring Ø5`,'Nog kiezen','Rechte tanden, 20° drukhoek; klemnaaf voor motoras.');
 add('BR',3,'Motorbeugel',`54 × 54 × 5 mm; 4 × M3 op ${g.motorMountPitch} mm`,'Aluminium','Vaste bevestiging met beperkte uitlijnmogelijkheid voor tandspeling.');
 add('608',6,'Groefkogellager 608-2RS','8 × 22 × 7 mm','Lagerstaal','Vier hoofdlagers en twee ellebooglagers.');
 add('6804',2,'Penlager 6804','20 × 32 × 7 mm','Lagerstaal','Onafhankelijke armrotatie rond de holle penas. Uitvoering en passing nog kiezen.');
 add('6001',2,'Plateaulager 6001','12 × 28 × 8 mm','Lagerstaal','Twee gescheiden lagerposities op de papierspindel.');
 add('E',2,'Elleboogscharnier','Schouderpost Ø8 mm; M6 borging','Staal','Schroefdraad buiten het draaiende lagervlak.');
 add('P',1,'Holle penas',`Ø${2*g.pen.shaftRadius}; boring Ø${2*g.pen.boreRadius} mm`,'Staal','Pen loopt door beide armlagers. Schouders en borgmoer nog detailleren.');
 add('SP-P',1,'Afstandbus en axiale borging',`Ø24/20; afstandbus ${Math.abs(g.B.rodZ-g.A.rodZ)-7} mm`,'Staal','Borgt de binnenringen; één buitenring houdt axiale vrijheid.');
 add('PEN',1,'Penhouder met manuele klemschroef',`Ø${2*g.pen.holderRadius} × 22 mm; pen Ø${g.pen.min}–${g.pen.max} mm`,'Aluminium','Handmatig vaste penhoogte; M4 klemschroef met Ø16 handknop en zachte drukpad.');
 add('PAD',1,'Centreerbus en drukpad','Bus passend op pen; drukpad 6 × 6 × 2 mm','Nylon / TPU','Vervangbare zachte contactdelen.');
 add('PL',1,'Draaiplateau',`Ø${2*g.paper.radius} × ${g.paper.thickness} mm`,'Aluminium',`Gecentreerde papierschijf; draaiende massa ${g.paper.mass} kg is een inschatting inclusief flens.`);
 add('PAPER',1,'Rond papier',`Ø${2*g.paper.radius} mm; veilige tekenzone Ø${2*g.paper.safeRadius} mm`,'Papier','Uit A4 210 × 297 mm geknipt; gecentreerd en vastgezet.');
 add('FL',1,'Spindelflens','Ø60 × 8 mm','Aluminium','Verbindt de plaat met de papierspindel.');
 add('BASE',1,'Box met bodem en bovenplaat',`${g.base.width} × ${g.base.height} × ${g.box.height} mm buitenmaat; plaat ${g.base.thickness} mm; wand ${g.box.wall} mm`,'Multiplex','Vier zijwanden; eenvoudige asdoorvoeren in de bovenplaat. Zichtbaarheid wijzigt alleen de weergave.');
 add('FIX',1,'Bevestigingsmateriaal','M3 / M4 / M5 / M6; aantallen bij montage bepalen','Staal','Bouten, borgmoeren en afstandsringen.');
 return rows;
}
const values=r=>[r.name,r.qty,r.dimensions,r.material,r.spec];
const csv=g=>'\uFEFF'+[headers,...create(g).map(values)].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
window.MotioBOM={create,headers,values,csv};
})();
