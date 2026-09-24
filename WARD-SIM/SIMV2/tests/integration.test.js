const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const elements = new Map();
const context = new Proxy({}, {get: (target, key) => target[key] || ((...args) => {for (const v of args) if (typeof v === 'number') assert.ok(Number.isFinite(v), 'Canvas receives finite coordinates');}), set: (target,key,value) => { target[key]=value;return true; }});
for (const match of html.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
 const [,tag,attrs,id]=match; const value=attrs.match(/\bvalue="([^"]*)"/)?.[1] || (id==='direction'?'1':'');
 elements.set(id,{value,defaultValue:value,disabled:false,textContent:'',handlers:{},addEventListener(event,handler){this.handlers[event]=handler;},getContext(){return context;},getBoundingClientRect(){return {width:740,height:520};}});
}
global.window=global;global.document={getElementById(id){assert.ok(elements.has(id),'Known HTML element: '+id);return elements.get(id);}};
let queued;global.requestAnimationFrame=fn=>{queued=fn;};
for(const file of ['math','simulation','renderers','ui','app'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),{filename:file});
const get=id=>elements.get(id);const click=id=>get(id).handlers.click();
let now=performance.now();function frames(n){for(let i=0;i<n;i++){now+=20;queued(now);}}
frames(1);assert.equal(get('run-status').textContent,'POWER OFF');assert.equal(get('play-btn').disabled,true);
click('power-btn');click('home-btn');frames(110);assert.equal(get('run-status').textContent,'HOMED');assert.equal(get('play-btn').disabled,false);
click('pen-btn');click('play-btn');frames(60);assert.equal(get('run-status').textContent,'RUNNING');assert.ok(parseInt(get('point-count').textContent)>10);
get('engineering').handlers.change({target:{checked:true}});frames(2);
click('pause-btn');frames(1);assert.equal(get('run-status').textContent,'PAUSED');
click('stop-btn');frames(1);assert.match(get('pen-btn').textContent,/PEN UP/);
get('arm-a-teeth').value='72';get('arm-a-teeth').handlers.change();frames(1);assert.equal(get('run-status').textContent,'NOT HOMED');assert.match(get('data-teeth').textContent,/72T/);
get('arm-a-teeth').value='';get('arm-a-teeth').handlers.change();frames(1);assert.equal(get('arm-a-teeth').value,37);
click('power-btn');frames(1);assert.equal(get('run-status').textContent,'POWER OFF');
console.log('V2 HTML, controls, renderers and animation-loop integration passed.');
