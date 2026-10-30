// Actual installed Android package and WebView target; never desktop Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {_android} from 'playwright';
const dir=process.argv[2],out='qa/android-runtime',pkg='com.jmisjustme.estateworld.ci';fs.mkdirSync(out,{recursive:true});
const apk=path.join(dir,'JM_CONNECTED_WORLD_CI.apk'),proof=JSON.parse(fs.readFileSync(path.join(dir,'CONNECTED_WORLD_APK_PROOF.json'),'utf8').replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(fs.readFileSync(apk)),proof.apk_sha256);
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:60000}).trim();
let device,page;const errors=[];
async function connect(){
  if(!device){[device]=await _android.devices();assert.ok(device,'ANDROID_DEVICE_NOT_FOUND');}
  const webview=await device.webView({pkg,timeout:30000});page=await webview.page();
  assert.ok(page.url().startsWith('file:///android_asset/'),'ANDROID_ASSET_LAUNCH_HOLD');page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.JMConnectedWorldReadback?.(),null,{timeout:30000});return page;
}
const read=()=>page.evaluate(()=>window.JMConnectedWorldReadback());
let nativeBounds=null;
const recoveredSystemDialogs=[];
const boundsPattern=/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
async function clearKnownLauncherOverlay(phase) {
  // Do not generalise to unrelated Android/app warnings. Recovery is limited
  // to the known cold-emulator Pixel Launcher ANR, with the genuine Wait node.
  for(let attempt=0;attempt<4;attempt++){
    let ui='';
    try {
      adb('shell','uiautomator','dump','/sdcard/jm-anr-check.xml');
      ui=adb('shell','cat','/sdcard/jm-anr-check.xml');
    } catch(e) {
      if(attempt===3)throw Error('ANDROID_UI_HIERARCHY_HOLD:'+phase+':'+String(e.message).slice(0,180));
      await new Promise(r=>setTimeout(r,350));continue;
    }
    if(!ui.includes("Pixel Launcher isn't responding"))return attempt>0;
    const node=ui.match(/<node[^>]*resource-id="android:id\/aerr_wait"[^>]*>/)?.[0];
    const rect=node?.match(boundsPattern);
    if(!rect)throw Error('ANDROID_UNKNOWN_SYSTEM_DIALOG_HOLD:'+phase);
    const x=Math.round((Number(rect[1])+Number(rect[3]))/2);
    const y=Math.round((Number(rect[2])+Number(rect[4]))/2);
    adb('shell','input','tap',String(x),String(y));
    recoveredSystemDialogs.push({kind:'PIXEL_LAUNCHER_ANR_WAIT',phase,attempt});
    await new Promise(r=>setTimeout(r,350));
  }
  throw Error('ANDROID_LAUNCHER_ANR_REPEATED_HOLD:'+phase);
}
async function nativePoint(label){const box=await page.locator('[aria-label="'+label+'"]').boundingBox();assert.ok(box);const size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));return {x:Math.round(nativeBounds.left+(box.x+box.width/2)*(nativeBounds.right-nativeBounds.left)/size.width),y:Math.round(nativeBounds.top+(box.y+box.height/2)*(nativeBounds.bottom-nativeBounds.top)/size.height)};}
async function hold(label,duration){
  await clearKnownLauncherOverlay('initial-contact');
  const p=await nativePoint(label);
  adb('shell','input','swipe',String(p.x),String(p.y),String(p.x),String(p.y),String(duration));
  await page.waitForTimeout(120);
}
async function move(axis,value){
  const initial=await read(),p=initial.session.rooms[initial.session.active].snapshot.player;
  if(Math.abs(value-p[axis])<12)return;
  const positive=p[axis]<value,label=axis==='x'?(positive?'Move right':'Move left'):(positive?'Move down':'Move up');
  const point=await nativePoint(label);
  // A cold emulator may show another Launcher ANR AFTER its initial WebView
  // readback. Retry only when a verified system dialog actually interrupted
  // the real Android DOWN/UP contact; never count an ignored touch as success.
  for(let attempt=0;attempt<16;attempt++){
    await clearKnownLauncherOverlay('move-before-'+axis+'-'+attempt);
    const beforeContact=(await read()).session.rooms[initial.session.active].snapshot.player[axis];
    // Android's shell motionevent DOWN can be cancelled by the system while
    // Playwright polls for several seconds. A finite real Android swipe at the
    // same control coordinate delivers a complete DOWN/MOVE/UP sequence.
    // This is *not* a synthetic JS click and does not assign player state.
    adb('shell','input','swipe',String(point.x),String(point.y),String(point.x),String(point.y),'1100');
    await page.waitForTimeout(150);
    const verified=(await read()).session.rooms[initial.session.active].snapshot.player[axis];
    const reached=positive?verified>=value-5:verified<=value+5;
    if(reached){
      const after=await read();
      console.log('ANDROID_NATIVE_MOVE',axis,value,JSON.stringify(after.session.rooms[after.session.active].snapshot.player));
      return;
    }
    fs.writeFileSync(out+'/movement-retry-'+axis+'-'+attempt+'.json',
      JSON.stringify({axis,value,attempt,readback:await read(),overlays:recoveredSystemDialogs}));
    const current=(await read()).session.rooms[initial.session.active].snapshot.player[axis];
    const progress=(positive?current-beforeContact:beforeContact-current);
    const count=recoveredSystemDialogs.length;
    await clearKnownLauncherOverlay('move-stalled-'+axis+'-'+attempt);
    // A bounded native press may make *real* measurable progress without
    // reaching the full distant destination in one contact. Continue only if
    // that progress occurred, or an identified Pixel Launcher ANR interrupted
    // the original contact; never fake a player update.
    if(progress<4&&count===recoveredSystemDialogs.length){
      throw Error('NATIVE_TOUCH_MOVEMENT_HOLD:'+axis+':'+value+':no-native-progress-or-verified-system-interruption');
    }
    console.log('ANDROID_NATIVE_SEGMENT',axis,value,JSON.stringify({attempt,progress,position:current}));
  }
  throw Error('NATIVE_TOUCH_MOVEMENT_HOLD:'+axis+':'+value+':overlay-retry-exhausted');
}

async function use(){await clearKnownLauncherOverlay('use-contact');assert.equal(await page.locator('#jm-space-use').isEnabled(),true);const stamp=await page.evaluate(()=>{const s=window.JMConnectedWorldReadback().session;return JSON.stringify([s.active,s.collected,s.progress,s.transitions])});const box=await page.locator('#jm-space-use').boundingBox(),size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));const x=Math.round(nativeBounds.left+(box.x+box.width/2)*(nativeBounds.right-nativeBounds.left)/size.width),y=Math.round(nativeBounds.top+(box.y+box.height/2)*(nativeBounds.bottom-nativeBounds.top)/size.height);adb('shell','input','tap',String(x),String(y));await page.waitForFunction(stamp=>{const s=window.JMConnectedWorldReadback().session;return JSON.stringify([s.active,s.collected,s.progress,s.transitions])!==stamp},stamp,{timeout:15000,polling:100});}


try{
  adb('install','-r',apk);const manifest=adb('shell','dumpsys','package',pkg);fs.writeFileSync(out+'/installed-package.txt',manifest);assert.ok(manifest.includes(pkg));assert.ok(!manifest.includes('android.permission.INTERNET'),'OFFLINE_PACKAGE_PERMISSION_HOLD');
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await connect();
  // This CI Android emulator's Pixel Launcher was independently observed
  // repeatedly ANRing above the healthy JM WebView (see retained logcat).
  // Quiesce only that identified launcher process WHILE our app is foreground;
  // no change to the APK, the owner device or runtime game services.
  const testEnvironment=[];
  const isEmulator=adb('shell','getprop','ro.kernel.qemu')==='1';
  if(isEmulator&&adb('shell','pm','path','com.google.android.apps.nexuslauncher').includes('package:')){
    adb('shell','am','force-stop','com.google.android.apps.nexuslauncher');
    testEnvironment.push('CI_PIXEL_LAUNCHER_QUIESCED');
    await page.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()),null,{timeout:15000});
  }
  fs.writeFileSync(out+'/android-test-environment.json',JSON.stringify({isEmulator,interventions:testEnvironment}));
  const first=await page.evaluate(()=>window.JMRenderedWorldReadback());assert.ok(first.pixels.painted>20000);assert.equal(first.snapshot.active,0);
  // Cold Android emulators sometimes present a Pixel Launcher ANR over the
  // already running JM WebView. Recover only this known system overlay; never
  // invent WebView geometry or skip a native-touch verification.
  let ui='',bounds=null;
  const rect=boundsPattern,bootHierarchyHolds=[];
  for(let attempt=0;attempt<10;attempt++){
    try{
      // A cold Android accessibility service can return null-root without
      // materializing an XML file. That is not a game's first-open failure.
      adb('shell','uiautomator','dump','/sdcard/jm-window.xml');
      ui=adb('shell','cat','/sdcard/jm-window.xml');
    }catch(e){
      bootHierarchyHolds.push({attempt,cause:'NO_ANDROID_UI_HIERARCHY_FILE'});
      await new Promise(resolve=>setTimeout(resolve,500));continue;
    }
    const node=ui.match(/<node[^>]*class="android[.]webkit[.]WebView"[^>]*>/)?.[0];
    bounds=node?.match(rect);
    if(bounds)break;
    const waitNode=ui.includes("Pixel Launcher isn't responding")
      ?ui.match(/<node[^>]*resource-id="android:id\/aerr_wait"[^>]*>/)?.[0]:null;
    const waitBounds=waitNode?.match(rect);
    if(waitBounds){
      const x=Math.round((Number(waitBounds[1])+Number(waitBounds[3]))/2);
      const y=Math.round((Number(waitBounds[2])+Number(waitBounds[4]))/2);
      adb('shell','input','tap',String(x),String(y));
      recoveredSystemDialogs.push({kind:'PIXEL_LAUNCHER_ANR_WAIT',attempt});
    }
    await new Promise(resolve=>setTimeout(resolve,600));
  }
  fs.writeFileSync(out+'/native-window.xml',ui);
  fs.writeFileSync(out+'/native-hierarchy-attempts.json',JSON.stringify(bootHierarchyHolds));
  fs.writeFileSync(out+'/native-system-overlays.json',JSON.stringify(recoveredSystemDialogs));
  assert.ok(bounds,'NATIVE_WEBVIEW_BOUNDS_HOLD');
  nativeBounds={left:Number(bounds[1]),top:Number(bounds[2]),right:Number(bounds[3]),bottom:Number(bounds[4])};
  fs.writeFileSync(out+'/native-geometry.json',JSON.stringify({bounds:nativeBounds,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale})),wm:adb('shell','wm','size')}));
  for(let attempt=0;attempt<3;attempt++){await hold('Move right',1000);if((await read()).session.rooms[0].snapshot.player.x>first.snapshot.rooms[0].snapshot.player.x+5)break;}
  assert.ok((await read()).session.rooms[0].snapshot.player.x>first.snapshot.rooms[0].snapshot.player.x+5,'NATIVE_TOUCH_MOVEMENT_HOLD');
  await move('x',210);await move('y',130);await use();assert.ok((await read()).session.collected.includes('key-0'));
  await move('y',75);await move('x',800);await move('y',285);await use();assert.equal((await read()).session.active,1);
  await page.locator('#jm-space-dimension').click();
  const spatial=(await read()).spatial;
  assert.ok(spatial.active,'ANDROID_3D_RENDER_HOLD:'+JSON.stringify(spatial));
  assert.equal(spatial.error,'','ANDROID_3D_SHADER_HOLD');
  assert.ok(spatial.webgl&&spatial.drawCalls>2&&spatial.variation>100,'ANDROID_3D_PIXELS_HOLD:'+JSON.stringify(spatial));
  assert.equal(spatial.roomBody,'humanimals','ANDROID_3D_RECEIVING_ROOM_HOLD');
  assert.equal(spatial.objective?.kind,'key','ANDROID_3D_WORLD_GUIDANCE_HOLD');
  assert.equal((await read()).objective.kind,spatial.objective.kind,'ANDROID_SHARED_OBJECTIVE_HOLD');
  assert.ok(spatial.architecture?.objectCount>=68&&spatial.architecture.features?.motifCount>=20,
    'ANDROID_3D_ARCHITECTURE_HOLD:'+JSON.stringify(spatial.architecture));
  fs.writeFileSync(out+'/android-3d-screen.png',execFileSync('adb',['exec-out','screencap','-p']));
  // Assert real Android native touch on the visible JM perspective ground.
  // A WebGL picture alone is NOT a 3D gameplay interaction proof.
  await clearKnownLauncherOverlay('3d-ground-tap');
  const arenaBox=await page.locator('#cv').boundingBox();
  assert.ok(arenaBox,'ANDROID_3D_GROUND_CANVAS_HOLD');
  const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  const clientX=arenaBox.x+arenaBox.width*.60,clientY=arenaBox.y+arenaBox.height*.65;
  const nativeX=Math.round(nativeBounds.left+clientX*(nativeBounds.right-nativeBounds.left)/viewport.width);
  const nativeY=Math.round(nativeBounds.top+clientY*(nativeBounds.bottom-nativeBounds.top)/viewport.height);
  const preTap=(await read()).session.rooms[1].snapshot.player;
  adb('shell','input','tap',String(nativeX),String(nativeY));
  await page.waitForFunction(()=>{
    const r=window.JMConnectedWorldReadback(),p=r.requestedDestination;
    return p&&p.x>=24&&p.x<=876&&p.y>=24&&p.y<=546;
  },null,{timeout:15000,polling:100});
  const selected3D=(await read()).requestedDestination;
  assert.ok(Math.hypot(selected3D.x-preTap.x,selected3D.y-preTap.y)>12,'ANDROID_3D_GOAL_NOT_DISTINCT');
  await page.waitForFunction(before=>{
    const r=window.JMConnectedWorldReadback(),p=r.session.rooms[r.session.active].snapshot.player;
    return Math.hypot(p.x-before.x,p.y-before.y)>3;
  },preTap,{timeout:20000,polling:100});
  const movement3D=(await read()).session.rooms[1].snapshot.player;
  fs.writeFileSync(out+'/android-3d-ground-tap.json',JSON.stringify({target:selected3D,before:preTap,after:movement3D,nativePoint:{x:nativeX,y:nativeY}}));
  await page.locator('#jm-space-dimension').click();
  await page.evaluate(()=>{window.JMHostPauseSaved=false});adb('shell','input','keyevent','KEYCODE_HOME');await page.waitForFunction(()=>window.JMHostPauseSaved===true,null,{timeout:10000,polling:100});
  const saved=await read();assert.equal(await page.evaluate(()=>window.JMRenderedWorldReadback().paused),true);
  const sourceSlot='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700';
  const durableBefore=await page.evaluate(k=>{
    const raw=window.JMWorldStorage?.getItem(k);
    const e=raw?JSON.parse(raw):null;
    const s=e?.body?JSON.parse(e.body):null;
    return {hasStorage:!!window.JMWorldStorage,hasEnvelope:!!e,token:e?.token,active:s?.active,transitions:s?.transitions,collected:s?.collected,opened:s?.opened,href:location.href};
  },sourceSlot);
  fs.writeFileSync(out+'/android-durable-before-force-stop.json',JSON.stringify(durableBefore));
  assert.equal(durableBefore.hasEnvelope,true,'ANDROID_DURABLE_ENVELOPE_MISSING_BEFORE_FORCE_STOP');
  assert.equal(durableBefore.active,saved.session.active,'ANDROID_DURABLE_ENVELOPE_STALE_BEFORE_FORCE_STOP');
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await page.waitForTimeout(200);assert.deepEqual((await read()).session,saved.session);
  fs.writeFileSync(out+'/android-screen.png',execFileSync('adb',['exec-out','screencap','-p']));
  // Native process death destroys the previous WebView debugging transport.
  // Disconnect its stale Playwright target before restarting, then discover a
  // genuinely new Android WebView and independently compare recovered state.
  await device.close();device=null;page=null;
  adb('shell','am','force-stop',pkg);await new Promise(r=>setTimeout(r,500));
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');
  await connect();
  const durableAfter=await page.evaluate(k=>{
    const raw=window.JMWorldStorage?.getItem(k);
    const e=raw?JSON.parse(raw):null;
    const s=e?.body?JSON.parse(e.body):null;
    return {hasStorage:!!window.JMWorldStorage,hasEnvelope:!!e,token:e?.token,active:s?.active,transitions:s?.transitions,collected:s?.collected,opened:s?.opened,href:location.href};
  },sourceSlot);
  fs.writeFileSync(out+'/android-durable-after-force-stop.json',JSON.stringify(durableAfter));
  assert.equal(durableAfter.hasEnvelope,true,'ANDROID_DURABLE_ENVELOPE_MISSING_AFTER_FORCE_STOP');
  assert.equal(durableAfter.active,saved.session.active,'ANDROID_DURABLE_ENVELOPE_STALE_AFTER_FORCE_STOP');
  assert.deepEqual((await read()).session,saved.session);
  const installedPath=adb('shell','pm','path',pkg).replace(/^package:/,'');adb('pull',installedPath,out+'/installed-exact.apk');assert.equal(sha(fs.readFileSync(out+'/installed-exact.apk')),proof.apk_sha256);fs.unlinkSync(out+'/installed-exact.apk');
  // Ordinary reload dispatches pagehide/visibilitychange and calls JMWorldSuspend,
  // which legitimately rewrites a clean envelope. To prove boot-time tamper
  // rejection, corrupt the durable slot, then KILL the Android process without
  // a JS unload/save opportunity; start a fresh Android WebView from the APK.
  await page.evaluate(()=>{
    const k='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700';
    const e=JSON.parse(window.JMWorldStorage.getItem(k));
    if(e?.schema!=='jm.gameforge.spaces-envelope/1'||typeof e.body!=='string'||typeof e.sha256!=='string')throw Error('ANDROID_TAMPER_SETUP_HOLD');
    e.body+=' ';window.JMWorldStorage.setItem(k,JSON.stringify(e));
  });
  const corruptBytes=await page.evaluate(()=>window.JMWorldStorage.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700'));
  await page.waitForTimeout(3800);
  const storageHold=await page.evaluate(async()=>{try{await window.JMWorldSuspend();return 'UNEXPECTED_SAVE'}catch(e){return e.message}});
  assert.equal(storageHold,'SPACES_STORAGE_CONFLICT_HOLD');
  assert.equal(await page.evaluate(()=>window.JMWorldStorage.getItem('JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700')),corruptBytes);
  await device.close();device=null;page=null;
  adb('shell','am','force-stop',pkg);await new Promise(r=>setTimeout(r,500));
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');
  [device]=await _android.devices();assert.ok(device,'ANDROID_TAMPER_DEVICE_NOT_FOUND');
  const heldWebview=await device.webView({pkg,timeout:30000});page=await heldWebview.page();
  assert.ok(page.url().startsWith('file:///android_asset/'),'ANDROID_TAMPER_ASSET_LAUNCH_HOLD');
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>document.getElementById('jm-world-title')?.textContent.startsWith('WORLD HOLD'),null,{timeout:30000,polling:100});
  assert.match(await page.locator('#jm-world-title').innerText(),/SPACES_STORAGE_HASH_HOLD/);
  assert.deepEqual(errors,[]);
  const result={schema:'jm.connected-world.android-runtime/1',status:'ANDROID_EMULATOR_RUNTIME_PASS',sourceHead:proof.source_head,apk_sha256:proof.apk_sha256,asset_sha256:proof.asset_sha256,androidAPI:adb('shell','getprop','ro.build.version.sdk'),abi:adb('shell','getprop','ro.product.cpu.abi'),webview:adb('shell','dumpsys','webviewupdate'),installed:true,launched:true,nativeTouchMovement:true,nativeTouchNavigation:true,doorTraversal:true,spatialReceiver:spatial,native3DGroundTapMovement:true,lifecyclePause:true,processDeathExactRecovery:true,hashTamperHold:true,offlinePermissionBoundary:true,privilegedJSBridge:false,physicalDevice:false,release:false};
  fs.writeFileSync(out+'/ANDROID_RUNTIME_PROOF.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){try{fs.writeFileSync(out+'/last-world.json',JSON.stringify(await read()));fs.writeFileSync(out+'/hold-screen.png',execFileSync('adb',['exec-out','screencap','-p']));}catch{}fs.writeFileSync(out+'/HOLD.txt',e.stack+'\n'+(page?await page.locator('body').innerText().catch(()=>'' ):''));throw e}
finally{try{fs.writeFileSync(out+'/logcat.txt',adb('logcat','-d','-t','1500'));}catch{}if(device)await device.close()}
