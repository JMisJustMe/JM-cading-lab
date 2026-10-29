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
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'};
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
 const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
 if(process.env.JM_BROWSER_EXECUTABLE)launch.executablePath=process.env.JM_BROWSER_EXECUTABLE;
 browser=await chromium.launch(launch);
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
 await check('Authentic JM Game-CODING and JM GameCore are imported into actual R1 browser',async()=>{
  await page.waitForFunction(()=>!!window.JMFTRNative,{timeout:10000});
  const result=await page.evaluate(()=>({schema:window.JMFTRNative.schema,bodies:window.JMFTRNative.bodies,
    gardles:window.JMFTRNative.nativeGardles}));
  assert.equal(result.schema,'jm.ftr.native-live/0.1');
  for(const body of ['GameCoding','GameCodingRuntime','JMGameCore','JMGameCoreRuntime','JMVisualGraft','JMVisualRuntime'])assert(result.bodies.includes(body));
  assert.equal(result.gardles,'HOLD_EXACT_SOURCE_NOT_MOUNTED');
 });
 await check('Native Game-CODING denies unearned combo without mutating original game',async()=>{
  const result=await page.evaluate(()=>{
   const before=window.FTR.state(),decision=window.JMFTRNative.corePulse(),after=window.FTR.state();
   return {decision,before,after};
  });
  assert.equal(result.decision.status,'DENIED');
  assert.equal(result.decision.reason,'TRACE_CORE_REQUIRED');
  assert.equal(result.decision.nativeGate.applied,false);
  assert.equal(result.after.run.shots,result.before.run.shots);
  assert.equal(result.after.run.scans,result.before.run.scans);
 });
 await check('Native GameCore gates and performs earned dual action in real FTR game',async()=>{
  await page.evaluate(()=>{window.FTR.command('START');window.FTR.test.freezeEnemies();window.FTR.test.activateCore(0);});
  const before=await page.evaluate(()=>window.FTR.state());
  await page.locator('#jmNativePulse').tap();
  const result=await page.evaluate(()=>({receipt:window.JMFTRNative.last(),after:window.FTR.state(),
   feedback:document.getElementById('jmNativeFeedback').textContent}));
  result.before=before;
  assert.equal(result.before.player.cores,1);
  assert.equal(result.receipt.status,'APPLIED');
  assert.equal(result.receipt.nativeIdentity,'JM.FTR.NativeCorePulse');
  assert.equal(result.after.run.scans,result.before.run.scans+1);
  assert.equal(result.after.run.shots,result.before.run.shots+1);
  assert.equal(result.after.player.ammo,result.before.player.ammo-1);
  assert(result.receipt.nativeReceipt.traceDigest.length>0);
  assert.equal(result.receipt.visual.consequenceReadable,true);
  assert.equal(result.feedback,result.receipt.visual.expression);
  assert.equal(result.receipt.visual.input,'touch');
 });
 await check('Original JM VisualGraft and Visual Runtime render native result visibly in FTR HUD',async()=>{
  const rendered=await page.evaluate(()=>({
   text:document.getElementById('jmNativeFeedback').textContent,
   status:document.getElementById('jmNativeFeedback').dataset.nativeStatus,
   receipt:window.JMFTRNative.last()
  }));
  assert.equal(rendered.status,'APPLIED');
  assert.equal(rendered.text,'JM NATIVE CONTACT: APPLIED');
  assert.equal(rendered.receipt.visual.graft,'FTRNativeFeedback');
  assert(rendered.receipt.visual.graftTrace);
  assert(rendered.receipt.visual.contactTrace);
 });
 await check('Native cooldown guard prevents duplicate ammunition and scan costs',async()=>{
  const result=await page.evaluate(()=>{
   const before=window.FTR.state(),receipt=window.JMFTRNative.corePulse(),after=window.FTR.state();
   return {before,receipt,after};
  });
  assert.equal(result.receipt.status,'DENIED');
  assert(['SCAN_COOLDOWN','FIRE_COOLDOWN'].includes(result.receipt.reason));
  assert.equal(result.after.run.scans,result.before.run.scans);
  assert.equal(result.after.run.shots,result.before.run.shots);
 });
 await check('Real JM KicPlay source contact drives original PHASE game behaviour',async()=>{
  const result=await page.evaluate(()=>{
   window.FTR.command('START');
   const before=window.FTR.state(),receipt=window.JMFTRNative.kicPlay({source:'GripRoute',gesture:'flick',sequence:9}),after=window.FTR.state();
   return {before,receipt,after};
  });
  assert.equal(result.receipt.status,'DELIVERED');
  assert.equal(result.receipt.source,'GripRoute');
  assert.equal(result.receipt.route,'Kic');
  assert.equal(result.after.run.phases,result.before.run.phases+1);
 });
 await check('KicPlay Create refuses unsupported mapping without gameplay fabrication',async()=>{
  const result=await page.evaluate(()=>window.JMFTRNative.kicPlay({source:'Ama-Pro',gesture:'draw',sequence:10}));
  assert.equal(result.status,'HOLD_UNSUPPORTED_RECIPIENT_MECHANIC');
  assert.equal(result.delivered,false);
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
   await page.waitForFunction(()=>!!window.JMFTRNative);
   await page.locator('#startBtn').tap();
   await page.evaluate(()=>window.FTR.test.activateCore(0));
   const nativeOffline=await page.evaluate(()=>window.JMFTRNative.corePulse());
   assert.equal(nativeOffline.status,'APPLIED');
   assert.equal(nativeOffline.nativeIdentity,'JM.FTR.NativeCorePulse');
   assert.equal(nativeOffline.visual.consequenceReadable,true);
   assert.equal(await page.locator('#jmNativeFeedback').textContent(),'JM NATIVE CONTACT: APPLIED');
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
   onlineDeployment:'NOT_CLAIMED',ownerPhysicalPhone:'NOT_TESTED',
   ownerLaptopBrowser:process.env.JM_OWNER_LAPTOP_CONTACT==='1'?'HEADLESS_OWNER_LAPTOP_CONTACT':'NOT_TESTED',
   browserVersion:browser.version()}));
}finally{if(context)await context.close();if(browser)await browser.close();await new Promise(ok=>http.close(ok));}
