import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.JM_CONTACT_BASE||'http://127.0.0.1:4177';
const route='/games-beyond/routeos/runtime/';
const key='JM_ROUTEOS_PUBLIC_RUNTIME_v0_8';
const browser=await chromium.launch({headless:true});
const desktop=await browser.newContext({viewport:{width:1180,height:840}});
const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2,hasTouch:true});
try{
 const a=await desktop.newPage();await a.goto(base+route,{waitUntil:'networkidle'});
 assert.ok(await a.evaluate(()=>Boolean(window.JMAppsToolsSpine&&window.JMRouteOSNativeBridge)));
 await a.locator('[data-screen="bay"]').click();
 await a.locator('[data-launch="seed-runner"]').click();
 await a.waitForTimeout(100);
 await a.keyboard.down('ArrowRight');await a.waitForTimeout(500);await a.keyboard.up('ArrowRight');
 await a.locator('#saveBtn').click();
 const before=await a.evaluate(key=>JSON.parse(localStorage.getItem(key)).saves['seed-runner'],key);
 assert.ok(before.state.player.x>120,'Live original RouteOS gameplay moved before saving');
 await a.locator('[data-screen="vault"]').click();
 await a.locator('#screen-vault button').filter({hasText:'SEND NATIVE SAVE'}).first().click();
 const sent=await a.evaluate(()=>window.JMRouteOSNativeBridge.exportBundle());
 assert.equal(sent.packets.length,1);
 assert.equal(sent.packets[0].payload.save.state.player.x,before.state.player.x);
 const b=await phone.newPage();await b.goto(base+route,{waitUntil:'networkidle'});
 assert.ok(await b.evaluate(()=>Boolean(window.JMAppsToolsSpine&&window.JMRouteOSNativeBridge)));
 const receipt=await b.evaluate(bundle=>{
  const c=window.JMRouteOSNativeBridge;
  c.importBundle(bundle);return c.restore(bundle.packets[0].id);
 },sent);
 assert.equal(receipt.status,'NATIVE_SAVE_RESTORED_RELOAD_REQUIRED');
 await b.reload({waitUntil:'networkidle'});
 await b.locator('[data-screen="bay"]').click();
 await b.locator('[data-load="seed-runner"]').click();
 await b.waitForTimeout(120);
 await b.locator('#saveBtn').click();
 const after=await b.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(after.saves['seed-runner'].state.player.x,before.state.player.x,'Native resume must inherit original live position');
 assert.ok(after.receipts.some(x=>x.type==='SAVE'),'Native recipient generated its own SAVE receipt');
 assert.ok(after.receipts.some(x=>x.type==='PLAY'),'Native recipient generated its own PLAY receipt');
 assert.ok(after.receipts.some(x=>x.type==='BRIDGE_IMPORT'),'Bridge import is distinguishable from native play receipt');
 assert.equal(after.saves['seed-runner'].namespace,'routeos.seed-runner.jm');
 // Exercise two more existing, distinct first-party game bodies and preserve their separate game state.
 await a.locator('[data-screen="bay"]').click();
 await a.locator('[data-launch="pulse-orbit"]').click();
 await a.locator('#actionBtn').click();
 await a.locator('#saveBtn').click();
 await a.locator('[data-screen="bay"]').click();
 await a.locator('[data-launch="rebound-route"]').click();
 await a.locator('#actionBtn').click();
 await a.locator('#saveBtn').click();
 const extra=await a.evaluate(()=>{
  const bridge=window.JMRouteOSNativeBridge;
  const os=bridge.osRead();
  return {pulse:os.saves['pulse-orbit'],rebound:os.saves['rebound-route'],
   p1:bridge.publish('pulse-orbit'),p2:bridge.publish('rebound-route')};
 });
 assert.ok(extra.pulse.state.shots>=1,'Pulse Orbit existing native action must be reflected in saved state');
 assert.ok(Array.isArray(extra.rebound.state.shots),'Rebound Route native projectiles must persist in saved state');
 const more=await a.evaluate(()=>window.JMRouteOSNativeBridge.exportBundle());
 const two={...more,packets:more.packets.filter(p=>['pulse-orbit','rebound-route'].includes(p.payload.save.cartridgeId))};
 assert.equal(two.packets.length,2);
 const importedMore=await b.evaluate(bundle=>{
  const bridge=window.JMRouteOSNativeBridge;
  bridge.importBundle(bundle);
  return bundle.packets.map(p=>bridge.restore(p.id).status);
 },two);
 assert.equal(importedMore.length,2);
 assert.ok(importedMore.every(x=>x==='NATIVE_SAVE_RESTORED_RELOAD_REQUIRED'));
 await b.reload({waitUntil:'networkidle'});
 await b.locator('[data-screen="bay"]').click();
 await b.locator('[data-load="pulse-orbit"]').click();
 await b.locator('#saveBtn').click();
 await b.locator('[data-screen="bay"]').click();
 await b.locator('[data-load="rebound-route"]').click();
 await b.locator('#saveBtn').click();
 const allThree=await b.evaluate(key=>JSON.parse(localStorage.getItem(key)).saves,key);
 assert.ok(allThree['seed-runner']&&allThree['pulse-orbit']&&allThree['rebound-route']);
 assert.equal(allThree['pulse-orbit'].state.shots,extra.pulse.state.shots);
 assert.equal(allThree['rebound-route'].state.id,'rebound-route');

 // Reverse physical-route simulation: phone viewport changes real gameplay, then a fresh desktop receives it.
 await b.locator('[data-screen="bay"]').click();
 await b.locator('[data-load="seed-runner"]').click();
 await b.locator('#dashBtn').click();
 await b.locator('#saveBtn').click();
 const mobileChanged=await b.evaluate(key=>JSON.parse(localStorage.getItem(key)).saves['seed-runner'],key);
 assert.ok(mobileChanged.state.player.x>before.state.player.x,'Mobile browser had to create a new actual gameplay consequence');
 const mobileReturn=await b.evaluate(()=>{
  const api=window.JMRouteOSNativeBridge;
  const sent=api.publish('seed-runner');
  return {...api.exportBundle(),packets:api.exportBundle().packets.filter(p=>p.id===sent.packetId)};
 });
 assert.equal(mobileReturn.packets.length,1);
 const freshLaptop=await browser.newContext({viewport:{width:1300,height:850}});
 const c=await freshLaptop.newPage();
 await c.goto(base+route,{waitUntil:'networkidle'});
 const backward=await c.evaluate(bundle=>{
  const api=window.JMRouteOSNativeBridge;
  api.importBundle(bundle);
  return api.restore(bundle.packets[0].id);
 },mobileReturn);
 assert.equal(backward.status,'NATIVE_SAVE_RESTORED_RELOAD_REQUIRED');
 await c.reload({waitUntil:'networkidle'});
 await c.locator('[data-screen="bay"]').click();
 await c.locator('[data-load="seed-runner"]').click();
 await c.locator('#saveBtn').click();
 const reverse=await c.evaluate(key=>JSON.parse(localStorage.getItem(key)).saves['seed-runner'],key);
 assert.equal(reverse.state.player.x,mobileChanged.state.player.x);
 assert.equal(reverse.namespace,'routeos.seed-runner.jm');
 await freshLaptop.close();
 console.log('JM BOUNDED REAL BROWSER CONTACT PASS: 3 independent native cartridges via actual AppsTools bus; desktop -> mobile LOAD/PLAY/SAVE, changed Seed Runner on mobile -> fresh desktop LOAD/PLAY/SAVE. Original position '+before.state.player.x+'; return '+reverse.state.player.x);
}finally{await browser.close()}
