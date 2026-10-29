/**
 * CP06: true source-linked independently openable FTR R1 carrier.
 * Shares original JM frozen five JS limbs/styles, replaces ONLY defective
 * renderer in the R1 scope. Tests browser start, source lineage and offline PWA.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const base='estate-publication/apps-tools-games/games/';
const r1=base+'ftr-first-person-v0.5.1-r1/';
const old=base+'ftr-first-person-v0.5.1/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'};
const http=createServer(async(req,res)=>{
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  // Static hosting maps directory requests to index.html; mirror that in local proof.
  const path=requested.endsWith('/')?requested+'index.html':requested;
  const full=resolve(root,'.'+path);
  if(!full.startsWith(root+sep))throw Error('OUTSIDE_SOURCE');
  const contents=await readFile(full);
  res.writeHead(200,{'content-type':mime[extname(full)]??'application/octet-stream','x-content-type-options':'nosniff'});
  res.end(contents);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>http.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+http.address().port+'/';
let browser,context,done=0;const failures=[];
const check=async(name,fn)=>{await fn();done++;console.log('PASS',name)};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'allow'});
 const page=await context.newPage();
 await page.addInitScript(()=>{
   const pad={connected:false,mapping:'standard',id:'JM virtual test gamepad',axes:[0,0,0,0],
     buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
   window.__JM_TEST_GAMEPAD=pad;
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__JM_TEST_GAMEPAD]});
 });
 page.on('pageerror',e=>failures.push(e.message));
 const target=origin+r1+'index.html';
 const resp=await page.goto(target,{waitUntil:'load'});
 await check('R1 external source-linked HTML served independently',async()=>{
  assert.equal(resp.status(),200);
  assert.match(await page.title(),/v0\.5\.1-R1/);
 });
 await check('R1 uses existing five original JS limbs without copying',async()=>{
  const names=await page.evaluate(()=>Array.from(document.scripts).map(x=>x.getAttribute('src')).filter(Boolean));
  const shared=names.filter(x=>x.startsWith('../ftr-first-person-v0.5.1/'));
  assert.equal(shared.length,5);
  assert(names.includes('ftr-hud-render-loop.js'));
  assert.equal(await page.evaluate(()=>window.FTR?.version),'0.5.1');
 });
 await check('Frozen original renderer unchanged, R1 exact repaired difference',async()=>{
  const [a,b]=await Promise.all([
    (await readFile(resolve(root,old+'ftr-hud-render-loop.js'))).toString('utf8'),
    (await readFile(resolve(root,r1+'ftr-hud-render-loop.js'))).toString('utf8')
  ]);
  assert(a.includes('ctx.scale(side<0?-1:1)'));
  assert.equal(b,a.replace('ctx.scale(side<0?-1:1)','ctx.scale(side<0?-1:1,1)'));
 });
 await check('R1 starts and renders continuously in real browser',async()=>{
  await page.locator('#startBtn').tap();
  const before=await page.evaluate(()=>window.FTR.state());
  await page.waitForTimeout(330);
  const after=await page.evaluate(()=>window.FTR.state());
  assert(after.running&&after.time>before.time+.1);
  assert(after.run.events.some(e=>e.event==='RUN_START'));
 });
 await check('R1 mobile touch FIRE/SCAN work in existing original game',async()=>{
  const before=await page.evaluate(()=>window.FTR.state());
  await page.locator('#fire').tap();
  await page.locator('#scan').tap();
  const after=await page.evaluate(()=>window.FTR.state());
  assert.equal(after.run.shots,before.run.shots+1);
  assert.equal(after.run.scans,before.run.scans+1);
 });
 await check('R1 original game actually mounts optional standard Gamepad recipient',async()=>{
  const input=await page.evaluate(()=>({schema:window.FTRGamepad.schema,
    mapping:window.FTRGamepad.mapping,status:window.FTRGamepad.status()}));
  assert.equal(input.schema,'jm.ftr.first-person.existing-gamepad-contact/0.1');
  assert.equal(input.mapping,'standard-only');
  assert.equal(input.status.physicalContactClaim,false);
 });
 await check('Virtual standard Gamepad FIRE causes real original ammo consumption',async()=>{
  await page.waitForTimeout(230);
  const before=await page.evaluate(()=>window.FTR.state());
  await page.evaluate(()=>{window.__JM_TEST_GAMEPAD.connected=true;window.__JM_TEST_GAMEPAD.buttons[0].pressed=true;});
  await page.waitForTimeout(75);
  await page.evaluate(()=>window.__JM_TEST_GAMEPAD.buttons[0].pressed=false);
  const after=await page.evaluate(()=>window.FTR.state());
  assert.equal(after.run.shots,before.run.shots+1);
  assert.equal(after.player.ammo,before.player.ammo-1);
  assert.equal(await page.evaluate(()=>window.FTRGamepad.status().connected),true);
 });
 await check('Virtual standard Gamepad stick physically moves original game avatar',async()=>{
  await page.evaluate(()=>{
   window.FTR.test.freezeEnemies();
   window.FTR.test.setPlayer(14.4,15.4,-Math.PI/2);
   window.__JM_TEST_GAMEPAD.axes[1]=-.85;
  });
  const before=await page.evaluate(()=>window.FTR.state().player);
  await page.waitForTimeout(420);
  const after=await page.evaluate(()=>window.FTR.state().player);
  await page.evaluate(()=>window.__JM_TEST_GAMEPAD.axes[1]=0);
  assert(Math.hypot(after.x-before.x,after.y-before.y)>.15);
 });
 await check('Unrecognised Gamepad mapping is shown as unsupported, never invented',async()=>{
  await page.evaluate(()=>{window.__JM_TEST_GAMEPAD.connected=true;window.__JM_TEST_GAMEPAD.mapping='vendor';});
  await page.waitForTimeout(70);
  const st=await page.evaluate(()=>window.FTRGamepad.status());
  assert.equal(st.connected,false);
  assert.equal(st.unsupported,true);
  await page.evaluate(()=>{window.__JM_TEST_GAMEPAD.connected=false;window.__JM_TEST_GAMEPAD.mapping='standard';});
 });
 await check('R1 PWA worker installs independently of frozen original',async()=>{
  await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('PWA_WORKER_INSTALL_TIMEOUT')),12000))]));
  const scope=await page.evaluate(async()=>{
   const reg=await navigator.serviceWorker.ready;return reg.scope;
  });
  assert(scope.endsWith('/'+r1));
 });
 await check('R1 offline reload actually reopens with all shared source cached',async()=>{
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);
  try{
   const response=await page.reload({waitUntil:'load',timeout:12000});
   assert(response?.status()===200);
   assert.equal(await page.evaluate(()=>window.FTR?.version),'0.5.1');
   await page.locator('#startBtn').tap();
   await page.waitForTimeout(220);
   const state=await page.evaluate(()=>window.FTR.state());
   assert.equal(state.running,true);
   assert(state.time>.04);
  }finally{await context.setOffline(false);}
 });
 await check('R1 independent cold reload has no browser JS faults',async()=>assert.deepEqual(failures,[]));
 console.log(JSON.stringify({schema:'jm.ftr.existing-game-source-linked-carrier/0.1',passed:done,failed:0,
   proof:'real Chromium mobile emulation, source-linked renderer correction, offline PWA reload',
   sourceOriginalFrozen:true,sourceDuplicated:false,coreVersion:'0.5.1',carrier:'0.5.1-R1',
   onlineDeployment:'NOT_CLAIMED',ownerPhysicalPhone:'NOT_TESTED'}));
}finally{if(context)await context.close();if(browser)await browser.close();await new Promise(ok=>http.close(ok));}
