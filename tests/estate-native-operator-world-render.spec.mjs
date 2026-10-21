import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4177';
fs.mkdirSync('qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('WORLD_PAGE_ERROR',e.stack)});
  assert.equal((await page.goto(base+'/navigator/estate-integration/')).status(),200);
  await page.locator('#jmOperatorMode').selectOption('native-world');
  const example=await page.locator('#jmOperatorIntent').inputValue();
  const run=async input=>{
    await page.locator('#jmOperatorIntent').fill(input);await page.locator('#jmOperatorRun').click();
    await page.waitForFunction(()=>/^(WORLD_RENDERED|HOLD)/.test(document.getElementById('jmOperatorStatus').textContent),null,{timeout:30000});
    const status=await page.locator('#jmOperatorStatus').innerText();
    if(!status.startsWith('WORLD_RENDERED')){console.log('WORLD_FAILED_ERRORS',errors);await page.screenshot({path:'qa/estate-native-operator-world-failure.png',fullPage:true});}
    assert.match(status,/^WORLD_RENDERED/);
    return page.frames().find(f=>f.parentFrame()===page.mainFrame());
  };
  let frame=await run(example);
  let first=await frame.evaluate(()=>window.JMRenderedWorldReadback());
  assert.equal(first.world.body,'burning');assert.equal(first.snapshot.hazards.length,5);assert.equal(first.snapshot.core.x,700);
  assert.ok(first.pixels.painted>3000);assert.equal(await frame.locator('#playStartPanel').isVisible(),false);
  // Actual physics/input: drag on the native canvas moves the authoritative player.
  const canvas=frame.locator('#cv'),box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width*.14,box.y+box.height*.78);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.06,box.y+box.height*.84);await page.mouse.up();
  await page.waitForTimeout(150);
  const moved=await frame.evaluate(()=>window.JMRenderedWorldReadback());
  assert.ok(Math.abs(moved.snapshot.player.x-first.snapshot.player.x)>2,'NATIVE_WORLD_PLAYER_DID_NOT_MOVE');
  await page.locator('#jmOperatorSave').click();
  await page.waitForFunction(()=>/^(LOCAL_RETURN_READBACK_VERIFIED|SAVE HOLD)/.test(document.getElementById('jmOperatorStatus').textContent));
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^LOCAL_RETURN_READBACK_VERIFIED/);
  const saved=await frame.evaluate(()=>window.JMRenderedWorldReadback());
  assert.equal(saved.paused,true);
  await page.reload();await page.locator('#jmOperatorRecover').click();
  await page.waitForFunction(()=>/^(LOCAL RECOVERY VERIFIED|RECOVERY HOLD)/.test(document.getElementById('jmOperatorStatus').textContent),null,{timeout:30000});
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^LOCAL RECOVERY VERIFIED/);
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  const recovered=await frame.evaluate(()=>window.JMRenderedWorldReadback());
  assert.deepEqual(recovered.snapshot,saved.snapshot);
  assert.equal(recovered.paused,true);
  assert.ok(recovered.pixels.painted>3000,'RECOVERED_CANVAS_EMPTY');
  // Native animated overlays use the current clock; the world snapshot is exact.
  await page.locator('#jmOperatorPreview').scrollIntoViewIfNeeded();
  await page.screenshot({path:'qa/estate-native-operator-world-burning-phone.png'});
  const variant=example.replaceAll('burning','humanimals').replace('hazards = 5','hazards = 3').replace('targetX = 700','targetX = 550');
  frame=await run(variant);
  const second=await frame.evaluate(()=>window.JMRenderedWorldReadback());
  assert.equal(second.world.body,'humanimals');assert.equal(second.snapshot.hazards.length,3);assert.equal(second.snapshot.core.x,550);
  assert.notEqual(second.pixels.digest,first.pixels.digest,'DISTINCT_WORLD_PIXELS_REQUIRED');
  assert.notEqual(second.snapshot.hazards[0].type,first.snapshot.hazards[0].type);
  await page.locator('#jmOperatorPreview').scrollIntoViewIfNeeded();
  await page.screenshot({path:'qa/estate-native-operator-world-humanimals-phone.png'});
  const trace=await page.evaluate(()=>window.JMEstateIntegration.trace());
  assert.ok(trace.some(r=>r.action==='native.operator.render'&&r.detail.mode==='native-world'));
  // Failed chain must clear the scene and produce no false render success.
  const passCount=trace.filter(r=>r.action==='native.operator.pass').length;
  await page.locator('#jmOperatorIntent').fill(example.replace('allowed = true','allowed = false'));await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus').textContent.startsWith('HOLD'));
  assert.equal(await page.locator('#jmOperatorPreview').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.JMEstateIntegration.trace().filter(r=>r.action==='native.operator.pass').length),passCount);
  await page.locator('#jmOperatorSave').click();assert.match(await page.locator('#jmOperatorStatus').innerText(),/^SAVE HOLD/);
  // Last saved burning world remains recoverable; altered stored bytes do not.
  await page.locator('#jmOperatorRecover').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus').textContent.startsWith('LOCAL RECOVERY VERIFIED'));
  await page.evaluate(()=>{const k='JM_ESTATE_NATIVE_OPERATOR_RETURN_v02',v=JSON.parse(localStorage.getItem(k));v.body=v.body.replace('burning','broken');localStorage.setItem(k,JSON.stringify(v))});
  await page.locator('#jmOperatorRecover').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus').textContent.startsWith('RECOVERY HOLD'));
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/LOCAL_RETURN_HASH_MISMATCH/);
  assert.equal(await page.locator('#jmOperatorPreview').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({state:'WORLD_RENDER_BROWSER_PASS',viewport:'390x844',nativeGameWorldRendered:true,changedWorldPixels:true,physicsMovement:true,liveSnapshotReloadExact:true,canvasPixelRecovery:true,returnedTrace:true,failedChainHold:true,tamperHold:true,errors,physicalAndroid:false}));
}finally{await browser.close()}
