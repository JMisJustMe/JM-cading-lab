import { test, expect } from '@playwright/test';

// Original Fight Clash v0.4 in its existing Games&Beyond body path.
// An interrupted phone touch can pause/resume before the pending animation
// frame fires. That must never introduce two independent game loops.
test('Fight Clash rapid pause/resume preserves a single pending animation frame', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const pending = new Map();
    let nextId = 0;
    window.requestAnimationFrame = callback => {
      const id = ++nextId;
      pending.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    window.__jmPendingFrames = () => pending.size;
  });
  await page.goto('./bodies/fight-clash-v0-4.html');
  await expect(page.locator('#startBtn')).toBeAttached();
  await expect(page.locator('#pauseBtn')).toBeAttached();
  await page.evaluate(() => {
    document.getElementById('startBtn').click();
  });
  await expect.poll(() => page.evaluate(() => window.__jmPendingFrames())).toBe(1);

  await page.evaluate(() => document.getElementById('pauseBtn').click());
  await expect(page.locator('#pauseBtn')).toHaveText('RESUME');
  await page.evaluate(() => document.getElementById('pauseBtn').click());
  await expect(page.locator('#pauseBtn')).toHaveText('PAUSE');

  // The pre-existing scheduled callback is still pending; don't queue a second.
  expect(await page.evaluate(() => window.__jmPendingFrames())).toBe(1);
  expect(errors).toEqual([]);
});
