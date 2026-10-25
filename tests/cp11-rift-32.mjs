/** JM CP11 Rift Trial · 32 independent Chromium/WebGL checks.
 * matrix CASE_INDEX=0..31. Each job launches a new browser + isolated session.
 * No instrumentation of engine internals and no direct state mutation.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { JMMeshCompiler } from '../engine/gamecore/JMMeshCompiler.js';

const scenario=Number(process.env.CASE_INDEX);
assert.ok(Number.isInteger(scenario)&&scenario>=0&&scenario<32,'CASE_INDEX 0–31 is required');
const mode=scenario%8,iteration=Math.floor(scenario/8);
const layouts=[{width:320,height:710},{width:360,height:780},{width:390,height:850},{width:658,height:840}];
const dimensions=layouts[iteration];
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
assert.ok(chrome,'A real Chromium binary must be present');
const root=process.cwd();const pagePath='/engine/demo/cp11-rift-trial-v0.4.html';
let port;
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const file=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{
  let body=readFileSync(file);
  if(url.pathname===pagePath){body=Buffer.from(body.toString()
   .replace("const BASE='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@95a529c26341751af3d26f1a4499a1481801c047/engine/';",`const BASE='http://127.0.0.1:${port}/engine/';`)
   .replace("const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';",`const THREE_URL='http://127.0.0.1:${port}/node_modules/three/build/three.module.js';`));}
  res.setHeader('Content-Type',extname(file)==='.html'?'text/html;charset=utf-8':'text/javascript;charset=utf-8');res.end(body);
 }catch{res.writeHead(404);res.end('file not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));port=server.address().port;
let browser;
const start=Date.now();
const errs=[];
let evidence={};
const getReceipt=async page=>page.evaluate(()=>({...window.__CP11}));
const wait=async(page,test,timeout=15000)=>{try{return await page.waitForFunction(test,null,{timeout});}catch(e){console.error('CP11_CASE_HOLD',JSON.stringify({case:scenario,mode,receipt:await getReceipt(page),errors:errs}));throw e;}};
const click=async(page,selector)=>page.locator(selector).click({timeout:14000});
async function clearTargets(page,n,selector,limit){
 for(let i=0;i<limit;i++){
  if(await page.evaluate(([target,n])=>window.__CP11[target]===n,[selector,n]))return i;
  await page.waitForTimeout(570);
  await click(page,'#pulse');
 }
 await wait(page,`window.__CP11.${selector}===${n}`,22000);
 return limit;
}
try{
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:dimensions,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 page.on('pageerror',e=>errs.push('page:'+e.message));
 page.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
 page.on('requestfailed',q=>errs.push('request:'+q.url()));
 await page.goto(`http://127.0.0.1:${port}${pagePath}`,{waitUntil:'load',timeout:35000});
 await wait(page,()=>window.__CP11?.state==='LIVE_WEBGL',45000);
 const init=await getReceipt(page);
 assert.equal(init.version,'JM.CP11.LivingForm/0.4');
 assert.equal(init.donorHead,'95a529c26341751af3d26f1a4499a1481801c047');
 assert.ok(init.compiledOrgans>=38 && init.vertices>=500 && init.triangles>=800);
 assert.ok(init.drawCalls>0 && init.drawCalls<80);
 assert.equal(init.phase,1);assert.equal(init.health,100);
 const width=await page.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(width<=dimensions.width+1,'no horizontal overflow');
 const surface=await page.evaluate(()=>{
  const c=document.getElementById('surface');const gl=c.getContext('webgl2');if(!gl)return null;
  const sample=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);};
  return {center:sample(Math.floor(c.width/2),Math.floor(c.height/2)),background:sample(2,2)};
 });
 assert.ok(surface && surface.center.some((n,i)=>i<3&&Math.abs(n-surface.background[i])>6),'visible WebGL raster pixels');
 evidence={mode,iteration,layout:dimensions,organs:init.compiledOrgans,drawCalls:init.drawCalls};
 if(mode===0){
   await wait(page,()=>window.__CP11.fps>0,12000);
   const ir=JMMeshCompiler.compile('mesh Proof {\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\ncolor #000000\ndeform pulse amp=0.14 freq=2\n}');
   assert.equal(ir.vertexBuffer.length,9);assert.equal(ir.indexBuffer.length,3);assert.equal(ir.color,0);
   assert.throws(()=>JMMeshCompiler.compile('v 0 0 0\nv 1 0 0\nf 0 1 4'));
   evidence.type='GPU + Native typed compilation + malformed rejection';
 } else if(mode===1){
   await click(page,'#t2');assert.equal((await getReceipt(page)).target,3);
   await click(page,'#next');assert.equal((await getReceipt(page)).target,1);
   await click(page,'#view');assert.equal((await getReceipt(page)).cameraMode,'hero');
   await click(page,'#center');assert.equal((await getReceipt(page)).cameraMode,'wide');
   evidence.type='target routing + camera switches';
 } else if(mode===2){
   const p=await page.locator('#joy').boundingBox();assert.ok(p);
   const x=p.x+p.width/2,y=p.y+p.height/2;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+27,y-27,{steps:4});
   await wait(page,()=>window.__CP11.motion.x>.4&&window.__CP11.motion.z<-.4,4000);
   await page.waitForTimeout(460);const pos=(await getReceipt(page)).actorPosition;
   assert.ok(pos.x>.06&&pos.z<-.06,'two-axis world consequence');
   await page.mouse.up();await wait(page,()=>window.__CP11.motion.x===0&&window.__CP11.motion.z===0,5000);
   evidence.type='2-axis touch movement',evidence.position=pos;
 } else if(mode===3){
   await click(page,'#dash');const r=await getReceipt(page);
   assert.equal(r.dashes,1);assert.ok(r.contacts.some(c=>c.type==='DASH_EVADE'));
   assert.ok(await page.locator('#dash').isDisabled(),'cooldown disables a second dash');
   assert.equal((await getReceipt(page)).dashes,1,'cooldown prevents double dash');
   evidence.type='evasive dash, invulnerability receipt, cooldown';
 } else if(mode===4){
   await click(page,'#pause');assert.ok((await getReceipt(page)).contacts.some(c=>c.type==='PAUSE'&&c.detail.active===true));
   await click(page,'#pause');assert.ok((await getReceipt(page)).contacts.some(c=>c.type==='PAUSE'&&c.detail.active===false));
   await click(page,'#guard');await wait(page,()=>window.__CP11.actions.guard===1);
   evidence.type='pause/resume and active guard';
 } else if(mode===5){
   await click(page,'#t0');await click(page,'#pulse');await wait(page,()=>window.__CP11.actions.pulse>=1);
   assert.ok((await getReceipt(page)).contacts.some(c=>c.type==='PULSE_FIRED'&&c.detail.toward===1));
   await click(page,'#slam');await wait(page,()=>window.__CP11.actions.slam===1);
   evidence.type='selected lock-on projectile + ground slam';
 } else if(mode===6){
   await click(page,'#pulse');await page.waitForTimeout(650);await click(page,'#restart');
   await wait(page,()=>window.__CP11.contacts.some(c=>c.type==='RESTART'));
   assert.equal((await getReceipt(page)).seals,0);
   assert.equal((await getReceipt(page)).phase,1);
   assert.ok(await page.locator('#dash').isVisible());
   evidence.type='live restart, original mission and dash retained';
 } else {
   // Entire earned three-phase route, using ONLY actual user-facing controls.
   await clearTargets(page,3,'seals',22);
   await click(page,'#awaken');await wait(page,()=>window.__CP11.phase===2,9000);
   await click(page,'#awaken');await wait(page,()=>window.__CP11.actions.surge===1,6000);
   await clearTargets(page,3,'echoes',26);
   const firstWin=await getReceipt(page);assert.equal(firstWin.victory,true);
   assert.equal(await page.locator('#trial').isVisible(),true);
   await click(page,'#trial');await wait(page,()=>window.__CP11.phase===3,10000);
   const trial=await getReceipt(page);assert.ok(trial.compiledOrgans>=62);assert.equal(trial.trial,true);
   await click(page,'#dash');assert.equal((await getReceipt(page)).dashes,1);
   await click(page,'#awaken');await wait(page,()=>window.__CP11.actions.surge===2,10000);
   await clearTargets(page,3,'facets',36);
   const final=await getReceipt(page);
   assert.ok(final.victory&&final.contacts.some(c=>c.type==='RIFT_TRIAL_VICTORY'));
   assert.equal(final.record.trial,1);
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('JM.CP11.RiftTrial.v0.4')));
   assert.equal(saved.trial,1);assert.equal(saved.echoes,3);assert.equal(saved.seals,3);
   await click(page,'#restart');await wait(page,()=>window.__CP11.phase===1);
   assert.equal((await getReceipt(page)).record.trial,1,'medal retained after restart');
   evidence.type='FULL 3-PHASE gameplay + dash + Surge + Crown victory + permanent medal',evidence.final=final.actions;
 }
 assert.deepEqual(errs,[], 'no JS errors or failed asset requests');
 mkdirSync('cp11-evidence',{recursive:true});
 const shot=`cp11-evidence/cp11-rift-case-${String(scenario).padStart(2,'0')}.png`;
 await page.screenshot({path:shot,animations:'disabled'});
 console.log('CP11_RIFT_CONTACT_PASS '+JSON.stringify({case:scenario,totalCases:32,elapsedMs:Date.now()-start,...evidence,errors:errs}));
 await context.close();
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}