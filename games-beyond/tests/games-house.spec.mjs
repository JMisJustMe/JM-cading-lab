import { test, expect } from '@playwright/test';

async function openHouse(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));
  await page.goto('/');
  await expect(page).toHaveTitle(/Games&Beyond/);
  await expect(page.locator('#status')).toHaveText('15/15 MOUNTED', { timeout: 30_000 });
  await expect(page.locator('#mountedStat')).toHaveText('15');
  return errors;
}

async function gameForgeCard(page) {
  await page.locator('.nav [data-view="rooms"]').click();
  await page.locator('#search').fill('GameForge');
  const card = page.locator('#roomRail .room').filter({ hasText: 'GameForge' });
  await expect(card).toHaveCount(1);
  return card;
}

async function openGameForgeEditor(page) {
  await openHouse(page);
  const card = await gameForgeCard(page);
  await card.locator('[data-edit="gameforge"]').click();
  await expect(page.locator('.view[data-view="edit"]')).toHaveClass(/active/);
  await expect(page.locator('#bodyName')).toHaveValue(/GameForge/i);
  await expect(page.locator('#source')).toHaveValue(/<html|<!doctype/i);
}

test('@boot Full House boot and fifteen-body registry', async ({ page }) => {
  const errors = await openHouse(page);
  await expect(page.locator('.hero h1')).toContainText('One front door.');
  await expect(page.locator('#enterBtn')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('@room-open Mounted body opens as its own playable page', async ({ page }) => {
  await openHouse(page);
  const card = await gameForgeCard(page);
  const popupPromise = page.waitForEvent('popup');
  await card.locator('[data-play="gameforge"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect.poll(() => popup.evaluate(() => document.documentElement.outerHTML.length)).toBeGreaterThan(1000);
  expect(popup.url()).toMatch(/^blob:/);
  await popup.close();
});

test('@room-ding Mounted body records real contact in the House', async ({ page }) => {
  await openHouse(page);
  const before = Number(await page.locator('#receiptStat').textContent());
  const card = await gameForgeCard(page);
  const popupPromise = page.waitForEvent('popup');
  await card.locator('[data-play="gameforge"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect(page.locator('#recentRooms')).toContainText('GameForge');
  await expect.poll(async () => Number(await page.locator('#receiptStat').textContent())).toBeGreaterThan(before);
  await popup.close();
});

test('@room-route Host reaches the body-native Edit route', async ({ page }) => {
  await openGameForgeEditor(page);
  await expect(page.locator('#bodyState')).toContainText('PROTECTED DELIVERY SOURCE');
  await expect(page.locator('#source')).toBeEnabled();
});

test('@room-close Escape returns from the body workspace to Rooms', async ({ page }) => {
  await openGameForgeEditor(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.view[data-view="rooms"]')).toHaveClass(/active/);
  await expect(page.locator('.nav [data-view="rooms"]')).toHaveClass(/active/);
});

test('@workbench Passport, source revision, undo, export, proof and receipts', async ({ page }) => {
  await openGameForgeEditor(page);

  await page.locator('#bodyVersion').fill('v3.16 QA');
  await page.locator('#savePassport').click();
  await expect(page.locator('#bodyState')).toContainText('CREATOR REVISION');
  await expect.poll(async () => Number(await page.locator('#editedStat').textContent())).toBe(1);

  const source = page.locator('#source');
  const original = await source.inputValue();
  await source.fill(`${original}\n<!-- QA_CONTACT -->`);
  await page.locator('#saveSource').click();
  await expect(source).toHaveValue(/QA_CONTACT/);
  await page.locator('#undoSource').click();
  await expect(source).not.toHaveValue(/QA_CONTACT/);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportBody').click();
  const bodyDownload = await downloadPromise;
  expect(bodyDownload.suggestedFilename()).toMatch(/\.html$/i);

  await page.locator('.nav [data-view="proof"]').click();
  await expect(page.locator('#receipts')).toContainText('PASSPORT_UPDATED');
  await expect(page.locator('#receipts')).toContainText('SOURCE_REVISION_SAVED');
  await expect(page.locator('#receipts')).toContainText('SOURCE_UNDO');
  await expect(page.locator('#receipts')).toContainText('BODY_EXPORTED');

  await page.locator('#runProof').click();
  await expect(page.locator('#proofBox')).toContainText('"pass": true', { timeout: 30_000 });
  await expect(page.locator('#proofBox')).toContainText('"bodyCount": 15');
});

test('@responsive Portrait, landscape and desktop House routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHouse(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await expect(page.locator('#status')).toHaveText('15/15 MOUNTED', { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.locator('.nav [data-view="rooms"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(page.locator('#status')).toHaveText('15/15 MOUNTED', { timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  for (const view of ['rooms', 'edit', 'proof', 'house']) {
    await page.locator(`.nav [data-view="${view}"]`).click();
    await expect(page.locator(`.view[data-view="${view}"]`)).toHaveClass(/active/);
  }
});
