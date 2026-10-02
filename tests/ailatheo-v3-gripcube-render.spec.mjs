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
  await page.waitForTimeout(350);
  const mounted=await page.evaluate(()=>({grip:!!window.JMAILatheoGripUI,proof:window.JMAILatheoGripUI?.proof?.()||null,ready:document.readyState}));
  if(!mounted.grip||!mounted.proof?.stageDominant){
    await page.screenshot({path:'qa/ailatheo-v3-gripcube/'+name+'-mount-fault.png',fullPage:true});
    throw new Error(name+': GripCube UI did not mount '+JSON.stringify(mounted)+' browserErrors='+errors.join(' | '));
  }
  const before=await page.evaluate(()=>window.JMAILatheoGripUI.proof());

  await page.locator('.gcw-lens[data-face="form"]').click();
  await page.locator('.gcw-quick [data-q="add"]').click();
  await page.locator('#objectName').fill('Grip Body');
  await page.locator('#action').selectOption('Spin');
  await page.locator('.gcw-quick [data-q="add"]').click();
  await page.locator('.gcw-lens[data-face="route"]').click();

  const metrics=await page.evaluate(()=>({
    proof:window.JMAILatheoGripUI.proof(),
    viewportOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    bodyCount:document.querySelectorAll('.sceneBody').length,
    cube:!!document.querySelector('#gcwCubeDock'),
    visibleFace:document.querySelector('.gcw-face.active')?.dataset.face,
    stageRect:(()=>{const r=document.querySelector('.gcw-stageZone')?.getBoundingClientRect();return r&&{w:r.width,h:r.height}})(),
    faceRect:(()=>{const r=document.querySelector('.gcw-faceZone')?.getBoundingClientRect();return r&&{w:r.width,h:r.height}})(),
    shellRect:(()=>{const r=document.querySelector('.gcw-shell')?.getBoundingClientRect();return r&&{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height}})(),
    footerTop:document.querySelector('.status')?.getBoundingClientRect().top,
    lensFits:(()=>{const e=document.querySelector('.gcw-lenses');return e?e.scrollWidth<=e.clientWidth+2:false})(),
    sceneClass:document.querySelector('#scene')?.className,
    starterStyle:(()=>{const e=document.querySelector('#object');if(!e)return null;const s=getComputedStyle(e);return {display:s.display,visibility:s.visibility,opacity:s.opacity}})(),
    starterVisible:(()=>{const e=document.querySelector('#object');return e?getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0':false})()
  }));
  await page.screenshot({path:'qa/ailatheo-v3-gripcube/'+name+'.png',fullPage:true});
  console.log(name+': RENDER '+JSON.stringify(metrics));
  if(errors.length) throw new Error(name+': page errors '+errors.join(' | '));
  if(metrics.viewportOverflow) throw new Error(name+': horizontal viewport overflow');
  if(metrics.bodyCount<2) throw new Error(name+': created bodies not rendered');
  if(!metrics.cube||metrics.proof.faces!==6||metrics.proof.quickContacts!==5) throw new Error(name+': GripCube carrier proof mismatch '+JSON.stringify(metrics));
  if(metrics.starterVisible) throw new Error(name+': starter teaching body still competes with created bodies '+JSON.stringify(metrics));
  if(name==='phone'&&!metrics.lensFits) throw new Error(name+': six semantic lenses do not fit the phone face rail');
  if(name==='phone'&&(metrics.stageRect?.h??0)<300) throw new Error(name+': creation stage collapsed below 300px '+JSON.stringify(metrics));
  if(name==='phone'&&(metrics.shellRect?.h??0)<viewport.height*.62) throw new Error(name+': GripCube shell no longer owns the available phone height '+JSON.stringify(metrics));
  if(name==='phone'&&Math.abs((metrics.footerTop??0)-(metrics.shellRect?.bottom??0))>16) throw new Error(name+': dead vertical gap remains before footer '+JSON.stringify(metrics));
  if(name==='desktop'&&(metrics.stageRect?.w??0)<viewport.width*.58) throw new Error(name+': creation stage still trapped in legacy left column '+JSON.stringify(metrics));
  console.log(name+': PASS '+JSON.stringify(metrics));
}
await browser.close();
console.log('AILatheo GripCube render/contact PASS — 2/2');