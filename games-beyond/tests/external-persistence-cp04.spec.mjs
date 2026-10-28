import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Actual Games&Beyond local edit and portable recovery proof.
// No server-side write, deployment, or owner-device claim.
async function open(page) {
  await page.goto('./');
  await expect(page.locator('#status')).toHaveText('22 MOUNTED · 24 FULL', {timeout: 60000});
}
async function editor(page) {
  await page.locator('.nav [data-view="rooms"]').click();
  await page.locator('#search').fill('GameForge');
  await page.locator('[data-edit="gameforge"]').click();
  await expect(page.locator('#source')).toBeVisible();
  return page.locator('#source');
}
test('CP04 edit -> cold reload -> export -> isolated-profile import -> protected restore', async ({page,browser}) => {
  test.setTimeout(180000);
  await open(page);
  const source=await editor(page);
  const original=await source.inputValue();
  expect(original.length).toBeGreaterThan(250);
  const marker='<!-- JM_CP04_REENTRY_CONTACT -->';
  await source.fill(original+'\n'+marker);
  await page.locator('#saveSource').click();
  await expect(page.locator('#editedStat')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#status')).toContainText('MOUNTED',{timeout:60000});
  await expect(await editor(page)).toHaveValue(/JM_CP04_REENTRY_CONTACT/);
  const bodyEvent=page.waitForEvent('download');
  await page.locator('#exportBody').click();
  expect(await readFile(await (await bodyEvent).path(),'utf8')).toContain(marker);
  await page.locator('.nav [data-view="proof"]').click();
  const backupEvent=page.waitForEvent('download');
  await page.locator('#exportHouse').click();
  const backupBytes=await readFile(await (await backupEvent).path());
  const backup=JSON.parse(backupBytes.toString('utf8'));
  expect(backup.bodies.find(b=>b.id==='gameforge')?.html).toContain(marker);
  const separate=await browser.newContext({acceptDownloads:true});
  try {
    const fresh=await separate.newPage();
    await open(fresh);
    await expect(await editor(fresh)).not.toHaveValue(/JM_CP04_REENTRY_CONTACT/);
    await fresh.locator('.nav [data-view="proof"]').click();
    await fresh.locator('#importFile').setInputFiles({
      name:'JM_CP04_RECOVERY.json',
      mimeType:'application/json',
      buffer:backupBytes
    });
    await expect(fresh.locator('#receipts')).toContainText('HOUSE_BACKUP_IMPORTED',{timeout:60000});
    await expect(await editor(fresh)).toHaveValue(/JM_CP04_REENTRY_CONTACT/);
    await fresh.reload();
    await expect(fresh.locator('#status')).toContainText('MOUNTED',{timeout:60000});
    await expect(await editor(fresh)).toHaveValue(/JM_CP04_REENTRY_CONTACT/);
    await fresh.locator('#restoreBody').click();
    expect(await fresh.locator('#source').inputValue()).toBe(original);
    await fresh.reload();
    await expect(fresh.locator('#status')).toContainText('MOUNTED',{timeout:60000});
    expect(await (await editor(fresh)).inputValue()).toBe(original);
  } finally { await separate.close(); }
});
