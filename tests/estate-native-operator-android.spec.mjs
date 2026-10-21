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
async function move(axis,value){const r=await read(),p=r.session.rooms[r.session.active].snapshot.player,positive=p[axis]<value,key=axis==='x'?(positive?'ArrowRight':'ArrowLeft'):(positive?'ArrowDown':'ArrowUp');await page.locator('#cv').focus();await page.keyboard.down(key);try{await page.waitForFunction(({axis,value,positive})=>{const r=window.JMConnectedWorldReadback(),p=r.session.rooms[r.session.active].snapshot.player;return positive?p[axis]>=value:p[axis]<=value},{axis,value,positive},{timeout:16000});}finally{await page.keyboard.up(key)}}
try{
  adb('install','-r',apk);const manifest=adb('shell','dumpsys','package',pkg);fs.writeFileSync(out+'/installed-package.txt',manifest);assert.ok(manifest.includes(pkg));assert.ok(!manifest.includes('android.permission.INTERNET'),'OFFLINE_PACKAGE_PERMISSION_HOLD');
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await connect();
  const first=await page.evaluate(()=>window.JMRenderedWorldReadback());assert.ok(first.pixels.painted>20000);assert.equal(first.snapshot.active,0);
  adb('shell','uiautomator','dump','/sdcard/jm-window.xml');const ui=adb('shell','cat','/sdcard/jm-window.xml');const bounds=ui.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]/);const top=bounds?Number(bounds[2]):Math.round(24*(await page.evaluate(()=>devicePixelRatio)));
  const box=await page.locator('[aria-label="Move right"]').boundingBox(),dpr=await page.evaluate(()=>devicePixelRatio),x=Math.round((box.x+box.width/2)*dpr),y=top+Math.round((box.y+box.height/2)*dpr);
  adb('shell','input','swipe',String(x),String(y),String(x),String(y),'450');await page.waitForTimeout(150);
  assert.ok((await read()).session.rooms[0].snapshot.player.x>first.snapshot.rooms[0].snapshot.player.x+5,'NATIVE_TOUCH_MOVEMENT_HOLD');
  await move('x',210);await move('y',130);await page.locator('#jm-space-use').click();assert.ok((await read()).session.collected.includes('key-0'));
  await move('y',75);await move('x',800);await move('y',285);await page.locator('#jm-space-use').click();assert.equal((await read()).session.active,1);
  await page.evaluate(()=>{window.JMHostPauseSaved=false});adb('shell','input','keyevent','KEYCODE_HOME');await page.waitForFunction(()=>window.JMHostPauseSaved===true,null,{timeout:10000});
  const saved=await read();assert.equal(await page.evaluate(()=>window.JMRenderedWorldReadback().paused),true);
  adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await page.waitForTimeout(200);assert.deepEqual((await read()).session,saved.session);
  fs.writeFileSync(out+'/android-screen.png',execFileSync('adb',['exec-out','screencap','-p']));
  adb('shell','am','force-stop',pkg);adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await connect();assert.deepEqual((await read()).session,saved.session);
  const installedPath=adb('shell','pm','path',pkg).replace(/^package:/,'');adb('pull',installedPath,out+'/installed-exact.apk');assert.equal(sha(fs.readFileSync(out+'/installed-exact.apk')),proof.apk_sha256);fs.unlinkSync(out+'/installed-exact.apk');
  await page.evaluate(()=>{const k='JM_GAMEFORGE_CONNECTED_WORLD_v1_burning_5_700',e=JSON.parse(window.JMWorldStorage.getItem(k));e.body+=' ';window.JMWorldStorage.setItem(k,JSON.stringify(e))});
  await page.reload();await page.waitForFunction(()=>document.getElementById('jm-world-title').textContent.startsWith('WORLD HOLD'));assert.match(await page.locator('#jm-world-title').innerText(),/SPACES_STORAGE_HASH_HOLD/);
  assert.deepEqual(errors,[]);
  const result={schema:'jm.connected-world.android-runtime/1',status:'ANDROID_EMULATOR_RUNTIME_PASS',sourceHead:proof.source_head,apk_sha256:proof.apk_sha256,asset_sha256:proof.asset_sha256,androidAPI:adb('shell','getprop','ro.build.version.sdk'),abi:adb('shell','getprop','ro.product.cpu.abi'),webview:adb('shell','dumpsys','webviewupdate'),installed:true,launched:true,nativeTouchMovement:true,doorTraversal:true,lifecyclePause:true,processDeathExactRecovery:true,hashTamperHold:true,offlinePermissionBoundary:true,privilegedJSBridge:false,physicalDevice:false,release:false};
  fs.writeFileSync(out+'/ANDROID_RUNTIME_PROOF.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){fs.writeFileSync(out+'/HOLD.txt',e.stack+'\n'+(page?await page.locator('body').innerText().catch(()=>'' ):''));throw e}
finally{try{fs.writeFileSync(out+'/logcat.txt',adb('logcat','-d','-t','1500'));}catch{}if(device)await device.close()}
