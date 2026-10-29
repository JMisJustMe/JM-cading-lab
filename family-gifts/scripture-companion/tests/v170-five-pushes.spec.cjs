'use strict';
// JM Scripture Companion v1.7 — five deep pushes, actual browser admission.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:4198/family-gifts/scripture-companion/';
const KEY='jm.family.scripture-companion.v1',DRAFT=KEY+'.draft',SCHEMA='jm-scripture-companion/1';
const note=(id,ref,text)=>({id,ref,text,date:'2026-10-28T12:00:00Z'});
const visit=(book,chapter,at='2026-10-28T12:00:00Z')=>({book,chapter,at});
async function state(p){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)}
async function choose(p,book,chapter){await p.selectOption('#book',book);await p.fill('#chapter',String(chapter));await p.locator('#chapter').dispatchEvent('change')}
async function importData(p,backup,expectConfirm=true){
 await p.locator('[data-tab="settings"]').click();
 if(expectConfirm)p.once('dialog',d=>d.accept());
 await p.locator('#import').setInputFiles({name:'transfer.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await p.waitForTimeout(100);
 return p.locator('#importStatus').textContent();
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const phone=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const laptop=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});
 const a=await phone.newPage(),b=await laptop.newPage(),errors=[];
 a.on('pageerror',e=>errors.push('phone '+e.message));
 b.on('pageerror',e=>errors.push('laptop '+e.message));
 try{
  await Promise.all([a.goto(URL,{waitUntil:'load'}),b.goto(URL,{waitUntil:'load'})]);
  assert.equal(await a.locator('#book option').count(),66);
  await choose(a,'John',3);
  // Push 2: contextual notes always derive from original stored notes.
  await a.evaluate(({key,n})=>{
   const d=JSON.parse(localStorage.getItem(key));
   d.notes=[n,{id:'other',ref:'John 4',text:'Not this chapter',date:n.date}];
   localStorage.setItem(key,JSON.stringify(d));
  },{key:KEY,n:note('j3','John 3:16','A private reflection')});
  await a.reload({waitUntil:'load'});
  assert.match(await a.locator('#selectedReflectionCount').textContent(),/1 note/);
  assert.match(await a.locator('#selectedReflections').textContent(),/A private reflection/);
  await a.click('#selectedReflectionsAll');
  assert.equal(await a.locator('#notesScope').inputValue(),'chapter');
  assert.equal(await a.locator('#notesList .entry').count(),1);
  await a.locator('[data-tab="read"]').click();
  await a.click('#selectedReflectionsAdd');
  assert.equal(await a.locator('#page-notes').isVisible(),true);
  await a.fill('#noteText','New thought while reading.');
  await a.reload({waitUntil:'load'});
  await a.locator('[data-tab="notes"]').click();
  assert.equal(await a.locator('#noteText').inputValue(),'New thought while reading.');
  await a.click('#clearNote');

  // Push 1: opening an official link produces unique bounded visits, not read completion.
  await a.locator('[data-tab="read"]').click();
  await choose(a,'Psalms',23);
  // Actual anchor click opens a new tab; keep privacy/visit state in the original page.
  const popupWait=a.waitForEvent('popup');
  await a.locator('#open').click();
  const popup=await popupWait;await popup.close();
  let d=await state(a);
  assert.equal(d.recentVisits.length,1);
  assert.equal(d.recentVisits[0].book,'Psalms');
  assert.equal(d.queue.filter(x=>x.done).length,0,'opening never marks read');
  await a.locator('#open').dispatchEvent('click');
  assert.equal((await state(a)).recentVisits.length,1,'repeated visits coalesce');

  // Push 3: explicit completion, undo, and focus next pending.
  await a.click('#markCurrentRead');
  d=await state(a);assert.equal(d.queue.find(x=>x.book==='Psalms'&&x.chapter===23).done,true);
  await a.click('#markCurrentUnread');
  d=await state(a);assert.equal(d.queue.find(x=>x.book==='Psalms'&&x.chapter===23).done,false);
  await a.click('#focusNextUnread');
  assert.equal(await a.locator('#book').inputValue(),'Psalms');
  await a.click('#markCurrentRead');
  await a.click('#focusNextUnread');
  assert.match(await a.locator('#roomActionStatus').textContent(),/No unread chapters/);

  // Bounded history under repeated visits; no new Bible content copied.
  for(let i=1;i<=26;i++){
   await choose(a,'Genesis',i);
   await a.locator('#open').dispatchEvent('click');
  }
  d=await state(a);
  assert.equal(d.recentVisits.length,24,'history storage bounded to 24 unique chapters');
  assert.equal(d.recentVisits[0].chapter,26);
  assert.equal(d.recentVisits.some(v=>v.book==='Genesis'&&v.chapter===1),false,'oldest chapters evicted');
  assert.equal(await a.locator('#recentChapters .entry').count(),6,'UI bounded to six');
  assert.equal(d.queue.filter(x=>x.done).length,1,'opening chapters never adds to completed count');
  const historyBefore=d.recentVisits.slice();

  // Push 4: transfer of history + notes across two independent browser contexts.
  const downloadWait=a.waitForEvent('download');
  await a.locator('[data-tab="settings"]').click();
  await a.click('#export');
  const dl=await downloadWait,backup=JSON.parse(await fs.readFile(await dl.path(),'utf8'));
  assert.equal(backup.schema,SCHEMA);assert.equal(backup.data.recentVisits.length,24);
  const result=await importData(b,backup);
  assert.match(result,/Safe merge complete/);
  let other=await state(b);
  assert.equal(other.recentVisits.length,24);
  assert.equal(other.notes.length,2);
  assert.equal(other.queue.find(x=>x.book==='Psalms'&&x.chapter===23).done,true);
  assert.equal(other.lastOpened.book,'Genesis','empty receiver adopts known last opening');
  assert.equal((await state(a)).recentVisits.length,historyBefore.length,'sender untouched');

  // Merge twice, no duplicates or device-specific browser storage collisions.
  await importData(b,backup);
  other=await state(b);
  assert.equal(other.recentVisits.length,24);
  assert.equal(other.notes.length,2);
  assert.equal(new Set(other.recentVisits.map(v=>v.book+'|'+v.chapter)).size,24);

  // A malformed history is rejected without changing local data.
  const before=await b.evaluate(k=>localStorage.getItem(k),KEY);
  const invalid=JSON.parse(JSON.stringify(backup));
  invalid.data.recentVisits=[{book:'John',chapter:3000,at:'not-a-date'}];
  const invalidMessage=await importData(b,invalid,false);
  assert.match(invalidMessage,/invalid reading history/);
  assert.equal(await b.evaluate(k=>localStorage.getItem(k),KEY),before);

  // Local history stays authoritative when importing older remote resume state.
  await b.locator('[data-tab="read"]').click();
  await choose(b,'Revelation',21);
  await b.locator('#open').dispatchEvent('click');
  await importData(b,backup);
  other=await state(b);
  assert.equal(other.lastOpened.book,'Revelation','receiver last-opened selection stays its own');
  assert.equal(other.recentVisits[0].book,'Revelation');
  assert.equal(other.recentVisits.length,24);
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS v1.7: real link visit history, no auto-reading, chapter notes, draft reload, progress undo/focus, 24-slot limit, phone/laptop history merge, idempotence, malformed rejection and privacy');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
