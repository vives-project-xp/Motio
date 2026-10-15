
const assert=require('node:assert/strict');global.window=global;
for(const f of ['math','machineGeometry','kinematics','bom'])require('../js/'+f+'.js');
const g=MotioGeometry.build(MotioGeometry.normalize()),parts=MotioGeometry.bodies(g,MotioBOM.referencePose(g)),find=id=>parts.find(p=>p.id===id),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
for(const id of ['BASE','box-bottom','platter'])close(find(id).h,4);
close(find('box-front').l,4);close(find('box-left').w,4);close(find('box-front').h,100);close(find('box-left').l,396);
for(const key of ['A','B','C']){close(find('motor'+key).z+19,0);close(find('stiffener'+key).z-.75,4);}
const fit=MotioGeometry.mountingFit(g);assert.equal(fit.state,'PASS');close(fit.threadEngagement,3.5);
for(const t of [6,8])assert.equal(MotioGeometry.mountingFit(MotioGeometry.build(MotioGeometry.normalize({baseThickness:t}))).state,'FAIL','Thicker deck must not silently reuse too-short motor bolts');
console.log('4 mm MDF: seven wood panels, direct motor contact, top-side steel reinforcement and measured M3 clamp stack passed.');
