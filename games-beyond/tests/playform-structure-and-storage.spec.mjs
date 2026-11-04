import { test, expect } from '@playwright/test';

const PAGE = './bodies/playform-v0-1.html';
async function fillCandidate(page) {
  await page.locator('#actor').fill('T-Boy');
  await page.locator('#tool').fill('ball');
  await page.locator('#space').fill('arena');
  await page.locator('#objective').fill('score');
  await page.locator('#loop').fill('choose → act → respond → adapt → repeat');
}

test('@boot PLAYFORM structural validation never promotes text-only proposal to gameplay DING', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(PAGE);
  await fillCandidate(page);
  await page.locator('#validate').click();
  await expect(page.locator('#result')).toContainText('STRUCTURE PASS · PLAYABILITY HOLD');
  await expect(page.locator('#result')).toContainText('does not execute or observe gameplay');
  await expect(page.locator('#result')).not.toContainText('PLAYFORM DING');
  const receipts = await page.evaluate(() => JSON.parse(localStorage.getItem('jm-playform-v01-receipts')));
  expect(receipts[0].type).toBe('STRUCTURE_CHECK');
  expect(errors).toEqual([]);
});

test('@boot PLAYFORM keeps editing and validation usable when browser storage is denied', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Browser storage disabled', 'SecurityError'); }
    });
  });
  await page.goto(PAGE);
  await fillCandidate(page);
  await page.locator('#save').click();
  await expect(page.locator('#result')).toContainText('STRUCTURE PASS · PLAYABILITY HOLD');
  await expect(page.locator('#result')).toContainText('Receipt not saved');
  expect(errors).toEqual([]);
});

test('@boot PLAYFORM preserves corrupted existing receipts instead of silently overwriting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jm-playform-v01-receipts', '{invalid-json'));
  await page.goto(PAGE);
  await fillCandidate(page);
  await page.locator('#save').click();
  await expect(page.locator('#result')).toContainText('Existing stored bytes preserved');
  const original = await page.evaluate(() => localStorage.getItem('jm-playform-v01-receipts'));
  expect(original).toBe('{invalid-json');
  await expect(page.locator('#source')).toContainText('Status\nSISTER SYSTEM CANDIDATE');
});
