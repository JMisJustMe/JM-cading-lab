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
  // Owner's physical phone feedback: 3D must be visible BEFORE the tall
  // arena, and controls/labels must not obscure the relay.
  const ownerUI=await frame.evaluate(()=>{
    const bar=document.getElementById('jm-space-view-toolbar');
    const arena=document.getElementById('cv').parentElement;
    const btn=document.getElementById('jm-space-dimension');
    const label=document.getElementById('jm-space-view-label');
    const core=window.GF?.coreObj;
    return {toolbarTop:bar?.getBoundingClientRect().top,arenaTop:arena?.getBoundingClientRect().top,
      text:btn?.textContent,pressed:btn?.getAttribute('aria-pressed'),label:label?.textContent,
      core:{x:core?.x,y:core?.y},stateFont:parseFloat(getComputedStyle(document.getElementById('jm-space-state')).fontSize)};
  });
  assert.ok(ownerUI.toolbarTop<ownerUI.arenaTop,'JM_PHONE_VIEW_SWITCH_BELOW_ARENA_HOLD');
  assert.equal(ownerUI.text,'Switch to 3D');assert.equal(ownerUI.pressed,'false');assert.equal(ownerUI.label,'VIEW · 2D');
  assert.ok(Math.hypot(ownerUI.core.x-650,ownerUI.core.y-450)>180,'CORE_RELAY_STILL_OVERLAPPING_HOLD');
  assert.ok(ownerUI.stateFont>=13,'PHONE_STATUS_TEXT_TOO_SMALL_HOLD');
  await frame.locator('#jm-space-dimension').click();
  assert.equal(await frame.locator('#jm-space-dimension').getAttribute('aria-pressed'),'true');
  await frame.waitForFunction(()=>window.JMConnectedWorldReadback().spatial.active);
  const first3D=(await read()).spatial;assert.equal(first3D.webgl,true);assert.ok(first3D.drawCalls>2);assert.ok(first3D.variation>100);assert.equal(first3D.error,'');
  assert.equal(first3D.roomBody,'burning');assert.equal(first3D.objective.kind,'key');assert.ok(first3D.architecture.objectCount>=68);assert.ok(first3D.architecture.features.motifCount>=20);
  await frame.locator('#jm-space-camera').click();assert.equal((await read()).spatial.cameraMode,'ORBIT');
  await frame.locator('#jm-space-camera').click();assert.equal((await read()).spatial.cameraMode,'FOLLOW');
  // The JM WebGL canvas must not swallow live input from the original gameplay canvas.
  await frame.evaluate(()=>{window.__jm3dCanvasContact=0;
    document.getElementById('cv').addEventListener('pointerdown',()=>window.__jm3dCanvasContact++,{once:true});});
  await frame.locator('#cv').click({position:{x:100,y:100}});
  assert.equal(await frame.evaluate(()=>window.__jm3dCanvasContact),1);
  // Unlike overlay click-through, the 3D camera must turn its actual
  // perspective floor ray into a native GameForge movement destination.
  const area=await frame.locator('#cv').boundingBox();assert.ok(area);
  await frame.locator('#cv').click({position:{x:area.width*.60,y:area.height*.65}});
  const destination=(await read()).requestedDestination;
  assert.ok(destination&&destination.x>=24&&destination.x<=876&&destination.y>=24&&destination.y<=546,
    'JM_3D_GROUND_PICK_HOLD:'+JSON.stringify(destination));
  const tapped3D=(await read()).spatial;assert.equal(tapped3D.active,true);
  assert.ok(tapped3D.drawCalls>first3D.drawCalls,'JM_3D_DESTINATION_VISUAL_FEEDBACK_HOLD');

  await frame.locator('#cv').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');const moved3D=(await read()).spatial;assert.ok(moved3D.player.x>first3D.player.x);assert.notEqual(moved3D.pixelDigest,first3D.pixelDigest);
  await page.screenshot({path:'qa/estate-native-operator-spaces-3d-phone.png'});
  await frame.locator('#jm-space-dimension').click();
  assert.equal(await frame.locator('#jm-space-dimension').getAttribute('aria-pressed'),'false');
  const initial=await read();assert.equal(initial.session.active,0);assert.equal(initial.room.body,'burning');
  const fingerprint=()=>frame.evaluate(()=>{
    const cv=document.getElementById('cv'),bytes=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
    let hash=2166136261;
    for(let i=0;i<bytes.length;i+=97)hash=Math.imul(hash^bytes[i],16777619);
    return (hash>>>0).toString(16);
  });
  const crossing2D=await fingerprint();
  await page.screenshot({path:'qa/estate-native-operator-spaces-2d-owner-phone.png'});
  await frame.locator('#cv').click({position:{x:70,y:100}});
  async function move(axis,value){
    const r=await read(),p=r.session.rooms[r.session.active].snapshot.player;
    const positive=p[axis]<value,key=axis==='x'?(positive?'ArrowRight':'ArrowLeft'):(positive?'ArrowDown':'ArrowUp');
    await page.keyboard.down(key);
    try{await frame.waitForFunction(({axis,value,positive})=>{const r=window.JMConnectedWorldReadback();const p=r.session.rooms[r.session.active].snapshot.player;return positive?p[axis]>=value:p[axis]<=value},{axis,value,positive},{timeout:9000});}
    catch(e){console.log('MOVE_FAILURE',axis,value,JSON.stringify(await read()),await frame.evaluate(()=>document.activeElement?.tagName));await page.screenshot({path:'qa/estate-native-operator-spaces-failure.png',fullPage:true});throw e;}
    finally{await page.keyboard.up(key);}
  }
  async function use(){
    const target=frame.locator('#jm-space-use');
    assert.equal(await target.isEnabled(),true,'EXPLORE_DISABLED_OUTSIDE_CONTACT');
    // Use Playwright's real mobile touch on the nested iframe target, rather
    // than assuming its boundingBox stays at top-level coordinates after 3D
    // view switching or Playwright auto-scrolling.
    await target.tap();
  }
  async function power(){await move('y',70);await move('x',780);await move('y',450);await move('x',650);await use();const p=(await read()).session;assert.ok(p.progress.powered.includes(p.active));await move('x',780);await move('y',70);}
  // Move against solid geometry; holding right may not tunnel through the wall.
  await move('y',285);await move('x',330);await page.keyboard.down('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('ArrowRight');
  let r=await read();assert.ok(r.session.rooms[0].snapshot.player.x<=356,'WALL_COLLISION_FAILED');
  await move('x',210);await move('y',130);await use();
  r=await read();assert.deepEqual(r.session.collected,['key-0']);assert.equal(r.objective.kind,'relay');assert.equal(r.feedback?.kind,'collect');
  await power();
  const firstCamera=r.camera.x;
  await move('y',75);await move('x',800);await move('y',285);await use();
  await frame.waitForFunction(()=>window.JMConnectedWorldReadback().session.active===1);
  await page.screenshot({path:'qa/estate-native-operator-relay-hall-2d-owner-phone.png'});
  const living2D=await fingerprint();
  assert.notEqual(living2D,crossing2D,'JM_OWNER_2D_ROOM_IDENTITIES_ARE_NOT_DISTINCT');
  r=await read();assert.equal(r.room.body,'humanimals');assert.equal(r.objective.kind,'key');assert.equal(r.room.walls.length,2);assert.deepEqual(r.session.opened,['0-1']);
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
  r=await read();assert.equal(r.room.body,'tboys');assert.equal(r.objective.kind,'key');assert.deepEqual(r.session.opened,['0-1','1-2']);
  await frame.locator('#jm-space-dimension').click();const tech3D=(await read()).spatial;
  assert.equal(tech3D.roomBody,'tboys');assert.notEqual(tech3D.architecture.signature,living3D.architecture.signature);
  assert.ok(tech3D.architecture.objectCount>=68);await frame.locator('#jm-space-dimension').click();
  await move('x',240);await move('y',130);await use();
  await power();await move('x',720);await move('y',110);await use();assert.equal((await read()).session.progress.beacon,true);assert.equal((await read()).objective.kind,'door');
  await move('y',70);await move('x',110);await move('y',285);await use();assert.equal((await read()).session.active,1);
  await use();assert.equal((await read()).session.active,2); // same door remains traversable
  await use();assert.equal((await read()).session.active,1);
  await move('y',70);await move('x',110);await move('y',285);await use();assert.equal((await read()).session.active,0);
  await move('y',70);await move('x',120);await move('y',440);await use();assert.equal((await read()).session.progress.delivered,true);assert.equal((await read()).objective.kind,'complete');
  await frame.locator('#jm-space-dimension').click();const final3D=(await read()).spatial;assert.ok(final3D.variation>100);assert.notEqual(final3D.pixelDigest,first3D.pixelDigest);assert.equal(final3D.roomBody,'burning');assert.equal(final3D.architecture.features.powered,true);await frame.locator('#jm-space-dimension').click();
  await page.locator('#jmOperatorSave').click();
  await page.waitForFunction(()=>/^(LOCAL_RETURN_READBACK_VERIFIED|SAVE HOLD)/.test(document.getElementById('jmOperatorStatus').textContent));
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^LOCAL_RETURN_READBACK_VERIFIED/);
  const saved=(await read()).session;assert.equal(saved.collected.length,3);
  await page.reload();await page.locator('#jmOperatorRecover').click();
  await page.waitForFunction(()=>/^(LOCAL RECOVERY VERIFIED|RECOVERY HOLD)/.test(document.getElementById('jmOperatorStatus').textContent),null,{timeout:30000});
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/^LOCAL RECOVERY VERIFIED/);
  frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());assert.deepEqual((await read()).session,saved);assert.equal((await read()).objective.kind,'complete');assert.equal((await read()).feedback,null);
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
  // An existing saved game with an unexpected owner/boot token must HOLD rather
  // than silently start a new save and bury progression.
  const originalEnvelope=await standalone.evaluate(()=>window.JMWorldStorage.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700'));
  await standalone.evaluate(()=>{const k='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700',e=JSON.parse(window.JMWorldStorage.getItem(k));e.token='wrong-world-authority';window.JMWorldStorage.setItem(k,JSON.stringify(e))});
  await standalone.reload();await standalone.waitForFunction(()=>document.getElementById('jm-world-title')?.textContent.startsWith('WORLD HOLD'));
  assert.match(await standalone.locator('#jm-world-title').innerText(),/SPACES_STORAGE_TOKEN_HOLD/);
  await standalone.evaluate((envelope)=>window.JMWorldStorage.setItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700',envelope),originalEnvelope);
  await standalone.reload();await standalone.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()));
  assert.deepEqual(await standalone.evaluate(()=>window.JMConnectedWorldReadback().session),stored);
  await standalone.evaluate(()=>{const k='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700',e=JSON.parse(window.JMWorldStorage.getItem(k));e.body=e.body.replace('"active":0','"active":99');window.JMWorldStorage.setItem(k,JSON.stringify(e))});
  const corruptBytes=await standalone.evaluate(()=>window.JMWorldStorage.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700'));
  // Exercise the real autosave interval and lifecycle save, not just a fast reload.
  await standalone.waitForTimeout(3800);
  const suspendHold=await standalone.evaluate(async()=>{try{await window.JMWorldSuspend();return 'UNEXPECTED_SAVE'}catch(e){return e.message}});
  assert.equal(suspendHold,'SPACES_STORAGE_CONFLICT_HOLD');
  assert.equal(await standalone.evaluate(()=>window.JMWorldStorage.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700')),corruptBytes);
  await standalone.reload();await standalone.waitForFunction(()=>document.getElementById('jm-world-title').textContent.startsWith('WORLD HOLD'));
  assert.match(await standalone.locator('#jm-world-title').innerText(),/SPACES_STORAGE_HASH_HOLD/);
  await standalone.close();
  // Independent owner-playable native encounter, without modifying the
  // existing completed quest test or assigning synthetic JavaScript positions.
  const combatPage=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  combatPage.on('pageerror',e=>errors.push(e.message));
  await combatPage.goto(pathToFileURL(out).href);
  await combatPage.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()));
  assert.equal((await combatPage.evaluate(()=>window.JMConnectedWorldReadback())).combat.phase,'idle');
  await combatPage.locator('#jm-space-engage').tap();
  const started=(await combatPage.evaluate(()=>window.JMConnectedWorldReadback()));
  assert.equal(started.combat.phase,'active');
  const actor=started.session.rooms[started.session.active].snapshot.player;
  assert.ok(Math.hypot(actor.x-started.combat.guardian.x,actor.y-started.combat.guardian.y)<=160,
    'JM_ENCOUNTER_TOO_FAR_TO_PLAY');
  // Three actual touch pulses, with real cooldown and guardian chase/state,
  // must defeat the actual native receiving guardian.
  for(let i=0;i<3;i++){
    await combatPage.locator('#jm-space-pulse').tap({timeout:12000});
    await combatPage.waitForFunction(n=>{
      const r=window.JMConnectedWorldReadback(),last=r.events.filter(e=>e.kind==='pulse-hit'||e.kind==='encounter-won');
      return last.length>=n;
    },i+1,{timeout:12000});
  }
  const victory=await combatPage.evaluate(()=>window.JMConnectedWorldReadback());
  assert.equal(victory.combat.phase,'won');assert.deepEqual(victory.combat.wins,[0]);
  assert.equal(victory.session.collected.length,saved.collected.length,'ENCOUNTER_REPLACED_QUEST_STATE_HOLD');
  await combatPage.screenshot({path:'qa/estate-native-operator-encounter-phone.png',fullPage:true});
  await combatPage.waitForFunction(()=>{
    const raw=window.JMWorldStorage?.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700');
    return raw&&JSON.parse(JSON.parse(raw).body).encounter?.rooms[0]?.phase==='won';
  },null,{timeout:8000});
  await combatPage.reload();
  await combatPage.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()));
  const recoveredCombat=await combatPage.evaluate(()=>window.JMConnectedWorldReadback());
  assert.equal(recoveredCombat.combat.phase,'won');assert.deepEqual(recoveredCombat.combat.wins,[0]);
  assert.deepEqual(recoveredCombat.session.encounter.wins,[0]);
  await combatPage.close();
  // Hash-valid but structurally invalid memory must still be rejected on recovery.
  await page.evaluate(async()=>{const k='JM_ESTATE_NATIVE_OPERATOR_RETURN_v02',e=JSON.parse(localStorage.getItem(k));const v=JSON.parse(e.body);v.scene=v.scene.replace('"active":0','"active":99');e.body=JSON.stringify(v);e.sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(e.body)))].map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(k,JSON.stringify(e))});
  await page.locator('#jmOperatorRecover').click();await page.waitForFunction(()=>document.getElementById('jmOperatorStatus').textContent.startsWith('RECOVERY HOLD'));
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/SPACES_SESSION_HOLD/);assert.equal(await page.locator('#jmOperatorPreview').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({state:'CONNECTED_SPACES_BROWSER_PASS',viewport:'390x844',threeRealSpaces:true,doorTraversal:true,roundTripRetention:true,solidGeometry:true,cameraFollow:true,touchUse:true,keysRetained:true,exactReloadRecovery:true,standaloneFileFirstOpen:true,standaloneReloadCustody:true,standaloneHashRejection:true,invalidStateRejected:true,relayProgression:true,beaconRoundTrip:true,realJMWebGL:true,threeDistinctArchitectures:true,orbitCamera:true,threeDInputReachesNativeCanvas:true,perspectiveGroundPicking:true,progressionDerivedWaypoints:true,ownerVisibleDimensionSwitch:true,clearCoreRelaySeparation:true,authorialAvatar:true,animatedAvatar:true,threeAuthored2DEnvironments:true,optionalGuardianCombat:true,touchPulseVictory:true,guardianReloadRecovery:true,shared2DState:true,oldArenaSeparate:true,physicalAndroid:false}));
}finally{await browser.close()}
