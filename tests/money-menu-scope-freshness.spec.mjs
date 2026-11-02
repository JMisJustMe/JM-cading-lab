import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// JM Money Menu v1.2 public contact carrier. Tests only enquiry receipt freshness.
// No payment, live email submission, private authority, or physical owner device claim.
const browser=await chromium.launch({headless:true});
let passed=0;
try {
  for (const [name,viewport] of [
    ['phone',{width:390,height:844}],
    ['desktop',{width:1440,height:960}]
  ]) {
    const page=await browser.newPage({viewport,acceptDownloads:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4175/money-menu/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#frontOffers [data-featured-id]');
    assert.equal(await page.locator('#shown').textContent(),'242','route authority count');

    await page.locator('#frontOffers [data-featured-id]').first().click();
    await page.locator('#clientName').fill('First draft');
    await page.locator('#clientNeed').fill('Original need');
    await page.locator('#enquiryForm button[type="submit"]').click();
    assert.match(await page.locator('#scopePreview').textContent(),/First draft/);

    // The defect: an already-previewed receipt was reused after the visitor edited it.
    await page.locator('#clientName').fill('Revised owner enquiry');
    await page.locator('#clientNeed').fill('Revised need');
    const [jsonDownload]=await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadScopeJson').click()
    ]);
    const json=JSON.parse(await readFile(await jsonDownload.path(),'utf8'));
    assert.equal(json.enquiry.name,'Revised owner enquiry');
    assert.equal(json.enquiry.need,'Revised need');
    assert.equal(json.route_count,1);
    assert.equal(json.scope_state,'REQUESTED_SCOPE_NOT_ACCEPTED_CONTRACT');
    assert.match(await page.locator('#scopePreview').textContent(),/Revised owner enquiry/);
    passed++;

    await page.locator('#clientBoundary').fill('Preserve original rights');
    const [textDownload]=await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadScopeText').click()
    ]);
    const receipt=await readFile(await textDownload.path(),'utf8');
    assert.match(receipt,/Revised owner enquiry/);
    assert.match(receipt,/Preserve original rights/);
    assert.doesNotMatch(receipt,/First draft/);
    passed++;

    // Shortlist changes must also propagate after a prior receipt was generated.
    await page.locator('#closeEnquiry').click();
    await page.locator('#frontOffers [data-featured-id]').nth(1).click();
    const [secondDownload]=await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadScopeJson').click()
    ]);
    const updated=JSON.parse(await readFile(await secondDownload.path(),'utf8'));
    assert.equal(updated.route_count,2);
    assert.equal(new Set(updated.routes.map(r=>r.id)).size,2);
    assert.equal(updated.enquiry.name,'Revised owner enquiry');
    assert.deepEqual(errors,[],'no uncaught browser exceptions');
    passed++;
    await page.close();
    console.log(name+': 3/3 fresh receipt/shortlist cases PASS');
  }
  console.log('JM Money Menu scope freshness: '+passed+'/6 PASS (Chromium; phone/desktop emulation only)');
} finally {
  await browser.close();
}
