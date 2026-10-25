import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime } from '../coding-estate/sovereign-ten/direct/game-native.mjs';
import { JMLogic } from '../coding-estate/sovereign-ten/direct/language-native.mjs';

const root=process.cwd();
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>p&&existsSync(p));
assert.ok(chrome,'Chromium executable required for real WebGL proof');
const pathname='/engine/demo/cp11-sovereign-contact-v0.5.html';
let port;
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1'),p=resolve(root,'.'+decodeURIComponent(u.pathname));
 if(!p.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try {
  let content=readFileSync(p);
  if(u.pathname===pathname) {
   content=Buffer.from(content.toString()
    .replace("const BASE='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@95a529c26341751af3d26f1a4499a1481801c047/engine/';","const BASE='http://127.0.0.1:"+port+"/engine/';")
    .replace("const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';","const THREE_URL='http://127.0.0.1:"+port+"/node_modules/three/build/three.module.js';")
    .replace("const NATIVE_GAME_URL='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@60dc75159e901a208e55f80071269dd24cfc238d/coding-estate/sovereign-ten/direct/game-native.mjs';","const NATIVE_GAME_URL='http://127.0.0.1:"+port+"/coding-estate/sovereign-ten/direct/game-native.mjs';")
    .replace("const NATIVE_LOGIC_URL='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@60dc75159e901a208e55f80071269dd24cfc238d/coding-estate/sovereign-ten/direct/language-native.mjs';","const NATIVE_LOGIC_URL='http://127.0.0.1:"+port+"/coding-estate/sovereign-ten/direct/language-native.mjs';")
   );
  }
  res.setHeader('Content-Type',extname(p)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  res.end(content);
 } catch(e) {res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));port=server.address().port;
let browser;
try {
 assert.equal(typeof GameCoding.parse,'function');
 assert.equal(typeof JMGameCore.parse,'function');
 assert.equal(typeof JMLogic.evaluate,'function');
 assert.equal(typeof GameCodingRuntime,'function');
 assert.equal(typeof JMGameCoreRuntime,'function');
 assert.throws(()=>GameCoding.parse('entity Player { resonance = 0 } mechanic Missing { requires player.resonance >= 0 }'),/requires requires and effect/);
 assert.throws(()=>JMGameCore.parse('organ O { handles = [Player] rules = [M] } system S { organs = [Absent] events = [Hit] identity = "X" }'),/unknown organ/i);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:360,height:780},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:'+port+pathname);
 await page.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL',{timeout:45000});
 await page.waitForFunction(()=>window.__CP11?.native?.online===true,{timeout:20000});
 const initial=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(initial.native.gameNodes,3);
 assert.equal(initial.native.coreEdges,3);
 assert.equal(initial.native.policyGraphs,1);
 assert.equal(initial.native.resonance,0);
 assert.ok(initial.drawCalls>10);
 const dims=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
 assert.ok(dims.document<=dims.width+1,'Fold simulated view must not overflow');
 mkdirSync('cp11-native-evidence',{recursive:true});
 await page.screenshot({path:'cp11-native-evidence/boot.png'});
 async function pulseToHit(requiredHits){
  await page.locator('#pulse').click();
  await page.waitForFunction(n=>window.__CP11.hits>=n,requiredHits,{timeout:35000});
  await page.waitForTimeout(600);
  return page.evaluate(()=>structuredClone(window.__CP11));
 }
 let s=await pulseToHit(1);
 assert.equal(s.native.earnedHits,1);assert.equal(s.native.resonance,20);
 assert.equal(s.native.denials,1);assert.equal(s.native.strikes,0);
 s=await pulseToHit(2);
 assert.equal(s.native.earnedHits,2);assert.equal(s.native.resonance,40);
 assert.equal(s.native.denials,2);
 s=await pulseToHit(4);
 assert.equal(s.native.strikes,1);assert.equal(s.native.authorizations,1);
 assert.equal(s.native.resonance,20);
 assert.equal(s.native.earnedHits,3);
 assert.equal(s.hits,4,'real HP outcome must include 2x native strike');
 assert.equal(s.native.lastCoreIdentity,'JM.CP11.ContactOrgan/1');
 assert.ok(s.native.nativeGameTraceDigest && s.native.nativeCoreTraceDigest && s.native.nativePolicyTraceDigest);
 assert.ok(s.contacts.some(c=>c.type==='JM_NATIVE_OVERDRIVE'&&c.detail.power===2));
 await page.screenshot({path:'cp11-native-evidence/earned-overdrive.png'});
 await page.locator('#restart').click();
 await page.waitForFunction(()=>window.__CP11.native.resets===1);
 s=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(s.native.resonance,0);
 assert.equal(s.hits,0);
 assert.equal(s.seals,0);
 s=await pulseToHit(1);
 assert.equal(s.native.earnedHits,4);
 assert.equal(s.native.strikes,1);
 assert.deepEqual(errors,[]);
 console.log('JM_CP11_THREE_BODY_REAL_CONTACT_PASS '+JSON.stringify({
  initial:{drawCalls:initial.drawCalls,nodes:initial.native.gameNodes,edges:initial.native.coreEdges,policies:initial.native.policyGraphs},
  proven:{hitsBeforeRestart:4,strikes:1,nativeResonanceAfterRestart:s.native.resonance,resetCount:s.native.resets},errors
 }));
} finally {
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
