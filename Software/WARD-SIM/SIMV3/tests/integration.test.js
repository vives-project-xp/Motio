const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),elements=new Map();
const ctx=new Proxy({}, {get:(t,k)=>t[k]||((...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),'Finite canvas '+k);}),set:(t,k,v)=>{t[k]=v;return true;}});
function element(attrs=''){
 const value=attrs.match(/\bvalue="([^"]*)"/)?.[1]||'';
 return {value,defaultValue:value,min:attrs.match(/\bmin="([^"]*)"/)?.[1]||0,max:attrs.match(/\bmax="([^"]*)"/)?.[1]||100,hidden:false,handlers:{},classList:{toggle(){}},setAttribute(){},setPointerCapture(){},remove(){},addEventListener(k,fn){this.handlers[k]=fn;},getContext(type){return type==='2d'?ctx:null;},getBoundingClientRect(){return {width:820,height:580,left:0,top:0};},click(){if(this.handlers.click)this.handlers.click();if(this.download)downloads.push(this.download);}};
}
for(const [,attrs,id] of html.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g))elements.set(id,element(attrs));
const downloads=[],blobs=[];global.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:test';};global.URL.revokeObjectURL=()=>{};
global.window=global;global.document={body:{appendChild(){}},getElementById(id){assert.ok(elements.has(id),'Known element '+id);return elements.get(id);},createElement(){return element();}};
let queued;global.requestAnimationFrame=fn=>queued=fn;
for(const [,f] of html.matchAll(/<script src="js\/([^"]+)\.js"/g))vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),{filename:f});
const get=id=>elements.get(id),click=id=>get(id).click();let now=performance.now();
function frames(count){for(let i=0;i<count;i++){now+=20;queued(now);}}
frames(10);assert.equal(get('run-status').textContent,'POWER OFF');click('power-btn');click('home-btn');frames(110);assert.equal(get('run-status').textContent,'HOMED');
click('play-btn');frames(100);assert.equal(get('run-status').textContent,'RUNNING');assert.ok(MotioV3.simulation.trace.length>10);
click('nav-mechanical');frames(10);assert.equal(get('simulator-view').hidden,true);assert.match(get('mechanical-diagram').innerHTML,/O_A/);
click('mode-3d');frames(10);assert.equal(get('spatial-wrap').hidden,false);assert.ok(MotioV3.spatial.hits.length>20);
get('exploded').handlers.change({target:{checked:true}});frames(10);assert.match(get('section-diagram').innerHTML,/lokaliserende/);
for(const mode of ['top','side','iso']){click('camera-'+mode);frames(10);}
click('export-svg');assert.equal(downloads[0],'MOTIO-SimV3-mechanical.svg');assert.equal(blobs[0].type,'image/svg+xml;charset=utf-8');
click('nav-components');frames(10);assert.match(get('bom-body').innerHTML,/608-2RS/);click('export-bom');assert.equal(downloads[1],'MOTIO-SimV3-BOM.csv');assert.ok(blobs[1].size>2000);
click('nav-simulator');click('pause-btn');frames(150);assert.equal(get('run-status').textContent,'PAUSED');assert.equal('penDown' in MotioV3.simulation,false);
get('rpm-a').value='0';get('rpm-a').handlers.change();frames(10);assert.equal(MotioV3.simulation.config.rpmA,0);assert.equal(get('run-status').textContent,'NOT HOMED');
get('length-a').value='';get('length-a').handlers.change();assert.equal(get('length-a').value,360);
for(const preset of ['flower','slow','stationary','v2']){get('preset').handlers.change({target:{value:preset}});click('home-btn');frames(110);click('play-btn');frames(150);assert.equal(get('run-status').textContent,'RUNNING');click('stop-btn');frames(150);}
click('restore-btn');frames(10);assert.equal(MotioV3.simulation.config.radiusA,40);click('power-btn');frames(10);assert.equal(get('run-status').textContent,'POWER OFF');
console.log('V3 HTML, controls, navigation, presets, SVG and 3D/canvas integration passed.');

click('nav-validation');frames(2);assert.match(get('validation-body').innerHTML,/FAIL/);click('run-test');for(let i=0;i<600&&MotioV3.ui.test.running;i++)frames(1);assert.ok(MotioV3.ui.test.report.complete);assert.ok(MotioV3.ui.test.report.critical>0);assert.match(get('test-status').textContent,/Validation Report/);
for(const mode of ['assembly','drive','bearing','section','pen','exploded']){get('engineering-mode').handlers.change({target:{value:mode}});click('nav-mechanical');click('mode-3d');frames(2);assert.ok(MotioV3.spatial.hits.length>0);click('mode-2d');frames(2);assert.doesNotMatch(get('mechanical-diagram').innerHTML,/NaN|undefined/);}
get('workspace-toggle').handlers.change({target:{checked:true}});click('nav-simulator');frames(2);assert.ok(MotioV3.simulation.showWorkspace);
get('ik-x').value='230.048582';get('ik-y').value='154.414114';click('ik-solve');assert.match(get('ik-result').textContent,/oplossingen/);
const cfg={...MotioV3.simulation.config,paperRadius:280,paperX:220,paperY:155,outputTeethA:64,lengthA:370,pivotAx:560};get('machine-config').value=JSON.stringify(cfg);click('apply-config');frames(2);assert.equal(MotioV3.ui.test,null);assert.equal(MotioV3.simulation.geometry.A.pivot.x,560);assert.match(get('bom-body').innerHTML,/Ø560/);assert.match(get('bom-body').innerHTML,/64T/);click('nav-mechanical');frames(2);assert.doesNotMatch(get('mechanical-diagram').innerHTML,/NaN|undefined/);
console.log('Engineering modes, workspace, IK, shared config, test runner and validation passed.');
