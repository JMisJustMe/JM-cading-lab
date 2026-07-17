import { test, expect } from '@playwright/test';

test('Games House boots, routes and exports without dead doors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Games&Beyond/);
  await expect(page.getByText('One front door.')).toBeVisible();
  await expect(page.locator('#statRegistered')).not.toHaveText('0');
  await expect(page.locator('#statMounted')).not.toHaveText('0');

  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(noOverflow).toBeTruthy();

  await page.getByRole('button', { name: 'ROOMS' }).click();
  await expect(page.getByText('Games House rooms')).toBeVisible();
  await page.locator('#searchInput').fill('Door Test');
  const testCard = page.locator('.body-card').filter({ hasText: 'Games House Door Test' });
  await expect(testCard).toBeVisible();
  await testCard.getByRole('button', { name: 'OPEN BODY' }).click();
  await expect(page.locator('#roomModal')).toHaveClass(/open/);
  const frame = page.frameLocator('#roomFrame');
  await expect(frame.getByText('Games House Door Test')).toBeVisible();
  await frame.getByRole('button', { name: /DING 0/ }).click();
  await expect(frame.getByRole('button', { name: /DING 1/ })).toBeVisible();

  await page.locator('.room-actions [data-route="edit"]').click();
  await expect(frame.getByText('EDIT')).toBeVisible();
  await page.locator('#closeRoom').click();
  await expect(page.locator('#roomModal')).not.toHaveClass(/open/);

  await testCard.locator('.select-body').click();
  await expect(page.getByText('Creator Workbench')).toBeVisible();
  await expect(page.locator('#sourceEditor')).toBeEnabled();
  await page.locator('#editVersion').fill('v0.1 QA');
  await page.locator('#savePassport').click();
  await expect(page.locator('#workStatus')).toContainText('MOUNTED');

  const download = page.waitForEvent('download');
  await page.locator('#exportBody').click();
  const bodyDownload = await download;
  expect(await bodyDownload.suggestedFilename()).toMatch(/html$/i);

  await page.getByRole('button', { name: 'PROOF' }).click();
  await expect(page.getByText('HOUSE_GENESIS')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Games House is responsive in landscape and desktop', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'ROOMS' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'ROUTES' }).click();
  await expect(page.getByText('Routes and custody')).toBeVisible();
});
