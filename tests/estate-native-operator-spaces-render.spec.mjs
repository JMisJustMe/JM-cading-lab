import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4177';
fs.mkdirSync('qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('SPACES_ERROR',e.stack)});
  await page.goto(base+'/navigator/estate-integration/');await page.locator('#jmOperatorMode').selectOption('native-world');
  const source=await page.locator('#jmOperatorIntent').inputValue();assert.match(source,/spaces = 3/);
  await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>/^(WORLD_RENDERED|HOLD)/.test(document.getElementById('jmOperatorStatus').textContent),null,{timeout:30000});
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^WORLD_RENDERED/);
  let frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  const read=()=>frame.evaluate(()=>window.JMConnectedWorldReadback());
  await frame.locator('#jm-space-dimension').click();
  await frame.waitForFunction(()=>window.JMConnectedWorldReadback().spatial.active);
  const first3D=(await read()).spatial;assert.equal(first3D.webgl,true);assert.ok(first3D.drawCalls>2);assert.ok(first3D.variation>100);assert.equal(first3D.error,'');
  assert.equal(first3D.roomBody,'burning');assert.ok(first3D.architecture.objectCount>=68);assert.ok(first3D.architecture.features.motifCount>=20);
  await frame.locator('#jm-space-camera').click();assert.equal((await read()).spatial.cameraMode,'ORBIT');
  await frame.locator('#jm-space-camera').click();assert.equal((await read()).spatial.cameraMode,'FOLLOW');
  // The JM WebGL canvas must not swallow live input from the original gameplay canvas.
  await frame.evaluate(()=>{window.__jm3dCanvasContact=0;
    document.getElementById('cv').addEventListener('pointerdown',()=>window.__jm3dCanvasContact++,{once:true});});
  await frame.locator('#cv').click({position:{x:100,y:100}});
  assert.equal(await frame.evaluate(()=>window.__jm3dCanvasContact),1);

  await frame.locator('#cv').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');const moved3D=(await read()).spatial;assert.ok(moved3D.player.x>first3D.player.x);assert.notEqual(moved3D.pixelDigest,first3D.pixelDigest);
  await page.screenshot({path:'qa/estate-native-operator-spaces-3d-phone.png'});
  await frame.locator('#jm-space-dimension').click();
  const initial=await read();assert.equal(initial.session.active,0);assert.equal(initial.room.body,'burning');
  await frame.locator('#cv').click({position:{x:70,y:100}});
  async function move(axis,value){
    const r=await read(),p=r.session.rooms[r.session.active].snapshot.player;
    const positive=p[axis]<value,key=axis==='x'?(positive?'ArrowRight':'ArrowLeft'):(positive?'ArrowDown':'ArrowUp');
    await page.keyboard.down(key);
    try{await frame.waitForFunction(({axis,value,positive})=>{const r=window.JMConnectedWorldReadback();const p=r.session.rooms[r.session.active].snapshot.player;return positive?p[axis]>=value:p[axis]<=value},{axis,value,positive},{timeout:9000});}
    catch(e){console.log('MOVE_FAILURE',axis,value,JSON.stringify(await read()),await frame.evaluate(()=>document.activeElement?.tagName));await page.screenshot({path:'qa/estate-native-operator-spaces-failure.png',fullPage:true});throw e;}
    finally{await page.keyboard.up(key);}
  }
  async function use(){const b=await frame.locator('#jm-space-use').boundingBox();assert.ok(b);await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
  async function power(){await move('y',70);await move('x',780);await move('y',450);await move('x',650);await use();const p=(await read()).session;assert.ok(p.progress.powered.includes(p.active));await move('x',780);await move('y',70);}
  // Move against solid geometry; holding right may not tunnel through the wall.
  await move('y',285);await move('x',330);await page.keyboard.down('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('ArrowRight');
  let r=await read();assert.ok(r.session.rooms[0].snapshot.player.x<=356,'WALL_COLLISION_FAILED');
  await move('x',210);await move('y',130);await use();
  r=await read();assert.deepEqual(r.session.collected,['key-0']);
  await power();
  const firstCamera=r.camera.x;
  await move('y',75);await move('x',800);await move('y',285);await use();
  await frame.waitForFunction(()=>window.JMConnectedWorldReadback().session.active===1);
  r=await read();assert.equal(r.room.body,'humanimals');assert.equal(r.room.walls.length,2);assert.deepEqual(r.session.opened,['0-1']);
  await frame.locator('#jm-space-dimension').click();const living3D=(await read()).spatial;
  assert.equal(living3D.roomBody,'humanimals');assert.notEqual(living3D.architecture.signature,first3D.architecture.signature);
  assert.ok(living3D.architecture.objectCount>=68);await frame.locator('#jm-space-dimension').click();
  // Immediate return crosses the actual left door; collected state stays earned.
  await use();await frame.waitForFunction(()=>window.JMConnectedWorldReadback().session.active===0);
  r=await read();assert.deepEqual(r.session.collected,['key-0']);assert.equal(r.session.rooms[0].visits,2);assert.notEqual(r.camera.x,firstCamera);
  await use();await frame.waitForFunction(()=>window.JMConnectedWorldReadback().session.active===1);
  await move('x',225);await move('y',130);await use();
  await power();
  await move('y',70);await move('x',800);await move('y',285);await use();
  await frame.waitForFunction(()=>window.JMConnectedWorldReadback().session.active===2);
  r=await read();assert.equal(r.room.body,'tboys');assert.deepEqual(r.session.opened,['0-1','1-2']);
  await frame.locator('#jm-space-dimension').click();const tech3D=(await read()).spatial;
  assert.equal(tech3D.roomBody,'tboys');assert.notEqual(tech3D.architecture.signature,living3D.architecture.signature);
  assert.ok(tech3D.architecture.objectCount>=68);await frame.locator('#jm-space-dimension').click();
  await move('x',240);await move('y',130);await use();
  await power();await move('x',720);await move('y',110);await use();assert.equal((await read()).session.progress.beacon,true);
  await move('y',70);await move('x',110);await move('y',285);await use();assert.equal((await read()).session.active,1);
  await use();assert.equal((await read()).session.active,2); // same door remains traversable
  await use();assert.equal((await read()).session.active,1);
  await move('y',70);await move('x',110);await move('y',285);await use();assert.equal((await read()).session.active,0);
  await move('y',70);await move('x',120);await move('y',440);await use();assert.equal((await read()).session.progress.delivered,true);
  await frame.locator('#jm-space-dimension').click();const final3D=(await read()).spatial;assert.ok(final3D.variation>100);assert.notEqual(final3D.pixelDigest,first3D.pixelDigest);assert.equal(final3D.roomBody,'burning');assert.equal(final3D.architecture.features.powered,true);await frame.locator('#jm-space-dimension').click();
  await page.locator('#jmOperatorSave').click();
  await page.waitForFunction(()=>/^(LOCAL_RETURN_READBACK_VERIFIED|SAVE HOLD)/.test(document.getElementById('jmOperatorStatus').textContent));
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^LOCAL_RETURN_READBACK_VERIFIED/);
  const saved=(await read()).session;assert.equal(saved.collected.length,3);
  await page.reload();await page.locator('#jmOperatorRecover').click();
  await page.waitForFunction(()=>/^(LOCAL RECOVERY VERIFIED|RECOVERY HOLD)/.test(document.getElementById('jmOperatorStatus').textContent),null,{timeout:30000});
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^LOCAL RECOVERY VERIFIED/);
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.deepEqual((await read()).session,saved);
  const visual=await frame.evaluate(()=>window.JMRenderedWorldReadback());assert.ok(visual.pixels.painted>20000);
  assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'qa/estate-native-operator-spaces-recovered-phone.png'});
  const trace=await page.evaluate(()=>window.JMEstateIntegration.trace());assert.ok(trace.some(r=>r.action==='native.operator.world-event'&&r.detail.state==='relay'));assert.ok(trace.some(r=>r.action==='native.operator.world-event'&&r.detail.state==='deliver'));assert.ok(trace.some(r=>r.action==='native.operator.world-event'&&r.detail.state==='transition'));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#jmOperatorDownload').click()]);
  const out='/tmp/JM_CONNECTED_WORLD_OPEN_FIRST.html';await download.saveAs(out);
  const standalone=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});standalone.on('pageerror',e=>errors.push(e.message));
  await standalone.goto(pathToFileURL(out).href);await standalone.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()));
  assert.deepEqual(await standalone.evaluate(()=>window.JMConnectedWorldReadback().session),saved);
  await standalone.locator('#cv').click({position:{x:70,y:100}});
  await standalone.keyboard.down('ArrowRight');await standalone.waitForTimeout(160);await standalone.keyboard.up('ArrowRight');await standalone.waitForTimeout(80);
  await standalone.waitForFunction(()=>Boolean(window.JMWorldStorage?.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700')),{},{timeout:5000});
  const stored=await standalone.evaluate(()=>JSON.parse(JSON.parse(window.JMWorldStorage.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700')).body));
  await standalone.reload();await standalone.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()));
  assert.deepEqual(await standalone.evaluate(()=>window.JMConnectedWorldReadback().session),stored);
  await standalone.screenshot({path:'qa/estate-native-operator-spaces-standalone-phone.png'});
  await standalone.evaluate(()=>{const k='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700',e=JSON.parse(window.JMWorldStorage.getItem(k));e.body=e.body.replace('"active":0','"active":99');window.JMWorldStorage.setItem(k,JSON.stringify(e))});
  await standalone.reload();await standalone.waitForFunction(()=>document.getElementById('jm-world-title').textContent.startsWith('WORLD HOLD'));
  assert.match(await standalone.locator('#jm-world-title').innerText(),/SPACES_STORAGE_HASH_HOLD/);
  await standalone.close();
  // Hash-valid but structurally invalid memory must still be rejected on recovery.
  await page.evaluate(async()=>{const k='JM_ESTATE_NATIVE_OPERATOR_RETURN_v02',e=JSON.parse(localStorage.getItem(k));const v=JSON.parse(e.body);v.scene=v.scene.replace('"active":0','"active":99');e.body=JSON.stringify(v);e.sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(e.body)))].map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(k,JSON.stringify(e))});
  await page.locator('#jmOperatorRecover').click();await page.waitForFunction(()=>document.getElementById('jmOperatorStatus').textContent.startsWith('RECOVERY HOLD'));
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/SPACES_SESSION_HOLD/);assert.equal(await page.locator('#jmOperatorPreview').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({state:'CONNECTED_SPACES_BROWSER_PASS',viewport:'390x844',threeRealSpaces:true,doorTraversal:true,roundTripRetention:true,solidGeometry:true,cameraFollow:true,touchUse:true,keysRetained:true,exactReloadRecovery:true,standaloneFileFirstOpen:true,standaloneReloadCustody:true,standaloneHashRejection:true,invalidStateRejected:true,relayProgression:true,beaconRoundTrip:true,realJMWebGL:true,threeDistinctArchitectures:true,orbitCamera:true,threeDInputReachesNativeCanvas:true,shared2DState:true,oldArenaSeparate:true,physicalAndroid:false}));
}finally{await browser.close()}
