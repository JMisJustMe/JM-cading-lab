import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4177';
const path='/unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html';
const cases=[['phone',{width:390,height:844}],['desktop',{width:1440,height:960}]];
await mkdir('qa/ailatheo-v3-gripcube',{recursive:true});

const browser=await chromium.launch({headless:true});
for(const [name,viewport] of cases){
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+path,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.JMAILatheoGripUI?.proof?.().stageDominant===true);
  const before=await page.evaluate(()=>window.JMAILatheoGripUI.proof());

  await page.locator('.gcw-lens[data-face="form"]').click();
  await page.locator('#addObject').click();
  await page.locator('#objectName').fill('Grip Body');
  await page.locator('#action').selectOption('Spin');
  await page.locator('#addObject').click();
  await page.locator('.gcw-lens[data-face="route"]').click();

  const metrics=await page.evaluate(()=>({
    proof:window.JMAILatheoGripUI.proof(),
    viewportOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    bodyCount:document.querySelectorAll('.sceneBody').length,
    cube:!!document.querySelector('#gcwCubeDock'),
    visibleFace:document.querySelector('.gcw-face.active')?.dataset.face,
    stageRect:(()=>{const r=document.querySelector('.gcw-stageZone')?.getBoundingClientRect();return r&&{w:r.width,h:r.height}})(),
    faceRect:(()=>{const r=document.querySelector('.gcw-faceZone')?.getBoundingClientRect();return r&&{w:r.width,h:r.height}})()
  }));
  if(errors.length) throw new Error(name+': page errors '+errors.join(' | '));
  if(metrics.viewportOverflow) throw new Error(name+': horizontal viewport overflow');
  if(metrics.bodyCount<2) throw new Error(name+': created bodies not rendered');
  if(!metrics.cube||metrics.proof.faces!==6||metrics.proof.quickContacts!==5) throw new Error(name+': GripCube carrier proof mismatch '+JSON.stringify(metrics));
  await page.screenshot({path:'qa/ailatheo-v3-gripcube/'+name+'.png',fullPage:true});
  console.log(name+': PASS '+JSON.stringify(metrics));
}
await browser.close();
console.log('AILatheo GripCube render/contact PASS — 2/2');