import {test,expect} from '@playwright/test';

/* CP29 — ONLY real original THIRD COURT CP11, inherited CP11 input safety.
 * Simulated Gamepad API is browser input proof, not owner hardware proof. */
const door='/family-gifts/third-court-preview/cp11-ball-contact-candidate.html';
async function boot(page){
 await page.addInitScript(()=>{
  const p={id:'JM CP29 isolated input probe',index:0,connected:true,
   buttons:Array.from({length:18},()=>({pressed:false})),axes:[0,0,0,0]};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[p]});
  window.__jmCP29Pad=p;
 });
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(door);
 await expect(page.locator('#playQuick')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.JM_THIRD_COURT_CP29?.contact.connected)).toBeTruthy();
 return errors;
}
const button=(page,i,value)=>page.evaluate(([i,value])=>{window.__jmCP29Pad.buttons[i].pressed=value},[i,value]);
const axis=(page,x,y)=>page.evaluate(([x,y])=>{window.__jmCP29Pad.axes[0]=x;window.__jmCP29Pad.axes[1]=y},[x,y]);
const status=page=>page.evaluate(()=>JM_THIRD_COURT.status());
const input=page=>page.evaluate(()=>JM_THIRD_COURT_CP29.contact);

test('@thirdcourt-cp29 real 3v3 source and native 3 renderer fallback survive controller contact',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const a=await status(page);
 expect(a.active).toBeTruthy();
 expect(a.playerCount).toBe(6);
 expect(a.athletes.map(p=>p.role)).toEqual(['Floor General','Wing Shooter','Paint Anchor','Floor General','Wing Shooter','Paint Anchor']);
 expect(['CP11','CP12']).toContain(await page.evaluate(()=>JM_THIRD_COURT.version));
 expect(typeof a.visuals).toBe('string');
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp29 left-stick actually moves original ball handler through CP11 player physics',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const a=(await status(page)).athletes[0];
 await axis(page,.88,-.56);
 await expect.poll(async()=> (await status(page)).athletes[0].x).toBeGreaterThan(a.x+5);
 await expect.poll(async()=> (await status(page)).athletes[0].y).toBeLessThan(a.y-5);
 expect((await input(page)).moving).toBeTruthy();
 await axis(page,0,0);await expect.poll(async()=> (await input(page)).moving).toBeFalsy();
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp29 held A is exactly one original shot; release earns basketball shot without replay',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,0,true);
 await expect.poll(async()=>(await input(page)).shotHeld).toBeTruthy();
 await expect.poll(async()=> (await status(page)).charge).toBeGreaterThan(0.1);
 await page.waitForTimeout(1000);
 await button(page,0,false);
 await expect.poll(async()=> (await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots).toBeGreaterThan(0);
 const fired=(await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots;
 await page.waitForTimeout(200);
 expect((await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots).toBe(fired);
 expect((await input(page)).shotHeld).toBeFalsy();
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp29 controller tactical native CUT and SCREEN reach original teammates',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,3,true);
 await expect.poll(async()=> (await status(page)).cutCalls).toBe(1);
 await page.waitForTimeout(180);
 expect((await status(page)).cutCalls).toBe(1);
 await button(page,3,false);await page.waitForTimeout(50);
 await button(page,4,true);
 await expect.poll(async()=> (await status(page)).screenCalls).toBe(1);
 await button(page,4,false);
 expect((await status(page)).playerCount).toBe(6);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp29 RB guard holds real contact and focus loss clears input without shot',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,5,true);
 await expect.poll(async()=> (await status(page)).guardHeld).toBeTruthy();
 await button(page,0,true);
 await expect.poll(async()=> (await input(page)).shotHeld).toBeTruthy();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect.poll(async()=> (await status(page)).paused).toBeTruthy();
 expect((await input(page)).shotHeld).toBeFalsy();
 expect((await status(page)).guardHeld).toBeFalsy();
 expect((await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots).toBe(0);
 await button(page,0,false);await button(page,5,false);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp29 Start pauses and resumes without rapid-repeat; non-controller touch entry intact',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,9,true);
 await expect.poll(async()=> (await status(page)).paused).toBeTruthy();
 await page.waitForTimeout(160);
 expect((await status(page)).paused).toBeTruthy();
 await button(page,9,false);await page.waitForTimeout(65);
 await button(page,9,true);
 await expect.poll(async()=> (await status(page)).paused).toBeFalsy();
 await page.waitForTimeout(150);
 expect((await status(page)).paused).toBeFalsy();
 await button(page,9,false);
 await expect(page.locator('#joy')).toBeVisible();
 await expect(page.locator('#shoot')).toBeVisible();
 expect(errors).toEqual([]);
});
// CP30 explicit controller action coverage: original basketball, no synthetic game clone.
test('@thirdcourt-cp30 B triggers a real pass exactly once while held',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,1,true);
 await expect.poll(async()=>(await status(page)).air).toBe('pass');
 const events=(await input(page)).edgeEvents;
 await page.waitForTimeout(400);
 expect((await input(page)).edgeEvents).toBe(events);
 expect((await status(page)).playerCount).toBe(6);
 await button(page,1,false);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp30 X makes a real stamina-costing drive without held-button repeats',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,2,true);
 await expect.poll(async()=>(await status(page)).cutCount).toBe(1);
 const events=(await input(page)).edgeEvents;
 await page.waitForTimeout(260);
 expect((await status(page)).cutCount).toBe(1);
 expect((await input(page)).edgeEvents).toBe(events);
 await button(page,2,false);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp30 Back cycles the actual camera, preserving one match and no repeat',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const original=await page.locator('#rendererTag').innerText();
 const before=await status(page);
 await button(page,8,true);
 await expect.poll(()=>page.locator('#rendererTag').innerText()).not.toBe(original);
 const changed=await page.locator('#rendererTag').innerText();
 await page.waitForTimeout(200);
 expect(await page.locator('#rendererTag').innerText()).toBe(changed);
 await button(page,8,false);await page.waitForTimeout(80);
 await button(page,8,true);
 await expect.poll(()=>page.locator('#rendererTag').innerText()).not.toBe(changed);
 await button(page,8,false);
 const after=await status(page);
 expect(after.playerCount).toBe(before.playerCount);
 expect(after.score).toEqual(before.score);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp30 authoritative pad disappearance cancels held shot and guard, reconnects cleanly',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,5,true);
 await expect.poll(async()=>(await input(page)).guardHeld).toBeTruthy();
 await button(page,0,true);
 await expect.poll(async()=>(await input(page)).shotHeld).toBeTruthy();
 // Simulate a vanished Gamepad API slot while its cached JS object still says connected.
 await page.evaluate(()=>{
  window.__jmCP29PadList=[];
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__jmCP29PadList});
 });
 await expect.poll(async()=>(await input(page)).connected).toBeFalsy();
 expect((await input(page)).shotHeld).toBeFalsy();
 expect((await input(page)).guardHeld).toBeFalsy();
 expect((await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots).toBe(0);
 await page.evaluate(()=>{
  const p=window.__jmCP29Pad;
  p.buttons[0].pressed=false;p.buttons[5].pressed=false;
  window.__jmCP29PadList=[p];
  const event=new Event('gamepadconnected');
  Object.defineProperty(event,'gamepad',{value:p});
  window.dispatchEvent(event);
 });
 await expect.poll(async()=>(await input(page)).connected).toBeTruthy();
 await button(page,0,true);
 await expect.poll(async()=>(await input(page)).shotHeld).toBeTruthy();
 await page.waitForTimeout(1000);
 await button(page,0,false);
 await expect.poll(async()=>(await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots).toBe(1);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp30 primary pad owns gameplay through secondary and duplicate connect events',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 await button(page,5,true);
 await expect.poll(async()=>(await input(page)).guardHeld).toBeTruthy();
 const before=await input(page);
 await page.evaluate(()=>{
  const p=window.__jmCP29Pad;
  const repeated=new Event('gamepadconnected');
  Object.defineProperty(repeated,'gamepad',{value:p});
  window.dispatchEvent(repeated);
  const second={id:'secondary pad',index:1,connected:true,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false}))};
  const extra=new Event('gamepadconnected');
  Object.defineProperty(extra,'gamepad',{value:second});
  window.dispatchEvent(extra);
 });
 await page.waitForTimeout(150);
 const after=await input(page);
 expect(after.index).toBe(0);
 expect(after.guardHeld).toBeTruthy();
 expect(after.edgeEvents).toBe(before.edgeEvents);
 await button(page,5,false);
 await expect.poll(async()=>(await status(page)).guardHeld).toBeFalsy();
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp30 all three original renderer routes stay on identical 3v3 state',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const start=await status(page);
 await page.evaluate(()=>JM_THIRD_COURT.selectNativeCamera(1));
 await expect.poll(async()=>(await status(page)).depthCamera).toBeTruthy();
 expect((await status(page)).native3DActive).toBeFalsy();
 expect(await page.locator('#rendererTag').innerText()).toBe('SOFTWARE 3D');
 await page.evaluate(()=>JM_THIRD_COURT.selectNativeCamera(2));
 await expect.poll(async()=>(await status(page)).depthCamera).toBeFalsy();
 expect((await status(page)).native3DActive).toBeFalsy();
 expect(await page.locator('#rendererTag').innerText()).toBe('CLASSIC OVERHEAD');
 await page.evaluate(()=>JM_THIRD_COURT.selectNativeCamera(0));
 const end=await status(page);
 expect(end.native3DActive).toBe(end.native3DReady);
 expect(end.depthCamera).toBeTruthy();
 expect(end.playerCount).toBe(start.playerCount);
 expect(end.score).toEqual(start.score);
 expect(end.active).toBeTruthy();
 expect(errors).toEqual([]);
});

test('@thirdcourt-cp31 actual green meter is quicker on the same live shot',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const shooter=(await status(page)).athletes[0];
 expect(shooter.shotTempo).toBeGreaterThan(1);
 await button(page,0,true);
 await expect.poll(async()=>(await status(page)).charge,{timeout:850}).toBeGreaterThanOrEqual(.65);
 expect((await status(page)).charge).toBeLessThanOrEqual(1);
 await button(page,0,false);
 await expect.poll(async()=>(await page.evaluate(()=>JM_THIRD_COURT_CP29.match)).shots).toBe(1);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp31 six athletes have distinct actual body masses and shooting signatures',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const a=(await status(page)).athletes;
 expect(a).toHaveLength(6);
 expect(new Set(a.map(p=>p.name)).size).toBe(6);
 expect(new Set(a.map(p=>p.signature)).size).toBe(6);
 expect(new Set(a.map(p=>p.formWidth)).size).toBe(6);
 expect(new Set(a.map(p=>p.shotForm)).size).toBe(6);
 expect(new Set(a.map(p=>p.shotTempo)).size).toBe(6);
 // The original three court roles are still present on each team.
 expect(a.map(p=>p.role)).toEqual(['Floor General','Wing Shooter','Paint Anchor','Floor General','Wing Shooter','Paint Anchor']);
 const before=a.map(p=>({id:p.id,mass:p.contactMass}));
 await page.evaluate(()=>JM_THIRD_COURT.selectNativeCamera(2));
 const after=(await status(page)).athletes;
 expect(after.map(p=>({id:p.id,mass:p.contactMass}))).toEqual(before);
 expect(errors).toEqual([]);
});


test('@thirdcourt-cp32 Court Heat escalates with real match duration and rival deficit',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const initial=await status(page);
 expect(initial.heatLevel).toBe(0);
 const stages=await page.evaluate(()=>[
  JM_THIRD_COURT.courtHeat(120,'quick',[0,0]),
  JM_THIRD_COURT.courtHeat(90,'quick',[0,0]),
  JM_THIRD_COURT.courtHeat(58,'quick',[0,0]),
  JM_THIRD_COURT.courtHeat(28,'quick',[0,0]),
  JM_THIRD_COURT.courtHeat(118,'quick',[8,0]),
  JM_THIRD_COURT.courtHeat(60,'clutch',[0,0])
 ]);
 expect(stages).toEqual([0,1,2,3,1,0]);
 expect(initial.playerCount).toBe(6);
 expect(errors).toEqual([]);
});
test('@thirdcourt-cp32 JET signature first step changes the original driving burst and stamina',async({page})=>{
 const errors=await boot(page);
 await page.locator('#playQuick').click();
 const before=await status(page);
 expect(before.athletes[0].name).toBe('JET');
 // Observe live gameplay state in the same browser turn as the drive input:
 // the burst decays on each animation frame, so delayed polling cannot assert its initial value.
 const after=await page.evaluate(()=>{JM_THIRD_COURT.switchPlayer();return JM_THIRD_COURT.status()});
 expect(after.cutCount).toBe(1);
 expect(after.driveBoost).toBeGreaterThan(.40);
 expect(after.stamina).toBeGreaterThan(74);
 expect(after.stamina).toBeLessThan(81);
 expect(after.playerCount).toBe(6);
 expect(errors).toEqual([]);
});
