import { test, expect } from '@playwright/test';

const ROUTE = './bodies/loopit-glyphplay-gameforge-boundary-rejoin-node.html';

test('@boot Loopit rejoin confirms actual clipboard copy only for this session', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__jmCopiedPacket = text; } }
    });
  });
  await page.goto(ROUTE);
  await page.locator('#copy').click();
  await expect(page.locator('#result')).toContainText('DING · Rejoin packet copied (session confirmation only)');
  expect(await page.evaluate(() => window.__jmCopiedPacket === document.getElementById('packet').textContent)).toBe(true);
  await expect(page.locator('#result')).toHaveAttribute('role', 'status');
});

test('@boot Loopit rejoin selects the exact visible packet if clipboard write is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('clipboard denied'); } }
    });
  });
  await page.goto(ROUTE);
  await page.locator('#copy').click();
  await expect(page.locator('#result')).toContainText('Clipboard blocked. Packet selected');
  await expect(page.locator('#result')).toContainText('No copy DING claimed.');
  const selection = await page.evaluate(() => window.getSelection()?.toString() || '');
  expect(selection).toContain('REJOIN PACKET');
  expect(selection).toContain('CORE LOCK');
});

test('@boot Loopit rejoin handles missing clipboard API without false proof', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });
  await page.goto(ROUTE);
  await page.locator('#copy').click();
  await expect(page.locator('#result')).toContainText('Clipboard blocked.');
  await expect(page.locator('#result')).toContainText('No copy DING claimed.');
  expect(await page.evaluate(() => window.getSelection()?.toString().includes('REJOIN PACKET'))).toBe(true);
});
