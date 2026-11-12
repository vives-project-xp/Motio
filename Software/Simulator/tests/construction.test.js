const assert=require('node:assert/strict');global.window=global;
for(const f of ['math','machineGeometry','kinematics','bom','fabrication'])require('../js/'+f+'.js');
const g=MotioGeometry.build(MotioGeometry.normalize()),p=MotioBOM.referencePose(g),parts=MotioGeometry.bodies(g,p),rows=MotioBOM.create(g),laser=MotioFabrication.parts(g),prints=MotioFabrication.printParts(g);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),get=id=>parts.find(p=>p.id===id);
assert.equal(g.material.name.startsWith('PLA'),true);assert.equal(g.motorStepsPerFullStep,8);
for(const id of ['BASE','box-bottom','platter'])close(get(id).h,6);
close(get('box-front').l,6);close(get('box-left').w,6);close(get('box-front').h,100);close(get('box-left').l,392);
assert.equal(laser.reduce((n,p)=>n+p.qty,0),9);
for(const row of rows.filter(r=>r.method==='Lasersnijden'))assert.equal(laser.find(p=>p.bom===row.id).qty,row.qty,'All cut parts exported');
for(const row of rows.filter(r=>r.method==='3D-printen'))assert.equal(prints.find(p=>p.id===row.id).qty,row.qty,'All printed parts exported');
for(const key of ['A','B','C']){
 const d=g[key],stem=parts.find(p=>p.id.startsWith(key==='C'?'plateFix0':'crankFix'+key+'0')&&p.id.endsWith('-stem'));
 close(stem.z-stem.h/2,d.hubTop-(key==='C'?4:3.5));
 assert.equal(get('hub'+key).holes.filter(h=>!h.axis).length,4);
 for(const h of get('hub'+key).holes.filter(h=>!h.axis))close(Math.hypot(h.x,h.y),6.35);
}
// Laser tab positions independently mapped from local rib drawing to model.
const top=laser.find(p=>p.id==='top-plate'),rib=laser.find(p=>p.id==='rib');
assert.equal(top.slots.length,4);assert.equal(rib.outline.filter(p=>p.y===36).length,4);
for(const x of [100,250])for(const y of [140,240])assert.ok(top.slots.some(s=>s.x===x&&s.y===y&&s.w>20&&s.l>6));
const layout=MotioFabrication.layout(g);
for(let i=0;i<layout.placements.length;i++)for(let j=i+1;j<layout.placements.length;j++){const a=layout.placements[i],b=layout.placements[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Cut blanks do not overlap');}
const allowed=['opencircuit.be','conrad.nl','conrad.be','conrad.de','reichelt.com','reichelt.de','discountoffice.nl','eu.store.bambulab.com','www.brico.be'];
for(const row of rows){assert.ok(row.qty>0);assert.ok(row.source);const host=new URL(row.source[1]).hostname.replace(/^www\./,'');assert.ok(allowed.some(s=>s.replace(/^www\./,'')===host),row.name);assert.doesNotMatch(row.material,/PETG|TPU/);}
assert.ok(!rows.some(r=>['REINF','P-LOCK','M6-NUT'].includes(r.id)),'No unavailable turned steel parts');
assert.equal(MotioGeometry.mountingFit(MotioGeometry.build(MotioGeometry.normalize({baseThickness:8}))).state,'FAIL','Wrong wood thickness cannot pass');
console.log('SIMV7: standard 6 mm stock, all print/laser parts exported, tab layout, source whitelist, bolt depths, and 1/8 driver configuration passed.');
