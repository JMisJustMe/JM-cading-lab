/**
 * FTR CP18: ORIGINAL QUIET CORE A + COMPLETE GAME WIN IN ONE UNINTERRUPTED RUN.
 * Drives FTR.command MOVE/INTERACT/PHASE and player-facing CAST ECHO only.
 * Never calls FTR.test, edits source actors, freezes enemies, teleports,
 * unlocks cores, grants health or modifies the player/world programmatically.
 *
 * This is a bounded non-human autonomous input run, NOT owner manual play.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const dir='estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
  if(!file.startsWith(root+sep))throw Error('OUTSIDE_ORIGINAL_SOURCE');
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser,context;
const sourceUrl='http://127.0.0.1:'+server.address().port+'/'+dir;
const receipts=[],failures=[],started=Date.now();
try{
 const cfg={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
 if(process.env.JM_BROWSER_EXECUTABLE)cfg.executablePath=process.env.JM_BROWSER_EXECUTABLE;
 browser=await chromium.launch(cfg);
 context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'allow'});
 const page=await context.newPage();
 page.on('pageerror',e=>failures.push(e.message));
 await page.goto(sourceUrl,{waitUntil:'load'});
 await page.waitForFunction(()=>window.FTR?.version==='0.5.1'&&!!window.JMFTRSpatial);
 await page.locator('#startBtn').click();
 const read=()=>page.evaluate(()=>window.FTR.state());
 const move=async(point,maxMs=11000)=>{
  let reached=false,won=false,stop=Date.now()+maxMs,previous=null,stalled=0;
  while(Date.now()<stop){
   const a=await page.evaluate(([tx,ty])=>{
    const state=window.FTR.state(),p=state.player,
      dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
    // Emergency use of ORIGINAL Phase control is a *real player input*,
    // not shield/health injection. The source decides the legal effect.
    if(state.running&&p.hp<=60&&p.phase<=0)window.FTR.command('PHASE');
    if(d>.24&&state.running){
     const f=(dx*Math.cos(p.a)+dy*Math.sin(p.a))/d;
     const s=(dx*Math.cos(p.a+Math.PI/2)+dy*Math.sin(p.a+Math.PI/2))/d;
     window.FTR.command('MOVE',{x:s,y:f});
    }else window.FTR.command('MOVE',{x:0,y:0});
    return {d,x:p.x,y:p.y,hp:p.hp,cores:p.cores,score:p.score,
      running:state.running,won:state.run.events.some(e=>e.event==='RUN_END'&&e.win)};
   },point);
   if(a.won){won=true;reached=true;break;}
   if(a.d<.24){reached=true;break;}
   if(!a.running)break;
   if(previous&&Math.hypot(a.x-previous.x,a.y-previous.y)<.012)stalled++;
   else stalled=0;
   if(stalled>21)break;
   previous=a;await page.waitForTimeout(80);
  }
  await page.evaluate(()=>window.FTR.command('MOVE',{x:0,y:0}));
  const state=await read();
  receipts.push({action:'ORIGINAL_MOVE',waypoint:point,reached,won,
    player:{x:state.player.x,y:state.player.y,hp:state.player.hp,
      cores:state.player.cores},t:state.time});
  assert(reached,'Original player blocked at '+JSON.stringify(point)+' with '+JSON.stringify(state.player));
  assert(state.player.hp>0,'Original player died during real movement');
  return won;
 };
 const trace=async(id)=>{
  const before=await read();
  if(before.player.hp<=60)await page.evaluate(()=>window.FTR.command('PHASE'));
  await page.evaluate(()=>window.FTR.command('INTERACT',{down:true}));
  // Same actual held action the original touch/E control drives.
  await page.waitForTimeout(1380);
  await page.evaluate(()=>window.FTR.command('INTERACT',{down:false}));
  const after=await read();
  const mounting=after.run.events.filter(e=>e.event==='CORE_MOUNT'&&e.id===id);
  receipts.push({action:'ORIGINAL_HOLD_TRACE',id,before:before.player.cores,
    after:after.player.cores,score:after.player.score,realMounts:mounting.length,
    hp:after.player.hp,t:after.time});
  assert(after.cores.some(c=>c.id===id&&c.active),'Source core '+id+' was not mounted by original hold');
  assert.equal(mounting.length,1,'A unique original core event must be earned');
  assert(after.player.hp>0,'Player died during original trace');
 };
 for(const p of [[12.4,17.2],[12.4,15.4],[14.4,15.4]])await move(p);
 const quietCoreA=async()=>{
  // Earn ordinary source progress first through the existing player input,
  // then interrupt the real enemy's sight with real PHASE + in-world ECHO.
  await page.evaluate(()=>window.FTR.command('INTERACT',{down:true}));
  let pre=0;
  try{
   await page.waitForFunction(()=>window.FTR.state().cores[0].progress>=.43,
     undefined,{timeout:1600});
   pre=await page.evaluate(()=>window.FTR.state().cores[0].progress);
  }finally{await page.evaluate(()=>window.FTR.command('INTERACT',{down:false}));}
  assert(pre<.84,'Quiet action must precede original Core A mount');
  await page.evaluate(()=>window.FTR.command('PHASE'));
  await page.locator('#jmEchoLaunch').click();
  const heard=await page.evaluate(()=>({
   echo:window.JMFTREcho.state(),gate:window.JMFTRQuietTrace.eligibility(),
   ph:window.FTR.state().player.phase,
   memories:enemies.map((_,i)=>window.JMFTRMemory.inspectEnemy(i))
  }));
  receipts.push({action:'ORIGINAL_PHASE_ECHO',pre,
   heard:heard.echo.active?.heard??0,sourceGate:heard.gate,
   originalPhase:heard.ph,
   realEnemyMemories:heard.memories.filter(m=>m.last?.source==='echo').length});
  assert(heard.ph>0,'Original Phase must actually be running');
  assert(heard.echo.active?.heard>0,'An original actor must hear the real Echo');
  assert.equal(heard.gate.eligible,true,'Original sight+Echo memory must earn Quiet Trace');
  await page.evaluate(()=>window.FTR.command('INTERACT',{down:true}));
  try{
   await page.waitForFunction(()=>window.FTR.state().cores[0].active,
     undefined,{timeout:1600});
  }finally{await page.evaluate(()=>window.FTR.command('INTERACT',{down:false}));}
  const after=await read(),quiet=await page.evaluate(()=>window.JMFTRQuietTrace.state());
  const ordinary=after.run.events.filter(e=>e.event==='CORE_MOUNT'&&e.id==='A');
  const bonus=after.run.events.filter(e=>e.event==='JM_QUIET_CORE_MOUNT'&&e.id==='A');
  const native=after.run.events.find(e=>e.event==='JM_QUIET_TRACE_CONTACT'&&e.id==='A');
  assert.equal(ordinary.length,1,'Must mount original Core A exactly once');
  assert.equal(bonus.length,1,'Must earn exactly one Quiet Core A bonus');
  assert.equal(quiet.completed,1,'Original source-owned native Quiet completion required');
  assert(quiet.boostedSeconds>=.35,'Significant real accelerated progress required');
  assert.equal(native.nativeIdentity,'JM.FTR.EarnedQuietTrace');
  assert(native.traceDigest,'Original native GameCore trace required');
  assert(after.player.hp>0,'Player must survive original Core A contact');
  receipts.push({action:'ACTUAL_ORIGINAL_QUIET_CORE_A',sourceClock:after.time,
   sourceStart:after.run.started,score:after.player.score,health:after.player.hp,
   originalMount:ordinary.length,quietMount:bonus.length,
   bonus:bonus[0].bonus,nativeDigest:native.traceDigest,
   accelerated:quiet.boostedSeconds});
 };
 await quietCoreA();
 let current=await read();
 assert.equal(current.doors[0].target,1);
 assert.equal(current.player.cores,1);
 await page.waitForTimeout(1250);
 for(const p of [[10.5,15.4],[10.5,11.5],[10.5,9.5],[2.2,9.5],[2.2,2.2]])await move(p);
 await trace('B');
 current=await read();
 assert.equal(current.player.cores,2);
 assert.equal(current.doors[1].target,1);
 await page.waitForTimeout(1450);
 const exit=await page.evaluate(()=>window.JMFTRSpatial.route());
 assert.equal(exit.target,'EXTRACTION');
 assert.equal(exit.status,'ROUTE_FOUND','Original open gate must yield navigable extraction route');
 assert.deepEqual(exit.path.at(-1),{x:17,y:4});
 let won=false;
 for(const p of [[2.2,9.5],[10.5,9.5],[14.5,9.5],[14.5,4.5],[17.4,4.4]]){
  if(await move(p)){won=true;break;}
 }
 const final=await read();
 const sourceQuiet=await page.evaluate(()=>window.JMFTRQuietTrace.state());
 assert.equal(sourceQuiet.completed,1,'Earned Quiet Core A must survive to original final extraction');
 assert(sourceQuiet.earnedCredits.some(x=>x.id==='A'&&x.awarded),
   'Original Core A earned bonus custody must remain until RUN_END');
 assert.equal(final.run.started,receipts.find(x=>x.action==='ACTUAL_ORIGINAL_QUIET_CORE_A').sourceStart,
   'No original run restart between earned bonus and actual win');
 assert.equal(final.running,false,'Original game must have reached actual end');
 assert(final.run.events.some(e=>e.event==='RUN_END'&&e.win),'Original RUN_END win:true required');
 assert.equal(final.player.cores,2);
 assert(final.player.score>=2880,'Original two original mounts, real extraction and 180 earned bonus required');
 assert.deepEqual(failures,[]);
 console.log('JM_CP18_EARNED_QUIET_AND_FULL_WIN',JSON.stringify({
  schema:'jm.ftr.earned-quiet-full-win/0.1',
  status:'ACTUAL_ORIGINAL_WIN',
  elapsedRealMs:Date.now()-started,originalGameClock:final.time,
  coreCount:final.player.cores,score:final.player.score,
  integrity:final.player.hp,phaseInputs:final.run.phases,
  originalRunEndedWon:true,
  quietTraceEarned:sourceQuiet.completed,
  originalQuietBonus180:true,
  nativeSourceReceipt:receipts.find(x=>x.action==='ACTUAL_ORIGINAL_QUIET_CORE_A')?.nativeDigest,
  sameContinuousOriginalRun:true,
  input:'ONLY original MOVE / INTERACT / lawful PHASE and player-facing CAST ECHO',
  forbiddenTestHooks:'NONE',
  headlessAutomation:true,manualOwnerPlay:false,
  finalRoute:exit,waypointReceipts:receipts,jsErrors:failures
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 await new Promise(ok=>server.close(ok));
}
