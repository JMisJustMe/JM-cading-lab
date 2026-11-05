import { test, expect } from '@playwright/test';

// November perfection: invalid or inaccessible preference storage must not hide
// the owner’s already-mounted original Games&Beyond bodies.
async function expectHouseBoot(page) {
  const errors = [];
  page.on('pageerror', error => { errors.push(String(error)); console.log('JM startup page error:', String(error)); });
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

test('@boot denied IndexedDB reports a visible fail-closed House state', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      get() { throw new DOMException('IndexedDB denied for testing', 'SecurityError'); }
    });
  });
  await page.goto('./');
  await expect(page.locator('#status')).toHaveText('HOUSE BUGG', { timeout: 10_000 });
  await expect(page.locator('#loadText')).toContainText('Local edit database unavailable');
  await expect(page.locator('#enterBtn')).toBeDisabled();
});

test('@boot slow service-worker registration cannot block original House payload', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register() { return new Promise(() => {}); } }
    });
  });
  await expectHouseBoot(page);
  await expect(page.locator('#mountedStat')).toHaveText('22');
});


test('@boot Play Now links remain usable when local House database is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      get() { throw new DOMException('IndexedDB denied for testing', 'SecurityError'); }
    });
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#status')).toHaveText('HOUSE BUGG', { timeout: 10_000 });
  const links = [
    ['kicshift', 'kicshift/', /KICSHIFT — JM Portable Body/],
    ['bonewake', 'bonewake/00_OPEN_FIRST.html', /Humanimals: Bonewake Arena/],
    ['puka', 'puka/00_OPEN_FIRST.html', /PUKA v0\.17A/]
  ];
  for (const [name, path, title] of links) {
    const link = page.locator('[data-play-now="' + name + '"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', path);
    await Promise.all([
      page.waitForURL(url => url.pathname.endsWith('/games-beyond/' + path), { timeout: 20_000 }),
      link.click()
    ]);
    await expect(page).toHaveTitle(title);
    await page.goto('./', { waitUntil: 'domcontentloaded' });
  }
});
