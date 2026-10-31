import { test, expect } from '@playwright/test';

/**
 * CP24: receiver-context browser checks for the three ORIGINAL game bodies.
 * Pixel/desktop Chromium are simulated contexts, NOT proof of a physical phone.
 * This test does not render or re-skin any game from another game's HTML.
 */
const games = [
  { path: './bodies/drag-aim-loop-kernel-v0-9-9.html', canvas: '#arena', title: /Drag.*Aim/i },
  { path: './bodies/fight-clash-v0-4.html', canvas: '#game', title: /Fight Clash/i },
  { path: './bodies/futarized-v1-2.html', canvas: '#aimCanvas', title: /FUTARIZED/i }
];

for (const game of games) {
  test('@jm-contact original game opens and fits its real playfield: ' + game.path, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(game.path);
    await expect(page).toHaveTitle(game.title);
    await expect(page.locator(game.canvas)).toBeVisible();
    await expect.poll(async () => page.locator(game.canvas).evaluate(c => c.width > 0 && c.height > 0)).toBeTruthy();
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('@jm-contact Drag & Aim keyboard changes aim and fires via ORIGINAL physics', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bodies/drag-aim-loop-kernel-v0-9-9.html');
  await page.locator('#arena').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('#hudShots')).toHaveText('1');
  await expect(page.locator('#statePill')).toContainText(/MOVING|READY/);
  expect(errors).toEqual([]);
});

test('@jm-contact Fight Clash never keeps held UI after browser focus loss', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bodies/fight-clash-v0-4.html');
  // Genuine opening route: First Bell modal blocks the start button until a mode is chosen.
  await page.locator('#introBoxing').click();
  await expect(page.locator('#intro')).not.toHaveClass(/show/);
  const startButton=page.locator('#startBtn');
  if(await startButton.isVisible()) await startButton.click();
  else await page.locator('#game').click({position:{x:40,y:40}});
  await page.keyboard.down('w');
  await page.keyboard.down('i');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('w');
  await page.keyboard.up('i');
  await expect(page.locator('.held')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('@jm-contact FUTARIZED 44px actions survive short portrait viewport', async ({ page }) => {
  await page.setViewportSize({width:390,height:700});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bodies/futarized-v1-2.html');
  for (const selector of ['#tapPulse','#holdCharge','#guardBtn','.tab.active']) {
    const target = page.locator(selector);
    await expect(target).toBeVisible();
    const h = await target.evaluate(el => el.getBoundingClientRect().height);
    expect(h, selector).toBeGreaterThanOrEqual(43.5);
  }
  await expect(page.locator('#aimCanvas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('@jm-contact FUTARIZED aim belongs to its initiating pointer and cancellation never shoots', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./bodies/futarized-v1-2.html');
  const canvas=page.locator('#aimCanvas');
  await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox();
  const x=box.x+box.width*.23,y=box.y+box.height*.60;
  await page.mouse.move(x,y);await page.mouse.down();
  await canvas.dispatchEvent('pointermove',{pointerId:99,clientX:box.x+box.width*.05,clientY:y});
  await canvas.dispatchEvent('pointerup',{pointerId:99,clientX:box.x+box.width*.05,clientY:y});
  await expect(page.locator('#aimShots')).toHaveText('0');
  await canvas.dispatchEvent('pointercancel',{pointerId:99});
  await page.mouse.move(box.x+box.width*.08,y);
  await page.mouse.up();
  await expect(page.locator('#aimShots')).toHaveText('1');
  await page.locator('#resetAim').click();
  await page.mouse.move(x,y);await page.mouse.down();
  await canvas.dispatchEvent('lostpointercapture',{pointerId:1});
  await page.mouse.move(box.x+box.width*.08,y);await page.mouse.up();
  await expect(page.locator('#aimShots')).toHaveText('0');
  await page.mouse.move(x,y);await page.mouse.down();
  await page.locator('#resetAim').evaluate(el=>el.click());
  await page.mouse.move(box.x+box.width*.08,y);await page.mouse.up();
  await expect(page.locator('#aimShots')).toHaveText('0');
  expect(errors).toEqual([]);
});
