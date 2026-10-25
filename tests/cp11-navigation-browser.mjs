import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd(),chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
assert.ok(chrome,'Chromium required');let port;
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!p.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{let body=readFileSync(p);
 if(url.pathname==='/engine/demo/cp11-living-form.html')
 body=Buffer.from(body.toString()
 .replace("const BASE='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@95a529c26341751af3d26f1a4499a1481801c047/engine/';","const BASE='http://127.0.0.1:"+port+"/engine/';")
 .replace("const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';","const THREE_URL='http://127.0.0.1:"+port+"/node_modules/three/build/three.module.js';"));
 res.setHeader('Content-Type',extname(p)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(body);}catch(e){res.writeHead(404);res.end('Not found');}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:360,height:770},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+port+'/engine/demo/cp11-living-form.html');
 await page.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL',{timeout:40000});
 assert.equal(await page.evaluate(()=>window.__CP11.version),'JM.CP11.LivingForm/0.2');
 const view=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,stage:document.querySelector('#stage').getBoundingClientRect().height,buttons:[...document.querySelectorAll('.controls button')].map(e=>e.getBoundingClientRect().width)}));
 assert.ok(view.doc<=view.w+1,'no horizontal overflow');assert.ok(view.stage>=200);assert.ok(view.buttons.every(v=>v>=65));
 assert.equal(await page.evaluate(()=>window.__CP11.target),2);
 await page.locator('#t2').click();assert.equal(await page.evaluate(()=>window.__CP11.target),3);
 await page.locator('#next').click();assert.equal(await page.evaluate(()=>window.__CP11.target),1);
 await page.locator('#view').click();assert.equal(await page.evaluate(()=>window.__CP11.cameraMode),'hero');
 await page.locator('#center').click();assert.equal(await page.evaluate(()=>window.__CP11.cameraMode),'wide');
 await page.locator('#pause').click();assert.match(await page.locator('#pause').innerText(),/RESUME/);await page.locator('#pause').click();
 const pad=await page.locator('#joy').boundingBox();assert.ok(pad);
 const px=pad.x+pad.width/2,py=pad.y+pad.height/2;
 await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px+29,py-29,{steps:5});
 await page.waitForFunction(()=>window.__CP11.motion.x>0.45&&window.__CP11.motion.z<-.45,{timeout:3000});
 await page.waitForTimeout(550);const moved=await page.evaluate(()=>({...window.__CP11.actorPosition}));
 assert.ok(moved.x>0.1&&moved.z<-.1,'joystick moves two world axes');
 await page.mouse.up();await page.waitForFunction(()=>window.__CP11.motion.x===0&&window.__CP11.motion.z===0);
 await page.locator('#pulse').click();await page.waitForFunction(()=>window.__CP11?.actions.pulse>=1);
 const pulse=await page.evaluate(()=>window.__CP11.contacts.filter(e=>e.type==='PULSE_FIRED').at(-1));
 assert.equal(pulse.detail.toward,1,'pulse respects manual lock');
 mkdirSync('cp11-evidence',{recursive:true});await page.screenshot({path:'cp11-evidence/cp11-navigation-fold-360.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('CP11_NAVIGATION_CONTACT_PASS '+JSON.stringify({viewport:view,moved,pulse:pulse.detail,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}