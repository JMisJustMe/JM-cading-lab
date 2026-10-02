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
  const createEvent=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact());
  if(createEvent?.kind!=='OBJECT DING'||createEvent?.body!=='Grip Body'||createEvent?.action!=='CREATE'||!createEvent?.recoveryRevision) throw new Error(name+': created body did not publish recoverable OBJECT DING '+JSON.stringify(createEvent));

  await second.click();
  await page.evaluate(()=>document.querySelector('#duplicateObject')?.click());
  const duplicateProof=await page.evaluate(()=>({count:document.querySelectorAll('.sceneBody').length,event:window.JMAILatheoGripUI.latestMaterialContact(),selected:document.querySelector('.sceneBody.selected')?._body?.name||null}));
  if(duplicateProof.count!==3||duplicateProof.event?.kind!=='DUPLICATE DING'||duplicateProof.event?.action!=='DUPLICATE'||!duplicateProof.event?.recoveryRevision||duplicateProof.selected!=='Grip Body Copy') throw new Error(name+': duplicate did not publish recoverable structural Ding '+JSON.stringify(duplicateProof));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const duplicateUndo=await page.evaluate(()=>({count:document.querySelectorAll('.sceneBody').length,event:window.JMAILatheoGripUI.latestMaterialContact(),selected:document.querySelector('.sceneBody.selected')?._body?.name||null}));
  if(duplicateUndo.count!==2||duplicateUndo.event?.kind!=='RECOVERY DING'||duplicateUndo.event?.recoveredEventId!==duplicateProof.event.id||duplicateUndo.selected!=='Grip Body') throw new Error(name+': duplicate structural recovery failed '+JSON.stringify({duplicateProof,duplicateUndo}));

  await page.evaluate(()=>document.querySelector('#deleteObject')?.click());
  const deleteProof=await page.evaluate(()=>({count:document.querySelectorAll('.sceneBody').length,event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(deleteProof.count!==1||deleteProof.event?.kind!=='DELETE DING'||deleteProof.event?.body!=='Grip Body'||deleteProof.event?.action!=='DELETE'||!deleteProof.event?.recoveryRevision) throw new Error(name+': delete did not publish recoverable structural Ding '+JSON.stringify(deleteProof));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const deleteUndo=await page.evaluate(()=>({count:document.querySelectorAll('.sceneBody').length,event:window.JMAILatheoGripUI.latestMaterialContact(),selected:document.querySelector('.sceneBody.selected')?._body?.name||null}));
  if(deleteUndo.count!==2||deleteUndo.event?.kind!=='RECOVERY DING'||deleteUndo.event?.recoveredEventId!==deleteProof.event.id||deleteUndo.selected!=='Grip Body') throw new Error(name+': delete structural recovery failed '+JSON.stringify({deleteProof,deleteUndo}));

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
  const gripAfter=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate,selected:document.querySelectorAll('.sceneBody')[1]?.classList.contains('selected'),badge:document.querySelectorAll('.sceneBody')[1]?.dataset.gcwContact||null,ding:document.querySelector('#ding')?.textContent,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(!gripAfter?.selected||gripAfter.size<=gripBefore.size||gripAfter.rotate===gripBefore.rotate||gripAfter.ding!=='GRIP DING'||gripAfter.event?.kind!=='GRIP DING'||!gripAfter.event?.recoveryRevision) throw new Error(name+': two-finger grip did not enter material recovery chain '+JSON.stringify({gripBefore,gripAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const gripRecovered=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact(),selected:document.querySelectorAll('.sceneBody')[1]?.classList.contains('selected')}});
  if(gripRecovered.size!==gripBefore.size||gripRecovered.rotate!==gripBefore.rotate||gripRecovered.event?.kind!=='RECOVERY DING'||gripRecovered.event?.recoveredEventId!==gripAfter.event.id||!gripRecovered.selected) throw new Error(name+': GRIP exact recovery failed '+JSON.stringify({gripBefore,gripAfter,gripRecovered}));

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
  await page.locator('.sceneBody').nth(1).click();

  const semanticBaseline=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    source:document.querySelector('#source')?.value||'',
    quick:document.querySelector('.gcw-quick [data-q="act"]')?.textContent||''
  }));
  await page.locator('#objectName').focus();
  await page.evaluate(()=>{
    const input=document.querySelector('#objectName');
    for(const value of ['Grip','Grip Body X','Grip Body Prime']){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}
  });
  const semanticLive=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,
    name:document.querySelectorAll('.sceneBody')[1]?._body?.name,
    source:document.querySelector('#source')?.value||'',
    persisted:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')||'[]'))[1]?.name
  }));
  if(semanticLive.event!==semanticBaseline.event||semanticLive.name!=='Grip Body Prime'||semanticLive.persisted!=='Grip Body Prime'||!semanticLive.source.startsWith('Grip Body Prime :')) throw new Error(name+': live FORM name edit did not stay Ding-silent while source/body stayed synced '+JSON.stringify({semanticBaseline,semanticLive}));
  await page.locator('#objectName').blur();
  const semanticCommit=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    name:document.querySelectorAll('.sceneBody')[1]?._body?.name,
    aria:document.querySelectorAll('.sceneBody')[1]?.getAttribute('aria-label')||''
  }));
  if(semanticCommit.event?.id!==semanticBaseline.event+1||semanticCommit.event?.kind!=='FORM DING'||semanticCommit.event?.body!=='Grip Body Prime'||!semanticCommit.event?.delta.includes('name Grip Body→Grip Body Prime')||!semanticCommit.event?.recoveryRevision||semanticCommit.aria!=='Grip Body Prime creation body') throw new Error(name+': committed FORM name edit did not produce one recoverable semantic Ding '+JSON.stringify({semanticBaseline,semanticCommit}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const semanticUndo=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    source:document.querySelector('#source')?.value||'',
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null
  }));
  if(semanticUndo.body.name!==semanticBaseline.body.name||semanticUndo.source!==semanticBaseline.source||semanticUndo.selected!==semanticBaseline.body.name||semanticUndo.event?.kind!=='RECOVERY DING'||semanticUndo.event?.recoveredEventId!==semanticCommit.event.id) throw new Error(name+': FORM semantic undo did not restore exact name/source contact '+JSON.stringify({semanticBaseline,semanticCommit,semanticUndo}));

  await page.locator('.sceneBody').nth(1).click();
  const actionBefore=await page.evaluate(()=>({action:document.querySelectorAll('.sceneBody')[1]?._body?.action,quick:document.querySelector('.gcw-quick [data-q="act"]')?.textContent,event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0}));
  await page.locator('#action').selectOption('Grow');
  const actionAfter=await page.evaluate(()=>({action:document.querySelectorAll('.sceneBody')[1]?._body?.action,quick:document.querySelector('.gcw-quick [data-q="act"]')?.textContent,event:window.JMAILatheoGripUI.latestMaterialContact(),source:document.querySelector('#source')?.value||''}));
  if(actionAfter.action!=='Grow'||actionAfter.quick!=='GROW'||actionAfter.event?.kind!=='FORM DING'||actionAfter.event?.id!==actionBefore.event+1||!actionAfter.event?.delta.includes('action Spin→Grow')||!actionAfter.source.endsWith(':: Grow')) throw new Error(name+': FORM action edit did not keep body/source/context contact aligned '+JSON.stringify({actionBefore,actionAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const actionUndo=await page.evaluate(()=>({action:document.querySelectorAll('.sceneBody')[1]?._body?.action,quick:document.querySelector('.gcw-quick [data-q="act"]')?.textContent,event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(actionUndo.action!=='Spin'||actionUndo.quick!=='SPIN'||actionUndo.event?.recoveredEventId!==actionAfter.event.id) throw new Error(name+': FORM action recovery failed '+JSON.stringify({actionAfter,actionUndo}));

  await page.locator('.sceneBody').nth(1).click();
  const codeBefore=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    source:document.querySelector('#source')?.value||'',
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0
  }));
  const codeCommand='Grip Coded : object [#ff00aa] <circle> :: Grow';
  await page.evaluate(v=>{document.querySelector('#source').value=v;document.querySelector('#runCode').click()},codeCommand);
  const codeAfter=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    source:document.querySelector('#source')?.value||'',
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    quick:document.querySelector('.gcw-quick [data-q="act"]')?.textContent||''
  }));
  if(codeAfter.body.name!=='Grip Coded'||codeAfter.body.action!=='Grow'||codeAfter.body.size!==codeBefore.body.size+18||codeAfter.source!==codeCommand||codeAfter.quick!=='GROW'||codeAfter.event?.kind!=='CODE DING'||codeAfter.event?.id!==codeBefore.event+1||!codeAfter.event?.recoveryRevision||!codeAfter.event?.delta.includes('name Grip Body→Grip Coded')||!codeAfter.event?.delta.includes('action Spin→Grow')||!codeAfter.event?.delta.includes('size '+codeBefore.body.size+'→'+codeAfter.body.size)) throw new Error(name+': selected-body CODE run was not one semantic+consequence transaction '+JSON.stringify({codeBefore,codeAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const codeUndo=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    source:document.querySelector('#source')?.value||'',
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null,
    quick:document.querySelector('.gcw-quick [data-q="act"]')?.textContent||''
  }));
  if(codeUndo.body.name!==codeBefore.body.name||codeUndo.body.action!==codeBefore.body.action||codeUndo.body.size!==codeBefore.body.size||codeUndo.source!==codeBefore.body.source||codeUndo.selected!=='Grip Body'||codeUndo.quick!=='SPIN'||codeUndo.event?.kind!=='RECOVERY DING'||codeUndo.event?.recoveredEventId!==codeAfter.event.id) throw new Error(name+': CODE undo did not restore whole pre-run body/source state '+JSON.stringify({codeBefore,codeAfter,codeUndo}));

  const invalidBefore=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,body:{...document.querySelectorAll('.sceneBody')[1]?._body}}));
  await page.evaluate(()=>{document.querySelector('#source').value='this is not AILatheo source';document.querySelector('#runCode').click()});
  const invalidAfter=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,body:{...document.querySelectorAll('.sceneBody')[1]?._body},ding:document.querySelector('#ding')?.textContent}));
  if(invalidAfter.event!==invalidBefore.event||JSON.stringify(invalidAfter.body)!==JSON.stringify(invalidBefore.body)||invalidAfter.ding!=='SOFT RESIST') throw new Error(name+': invalid CODE input minted event/revision or changed body '+JSON.stringify({invalidBefore,invalidAfter}));
  await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;if(b)document.querySelector('#source').value=b.source});

  const dragBefore=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate}});
  await page.evaluate(()=>{
    const scene=document.querySelector('#scene'),body=document.querySelectorAll('.sceneBody')[1],r=scene.getBoundingClientRect();
    const x=r.left+r.width*body._body.x/100,y=r.top+r.height*body._body.y/100;
    const send=(type,cx,cy)=>body.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,pointerType:'mouse',button:0,buttons:type==='pointerup'?0:1,clientX:cx,clientY:cy}));
    send('pointerdown',x,y);send('pointermove',x+r.width*.04,y+r.height*.03);send('pointerup',x+r.width*.04,y+r.height*.03);
  });
  const dragAfter=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(dragAfter.x===dragBefore.x&&dragAfter.y===dragBefore.y||dragAfter.event?.kind!=='MOVE DING'||!dragAfter.event?.recoveryRevision) throw new Error(name+': FORM drag did not publish recoverable MOVE DING '+JSON.stringify({dragBefore,dragAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const dragRecovered=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(dragRecovered.x!==dragBefore.x||dragRecovered.y!==dragBefore.y||dragRecovered.event?.kind!=='RECOVERY DING'||dragRecovered.event?.recoveredEventId!==dragAfter.event.id) throw new Error(name+': FORM drag recovery failed '+JSON.stringify({dragBefore,dragAfter,dragRecovered}));

  await page.locator('.sceneBody').nth(1).click();
  const noChangeEvent=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  await page.evaluate(()=>{
    const h=document.querySelector('#resizeHandle'),r=h.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:92,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y}));
    h.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:92,pointerType:'mouse',button:0,buttons:0,clientX:x,clientY:y}));
  });
  const noChangeAfter=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  if(noChangeAfter!==noChangeEvent) throw new Error(name+': unchanged transform handle minted false material Ding '+JSON.stringify({noChangeEvent,noChangeAfter}));

  const resizeBefore=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate}});
  await page.evaluate(()=>{
    const scene=document.querySelector('#scene'),h=document.querySelector('#resizeHandle'),b=document.querySelectorAll('.sceneBody')[1]._body,r=scene.getBoundingClientRect();
    const cx=r.left+r.width*b.x/100,cy=r.top+r.height*b.y/100;
    h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:93,pointerType:'mouse',button:0,buttons:1,clientX:cx+40,clientY:cy+40}));
    h.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:93,pointerType:'mouse',button:0,buttons:1,clientX:cx+95,clientY:cy+95}));
    h.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:93,pointerType:'mouse',button:0,buttons:0,clientX:cx+95,clientY:cy+95}));
  });
  const resizeAfter=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(resizeAfter.size===resizeBefore.size||resizeAfter.event?.kind!=='RESIZE DING'||!resizeAfter.event?.recoveryRevision) throw new Error(name+': resize handle did not publish recoverable material Ding '+JSON.stringify({resizeBefore,resizeAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const resizeRecovered=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(resizeRecovered.size!==resizeBefore.size||resizeRecovered.rotate!==resizeBefore.rotate||resizeRecovered.event?.recoveredEventId!==resizeAfter.event.id) throw new Error(name+': resize handle recovery failed '+JSON.stringify({resizeBefore,resizeAfter,resizeRecovered}));

  await page.locator('.sceneBody').nth(1).click();
  const rotateBefore=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,y:b.y,size:b.size,rotate:b.rotate}});
  await page.evaluate(()=>{
    const scene=document.querySelector('#scene'),h=document.querySelector('#rotateHandle'),b=document.querySelectorAll('.sceneBody')[1]._body,r=scene.getBoundingClientRect();
    const cx=r.left+r.width*b.x/100,cy=r.top+r.height*b.y/100;
    h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:94,pointerType:'mouse',button:0,buttons:1,clientX:cx,clientY:cy-80}));
    h.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:94,pointerType:'mouse',button:0,buttons:1,clientX:cx+100,clientY:cy}));
    h.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:94,pointerType:'mouse',button:0,buttons:0,clientX:cx+100,clientY:cy}));
  });
  const rotateAfter=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(rotateAfter.rotate===rotateBefore.rotate||rotateAfter.event?.kind!=='ROTATE DING'||!rotateAfter.event?.recoveryRevision) throw new Error(name+': rotate handle did not publish recoverable material Ding '+JSON.stringify({rotateBefore,rotateAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const rotateRecovered=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(rotateRecovered.rotate!==rotateBefore.rotate||rotateRecovered.size!==rotateBefore.size||rotateRecovered.event?.recoveredEventId!==rotateAfter.event.id) throw new Error(name+': rotate handle recovery failed '+JSON.stringify({rotateBefore,rotateAfter,rotateRecovered}));

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
    links:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]')).length,
    event:window.JMAILatheoGripUI.latestMaterialContact()
  }));
  if(routeDone.selected!=='Grip Body'||routeDone.routeSourceCount!==0||routeDone.tetherCount!==0||routeDone.links<1||routeDone.event?.kind!=='LINK DING'||routeDone.event?.action!=='LINK'||!routeDone.event?.recoveryRevision) throw new Error(name+': ROUTE target did not publish recoverable LINK DING '+JSON.stringify(routeDone));

  await page.evaluate(()=>document.querySelector('#removeLink')?.click());
  const unlinkProof=await page.evaluate(()=>({links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length,event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(unlinkProof.links!==routeDone.links-1||unlinkProof.event?.kind!=='UNLINK DING'||unlinkProof.event?.action!=='UNLINK'||!unlinkProof.event?.recoveryRevision) throw new Error(name+': unlink did not publish recoverable structural Ding '+JSON.stringify({routeDone,unlinkProof}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const unlinkUndo=await page.evaluate(()=>({links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length,event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(unlinkUndo.links!==routeDone.links||unlinkUndo.event?.kind!=='RECOVERY DING'||unlinkUndo.event?.recoveredEventId!==unlinkProof.event.id) throw new Error(name+': unlink structural recovery failed '+JSON.stringify({routeDone,unlinkProof,unlinkUndo}));

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
  if(!metrics.proof.stageContactGrammar||!metrics.proof.contextualQuick||!metrics.proof.directRouteContact||!metrics.proof.earnedDepth||!metrics.proof.multiTouchGrip||!metrics.proof.onBodyContactBadge||!metrics.proof.selectionCarriesIntoRoute||!metrics.proof.liveRouteTether||!metrics.proof.routeTargetKeepsSelection||!metrics.proof.dingBoundRecovery||!metrics.proof.recoveryPersistsRestoredState||!metrics.proof.selectionSurvivesUndo||!metrics.proof.fieldPrecisionHalo||!metrics.proof.fieldPrecisionUndo||!metrics.proof.fieldPrecisionMaterialDing||!metrics.proof.traceShallowContext||!metrics.proof.proofShallowContext||!metrics.proof.traceDepthEarned||!metrics.proof.proofDepthEarned||!metrics.proof.inspectionCreatesNoDing||!metrics.proof.keyboardParity||!metrics.proof.keyboardScopedToStage||!metrics.proof.keyboardFieldPrecision||!metrics.proof.keyboardUseContact||!metrics.proof.keyboardRouteCancel||!metrics.proof.keyboardRouteContact||!metrics.proof.keyboardRouteTargetHandoff||!metrics.proof.keyboardFaceTravel||!metrics.proof.keyboardUndo||!metrics.proof.formMaterialDings||!metrics.proof.formDragRecovery||!metrics.proof.formHandleRecovery||!metrics.proof.gripMaterialRecovery||!metrics.proof.noChangeNoDing||!metrics.proof.formSemanticTransactions||!metrics.proof.formLiveEditSingleDing||!metrics.proof.formSemanticRecovery||!metrics.proof.semanticSourceSync||!metrics.proof.structuralDingRecovery||!metrics.proof.createDuplicateDeleteRecovery||!metrics.proof.linkUnlinkRecovery||!metrics.proof.fieldInspectorTransactions||!metrics.proof.fieldInspectorSingleDing||!metrics.proof.fieldInspectorRecovery||!metrics.proof.fieldInspectorLiveQuiet||!metrics.proof.codeSingleTransaction||!metrics.proof.codeSemanticConsequenceRecovery||!metrics.proof.codeStarterRecovery||!metrics.proof.invalidCodeNoRevision||!metrics.proof.starterContactRecovery||!metrics.proof.quickActUsesStarterContact||!metrics.proof.keyboardStarterContact||!metrics.proof.starterContactTraceProof||!metrics.proof.sceneAggregateDing||!metrics.proof.sceneChildrenNested||!metrics.proof.sceneSingleUndo||!metrics.proof.sceneHoldNoRevision||!metrics.proof.operationLane||!metrics.proof.materialOperationSeparated||!metrics.proof.operationPointerEphemeral||!metrics.proof.operationTraceProofFocus||!metrics.proof.namedCheckpoint||!metrics.proof.undoCheckpointSeparated||!metrics.proof.redoRecovery||!metrics.proof.redoKeyboard||!metrics.proof.redoInvalidatesOnEdit||!metrics.proof.checkpointRecoveryUndoable||!metrics.proof.productionPipeline||!metrics.proof.pipelineStaleness||!metrics.proof.pipelineNextGate||!metrics.proof.pipelineEphemeral||!metrics.proof.operationVocabularySeparated) throw new Error(name+': owner-contact proof mismatch '+JSON.stringify(metrics));
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

  await page.locator('.gcw-face[data-face="field"] .inspector > summary').click();
  const inspectorBaseline=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    px:document.querySelector('#px')?.value,
    open:!!document.querySelector('.gcw-face[data-face="field"] .inspector')?.open
  }));
  if(!inspectorBaseline.open) throw new Error(name+': FIELD precision inspector did not open');
  await page.locator('#px').focus();
  await page.evaluate(()=>{
    const input=document.querySelector('#px');
    for(const value of ['58','61','63']){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}
  });
  const inspectorLive=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,
    x:document.querySelectorAll('.sceneBody')[1]?._body?.x,
    persisted:(JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')||'[]'))[1]?.x
  }));
  if(inspectorLive.event!==inspectorBaseline.event||inspectorLive.x!==63||inspectorLive.persisted!==63) throw new Error(name+': live FIELD inspector edit did not stay Ding-silent while geometry persisted '+JSON.stringify({inspectorBaseline,inspectorLive}));
  await page.locator('#px').blur();
  const inspectorCommit=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    x:document.querySelectorAll('.sceneBody')[1]?._body?.x,
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null
  }));
  if(inspectorCommit.event?.id!==inspectorBaseline.event+1||inspectorCommit.event?.kind!=='FIELD DING'||!inspectorCommit.event?.delta.includes('x '+inspectorBaseline.body.x+'→63')||!inspectorCommit.event?.recoveryRevision||inspectorCommit.selected!=='Grip Body') throw new Error(name+': FIELD inspector commit did not produce one recoverable Ding '+JSON.stringify({inspectorBaseline,inspectorCommit}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const inspectorUndo=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    x:document.querySelectorAll('.sceneBody')[1]?._body?.x,
    px:+document.querySelector('#px')?.value,
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null
  }));
  if(inspectorUndo.x!==inspectorBaseline.body.x||inspectorUndo.px!==Math.round(inspectorBaseline.body.x)||inspectorUndo.event?.kind!=='RECOVERY DING'||inspectorUndo.event?.recoveredEventId!==inspectorCommit.event.id||inspectorUndo.selected!=='Grip Body') throw new Error(name+': FIELD inspector exact recovery failed '+JSON.stringify({inspectorBaseline,inspectorCommit,inspectorUndo}));

  const inspectorNoChange=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  await page.locator('#py').focus();await page.locator('#py').blur();
  const inspectorNoChangeAfter=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  if(inspectorNoChangeAfter!==inspectorNoChange) throw new Error(name+': unchanged FIELD inspector contact minted false Ding '+JSON.stringify({inspectorNoChange,inspectorNoChangeAfter}));

  const rotateInspectorBefore=await page.evaluate(()=>({rotate:document.querySelectorAll('.sceneBody')[1]?._body?.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0}));
  await page.locator('#prot').focus();
  await page.evaluate(()=>{const input=document.querySelector('#prot');input.value=String(Number(input.value)+17);input.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#prot').blur();
  const rotateInspectorAfter=await page.evaluate(()=>({rotate:document.querySelectorAll('.sceneBody')[1]?._body?.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(rotateInspectorAfter.rotate!==rotateInspectorBefore.rotate+17||rotateInspectorAfter.event?.id!==rotateInspectorBefore.event+1||rotateInspectorAfter.event?.kind!=='FIELD DING'||!rotateInspectorAfter.event?.delta.includes('rotate '+rotateInspectorBefore.rotate+'→'+rotateInspectorAfter.rotate)) throw new Error(name+': FIELD rotate inspector transaction failed '+JSON.stringify({rotateInspectorBefore,rotateInspectorAfter}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const rotateInspectorUndo=await page.evaluate(()=>({rotate:document.querySelectorAll('.sceneBody')[1]?._body?.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(rotateInspectorUndo.rotate!==rotateInspectorBefore.rotate||rotateInspectorUndo.event?.recoveredEventId!==rotateInspectorAfter.event.id) throw new Error(name+': FIELD rotate inspector recovery failed '+JSON.stringify({rotateInspectorBefore,rotateInspectorAfter,rotateInspectorUndo}));

  await page.locator('.sceneBody').nth(1).focus();
  const keyboardEventBefore=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('=');
  await page.keyboard.press('e');
  const keyboardPrecision=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact(),active:document.activeElement?.classList?.contains('sceneBody')}});
  if(keyboardPrecision.x!==precisionBefore.x+1||keyboardPrecision.size!==precisionBefore.size+2||keyboardPrecision.rotate!==precisionBefore.rotate+1||keyboardPrecision.event?.kind!=='FIELD DING'||!keyboardPrecision.active) throw new Error(name+': keyboard FIELD parity failed '+JSON.stringify({precisionBefore,keyboardPrecision}));

  await page.keyboard.press('Control+z');
  const keyboardUndo=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(keyboardUndo.rotate!==precisionBefore.rotate||keyboardUndo.size!==precisionBefore.size+2||keyboardUndo.x!==precisionBefore.x+1||keyboardUndo.event?.kind!=='RECOVERY DING') throw new Error(name+': keyboard UNDO did not reverse last FIELD step '+JSON.stringify(keyboardUndo));
  await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');
  const keyboardRestored=await page.evaluate(()=>{const b=document.querySelectorAll('.sceneBody')[1]?._body;return b&&{x:b.x,size:b.size,rotate:b.rotate,event:window.JMAILatheoGripUI.latestMaterialContact()}});
  if(keyboardRestored.x!==precisionBefore.x||keyboardRestored.size!==precisionBefore.size||keyboardRestored.rotate!==precisionBefore.rotate) throw new Error(name+': keyboard recovery chain did not restore FIELD baseline '+JSON.stringify({precisionBefore,keyboardRestored}));

  const navEvent=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  await page.keyboard.press(']');
  const navForward=await page.evaluate(()=>({face:window.JMAILatheoGripUI.current(),event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0}));
  await page.keyboard.press('[');
  const navBack=await page.evaluate(()=>({face:window.JMAILatheoGripUI.current(),event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0}));
  if(navForward.face!=='proof'||navBack.face!=='field'||navForward.event!==navEvent||navBack.event!==navEvent) throw new Error(name+': keyboard face travel changed evidence or wrong face '+JSON.stringify({navEvent,navForward,navBack}));

  await page.locator('.gcw-lens[data-face="route"]').click();
  await page.locator('.sceneBody').nth(1).focus();
  const routeBeforeCancel=await page.evaluate(()=>({source:document.querySelectorAll('.sceneBody.route-source').length,event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0}));
  await page.keyboard.press('Escape');
  const routeCancelled=await page.evaluate(()=>({source:document.querySelectorAll('.sceneBody.route-source').length,tether:document.querySelectorAll('#gcwRoutePreview .gcw-routeTether').length,event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,selected:document.querySelector('.sceneBody.selected')?._body?.name||null}));
  if(routeBeforeCancel.source!==1||routeCancelled.source!==0||routeCancelled.tether!==0||routeCancelled.event!==routeBeforeCancel.event||routeCancelled.selected!=='Grip Body') throw new Error(name+': keyboard ROUTE cancel broke selection/evidence '+JSON.stringify({routeBeforeCancel,routeCancelled}));

  const keyboardRouteLinksBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length);
  await page.keyboard.press('Enter');
  const keyboardRouteArmed=await page.evaluate(()=>({
    source:document.querySelectorAll('.sceneBody.route-source').length,
    sourceName:document.querySelector('.sceneBody.route-source')?._body?.name||null,
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0
  }));
  if(keyboardRouteArmed.source!==1||keyboardRouteArmed.sourceName!=='Grip Body'||keyboardRouteArmed.event!==routeCancelled.event) throw new Error(name+': keyboard Enter did not arm focused selected body as ROUTE cause '+JSON.stringify({routeCancelled,keyboardRouteArmed}));
  await page.locator('.sceneBody').nth(0).focus();
  await page.keyboard.press('Enter');
  const keyboardRouteDone=await page.evaluate(()=>({
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length,
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null,
    active:document.activeElement?.classList?.contains('sceneBody')?document.activeElement._body?.name||null:null,
    source:document.querySelectorAll('.sceneBody.route-source').length,
    tether:document.querySelectorAll('#gcwRoutePreview .gcw-routeTether').length,
    event:window.JMAILatheoGripUI.latestMaterialContact()
  }));
  if(keyboardRouteDone.links!==keyboardRouteLinksBefore+1||keyboardRouteDone.selected!==sourceName||keyboardRouteDone.active!==sourceName||keyboardRouteDone.source!==0||keyboardRouteDone.tether!==0||keyboardRouteDone.event?.kind!=='LINK DING'||keyboardRouteDone.event?.id!==routeCancelled.event+1||!keyboardRouteDone.event?.recoveryRevision) throw new Error(name+': keyboard ROUTE target contact did not publish recoverable LINK DING '+JSON.stringify({sourceName,keyboardRouteLinksBefore,keyboardRouteDone}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const keyboardRouteCleanup=await page.evaluate(()=>({
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]'),
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    selected:document.querySelector('.sceneBody.selected')?._body?.name||null
  }));
  if(keyboardRouteCleanup.links.length!==keyboardRouteLinksBefore||keyboardRouteCleanup.event?.kind!=='RECOVERY DING'||keyboardRouteCleanup.event?.recoveredEventId!==keyboardRouteDone.event.id||keyboardRouteCleanup.selected!=='Grip Body') throw new Error(name+': keyboard ROUTE proof cleanup did not restore exact pre-link graph '+JSON.stringify({keyboardRouteLinksBefore,keyboardRouteDone,keyboardRouteCleanup}));

  await page.locator('.gcw-lens[data-face="use"]').click();
  await page.locator('.sceneBody').nth(1).focus();
  const keyboardUseBefore=await page.evaluate(()=>document.querySelectorAll('.sceneBody')[1]?._body?.rotate??null);
  await page.keyboard.press('Enter');
  const directEvent=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact());
  const keyboardUseAfter=await page.evaluate(()=>document.querySelectorAll('.sceneBody')[1]?._body?.rotate??null);
  if(keyboardUseAfter===keyboardUseBefore) throw new Error(name+': keyboard USE Enter did not execute selected body action');
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

  await page.locator('.gcw-lens[data-face="form"]').click();
  const starterDeleteA=await page.evaluate(()=>{document.querySelector('#deleteObject').click();return window.JMAILatheoGripUI.latestMaterialContact()});
  if(starterDeleteA?.kind!=='DELETE DING') throw new Error(name+': starter setup first delete did not enter structural chain '+JSON.stringify(starterDeleteA));
  if(await page.locator('.sceneBody').count()){
    await page.locator('.sceneBody').first().click();
    const starterDeleteB=await page.evaluate(()=>{document.querySelector('#deleteObject').click();return window.JMAILatheoGripUI.latestMaterialContact()});
    if(starterDeleteB?.kind!=='DELETE DING') throw new Error(name+': starter setup second delete did not enter structural chain '+JSON.stringify(starterDeleteB));
  }
  const starterBefore=await page.evaluate(()=>({
    bodies:document.querySelectorAll('.sceneBody').length,
    on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),
    source:document.querySelector('#source')?.value||'',
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0
  }));
  if(starterBefore.bodies!==0) throw new Error(name+': starter CODE proof did not reach no-body state '+JSON.stringify(starterBefore));
  const starterCommand='Starter Code : object [#58d7ff] <square> :: ToggleLight';
  await page.evaluate(v=>{document.querySelector('#source').value=v;document.querySelector('#runCode').click()},starterCommand);
  const starterAfter=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),
    source:document.querySelector('#source')?.value||''
  }));
  if(starterAfter.event?.kind!=='CODE DING'||starterAfter.event?.body!=='Starter Code'||starterAfter.event?.action!=='ToggleLight'||starterAfter.event?.id!==starterBefore.event+1||starterAfter.on===starterBefore.on||starterAfter.source!==starterCommand||!starterAfter.event?.recoveryRevision) throw new Error(name+': starter CODE run did not publish one recoverable transaction '+JSON.stringify({starterBefore,starterAfter}));
  await page.evaluate(()=>document.querySelector('#undoProject').click());
  const starterUndo=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),
    source:document.querySelector('#source')?.value||'',
    bodies:document.querySelectorAll('.sceneBody').length
  }));
  if(starterUndo.event?.kind!=='RECOVERY DING'||starterUndo.event?.recoveredEventId!==starterAfter.event.id||starterUndo.on!==starterBefore.on||starterUndo.source!==starterBefore.source||starterUndo.bodies!==0) throw new Error(name+': starter CODE undo did not restore source + persisted light state '+JSON.stringify({starterBefore,starterAfter,starterUndo}));

  await page.locator('.gcw-lens[data-face="use"]').click();
  const starterContactBefore=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false')}));
  await page.locator('.gcw-quick [data-q="act"]').click();
  const starterContact=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),bodies:document.querySelectorAll('.sceneBody').length}));
  if(starterContact.bodies!==0||starterContact.event?.kind!=='CONTACT DING'||starterContact.event?.body!=='STARTER'||starterContact.event?.action!=='ToggleLight'||starterContact.event?.id!==starterContactBefore.event+1||starterContact.on===starterContactBefore.on||!starterContact.event?.recoveryRevision) throw new Error(name+': quick ACT did not execute recoverable starter USE contact '+JSON.stringify({starterContactBefore,starterContact}));

  await page.locator('.gcw-lens[data-face="trace"]').click();
  const starterContactTrace=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwTraceDingFocus')?.textContent||''}));
  await page.locator('.gcw-lens[data-face="proof"]').click();
  const starterContactProof=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwProofDingFocus')?.textContent||''}));
  if(starterContactTrace.event?.id!==starterContact.event.id||starterContactProof.event?.id!==starterContact.event.id||starterContactTrace.text!==starterContactProof.text||!starterContactTrace.text.includes('CONTACT DING')||!starterContactTrace.text.includes('STARTER')) throw new Error(name+': starter CONTACT DING did not carry through TRACE/PROOF '+JSON.stringify({starterContact,starterContactTrace,starterContactProof}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const starterContactUndo=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),bodies:document.querySelectorAll('.sceneBody').length}));
  if(starterContactUndo.event?.kind!=='RECOVERY DING'||starterContactUndo.event?.recoveredEventId!==starterContact.event.id||starterContactUndo.on!==starterContactBefore.on||starterContactUndo.bodies!==0) throw new Error(name+': starter quick-ACT recovery failed '+JSON.stringify({starterContactBefore,starterContact,starterContactUndo}));

  await page.locator('.gcw-lens[data-face="use"]').click();
  await page.locator('.gcw-stageZone').focus();
  const starterKeyBefore=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),active:document.activeElement?.classList?.contains('gcw-stageZone')||false}));
  await page.keyboard.press('Enter');
  const starterKeyAfter=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),active:document.activeElement?.classList?.contains('gcw-stageZone')||false}));
  if(!starterKeyBefore.active||!starterKeyAfter.active||starterKeyAfter.event?.kind!=='CONTACT DING'||starterKeyAfter.event?.id!==starterKeyBefore.event+1||starterKeyAfter.on===starterKeyBefore.on||!starterKeyAfter.event?.recoveryRevision) throw new Error(name+': keyboard USE did not execute starter contact with focus continuity '+JSON.stringify({starterKeyBefore,starterKeyAfter}));
  await page.keyboard.press('Control+z');
  const starterKeyUndo=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),on:JSON.parse(localStorage.getItem('jm.ailatheo.v3.light')||'false'),active:document.activeElement?.classList?.contains('gcw-stageZone')||false}));
  if(starterKeyUndo.event?.kind!=='RECOVERY DING'||starterKeyUndo.event?.recoveredEventId!==starterKeyAfter.event.id||starterKeyUndo.on!==starterKeyBefore.on||!starterKeyUndo.active) throw new Error(name+': keyboard starter-contact recovery lost state or keyboard contact '+JSON.stringify({starterKeyBefore,starterKeyAfter,starterKeyUndo}));

  await page.evaluate(()=>document.querySelector('#undoProject').click());
  await page.evaluate(()=>document.querySelector('#undoProject').click());
  const starterRestored=await page.evaluate(()=>({bodies:document.querySelectorAll('.sceneBody').length,selected:document.querySelector('.sceneBody.selected')?._body?.name||null}));
  if(starterRestored.bodies!==2) throw new Error(name+': starter proof cleanup did not restore original body graph '+JSON.stringify(starterRestored));

  await page.locator('.gcw-lens[data-face="use"]').click();
  const sceneHoldBefore=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({...x._body}))
  }));
  await page.locator('#runScene').click();
  const sceneHoldAfter=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact()?.id||0,
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({...x._body})),
    ding:document.querySelector('#ding')?.textContent||''
  }));
  if(sceneHoldAfter.ding!=='SCENE HOLD'||sceneHoldAfter.event!==sceneHoldBefore.event||JSON.stringify(sceneHoldAfter.bodies)!==JSON.stringify(sceneHoldBefore.bodies)) throw new Error(name+': SCENE HOLD minted evidence/revision or changed bodies '+JSON.stringify({sceneHoldBefore,sceneHoldAfter}));

  const automaticLinksBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length);
  await page.evaluate(()=>{
    const from=document.querySelector('#fromBody'),to=document.querySelector('#toBody'),trigger=document.querySelector('#trigger'),link=document.querySelector('#linkBodies');
    for(let i=0;i<2;i++){from.value='0';to.value='1';trigger.value='near';link.click()}
  });
  const sceneBefore=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({...x._body})),
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length
  }));
  if(sceneBefore.links!==automaticLinksBefore+2||sceneBefore.event?.kind!=='LINK DING') throw new Error(name+': automatic SCENE setup did not create two near links '+JSON.stringify({automaticLinksBefore,sceneBefore}));

  await page.locator('#runScene').click();
  const sceneEvent=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({...x._body})),
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length,
    ding:document.querySelector('#ding')?.textContent||''
  }));
  const beforeTarget=sceneBefore.bodies[1],afterTarget=sceneEvent.bodies[1];
  if(sceneEvent.ding!=='SCENE DING'||sceneEvent.event?.kind!=='SCENE DING'||sceneEvent.event?.body!=='SCENE'||sceneEvent.event?.action!=='RUN_SCENE'||sceneEvent.event?.id!==sceneBefore.event.id+1||sceneEvent.event?.children?.length!==2||!sceneEvent.event?.recoveryRevision||sceneEvent.links!==sceneBefore.links) throw new Error(name+': automatic causes did not aggregate into one SCENE DING '+JSON.stringify({sceneBefore,sceneEvent}));
  if(beforeTarget.action!=='Spin'||afterTarget.rotate!==((beforeTarget.rotate+90)%360)||sceneEvent.event.children.some(x=>x.kind!=='CAUSE'||x.trigger!=='near'||x.to!==beforeTarget.name)) throw new Error(name+': SCENE child causes did not execute twice under aggregate event '+JSON.stringify({beforeTarget,afterTarget,children:sceneEvent.event.children}));

  await page.locator('.gcw-lens[data-face="trace"]').click();
  const sceneTrace=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwTraceDingFocus')?.textContent||''}));
  await page.locator('.gcw-lens[data-face="proof"]').click();
  const sceneProof=await page.evaluate(()=>({event:window.JMAILatheoGripUI.latestMaterialContact(),text:document.querySelector('#gcwProofDingFocus')?.textContent||''}));
  if(sceneTrace.event?.id!==sceneEvent.event.id||sceneProof.event?.id!==sceneEvent.event.id||sceneTrace.text!==sceneProof.text||!sceneTrace.text.includes('SCENE DING')||!sceneTrace.text.includes('2 automatic relationship')) throw new Error(name+': TRACE/PROOF did not follow aggregate SCENE DING '+JSON.stringify({sceneEvent,sceneTrace,sceneProof}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const sceneUndo=await page.evaluate(()=>({
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    bodies:[...document.querySelectorAll('.sceneBody')].map(x=>({...x._body})),
    persisted:JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')||'[]'),
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]').length
  }));
  if(sceneUndo.event?.kind!=='RECOVERY DING'||sceneUndo.event?.recoveredEventId!==sceneEvent.event.id||JSON.stringify(sceneUndo.bodies)!==JSON.stringify(sceneBefore.bodies)||JSON.stringify(sceneUndo.persisted)!==JSON.stringify(sceneBefore.bodies)||sceneUndo.links!==sceneBefore.links) throw new Error(name+': one UNDO did not reverse the whole aggregate SCENE transaction '+JSON.stringify({sceneBefore,sceneEvent,sceneUndo}));

  const operationBaseline=await page.evaluate(()=>({
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact(),
    persisted:localStorage.getItem('jm.ailatheo.v3.operationContact')
  }));
  if(operationBaseline.operation!==null||operationBaseline.persisted!==null) throw new Error(name+': operation pointer was not initially ephemeral/empty '+JSON.stringify(operationBaseline));

  await page.locator('.gcw-lens[data-face="proof"]').click();
  const proofDepth=page.locator('.gcw-face[data-face="proof"] .advanced');
  if(!(await proofDepth.evaluate(el=>el.open))) await proofDepth.locator('> summary').click();
  await page.locator('#testProject').click();
  const testOperation=await page.evaluate(()=>({material:window.JMAILatheoGripUI.latestMaterialContact(),operation:window.JMAILatheoGripUI.latestOperationContact()}));
  if(testOperation.material?.id!==operationBaseline.material?.id||testOperation.operation?.id!==1||testOperation.operation?.kind!=='TEST'||testOperation.operation?.status!=='HOLD'||!testOperation.operation?.detail.includes('DUPLICATE_BODY_NAME')||testOperation.operation?.claim!=='No proof claim earned') throw new Error(name+': TEST HOLD did not stay honestly isolated in operation lane '+JSON.stringify({operationBaseline,testOperation}));

  await page.locator('.gcw-quick [data-q="save"]').click();
  const saveOperation=await page.evaluate(()=>({material:window.JMAILatheoGripUI.latestMaterialContact(),operation:window.JMAILatheoGripUI.latestOperationContact()}));
  if(saveOperation.material?.id!==operationBaseline.material?.id||saveOperation.operation?.id!==2||saveOperation.operation?.kind!=='SAVE'||saveOperation.operation?.status!=='PASS') throw new Error(name+': SAVE operation contaminated material lane '+JSON.stringify({operationBaseline,saveOperation}));

  await page.locator('#build').click();
  const buildOperation=await page.evaluate(()=>({material:window.JMAILatheoGripUI.latestMaterialContact(),operation:window.JMAILatheoGripUI.latestOperationContact(),persisted:localStorage.getItem('jm.ailatheo.v3.operationContact')}));
  if(buildOperation.material?.id!==operationBaseline.material?.id||buildOperation.operation?.id!==3||buildOperation.operation?.kind!=='BUILD'||buildOperation.operation?.status!=='READY'||buildOperation.persisted!==null) throw new Error(name+': BUILD operation lane failed separation/ephemerality '+JSON.stringify({operationBaseline,buildOperation}));

  await page.locator('.gcw-lens[data-face="trace"]').click();
  const operationTrace=await page.evaluate(()=>({
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact(),
    materialText:document.querySelector('#gcwTraceDingFocus')?.textContent||'',
    operationText:document.querySelector('#gcwTraceOperationFocus')?.textContent||''
  }));
  await page.locator('.gcw-lens[data-face="proof"]').click();
  const operationProof=await page.evaluate(()=>({
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact(),
    materialText:document.querySelector('#gcwProofDingFocus')?.textContent||'',
    operationText:document.querySelector('#gcwProofOperationFocus')?.textContent||''
  }));
  if(operationTrace.material?.id!==operationBaseline.material?.id||operationProof.material?.id!==operationBaseline.material?.id||operationTrace.operation?.id!==buildOperation.operation.id||operationProof.operation?.id!==buildOperation.operation.id||operationTrace.operationText!==operationProof.operationText||!operationTrace.operationText.includes('LATEST OPERATION CONTACT')||!operationTrace.operationText.includes('BUILD · READY')||operationTrace.materialText!==operationProof.materialText||!operationTrace.materialText.includes('RECOVERY DING')) throw new Error(name+': TRACE/PROOF did not keep material and operation truths separate '+JSON.stringify({operationBaseline,buildOperation,operationTrace,operationProof}));

  await page.locator('.gcw-lens[data-face="field"]').click();
  await page.locator('.gcw-face[data-face="field"] #bodyShelf button').nth(1).click();
  const redoBase=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    depth:window.JMAILatheoGripUI.recoveryDepth()
  }));
  await page.locator('#gcwFieldHalo [data-field="right"]').click();
  const redoEdit=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    depth:window.JMAILatheoGripUI.recoveryDepth()
  }));
  if(redoEdit.body.x!==redoBase.body.x+1||redoEdit.event?.kind!=='FIELD DING'||redoEdit.depth.redo!==0) throw new Error(name+': fresh FIELD edit did not begin clean redo transaction '+JSON.stringify({redoBase,redoEdit}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const redoUndo=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    depth:window.JMAILatheoGripUI.recoveryDepth()
  }));
  if(redoUndo.body.x!==redoBase.body.x||redoUndo.event?.kind!=='RECOVERY DING'||redoUndo.event?.recoveredEventId!==redoEdit.event.id||redoUndo.depth.redo!==1) throw new Error(name+': UNDO did not create one truthful redo path '+JSON.stringify({redoBase,redoEdit,redoUndo}));

  await page.locator('.gcw-lens[data-face="proof"]').click();
  const recoveryDepth=page.locator('.gcw-face[data-face="proof"] .advanced');
  if(!(await recoveryDepth.evaluate(el=>el.open))) await recoveryDepth.locator('> summary').click();
  await page.locator('#redoProject').click();
  const redoApplied=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    depth:window.JMAILatheoGripUI.recoveryDepth()
  }));
  if(redoApplied.body.x!==redoEdit.body.x||redoApplied.event?.kind!=='REDO DING'||redoApplied.event?.redoneEventId!==redoEdit.event.id||redoApplied.depth.redo!==0) throw new Error(name+': visible REDO did not reapply exact edit '+JSON.stringify({redoEdit,redoUndo,redoApplied}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const redoUndoAgain=await page.evaluate(()=>({body:{...document.querySelectorAll('.sceneBody')[1]?._body},event:window.JMAILatheoGripUI.latestMaterialContact(),depth:window.JMAILatheoGripUI.recoveryDepth()}));
  if(redoUndoAgain.body.x!==redoBase.body.x||redoUndoAgain.event?.kind!=='RECOVERY DING'||redoUndoAgain.event?.recoveredEventId!==redoApplied.event.id||redoUndoAgain.depth.redo!==1) throw new Error(name+': REDO result was not itself exactly undoable '+JSON.stringify({redoApplied,redoUndoAgain}));

  await page.locator('.gcw-stageZone').focus();
  await page.keyboard.press('Control+Shift+z');
  const keyboardRedo=await page.evaluate(()=>({body:{...document.querySelectorAll('.sceneBody')[1]?._body},event:window.JMAILatheoGripUI.latestMaterialContact(),depth:window.JMAILatheoGripUI.recoveryDepth(),withinStage:!!document.activeElement?.closest?.('.gcw-stageZone'),focused:document.activeElement?.className||document.activeElement?.tagName||null}));
  if(keyboardRedo.body.x!==redoEdit.body.x||keyboardRedo.event?.kind!=='REDO DING'||!keyboardRedo.withinStage||keyboardRedo.depth.redo!==0) throw new Error(name+': keyboard REDO failed state/focus continuity '+JSON.stringify({redoEdit,keyboardRedo}));
  await page.keyboard.press('Control+z');
  const keyboardRedoUndo=await page.evaluate(()=>({body:{...document.querySelectorAll('.sceneBody')[1]?._body},event:window.JMAILatheoGripUI.latestMaterialContact(),depth:window.JMAILatheoGripUI.recoveryDepth(),withinStage:!!document.activeElement?.closest?.('.gcw-stageZone'),focused:document.activeElement?.className||document.activeElement?.tagName||null}));
  if(keyboardRedoUndo.body.x!==redoBase.body.x||keyboardRedoUndo.event?.kind!=='RECOVERY DING'||keyboardRedoUndo.depth.redo!==1||!keyboardRedoUndo.withinStage) throw new Error(name+': keyboard REDO undo failed '+JSON.stringify(keyboardRedoUndo));

  await page.locator('.gcw-lens[data-face="field"]').click();
  await page.locator('.gcw-face[data-face="field"] #bodyShelf button').nth(1).click();
  await page.locator('#gcwFieldHalo [data-field="left"]').click();
  const branchEdit=await page.evaluate(()=>({body:{...document.querySelectorAll('.sceneBody')[1]?._body},event:window.JMAILatheoGripUI.latestMaterialContact(),depth:window.JMAILatheoGripUI.recoveryDepth()}));
  if(branchEdit.body.x!==redoBase.body.x-1||branchEdit.event?.kind!=='FIELD DING'||branchEdit.depth.redo!==0) throw new Error(name+': fresh branch edit did not invalidate stale redo path '+JSON.stringify({keyboardRedoUndo,branchEdit}));
  await page.locator('.gcw-quick [data-q="undo"]').click();
  const branchUndo=await page.evaluate(()=>({body:{...document.querySelectorAll('.sceneBody')[1]?._body},depth:window.JMAILatheoGripUI.recoveryDepth()}));
  if(branchUndo.body.x!==redoBase.body.x) throw new Error(name+': branch cleanup undo failed '+JSON.stringify({redoBase,branchUndo}));

  const checkpointBefore=await page.evaluate(()=>window.JMAILatheoGripUI.latestCheckpoint());
  await page.locator('.gcw-quick [data-q="save"]').click();
  const checkpointSaved=await page.evaluate(()=>({
    checkpoint:window.JMAILatheoGripUI.latestCheckpoint(),
    saved:JSON.parse(localStorage.getItem('jm.ailatheo.v3.project')||'null'),
    operation:window.JMAILatheoGripUI.latestOperationContact(),
    body:{...document.querySelectorAll('.sceneBody')[1]?._body}
  }));
  if(!checkpointSaved.checkpoint?.id?.startsWith('CP-')||checkpointSaved.saved?.checkpoint?.id!==checkpointSaved.checkpoint.id||checkpointSaved.operation?.kind!=='SAVE'||checkpointSaved.operation?.detail?.includes(checkpointSaved.checkpoint.id)!==true||checkpointSaved.checkpoint.serial!==(Number(checkpointBefore?.serial||0)+1)) throw new Error(name+': SAVE did not create/increment named checkpoint identity '+JSON.stringify({checkpointBefore,checkpointSaved}));

  await page.locator('.gcw-lens[data-face="field"]').click();
  await page.locator('.gcw-face[data-face="field"] #bodyShelf button').nth(1).click();
  await page.locator('#gcwFieldHalo [data-field="right"]').click();
  await page.locator('#gcwFieldHalo [data-field="right"]').click();
  const checkpointDrift=await page.evaluate(()=>({body:{...document.querySelectorAll('.sceneBody')[1]?._body},event:window.JMAILatheoGripUI.latestMaterialContact()}));
  if(checkpointDrift.body.x!==checkpointSaved.body.x+2) throw new Error(name+': checkpoint drift setup failed '+JSON.stringify({checkpointSaved,checkpointDrift}));

  await page.locator('.gcw-lens[data-face="proof"]').click();
  if(!(await recoveryDepth.evaluate(el=>el.open))) await recoveryDepth.locator('> summary').click();
  await page.locator('#recover').click();
  const checkpointRecovered=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    checkpoint:window.JMAILatheoGripUI.latestCheckpoint(),
    depth:window.JMAILatheoGripUI.recoveryDepth()
  }));
  if(checkpointRecovered.body.x!==checkpointSaved.body.x||checkpointRecovered.event?.kind!=='CHECKPOINT DING'||checkpointRecovered.event?.checkpointId!==checkpointSaved.checkpoint.id||!checkpointRecovered.event?.recoveryRevision) throw new Error(name+': explicit checkpoint recovery failed identity/state '+JSON.stringify({checkpointSaved,checkpointDrift,checkpointRecovered}));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const checkpointRecoveryUndo=await page.evaluate(()=>({
    body:{...document.querySelectorAll('.sceneBody')[1]?._body},
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    depth:window.JMAILatheoGripUI.recoveryDepth()
  }));
  if(checkpointRecoveryUndo.body.x!==checkpointDrift.body.x||checkpointRecoveryUndo.event?.kind!=='RECOVERY DING'||checkpointRecoveryUndo.event?.recoveredEventId!==checkpointRecovered.event.id||checkpointRecoveryUndo.depth.redo!==1) throw new Error(name+': checkpoint recovery was not itself undoable '+JSON.stringify({checkpointDrift,checkpointRecovered,checkpointRecoveryUndo}));

  const pipelineBaseline=await page.evaluate(()=>({
    snap:window.JMAILatheoGripUI.pipelineSnapshot(),
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact(),
    persisted:localStorage.getItem('jm.ailatheo.v3.pipeline')
  }));
  const baselineBuild=pipelineBaseline.snap.stages.find(x=>x.kind==='BUILD'),baselineTest=pipelineBaseline.snap.stages.find(x=>x.kind==='TEST');
  if(pipelineBaseline.persisted!==null||baselineBuild?.status!=='STALE'||baselineTest?.status!=='STALE'||pipelineBaseline.snap.next!=='BUILD') throw new Error(name+': production pipeline did not conservatively stale prior operation results after material changes '+JSON.stringify(pipelineBaseline));

  await page.locator('.gcw-lens[data-face="proof"]').click();
  if(!(await recoveryDepth.evaluate(el=>el.open))) await recoveryDepth.locator('> summary').click();
  const pipelineMaterialBefore=await page.evaluate(()=>window.JMAILatheoGripUI.latestMaterialContact()?.id||0);
  await page.locator('#build').click();
  const pipelineBuild=await page.evaluate(()=>({
    snap:window.JMAILatheoGripUI.pipelineSnapshot(),
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact(),
    ui:document.querySelector('#gcwProofPipeline')?.textContent||''
  }));
  const freshBuild=pipelineBuild.snap.stages.find(x=>x.kind==='BUILD'),staleTest=pipelineBuild.snap.stages.find(x=>x.kind==='TEST');
  if(pipelineBuild.material?.id!==pipelineMaterialBefore||freshBuild?.status!=='READY'||!freshBuild.fresh||staleTest?.status!=='STALE'||pipelineBuild.snap.next!=='ESTATE ROUTE'||pipelineBuild.operation?.kind!=='BUILD'||pipelineBuild.operation?.status!=='READY'||!pipelineBuild.ui.includes('NEXT ESTATE ROUTE')||!pipelineBuild.ui.includes('BUILD · READY')||!pipelineBuild.ui.includes('TEST · STALE')) throw new Error(name+': BUILD did not refresh only its pipeline gate '+JSON.stringify(pipelineBuild));

  await page.locator('#routeEstate').click();
  await page.waitForFunction(()=>window.JMAILatheoGripUI.latestOperationContact()?.kind==='ESTATE ROUTE');
  const pipelineRoute=await page.evaluate(()=>({
    snap:window.JMAILatheoGripUI.pipelineSnapshot(),
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact()
  }));
  const routeStage=pipelineRoute.snap.stages.find(x=>x.kind==='ESTATE ROUTE');
  if(pipelineRoute.material?.id!==pipelineMaterialBefore||routeStage?.status!=='PASS'||!routeStage.fresh||pipelineRoute.snap.next!=='TEST'||pipelineRoute.operation?.kind!=='ESTATE ROUTE'||pipelineRoute.operation?.status!=='PASS') throw new Error(name+': ESTATE ROUTE did not advance coherent next gate '+JSON.stringify(pipelineRoute));

  await page.locator('#testProject').click();
  const pipelineTestHold=await page.evaluate(()=>({
    snap:window.JMAILatheoGripUI.pipelineSnapshot(),
    material:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact()
  }));
  const testStage=pipelineTestHold.snap.stages.find(x=>x.kind==='TEST');
  if(pipelineTestHold.material?.id!==pipelineMaterialBefore||testStage?.status!=='HOLD'||!testStage.fresh||pipelineTestHold.snap.next!=='TEST'||pipelineTestHold.operation?.kind!=='TEST'||pipelineTestHold.operation?.claim!=='No proof claim earned') throw new Error(name+': TEST HOLD did not block pipeline honestly without mutating creation '+JSON.stringify(pipelineTestHold));

  await page.locator('.gcw-lens[data-face="field"]').click();
  await page.locator('.gcw-face[data-face="field"] #bodyShelf button').nth(1).click();
  await page.locator('#gcwFieldHalo [data-field="right"]').click();
  const pipelineStale=await page.evaluate(()=>({
    snap:window.JMAILatheoGripUI.pipelineSnapshot(),
    event:window.JMAILatheoGripUI.latestMaterialContact(),
    operation:window.JMAILatheoGripUI.latestOperationContact()
  }));
  const staleBuild2=pipelineStale.snap.stages.find(x=>x.kind==='BUILD'),staleRoute2=pipelineStale.snap.stages.find(x=>x.kind==='ESTATE ROUTE'),staleTest2=pipelineStale.snap.stages.find(x=>x.kind==='TEST');
  if(pipelineStale.event?.id===pipelineMaterialBefore||staleBuild2?.status!=='STALE'||staleRoute2?.status!=='STALE'||staleTest2?.status!=='STALE'||pipelineStale.snap.next!=='BUILD'||pipelineStale.operation?.kind!=='TEST') throw new Error(name+': material edit did not stale prior production contacts while preserving operation history '+JSON.stringify(pipelineStale));

  await page.locator('.gcw-quick [data-q="undo"]').click();
  const pipelineUndo=await page.evaluate(()=>window.JMAILatheoGripUI.pipelineSnapshot());
  if(pipelineUndo.stages.find(x=>x.kind==='BUILD')?.status!=='STALE'||pipelineUndo.next!=='BUILD') throw new Error(name+': recovery incorrectly revived old production proof '+JSON.stringify(pipelineUndo));

  await page.locator('.gcw-lens[data-face="proof"]').click();
  if(!(await recoveryDepth.evaluate(el=>el.open))) await recoveryDepth.locator('> summary').click();
  await page.locator('#build').click();
  const pipelineRefreshed=await page.evaluate(()=>({snap:window.JMAILatheoGripUI.pipelineSnapshot(),operation:window.JMAILatheoGripUI.latestOperationContact(),ui:document.querySelector('#gcwProofPipeline')?.textContent||''}));
  if(pipelineRefreshed.snap.stages.find(x=>x.kind==='BUILD')?.status!=='READY'||pipelineRefreshed.snap.next!=='ESTATE ROUTE'||pipelineRefreshed.operation?.kind!=='BUILD'||!pipelineRefreshed.ui.includes('BUILD · READY')) throw new Error(name+': refreshed BUILD gate did not bind to recovered current material state '+JSON.stringify(pipelineRefreshed));

  const operationVocabulary=await page.evaluate(()=>({
    ding:document.querySelector('#ding')?.textContent||'',
    forbidden:["TEST DING","PROOF DING","SAVE DING","EXPORT DING","EXECUTION DING","APK BUILD DING"].filter(x=>document.documentElement.innerHTML.includes(x))
  }));
  if(operationVocabulary.ding!=='BUILD ROUTE READY'||operationVocabulary.forbidden.length) throw new Error(name+': operational vocabulary leaked DING semantics '+JSON.stringify(operationVocabulary));

  console.log(name+': PASS '+JSON.stringify({...metrics,materialEventId:checkpointRecoveryUndo.event.id,materialEventKind:checkpointRecoveryUndo.event.kind,recoveredEventId:checkpointRecoveryUndo.event.recoveredEventId,codeTransaction:true,starterContact:true,sceneAggregate:true,sceneChildren:sceneEvent.event.children.length,operationLane:true,redoRecovery:true,checkpointId:checkpointSaved.checkpoint.id,productionPipeline:true,pipelineNext:pipelineRefreshed.snap.next}));
}
await browser.close();
console.log('AILatheo GripCube operation-vocabulary render PASS — 2/2');