import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const base=process.env.JM_ROUTEOS_BASE||'http://127.0.0.1:4177';
const donor='games-beyond/bodies/aiming-run-v0-1a.html';
const raw=fs.readFileSync(donor);
const blob=crypto.createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');
assert.equal(blob,'d737b7a05eeed657fbe3934a1e16d65c23cf9e61');
const html=fs.readFileSync('games-beyond/routeos/runtime/index.html','utf8');
assert.ok(html.includes('JM_GAMECORE_AIMING_RUN_ROUTEOS_RECEIVER_v0_1.js'));
assert.ok(html.includes('window.JMRouteOSHostPort'));
assert.ok(html.includes('JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js'));
const store='JM_ROUTEOS_PUBLIC_RUNTIME_v0_8';
const browser=await chromium.launch({headless:true});
const laptop=await browser.newContext({viewport:{width:1250,height:920}});
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
try{
 const a=await laptop.newPage();await a.goto(base+'/games-beyond/routeos/runtime/',{waitUntil:'networkidle'});
 await a.locator('[data-screen="bay"]').click();
 assert.equal(await a.locator('#jmGcCart').count(),1,'Exact-body mount must appear once');
 await a.locator('#jmGcLaunch').click();
 await a.waitForFunction(()=>window.JMAimingRouteOS?.running(),{timeout:12000});
 const donorProof=await a.evaluate(()=>{
  const host=window.JMAimingRouteOS,game=host.game();
  return {verified:game.projectBody().schema,hash:game.projectBody().source.sha256,
    source:host.sourceBlob,tracks:game.state.tracks.length,
    receipts:JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')).receipts.filter(x=>x.type==='HOST_GAMECORE').map(x=>x.text)}
 });
 assert.equal(donorProof.verified,'JM.AimingRunBody/0.1');
 assert.equal(donorProof.hash,'1d1fe40eb421bd4b9d7c2565e69af48b77041818ed48d8997aae2d112bc37aa7');
 assert.equal(donorProof.tracks,5);
 assert.ok(donorProof.receipts.includes('GAMECORE_MOUNT'));
 const gameFrame=a.frameLocator('#jmGcSource');
 await gameFrame.locator('#startRun').click();
 const runStart=await a.evaluate(()=>{const s=window.JMAimingRouteOS.game().state;return {running:s.running,x:s.target.x,age:s.target.age}});
 assert.equal(runStart.running,true);
 await a.waitForTimeout(380);
 const move=await a.evaluate(()=>{const s=window.JMAimingRouteOS.game().state;return {x:s.target.x,age:s.target.age}});
 assert.ok(move.age>runStart.age,'Original GameCore target age must move under actual source runner');
 assert.ok(move.x<runStart.x,'Original GameCore world pressure must move its target');
 const canvas=gameFrame.locator('#arena');
 const rect=await canvas.boundingBox();
 const l=await a.evaluate(()=>{
  const f=window.JMAimingRouteOS.frame(),s=f.contentWindow.AimingRun.state;
  return {x:s.launcher.x,y:s.launcher.y};
 });
 await a.mouse.move(rect.x+l.x,rect.y+l.y);await a.mouse.down();
 await a.mouse.move(rect.x+l.x-70,rect.y+l.y+54,{steps:4});await a.mouse.up();
 const action=await a.evaluate(()=>{
  const s=window.JMAimingRouteOS.game().state;
  return {shots:s.shots,realShot:s.receipts.some(x=>x.reason==='Shot released'),
  proofOnly:s.receipts.some(x=>x.reason==='Proof-only simulated hit')};
 });
 assert.ok(action.shots>=1,'Original Aiming Run pointer shot must execute');
 assert.equal(action.realShot,true);
 assert.equal(action.proofOnly,false);
 await gameFrame.locator('#startRun').click(); // source-native pause before capture
 await a.locator('#jmGcHost button').filter({hasText:'SAVE TRACK PROGRESS'}).click();
 const recorded=await a.evaluate(()=>window.JMAimingRouteOS.local());
 assert.equal(recorded.schema,'JM.GameCore.RouteOSProgress/0.1');
 assert.equal(recorded.track,0);
 assert.equal(recorded.evidence.last_source_reason,'Run paused');
 assert.ok(recorded.evidence.source_receipt_count>1);
 await a.locator('#jmGcHost button').filter({hasText:'SEND TO JM BUS'}).click();
 const pack=await a.evaluate(()=>window.JMAimingRouteOS.bundle());
 assert.equal(pack.packets.length,1);
 assert.equal(pack.packets[0].payload.progress.evidence.game_receipt_count,undefined);
 assert.equal(pack.packets[0].payload.progress.evidence.source_receipt_count,recorded.evidence.source_receipt_count); // host receipt does not mutate original game source receipts
 const b=await mobile.newPage();await b.goto(base+'/games-beyond/routeos/runtime/',{waitUntil:'networkidle'});
 const imported=await b.evaluate(d=>window.JMAimingRouteOS.importBundle(d),pack);
 assert.equal(imported.imported,1);
 await b.locator('[data-screen="bay"]').click();await b.locator('#jmGcLaunch').click();
 await b.waitForFunction(()=>window.JMAimingRouteOS?.running(),{timeout:12000});
 const packetResult=await b.evaluate(id=>window.JMAimingRouteOS.restorePacket(id),pack.packets[0].id);
 assert.equal(packetResult.track,0);
 assert.equal(packetResult.evidence.source_receipt_head,recorded.evidence.source_receipt_head);
 const receiver=await b.evaluate(key=>{
  const h=window.JMAimingRouteOS,os=JSON.parse(localStorage.getItem(key));
  return {sourceHead:h.game().state.previousHash,unlocked:h.game().state.unlocked,
    installed:os.installed.length,restored:os.receipts.some(x=>x.type==='HOST_GAMECORE'&&x.text==='GAMECORE_PROGRESS_RESTORED')};
 },store);
 assert.equal(receiver.unlocked,1);
 assert.ok(receiver.installed===0,'Source adapter cannot secretly install generic declarative cartridges');
 assert.ok(receiver.restored,'Recipient native RouteOS must issue its own GameCore host receipt');
 await b.locator('#jmGcHost button').filter({hasText:'RETURN TO CONSOLE'}).click();
 await b.locator('[data-screen="bay"]').click();
 await b.locator('[data-launch="seed-runner"]').click();
 await b.locator('#saveBtn').click();
 const originalNative=await b.evaluate(key=>JSON.parse(localStorage.getItem(key)).saves['seed-runner'],store);
 assert.equal(originalNative.recordType,'JMConsoleCartridgeSave','Existing RouteOS native gameplay must still save independently');
 const invalid=JSON.parse(JSON.stringify(pack));invalid.source_blob='wrong';
 const priorCount=await b.evaluate(()=>window.JMAppsToolsSpine.read().length);
 await assert.rejects(b.evaluate(d=>window.JMAimingRouteOS.importBundle(d),invalid),/Unverified GameCore transfer/);
 assert.equal(await b.evaluate(()=>window.JMAppsToolsSpine.read().length),priorCount);
 console.log('PASS: verified exact Aiming Run Git blob; GameCore real target pressure + pointer shot; native RouteOS host receipts; same JM packet bus; independent mobile receiver progress; original Seed Runner native save intact.');
}finally{await browser.close()}
