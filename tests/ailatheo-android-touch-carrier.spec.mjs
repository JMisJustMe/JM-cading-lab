import { chromium } from 'playwright';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
const dir=mkdtempSync(join(tmpdir(),'jm-touch-carrier-'));
const result=spawnSync('node',['scripts/build_ailatheo_v3_receiver_carrier.mjs',dir],{encoding:'utf8'});
if(result.status!==0)throw Error('CARRIER_NATIVE_BUILD_FAILED '+result.stderr);
const html=readFileSync(join(dir,'index.html'),'utf8');
if(!html.includes('VISIBLE CONSEQUENCE')||!html.includes('Pulse Pad')||!html.includes('Gate Bloom')||!html.includes('PERSISTED STATE RECOVERED'))throw Error('LIVING_FIRST_OPEN_MISSING');
const web=createServer((req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end(html)});
await new Promise(done=>web.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+web.address().port+'/';
const browser=await chromium.launch({headless:true});
function need(x,msg){if(!x)throw Error(msg)}
async function check(viewport){
 const ctx=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'load'});
 need(await page.locator('.tile').count()===3,'MISSING_THREE_ACTUAL_BODIES');
 // Actual Fold device screenshots: Gate Bloom action text must fit wholly inside its card.
 // Assert rendered geometry, not merely the presence of words in HTML.
 const layout=await page.evaluate(()=>{
  const within=(outer,inner)=>{const o=outer.getBoundingClientRect(),i=inner.getBoundingClientRect();return i.top>=o.top-1&&i.bottom<=o.bottom+1&&i.left>=o.left-1&&i.right<=o.right+1};
  const items=[...document.querySelectorAll('.tile')].map(x=>({id:x.id,actionInside:within(x,x.querySelector('em')),nameInside:within(x,x.querySelector('strong'))}));
  const text=document.querySelector('header>div').getBoundingClientRect(),tag=document.querySelector('header .tag').getBoundingClientRect();
  return {items,headerNotOverlapping:text.right<=tag.left+1,bottomPadding:parseFloat(getComputedStyle(document.querySelector('.app')).paddingBottom)};
 });
 need(layout.items.length===3&&layout.items.every(x=>x.actionInside&&x.nameInside),'OWNER_DEVICE_TILE_LABEL_CLIPPED '+JSON.stringify(layout));
 need(layout.headerNotOverlapping,'ANDROID_HEADER_BADGE_OVERLAP '+JSON.stringify(layout));
 need(layout.bottomPadding>=30,'ANDROID_SYSTEM_NAVIGATION_FOOTER_SPACING '+JSON.stringify(layout));
 need((await page.locator('#state').textContent()).includes('OneBody carrier ready'),'NOT_READY_ON_FIRST_OPEN');
 need(await page.locator('#lineA').getAttribute('x1')!==await page.locator('#lineA').getAttribute('x2'),'LINK_A_NOT_ACTUALLY_DRAWN');
 await page.locator('#recover').click();
 need((await page.locator('#state').textContent()).includes('RECOVERY HOLD'),'FALSE_RECOVERY_WITHOUT_SAVE');
 await page.locator('#pad').click();
 need((await page.locator('#state').textContent()).includes('VISIBLE CONSEQUENCE'),'TAP_DID_NOT_CAUSE_CHANGE');
 need(await page.locator('#pad').getAttribute('data-on')==='true','PAD_NOT_CHANGED');
 need(await page.locator('#orb').getAttribute('data-on')==='true','LINK_ONE_DID_NOT_FIRE');
 need(await page.locator('#bloom').getAttribute('data-on')==='true','LINK_TWO_DID_NOT_FIRE');
 need((await page.locator('#trace').textContent()).includes('2 touch links'),'NO_ROUTED_TRACE');
 await page.locator('#undo').click();
 need(await page.locator('#pad').getAttribute('data-on')==='false','UNDO_DID_NOT_RECOVER');
 await page.locator('#contact').click();
 await page.locator('#save').click();
 need((await page.locator('#state').textContent()).includes('SAVE PASS'),'SAVE_READBACK_NOT_PROVEN');
 const old=await page.locator('#orb').evaluate(x=>({left:x.style.left,top:x.style.top}));
 const b=await page.locator('#orb').boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
 await page.mouse.down();await page.mouse.move(b.x+b.width/2+28,b.y+b.height/2+30,{steps:6});await page.mouse.up();
 const moved=await page.locator('#orb').evaluate(x=>({left:x.style.left,top:x.style.top}));
 need(moved.left!==old.left||moved.top!==old.top,'DRAG_DID_NOT_CHANGE_POSITION');
 await page.locator('#undo').click();
 const afterUndo=await page.locator('#orb').evaluate(x=>({left:x.style.left,top:x.style.top}));
 need(afterUndo.left===old.left&&afterUndo.top===old.top,'DRAG_UNDO_FAILED');
 await page.reload({waitUntil:'load'});
 await page.locator('#recover').click();
 need((await page.locator('#state').textContent()).includes('PERSISTED STATE RECOVERED'),'REENTRY_RECOVERY_FAILED');
 need(await page.locator('#orb').getAttribute('data-on')==='true','SAVED_TOUCH_STATE_LOST');
 need(errors.length===0,'BROWSER_FAULT '+errors.join(' | '));
 console.log('JM_ANDROID_TOUCH_FIRST_OPEN_PASS',JSON.stringify({viewport,bodies:3,links:2,undo:true,touch:true,save:true,reentry:true}));
 await ctx.close();
}
try{
 await check({width:320,height:700});
 await check({width:360,height:800});
 await check({width:390,height:844});
 await check({width:1366,height:900});
 const page=await browser.newPage();
 await page.goto(pathToFileURL(resolve(dir,'index.html')).href,{waitUntil:'load'});
 need(await page.locator('.tile').count()===3,'LOCAL_FILE_FIRST_OPEN_MISSING');
 await page.locator('#pad').click();
 need((await page.locator('#state').textContent()).includes('VISIBLE CONSEQUENCE'),'FILE_TOUCH_FAILED');
 await page.close();
 console.log('JM_AILATHEO_ANDROID_TOUCH_CARRIER_PROOF_PASS · real receiver source → interactive single-file HTML → two viewports → file:// · no Android device runtime Ding');
}finally{await browser.close();await new Promise(done=>web.close(done));rmSync(dir,{recursive:true,force:true})}
