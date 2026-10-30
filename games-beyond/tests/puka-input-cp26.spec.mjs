import {test,expect} from '@playwright/test';
const door='./puka/';
async function boot(page){
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(door,{waitUntil:'networkidle'});
 await expect(page.locator('#tableState')).toBeVisible();
 await expect(page.locator('#pukaInputGuide')).toHaveCount(1);
 return errors;
}
test('@puka-input original PUKA keyboard actually deals/folds/saves/starts another hand',async({page})=>{
 const errors=await boot(page);
 await page.keyboard.press('n');
 await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
 await page.keyboard.press('f');
 await expect(page.locator('html')).toHaveAttribute('data-hand-state','ended');
 const folded=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-puka-v12a')));
 expect(folded.history[0].endReason).toBe('fold');
 expect(folded.profile.folds).toBeGreaterThan(0);
 const previous=folded.handNo;
 await page.keyboard.press('n');
 await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-puka-v12a')).handNo)).toBe(previous+1);
 expect(errors).toEqual([]);
});
test('@puka-input keyboard raise size uses existing game legal options, bankroll and decision evidence',async({page})=>{
 const errors=await boot(page);
 await page.keyboard.press('n');
 await expect(page.locator('#actions [data-open-raise]')).toHaveCount(1);
 await page.keyboard.press('r');
 await expect(page.locator('#raiseTray')).toBeVisible();
 const options=await page.locator('#raiseTray [data-raise-to]').count();
 expect(options).toBeGreaterThan(0);
 const target=Number(await page.locator('#raiseTray [data-raise-to]').first().getAttribute('data-raise-to'));
 await page.keyboard.press('1');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-puka-v12a')));
 expect(saved.profile.sizedRaises).toBeGreaterThan(0);
 expect(saved.profile.decisions).toBeGreaterThan(0);
 const actions=saved.state.actions.filter(a=>a.who==='player'&&a.action==='raise');
 expect(actions.length).toBeGreaterThan(0);
 expect(actions[0].totalBet??actions[0].target).toBe(target);
 expect(errors).toEqual([]);
});
test('@puka-input gamepad held buttons are edge-triggered and select actual PUKA raise targets',async({page})=>{
 await page.addInitScript(()=>{
  const p={index:0,id:'CP26 simulated controller',connected:true,buttons:Array.from({length:18},()=>({pressed:false})),axes:[0,0,0,0]};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[p],configurable:true});
  window.__proofPad=p;
 });
 const errors=await boot(page);
 await expect(page.locator('#pukaInputGuide')).toHaveAttribute('data-controller','on');
 await page.keyboard.press('n');
 const setButton=(index,pressed)=>page.evaluate(([i,val])=>{window.__proofPad.buttons[i].pressed=val},[index,pressed]);
 await setButton(3,true); // Y: original PUKA raise tray
 await expect(page.locator('#raiseTray')).toBeVisible();
 await page.waitForTimeout(160); // holding must not keep toggling it
 await expect(page.locator('#raiseTray')).toBeVisible();
 await setButton(3,false);await page.waitForTimeout(60);
 await setButton(5,true); // RB: select distinct legal raise size
 await expect(page.locator('#raiseTray .jm-pad-selected')).toHaveCount(1);
 const selectedTarget=Number(await page.locator('#raiseTray .jm-pad-selected').getAttribute('data-raise-to'));
 await setButton(5,false);await page.waitForTimeout(60);
 await setButton(0,true); // A: commit selected raise through actual poker rules
 await expect(page.locator('#raiseTray')).toBeHidden();
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-puka-v12a')));
 expect(s.state.actions.filter(a=>a.who==='player'&&a.action==='raise')[0].totalBet).toBe(selectedTarget);
 expect(errors).toEqual([]);
});
test('@puka-input keyboard review and escape preserve nonplaying controls',async({page})=>{
 const errors=await boot(page);
 await page.keyboard.press('e');
 await expect(page.locator('#evidenceDrawer')).toHaveAttribute('open','');
 await page.keyboard.press('n');
 await page.keyboard.press('r');
 await expect(page.locator('#raiseTray')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#raiseTray')).toBeHidden();
 expect(errors).toEqual([]);
});
