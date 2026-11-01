import { test, expect } from '@playwright/test';

// November perfection: invalid or inaccessible preference storage must not hide
// the owner’s already-mounted original Games&Beyond bodies.
async function expectHouseBoot(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto('./');
  await expect(page.locator('#status')).toHaveText('22 MOUNTED · 24 FULL', { timeout: 45_000 });
  await expect(page.locator('#enterBtn')).toBeEnabled();
  expect(errors).toEqual([]);
}

for (const [label, value] of [
  ['malformed JSON', '{not-json'],
  ['unexpected object', '{"id":"gameforge"}'],
  ['unexpected scalar', '42']
]) {
  test('@boot recent-room history tolerates ' + label, async ({ page }) => {
    await page.addInitScript(raw => {
      window.localStorage.setItem('jm-gb-recent-v05', raw);
    }, value);
    await expectHouseBoot(page);
    await expect(page.locator('#recentRooms .empty')).toBeVisible();
  });
}

test('@boot blocked localStorage keeps game room opening and session recent history usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage disabled for testing', 'SecurityError'); }
    });
  });
  await expectHouseBoot(page);
  await page.locator('.nav [data-view="rooms"]').click();
  await page.locator('#roomRail [data-play="gameforge"]').click();
  await expect(page.locator('#bodyDialog')).toBeVisible();
  await expect(page.locator('#recentRooms [data-play="gameforge"]')).toHaveCount(1);
  await expect(page.locator('#bodySummary')).not.toBeEmpty();
});
