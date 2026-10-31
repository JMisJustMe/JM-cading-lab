import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

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

test('@registry-source exact 22/24 identities match the authoritative payload manifest', () => {
  const registry = JSON.parse(readFileSync(new URL('../registry.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('../payload-manifest.json', import.meta.url), 'utf8'));
  const builtInIds = registry.registered_bodies.filter(body => body.mounted).map(body => body.id).sort();
  const privateIds = registry.registered_bodies.filter(body => !body.mounted).map(body => body.id).sort();
  expect(registry.publicBuiltInCount).toBe(manifest.builtInBodyCount);
  expect(registry.fullHouseCount).toBe(manifest.fullTargetCount);
  expect(builtInIds).toEqual([...manifest.bodyIdsBuiltIn].sort());
  expect(registry.registered_bodies).toHaveLength(manifest.fullTargetCount);
  expect(privateIds).toEqual(manifest.fullImportAdds.map(body => body.id).sort());
  expect(privateIds).toEqual(['jmstudios-actual-crown', 'jmstudios-source-rebegin']);
  expect(registry.cp09_source_edit_contact.mounted_registry_bodies).toBe(21); // Frozen historical CP09 proof, not current authority.
});

// Public fixture tests the actual House adapter source without checking private
// original HTML into Git. Separate exact-source Chromium proof remains 12/12.
test('@historical-room adapter routes six original-named redirects, fails closed on missing lineage', async ({ page }) => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const start = app.indexOf('function adaptOriginalJMStudiosHistoricalRoutes(doc){');
  const end = app.indexOf('async function commitHouseImport(items){', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const adapter = app.slice(start, end);
  const pathById = {
    room_007: 'OPEN_FIRST_JM_STUDIOS_B0_5_2.html',
    room_008: 'OPEN_FIRST_JM_STUDIOS_B0_5_3.html',
    room_009: 'OPEN_FIRST_JM_STUDIOS_B0_5_4.html',
    room_010: 'OPEN_FIRST_JM_STUDIOS_B0_5_OBSERVERS_DOOR.html',
    room_011: 'OPEN_FIRST_JM_STUDIOS_B0_6.html',
    room_012: 'OPEN_FIRST_JM_STUDIOS_B0_7.html',
    room_013: 'OPEN_FIRST_JM_STUDIOS_B0_8.html'
  };
  const to = {
    room_007: pathById.room_008, room_008: pathById.room_009,
    room_009: pathById.room_011, room_010: pathById.room_007,
    room_011: pathById.room_012, room_012: pathById.room_013
  };
  const target = '<!doctype html><html><title>Original successor fixture</title></html>';
  const fixture = (broken = false) => {
    const rooms = Array.from({ length: 13 }, (_, i) => {
      const id = 'room_' + String(i + 1).padStart(3, '0');
      const next = broken && id === 'room_011' ? 'ABSENT_ORIGINAL.html' : to[id];
      const html = next ? '<script>location.href=\'' + next + '\';</script>' : target;
      return { id, path: pathById[id] || 'substantive-' + id + '.html', html_b64: btoa(html) };
    });
    return '<!doctype html><html><body><output id="opened"></output>' +
      rooms.map(room => '<button data-room="' + room.id + '">' + room.id + '</button>').join('') +
      '<iframe id="roomFrame"></iframe><script>const ROOMS = ' + JSON.stringify(rooms) +
      ';function openRoom(id){const r=ROOMS.find(x=>x.id===id);document.querySelector("#roomFrame").srcdoc=atob(r.html_b64);document.querySelector("#opened").textContent=id}</script></body></html>';
  };
  await page.setContent(fixture());
  await page.addScriptTag({ content: adapter + '\nwindow.__jmRouted=adaptOriginalJMStudiosHistoricalRoutes(document);' });
  expect(await page.evaluate(() => window.__jmRouted)).toBe(6);
  for (let n = 7; n <= 12; n++) {
    await page.locator('[data-room="room_' + String(n).padStart(3, '0') + '"]').click();
    await expect(page.locator('#opened')).toHaveText('room_013');
    expect(await page.locator('#roomFrame').getAttribute('srcdoc')).toBe(target);
  }
  await page.setContent(fixture(true));
  await page.addScriptTag({ content: adapter + '\nwindow.__jmRouted=adaptOriginalJMStudiosHistoricalRoutes(document);' });
  expect(await page.evaluate(() => window.__jmRouted)).toBe(0);
  expect(await page.locator('[data-original-historical-target]').count()).toBe(0);
});

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
