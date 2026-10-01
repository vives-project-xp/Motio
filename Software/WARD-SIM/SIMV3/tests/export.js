// Regenerate portable reference exports from the same geometry and BOM as the UI.
const fs=require('node:fs'),path=require('node:path');
global.window=global;
for(const f of ['math','mechanics','simulation','renderers'])require('../js/'+f+'.js');
const folder=path.resolve(__dirname,'../exports');fs.mkdirSync(folder,{recursive:true});
const sim=new MotioSimulation.Simulation();
fs.writeFileSync(path.join(folder,'MOTIO-SimV3-mechanical.svg'),MotioRenderers.mechanismSVG(sim,true));
fs.writeFileSync(path.join(folder,'MOTIO-SimV3-section.svg'),MotioRenderers.sectionSVG());
const rows=[['ID','Aantal','Onderdeel','Type / maat','Specificatie','Functie / reden'],...MotioMechanics.BOM];
fs.writeFileSync(path.join(folder,'MOTIO-SimV3-BOM.csv'),'\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n'));
console.log('Reference 2D, section and BOM exports generated.');
