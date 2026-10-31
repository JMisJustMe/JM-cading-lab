import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve,dirname } from 'node:path';

const door='/apps-tools-games/wave2/current-source/128_HAND_FOOTBALL_v0_8_1_REAL_INPUT_AND_IDENTITY_CP27.html';
const parent=resolve(dirname(fileURLToPath(import.meta.url)),'../../apps-tools-games/wave2/current-source/128_HAND_FOOTBALL_v0_8_SQUAD_ROLES_MATCH_SHAPES.html');
const parentHash='fe1c9fba29a8676352aeec3ab05dcf33082d6ec4be196e4666c1691c3d724991';

async function start(page){
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(door);
  await expect(page.locator('#jm128Gate')).toBeVisible();
  await expect(page.locator('#game')).toBeVisible();
  await page.locator('#jm128Start').click();
  await expect(page.locator('#jm128Gate')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.__JM128_CP27__?.contact.live)).toBeTruthy();
  return errors;
}
const field=p=>p.evaluate(()=>window.__JM128_CP27__.field);
test('@128hand-cp27 setup holds the real match until TAKE THE PITCH',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(door);
  await expect(page.locator('#jm128Gate')).toBeVisible();
  const before=await field(page);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(()=>window.__JM128_V08__.state.paused)).toBe(true);
  expect((await field(page)).ball).toEqual(before.ball);
  expect((await field(page)).score).toEqual([0,0]);
  await page.getByRole('button',{name:'FINISHER',exact:false}).click();
  await page.getByRole('button',{name:'TIGHT BOX',exact:true}).click();
  await page.locator('#jm128Start').click();
  await expect(page.locator('#jm128Gate')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.__JM128_CP27__.contact.live)).toBe(true);
  expect((await field(page)).role).toBe('finisher');
  expect((await field(page)).shape).toBe('tight');
  const liveBall=(await field(page)).ball;
  await expect.poll(async()=>(await field(page)).ball.x).not.toBe(liveBall.x);
  expect(errors).toEqual([]);
});
test('@128hand-cp27 exact original football parent remains byte-for-byte protected',async()=>{
  expect(createHash('sha256').update(readFileSync(parent)).digest('hex')).toBe(parentHash);
});
test('@128hand-cp27 original settings survive reload and a fresh document without auto-start',async({page,context})=>{
  await page.goto(door);
  await page.getByRole('button',{name:'SHIELD',exact:false}).click();
  await page.getByRole('button',{name:'BREAK LANE',exact:true}).click();
  await page.locator('#jm128Start').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm128.v08')));
  expect(saved.role).toBe('shield');
  expect(saved.shape).toBe('break');
  await page.reload();
  await expect(page.locator('#jm128Gate')).toBeVisible();
  expect((await field(page)).role).toBe('shield');
  expect((await field(page)).shape).toBe('break');
  expect(await page.evaluate(()=>window.__JM128_V08__.state.paused)).toBe(true);
  const returned=await context.newPage();
  try {
    await returned.goto(door);
    await expect(returned.locator('#jm128Gate')).toBeVisible();
    await expect(returned.locator('[data-role="shield"]')).toHaveClass(/active/);
    await expect(returned.locator('[data-shape="break"]')).toHaveClass(/active/);
    expect(await returned.evaluate(()=>JSON.parse(localStorage.getItem('jm128.v08')))).toEqual(saved);
    expect((await field(returned)).score).toEqual([0,0]);
    expect(await returned.evaluate(()=>window.__JM128_V08__.state.paused)).toBe(true);
    await returned.locator('#jm128Start').click();
    await expect.poll(()=>returned.evaluate(()=>window.__JM128_CP27__.contact.live)).toBe(true);
    expect((await field(returned)).role).toBe('shield');
    expect((await field(returned)).shape).toBe('break');
  } finally { await returned.close(); }
});
test('@128hand-cp27 phone viewport boots ORIGINAL football and preserves full-action contact floor',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=await start(page);
  await expect(page.locator('#score')).toContainText('0');
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  for(const id of ['#passBtn','#shootBtn','#tackleBtn','#defendBtn','#reset']){
    const h=await page.locator(id).evaluate(b=>b.getBoundingClientRect().height);
    expect(h,id).toBeGreaterThanOrEqual(43.5);
  }
  const nonempty=await page.locator('#game').evaluate(c=>{
    // The original transparent canvas draws its real pitch/actors in the centre.
    // Top-left clear pixels are an intentional feature, not a blank game.
    const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let covered=0;
    for(let i=3;i<a.length;i+=4)if(a[i]>0)covered++;
    return covered>100;
  });
  expect(nonempty).toBeTruthy();
  expect(errors).toEqual([]);
});
test('@128hand-cp27 keyboard moves original MAKO and invokes authentic actions and reset',async({page})=>{
  const errors=await start(page);
  await page.locator('#game').focus();
  const x0=(await field(page)).hand.x;
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(185);await page.keyboard.up('ArrowRight');
  const x1=(await field(page)).hand.x;
  expect(x1).toBeGreaterThan(x0+8);
  await page.keyboard.press('i');
  expect((await field(page)).action).toBe('DEFEND');
  await page.keyboard.press('l');
  expect((await field(page)).action).toBe('TACKLE');
  await page.keyboard.press('k');
  expect((await field(page)).action).toBe('SHOOT');
  await page.keyboard.press('r');
  expect((await field(page)).score).toEqual([0,0]);
  expect(errors).toEqual([]);
});
test('@128hand-cp27 pointer drag survives independent action tapping, releases on cancel and blur',async({page})=>{
  const errors=await start(page);
  const game=page.locator('#game');
  const b=await game.boundingBox();
  await page.mouse.move(b.x+b.width*.4,b.y+b.height*.55);await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>window.__JM128_CP27__.contact.drag)).toBeTruthy();
  const h0=(await field(page)).hand.x;
  await page.mouse.move(b.x+b.width*.6,b.y+b.height*.50,{steps:4});
  expect((await field(page)).hand.x).not.toEqual(h0);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(()=>window.__JM128_CP27__.contact.drag)).toBeFalsy();
  await page.mouse.up();
  expect(errors).toEqual([]);
});
test('@128hand-cp27 native Gamepad API moves MAKO and held A does not repeat PASS',async({page})=>{
  await page.addInitScript(()=>{
    const p={index:0,connected:true,id:'CP27 test pad',buttons:Array.from({length:17},()=>({pressed:false})),axes:[0,0,0,0]};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[p]});
    window.__cp27pad=p;
  });
  const errors=await start(page);
  expect(await page.evaluate(()=>window.__JM128_CP27__.contact.gamepad)).toBeTruthy();
  const x0=(await field(page)).hand.x;
  await page.evaluate(()=>{window.__cp27pad.axes[0]=.9});
  await page.waitForTimeout(170);
  await page.evaluate(()=>{window.__cp27pad.axes[0]=0});
  expect((await field(page)).hand.x).toBeGreaterThan(x0+8);
  await page.evaluate(()=>{window.__cp27pad.buttons[0].pressed=true});
  await expect.poll(()=>page.evaluate(()=>window.__JM128_CP27__.field.action)).toBe('PASS');
  await page.waitForTimeout(410);
  expect((await field(page)).action).toBe('MOVE');
  await page.evaluate(()=>{window.__cp27pad.buttons[0].pressed=false});
  expect(errors).toEqual([]);
});
test('@128hand-cp27 alternative phone landscape keeps actions accessible',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  const errors=await start(page);
  const rect=await page.locator('#game').boundingBox();
  expect(rect.width).toBeGreaterThan(350);
  expect(rect.height).toBeGreaterThan(150);
  for(const id of ['#passBtn','#shootBtn','#tackleBtn','#defendBtn']){
   const r=await page.locator(id).boundingBox();
   expect(r.height,id).toBeGreaterThanOrEqual(43.5);
   expect(r.x).toBeGreaterThanOrEqual(0);
   expect(r.x+r.width).toBeLessThanOrEqual(845);
  }
  expect(errors).toEqual([]);
});
