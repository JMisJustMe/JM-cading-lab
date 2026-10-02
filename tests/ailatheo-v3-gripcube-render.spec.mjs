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

  const second=page.locator('.sceneBody').nth(1);
  const formBefore=await page.evaluate(()=>document.querySelectorAll('.sceneBody')[1]?._body?.rotate??null);
  await second.click();
  const formAfter=await page.evaluate(()=>document.querySelectorAll('.sceneBody')[1]?._body?.rotate??null);
  if(formAfter!==formBefore) throw new Error(name+': FORM body tap executed action instead of selecting/manipulating');

  const gripBefore=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate}});
  await page.evaluate(()=>{
    const scene=document.querySelector('#scene'),body=document.querySelectorAll('.sceneBody')[1];
    const send=(target,type,id,x,y)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
    send(body,'pointerdown',41,120,120);
    send(scene,'pointerdown',42,220,120);
    send(scene,'pointermove',42,280,180);
    send(scene,'pointerup',42,280,180);
    send(body,'pointerup',41,120,120);
  });
  const gripAfter=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate,selected:document.querySelectorAll('.sceneBody')[1]?.classList.contains('selected'),badge:document.querySelectorAll('.sceneBody')[1]?.dataset.gcwContact||null,ding:document.querySelector('#ding')?.textContent}});
  if(!gripAfter?.selected||gripAfter.size<=gripBefore.size||gripAfter.rotate===gripBefore.rotate||gripAfter.ding!=='GRIP DING') throw new Error(name+': two-finger grip did not resize/twist selected body '+JSON.stringify({gripBefore,gripAfter}));

  await page.evaluate(()=>{
    const scene=document.querySelector('#scene'),body=document.querySelectorAll('.sceneBody')[1];
    const send=(target,type,id,x,y)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:y,buttons:1}));
    send(body,'pointerdown',51,130,130);send(scene,'pointerdown',52,230,130);
  });
  await page.locator('.gcw-lens[data-face="use"]').click();
  const cancelled=await page.evaluate(()=>({multi:!!document.querySelector('#scene')._gcwMultiTransform,suppressed:!!document.querySelectorAll('.sceneBody')[1]?._gcwGestureSuppressed}));
  if(cancelled.multi||cancelled.suppressed) throw new Error(name+': face change did not release active two-finger grip '+JSON.stringify(cancelled));
  await second.click();
  const useAfter=await page.evaluate(()=>document.querySelectorAll('.sceneBody')[1]?._body?.rotate??null);
  if(useAfter===formAfter) throw new Error(name+': USE body tap did not execute selected body action');

  await page.locator('.gcw-lens[data-face="route"]').click();
  await page.locator('.sceneBody').nth(0).click();
  await page.locator('.sceneBody').nth(1).click();

  const metrics=await page.evaluate(()=>({
    proof:window.JMAILatheoGripUI.proof(),
    viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},
    appRect:(()=>{const e=document.querySelector('.app'),r=e?.getBoundingClientRect(),s=e&&getComputedStyle(e);return r&&{top:r.top,bottom:r.bottom,w:r.width,h:r.height,cssHeight:s.height,minHeight:s.minHeight,display:s.display,rows:s.gridTemplateRows}})(),
    worldRect:(()=>{const e=document.querySelector('.world'),r=e?.getBoundingClientRect(),s=e&&getComputedStyle(e);return r&&{top:r.top,bottom:r.bottom,w:r.width,h:r.height,cssHeight:s.height,minHeight:s.minHeight,display:s.display,rows:s.gridTemplateRows,alignSelf:s.alignSelf}})(),
    bodyRect:(()=>{const r=document.body.getBoundingClientRect(),s=getComputedStyle(document.body);return {top:r.top,bottom:r.bottom,w:r.width,h:r.height,cssHeight:s.height,minHeight:s.minHeight}})(),
    htmlRect:(()=>{const r=document.documentElement.getBoundingClientRect(),s=getComputedStyle(document.documentElement);return {top:r.top,bottom:r.bottom,w:r.width,h:r.height,cssHeight:s.height,minHeight:s.minHeight}})(),
    viewportOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    bodyCount:document.querySelectorAll('.sceneBody').length,
    linkCount:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]')).length,
    contactLens:document.querySelector('#scene')?.dataset.gcwLens,
    quickActText:document.querySelector('.gcw-quick [data-q="act"]')?.textContent,
    contactBadge:document.querySelector('.sceneBody.selected')?.dataset.gcwContact||null,
    routeSourceCount:document.querySelectorAll('.sceneBody.route-source').length,
    cube:!!document.querySelector('#gcwCubeDock'),
    visibleFace:document.querySelector('.gcw-face.active')?.dataset.face,
    stageRect:(()=>{const r=document.querySelector('.gcw-stageZone')?.getBoundingClientRect();return r&&{w:r.width,h:r.height}})(),
    faceRect:(()=>{const r=document.querySelector('.gcw-faceZone')?.getBoundingClientRect();return r&&{w:r.width,h:r.height}})(),
    shellRect:(()=>{const r=document.querySelector('.gcw-shell')?.getBoundingClientRect();return r&&{left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height}})(),
    footerTop:document.querySelector('.status')?.getBoundingClientRect().top,
    lensFits:(()=>{const e=document.querySelector('.gcw-lenses');return e?e.scrollWidth<=e.clientWidth+2:false})(),
    appRowCount:(()=>{const s=getComputedStyle(document.querySelector('.app')).gridTemplateRows.trim();return s?s.split(/\s+/).length:0})(),
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
  if(!metrics.proof.stageContactGrammar||!metrics.proof.contextualQuick||!metrics.proof.directRouteContact||!metrics.proof.earnedDepth||!metrics.proof.multiTouchGrip||!metrics.proof.onBodyContactBadge) throw new Error(name+': owner-contact proof mismatch '+JSON.stringify(metrics));
  if(metrics.contactLens!=='route'||metrics.proof.contactLens!=='route') throw new Error(name+': semantic stage lens did not follow face '+JSON.stringify(metrics));
  if(metrics.linkCount<1) throw new Error(name+': ROUTE body-to-body contact did not create relationship '+JSON.stringify(metrics));
  if(metrics.routeSourceCount!==0) throw new Error(name+': route source affordance did not clear after completed link '+JSON.stringify(metrics));
  if(metrics.quickActText!=='SPIN') throw new Error(name+': contextual ACT did not follow selected body action '+JSON.stringify(metrics));
  if(!metrics.contactBadge) throw new Error(name+': selected body lost its on-body contact affordance '+JSON.stringify(metrics));
  if(metrics.starterVisible) throw new Error(name+': starter teaching body still competes with created bodies '+JSON.stringify(metrics));
  if(!metrics.lensFits) throw new Error(name+': six semantic lenses do not fit the face rail '+JSON.stringify(metrics));
  if(metrics.appRowCount!==3) throw new Error(name+': GripCube app is not three visible rows '+JSON.stringify(metrics));
  if(name==='phone'&&(metrics.stageRect?.h??0)<300) throw new Error(name+': creation stage collapsed below 300px '+JSON.stringify(metrics));
  if(name==='phone'&&(metrics.shellRect?.h??0)<viewport.height*.62) throw new Error(name+': GripCube shell no longer owns the available phone height '+JSON.stringify(metrics));
  if(name==='phone'&&Math.abs((metrics.footerTop??0)-(metrics.shellRect?.bottom??0))>16) throw new Error(name+': dead vertical gap remains before footer '+JSON.stringify(metrics));
  if(name==='desktop'&&(metrics.stageRect?.w??0)<viewport.width*.58) throw new Error(name+': creation stage still trapped in legacy left column '+JSON.stringify(metrics));
  console.log(name+': PASS '+JSON.stringify(metrics));
}
await browser.close();
console.log('AILatheo GripCube multitouch render PASS — 2/2');