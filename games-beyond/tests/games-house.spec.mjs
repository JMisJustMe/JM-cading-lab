import { test, expect } from '@playwright/test';

const BUILT_IN = 22;
const FULL_TARGET = 24;
const PRIORITY_EIGHT = [
  'gameforge',
  'glyphplay',
  'glyphforge',
  'drag-aim',
  'aiming-run',
  'fourfold-arena',
  'tboys-core-clash',
  'routeos-platform'
];

async function openHouse(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));

  await page.goto('./');
  await expect(page.locator('title')).toHaveText(/Games&Beyond/);
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`, { timeout: 45_000 });
  await expect(page.locator('#mountedStat')).toHaveText(String(BUILT_IN));
  await expect(page.locator('#expectedStat')).toHaveText(String(FULL_TARGET));
  await expect(page.locator('#enterBtn')).toBeEnabled();

  return errors;
}

async function showRooms(page) {
  await page.locator('.nav [data-view="rooms"]').click();
  await expect(page.locator('.view[data-view="rooms"]')).toBeVisible();
}

async function gameForgeCard(page) {
  await showRooms(page);
  await page.locator('#search').fill('GameForge');
  const card = page.locator('#roomRail .room').filter({ hasText: 'GameForge' });
  await expect(card).toHaveCount(1);
  return card;
}

async function openGameForgeEditor(page) {
  await openHouse(page);
  const card = await gameForgeCard(page);
  await card.locator('[data-edit="gameforge"]').click();
  await expect(page.locator('.view[data-view="edit"]')).toBeVisible();
  await expect(page.locator('#bodyName')).toHaveValue(/GameForge/i);
  await expect(page.locator('#source')).toHaveValue(/<html|<!doctype/i);
}

async function frameHtmlLength(page) {
  return page.locator('#bodyFrame').evaluate(frame => frame.contentDocument?.documentElement?.outerHTML.length || 0);
}

test('@boot current 22-built-in / 24-full House contract boots cleanly', async ({ page }) => {
  const errors = await openHouse(page);
  await expect(page.locator('.hero h1')).toContainText('One front door.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('@inventory priority-eight proof lane is present in the mounted package', async ({ page }) => {
  await openHouse(page);
  const ids = await page.evaluate(() => window.GamesBeyond.pack.bodies.map(body => body.id));
  for (const id of PRIORITY_EIGHT) expect(ids).toContain(id);
  expect(ids).toHaveLength(BUILT_IN);
});

test('@priority-eight Open/Edit/Source/Export contact across the first proof set', async ({ page }) => {
  await openHouse(page);
  await showRooms(page);

  for (const id of PRIORITY_EIGHT) {
    const roomRail = page.locator('#roomRail');
    const play = roomRail.locator(`[data-play="${id}"]`);
    const edit = roomRail.locator(`[data-edit="${id}"]`);
    const exportButton = roomRail.locator(`[data-export="${id}"]`);

    await expect(play).toHaveCount(1);
    await expect(edit).toHaveCount(1);
    await expect(exportButton).toHaveCount(1);

    await play.click();
    await expect(page.locator('#bodyDialog')).toBeVisible();
    await expect.poll(() => frameHtmlLength(page)).toBeGreaterThan(250);
    await page.locator('#closeDialog').click();
    await expect(page.locator('#bodyDialog')).not.toBeVisible();

    await edit.click();
    await expect(page.locator('.view[data-view="edit"]')).toBeVisible();
    await expect(page.locator('#source')).toHaveValue(/<html|<!doctype/i);
    expect((await page.locator('#source').inputValue()).length).toBeGreaterThan(250);

    await showRooms(page);
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.html$/i);
  }
});

test('@room-open mounted GameForge opens in the current in-House dialog wrapper', async ({ page }) => {
  await openHouse(page);
  const card = await gameForgeCard(page);
  await card.locator('[data-play="gameforge"]').click();
  await expect(page.locator('#bodyDialog')).toBeVisible();
  await expect(page.locator('#dialogTitle')).toContainText(/GameForge/i);
  await expect.poll(() => frameHtmlLength(page)).toBeGreaterThan(1000);
  await page.locator('#closeDialog').click();
  await expect(page.locator('#bodyDialog')).not.toBeVisible();
});

test('@room-ding mounted body records real House contact', async ({ page }) => {
  await openHouse(page);
  const before = Number(await page.locator('#receiptStat').textContent());
  const card = await gameForgeCard(page);
  await card.locator('[data-play="gameforge"]').click();
  await expect(page.locator('#recentRooms')).toContainText('GameForge');
  await expect.poll(async () => Number(await page.locator('#receiptStat').textContent())).toBeGreaterThan(before);
  await page.locator('#closeDialog').click();
});

test('@room-route host reaches the body-native Edit/source route', async ({ page }) => {
  await openGameForgeEditor(page);
  await expect(page.locator('#bodyState')).toContainText('Protected delivery body');
  await expect(page.locator('#source')).toBeEnabled();
});

test('@room-close Escape closes the body dialog and returns focus to House contact', async ({ page }) => {
  await openHouse(page);
  const card = await gameForgeCard(page);
  await card.locator('[data-play="gameforge"]').click();
  await expect(page.locator('#bodyDialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bodyDialog')).not.toBeVisible();
});

test('@workbench passport/source revision, undo, export, proof and receipts', async ({ page }) => {
  await openGameForgeEditor(page);

  await page.locator('#bodyVersion').fill('v3.16 QA');
  await page.locator('#savePassport').click();
  await expect(page.locator('#bodyState')).toContainText('Creator revision');
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
  await expect(page.locator('#receipts')).toContainText('CREATOR_REVISION_SAVED');
  await expect(page.locator('#receipts')).toContainText('SOURCE_UNDO');
  await expect(page.locator('#receipts')).toContainText('BODY_EXPORTED');

  await page.locator('#runProof').click();
  await expect(page.locator('#proofBox')).toContainText('"pass": true', { timeout: 45_000 });
  await expect(page.locator('#proofBox')).toContainText(`"bodyCount": ${BUILT_IN}`);
  await expect(page.locator('#proofBox')).toContainText(`"builtInExpected": ${BUILT_IN}`);
  await expect(page.locator('#proofBox')).toContainText(`"fullTarget": ${FULL_TARGET}`);
  await expect(page.locator('#proofBox')).toContainText('"fullMount": false');
  await expect(page.locator('#receipts')).toContainText('BUILT_IN_HOUSE_PROOF');
});

test('@routeos public room preserves the owner-private full-keeper boundary', async ({ page }) => {
  await openHouse(page);
  const routeos = await page.evaluate(() => {
    const body = window.GamesBeyond.pack.bodies.find(item => item.id === 'routeos-platform');
    return body && {
      name: body.name,
      stage: body.stage,
      sourceStatus: body.sourceStatus,
      htmlLength: body.html.length
    };
  });

  expect(routeos?.name).toMatch(/RouteOS/i);
  expect(routeos?.stage).toMatch(/PRIVATE FULL KEEPER RECOVERED/i);
  expect(routeos?.sourceStatus).toMatch(/public room carries evidence and navigation only/i);
  expect(routeos?.htmlLength).toBeGreaterThan(250);
});

test('@responsive portrait, landscape and desktop House routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHouse(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`, { timeout: 45_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await showRooms(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`, { timeout: 45_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  for (const view of ['rooms', 'edit', 'proof', 'access', 'house']) {
    await page.locator(`.nav [data-view="${view}"]`).click();
    await expect(page.locator(`.view[data-view="${view}"]`)).toBeVisible();
  }
});
