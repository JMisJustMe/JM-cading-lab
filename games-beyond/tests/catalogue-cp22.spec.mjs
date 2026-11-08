import { test, expect } from '@playwright/test';

// CP22 preserves the original mounted House and the separately sourced A–Z.
// CP24 adds one exact older T-Boys source door: 25 linked / 118 source-only, still 143 records. Browser proof is not owner acceptance.
test('@cp22 native catalogue works without service-worker injection', async ({ page }) => {
  await page.route('**/sw.js*', route => route.abort());
  await page.goto('./');
  await expect(page.locator('#status')).toHaveText('22 MOUNTED ROOMS', { timeout: 45_000 });
  await expect(page.locator('#mountedStat')).toHaveText('22');
  await expect(page.locator('#expectedStat')).toHaveText('24');
  await expect(page.locator('#houseNav button[data-view="catalogue-current"]')).toHaveCount(1);
  await page.locator('#houseNav button[data-view="catalogue-current"]').click();
  await expect(page.locator('#view-catalogue-current')).toBeVisible();

  const frame=page.frameLocator('#wholeGamesCatalogueFrame');
  await expect(frame.locator('#statAll')).toHaveText('143', { timeout: 30_000 });
  const linked=Number(await frame.locator('#statDoors').innerText());
  const unlinked=Number(await frame.locator('#statNoDoors').innerText());
  expect(linked).toBe(25);
  expect(unlinked).toBe(118);
  expect(linked+unlinked).toBe(143);

  await frame.locator('[data-filter="unlinked"]').click();
  await expect(frame.locator('#showing')).toHaveText('118 / 143 shown');
  await frame.locator('[data-filter="all"]').click();
  await frame.locator('#search').fill('FTR First-Person');
  await expect(frame.locator('#grid h3').filter({hasText:'FTR First-Person'})).toHaveCount(1);
  // A public catalogue record must not be misreported as a mounted room.
  await expect(page.locator('#status')).toHaveText('22 MOUNTED ROOMS');
});

test('@cp22 Rooms can search the entire Estate without inventing player doors', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#status')).toHaveText('22 MOUNTED ROOMS',{timeout:45_000});
  await page.locator('#houseNav button[data-view="rooms"]').click();
  await expect(page.locator('#view-rooms')).toBeVisible();
  await page.locator('#roomWholeGamesQuery').fill('LightLites');
  await page.locator('#roomWholeGamesQuery').press('Enter');
  await expect(page).toHaveURL(/all-games\.html\?q=LightLites/);
  await expect(page.locator('#search')).toHaveValue('LightLites');
  await expect(page.locator('#grid h3').filter({hasText:'LightLites / LL'})).toHaveCount(1);
  await expect(page.locator('#grid h3').filter({hasText:'LightLites / LL'}).locator('xpath=ancestor::article')).toContainText('No public carrier');
});
