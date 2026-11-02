import { test, expect } from '@playwright/test';

const GAME='./bodies/aiming-run-v0-1a.html';

test('@boot Aiming Run rejects incomplete editor JSON without replacing a working track', async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(GAME);
  const before=await page.evaluate(()=>JSON.stringify(window.AimingRun.state.tracks[0]));
  await page.locator('#trackJson').fill('{}');
  await page.evaluate(()=>document.getElementById('applyTrackJson').click());
  expect(await page.evaluate(()=>JSON.stringify(window.AimingRun.state.tracks[0]))).toBe(before);
  await expect(page.locator('#toast')).toContainText('Invalid track JSON');
  expect(errors).toEqual([]);
});

test('@boot Aiming Run rejects invalid target physics and out-of-bounds obstacles', async ({page})=>{
  await page.goto(GAME);
  const before=await page.evaluate(()=>JSON.stringify(window.AimingRun.state.tracks[0]));
  const candidates=await page.evaluate(()=>{
    const t=window.AimingRun.state.tracks[0];
    return [{...t,speed:'invalid'},{...t,barriers:null},{...t,barriers:[{x:.9,y:.3,w:.5,h:.2}]}];
  });
  for(const candidate of candidates){
    await page.locator('#trackJson').fill(JSON.stringify(candidate));
    await page.evaluate(()=>document.getElementById('applyTrackJson').click());
    expect(await page.evaluate(()=>JSON.stringify(window.AimingRun.state.tracks[0]))).toBe(before);
  }
});

test('@boot Aiming Run still accepts a valid edited owner track', async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(GAME);
  const candidate=await page.evaluate(()=>({...window.AimingRun.state.tracks[0],name:'Owner edited route'}));
  await page.locator('#trackJson').fill(JSON.stringify(candidate));
  await page.evaluate(()=>document.getElementById('applyTrackJson').click());
  expect(await page.evaluate(()=>window.AimingRun.state.tracks[0].name)).toBe('Owner edited route');
  await expect(page.locator('#toast')).toContainText('Track body applied');
  expect(errors).toEqual([]);
});
