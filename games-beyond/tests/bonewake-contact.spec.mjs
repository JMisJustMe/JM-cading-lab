import { test, expect } from '@playwright/test';

/* CP25 original Bonewake game, actual multi-file runtime. Never a simulated replacement. */
async function openBonewake(page) {
  const errors=[];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bonewake/');
  await expect(page.locator('#phaseRead')).toHaveText('SLEEPFALL');
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#game')).toHaveJSProperty('width',720);
  return errors;
}

async function keyboardWake(page){
  await page.locator('#game').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(150);
  await page.keyboard.up('Space');
  await expect(page.locator('#phaseRead')).toHaveText('WAKE READY',{timeout:5000});
}
test('@bonewake first-contact canonical door boots with real canvas and no horizontal overflow', async ({page})=>{
  const errors=await openBonewake(page);
  const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  for(const selector of ['#leftBtn','#rightBtn','#deepBtn','#breathBtn','#leaderBtn','#poolBtn']){
    const rect=await page.locator(selector).evaluate(e=>e.getBoundingClientRect().height);
    expect(rect,selector).toBeGreaterThanOrEqual(43.5);
  }
  expect(errors).toEqual([]);
});
test('@bonewake actual keyboard lever, original Wakeflick and left reflex interact',async ({page})=>{
  const errors=await openBonewake(page);
  await keyboardWake(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('#phaseRead')).toHaveText('WAKEFLICK');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#centerReadout')).toContainText('ENTER TO RELEASE');
  await page.keyboard.press('Enter');
  await expect(page.locator('#phaseRead')).toHaveText('LIVE WAKE');
  await page.keyboard.down('a');
  await expect(page.locator('#leftBtn')).toHaveClass(/on/);
  await page.keyboard.up('a');
  await expect(page.locator('#leftBtn')).not.toHaveClass(/on/);
  expect(errors).toEqual([]);
});
test('@bonewake background loss aborts unearned Reel and held controls',async ({page})=>{
  const errors=await openBonewake(page);
  await page.locator('#game').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(80);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('Space');
  await expect(page.locator('#phaseRead')).toHaveText('SLEEPFALL');
  await expect(page.locator('#leverText')).toHaveText('HOLD → RELEASE');
  await keyboardWake(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#phaseRead')).toHaveText('WAKE READY');
  expect(errors).toEqual([]);
});
test('@bonewake touch/mouse lever enters original reel and player remains touch-playable',async ({page})=>{
  const errors=await openBonewake(page);
  const lever=page.locator('#leverBtn');
  await lever.scrollIntoViewIfNeeded();
  await lever.hover();
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.up();
  await expect(page.locator('#phaseRead')).toHaveText('WAKE READY',{timeout:5000});
  await expect(page.locator('#game')).toBeVisible();
  expect(errors).toEqual([]);
});
