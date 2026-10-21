// This tests executable assets extracted from the actual signed APK in Chromium.
// It is deliberately not an Android runtime/device/install claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const [apk,proofFile]=process.argv.slice(2);if(!apk||!proofFile)throw Error('APK_AND_PROOF_REQUIRED');
const proof=JSON.parse(fs.readFileSync(proofFile,'utf8').replace(/^\uFEFF/,''));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-apk-world-')),entry=path.join(dir,'index.html');
const py=spawnSync('python',['-c',"import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert 'classes.dex' in z.namelist(); open(sys.argv[2],'wb').write(z.read('assets/index.html'))",apk,entry],{encoding:'utf8'});
if(py.status!==0)throw Error('APK_EXTRACT_HOLD:'+py.stderr);
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(apk)),proof.apk_sha256);assert.equal(sha(fs.readFileSync(entry)),proof.asset_sha256);
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(entry).href);
  await page.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()),null,{timeout:20000});
  const initial=await page.evaluate(()=>window.JMRenderedWorldReadback());
  assert.equal(initial.world.spaces,3);assert.equal(initial.snapshot.active,0);assert.ok(initial.pixels.painted>20000);
  const button=page.locator('[aria-label="Move right"]'),box=await button.boundingBox();assert.ok(box);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.waitForTimeout(220);await page.mouse.up();
  const after=await page.evaluate(()=>window.JMConnectedWorldReadback());
  assert.ok(after.session.rooms[0].snapshot.player.x>initial.snapshot.rooms[0].snapshot.player.x+5);
  assert.deepEqual(errors,[]);
  const result={schema:'jm.connected-world.apk-asset-browser/1',status:'SIGNED_APK_ASSET_EXECUTES_IN_CHROMIUM',apk_sha256:proof.apk_sha256,asset_sha256:proof.asset_sha256,viewport:'390x844',connectedSpaces:3,paintedCanvas:true,directionalInputConsequence:true,androidRuntime:false,physicalDevice:false};
  fs.writeFileSync(path.join(path.dirname(proofFile),'APK_ASSET_BROWSER_PROOF.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}
