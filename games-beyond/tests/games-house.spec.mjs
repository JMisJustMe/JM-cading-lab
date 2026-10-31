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
  const card = page.locator('#roomRail .room:has([data-edit="gameforge"])');
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
  test.setTimeout(90_000);
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

test('@source-boundary protected JMStudios identity cannot enter through ordinary import', async ({ page }) => {
  await openHouse(page);
  const forged = {
    bodies: [{
      id: 'jmstudios-actual-crown',
      name: 'JMStudios',
      html: '<!doctype html><html lang="en"><head><title>UNVERIFIED</title></head><body>Not the original JM source</body></html>'
    }]
  };
  await page.locator('#importFile').setInputFiles({
    name: 'unverified-jmstudios.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(forged))
  });
  await expect(page.locator('#toast')).toContainText('JMStudios original-source identity requires verified lineage pair');
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`);
  expect(await page.evaluate(() => window.GamesBeyond.pack.bodies.some(x => x.id === 'jmstudios-actual-crown'))).toBeFalsy();
  await page.reload();
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`, { timeout: 45_000 });
  expect(await page.evaluate(() => window.GamesBeyond.pack.bodies.some(x => x.id === 'jmstudios-actual-crown'))).toBeFalsy();
});

test('@source-boundary fake lineage cannot crown altered JMStudios HTML', async ({ page }) => {
  await openHouse(page);
  const source = '<!doctype html><html><head><title>UNVERIFIED</title></head><body>Wrong source</body></html>';
  const forged = {
    source_custody: { original_lineage_zip_file: 'JM_STUDIOS_B0_8_CROWN_CHAIN_UNIQUE_LINEAGE_v1_0.zip' },
    bodies: [
      {id:'jmstudios-source-rebegin',html:source,hash:'not-original',size:source.length},
      {id:'jmstudios-actual-crown',html:source,hash:'not-original',size:source.length}
    ]
  };
  await page.locator('#importFile').setInputFiles({
    name: 'forged-jmstudios-lineage.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(forged))
  });
  await expect(page.locator('#toast')).toContainText('JMStudios exact-source verification HOLD');
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`);
  expect(await page.evaluate(() => window.GamesBeyond.pack.bodies.filter(x => x.id.startsWith('jmstudios-')).length)).toBe(0);
});

// Current mount totals are derived from the manifest. CP09 remains historical.
test('@boot registry and runtime agree without rewriting historical contact', async ({ page }) => {
  await openHouse(page);
  const registry = await (await page.request.get('registry.json')).json();
  const manifest = await (await page.request.get('payload-manifest.json')).json();
  expect(registry.publicBuiltInCount).toBe(manifest.builtInBodyCount);
  expect(registry.fullHouseCount).toBe(manifest.fullTargetCount);
  expect(registry.registered_bodies.filter(b => b.mounted).map(b => b.id).sort())
    .toEqual([...manifest.bodyIdsBuiltIn].sort());
  expect(registry.registered_bodies.filter(b => !b.mounted).map(b => b.id).sort())
    .toEqual(manifest.fullImportAdds.map(b => b.id).sort());
  expect(registry.cp09_source_edit_contact.mounted_registry_bodies).toBe(21);
  await page.locator('.nav [data-view="proof"]').click();
  await page.locator('#runProof').click();
  await expect(page.locator('#proofBox')).toContainText('builtInExpected');
  const proof = JSON.parse(await page.locator('#proofBox').textContent());
  expect(proof.bodyCount).toBe(manifest.builtInBodyCount);
  expect(proof.fullTarget).toBe(manifest.fullTargetCount);
});

// Synthetic exact-source specimens ONLY inside an intercepted test app.js.
// Production pins and all private originals remain unchanged; this earns backup
// lifecycle proof, not authentic-JMStudios gameplay or private-source proof.
test('@source-boundary verified pair survives full backup into a fresh browser context', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const ids = ['jmstudios-source-rebegin','jmstudios-actual-crown'];
  const bodies = ids.map((id,index) => {
    const html = `<!doctype html><html><head><title>Fixture ${index}</title></head><body><main>Private-lifecycle fixture ${index}</main></body></html>`;
    return { id, name:'Synthetic lifecycle fixture '+index, html,
      hash:createHash('sha256').update(html).digest('hex'), size:Buffer.byteLength(html),
      originalSourceIntegrity:'PASS_EXACT_SHA256',
      sourceTransport:'RECOVERED_FROM_EXISTING_JM_LINEAGE_NOT_NEW_CREATION' };
  });
  let app = readFileSync(new URL('../app.js',import.meta.url),'utf8');
  app = app.replace('b033ab12aee459b6a388732a2b3ab7952c21d035d0fb0cd741f1db36da01406f',bodies[0].hash)
    .replace('27c877edbf044862bab22d8273595d6baaafc93d894cff89c88b9c50e1fda896',bodies[1].hash);
  const intercept = p => p.route('**/app.js*',route=>route.fulfill({contentType:'application/javascript',body:app}));
  await intercept(page);
  await openHouse(page);
  const incoming = {source_custody:{original_lineage_zip_file:'JM_STUDIOS_B0_8_CROWN_CHAIN_UNIQUE_LINEAGE_v1_0.zip'},bodies};
  await page.locator('#importFile').setInputFiles({name:'synthetic-pair.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
  await expect(page.locator('#status')).toHaveText('24/24 FULL HOUSE');
  await expect(page.locator('#editedStat')).toHaveText('0');
  await page.locator('.nav [data-view="proof"]').click();
  const downloadWait=page.waitForEvent('download');await page.locator('#exportHouse').click();
  const download=await downloadWait,backup=JSON.parse(readFileSync(await download.path(),'utf8'));
  expect(backup.bodies).toHaveLength(24);
  // One real creator revision must stay a revision; pristine backup rows must not.
  const revised=backup.bodies.find(b=>b.id==='gameforge');
  revised.html+='<!-- synthetic creator revision -->';
  revised.hash=createHash('sha256').update(revised.html).digest('hex');
  revised.size=Buffer.byteLength(revised.html);revised.edited=true;
  expect(backup.source_custody.original_lineage_zip_file).toBe(incoming.source_custody.original_lineage_zip_file);
  const context=await browser.newContext({serviceWorkers:'block'});
  try {
    const fresh=await context.newPage();await intercept(fresh);await openHouse(fresh);
    await fresh.locator('#importFile').setInputFiles({name:'synthetic-full-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await expect(fresh.locator('#status')).toHaveText('24/24 FULL HOUSE');
    await fresh.reload();await expect(fresh.locator('#status')).toHaveText('24 MOUNTED · 24 FULL');
    await expect(fresh.locator('#editedStat')).toHaveText('1');
    expect(await fresh.evaluate(()=>window.GamesBeyond.pack.bodies.filter(b=>b.edited).map(b=>b.id))).toEqual(['gameforge']);
    const restored=await fresh.evaluate(()=>window.GamesBeyond.pack.bodies.filter(b=>b.id.startsWith('jmstudios-')).map(b=>({id:b.id,html:b.html,hash:b.hash,edited:b.edited})));
    expect(restored.sort((a,b)=>a.id.localeCompare(b.id))).toEqual(bodies.map(b=>({id:b.id,html:b.html,hash:b.hash,edited:false})).sort((a,b)=>a.id.localeCompare(b.id)));
  } finally {await context.close();}
});


test('@boot legacy catalogue re-entry cannot overwrite live House authority', async ({ page }) => {
  await openHouse(page);
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await page.reload();
  await expect(page.locator('#status')).toHaveText(`${BUILT_IN} MOUNTED · ${FULL_TARGET} FULL`, {timeout:45_000});
  await expect(page.locator('.hero p')).toContainText('Mounted Rooms follow the verified payload manifest');
  await expect(page.locator('#catalogueStat').locator('..')).toContainText('Legacy catalogue subset');
  await expect(page.locator('.hero p')).not.toContainText('Twenty-one');
  await expect(page.locator('#status')).not.toContainText('WHOLE CATALOGUE CURRENT');
});
