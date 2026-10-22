// Optional real Chromium smoke check. Start tests/serve.js first.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.MOTIO_NODE_MODULES||'','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4178/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.MotioV7?.spatial?.pickFaces?.length>0);
  await page.screenshot({path:path.resolve(__dirname,'../exports/SIMV7-browser.png'),fullPage:true});
  assert.equal(await page.locator('#run-status').innerText(),'UIT');
  assert.ok(await page.evaluate(()=>!!MotioV7.spatial.gl),'Real depth-rendered WebGL model');
  await page.locator('#nav-components').click();
  assert.equal(await page.locator('#bom-head th').count(),6);
  assert.equal(await page.locator('#bom-body tr').count(),41);
  assert.equal(await page.locator('#bom-body a').count(),41);
  await page.locator('#nav-assembly').click();
  assert.equal(await page.locator('#assembly-counter').innerText(),'Stap 1 van 40');
  await page.locator('#assembly-next').click();
  assert.equal(await page.locator('#assembly-counter').innerText(),'Stap 2 van 40');
  await page.locator('#nav-simulator').click();
  await page.locator('#power-btn').click();await page.locator('#home-btn').click();
  await page.waitForFunction(()=>MotioV7.simulation.homed);
  await page.locator('#play-btn').click();
  await page.waitForFunction(()=>MotioV7.simulation.trace.length>5);
  await page.locator('#pause-btn').click();
  await page.waitForFunction(()=>!MotioV7.simulation.running);
  assert.equal(await page.evaluate(()=>MotioV7.simulation.fault),'');
  assert.deepEqual(errors,[]);
  for(const name of ['README.md','SOURCING.md','DESIGN.md','exports/PRINTING.md'])assert.ok(fs.existsSync(path.resolve(__dirname,'..',name)));
  console.log('SIMV7 Chromium: WebGL model, linked BOM, assembly navigation and live Home/Play/Pause passed without page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
