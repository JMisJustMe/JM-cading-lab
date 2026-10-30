import {test,expect} from '@playwright/test';
const door='/wave2-public/current-source/cardbored/CP28_cardBORED_NATIVE_CONTACT.html';
async function boot(page){
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(door);
 await expect(page.locator('#playerRow .slot')).toHaveCount(3);
 await expect(page.locator('#cpuRow .slot')).toHaveCount(3);
 await expect(page.locator('#jmCB5Btn')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Boolean(window.JM_CARDBORED_CP28&&window.JM_CARDBORED_V05))).toBeTruthy();
 return errors;
}
test('@cardbored-cp28 actual original v0.5 boots with 4 houses / boards and phone touch contact',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=await boot(page);
 const house=await page.evaluate(()=>window.JM_CARDBORED_V05.houses);
 const boards=await page.evaluate(()=>window.JM_CARDBORED_V05.boards);
 expect(house).toHaveLength(4);expect(boards).toHaveLength(4);
 const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 const height=await page.locator('#jmCB5Btn').evaluate(b=>b.getBoundingClientRect().height);
 expect(height).toBeGreaterThanOrEqual(44);
 expect(errors).toEqual([]);
});
test('@cardbored-cp28 keyboard card → legal board target → original commit and combat evidence',async({page})=>{
 const errors=await boot(page);
 const before=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 const affordable=before.hand.findIndex(c=>c.cost<=before.energy);
 expect(affordable).toBeGreaterThanOrEqual(0);
 await page.keyboard.press(String(affordable+1));
 await expect.poll(()=>page.evaluate(()=>window.JM_CARDBORED_CP28.state.selectedCard)).toBe(affordable);
 const chosen=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 expect(chosen.legal.length).toBeGreaterThan(0);
 await page.keyboard.press('ArrowDown');
 await expect.poll(()=>page.evaluate(()=>window.JM_CARDBORED_CP28.state.selectedTarget)).not.toBeNull();
 await page.keyboard.press('Enter');
 await expect.poll(()=>page.evaluate(()=>window.JM_CARDBORED_CP28.state.trace.some(t=>t.body==='CONTACTCODE')),{timeout:7000}).toBeTruthy();
 const after=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 expect(after.trace.some(t=>t.body==='DS PROGRAM'||t.body==='CONTACTCODE')).toBeTruthy();
 expect(errors).toEqual([]);
});
test('@cardbored-cp28 genuine House + Pressure Board selection changes native core/board authority',async({page})=>{
 const errors=await boot(page);
 await page.keyboard.press('h');
 await expect(page.locator('.jmCB5Overlay')).toBeVisible();
 await page.locator('#jmCB5Houses .jmCB5Card').filter({hasText:'Bastion House'}).click();
 await page.locator('#jmCB5Boards .jmCB5Card').filter({hasText:'Long Wall'}).click();
 await page.locator('#jmCB5Apply').click();
 await expect(page.locator('.jmCB5Overlay')).toBeHidden();
 const after=await page.evaluate(()=>({data:window.JM_CARDBORED_CP28.state,core:document.querySelector('#youCore').textContent,round:document.querySelector('#roundText').textContent}));
 expect(after.data.core[0]).toBe(20);
 expect(after.round).toMatch(/1\s*\/\s*12/);
 expect(errors).toEqual([]);
});
test('@cardbored-cp28 physical button still dispatches original card and target click',async({page})=>{
 const errors=await boot(page);
 const cards=page.locator('#hand [data-card]');
 const available=await page.evaluate(()=>window.JM_CARDBORED_CP28.state.hand.findIndex(c=>c.cost<=window.JM_CARDBORED_CP28.state.energy));
 await cards.nth(available).click();
 const state=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 expect(state.selectedCard).toBe(available);
 await page.locator('.slot.legal').first().click();
 const chosen=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 expect(chosen.selectedTarget).not.toBeNull();
 expect(errors).toEqual([]);
});
test('@cardbored-cp28 gamepad edge does not commit repeated actions while held',async({page})=>{
 await page.addInitScript(()=>{
  const p={index:0,id:'CP28 simulated Gamepad',connected:true,buttons:Array.from({length:18},()=>({pressed:false})),axes:[0,0,0,0]};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[p]});
  window.__cp28Pad=p;
 });
 const errors=await boot(page);
 expect(await page.evaluate(()=>window.JM_CARDBORED_CP28.contact.padConnected)).toBeTruthy();
 await page.evaluate(()=>window.__cp28Pad.buttons[0].pressed=true);
 await expect.poll(()=>page.evaluate(()=>window.JM_CARDBORED_CP28.state.selectedCard)).not.toBeNull();
 const before=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 await page.waitForTimeout(220);
 const after=await page.evaluate(()=>window.JM_CARDBORED_CP28.state);
 expect(after.phase).toBe('decision');
 expect(after.selectedCard).toBe(before.selectedCard);
 await page.evaluate(()=>window.__cp28Pad.buttons[0].pressed=false);
 expect(errors).toEqual([]);
});
