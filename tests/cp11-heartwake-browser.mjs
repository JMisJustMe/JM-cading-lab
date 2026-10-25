import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright-core';

const root=process.cwd();
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
assert.ok(chrome,'Real Chrome/Chromium required');
let port;
const served='/engine/demo/cp11-heartwake-v0.3.html';
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const p=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!p.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{
   let body=readFileSync(p);
   if(url.pathname===served){
     body=Buffer.from(body.toString()
       .replace("const BASE='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@95a529c26341751af3d26f1a4499a1481801c047/engine/';",
                "const BASE='http://127.0.0.1:"+port+"/engine/';")
       .replace("const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';",
                "const THREE_URL='http://127.0.0.1:"+port+"/node_modules/three/build/three.module.js';"));
   }
   res.setHeader('Content-Type',extname(p)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
   res.end(body);
 }catch(e){res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:920,height:790},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push('PAGE '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
 await page.goto('http://127.0.0.1:'+port+served,{waitUntil:'load'});
 await page.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL',{timeout:45000});
 await page.waitForFunction(()=>window.__CP11?.fps>0,{timeout:15000});
 const initial=await page.evaluate(()=>({...window.__CP11}));
 assert.equal(initial.version,'JM.CP11.LivingForm/0.3');
 assert.equal(initial.donorHead,'95a529c26341751af3d26f1a4499a1481801c047');
 assert.ok(initial.compiledOrgans>=38,'Rootwarden gained eight genuine mesh organs');
 assert.equal(initial.phase,1);assert.equal(initial.seals,0);
 assert.ok(initial.drawCalls>0 && initial.drawCalls<72,'source scene is rendered with batched static instances');
 const pixel=await page.evaluate(()=>{
  const canvas=document.getElementById('surface'),gl=canvas.getContext('webgl2');
  const sample=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);};
  return {mid:sample(Math.floor(canvas.width/2),Math.floor(canvas.height/2)),corner:sample(2,2)};
 });
 assert.ok(pixel.mid.some((v,i)=>i<3&&Math.abs(v-pixel.corner[i])>12),'Real framebuffer pixel contact');
 mkdirSync('cp11-evidence',{recursive:true});
 await page.screenshot({path:'cp11-evidence/cp11-heartwake-phase1.png'});
 for(let i=0;i<22;i++){
   if(await page.evaluate(()=>window.__CP11.seals===3))break;
   await page.waitForTimeout(650);
   await page.locator('#pulse').click();
 }
 await page.waitForFunction(()=>window.__CP11.seals===3,{timeout:12000});
 const seals=await page.evaluate(()=>({...window.__CP11}));
 assert.equal(seals.hits,6);
 assert.equal(seals.phase,1);
 await page.locator('#awaken').click();
 await page.waitForFunction(()=>window.__CP11?.phase===2,{timeout:10000});
 const wake=await page.evaluate(()=>({...window.__CP11}));
 assert.ok(wake.compiledOrgans>=47);
 assert.equal(wake.echoes,0);
 assert.ok(wake.contacts.some(c=>c.type==='ECHO_WAVE'));
 assert.equal(wake.actions.awaken,1);
 assert.match(await page.locator('#quest').innerText(),/BANISH/);
 await page.screenshot({path:'cp11-evidence/cp11-heartwake-phase2.png'});
 await page.locator('#awaken').click();
 await page.waitForFunction(()=>window.__CP11.actions.surge===1,{timeout:5000});
 assert.ok(await page.evaluate(()=>window.__CP11.contacts.some(c=>c.type==='HEART_SURGE')));
 for(let i=0;i<26;i++){
   if(await page.evaluate(()=>window.__CP11.victory))break;
   await page.waitForTimeout(750);
   await page.locator('#pulse').click();
 }
 await page.waitForFunction(()=>window.__CP11?.victory===true,{timeout:18000});
 const ended=await page.evaluate(()=>({...window.__CP11}));
 assert.equal(ended.echoes,3);
 assert.equal(ended.seals,3);
 assert.ok(ended.contacts.some(c=>c.type==='HEARTWAKE_VICTORY'));
 assert.match(await page.locator('#quest').innerText(),/RESTORED/);
 await page.screenshot({path:'cp11-evidence/cp11-heartwake-victory.png'});
 await page.locator('#restart').click();
 await page.waitForFunction(()=>window.__CP11.phase===1&&window.__CP11.seals===0,{timeout:6000});
 assert.equal(await page.locator('#seals-label').innerText(),'SEALS BROKEN');
 const fold=await browser.newPage({viewport:{width:360,height:790},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 const foldErrors=[];fold.on('pageerror',e=>foldErrors.push(e.message));
 await fold.goto('http://127.0.0.1:'+port+served,{waitUntil:'load'});
 await fold.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL',{timeout:45000});
 const fm=await fold.evaluate(()=>({w:innerWidth,scrollWidth:document.documentElement.scrollWidth,hero:document.getElementById('stage').getBoundingClientRect().height,drawCalls:window.__CP11.drawCalls,controls:[...document.querySelectorAll('.controls button')].map(x=>x.getBoundingClientRect().width)}));
 assert.ok(fm.scrollWidth<=fm.w+1);
 assert.ok(fm.controls.every(x=>x>=65));
 await fold.screenshot({path:'cp11-evidence/cp11-heartwake-fold360.png',fullPage:true});
 assert.deepEqual(errors,[]);
 assert.deepEqual(foldErrors,[]);
 console.log('CP11_HEARTWAKE_REAL_WEBGL_PASS '+JSON.stringify({initial:{organs:initial.compiledOrgans,vertices:initial.vertices,triangles:initial.triangles,drawCalls:initial.drawCalls,fps:initial.fps},phase1:seals.seals,awake:{organs:wake.compiledOrgans,phase:wake.phase},victory:{echoes:ended.echoes,hits:ended.hits,actions:ended.actions},framebuffer:pixel,fold:fm,errors}));
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
