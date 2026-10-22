// Offline artifact rendering with the application's own Canvas renderer.
// No browser automation or hardware commands; optional bundled dependencies.
const fs=require('node:fs'),path=require('node:path');
const modules=process.env.MOTIO_NODE_MODULES;
if(!modules)throw Error('Set MOTIO_NODE_MODULES to the bundled Node packages path.');
const {createCanvas}=require(path.join(modules,'@napi-rs/canvas')),sharp=require(path.join(modules,'sharp'));
const canvas=(w=1400,h=1000)=>{
 const c=createCanvas(w,h),context=c.getContext.bind(c);
 c.getContext=type=>type==='2d'?context('2d'):null;
 c.addEventListener=()=>{};c.setPointerCapture=()=>{};c.getBoundingClientRect=()=>({width:w,height:h,left:0,top:0});return c;
};
global.window=global;global.devicePixelRatio=1;global.document={createElement:()=>canvas()};
for(const f of ['math','machineGeometry','kinematics','paperTransform','singularityAnalysis','collisionDetection','structuralEstimate','motorAnalysis','mechanics','validation','bom','bubbleText','patterns','simulation','renderers','spatial','assembly'])require('../js/'+f+'.js');
const g=MotioGeometry.build(MotioGeometry.normalize()),pose=MotioBOM.referencePose(g),sim={geometry:g,config:g,pose,q:pose.q,trace:[]};
const out=path.resolve(__dirname,'../exports'),c=canvas(),renderer=new MotioSpatial.SpatialRenderer(c,()=>{});
renderer.enclosure={front:false,back:true,left:false,right:true,bottom:false,top:'semi'};
renderer.render(sim,false,'assembly',{step:MotioAssembly.steps.length-1,progress:1,parts:MotioGeometry.bodies(g,pose).filter(b=>!b.id.startsWith('box-'))});fs.writeFileSync(path.join(out,'model-preview.png'),c.toBuffer('image/png'));
const parts=MotioGeometry.bodies(g,pose).filter(b=>b.id==='BASE'||b.id==='stiffenerA'||b.bom==='MOTOR'&&b.id.endsWith('A')||b.mount==='MOTOR-FIX'&&b.id.includes('A')||b.assemblyGroup==='unitA'||b.mount==='HUB-LOCK-A');
renderer.resetCamera();renderer.pitch=.25;
renderer.render(sim,false,'assembly',{step:MotioAssembly.steps.length-1,progress:1,parts,view:{focus:{x:g.A.pivot.x,y:g.A.pivot.y,z:0},width:140,height:120}});
fs.writeFileSync(path.join(out,'mount-preview.png'),c.toBuffer('image/png'));
(async()=>{for(const name of ['mounting','section','pen-detail','top-plate','laser-layout'])await sharp(path.join(out,'MOTIO-V7-'+name+'.svg')).resize({width:1400,height:1000,fit:'inside'}).png().toFile(path.join(out,name+'-preview.png'));console.log('Offline Canvas and SVG previews written.');})();
