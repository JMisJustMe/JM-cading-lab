/**
 * CP17: naturally earn original JM Quiet Trace in a live FTR encounter.
 * Original seven live enemy actors and source-owned original game map.
 * Only original MOVE, INTERACT, PHASE, and player-visible CAST ECHO are used.
 * No FTR.test, enemy freeze/reposition, teleport, fake core or score edits.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const game='estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
  if(!path.startsWith(root+sep))throw Error('OUTSIDE_ORIGINAL');
  const bytes=await readFile(path);
  res.writeHead(200,{'content-type':mime[extname(path)]??'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser,context;
const attempts=[],errors=[];
try{
 const cfg={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
 if(process.env.JM_BROWSER_EXECUTABLE)cfg.executablePath=process.env.JM_BROWSER_EXECUTABLE;
 browser=await chromium.launch(cfg);
 context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'allow'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/'+game,{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.FTR&&!!window.JMFTREcho&&!!window.JMFTRQuietTrace);
 const playerInputMove=async(target,maxMs=9500)=>{
  let reached=false;
  const end=Date.now()+maxMs;
  while(Date.now()<end){
   const s=await page.evaluate(([tx,ty])=>{
    const state=window.FTR.state(),p=state.player,dx=tx-p.x,dy=ty-p.y;
    const d=Math.hypot(dx,dy);
    if(d>.23&&state.running){
     const f=(dx*Math.cos(p.a)+dy*Math.sin(p.a))/d;
     const x=(dx*Math.cos(p.a+Math.PI/2)+dy*Math.sin(p.a+Math.PI/2))/d;
     window.FTR.command('MOVE',{x,y:f});
    }else window.FTR.command('MOVE',{x:0,y:0});
    return {d,running:state.running,health:p.hp};
   },target);
   if(s.d<.23){reached=true;break;}
   if(!s.running)break;
   await page.waitForTimeout(55);
  }
  await page.evaluate(()=>window.FTR.command('MOVE',{x:0,y:0}));
  return reached;
 };
 // Each attempt is an authentic new source game run, not an enemy fixture.
 // Retry permits natural spawn/random-timing variance between CI/browser hosts.
 let earned=false;
 for(let attempt=1;attempt<=4&&!earned;attempt++){
  await page.locator(attempt===1?'#startBtn':'#restartBtn').click().catch(async()=>{
    // Original public command is an ordinary game START, not a test mutation.
    await page.evaluate(()=>window.FTR.command('START'));
  });
  let route=true;
  for(const target of [[12.4,17.2],[12.4,15.4],[14.4,15.4]]){
   if(!await playerInputMove(target)){route=false;break;}
  }
  if(!route){attempts.push({attempt,status:'SOURCE_ROUTE_NOT_REACHED'});continue;}
  // Earn ordinary original terminal progress first, still with full enemy AI.
  await page.evaluate(()=>window.FTR.command('INTERACT',{down:true}));
  let pre=0;
  try{
   await page.waitForFunction(()=>window.FTR.state().cores[0].progress>=.43,
    undefined,{timeout:1300});
   pre=await page.evaluate(()=>window.FTR.state().cores[0].progress);
  }finally{await page.evaluate(()=>window.FTR.command('INTERACT',{down:false}));}
  if(pre>=.84){attempts.push({attempt,status:'NORMAL_TRACE_ALREADY_TOO_HIGH',pre});continue;}
  // The action is actually taken by the original player, not direct memory APIs.
  await page.evaluate(()=>window.FTR.command('PHASE'));
  await page.locator('#jmEchoLaunch').click();
  const gate=await page.evaluate(()=>({
   echo:window.JMFTREcho.state(),
   quiet:window.JMFTRQuietTrace.eligibility(),
   original:window.FTR.state(),
   memory:enemies.map((_,i)=>window.JMFTRMemory.inspectEnemy(i))
  }));
  if(gate.echo.active?.heard===0||!gate.quiet.eligible){
   attempts.push({attempt,status:'ORIGINAL_LURE_NOT_EARNED',pre,
    heard:gate.echo.active?.heard,reason:gate.quiet.reason,
    phase:gate.original.player.phase});
   continue;
  }
  await page.evaluate(()=>window.FTR.command('INTERACT',{down:true}));
  let mounted=false;
  try{
   await page.waitForFunction(()=>window.FTR.state().cores[0].active,
    undefined,{timeout:1250});
   mounted=true;
  }catch{}
  finally{await page.evaluate(()=>window.FTR.command('INTERACT',{down:false}));}
  const final=await page.evaluate(()=>({
   game:window.FTR.state(),quiet:window.JMFTRQuietTrace.state(),
   echo:window.JMFTREcho.state(),
   native:window.JMFTRQuietTrace.nativeBodies
  }));
  const quietReceipt=final.game.run.events.filter(e=>e.event==='JM_QUIET_CORE_MOUNT'&&e.id==='A');
  const originalReceipt=final.game.run.events.filter(e=>e.event==='CORE_MOUNT'&&e.id==='A');
  const progressEvent=final.game.run.events.find(e=>e.event==='JM_QUIET_TRACE_CONTACT'&&e.id==='A');
  earned=mounted&&quietReceipt.length===1&&originalReceipt.length===1&&
    final.quiet.completed===1&&final.game.player.score>=950&&
    final.quiet.boostedSeconds>=.25&&!!progressEvent?.traceDigest;
  attempts.push({attempt,status:earned?'ACTUAL_EARNED_QUIET_MOUNT':'MOUNT_NOT_EARNED',
   pre,heard:gate.echo.active.heard,phaseAtCast:gate.original.player.phase,
   originalActorMemories:gate.memory.filter(m=>m.last?.source==='echo').length,
   originalMount:originalReceipt.length,quietMount:quietReceipt.length,
   originalCore:final.game.player.cores,score:final.game.player.score,
   actualBoostedProgress:final.quiet.boostedSeconds,
   nativeIdentity:progressEvent?.nativeIdentity||null,
   nativeTrace:progressEvent?.traceDigest||null,
   hp:final.game.player.hp,gameClock:final.game.time});
 }
 assert.deepEqual(errors,[],'Authentic FTR browser exception');
 assert(earned,'No naturally earned Quiet Trace after real original movement / Phase / Echo / held TRACE: '+JSON.stringify(attempts));
 console.log('JM_CP17_REAL_EARNED_QUIET_TRACE',JSON.stringify({
  schema:'jm.ftr.natural-quiet/0.1',status:'ACTUAL_ORIGINAL_CORE_A_QUIET_MOUNT',
  sourceVersion:'0.5.1',attempts,usedFTRTestHooks:false,
  actorEdits:false,originalPlayerInputOnly:true,
  realGameCore:true,manualOwnerPlay:false,errors
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 await new Promise(ok=>server.close(ok));
}
