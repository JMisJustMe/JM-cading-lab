'use strict';
// JM Scripture Companion v1.6.1 — actual browser checks, not screenshots or static assertions alone.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:4198/family-gifts/scripture-companion/';
const KEY='jm.family.scripture-companion.v1';
const DRAFT=KEY+'.draft';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(URL,{waitUntil:'load'});
  assert.equal(await page.locator('#book option').count(),66,'all 66 books preserved');
  assert.match(await page.locator('#open').getAttribute('href'),/^https:\/\/www\.jw\.org\//);
  const controls=await page.locator('.chapter-switch button').evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().left,r:el.getBoundingClientRect().right,width:innerWidth,height:el.getBoundingClientRect().height})));
  assert.equal(controls.length,2);
  for(const rect of controls){assert(rect.x>=0&&rect.r<=rect.width,'mobile chapter control inside viewport');assert(rect.height>=48,'one-tap button size')}
  await page.selectOption('#book','Genesis');
  assert.equal(await page.locator('#previousChapter').isDisabled(),true,'Genesis 1 beginning boundary');
  await page.click('#nextChapter');
  assert.equal(await page.locator('#chapter').inputValue(),'2');
  await page.fill('#chapter','50');
  await page.click('#nextChapter');
  assert.equal(await page.locator('#book').inputValue(),'Exodus','crosses into next Bible book');
  assert.equal(await page.locator('#chapter').inputValue(),'1');
  await page.click('#previousChapter');
  assert.equal(await page.locator('#book').inputValue(),'Genesis');
  assert.equal(await page.locator('#chapter').inputValue(),'50');
  await page.selectOption('#book','Revelation');
  await page.fill('#chapter','22');
  assert.equal(await page.locator('#nextChapter').isDisabled(),true,'Revelation 22 ending boundary');

  await page.locator('[data-tab="notes"]').click();
  await page.fill('#noteRef','Psalms 23:1');
  await page.fill('#noteText','A personal unfinished thought.');
  assert.match(await page.locator('#noteDraftStatus').textContent(),/saved privately/);
  let draft=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),DRAFT);
  assert.equal(draft.text,'A personal unfinished thought.');
  await page.reload({waitUntil:'load'});
  await page.locator('[data-tab="notes"]').click();
  assert.equal(await page.locator('#noteText').inputValue(),'A personal unfinished thought.','reload restores draft');
  assert.match(await page.locator('#noteDraftStatus').textContent(),/Recovered/);
  await page.click('#saveNote');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),DRAFT),null,'draft removed after successful save');
  let stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(stored.notes.length,1);
  assert.equal(stored.notes[0].text,'A personal unfinished thought.');

  // Edit a saved note; reload mid-edit; finish without creating a duplicate.
  await page.getByRole('button',{name:'Edit'}).click();
  await page.fill('#noteText','Revised unsaved text after reopening.');
  await page.reload({waitUntil:'load'});
  await page.locator('[data-tab="notes"]').click();
  assert.equal(await page.locator('#noteText').inputValue(),'Revised unsaved text after reopening.');
  assert.equal(await page.locator('#saveNote').textContent(),'Update note');
  await page.click('#saveNote');
  stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(stored.notes.length,1,'edit does not duplicate saved note');
  assert.equal(stored.notes[0].text,'Revised unsaved text after reopening.');

  // Export keeps historical backup schema and optionally carries a draft.
  await page.fill('#noteRef','John 3');
  await page.fill('#noteText','Transfer-safe unfinished draft');
  await page.locator('[data-tab="settings"]').click();
  const downloadWait=page.waitForEvent('download');
  await page.click('#export');
  const download=await downloadWait;
  const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(backup.schema,'jm-scripture-companion/1');
  assert.equal(backup.data.notes.length,1);
  assert.equal(backup.draft.text,'Transfer-safe unfinished draft');

  await page.setViewportSize({width:1280,height:800});
  await page.locator('[data-tab="read"]').click();
  const desktop=await page.locator('.chapter-switch button').evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().left,r:el.getBoundingClientRect().right,width:innerWidth})));
  assert(desktop.every(r=>r.x>=0&&r.r<=r.width),'desktop controls inside viewport');

  // Validate the real service worker can reload the same app offline.
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'load'});
  await page.context().setOffline(true);
  await page.reload({waitUntil:'load'});
  await page.locator('[data-tab="notes"]').click();
  assert.equal(await page.locator('#noteText').inputValue(),'Transfer-safe unfinished draft','offline reload keeps draft');
  assert.equal(errors.length,0,'no uncaught browser runtime errors: '+errors.join('; '));
  console.log('PASS: 66 books, source links, mobile+desktop, navigation boundaries, drafts/reload, edits, backup and offline Chromium reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
