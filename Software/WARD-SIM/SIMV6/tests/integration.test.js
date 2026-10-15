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
frames(10);assert.equal(get('run-status').textContent,'UIT');assert.equal((html.match(/id="nav-/g)||[]).length,5);
assert.equal(MotioV6.ui.view,'mechanical');assert.equal(MotioV6.ui.mode,'3d');assert.equal(get('spatial-wrap').hidden,false);
assert.deepEqual(MotioV6.spatial.enclosure,{front:true,back:true,left:true,right:true,bottom:true,top:'opaque'});
// The guide builds the existing geometry cumulatively without changing the simulator.
const stepCount=MotioAssembly.steps.length;assert.ok(stepCount>6);
const guide=MotioV6.ui.assembly,simBefore=JSON.stringify({q:MotioV6.simulation.q,state:MotioV6.simulation.state,trace:MotioV6.simulation.trace,config:MotioV6.simulation.config});
click('nav-assembly');assert.equal(get('assembly-view').hidden,false);assert.equal(get('mechanical-view').hidden,true);assert.equal(guide.active,true);
assert.equal(get('assembly-counter').textContent,'Stap 1 van '+stepCount);assert.equal(get('assembly-prev').disabled,true);assert.equal(get('assembly-next').disabled,false);
const allParts=MotioGeometry.bodies(guide.model.geometry,guide.model.pose),visibleIds=()=>new Set(guide.renderer.pickFaces.filter(f=>f.part).map(f=>f.part.id));
assert.ok(allParts.every(p=>MotioAssembly.stageOf(p)>=0),'Every model body has an explicit mounting step');
assert.equal(MotioBOM.create(guide.model.geometry).filter(r=>r.qty===0).length,0,'No unmodelled BOM entries');
const faceFor=id=>guide.renderer.pickFaces.find(f=>f.part?.id===id);
const placement=id=>{const p=faceFor(id).part;return JSON.stringify({x:p.x,y:p.y,z:p.z,a:p.a,b:p.b});};
let stableFaces=new Map();
for(let step=0;step<MotioAssembly.steps.length;step++){
 assert.equal(guide.step,step);assert.equal(guide.progress,0);assert.equal(guide.startedAt,null);
 frames(1);const activePart=guide.current[0],startFace=placement(activePart.id);
 assert.ok(get('assembly-parts').innerHTML.includes('in deze stap')&&get('assembly-parts').innerHTML.includes('Materiaal'));
 assert.ok(guide.preview.pickFaces.length>0,'Isolated close-up is drawn');
 assert.ok(guide.preview.pickFaces.every(f=>!f.part||MotioAssembly.isCurrent(f.part,step)),'Close-up contains the component being mounted');
 assert.deepEqual(new Set(guide.previewParts.map(p=>p.bom)),new Set(guide.current.map(p=>p.bom)),'Every new component type gets an isolated example');
 for(const [id,points] of stableFaces)assert.equal(placement(id),points,'Earlier part stays in its mounting position at the start of the next step: '+id);
 assert.deepEqual(visibleIds(),new Set(allParts.filter(p=>MotioAssembly.stageOf(p)<=step).map(p=>p.id)),'No future parts; all previous parts remain');
 now+=guide.duration/2;frames(2);assert.ok(guide.progress>0&&guide.progress<1);const midwayFace=placement(activePart.id);assert.notEqual(midwayFace,startFace,'Current part moves during playback');
 for(const [id,position] of stableFaces)if(!MotioAssembly.isCurrent(allParts.find(p=>p.id===id),step))assert.equal(placement(id),position,'Unrelated earlier part stays fixed throughout playback: '+id);
 now+=guide.duration/2;frames(2);assert.equal(guide.progress,1);assert.notEqual(placement(activePart.id),midwayFace,'Current part reaches its final position');
 assert.equal(get('assembly-counter').textContent,'Stap '+(step+1)+' van '+stepCount);assert.equal(get('assembly-title').textContent,MotioAssembly.steps[step].title);assert.equal(get('assembly-progress').value,step+1);
 stableFaces=new Map(allParts.filter(p=>MotioAssembly.stageOf(p)<=step).map(p=>[p.id,placement(p.id)]));
 click('assembly-next');
}
assert.equal(guide.step,stepCount-1);assert.equal(get('assembly-next').disabled,true);assert.equal(get('assembly-prev').disabled,false);
assert.deepEqual(visibleIds(),new Set(allParts.map(p=>p.id)),'Completed model contains every mechanical body');
assert.equal(guide.renderer.pickFaces.filter(f=>!f.part).length>0,true,'Paper is visible on the assembled platter');
click('assembly-replay');assert.equal(guide.progress,0);frames(1);assert.equal(guide.progress,0);now+=guide.duration;frames(2);assert.equal(guide.progress,1);
for(let step=stepCount-2;step>=0;step--){click('assembly-prev');assert.equal(guide.step,step);assert.equal(guide.progress,0);frames(1);assert.deepEqual(visibleIds(),new Set(allParts.filter(p=>MotioAssembly.stageOf(p)<=step).map(p=>p.id)));}
click('assembly-prev');assert.equal(guide.step,0);assert.equal(get('assembly-prev').disabled,true);
assert.equal(guide.renderer.pickFaces.filter(f=>!f.part).length,0,'Paper stays hidden until the platter step');
assert.equal(JSON.stringify({q:MotioV6.simulation.q,state:MotioV6.simulation.state,trace:MotioV6.simulation.trace,config:MotioV6.simulation.config}),simBefore);
click('nav-mechanical');assert.equal(guide.active,false);assert.equal(get('assembly-view').hidden,true);const closedProgress=guide.progress;frames(10);assert.equal(guide.progress,closedProgress);
click('nav-assembly');assert.equal(guide.progress,0);assert.equal(guide.startedAt,null);frames(2);assert.ok(guide.progress<1,'Reopening automatically replays the selected step');click('nav-mechanical');
click('power-btn');click('home-btn');frames(110);assert.equal(get('run-status').textContent,'KLAAR');
click('play-btn');frames(170);assert.equal(get('run-status').textContent,'TEKENEN');assert.ok(MotioV6.simulation.trace.length>10);
click('nav-mechanical');click('mode-2d');frames(6);assert.equal(get('simulator-view').hidden,true);assert.ok(get('mechanical-diagram').innerHTML.includes('aria-label="Motor A"'));assert.match(get('mechanical-diagram').innerHTML,/r="95"/);
click('mode-3d');frames(8);assert.equal(get('spatial-wrap').hidden,false);assert.ok(MotioV6.spatial.hits.length>20);
// The enclosure is strictly presentation state. Render without advancing animation.
const drawingSnapshot=()=>({q:{...MotioV6.simulation.q},state:MotioV6.simulation.state,time:MotioV6.simulation.time,traceLength:MotioV6.simulation.trace.length,geometry:MotioV6.simulation.geometry,config:MotioV6.simulation.config});
const unchanged=drawingSnapshot(),render=()=>MotioV6.spatial.render(MotioV6.simulation,false,'assembly');
for(const panel of ['front','back','left','right','bottom']){
 render();assert.ok(MotioV6.spatial.pickFaces.some(f=>f.part?.id==='box-'+panel),panel+' starts visible');
 get('enclosure-'+panel).checked=false;get('enclosure-'+panel).handlers.change({target:get('enclosure-'+panel)});render();
 assert.equal(MotioV6.spatial.enclosure[panel],false);assert.ok(!MotioV6.spatial.pickFaces.some(f=>f.part?.id==='box-'+panel),panel+' can be hidden independently');
 for(const other of ['front','back','left','right','bottom'].filter(p=>p!==panel))assert.equal(MotioV6.spatial.enclosure[other],true);
 assert.deepEqual(drawingSnapshot(),unchanged);
 get('enclosure-'+panel).checked=true;get('enclosure-'+panel).handlers.change({target:get('enclosure-'+panel)});
}
for(const top of ['opaque','semi','transparent']){
 get('enclosure-top').value=top;get('enclosure-top').handlers.change({target:get('enclosure-top')});render();
 assert.equal(MotioV6.spatial.enclosure.top,top);assert.deepEqual(drawingSnapshot(),unchanged);
 const faces=MotioV6.spatial.pickFaces.filter(f=>f.part?.id==='BASE');
 if(top==='transparent')assert.equal(faces.length,0);else {
  assert.ok(faces.length>0);
  assert.ok(faces.every(f=>top==='semi'?/^#[\da-f]{6}66$/i.test(f.color):/^#[\da-f]{6}$/i.test(f.color)),top+' material opacity');
 }
}
get('enclosure-top').value='opaque';get('enclosure-top').handlers.change({target:get('enclosure-top')});
for(const mode of ['top','side','iso']){click('camera-'+mode);frames(8);assert.ok(MotioV6.spatial.pickFaces.length>0);}
get('microsteps').value='32';get('microsteps').handlers.change();assert.equal(MotioV6.simulation.config.motorStepsPerFullStep,32);assert.match(get('live-data').innerHTML,/1\/32 microsteps/);assert.equal(MotioV6.simulation.config.patternId,'flower5');get('microsteps').value='16';get('microsteps').handlers.change();click('home-btn');frames(110);click('play-btn');frames(60);
click('export-svg');assert.equal(downloads[0],'MOTIO-V6-mechanical.svg');assert.equal(blobs[0].type,'image/svg+xml;charset=utf-8');
click('nav-components');frames(2);assert.match(get('bom-body').innerHTML,/608-2RS/);assert.match(get('bom-body').innerHTML,/SY42STH38-1684A/);assert.equal((get('bom-head').innerHTML.match(/<th>/g)||[]).length,5);assert.doesNotMatch(get('bom-body').innerHTML,/UNKNOWN|riem|pulley|poelie|Validation state/i);
click('export-bom');assert.equal(downloads[1],'MOTIO-V6-BOM.csv');assert.ok(blobs[1].size>2000);
click('nav-simulator');click('pause-btn');frames(110);assert.equal(get('run-status').textContent,'GEPAUZEERD');assert.equal('penDown' in MotioV6.simulation,false);
assert.equal((get('live-data').innerHTML.match(/<dt>/g)||[]).length,5);assert.doesNotMatch(get('live-data').innerHTML,/Jacobian|quality|Branch|clearance/i);
get('rpm-a').value='0';get('rpm-a').handlers.change();frames(2);assert.equal(MotioV6.simulation.config.rpmA,0);assert.equal(get('run-status').textContent,'HOME VEREIST');
get('length-a').value='';get('length-a').handlers.change();assert.equal(get('length-a').value,MotioGeometry.DEFAULT_CONFIG.lengthA);
get('phase-c').value='25';get('phase-c').handlers.change();assert.equal(MotioV6.simulation.q.C,25*Math.PI/180);assert.ok(Number.isFinite(MotioV6.simulation.config.phaseB));
get('rpm-b').value='.3';get('dir-b').value='1';get('dir-b').handlers.change();assert.equal(MotioV6.simulation.config.rpmB,.3);
click('restore-btn');frames(2);assert.equal(MotioV6.simulation.config.radiusA,65);assert.equal(MotioV6.simulation.config.rpmA,.8);assert.ok(MotioV6.simulation.insideSafe);
for(const p of MotioPatterns.list){click('pattern-'+p.id);assert.equal(MotioV6.simulation.pattern.id,p.id);assert.ok(MotioV6.simulation.insideSafe);assert.ok(MotioV6.simulation.safe);assert.match(get('pattern-'+p.id).innerHTML,/<svg.*<path/);assert.equal(get('manual-controls').hidden,true);}
get('show-preview').handlers.change({target:{checked:false}});assert.equal(MotioV6.simulation.showPreview,false);click('custom-pattern');assert.equal(get('manual-controls').hidden,false);assert.equal(MotioV6.simulation.config.patternId,'');
click('nav-validation');frames(2);assert.equal((get('validation-body').innerHTML.match(/<tr>/g)||[]).length,8);assert.match(get('validation-body').innerHTML,/NIET BEWEZEN/);click('run-test');for(let i=0;i<6000&&MotioV6.ui.test.running;i++)frames(1);assert.ok(MotioV6.ui.test.report.complete);assert.match(get('test-status').textContent,/Controle afgerond/);
// Shared config edits reset test and trace, update geometry and BOM, and reject invalid edits.
const cfg={...MotioV6.simulation.config,patternId:'',lengthA:190,pivotAx:285};get('machine-config').value=JSON.stringify(cfg);click('apply-config');frames(2);assert.equal(MotioV6.ui.test,null);assert.equal(MotioV6.simulation.geometry.A.pivot.x,285);assert.match(get('bom-body').innerHTML,/Ø32/);assert.match(get('bom-body').innerHTML,/190/);click('nav-mechanical');click('mode-2d');frames(2);assert.doesNotMatch(get('mechanical-diagram').innerHTML,/NaN|undefined/);
get('machine-config').value=JSON.stringify({...cfg,hubRadius:0});click('apply-config');assert.match(get('config-message').textContent,/positief/);assert.equal(MotioV6.simulation.config.hubRadius,cfg.hubRadius);
click('restore-btn');click('nav-simulator');click('home-btn');frames(110);click('play-btn');frames(60);click('stop-btn');frames(110);assert.equal(get('run-status').textContent,'GEPAUZEERD');click('clear-btn');assert.equal(MotioV6.simulation.trace.length,0);click('reset-btn');assert.equal(get('run-status').textContent,'HOME VEREIST');click('power-btn');assert.equal(get('run-status').textContent,'UIT');
MotioV6.simulation.fault='Grens veilige tekencirkel bereikt (radius 95 mm)';MotioV6.ui.render();assert.equal(get('run-status').textContent,'VEILIGE GRENS');assert.ok(get('live-data').innerHTML.includes('<dt>Mechanica</dt><dd>OK</dd>'));
assert.ok(MotioGeometry.bodies(MotioV6.simulation.geometry,MotioV6.simulation.pose).every(b=>MotioBOM.create(MotioV6.simulation.geometry).some(r=>r.id===b.bom)),'Every rendered part maps to the BOM');
console.log('V6 integration: detailed cumulative assembly steps, automatic animation and replay, backward navigation and limits, fixed prior parts, unchanged simulation, five tabs, existing controls/cameras, enclosure, patterns, canvas fallback, SVG/CSV, shared config and validation passed.');
