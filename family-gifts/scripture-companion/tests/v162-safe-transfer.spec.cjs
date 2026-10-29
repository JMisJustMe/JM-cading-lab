'use strict';
// JM Scripture Companion v1.6.2: browser-backed non-destructive phone/laptop file transfer.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:4198/family-gifts/scripture-companion/';
const KEY='jm.family.scripture-companion.v1',DRAFT=KEY+'.draft',SCHEMA='jm-scripture-companion/1';
function note(id,ref,text){return {id,ref,text,date:'2026-10-28T00:00:00Z'}}
function ref(id,book,chapter,verse=''){return {id,book,chapter,verse}}
function reading(id,book,chapter,done){return {id,book,chapter,done}}
function backup(data,draft){return {schema:SCHEMA,exportedAt:'2026-10-28T00:00:00Z',data,...(draft?{draft}:{})}}
async function importFile(page,content,{accept=true,mode='merge',expectDialog=true}={}){
 await page.selectOption('#importMode',mode);
 if(expectDialog){
  page.once('dialog',async dialog=>accept?dialog.accept():dialog.dismiss());
 }
 await page.locator('#import').setInputFiles({name:'JM-Scripture-Companion-Backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(content))});
 await page.waitForTimeout(80);
 return await page.locator('#importStatus').textContent();
}
async function state(page){return await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const sender=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const receiver=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});
 const a=await sender.newPage(),b=await receiver.newPage(),errors=[];
 a.on('pageerror',e=>errors.push('sender '+e.message));
 b.on('pageerror',e=>errors.push('receiver '+e.message));
 try{
  await a.goto(URL,{waitUntil:'load'});await b.goto(URL,{waitUntil:'load'});
  assert.equal(await a.locator('#importMode').inputValue(),'merge','safe merge is default');
  const local={book:'Psalms',chapter:23,verse:'',bookmarks:[ref('bookmark-local','Psalms',23)],notes:[note('collide','Psalms 23','Original local note')],queue:[reading('queue-local','Psalms',23,false)],dark:false,size:17};
  await a.evaluate(({k,d,dk})=>{localStorage.setItem(k,JSON.stringify(d));localStorage.setItem(dk,JSON.stringify({ref:'Luke 1',text:'Unfinished local draft',editingNoteId:null}))},{k:KEY,d:local,dk:DRAFT});
  await a.reload({waitUntil:'load'});await a.locator('[data-tab="settings"]').click();
  const incoming={notes:[note('collide','Psalms 23','Edited on laptop'),note('brand-new','John 3','Second note'),note('exact-dup','Psalms 23','Original local note')],bookmarks:[ref('bookmark-local','Psalms',23),ref('bookmark-new','John',3)],queue:[reading('queue-local','Psalms',23,true),reading('queue-new','John',3,false)]};
  let status=await importFile(a,backup(incoming,{ref:'Romans 12',text:'Unfinished from other device'}));
  assert.match(status,/Safe merge complete/);
  assert.match(status,/Imported unfinished draft kept as recovered note/);
  let merged=await state(a);
  assert.equal(merged.notes.length,4,'original, collision copy, new note, recovered draft (not duplicated original)');
  assert.equal(merged.notes.find(n=>n.id==='collide').text,'Original local note','original ID/content unchanged');
  assert(merged.notes.some(n=>n.text==='Edited on laptop'&&n.id!=='collide'),'collision preserved separately');
  assert.equal(merged.bookmarks.length,2,'duplicate bookmarks skipped');
  assert.equal(merged.queue.length,2,'queue merged');
  assert.equal(merged.queue.find(n=>n.book==='Psalms').done,true,'reading progress union');
  assert.equal(await a.evaluate(k=>JSON.parse(localStorage.getItem(k)).text,DRAFT),'Unfinished local draft','merge preserves current open draft');
  await a.locator('[data-tab="notes"]').click();
  assert.equal(await a.locator('#noteText').inputValue(),'Unfinished local draft');
  await a.locator('[data-tab="settings"]').click();
  status=await importFile(a,backup(incoming,{ref:'Romans 12',text:'Unfinished from other device'}));
  merged=await state(a);
  assert.equal(merged.notes.length,4,'re-import is idempotent');
  assert.equal(merged.bookmarks.length,2);
  assert.equal(merged.queue.length,2);

  // Cancel after preview. Both storage keys must remain identical.
  const before=await a.evaluate(({k,d})=>[localStorage.getItem(k),localStorage.getItem(d)],{k:KEY,d:DRAFT});
  status=await importFile(a,backup({notes:[note('cancelled','Mark 1','Should never arrive')],bookmarks:[]}),{accept:false});
  assert.match(status,/cancelled/);
  const after=await a.evaluate(({k,d})=>[localStorage.getItem(k),localStorage.getItem(d)],{k:KEY,d:DRAFT});
  assert.deepEqual(after,before,'cancel does not modify either original storage slot');

  // Rejected malformed input does not silently discard or modify data.
  status=await importFile(a,backup({notes:[{id:'oops',text:42,ref:'John 1'}],bookmarks:[]}),{expectDialog:false});
  assert.match(status,/invalid note/);
  assert.deepEqual(await a.evaluate(({k,d})=>[localStorage.getItem(k),localStorage.getItem(d)],{k:KEY,d:DRAFT}),before);

  // Export a full, real backup from the phone; load it on independent laptop context.
  const dlwait=a.waitForEvent('download');
  await a.click('#export');
  const dl=await dlwait,download=JSON.parse(await fs.readFile(await dl.path(),'utf8'));
  assert.equal(download.schema,SCHEMA);
  assert.equal(download.data.notes.length,4);
  assert.equal(download.draft.text,'Unfinished local draft');
  await b.locator('[data-tab="settings"]').click();
  status=await importFile(b,download);
  assert.match(status,/Safe merge complete/);
  const transferred=await state(b);
  assert.equal(transferred.notes.length,5,'imported four saved notes and sender draft recovered as fifth');
  assert.equal(transferred.queue.length,2);
  assert.equal(transferred.bookmarks.length,2);
  assert.equal(await b.evaluate(k=>localStorage.getItem(k),DRAFT),null,'imported foreign draft does not overwrite local draft slot');

  // Explicit advanced replacement still available. Cancel and then accept it.
  const completeBackup=backup({book:'John',chapter:3,notes:[note('only','John 3','Full restore')],bookmarks:[ref('restored','John',3)],queue:[reading('restored-queue','John',3,true)],size:19,dark:true},{ref:'John 3',text:'Restored unfinished draft'});
  status=await importFile(b,completeBackup,{mode:'replace',accept:false});
  assert.match(status,/cancelled/);
  assert.equal((await state(b)).notes.length,5);
  status=await importFile(b,completeBackup,{mode:'replace',accept:true});
  assert.match(status,/Full backup restored/);
  assert.equal((await state(b)).notes.length,1);
  assert.equal(await b.evaluate(k=>JSON.parse(localStorage.getItem(k)).text,DRAFT),'Restored unfinished draft');
  await b.reload({waitUntil:'load'});await b.locator('[data-tab="notes"]').click();
  assert.equal(await b.locator('#noteText').inputValue(),'Restored unfinished draft');
  assert.equal((await state(b)).bookmarks.length,1);
  assert.equal((await state(b)).queue[0].done,true);
  assert.deepEqual(errors,[],'no uncaught browser errors');
  console.log('PASS v1.6.2: two isolated devices, merge/replace, conflicts, dedupe, draft safety, progress, invalid & cancel, legacy schema and real backup transfer');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
