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
    mapping:window.FTRGamepad.mapping,buttons:window.FTRGamepad.buttons,
    status:window.FTRGamepad.status()}));
  assert.equal(input.schema,'jm.ftr.first-person.existing-gamepad-contact/0.2');
  assert.equal(input.mapping,'standard-only');
  assert.deepEqual([input.buttons.ECHO,input.buttons.COVER,input.buttons.MATERIAL,input.buttons.CORE_PULSE],
    [12,13,14,15],'CP22 must connect four real original JM tactical controls');
  assert.equal(input.status.gameplayAuthority,'original FTR + existing JM recipients');
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
 await check('CP10 recovered JM original raycaster carries a distinct spatial-world organ',async()=>{
   const r=await page.evaluate(()=>({schema:window.JMFTRSpatial?.schema,
     sources:window.JMFTRSpatial?.sources,metrics:window.JMFTRSpatial?.metrics()}));
   assert.equal(r.schema,'jm.ftr.spatial-source-contact/0.1');
   assert(r.sources.includes('FTR v0.5.1 raycast'));
   assert(r.metrics.visualFrameCount>0);
   assert(r.metrics.floorSamples>0);
 });
 await check('CP10 perspective-world geometry changes pixels with an actual toggle',async()=>{
   await page.evaluate(()=>{window.FTR.command('START');window.FTR.test.freezeEnemies();
      window.FTR.test.setPlayer(12.3,15.4,-Math.PI/2);window.JMFTRSpatial.toggle(true);});
   await page.waitForTimeout(180);
   const active=await page.evaluate(()=>window.JMFTRSpatial.metrics());
   await page.evaluate(()=>window.JMFTRSpatial.toggle(false));
   await page.waitForTimeout(140);
   const paused=await page.evaluate(()=>window.JMFTRSpatial.metrics());
   assert(active.floorSamples>0);
   assert.equal(await page.evaluate(()=>document.querySelector('#jmSpatialToggle').getAttribute('aria-pressed')),'false');
   await page.evaluate(()=>window.JMFTRSpatial.toggle(true));
   await page.waitForTimeout(150);
   const res=await page.evaluate(()=>window.JMFTRSpatial.metrics());
   assert(res.visualFrameCount>paused.visualFrameCount);
   assert.notEqual(res.floorDigest,0);
 });
 await check('CP10 spatial field preserves native FTR collision and state authority',async()=>{
   const result=await page.evaluate(()=>{
     const before=window.FTR.state(),s=window.JMFTRSpatial;
     s.toggle(false);s.toggle(true);
     const after=window.FTR.state();
     return {before,after,guardian:s.originalCollisionAuthority,gardles:s.gardles};
   });
   assert.equal(result.before.player.x,result.after.player.x);
   assert.equal(result.before.player.y,result.after.player.y);
   assert.equal(result.before.player.cores,result.after.player.cores);
   assert.equal(result.guardian,'FTR v0.5.1 unchanged');
   assert.equal(result.gardles,'HOLD_EXACT_SOURCE_NOT_MOUNTED');
 });
 await check('CP10 real scan reads unearned JM core bearing, range and original line-of-sight',async()=>{
   const reading=await page.evaluate(()=>{
     window.FTR.command('SCAN');return window.JMFTRSpatial.reading();
   });
   assert.equal(reading.schema,'jm.ftr.spatial-echo/0.1');
   assert.equal(reading.scanActive,true);
   assert.equal(reading.target.id,'A');
   assert(reading.target.range>0);
   assert(['CLEAR','OBSTRUCTED'].includes(reading.target.state));
   await page.waitForTimeout(175);
   const text=await page.locator('#jmSpatialEcho').textContent();
   assert(text.includes('CORE A'));
 });
 await check('CP10 earned original core changes target rather than merely recolouring',async()=>{
   await page.evaluate(()=>window.FTR.test.activateCore(0));
   await page.waitForTimeout(175);
   const target=await page.evaluate(()=>window.JMFTRSpatial.echo());
   assert.equal(target.id,'B');
   assert(target.range>0);
 });
 await check('CP10 real original-map route has contiguous traversable cells',async()=>{
   const r=await page.evaluate(()=>{
     window.FTR.command('START');
     window.FTR.test.freezeEnemies();
     window.FTR.test.setPlayer(12.3,15.4,0);
     return window.JMFTRSpatial.route();
   });
   assert.equal(r.status,'ROUTE_FOUND');
   assert.equal(r.target,'A');
   assert.equal(r.steps,r.path.length-1);
   assert(r.path.length>1);
   for(let i=1;i<r.path.length;i++)
      assert.equal(Math.abs(r.path[i].x-r.path[i-1].x)+Math.abs(r.path[i].y-r.path[i-1].y),1);
 });
 await check('CP10 route refuses original locked gate, then opens after genuine first-core consequence',async()=>{
   const before=await page.evaluate(()=>{
     window.FTR.test.activateCore(0);
     return window.JMFTRSpatial.route();
   });
   assert.equal(before.target,'B');
   assert.equal(before.status,'NO_TRAVERSABLE_ROUTE');
   await page.waitForTimeout(1200);
   const after=await page.evaluate(()=>window.JMFTRSpatial.route());
   assert.equal(after.status,'ROUTE_FOUND');
   assert.equal(after.target,'B');
   assert(after.steps>0);
 });
 await check('CP16 original two-core extraction goal inherits the real opening gate instead of inventing a destination',async()=>{
   const before=await page.evaluate(()=>{
     window.FTR.test.activateCore(1);
     return {route:window.JMFTRSpatial.route(),state:window.FTR.state()};
   });
   assert.equal(before.route.target,'EXTRACTION');
   assert.equal(before.route.status,'NO_TRAVERSABLE_ROUTE');
   assert.equal(before.state.player.cores,2);
   await page.waitForTimeout(1350);
   const after=await page.evaluate(()=>({route:window.JMFTRSpatial.route(),
     gate:window.FTR.state().doors[1]}));
   assert.equal(after.route.status,'ROUTE_FOUND');
   assert.equal(after.route.target,'EXTRACTION');
   assert(after.gate.open>.82);
   assert(after.route.steps>0);
   assert.deepEqual(after.route.path.at(-1),{x:17,y:4});
 });
 await check('CP11 actual original JM Cover Forge mounts without replacing FTR',async()=>{
   await page.waitForFunction(()=>!!window.JMFTRCover);
   const r=await page.evaluate(()=>({schema:window.JMFTRCover.schema,materials:window.JMFTRCover.materials,
      donor:window.JMFTRCover.donor,original:window.FTR.version}));
   assert.equal(r.schema,'jm.ftr.cover-forge/0.1');
   assert.deepEqual(r.materials,['Timber','Stone','Metal']);
   assert.equal(r.original,'0.5.1');
   assert(r.donor.endsWith('/WSDestructibleCover.cs'));
 });
 await check('CP11 native Game-CODING refuses cover before earning a real Trace Core',async()=>{
   const r=await page.evaluate(()=>{
     window.FTR.command('START');window.FTR.test.freezeEnemies();
     const before=window.FTR.state(),receipt=window.JMFTRCover.build(),after=window.FTR.state();
     return {before,receipt,after};
   });
   assert.equal(r.receipt.status,'DENIED');
   assert.equal(r.receipt.reason,'TRACE_CORE_REQUIRED');
   assert.equal(r.after.player.ammo,r.before.player.ammo);
   assert.equal(await page.evaluate(()=>window.JMFTRCover.state().active),null);
 });
 await check('CP11 earned original Trace Core creates collision-bearing defensive cover',async()=>{
   await page.evaluate(()=>{
     window.FTR.test.freezeEnemies();
     window.FTR.test.activateCore(0);
     window.FTR.test.setPlayer(12.3,15.4,0);
   });
   await page.waitForTimeout(1250);
   const before=await page.evaluate(()=>window.FTR.state());
   // CP19 exposes the *same* original cover action through an honest
   // phone-sized tactical drawer; open it using the actual visible control.
   if(!(await page.locator('#jmCoverBuild').isVisible()))
     await page.locator('#jmMobileTools').tap();
   await page.locator('#jmCoverBuild').tap();
   const r=await page.evaluate(()=>{
     const receipt=window.JMFTRCover.last(),after=window.FTR.state(),cover=window.JMFTRCover.state();
     return {receipt,after,cover,solid:cover.active?window.solid(cover.active.x,cover.active.y):false,
        route:window.JMFTRSpatial.route()};
   });
   r.before=before;
   console.log('JM_CP11_BUILD',JSON.stringify(r));
   assert.equal(r.receipt.status,'BUILT');
   assert.equal(r.receipt.nativeIdentity,'JM.FTR.CoverForge');
   assert.equal(r.after.player.ammo,r.before.player.ammo-3);
   assert.equal(r.solid,true);
   assert.equal(r.cover.active.kind,'Timber');
   assert.equal(r.route.status,'ROUTE_FOUND');
   assert(r.after.run.events.some(e=>e.event==='JM_COVER_BUILT'));
 });
 await check('CP11 cover blocks authentic original line of sight, not just a painted square',async()=>{
   const r=await page.evaluate(()=>{
     const p=window.JMFTRCover.state().active;
     return {blocked:window.FTR.test.los(p.x-1,p.y,p.x+1,p.y),
       bypass:window.FTR.test.los(p.x-1,p.y-1.5,p.x+1,p.y-1.5),
       collision:window.solid(p.x,p.y)};
   });
   assert.equal(r.blocked,false);
   assert.equal(r.collision,true);
 });
 await check('CP11 original enemy projectile hits authentic barrier and reduces material health',async()=>{
   const r=await page.evaluate(()=>{
     const cover=window.JMFTRCover.state().active;
     projectiles.push({x:cover.x-.53,y:cover.y,z:.5,vx:3.4,vy:0,life:3,owner:null});
     return {before:cover.hp};
   });
   await page.waitForTimeout(160);
   const after=await page.evaluate(()=>({state:window.JMFTRCover.state(),
     events:window.FTR.state().run.events.filter(e=>e.event==='JM_COVER_HIT')}));
   assert(after.state.active.hp<r.before);
   assert(after.state.hits>0);
   assert(after.events.length>0);
 });
 await check('CP11 refuses duplicate cover with no extra ammo expense',async()=>{
   const r=await page.evaluate(()=>{
     const before=window.FTR.state().player.ammo;
     const result=window.JMFTRCover.build();
     return {result,before,after:window.FTR.state().player.ammo};
   });
   assert.equal(r.result.reason,'COVER_ALREADY_ACTIVE');
   assert.equal(r.after,r.before);
 });
 await check('CP11 material change alters real health/cost and destroyed cover stops blocking',async()=>{
   const r=await page.evaluate(()=>{
     const old=window.JMFTRCover.state().active;
     window.JMFTRCover.hit(100);
     const retired=!window.solid(old.x,old.y);
     window.JMFTRCover.select('Stone');
     const result=window.JMFTRCover.build();
     return {retired,result,current:window.JMFTRCover.state()};
   });
   assert.equal(r.retired,true);
   assert.equal(r.result.status,'BUILT');
   assert.equal(r.current.active.kind,'Stone');
   assert.equal(r.current.active.maxHp,54);
   assert.equal(r.current.breaks,1);
 });
 await check('CP11 cover preserves original game state across source-owned reset',async()=>{
   const r=await page.evaluate(()=>{
     window.FTR.command('START');
     const s=window.JMFTRCover.state();
     const before=window.FTR.state();
     return {s,before,solidBefore:window.solid(13.5,15.5)};
   });
   await page.waitForTimeout(90);
   const current=await page.evaluate(()=>window.JMFTRCover.state());
   assert.equal(current.active,null);
   assert.equal(r.before.player.cores,0);
   assert.equal(current.builds,0);
 });
 await check('CP12 original JM tactical enemy-contact body mounts inside real R1 game',async()=>{
  await page.waitForFunction(()=>!!window.JMFTRTactics);
  const r=await page.evaluate(()=>({
    schema:window.JMFTRTactics.schema,
    source:window.JMFTRTactics.originalEnemySystem,
    projectile:window.JMFTRTactics.originalProjectile,
    nativeBodies:window.JMFTRTactics.nativeBodies
  }));
  assert.equal(r.schema,'jm.ftr.tactical-world-contact/0.1');
  assert(r.source.endsWith('/ftr-world.js'));
  assert(r.projectile.includes('enemyShoot'));
  assert(r.nativeBodies.includes('JMGameCoreRuntime'));
 });
 await check('CP12 does not invent enemy pressure without original constructed cover',async()=>{
  await page.evaluate(()=>{window.FTR.command('START');window.FTR.test.freezeEnemies(true);
    window.JMFTRTactics.toggle(true);});
  await page.waitForTimeout(110);
  const r=await page.evaluate(()=>window.JMFTRTactics.state());
  assert.equal(r.shots,0);
  assert.equal(r.cover,false);
 });
 await check('CP12 original sentry actively attacks actual JM-created cover through native GameCore',async()=>{
  await page.evaluate(()=>{
    window.FTR.test.freezeEnemies(true);window.FTR.test.activateCore(0);
    window.FTR.test.setPlayer(12.3,15.4,0);
  });
  await page.waitForTimeout(1250);
  const setup=await page.evaluate(()=>{
    const built=window.JMFTRCover.build();
    window.FTR.test.setEnemy(0,14.8,15.5,34);
    enemies.forEach((enemy,i)=>{enemy.stun=i===0?0:100;enemy.cool=i===0?0:100;});
    enemies[0].type='sentry';enemies[0].state='seek';
    return {built,lane:window.JMFTRTactics.inspectLane(0),
      before:window.JMFTRCover.state().active?.hp,
      mapTile:tileAt(14.8,15.5)};
  });
  console.log('JM_CP12_SETUP',JSON.stringify(setup));
  assert.equal(setup.built.status,'BUILT');
  assert.equal(setup.lane,true);
  await page.evaluate(()=>window.FTR.test.freezeEnemies(false));
  await page.waitForTimeout(1400);
  const r=await page.evaluate(()=>({
    tactic:window.JMFTRTactics.state(),cover:window.JMFTRCover.state(),
    events:window.FTR.state().run.events,
    state:window.FTR.state()
  }));
  console.log('JM_CP12_PRESSURE',JSON.stringify({tactic:r.tactic,cover:r.cover,events:r.events.slice(-9)}));
  assert(r.tactic.shots>0);
  assert.equal(r.tactic.latest.nativeIdentity,'JM.FTR.TacticalPressure');
  assert(r.tactic.latest.traceDigest);
  assert(r.events.some(e=>e.event==='JM_AI_COVER_PRESSURE'));
  assert(r.events.some(e=>e.event==='INCOMING'));
  assert(r.cover.hits>0);
  assert(r.cover.active===null || r.cover.active.hp<setup.before);
 });
 await check('CP12 tactical pressure toggle stops new original sentry attacks when cover obstructs',async()=>{
  const r=await page.evaluate(()=>{
    window.JMFTRTactics.toggle(false);
    enemies[0].cool=0;
    return {before:window.JMFTRTactics.state().shots};
  });
  await page.waitForTimeout(260);
  const after=await page.evaluate(()=>window.JMFTRTactics.state());
  assert.equal(after.shots,r.before);
  assert.equal(await page.evaluate(()=>window.JMFTRTactics.enabled()),false);
  await page.evaluate(()=>window.JMFTRTactics.toggle(true));
 });
 await check('CP12 genuine FTR flanker moves laterally around original cover obstruction',async()=>{
  await page.evaluate(()=>{
   window.FTR.test.freezeEnemies(true);window.FTR.command('START');
   window.FTR.test.activateCore(0);window.FTR.test.setPlayer(12.3,15.4,0);
   window.JMFTRTactics.toggle(true);
  });
  await page.waitForTimeout(1250);
  const setup=await page.evaluate(()=>{
   const built=window.JMFTRCover.build();
   window.FTR.test.setEnemy(1,14.8,15.5,26);
   enemies.forEach((enemy,i)=>{enemy.stun=i===1?0:100;enemy.cool=100;});
   enemies[1].type='flanker';enemies[1].state='seek';enemies[1].strafe=1;
   return {built,lane:window.JMFTRTactics.inspectLane(1),
     before:{x:enemies[1].x,y:enemies[1].y}};
  });
  assert.equal(setup.built.status,'BUILT');
  assert.equal(setup.lane,true);
  await page.evaluate(()=>window.FTR.test.freezeEnemies(false));
  await page.waitForTimeout(370);
  const after=await page.evaluate(()=>({
    flanks:window.JMFTRTactics.state().flanks,
    enemy:{x:enemies[1].x,y:enemies[1].y},
    collision:circleFree(enemies[1].x,enemies[1].y,.2)
  }));
  assert(after.flanks>0);
  assert(Math.hypot(after.enemy.x-setup.before.x,after.enemy.y-setup.before.y)>.08);
  assert.equal(after.collision,true);
 });
 await check('CP12 native tactical receipts and cover retire on original restart',async()=>{
  await page.evaluate(()=>{window.FTR.command('START');window.FTR.test.freezeEnemies(true)});
  await page.waitForTimeout(130);
  const r=await page.evaluate(()=>({
   tactics:window.JMFTRTactics.state(),cover:window.JMFTRCover.state(),
   cores:window.FTR.state().player.cores
  }));
  assert.equal(r.tactics.shots,0);
  assert.equal(r.tactics.flanks,0);
  assert.equal(r.cover.active,null);
  assert.equal(r.cores,0);
 });
 await check('CP13 authentic JM GameCore sight-memory mounts in original FTR browser',async()=>{
  await page.waitForFunction(()=>!!window.JMFTRMemory);
  const r=await page.evaluate(()=>({schema:window.JMFTRMemory.schema,
   native:window.JMFTRMemory.nativeBodies,source:window.JMFTRMemory.source}));
  assert.equal(r.schema,'jm.ftr.original-threat-memory/0.1');
  assert(r.source.endsWith('ftr-world.js'));
  assert(r.native.includes('JMGameCoreRuntime'));
 });
 await check('CP13 genuine original unobstructed sighting earns native sight decision',async()=>{
  const r=await page.evaluate(()=>{
    window.FTR.command('START');
    window.FTR.test.freezeEnemies(false);
    window.FTR.test.setPlayer(12.3,15.4,0);
    enemies.forEach((e,i)=>{e.x=17.5;e.y=17.5;e.stun=100;e.cool=100;});
    enemies[0].x=11.5;enemies[0].y=15.5;enemies[0].stun=0;enemies[0].cool=100;
    enemies[0].type='sentry';
    return {lineOfSight:los(enemies[0].x,enemies[0].y,player.x,player.y)};
  });
  assert.equal(r.lineOfSight,true);
  await page.waitForTimeout(190);
  const seen=await page.evaluate(()=>({
    memory:window.JMFTRMemory.status(),enemy:window.JMFTRMemory.inspectEnemy(0),
    events:window.FTR.state().run.events
  }));
  assert(seen.memory.sighted>0);
  assert.equal(seen.enemy.sighted,true);
  assert.equal(seen.memory.latest.nativeIdentity,'JM.FTR.SightMemory');
  assert(seen.memory.latest.traceDigest);
  assert(seen.events.some(e=>e.event==='JM_AI_SIGHTED'));
 });
 await check('CP13 original player Phase genuinely breaks sight and interrupts original attacks',async()=>{
  const before=await page.evaluate(()=>{
    enemies[0].cool=0;
    const shots=window.FTR.state().run.events.filter(e=>e.event==='INCOMING').length;
    window.FTR.command('PHASE');
    return {shots,phase:window.FTR.state().player.phase};
  });
  assert(before.phase>0);
  await page.waitForTimeout(160);
  const after=await page.evaluate(()=>({
    status:window.JMFTRMemory.status(),enemy:window.JMFTRMemory.inspectEnemy(0),
    incoming:window.FTR.state().run.events.filter(e=>e.event==='INCOMING').length,
    phases:window.FTR.state().run.events.filter(e=>e.event==='JM_AI_PHASE_BREAK').length
  }));
  assert(after.status.phaseBreaks>0);
  assert.equal(after.enemy.sighted,false);
  assert.equal(after.incoming,before.shots);
  assert(after.phases>0);
 });
 await check('CP13 real Scan exposes existing enemy pressure state to original HUD',async()=>{
  await page.evaluate(()=>window.FTR.command('SCAN'));
  await page.waitForFunction(()=>document.getElementById('jmAwarenessStatus').textContent.startsWith('SCAN'),undefined,{timeout:2500});
  const r=await page.evaluate(()=>({
    hud:document.getElementById('jmAwarenessStatus').textContent,
    events:window.FTR.state().run.events,
    player:window.FTR.state().player,
    running:window.FTR.state().running,
    native:window.JMFTRMemory.status()
  }));
  console.log('JM_CP13_SCAN_DIAGNOSTIC',JSON.stringify(r));
  assert(r.hud.startsWith('SCAN'),JSON.stringify({hud:r.hud,scan:r.player.scan,scanCd:r.player.scanCd,running:r.running,native:r.native}));
  assert(r.events.some(e=>e.event==='JM_PLAYER_SCAN_INTELLIGENCE'));
 });
 await check('CP13 ally receives bounded original-LOS shared last-known player contact',async()=>{
  await page.evaluate(()=>{
    window.FTR.command('START');
    window.FTR.test.freezeEnemies(false);
    window.FTR.test.setPlayer(1.5,11.5,0);
    enemies.forEach((e,i)=>{e.x=17.5;e.y=17.5;e.stun=100;e.cool=100;});
    enemies[0].x=2.5;enemies[0].y=13.5;enemies[0].stun=100;enemies[0].cool=100;enemies[0].type='sentry';
    enemies[1].x=5.5;enemies[1].y=16.5;enemies[1].stun=100;enemies[1].cool=100;enemies[1].type='hunter';
  });
  await page.waitForTimeout(145);
  const r=await page.evaluate(()=>({
    direct:los(enemies[0].x,enemies[0].y,player.x,player.y),
    allySees:los(enemies[1].x,enemies[1].y,player.x,player.y),
    contact:window.JMFTRMemory.inspectEnemy(1),metrics:window.JMFTRMemory.status(),
    route:window.JMFTRMemory.routeFor(1,{x:1.5,y:11.5}),
    events:window.FTR.state().run.events
  }));
  assert.equal(r.direct,true);
  assert.equal(r.allySees,false);
  assert.equal(r.contact.last?.source,'shared');
  assert(r.metrics.shared>0);
  assert(r.events.some(e=>e.event==='JM_AI_SHARED_CONTACT'));
  assert(r.route.length>2);
  for(let i=1;i<r.route.length;i++){
    assert(Math.hypot(r.route[i].x-r.route[i-1].x,r.route[i].y-r.route[i-1].y)<=1.01);
  }
 });
 await check('CP13 hunter travels toward actual remembered player position through original collision',async()=>{
  await page.evaluate(()=>{enemies[1].stun=0;});
  const start=await page.evaluate(()=>window.JMFTRMemory.inspectEnemy(1));
  await page.waitForTimeout(480);
  const end=await page.evaluate(()=>({
    memory:window.JMFTRMemory.inspectEnemy(1),
    status:window.JMFTRMemory.status(),
    collision:circleFree(enemies[1].x,enemies[1].y,.2)
  }));
  assert(end.status.searchMoves>0);
  assert(end.status.routeReplans>0);
  assert(Math.hypot(end.memory.position.x-start.position.x,end.memory.position.y-start.position.y)>.06);
  assert.equal(end.collision,true);
 });
 await check('CP13 remembered contact expires instead of permanent omniscient enemy tracking',async()=>{
  const r=await page.evaluate(()=>{
    window.FTR.test.freezeEnemies(true);
    time+=3.6;
    window.FTR.test.setPlayer(18.5,18.5,0);
    window.FTR.test.freezeEnemies(false);
    return true;
  });
  await page.waitForTimeout(100);
  const end=await page.evaluate(()=>({status:window.JMFTRMemory.status(),
    enemy:window.JMFTRMemory.inspectEnemy(1),events:window.FTR.state().run.events}));
  assert(end.status.forgetCount>0);
  assert.equal(end.enemy.last,null);
  assert(end.events.some(e=>e.event==='JM_AI_FORGOT'));
 });
 await check('CP13 memory toggle returns responsibility to inherited original FTR AI',async()=>{
  if(!(await page.locator('#jmAwarenessToggle').isVisible()))
   await page.locator('#jmMobileTools').tap();
  await page.locator('#jmAwarenessToggle').tap();
  const a=await page.evaluate(()=>({
    enabled:window.JMFTRMemory.enabled(),
    hud:document.getElementById('jmAwarenessStatus').textContent,
    current:window.FTR.state()
  }));
  assert.equal(a.enabled,false);
  assert(a.hud.includes('ORIGINAL AI'));
  assert.equal(a.current.running,true);
  await page.locator('#jmAwarenessToggle').tap();
  assert.equal(await page.evaluate(()=>window.JMFTRMemory.enabled()),true);
 });
 await check('CP13 source session restart retires only ephemeral sight, alerts and routes',async()=>{
  await page.evaluate(()=>window.FTR.command('START'));
  await page.waitForTimeout(80);
  const r=await page.evaluate(()=>({
    state:window.JMFTRMemory.status(),
    original:window.FTR.state(),
    sourceVersion:window.FTR.version
  }));
  assert.equal(r.sourceVersion,'0.5.1');
  console.log('JM_CP13_RESET_DIAGNOSTIC',JSON.stringify(r));
  assert.equal(r.state.shared,0);
  assert.equal(r.state.phaseBreaks,0,JSON.stringify(r));
  assert.equal(r.state.forgetCount,0);
  assert.equal(r.original.player.cores,0);
 });
 await check('CP14 original JM World Echo organ loads real GameCoding and GameCore',async()=>{
   await page.waitForFunction(()=>!!window.JMFTREcho);
   const a=await page.evaluate(()=>({
    schema:window.JMFTREcho.schema,
    bodies:window.JMFTREcho.nativeBodies,
    recipient:window.JMFTREcho.originalRecipient,
    sourceVersion:window.FTR.version
   }));
   assert.equal(a.schema,'jm.ftr.sovereign-world-echo/0.1');
   assert(a.bodies.includes('JMGameCoreRuntime'));
   assert(a.recipient.includes('CP13 threat memory'));
   assert.equal(a.sourceVersion,'0.5.1');
 });
 await check('CP14 new original-FTR run starts with no unearned world Echo or ammo cost',async()=>{
   await page.evaluate(()=>window.FTR.command('START'));
   // The original source is now running. Retest after explicit non-game
   // state with a separate START gate below rather than fake injected state.
   const a=await page.evaluate(()=>{
     window.FTR.test.freezeEnemies(true);
     const first=window.JMFTREcho.state();
     return {first,ammo:window.FTR.state().player.ammo};
   });
   assert.equal(a.first.used,0);
   assert.equal(a.first.active,null);
   assert.equal(a.ammo,20);
 });
 await check('CP14 real touchscreen Echo casts into ORIGINAL world with native cost and world marker',async()=>{
   const r=await page.evaluate(()=>{
     window.FTR.test.freezeEnemies(false);
     window.FTR.test.setPlayer(1.5,11.5,0);
     enemies.forEach((e,i)=>{e.x=17.5;e.y=17.5;e.cool=100;e.stun=100;});
     enemies[1].x=5.5;enemies[1].y=16.5;enemies[1].stun=100;enemies[1].cool=100;
     enemies[1].type='hunter';enemies[1].state='patrol';
     return {placement:window.JMFTREcho.placement(),
      sight:los(enemies[1].x,enemies[1].y,player.x,player.y),
      before:window.FTR.state().player.ammo};
   });
   assert(r.placement);
   assert.equal(r.sight,false);
   await page.locator('#jmEchoLaunch').tap();
   const a=await page.evaluate(()=>({
     receipt:window.JMFTREcho.last(),state:window.JMFTREcho.state(),
     enemy:window.JMFTRMemory.inspectEnemy(1),
     ammo:window.FTR.state().player.ammo,
     collision:circleFree(window.JMFTREcho.state().active.x,window.JMFTREcho.state().active.y,.22),
     events:window.FTR.state().run.events
   }));
   console.log('JM_CP14_WORLD_ECHO',JSON.stringify(a));
   assert.equal(a.receipt.status,'LAUNCHED');
   assert.equal(a.receipt.nativeIdentity,'JM.FTR.WorldEcho');
   assert(a.receipt.traceDigest);
   assert.equal(a.ammo,r.before-2);
   assert(a.collision);
   assert.equal(a.state.used,1);
   assert(a.state.active);
   assert(a.events.some(e=>e.event==='JM_WORLD_ECHO_LAUNCHED'));
 });
 await check('CP14 earned decoy sends real audible source contact into CP13 original actor memory',async()=>{
   const a=await page.evaluate(()=>({
     state:window.JMFTREcho.state(),
     ally:window.JMFTRMemory.inspectEnemy(1),
     events:window.FTR.state().run.events
   }));
   assert(a.state.heard>0);
   assert.equal(a.ally.last?.source,'echo');
   assert(a.events.some(e=>e.event==='JM_AI_HEARD_ECHO'));
   assert(Math.hypot(a.ally.last.x-a.state.active.x,a.ally.last.y-a.state.active.y)<.01);
 });
 await check('CP14 original hunter changes world coordinates while investigating the audible lure',async()=>{
   await page.evaluate(()=>{enemies[1].stun=0;});
   const before=await page.evaluate(()=>window.JMFTRMemory.inspectEnemy(1).position);
   await page.waitForTimeout(490);
   const a=await page.evaluate(()=>({
     after:window.JMFTRMemory.inspectEnemy(1).position,
     pursuit:window.JMFTRMemory.status().searchMoves,
     collision:circleFree(enemies[1].x,enemies[1].y,.2),
     original:window.FTR.state()
   }));
   assert(a.pursuit>0);
   assert(Math.hypot(before.x-a.after.x,before.y-a.after.y)>.06);
   assert.equal(a.collision,true);
   assert.equal(a.original.player.cores,0);
 });
 await check('CP14 repeated Echo request refuses duplicate with no additional player ammo consumption',async()=>{
   const r=await page.evaluate(()=>{
     const before=window.FTR.state().player.ammo,
       result=window.JMFTREcho.launch(),after=window.FTR.state().player.ammo;
     return {before,after,result};
   });
   assert.equal(r.result.status,'DENIED');
   assert.equal(r.result.reason,'WORLD_ECHO_ALREADY_ACTIVE');
   assert.equal(r.before,r.after);
 });
 await check('CP14 disabling CP13 memory disables the audible AI redirect without deleting the original game',async()=>{
   const r=await page.evaluate(()=>{
     window.JMFTRMemory.toggle(false);
     const before=window.FTR.state();
     const denied=window.JMFTRMemory.hearEcho(2.5,11.5);
     window.JMFTRMemory.toggle(true);
     const after=window.FTR.state();
     return {denied,before,after};
   });
   assert.equal(r.denied.heard,0);
   assert.equal(r.denied.reason,'NOT_ADMITTED');
   assert.equal(r.after.player.ammo,r.before.player.ammo);
   assert.equal(r.after.player.cores,r.before.player.cores);
 });
 await check('CP14 authentic original session reset retires Echo and all its build capacity',async()=>{
   await page.evaluate(()=>window.FTR.command('START'));
   await page.waitForTimeout(100);
   const a=await page.evaluate(()=>({echo:window.JMFTREcho.state(),
     memory:window.JMFTRMemory.status(),original:window.FTR.state()}));
   assert.equal(a.echo.used,0);
   assert.equal(a.echo.active,null);
   assert.equal(a.echo.heard,0);
   assert.equal(a.original.player.ammo,20);
   assert.equal(a.original.player.cores,0);
   assert.equal(a.original.run.events.some(e=>e.event==='JM_WORLD_ECHO_LAUNCHED'),false);
 });
 await check('CP15 source-owned original TRACE recipient loads actual JM GameCore',async()=>{
   await page.waitForFunction(()=>!!window.JMFTRQuietTrace);
   const r=await page.evaluate(()=>({schema:window.JMFTRQuietTrace.schema,
     source:window.JMFTRQuietTrace.source,bodies:window.JMFTRQuietTrace.nativeBodies,
     version:window.FTR.version}));
   assert.equal(r.schema,'jm.ftr.source-owned-earned-trace/0.1');
   assert(r.source.includes('original doInteract'));
   assert(r.bodies.includes('JMGameCoreRuntime'));
   assert.equal(r.version,'0.5.1');
 });
 await check('CP15 unearned original TRACE progress remains exactly normal without distraction',async()=>{
   await page.evaluate(()=>{
     window.FTR.command('START');
     window.FTR.test.freezeEnemies(true);
     window.FTR.test.setPlayer(14.4,15.4,0);
   });
   await page.waitForTimeout(110);
   const r=await page.evaluate(()=>{
     const permitted=window.JMFTRQuietTrace.eligibility();
     const before=terminals[0].progress;
     doInteract(.2);
     return {permitted,before,after:terminals[0].progress,
       original:window.FTR.state()};
   });
   assert.equal(r.permitted.eligible,false);
   assert.equal(r.permitted.reason,'EARNED_DISTRACTION_REQUIRED');
   assert(Math.abs(r.after-r.before-.2)<.0001);
   assert.equal(r.original.player.cores,0);
   assert.equal(r.original.player.score,0);
 });
 await check('CP15 real CP14 audio diversion earns original-world native trace eligibility',async()=>{
   await page.evaluate(()=>{
     window.FTR.command('START');window.FTR.test.freezeEnemies(false);
     window.FTR.test.setPlayer(1.5,11.5,0);
     enemies.forEach(e=>{e.x=17.5;e.y=2.5;e.stun=100;e.cool=100;});
     enemies[1].x=5.5;enemies[1].y=16.5;enemies[1].stun=100;
     enemies[1].type='hunter';
   });
   await page.waitForTimeout(90);
   await page.locator('#jmEchoLaunch').tap();
   const echo=await page.evaluate(()=>window.JMFTREcho.state());
   assert.equal(echo.heard,1);
   await page.evaluate(()=>window.FTR.test.setPlayer(14.4,15.4,0));
   await page.waitForTimeout(100);
   const r=await page.evaluate(()=>({
     originalCore:terminals[0].id,
     eligibility:window.JMFTRQuietTrace.eligibility(),
     actor:window.JMFTRMemory.inspectEnemy(1),
     originalPlayer:window.FTR.state().player
   }));
   console.log('JM_CP15_EARNED_GATE',JSON.stringify(r));
   assert.equal(r.eligibility.eligible,true);
   assert.equal(r.eligibility.target,'A');
   assert.equal(r.actor.last?.source,'echo');
   assert.equal(r.originalPlayer.cores,0);
 });
 await check('CP15 original enemy direct sight denies accelerated capture, preserving ordinary TRACE',async()=>{
   const r=await page.evaluate(()=>{
     enemies[0].x=14.5;enemies[0].y=14.5;
     const before=terminals[0].progress,eligibility=window.JMFTRQuietTrace.eligibility();
     doInteract(.12);
     return {eligibility,before,after:terminals[0].progress,
       state:window.JMFTRQuietTrace.state(),original:window.FTR.state()};
   });
   assert.equal(r.eligibility.eligible,false);
   assert.equal(r.eligibility.reason,'ORIGINAL_ENEMY_DIRECT_SIGHT');
   assert(Math.abs(r.after-r.before-.12)<.0001);
   assert.equal(r.state.completed,0);
   assert.equal(r.original.player.cores,0);
 });
 await check('CP15 JM native original E/TRACE advances REAL terminal progress by earned 1.7x',async()=>{
   const r=await page.evaluate(()=>{
     enemies[0].x=17.5;enemies[0].y=2.5;
     const gate=window.JMFTRQuietTrace.eligibility();
     const before=terminals[0].progress,score=player.score;
     doInteract(.25);
     return {gate,before,after:terminals[0].progress,scoreAfter:player.score,score,
       state:window.JMFTRQuietTrace.state(),
       events:window.FTR.state().run.events};
   });
   assert.equal(r.gate.eligible,true);
   assert(Math.abs(r.after-r.before-.425)<.0001);
   assert.equal(r.score,r.scoreAfter);
   assert(r.events.some(e=>e.event==='JM_QUIET_TRACE_CONTACT'));
   assert.equal(r.state.last.nativeIdentity,'JM.FTR.EarnedQuietTrace');
   assert(r.state.last.traceDigest);
 });
 await check('CP15 real original CORE_MOUNT and door unlock occur, with a single earned bonus',async()=>{
   const r=await page.evaluate(()=>{
     const before=player.score;
     doInteract(.36);
     const s=window.FTR.state(),stats=window.JMFTRQuietTrace.state();
     return {before,original:s,stats,terminal:terminals[0].active,
       events:s.run.events.filter(e=>['CORE_MOUNT','JM_QUIET_CORE_MOUNT'].includes(e.event))};
   });
   assert.equal(r.terminal,true);
   assert.equal(r.original.player.cores,1);
   assert.equal(r.original.doors[0].target,1);
   assert.equal(r.original.player.score-r.before,750+180);
   assert.equal(r.stats.completed,1);
   assert.equal(r.events.filter(e=>e.event==='CORE_MOUNT').length,1);
   assert.equal(r.events.filter(e=>e.event==='JM_QUIET_CORE_MOUNT').length,1);
 });
 await check('CP15 real keyboard TRACE uses inherited E control, not a fake second button',async()=>{
   await page.evaluate(()=>{
     window.FTR.command('START');
     window.FTR.test.freezeEnemies(true);
     window.FTR.test.setPlayer(14.4,15.4,0);
   });
   await page.waitForTimeout(80);
   await page.keyboard.down('e');
   await page.waitForTimeout(300);
   await page.keyboard.up('e');
   const r=await page.evaluate(()=>({
     original:window.FTR.state(),progress:terminals[0].progress,
     stats:window.JMFTRQuietTrace.state()}));
   assert(r.progress>.08);
   assert(r.progress<.9);
   assert.equal(r.stats.completed,0);
   assert.equal(r.original.player.cores,0);
 });
 await check('CP15 original restart discards quiet-trace reward and progress records',async()=>{
   await page.evaluate(()=>window.FTR.command('START'));
   await page.waitForTimeout(80);
   const r=await page.evaluate(()=>({native:window.JMFTRQuietTrace.state(),
     original:window.FTR.state()}));
   assert.equal(r.native.completed,0);
   assert.equal(r.native.eligibleContacts,0);
   assert.equal(r.original.player.cores,0);
   assert.equal(r.original.player.score,0);
   assert.equal(r.original.run.events.filter(e=>e.event==='JM_QUIET_CORE_MOUNT').length,0);
 });
 await check('CP10 real spatial floor retains bounded frame time on Chromium',async()=>{
   const m=await page.evaluate(()=>window.JMFTRSpatial.metrics());
   console.log('JM_CP10_RENDER_MEASUREMENT',JSON.stringify(m));
   assert(m.meanMs>0&&m.meanMs<60);
   assert(m.visualFrameCount>20);
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
   assert.equal(await page.evaluate(()=>window.JMFTRSpatial.schema),'jm.ftr.spatial-source-contact/0.1');
   await page.waitForFunction(()=>!!window.JMFTRTactics);
   await page.waitForFunction(()=>!!window.JMFTRMemory);
   assert.equal(await page.evaluate(()=>window.JMFTRMemory.schema),'jm.ftr.original-threat-memory/0.1');
   await page.waitForFunction(()=>!!window.JMFTREcho);
   assert.equal(await page.evaluate(()=>window.JMFTREcho.schema),'jm.ftr.sovereign-world-echo/0.1');
   await page.waitForFunction(()=>!!window.JMFTRQuietTrace);
   assert.equal(await page.evaluate(()=>window.JMFTRQuietTrace.schema),'jm.ftr.source-owned-earned-trace/0.1');
   assert.equal(await page.evaluate(()=>window.JMFTRTactics.schema),'jm.ftr.tactical-world-contact/0.1');
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
