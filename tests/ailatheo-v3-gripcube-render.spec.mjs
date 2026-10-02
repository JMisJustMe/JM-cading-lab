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

  await page.locator('.gcw-lens[data-face="form"]').click();
  await page.locator('.sceneBody').nth(0).click();
  const sourceName=await page.evaluate(()=>document.querySelector('.sceneBody.selected')?._body?.name||null);
  await page.locator('.gcw-lens[data-face="route"]').click();
  const carried=await page.evaluate(()=>({
    sourceCount:document.querySelectorAll('.sceneBody.route-source').length,
    sourceName:document.querySelector('.sceneBody.route-source')?._body?.name||null,
    tetherCount:document.querySelectorAll('#gcwRoutePreview .gcw-routeTether').length,
    from:document.querySelector('#fromBody')?.value
  }));
  if(carried.sourceCount!==1||carried.sourceName!==sourceName||carried.tetherCount!==1||carried.from!=='0') throw new Error(name+': selected FORM body did not carry into ROUTE as live cause '+JSON.stringify({sourceName,carried}));
  await page.evaluate(()=>{
    const scene=document.querySelector('#scene'),r=scene.getBoundingClientRect();
    scene.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+r.width*.72,clientY:r.top+r.height*.36,pointerId:77,pointerType:'mouse'}));
  });
  const tetherMoved=await page.evaluate(()=>{
    const line=document.querySelector('#gcwRoutePreview .gcw-routeTether');
    return line&&{x1:line.getAttribute('x1'),y1:line.getAttribute('y1'),x2:line.getAttribute('x2'),y2:line.getAttribute('y2')};
  });
  if(!tetherMoved||tetherMoved.x1===tetherMoved.x2&&tetherMoved.y1===tetherMoved.y2) throw new Error(name+': ROUTE tether did not follow contact '+JSON.stringify(tetherMoved));
  await page.locator('.sceneBody').nth(1).click();
  const routeDone=await page.evaluate(()=>({
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null,
    routeSourceCount:document.querySelectorAll('.sceneBody.route-source').length,
    tetherCount:document.querySelectorAll('#gcwRoutePreview .gcw-routeTether').length,
    links:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]')).length
  }));
  if(routeDone.selected!=='Grip Body'||routeDone.routeSourceCount!==0||routeDone.tetherCount!==0||routeDone.links<1) throw new Error(name+': ROUTE target did not inherit hand contact after link '+JSON.stringify(routeDone));

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
    routeTetherCount:document.querySelectorAll('#gcwRoutePreview .gcw-routeTether').length,
    selectedBody:document.querySelector('.sceneBody.selected')?._body?.name||null,
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
  if(!metrics.proof.stageContactGrammar||!metrics.proof.contextualQuick||!metrics.proof.directRouteContact||!metrics.proof.earnedDepth||!metrics.proof.multiTouchGrip||!metrics.proof.onBodyContactBadge||!metrics.proof.selectionCarriesIntoRoute||!metrics.proof.liveRouteTether||!metrics.proof.routeTargetKeepsSelection||!metrics.proof.dingBoundRecovery||!metrics.proof.recoveryPersistsRestoredState||!metrics.proof.selectionSurvivesUndo||!metrics.proof.fieldPrecisionHalo||!metrics.proof.fieldPrecisionUndo||!metrics.proof.fieldPrecisionMaterialDing||!metrics.proof.traceShallowContext||!metrics.proof.proofShallowContext||!metrics.proof.traceDepthEarned||!metrics.proof.proofDepthEarned||!metrics.proof.inspectionCreatesNoDing) throw new Error(name+': owner-contact proof mismatch '+JSON.stringify(metrics));
  if(metrics.contactLens!=='route'||metrics.proof.contactLens!=='route') throw new Error(name+': semantic stage lens did not follow face '+JSON.stringify(metrics));
  if(metrics.linkCount<1) throw new Error(name+': ROUTE body-to-body contact did not create relationship '+JSON.stringify(metrics));
  if(metrics.routeSourceCount!==0||metrics.routeTetherCount!==0) throw new Error(name+': route source/tether affordance did not clear after completed link '+JSON.stringify(metrics));
  if(metrics.selectedBody!=='Grip Body') throw new Error(name+': route target did not remain selected after link '+JSON.stringify(metrics));
  if(metrics.quickActText!=='SPIN') throw new Error(name+': contextual ACT did not follow selected body action '+JSON.stringify(metrics));
  if(!metrics.contactBadge) throw new Error(name+': selected body lost its on-body contact affordance '+JSON.stringify(metrics));
  if(metrics.starterVisible) throw new Error(name+': starter teaching body still competes with created bodies '+JSON.stringify(metrics));
  if(!metrics.lensFits) throw new Error(name+': six semantic lenses do not fit the face rail '+JSON.stringify(metrics));
  if(metrics.appRowCount!==3) throw new Error(name+': GripCube app is not three visible rows '+JSON.stringify(metrics));
  if(name==='phone'&&(metrics.stageRect?.h??0)<300) throw new Error(name+': creation stage collapsed below 300px '+JSON.stringify(metrics));
  if(name==='phone'&&(metrics.shellRect?.h??0)<viewport.height*.62) throw new Error(name+': GripCube shell no longer owns the available phone height '+JSON.stringify(metrics));
  if(name==='phone'&&Math.abs((metrics.footerTop??0)-(metrics.shellRect?.bottom??0))>16) throw new Error(name+': dead vertical gap remains before footer '+JSON.stringify(metrics));
  if(name==='desktop'&&(metrics.stageRect?.w??0)<viewport.width*.58) throw new Error(name+': creation stage still trapped in legacy left column '+JSON.stringify(metrics));

  await page.locator('.gcw-lens[data-face="field"]').click();
  const precisionBefore=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;const h=document.querySelector('#gcwFieldHalo');return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,haloVisible:h&&!h.hidden,selected:document.querySelectorAll('.sceneBody')[1]?.classList.contains('selected')}});
  if(!precisionBefore?.haloVisible||!precisionBefore.selected) throw new Error(name+': FIELD precision halo did not follow selected body '+JSON.stringify(precisionBefore));
  await page.locator('#gcwFieldHalo [data-field="right"]').click();
  await page.locator('#gcwFieldHalo [data-field="larger"]').click();
  await page.locator('#gcwFieldHalo [data-field="rotateRight"]').click();
  const precisionAfter=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact(),persisted:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')||'[]'))[1]}});
  if(precisionAfter.x!==precisionBefore.x+1||precisionAfter.size!==precisionBefore.size+2||precisionAfter.rotate!==precisionBefore.rotate+1||precisionAfter.event?.kind!=='FIELD DING'||precisionAfter.event?.body!=='Grip Body') throw new Error(name+': FIELD precision controls did not apply exact steps '+JSON.stringify({precisionBefore,precisionAfter}));
  if(Math.round(precisionAfter.persisted?.x)!==Math.round(precisionAfter.x)||Math.round(precisionAfter.persisted?.size)!==Math.round(precisionAfter.size)||Math.round(precisionAfter.persisted?.rotate)!==Math.round(precisionAfter.rotate)) throw new Error(name+': FIELD precision did not persist live body state '+JSON.stringify(precisionAfter));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const precisionUndo=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact(),haloVisible:!document.querySelector('#gcwFieldHalo')?.hidden,selected:document.querySelectorAll('.sceneBody')[1]?.classList.contains('selected')}});
  if(precisionUndo.rotate!==precisionBefore.rotate||precisionUndo.size!==precisionBefore.size+2||precisionUndo.x!==precisionBefore.x+1||precisionUndo.event?.kind!=='RECOVERY DING'||!precisionUndo.haloVisible||!precisionUndo.selected) throw new Error(name+': FIELD precision undo did not recover last exact precision step '+JSON.stringify({precisionBefore,precisionAfter,precisionUndo}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const precisionUndo2=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(precisionUndo2.size!==precisionBefore.size||precisionUndo2.x!==precisionBefore.x+1||precisionUndo2.event?.kind!=='RECOVERY DING') throw new Error(name+': FIELD second undo did not recover size step '+JSON.stringify({precisionBefore,precisionUndo2}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const precisionUndo3=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(precisionUndo3.x!==precisionBefore.x||precisionUndo3.size!==precisionBefore.size||precisionUndo3.rotate!==precisionBefore.rotate||precisionUndo3.event?.kind!=='RECOVERY DING') throw new Error(name+': FIELD third undo did not recover position step '+JSON.stringify({precisionBefore,precisionUndo3}));

  await page.locator('.gcw-lens[data-face="use"]').click();
  await page.locator('.sceneBody').nth(1).click();
  const directEvent=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact());
  if(!directEvent||directEvent.kind!=='BODY DING'||directEvent.body!=='Grip Body'||directEvent.action!=='Spin') throw new Error(name+': USE did not publish latest material body Ding '+JSON.stringify(directEvent));

  await page.locator('.gcw-lens[data-face="trace"]').click();
  const traceFocus=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    text:document.querySelector('#gcwTraceDingFocus')?.textContent||'',
    live:document.querySelector('#gcwTraceDingFocus')?.dataset.live,
    context:document.querySelector('#gcwTraceContext')?.textContent||'',
    depthOpen:!!document.querySelector('#gcwTraceDepth')?.open
  }));
  if(traceFocus.event?.id!==directEvent.id||traceFocus.live!=='true'||!traceFocus.text.includes('BODY DING')||!traceFocus.text.includes('Grip Body')||!traceFocus.context.includes('Grip Body')||traceFocus.depthOpen) throw new Error(name+': TRACE shallow contact/depth mismatch '+JSON.stringify(traceFocus));

  await page.locator('#gcwTraceDepth > summary').click();
  const traceDepthOpened=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    open:!!document.querySelector('#gcwTraceDepth')?.open,
    routeInside:!!document.querySelector('#gcwTraceDepth #route'),
    tabsInside:!!document.querySelector('#gcwTraceDepth .tabs')
  }));
  if(!traceDepthOpened.open||!traceDepthOpened.routeInside||!traceDepthOpened.tabsInside||traceDepthOpened.event?.id!==directEvent.id) throw new Error(name+': opening TRACE depth changed event or lost deep carriers '+JSON.stringify(traceDepthOpened));

  await page.locator('.gcw-lens[data-face="proof"]').click();
  const proofFocus=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    text:document.querySelector('#gcwProofDingFocus')?.textContent||'',
    live:document.querySelector('#gcwProofDingFocus')?.dataset.live,
    context:document.querySelector('#gcwProofContext')?.textContent||'',
    depthOpen:!!document.querySelector('.gcw-face[data-face="proof"] .advanced')?.open
  }));
  if(proofFocus.event?.id!==directEvent.id||proofFocus.live!=='true'||!proofFocus.text.includes('BODY DING')||proofFocus.text!==traceFocus.text||!proofFocus.context.includes('Grip Body')||proofFocus.depthOpen) throw new Error(name+': PROOF shallow contact/depth mismatch '+JSON.stringify({traceFocus,proofFocus}));

  await page.locator('.gcw-face[data-face="proof"] .advanced > summary').click();
  const proofDepthOpened=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    open:!!document.querySelector('.gcw-face[data-face="proof"] .advanced')?.open
  }));
  if(!proofDepthOpened.open||proofDepthOpened.event?.id!==directEvent.id) throw new Error(name+': opening PROOF depth manufactured evidence or failed to open '+JSON.stringify(proofDepthOpened));

  const beforeCausalContact=await page.evaluate(()=>({
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({name:x._body?.name,on:!!x._body?.on,size:Math.round(x._body?.size||0),rotate:Math.round(x._body?.rotate||0)})),
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length
  }));
  await page.locator('.gcw-lens[data-face="use"]').click();
  await page.locator('.sceneBody').nth(0).click();
  const causeEvent=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact());
  if(!causeEvent||causeEvent.id<=directEvent.id||causeEvent.kind!=='CAUSE DING'||causeEvent.body!=='Grip Body'||!causeEvent.detail.includes('--touch-->')||!causeEvent.recoveryRevision) throw new Error(name+': linked USE contact did not replace pointer with recoverable causal Ding '+JSON.stringify(causeEvent));

  await page.locator('.gcw-lens[data-face="trace"]').click();
  const causeTrace=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwTraceDingFocus')?.textContent||''}));
  await page.locator('.gcw-lens[data-face="proof"]').click();
  const causeProof=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwProofDingFocus')?.textContent||''}));
  if(causeTrace.event?.id!==causeEvent.id||causeProof.event?.id!==causeEvent.id||causeTrace.text!==causeProof.text||!causeTrace.text.includes('CAUSE DING')) throw new Error(name+': TRACE/PROOF did not converge on same causal material Ding '+JSON.stringify({causeEvent,causeTrace,causeProof}));
  const persistedMaterialEvent=await page.evaluate(()=>localStorage.getItem('jm.ailatheo.v3.materialContact'));
  if(persistedMaterialEvent!==null) throw new Error(name+': material event pointer was persisted; it must remain ephemeral');

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const recovery=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({name:x._body?.name,on:!!x._body?.on,size:Math.round(x._body?.size||0),rotate:Math.round(x._body?.rotate||0)})),
    persistedBodies:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')||'[]')).map(x=>({name:x.name,on:!!x.on,size:Math.round(x.size||0),rotate:Math.round(x.rotate||0)})),
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length,
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null,
    ding:document.querySelector('#ding')?.textContent
  }));
  if(recovery.event?.kind!=='RECOVERY DING'||recovery.event?.recoveredEventId!==causeEvent.id||recovery.event?.action!=='UNDO') throw new Error(name+': UNDO did not bind recovery to latest causal Ding '+JSON.stringify({causeEvent,recovery}));
  if(JSON.stringify(recovery.bodies)!==JSON.stringify(beforeCausalContact.bodies)) throw new Error(name+': UNDO did not restore exact pre-contact body state '+JSON.stringify({beforeCausalContact,recovery}));
  if(JSON.stringify(recovery.persistedBodies)!==JSON.stringify(beforeCausalContact.bodies)) throw new Error(name+': recovered body state was not persisted '+JSON.stringify({beforeCausalContact,recovery}));
  if(recovery.links!==beforeCausalContact.links) throw new Error(name+': UNDO damaged relationship state '+JSON.stringify({beforeCausalContact,recovery}));
  if(recovery.selected!==sourceName||recovery.ding!=='RECOVERY DING') throw new Error(name+': UNDO did not preserve hand contact on recovered source '+JSON.stringify({sourceName,recovery}));

  await page.locator('.gcw-lens[data-face="trace"]').click();
  const recoveryTrace=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwTraceDingFocus')?.textContent||''}));
  await page.locator('.gcw-lens[data-face="proof"]').click();
  const recoveryProof=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwProofDingFocus')?.textContent||''}));
  if(recoveryTrace.event?.id!==recovery.event.id||recoveryProof.event?.id!==recovery.event.id||recoveryTrace.text!==recoveryProof.text||!recoveryTrace.text.includes('RECOVERY DING')) throw new Error(name+': recovered Ding did not carry into TRACE/PROOF '+JSON.stringify({recovery,recoveryTrace,recoveryProof}));

  console.log(name+': PASS '+JSON.stringify({...metrics,materialEventId:recovery.event.id,materialEventKind:recovery.event.kind,recoveredEventId:recovery.event.recoveredEventId}));
}
await browser.close();
console.log('AILatheo GripCube earned-depth render PASS — 2/2');