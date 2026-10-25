import { createServer } from 'node:http';
import { readFileSync,existsSync,mkdirSync } from 'node:fs';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const root=process.cwd();
const chromiumPath=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
assert.ok(chromiumPath,'Chromium required for real CP11 WebGL');
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{
 let body=readFileSync(path);
 if(url.pathname==='/engine/demo/cp11-living-form.html'){
    body=Buffer.from(body.toString().replace(
      "const BASE='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@95a529c26341751af3d26f1a4499a1481801c047/engine/';",
      "const BASE='http://127.0.0.1:"+server.address().port+"/engine/';")
      .replace("const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';",
               "const THREE_URL='http://127.0.0.1:"+server.address().port+"/node_modules/three/build/three.module.js';")
     );
 }
 res.setHeader('Content-Type',extname(path)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
 res.end(body);
 }catch(e){res.writeHead(404);res.end('not found: '+String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({executablePath:chromiumPath,headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pg=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
 const errors=[];pg.on('pageerror',e=>errors.push(e.stack||e.message));pg.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const url='http://127.0.0.1:'+server.address().port+'/engine/demo/cp11-living-form.html';
 await pg.goto(url,{waitUntil:'load'});
 await pg.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL',{timeout:45000});
 await pg.waitForFunction(()=>window.__CP11?.fps>0,{timeout:10000});
 const before=await pg.evaluate(()=>({...window.__CP11}));
 assert.ok(before.compiledOrgans>=25, 'many genuine JM-compiled organs');
 assert.ok(before.vertices>200 && before.triangles>350);
 assert.ok(before.drawCalls>=20 && before.fps>0);
 assert.equal(before.health,100);
 const px=await pg.evaluate(()=>{const c=document.querySelector('#surface'),gl=c.getContext('webgl2');if(!gl)return null;const sample=(x,y)=>{let v=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,v);return Array.from(v)};return {center:sample(Math.floor(c.width/2),Math.floor(c.height/2)),corner:sample(2,2)};});
 assert.ok(px && px.center.some((n,i)=>i<3&&Math.abs(n-px.corner[i])>10),'real WebGL pixels differ from background');
 mkdirSync('cp11-evidence',{recursive:true});
 await pg.screenshot({path:'cp11-evidence/cp11-desktop.png'});
 await pg.locator('#pulse').click();await pg.waitForFunction(()=>window.__CP11.actions.pulse===1);
 await pg.locator('#guard').click();await pg.waitForFunction(()=>window.__CP11.actions.guard===1);
 await pg.locator('#slam').click();await pg.waitForFunction(()=>window.__CP11.actions.slam===1);
 for(let i=0;i<16;i++){
  if(await pg.evaluate(()=>window.__CP11.seals===3))break;
  await pg.waitForTimeout(560);
  await pg.locator('#pulse').click();
 }
 await pg.waitForFunction(()=>window.__CP11.seals===3,{timeout:12000});
 await pg.locator('#awaken').click();
 await pg.waitForFunction(()=>window.__CP11.awakened===true,{timeout:4000});
 const end=await pg.evaluate(()=>({...window.__CP11}));
 assert.equal(end.seals,3);assert.ok(end.hits>=6);assert.equal(end.actions.awaken,1);
 assert.ok(end.contacts.some(e=>e.type==='RELIC_HIT')&&end.contacts.some(e=>e.type==='AWAKENED'));
 await pg.screenshot({path:'cp11-evidence/cp11-awakened.png'});
 await pg.locator('#restart').click();await pg.waitForFunction(()=>window.__CP11.seals===0);
 assert.equal(await pg.locator('#seals').innerText(),'0 / 3');
 const fold=await browser.newPage({viewport:{width:658,height:1484},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 const foldErrors=[];fold.on('pageerror',e=>foldErrors.push(e.message));
 await fold.goto(url,{waitUntil:'load'});
 await fold.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL',{timeout:45000});
 const metrics=await fold.evaluate(()=>{const c=document.querySelector('#surface').getBoundingClientRect(),actions=document.querySelector('.controls').getBoundingClientRect();return {viewport:innerWidth,canvas:{left:c.left,right:c.right,top:c.top,bottom:c.bottom},controls:{left:actions.left,right:actions.right,top:actions.top},docWidth:document.documentElement.scrollWidth,drawCalls:window.__CP11.drawCalls,organs:window.__CP11.compiledOrgans};});
 assert.ok(metrics.canvas.right<=metrics.viewport+1,'canvas within Fold viewport');
 assert.ok(metrics.docWidth<=metrics.viewport+1,'no horizontal overflow');
 await fold.screenshot({path:'cp11-evidence/cp11-fold-portrait.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(foldErrors,[]);
 console.log('JM_CP11_REAL_CONTACT_PASS '+JSON.stringify({initial:before,final:{seals:end.seals,hits:end.hits,actions:end.actions,health:end.health},pixels:px,fold:metrics,errors}));
} finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}