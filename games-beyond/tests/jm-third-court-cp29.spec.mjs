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
