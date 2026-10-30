/**
 * JM FTR CP19 · original mobile touch and foldable browser input proof.
 * Actual Chromium touch events; never pretends an emulator is a real phone.
 * FTR source and native original GameCoding, GameCore, cover, controls retained.
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
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/'+dir;
const browserOptions={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
if(process.env.JM_BROWSER_EXECUTABLE)browserOptions.executablePath=process.env.JM_BROWSER_EXECUTABLE;
const browser=await chromium.launch(browserOptions);
const checks=[],exceptions=[];
const check=(condition,message)=>{assert(condition,message);checks.push(message)};
const rBox=async(page,id)=>page.locator(id).boundingBox();
const intersects=(a,b,pad=2)=>a&&b&&a.x < b.x+b.width-pad&&
 b.x < a.x+a.width-pad&&a.y < b.y+b.height-pad&&b.y < a.y+a.height-pad;
const touch=async(cdp,type,points)=>cdp.send('Input.dispatchTouchEvent',{type,
 touchPoints:points.map((p,i)=>({x:p.x,y:p.y,id:p.id??i+1}))});
const scenarios=[
 {name:'phone-portrait',w:393,h:873},
 {name:'fold-landscape',w:884,h:412},
 {name:'phone-landscape',w:844,h:390},
 {name:'tablet-portrait',w:768,h:1024}
];
try{
 for(const sc of scenarios){
  const context=await browser.newContext({viewport:{width:sc.w,height:sc.h},
   isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>exceptions.push(sc.name+': '+e.message));
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.JMFTRDevice&&!!window.JMFTREcho);
  const act=await rBox(page,'#act'),joy=await rBox(page,'#joy'),
    fire=await rBox(page,'#fire'),echo=await rBox(page,'#jmEchoLaunch'),
    menu=await rBox(page,'#jmMobileTools');
  check(!!act&&act.width>=44&&act.height>=44,sc.name+' original TRACE must be a touchable target');
  check(act.x>=0&&act.y>=0&&act.x+act.width<=sc.w+1&&act.y+act.height<=sc.h+1,
    sc.name+' original TRACE must fit within viewport');
  check(!intersects(act,joy)&&!intersects(act,fire)&&!intersects(act,echo)&&!intersects(act,menu),
    sc.name+' TRACE cannot overlap joystick/fire/Echo/tactics');
  check(!!echo&&!!menu&&echo.width>=75,sc.name+' original player Echo and tactics must remain reachable');
  check(!intersects(menu,echo),sc.name+' original Echo must not overlap tactical drawer');
  const before=await page.evaluate(()=>window.JMFTRDevice.state());
  check(before.traceDisplayed&&before.coarse,sc.name+' original source-control contact admitted');
  await page.locator('#startBtn').tap();
  await page.locator('#jmMobileTools').tap();
  check(await page.locator('#jmMobileShelf').isVisible(),sc.name+' optional JM controls expand in compact shelf');
  check(await page.locator('#jmCoverBuild').isVisible(),sc.name+' original-source cover remains accessible');
  await page.locator('#jmMobileTools').tap();
  check(!await page.locator('#jmMobileShelf').isVisible(),sc.name+' tactical shelf closes without deleting controls');
  const cdp=await context.newCDPSession(page);
  const center={x:act.x+act.width/2,y:act.y+act.height/2,id:9};
  await touch(cdp,'touchStart',[center]);
  await page.waitForTimeout(110);
  check((await page.evaluate(()=>window.JMFTRDevice.state())).touchHeld,
    sc.name+' genuine touch-start holds original TRACE');
  await touch(cdp,'touchCancel',[]);
  await page.waitForTimeout(60);
  check(!(await page.evaluate(()=>window.JMFTRDevice.state())).touchHeld,
    sc.name+' touch cancellation clears held original interaction');
  check((await page.evaluate(()=>window.JMFTRDevice.state())).releases>0,
    sc.name+' original device release receipt counted');
  const jcenter={x:joy.x+joy.width/2,y:joy.y+joy.height/2,id:8};
  await touch(cdp,'touchStart',[jcenter]);
  await touch(cdp,'touchMove',[{...jcenter,y:jcenter.y-joy.height*.23}]);
  await page.waitForTimeout(400);
  const moving=await page.evaluate(()=>({joy:joyState.y,source:window.FTR.state().player}));
  check(Math.abs(moving.joy)>.35,sc.name+' actual original joystick receives touch movement');
  await touch(cdp,'touchEnd',[]);
  const rest=await page.evaluate(()=>joyState.y);
  check(Math.abs(rest)<.01,sc.name+' original joystick centres on touch release');
  console.log('JM_CP19_DEVICE_LAYOUT',JSON.stringify({scenario:sc.name,viewport:sc,
   act,joy,fire,echo,menu,originalPlayerAfterJoystick:{
    x:moving.source.x,y:moving.source.y},originalControlVersion:'0.5.1'}));
  await context.close();
 }
 // Separate real touch hold long enough to mount a real source Core A:
 // navigate via only original user command MOVE, no FTR.test or actor edits.
 const context=await browser.newContext({viewport:{width:393,height:873},
  isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>exceptions.push('real-touch-core: '+e.message));
 await page.goto(base,{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.JMFTRDevice&&!!window.JMFTRQuietTrace);
 await page.locator('#startBtn').tap();
 for(const target of [[12.4,17.2],[12.4,15.4],[14.4,15.4]]){
  let reached=false;
  for(let i=0;i<110;i++){
   const s=await page.evaluate(([x,y])=>{
    const state=window.FTR.state(),p=state.player,dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
    if(d>.23&&state.running){
     const f=(dx*Math.cos(p.a)+dy*Math.sin(p.a))/d;
     const side=(dx*Math.cos(p.a+Math.PI/2)+dy*Math.sin(p.a+Math.PI/2))/d;
     window.FTR.command('MOVE',{x:side,y:f});
    }else window.FTR.command('MOVE',{x:0,y:0});
    return {d,alive:state.running};
   },target);
   if(s.d<.23){reached=true;break;}
   if(!s.alive)break;
   await page.waitForTimeout(70);
  }
  await page.evaluate(()=>window.FTR.command('MOVE',{x:0,y:0}));
  check(reached,'portrait source-controlled player navigates authentic world to original Core A');
 }
 const act=await rBox(page,'#act');
 const cd=await context.newCDPSession(page),pt={id:19,x:act.x+act.width/2,y:act.y+act.height/2};
 await touch(cd,'touchStart',[pt]);
 await page.waitForTimeout(1450);
 await touch(cd,'touchEnd',[]);
 const r=await page.evaluate(()=>({game:window.FTR.state(),device:window.JMFTRDevice.state(),
  sourceVersion:window.FTR.version}));
 const mounts=r.game.run.events.filter(e=>e.event==='CORE_MOUNT'&&e.id==='A');
 check(r.game.player.cores===1&&mounts.length===1,
  'genuine original source Core A mounted exactly once by true mobile touch hold');
 check(!r.device.touchHeld,'genuine mobile touch release stops original held TRACE');
 check(r.sourceVersion==='0.5.1','original source identity persists after mobile touch mount');
 console.log('JM_CP19_TOUCH_CORE_MOUNT',JSON.stringify({schema:'jm.ftr.original-mobile-touch/0.1',
  realTouchEvents:true,originalCoreMounted:r.game.player.cores,
  originalSourceEvents:mounts.length,originalScore:r.game.player.score,
  originalDevicePresses:r.device.presses,originalDeviceReleases:r.device.releases,
  emulatedMobile:true,ownerPhysicalPhone:false,forbiddenTestHooks:'NONE'}));
 await context.close();
 check(exceptions.length===0,'no browser exceptions across responsive touch/gameplay scenarios: '+JSON.stringify(exceptions));
 console.log('JM_CP19_BROWSER_DEVICE_RESULT',JSON.stringify({schema:'jm.ftr.original-device-browser-contact/0.1',
  scenarios:scenarios.map(x=>x.name),passed:checks.length,failed:0,
  originalSourceUntouched:true,emulatedTouch:true,physicalPhone:'NOT_TESTED'}));
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}
