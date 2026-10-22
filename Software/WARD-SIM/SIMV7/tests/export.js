const fs=require('fs'),path=require('path');
global.window=global;
for(const f of ['math','machineGeometry','kinematics','paperTransform','singularityAnalysis','collisionDetection','structuralEstimate','motorAnalysis','mechanics','validation','bom','bubbleText','patterns','simulation','renderers','fabrication'])require('../js/'+f+'.js');
const folder=path.resolve(__dirname,'../exports');fs.mkdirSync(folder,{recursive:true});
const sim=new MotioSimulation.Simulation();
fs.writeFileSync(path.join(folder,'MOTIO-V7-mechanical.svg'),MotioRenderers.mechanismSVG(sim,true));
fs.writeFileSync(path.join(folder,'MOTIO-V7-section.svg'),MotioRenderers.sectionSVG(sim));
fs.writeFileSync(path.join(folder,'MOTIO-V7-pen-detail.svg'),MotioRenderers.detailSVG(sim,'pen'));
fs.writeFileSync(path.join(folder,'MOTIO-V7-BOM.csv'),MotioBOM.csv(sim.geometry));
fs.writeFileSync(path.join(folder,'MOTIO-V7-mounting.svg'),MotioRenderers.mountingSVG(sim));
for(const part of MotioFabrication.parts(sim.geometry)){
 fs.writeFileSync(path.join(folder,'MOTIO-V7-'+part.id+'.svg'),MotioFabrication.svg(part,sim.geometry));
 fs.writeFileSync(path.join(folder,'MOTIO-V7-'+part.id+'.dxf'),MotioFabrication.dxf(part));
}
fs.writeFileSync(path.join(folder,'MOTIO-V7-laser-layout.svg'),MotioFabrication.layoutSVG(sim.geometry));
fs.writeFileSync(path.join(folder,'laser-manifest.json'),JSON.stringify({material:'MDF 6 mm',kerfCompensated:false,parts:MotioFabrication.parts(sim.geometry),layout:MotioFabrication.layout(sim.geometry)},null,2));
fs.writeFileSync(path.join(folder,'print-manifest.json'),JSON.stringify({material:'PLA',parts:MotioFabrication.printParts(sim.geometry)},null,2));
const report={physicalValidation:{tested:false,remaining:['PLA-passing en kruip','motor- en PLA-temperatuur','naafslip','werkelijk loopkoppel','houtstijfheid en penkracht']},scope:'Continue radiale route, vaste werkbranch, alle C-hoeken; 0,1 mm onafhankelijke controles; aparte volledige patroonruns in pattern-validation.json.',configuration:sim.config,route:sim.drawingArea,mounting:MotioGeometry.mountingFit(sim.geometry),axes:{A:{axial:0,radial:0},B:{axial:0,radial:0},C:{axial:0,radial:0}},actualMinimum:Infinity,deflection:0,samples:0};
report.phaseSweep=sim.audit;
report.continuousShaftEnvelope=MotioMotor.shaftLoads(sim.geometry,{valid:true,sin:sim.drawingArea.minSinBound,pen:{x:sim.geometry.paper.x+sim.geometry.paper.safeRadius,y:sim.geometry.paper.y}});
let previous=sim.pose;
for(let i=0;i<=950;i++){
 const radius=95*i/950,g=sim.geometry,a=g.reachAngle*Math.PI/180;
 const p=MotioKinematics.inverse(g,{x:g.paper.x+radius*Math.cos(a),y:g.paper.y+radius*Math.sin(a)},previous,true).pose;previous=p;
 const col=MotioCollision.analyze(g,p),loads=MotioMotor.shaftLoads(g,p);
 if(col.violations.length||loads.state!=='WITHIN ESTIMATE')throw Error('Unsafe export route at '+radius);
 report.actualMinimum=Math.min(report.actualMinimum,col.minimum);report.deflection=Math.max(report.deflection,MotioStructure.analyze(g,p).verticalEnvelope);report.samples++;
 for(const k of ['A','B','C']){report.axes[k].axial=Math.max(report.axes[k].axial,loads.axes[k].axialDesign);report.axes[k].radial=Math.max(report.axes[k].radial,loads.axes[k].radialDesign);}
}
fs.writeFileSync(path.join(folder,'design-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({generated:'SVG, DXF, BOM and design-validation.json',routeBound:report.route.minClearanceBound,actualMinimum:report.actualMinimum,axes:report.axes,deflection:report.deflection}));
