import { test, expect } from '@playwright/test';
const PATH='./crewbound-321/';
test('CREWBOUND CP01 starts with 3+2+1, readable controls and an actual canvas',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(PATH);
  await expect(page.locator('h1')).toContainText('3 + 2 + 1');
  await expect(page.locator('#roster .unit')).toHaveCount(6);
  await expect(page.locator('#formation')).toContainText('FLOOR 3 · YARD 2 · FLEX 1');
  const canvas=await page.locator('#arena').boundingBox();
  expect(canvas.width).toBeGreaterThan(250);expect(canvas.height).toBeGreaterThan(300);
  const summary=await page.evaluate(()=>({players:game.floor('player').length,rivals:game.floor('enemy').length,all:game.units.length}));
  expect(summary).toEqual({players:3,rivals:3,all:12});
  expect(errors).toEqual([]);
});
test('CREWBOUND CP01 touch selects two, taps target, commits opposed concurrent plans',async({page})=>{
  await page.goto(PATH);
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('#roster .unit').nth(1).click();
  await expect(page.locator('#pair')).toHaveText('2 / 2 READY');
  const before=await page.evaluate(()=>({p:game.floor('player')[0].x,e:game.floor('enemy')[0].y}));
  await page.locator('#arena').click({position:{x:135,y:155}});
  await expect(page.locator('#commit')).toBeEnabled();
  await page.locator('#commit').click();
  await expect(page.locator('#turn')).toHaveText('GO 1');
  const info=await page.evaluate(()=>({
    pr:game.log.filter(r=>r.type==='ORDER'&&r.side==='player').length,
    enemy:game.log.filter(r=>(r.type==='ORDER'||r.type==='YARD_INTERVENTION')&&r.side==='enemy').length,
    both:game.log.some(r=>r.type==='SIMULTANEOUS_PAIR_COMMIT'),
    resolving:game.resolve>0
  }));
  expect(info).toEqual({pr:2,enemy:2,both:true,resolving:true});
  await page.waitForTimeout(370);
  const after=await page.evaluate(()=>({p:game.floor('player')[0].x,e:game.floor('enemy')[0].y}));
  expect(after.p).not.toBe(before.p);expect(after.e).not.toBe(before.e);
});
test('CREWBOUND CP01 yard support remains off-field; flex can deploy fourth fighter',async({page})=>{
  await page.goto(PATH);
  await page.locator('#roster .unit').nth(5).click();
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('[data-action=DEPLOY]').click();
  await page.locator('#arena').click({position:{x:80,y:160}});
  await page.locator('#commit').click();
  const state=await page.evaluate(()=>({floor:game.floor('player').length,yard:game.yard('player').length,flex:!!game.flex('player')}));
  expect(state).toEqual({floor:4,yard:2,flex:false});
  await expect(page.locator('#formation')).toContainText('FLOOR 4 · YARD 2 · FLEX 0');
});
test('CREWBOUND CP01 rematch starts clean and original v0.5 is not altered by test',async({page})=>{
  await page.goto(PATH);
  const source=await page.evaluate(()=>window.JM_CREWBOUND_321_SIM.ORIGINAL_BODY_SHA256);
  expect(source).toBe('5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7');
  await page.locator('#reset').click();
  await expect(page.locator('#turn')).toHaveText('GO 0');
  await expect(page.locator('#commit')).toBeDisabled();
});
