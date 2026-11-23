import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';

const root=process.cwd();
const htmlPath='/engine/demo/cp10-mesh-contact.html';
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>p&&existsSync(p));
assert.ok(chrome,'Chrome/Chromium required for genuine WebGL smoke');

const cdn='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  try{
    let body=readFileSync(path);
    if(url.pathname===htmlPath)body=Buffer.from(body.toString().replace(cdn,'/node_modules/three/build/three.module.js'));
    res.setHeader('Content-Type',extname(path)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
    res.end(body);
  }catch{res.writeHead(404);res.end('not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:880,height:680},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:'+port+htmlPath,{waitUntil:'load'});
 await page.waitForFunction(()=>window.__CP10?.ready===true,{timeout:30000});
 await page.waitForFunction(()=>window.__CP10?.deformMoved===true,{timeout:12000});
 let snap=await page.evaluate(()=>({...window.__CP10}));
 assert.equal(snap.actualWebGL,true);
 assert.equal(snap.drawCalls,1,'exactly one mesh draw, not proof of batching');
 assert.equal(snap.vertices,9);assert.equal(snap.triangles,14);
 assert.ok(snap.deformMoved);
 assert.deepEqual(errors,[]);
 const pixel=await page.evaluate(()=>{
   const c=document.querySelector('canvas');
   const gl=c.getContext('webgl2')||c.getContext('webgl');
   const sample=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);};
   return {center:sample(Math.floor(c.width/2),Math.floor(c.height/2)),corner:sample(2,2)};
 });
 assert.ok(pixel.center.some((n,i)=>i<3&&Math.abs(n-pixel.corner[i])>12),'actual raster pixels distinguish authored mesh from clear background');
 await page.screenshot({path:'cp10-real-webgl-desktop.png'});
 await page.locator('#toggle').click();
 assert.match(await page.locator('#toggle').innerText(),/OFF/);
 await page.locator('#toggle').click();
 const before=await page.evaluate(()=>window.__CP10.turns);
 await page.locator('#surface').dispatchEvent('pointerdown',{clientX:200,clientY:200,pointerId:1});
 await page.locator('#surface').dispatchEvent('pointermove',{clientX:245,clientY:215,pointerId:1});
 await page.locator('#surface').dispatchEvent('pointerup',{pointerId:1});
 assert.ok(await page.evaluate(()=>window.__CP10.turns)>before,'drag rotates live mesh');
 await page.locator('#source').fill('v invalid 0 0');
 await page.locator('#compile').click();
 assert.match(await page.locator('#status').innerText(),/SOURCE HOLD/);
 assert.equal(await page.evaluate(()=>window.__CP10.drawCalls),1,'bad source retains last good rendering');
 const fold=await browser.newPage({viewport:{width:710,height:840},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 await fold.goto('http://127.0.0.1:'+port+htmlPath,{waitUntil:'load'});
 await fold.waitForFunction(()=>window.__CP10?.ready===true,{timeout:30000});
 await fold.screenshot({path:'cp10-real-webgl-fold-layout.png'});
 const s2=await fold.evaluate(()=>({...window.__CP10}));
 assert.equal(s2.drawCalls,1);assert.equal(s2.vertices,9);assert.equal(s2.triangles,14);
 await fold.close();
 console.log('REAL_WEBGL_PASS',JSON.stringify({desktop:snap,pixel,fold:s2,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
