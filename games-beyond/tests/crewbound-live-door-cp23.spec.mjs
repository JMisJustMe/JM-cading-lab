import { test, expect } from '@playwright/test';

// CP23 source contact only: two independent CREWBOUND entrances, one sovereign original family.
// The authentic original game and later playable 3+2+1 public descendant both remain untouched.
test('@cp23 preserves historic CREWBOUND House door and adds one independently playable descendant', async ({ page }) => {
  await page.goto('./all-games.html');
  await expect(page.locator('#statAll')).toHaveText('143');
  await expect(page.locator('#statDoors')).toHaveText('24');
  await expect(page.locator('#statNoDoors')).toHaveText('119');

  await page.locator('#search').fill('CREWBOUND Arena');
  const card = page.locator('#grid article').filter({has:page.locator('h3', {hasText:'CREWBOUND Arena'})});
  await expect(card).toHaveCount(1);
  await expect(card.locator('a[href="./?jm-play=crewbound-arena"]')).toHaveCount(1);
  await expect(card.locator('[data-jm-cp23-crewbound-play="true"]')).toHaveAttribute('href','crewbound-321/');
  await expect(card.locator('[data-jm-cp23-crewbound-play="true"]')).toContainText('INDEPENDENT PUBLIC DESCENDANT');

  await page.goto('./');
  await expect(page.locator('a[data-play-now="crewbound-cp02"]')).toHaveAttribute('href','crewbound-321/');
  await expect(page.locator('a[data-play-now="kicshift"]')).toHaveCount(1);
  await expect(page.locator('a[data-play-now="bonewake"]')).toHaveCount(1);
  await expect(page.locator('a[data-play-now="puka"]')).toHaveCount(1);
});

test('@cp23 CREWBOUND 3+2+1 real pair-order gameplay advances the original authored simulation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./crewbound-321/');
  await expect(page.locator('#turn')).toHaveText('GO 0');
  await expect(page.locator('#roster .unit')).toHaveCount(6);
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('#roster .unit').nth(1).click();
  await expect(page.locator('#pair')).toContainText('2 / 2 READY');
  await page.locator('#arena').click({position:{x:140,y:130}});
  await expect(page.locator('#commit')).toBeEnabled();
  await page.locator('#commit').click();
  await expect(page.locator('#turn')).toHaveText('GO 1');
  await expect(page.locator('#log')).toContainText('SIMULTANEOUS_PAIR_COMMIT');
  await expect(page.locator('#arena')).toBeVisible();
  expect(errors).toEqual([]);
});
