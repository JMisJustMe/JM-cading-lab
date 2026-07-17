import { test, expect } from '@playwright/test';

async function openHouse(page) {
  await page.goto('/');
  await expect(page).toHaveTitle(/Games&Beyond/);
}

async function openDoorTestCard(page) {
  await page.locator('.nav [data-view="rooms"]').click();
  await page.locator('#searchInput').fill('Door Test');
  const card = page.locator('#bodyList .body-card').filter({ hasText: 'Games House Door Test' });
  await expect(card).toHaveCount(1);
  return card;
}

test('@boot House boot and registry', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));
  await openHouse(page);
  await expect(page.locator('.hero h1')).toContainText('One front door.');
  await expect.poll(async () => Number(await page.locator('#statRegistered').textContent())).toBeGreaterThan(20);
  await expect.poll(async () => Number(await page.locator('#statMounted').textContent())).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('@room Body room contact and internal route', async ({ page }) => {
  await openHouse(page);
  const card = await openDoorTestCard(page);
  await card.locator('[data-open="house-door-test"]').click();
  await expect(page.locator('#roomModal')).toHaveClass(/open/);
  const frame = page.frameLocator('#roomFrame');
  await expect(frame.locator('h1')).toHaveText('Games House Door Test');
  await frame.locator('#ding').click();
  await expect(frame.locator('#ding')).toHaveText('DING 1');
  await page.locator('.room-actions [data-route="edit"]').click();
  await expect(frame.locator('#panel > b')).toHaveText('EDIT');
  await page.locator('#closeRoom').click();
  await expect(page.locator('#roomModal')).not.toHaveClass(/open/);
});

test('@workbench Passport, exact source, export and receipt', async ({ page }) => {
  await openHouse(page);
  const card = await openDoorTestCard(page);
  await card.locator('.select-body').click();
  await expect(page.locator('[data-view="workbench"] .section-head h2')).toHaveText('Creator Workbench');
  await expect(page.locator('#sourceEditor')).toBeEnabled();
  await expect(page.locator('#sourceEditor')).toContainText('Games House Door Test');
  await page.locator('#editVersion').fill('v0.1 QA');
  await page.locator('#savePassport').click();
  await expect(page.locator('#workStatus')).toContainText('MOUNTED');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportBody').click();
  const bodyDownload = await downloadPromise;
  expect(bodyDownload.suggestedFilename()).toMatch(/html$/i);
  await page.locator('.nav [data-view="receipts"]').click();
  await expect(page.locator('#receiptList .receipt').filter({ hasText: 'HOUSE_GENESIS' }).first()).toBeVisible();
  await expect(page.locator('#receiptList .receipt').filter({ hasText: 'BODY_EXPORTED' }).first()).toBeVisible();
});

test('@responsive Portrait, landscape and desktop routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHouse(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.locator('.nav [data-view="rooms"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.locator('.nav [data-view="settings"]').click();
  await expect(page.locator('[data-view="settings"] .section-head h2')).toHaveText('Routes and custody');
});
