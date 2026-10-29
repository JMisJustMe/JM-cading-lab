/**
 * CP04: browser-hosted execution against existing frozen FTR First-Person v0.5.1.
 * Loads its actual six game source limbs, original canvas and live command API.
 * Does not modify or reproduce the frozen game. Chromium != owner-phone GPU proof.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {contactEvent,deliverExistingFirstPersonContact} from './ftr-eight-contact.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const gameRoot='estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const target=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const full=resolve(root,'.'+target);
    if(!full.startsWith(root+sep))throw new Error('OUTSIDE_REPO');
    const body=await readFile(full);
    res.writeHead(200,{'content-type':mime[extname(full)]??'application/octet-stream','x-content-type-options':'nosniff'});
    res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const address=server.address();let browser;let passed=0;const logs=[];
const check=async(name,fn)=>{await fn();passed++;console.log('PASS',name)};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 page.on('pageerror',e=>{logs.push('page:'+e.message);console.log('BROWSER_PAGEERROR',e.stack??e.message)});
 const url='http://127.0.0.1:'+address.port+'/'+gameRoot+'index.html';
 const response=await page.goto(url,{waitUntil:'load'});
 await check('Original First-Person v0.5.1 opened over actual HTTP',async()=>{assert.equal(response.status(),200);assert.equal(await page.evaluate(()=>window.FTR?.version),'0.5.1')});
 const dispatch=async(name,payload)=>page.evaluate(({name,payload})=>window.FTR.command(name,payload),{name,payload});
 const readState=async()=>page.evaluate(()=>window.FTR.state());
 const send=async(source,gesture,pressure=.5)=>deliverExistingFirstPersonContact({
   contact:contactEvent({source,gesture,pressure,sequence:passed}),dispatch,readState});
 await check('Wake is delivered to original FTR game and starts a session',async()=>{
   const r=await send('Ama-Pro','wake');
   assert.equal(r.command.name,'START');assert.equal(r.after.running,true);assert.equal(r.before.running,false);
 });
 await check('First-Person original canvas genuinely paints game pixels',async()=>{
   await page.waitForTimeout(250);
   const sample=await page.evaluate(()=>{
      const c=document.getElementById('game'),ctx=c.getContext('2d');
      const out=[];for(const [x,y] of [[.2,.3],[.5,.5],[.75,.6]])out.push([...ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data]);
      return {w:c.width,h:c.height,samples:out};
   });
   assert(sample.w>=1000&&sample.h>=700);
   assert(sample.samples.some(x=>x.slice(0,3).some(v=>v>0)));
 });
 await check('Route maps to existing real yaw movement',async()=>{
   const r=await send('GripRoute','turn',.7);
   assert(r.after.player.a>r.before.player.a+0.1);
   assert.equal(r.after.running,true);
 });
 await check('Pulse uses original shooting and consumes ammunition',async()=>{
   const r=await send('Ama-Pro','press',.7);
   assert.equal(r.after.run.shots,r.before.run.shots+1);
   assert.equal(r.after.player.ammo,r.before.player.ammo-1);
 });
 await check('Kic uses original PHASE consequence',async()=>{
   const r=await send('PalmVerse','flick',.7);
   assert.equal(r.after.run.phases,r.before.run.phases+1);
 });
 await check('Flow moves original character in real game loop',async()=>{
   await page.evaluate(()=>{window.FTR.test.freezeEnemies();window.FTR.test.setPlayer(14.4,15.4,-Math.PI/2);});
   const r=await send('gamepad','sweep',.65);
   await page.waitForTimeout(760);
   const after=await readState();
   const distance=Math.hypot(after.player.x-r.after.player.x,after.player.y-r.after.player.y);
   console.log('FLOW_MEASUREMENT',JSON.stringify({distance,before:r.after.player,after:after.player,running:after.running,errors:logs}));
   assert.equal(after.running,true);
   assert(distance>.04);
   await dispatch('MOVE',{x:0,y:0});
 });
 await check('Hold drives original TRACE CORE interaction, not just label state',async()=>{
   await page.evaluate(()=>{window.FTR.test.freezeEnemies();window.FTR.test.setPlayer(14.4,15.4);});
   await page.waitForTimeout(150);
   const r=await send('Ama-Pro','squeeze',.5);
   assert.equal(r.command.name,'INTERACT');
   await page.waitForTimeout(1350);
   const s=await readState();
   assert.equal(s.cores[0].active,true);
   assert.equal(s.player.cores,1);
   await dispatch('INTERACT',{down:false});
 });
 await check('Unimplemented Create remains explicit HOLD with no fake dispatch',async()=>{
   const r=await send('Ama-Pro','draw',1);
   assert.equal(r.status,'HOLD_UNSUPPORTED_RECIPIENT_MECHANIC');
   assert.equal(r.delivered,false);
 });
 await check('Phone-size viewport emulation keeps full-screen canvas coverage',async()=>{
   await page.setViewportSize({width:390,height:844});
   await page.waitForTimeout(200);
   const m=await page.evaluate(()=>window.FTR.test.canvasMetrics());
   assert(Math.abs(m.cssWidth-390)<4);assert(Math.abs(m.cssHeight-844)<4);
   assert(m.coverageX>=.98&&m.coverageY>=.98);
 });
 await check('No uncaught browser errors during actual game contact',async()=>assert.deepEqual(logs,[]));
 console.log(JSON.stringify({schema:'jm.ftr.first-person-browser-contact/0.1',passed,failed:0,
  browser:'Playwright Chromium headless',actualGame:'FTR First-Person v0.5.1 untouched',
  surface:'real browser DOM, actual 2D canvas and game loop',ownerDevice:'NOT_TESTED',gardles:'NOT_INTEGRATED'}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
