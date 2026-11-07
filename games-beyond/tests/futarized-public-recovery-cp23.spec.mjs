import { test, expect } from '@playwright/test';

// CP23: source-recovered FUTARIZED v3.1 exact original Part I/II, not v3.3
// and not a replacement for separately preserved historical v1.2.
const base = '../estate-publication/apps-tools-games/games/futarized-v3.1/';
test('@cp23 FUTARIZED retains historical player and authentic two-part new doors without creating a new game identity', async ({ page }) => {
  await page.goto('./all-games.html');
  await expect(page.locator('#statAll')).toHaveText('143');
  const input=page.locator('#search');
  await input.fill('FUTARIZED');
  const card=page.locator('#grid article').filter({has:page.getByRole('heading',{name:'FUTARIZED',exact:true})});
  await expect(card).toHaveCount(1);
  await expect(card.locator('[data-jm-cp23-futarized-part="I"]')).toHaveAttribute('href',base+'FUTARIZED_PART_I_LIVING_REFIT.html');
  await expect(card.locator('[data-jm-cp23-futarized-part="II"]')).toHaveAttribute('href',base+'FUTARIZED_PART_II_FUTARIAN_FIELD.html');
  await expect(card.locator('a[href="bodies/futarized-v1-2.html"]')).toHaveCount(1);
  await page.goto('./');
  await expect(page.locator('[data-play-now="futarized-part-i"]')).toHaveAttribute('href',base+'FUTARIZED_PART_I_LIVING_REFIT.html');
  await expect(page.locator('[data-play-now="futarized-part-ii"]')).toHaveAttribute('href',base+'FUTARIZED_PART_II_FUTARIAN_FIELD.html');
});

test('@cp23 FUTARIZED original v3.1 landing opens both source-authentic browser bodies and Part II starts actual game', async ({ page }) => {
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'index.html');
  await page.locator('a[href="FUTARIZED_PART_I_LIVING_REFIT.html"]').click();
  await expect(page).toHaveURL(/FUTARIZED_PART_I_LIVING_REFIT\.html$/);
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(await page.locator('canvas').count()).toBeGreaterThan(0);

  await page.goto(base+'index.html');
  await page.locator('a[href="FUTARIZED_PART_II_FUTARIAN_FIELD.html"]').click();
  await expect(page).toHaveURL(/FUTARIZED_PART_II_FUTARIAN_FIELD\.html$/);
  await expect(page.locator('#startOverlay')).toBeVisible();
  await page.locator('#startBtn').click();
  await expect(page.locator('#startOverlay')).toBeHidden();
  await expect(page.locator('#playBtn')).toHaveText('AUTO: ON');
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(errors).toEqual([]);
});
