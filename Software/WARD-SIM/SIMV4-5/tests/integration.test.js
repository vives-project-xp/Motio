const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),elements=new Map();
const ctx=new Proxy({}, {get:(t,k)=>t[k]||((...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),'Finite canvas '+k);}),set:(t,k,v)=>{t[k]=v;return true;}});
function element(attrs=''){
 const value=attrs.match(/\bvalue="([^"]*)"/)?.[1]||'';
 return {value,defaultValue:value,checked:/\bchecked\b/.test(attrs),min:attrs.match(/\bmin="([^"]*)"/)?.[1]||0,max:attrs.match(/\bmax="([^"]*)"/)?.[1]||100,hidden:false,handlers:{},classList:{toggle(){}},setAttribute(){},setPointerCapture(){},remove(){},addEventListener(k,fn){this.handlers[k]=fn;},getContext(type){return type==='2d'?ctx:null;},getBoundingClientRect(){return {width:820,height:580,left:0,top:0};},click(){if(this.handlers.click)this.handlers.click();if(this.download)downloads.push(this.download);}};
}
for(const [,attrs,id] of html.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g))elements.set(id,element(attrs));
const downloads=[],blobs=[];global.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:test';};global.URL.revokeObjectURL=()=>{};
global.window=global;global.document={body:{appendChild(){}},getElementById(id){assert.ok(elements.has(id),'Known element '+id);return elements.get(id);},createElement(){return element();}};
let queued;global.requestAnimationFrame=fn=>queued=fn;
for(const [,f] of html.matchAll(/<script src="js\/([^"]+)\.js"/g))vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),{filename:f});
const get=id=>elements.get(id),click=id=>get(id).click();let now=performance.now();
function frames(count){for(let i=0;i<count;i++){now+=20;queued(now);}}
frames(10);assert.equal(get('run-status').textContent,'UIT');assert.equal((html.match(/id="nav-/g)||[]).length,4);
assert.equal(MotioV45.ui.view,'mechanical');assert.equal(MotioV45.ui.mode,'3d');assert.equal(get('spatial-wrap').hidden,false);
assert.deepEqual(MotioV45.spatial.enclosure,{front:true,back:true,left:true,right:true,bottom:true,top:'opaque'});
click('power-btn');click('home-btn');frames(110);assert.equal(get('run-status').textContent,'KLAAR');
click('play-btn');frames(170);assert.equal(get('run-status').textContent,'TEKENEN');assert.ok(MotioV45.simulation.trace.length>10);
click('nav-mechanical');click('mode-2d');frames(3);assert.equal(get('simulator-view').hidden,true);assert.ok(get('mechanical-diagram').innerHTML.includes('aria-label="Motor A"'));assert.match(get('mechanical-diagram').innerHTML,/r="95"/);
click('mode-3d');frames(8);assert.equal(get('spatial-wrap').hidden,false);assert.ok(MotioV45.spatial.hits.length>20);
// The enclosure is strictly presentation state. Render without advancing animation.
const drawingSnapshot=()=>({q:{...MotioV45.simulation.q},state:MotioV45.simulation.state,time:MotioV45.simulation.time,traceLength:MotioV45.simulation.trace.length,geometry:MotioV45.simulation.geometry,config:MotioV45.simulation.config});
const unchanged=drawingSnapshot(),render=()=>MotioV45.spatial.render(MotioV45.simulation,false,'assembly');
for(const panel of ['front','back','left','right','bottom']){
 render();assert.ok(MotioV45.spatial.pickFaces.some(f=>f.part?.id==='box-'+panel),panel+' starts visible');
 get('enclosure-'+panel).checked=false;get('enclosure-'+panel).handlers.change({target:get('enclosure-'+panel)});render();
 assert.equal(MotioV45.spatial.enclosure[panel],false);assert.ok(!MotioV45.spatial.pickFaces.some(f=>f.part?.id==='box-'+panel),panel+' can be hidden independently');
 for(const other of ['front','back','left','right','bottom'].filter(p=>p!==panel))assert.equal(MotioV45.spatial.enclosure[other],true);
 assert.deepEqual(drawingSnapshot(),unchanged);
 get('enclosure-'+panel).checked=true;get('enclosure-'+panel).handlers.change({target:get('enclosure-'+panel)});
}
for(const top of ['opaque','semi','transparent']){
 get('enclosure-top').value=top;get('enclosure-top').handlers.change({target:get('enclosure-top')});render();
 assert.equal(MotioV45.spatial.enclosure.top,top);assert.deepEqual(drawingSnapshot(),unchanged);
 const faces=MotioV45.spatial.pickFaces.filter(f=>f.part?.id==='BASE');
 if(top==='transparent')assert.equal(faces.length,0);else {
  assert.ok(faces.length>0);
  assert.ok(faces.every(f=>top==='semi'?/^#[\da-f]{6}66$/i.test(f.color):/^#[\da-f]{6}$/i.test(f.color)),top+' material opacity');
 }
}
get('enclosure-top').value='opaque';get('enclosure-top').handlers.change({target:get('enclosure-top')});
for(const mode of ['top','side','iso']){click('camera-'+mode);frames(8);assert.ok(MotioV45.spatial.pickFaces.length>0);}
get('microsteps').value='32';get('microsteps').handlers.change();assert.equal(MotioV45.simulation.config.motorStepsPerFullStep,32);assert.match(get('live-data').innerHTML,/1\/32 microsteps/);assert.equal(MotioV45.simulation.config.patternId,'flower5');get('microsteps').value='16';get('microsteps').handlers.change();click('home-btn');frames(110);click('play-btn');frames(60);
click('export-svg');assert.equal(downloads[0],'MOTIO-V4-5-mechanical.svg');assert.equal(blobs[0].type,'image/svg+xml;charset=utf-8');
click('nav-components');frames(2);assert.match(get('bom-body').innerHTML,/608-2RS/);assert.match(get('bom-body').innerHTML,/SY42STH38-1684A/);assert.equal((get('bom-head').innerHTML.match(/<th>/g)||[]).length,5);assert.doesNotMatch(get('bom-body').innerHTML,/UNKNOWN|riem|pulley|poelie|Validation state/i);
click('export-bom');assert.equal(downloads[1],'MOTIO-V4-5-BOM.csv');assert.ok(blobs[1].size>2000);
click('nav-simulator');click('pause-btn');frames(110);assert.equal(get('run-status').textContent,'GEPAUZEERD');assert.equal('penDown' in MotioV45.simulation,false);
assert.equal((get('live-data').innerHTML.match(/<dt>/g)||[]).length,5);assert.doesNotMatch(get('live-data').innerHTML,/Jacobian|quality|Branch|clearance/i);
get('rpm-a').value='0';get('rpm-a').handlers.change();frames(2);assert.equal(MotioV45.simulation.config.rpmA,0);assert.equal(get('run-status').textContent,'HOME VEREIST');
get('length-a').value='';get('length-a').handlers.change();assert.equal(get('length-a').value,MotioGeometry.DEFAULT_CONFIG.lengthA);
get('phase-c').value='25';get('phase-c').handlers.change();assert.equal(MotioV45.simulation.q.C,25*Math.PI/180);assert.ok(Number.isFinite(MotioV45.simulation.config.phaseB));
get('rpm-b').value='.3';get('dir-b').value='1';get('dir-b').handlers.change();assert.equal(MotioV45.simulation.config.rpmB,.3);
click('restore-btn');frames(2);assert.equal(MotioV45.simulation.config.radiusA,65);assert.equal(MotioV45.simulation.config.rpmA,.8);assert.ok(MotioV45.simulation.insideSafe);
for(const p of MotioPatterns.list){click('pattern-'+p.id);assert.equal(MotioV45.simulation.pattern.id,p.id);assert.ok(MotioV45.simulation.insideSafe);assert.ok(MotioV45.simulation.safe);assert.match(get('pattern-'+p.id).innerHTML,/<svg.*<path/);assert.equal(get('manual-controls').hidden,true);}
get('show-preview').handlers.change({target:{checked:false}});assert.equal(MotioV45.simulation.showPreview,false);click('custom-pattern');assert.equal(get('manual-controls').hidden,false);assert.equal(MotioV45.simulation.config.patternId,'');
click('nav-validation');frames(2);assert.equal((get('validation-body').innerHTML.match(/<tr>/g)||[]).length,5);assert.match(get('validation-body').innerHTML,/NIET BEWEZEN/);click('run-test');for(let i=0;i<800&&MotioV45.ui.test.running;i++)frames(1);assert.ok(MotioV45.ui.test.report.complete);assert.match(get('test-status').textContent,/Controle afgerond/);
// Shared config edits reset test and trace, update geometry and BOM, and reject invalid edits.
const cfg={...MotioV45.simulation.config,patternId:'',couplingRadius:10,lengthA:190,pivotAx:285};get('machine-config').value=JSON.stringify(cfg);click('apply-config');frames(2);assert.equal(MotioV45.ui.test,null);assert.equal(MotioV45.simulation.geometry.A.pivot.x,285);assert.match(get('bom-body').innerHTML,/Ø20/);assert.match(get('bom-body').innerHTML,/190/);click('nav-mechanical');click('mode-2d');frames(2);assert.doesNotMatch(get('mechanical-diagram').innerHTML,/NaN|undefined/);
get('machine-config').value=JSON.stringify({...cfg,couplingRadius:0});click('apply-config');assert.match(get('config-message').textContent,/positief/);assert.equal(MotioV45.simulation.config.couplingRadius,cfg.couplingRadius);
click('restore-btn');click('nav-simulator');click('home-btn');frames(110);click('play-btn');frames(60);click('stop-btn');frames(110);assert.equal(get('run-status').textContent,'GEPAUZEERD');click('clear-btn');assert.equal(MotioV45.simulation.trace.length,0);click('reset-btn');assert.equal(get('run-status').textContent,'HOME VEREIST');click('power-btn');assert.equal(get('run-status').textContent,'UIT');
MotioV45.simulation.fault='Grens veilige tekencirkel bereikt (radius 95 mm)';MotioV45.ui.render();assert.equal(get('run-status').textContent,'VEILIGE GRENS');assert.ok(get('live-data').innerHTML.includes('<dt>Mechanica</dt><dd>OK</dd>'));
assert.ok(MotioGeometry.bodies(MotioV45.simulation.geometry,MotioV45.simulation.pose).every(b=>MotioBOM.create(MotioV45.simulation.geometry).some(r=>r.id===b.bom)),'Every rendered part maps to the BOM');
console.log('V4-5 integration: initial Mechanical Design 3D, individual walls/bottom and three top materials without motion changes, four tabs, existing controls/cameras, pattern previews, canvas fallback, circular SVG, CSV, shared config and validation runner passed.');

