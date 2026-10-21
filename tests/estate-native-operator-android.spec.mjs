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
async function nativePoint(label){const box=await page.locator('[aria-label="'+label+'"]').boundingBox();assert.ok(box);const size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));return {x:Math.round(nativeBounds.left+(box.x+box.width/2)*(nativeBounds.right-nativeBounds.left)/size.width),y:Math.round(nativeBounds.top+(box.y+box.height/2)*(nativeBounds.bottom-nativeBounds.top)/size.height)};}
async function hold(label,duration){const p=await nativePoint(label);adb('shell','input','swipe',String(p.x),String(p.y),String(p.x),String(p.y),String(duration));await page.waitForTimeout(120);}
async function move(axis,value){const r=await read(),p=r.session.rooms[r.session.active].snapshot.player;if(Math.abs(value-p[axis])<12)return;const positive=p[axis]<value,label=axis==='x'?(positive?'Move right':'Move left'):(positive?'Move down':'Move up'),point=await nativePoint(label);
  adb('shell','input','motionevent','DOWN',String(point.x),String(point.y));try{
    await page.waitForFunction(({axis,value,positive})=>{const r=window.JMConnectedWorldReadback(),p=r.session.rooms[r.session.active].snapshot.player;return positive?p[axis]>=value-5:p[axis]<=value+5},{axis,value,positive},{timeout:120000,polling:80});
    // Release native contact immediately at the observed threshold; readback follows UP.
  }catch(e){fs.writeFileSync(out+'/movement-hold.json',JSON.stringify({axis,value,readback:await read()}));throw e;}finally{adb('shell','input','motionevent','UP',String(point.x),String(point.y));}
  const after=await read();console.log('ANDROID_NATIVE_MOVE',axis,value,JSON.stringify(after.session.rooms[after.session.active].snapshot.player));
}

async function use(){assert.equal(await page.locator('#jm-space-use').isEnabled(),true);const stamp=await page.evaluate(()=>{const s=window.JMConnectedWorldReadback().session;return JSON.stringify([s.active,s.collected,s.progress,s.transitions])});const box=await page.locator('#jm-space-use').boundingBox(),size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));const x=Math.round(nativeBounds.left+(box.x+box.width/2)*(nativeBounds.right-nativeBounds.left)/size.width),y=Math.round(nativeBounds.top+(box.y+box.height/2)*(nativeBounds.bottom-nativeBounds.top)/size.height);adb('shell','input','tap',String(x),String(y));await page.waitForFunction(stamp=>{const s=window.JMConnectedWorldReadback().session;return JSON.stringify([s.active,s.collected,s.progress,s.transitions])!==stamp},stamp,{timeout:15000,polling:100});}


try{
  adb('install','-r',apk);const manifest=adb('shell','dumpsys','package',pkg);fs.writeFileSync(out+'/installed-package.txt',manifest);assert.ok(manifest.includes(pkg));assert.ok(!manifest.includes('android.permission.INTERNET'),'OFFLINE_PACKAGE_PERMISSION_HOLD');
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await connect();
  const first=await page.evaluate(()=>window.JMRenderedWorldReadback());assert.ok(first.pixels.painted>20000);assert.equal(first.snapshot.active,0);
  adb('shell','uiautomator','dump','/sdcard/jm-window.xml');const ui=adb('shell','cat','/sdcard/jm-window.xml');fs.writeFileSync(out+'/native-window.xml',ui);const node=ui.match(/<node[^>]*class="android.webkit.WebView"[^>]*>/)?.[0],bounds=node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert.ok(bounds,'NATIVE_WEBVIEW_BOUNDS_HOLD');nativeBounds={left:Number(bounds[1]),top:Number(bounds[2]),right:Number(bounds[3]),bottom:Number(bounds[4])};
  fs.writeFileSync(out+'/native-geometry.json',JSON.stringify({bounds:nativeBounds,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale})),wm:adb('shell','wm','size')}));
  for(let attempt=0;attempt<3;attempt++){await hold('Move right',1000);if((await read()).session.rooms[0].snapshot.player.x>first.snapshot.rooms[0].snapshot.player.x+5)break;}
  assert.ok((await read()).session.rooms[0].snapshot.player.x>first.snapshot.rooms[0].snapshot.player.x+5,'NATIVE_TOUCH_MOVEMENT_HOLD');
  await move('x',210);await move('y',130);await use();assert.ok((await read()).session.collected.includes('key-0'));
  await move('y',75);await move('x',800);await move('y',285);await use();assert.equal((await read()).session.active,1);
  await page.locator('#jm-space-dimension').click();const spatial=(await read()).spatial;if(spatial.active){assert.ok(spatial.webgl&&spatial.drawCalls>2&&spatial.variation>100);fs.writeFileSync(out+'/android-3d-screen.png',execFileSync('adb',['exec-out','screencap','-p']));await page.locator('#jm-space-dimension').click();}
  await page.evaluate(()=>{window.JMHostPauseSaved=false});adb('shell','input','keyevent','KEYCODE_HOME');await page.waitForFunction(()=>window.JMHostPauseSaved===true,null,{timeout:10000,polling:100});
  const saved=await read();assert.equal(await page.evaluate(()=>window.JMRenderedWorldReadback().paused),true);
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await page.waitForTimeout(200);assert.deepEqual((await read()).session,saved.session);
  fs.writeFileSync(out+'/android-screen.png',execFileSync('adb',['exec-out','screencap','-p']));
  adb('shell','am','force-stop',pkg);await new Promise(r=>setTimeout(r,500));adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await connect();assert.deepEqual((await read()).session,saved.session);
  const installedPath=adb('shell','pm','path',pkg).replace(/^package:/,'');adb('pull',installedPath,out+'/installed-exact.apk');assert.equal(sha(fs.readFileSync(out+'/installed-exact.apk')),proof.apk_sha256);fs.unlinkSync(out+'/installed-exact.apk');
  await page.evaluate(()=>{const k='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700',e=JSON.parse(window.JMWorldStorage.getItem(k));e.body+=' ';window.JMWorldStorage.setItem(k,JSON.stringify(e))});
  await page.reload();await page.waitForFunction(()=>document.getElementById('jm-world-title').textContent.startsWith('WORLD HOLD'));assert.match(await page.locator('#jm-world-title').innerText(),/SPACES_STORAGE_HASH_HOLD/);
  assert.deepEqual(errors,[]);
  const result={schema:'jm.connected-world.android-runtime/1',status:'ANDROID_EMULATOR_RUNTIME_PASS',sourceHead:proof.source_head,apk_sha256:proof.apk_sha256,asset_sha256:proof.asset_sha256,androidAPI:adb('shell','getprop','ro.build.version.sdk'),abi:adb('shell','getprop','ro.product.cpu.abi'),webview:adb('shell','dumpsys','webviewupdate'),installed:true,launched:true,nativeTouchMovement:true,nativeTouchNavigation:true,doorTraversal:true,spatialReceiver:spatial,lifecyclePause:true,processDeathExactRecovery:true,hashTamperHold:true,offlinePermissionBoundary:true,privilegedJSBridge:false,physicalDevice:false,release:false};
  fs.writeFileSync(out+'/ANDROID_RUNTIME_PROOF.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){try{fs.writeFileSync(out+'/last-world.json',JSON.stringify(await read()));fs.writeFileSync(out+'/hold-screen.png',execFileSync('adb',['exec-out','screencap','-p']));}catch{}fs.writeFileSync(out+'/HOLD.txt',e.stack+'\n'+(page?await page.locator('body').innerText().catch(()=>'' ):''));throw e}
finally{try{fs.writeFileSync(out+'/logcat.txt',adb('logcat','-d','-t','1500'));}catch{}if(device)await device.close()}
