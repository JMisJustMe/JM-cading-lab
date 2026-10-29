'use strict';
// JM Scripture Companion v1.6.3 — real browser proof for indexed reflection contact.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:4198/family-gifts/scripture-companion/';
const KEY='jm.family.scripture-companion.v1',DRAFT=KEY+'.draft';
const record=(id,ref,text)=>({id,ref,text,date:'2026-10-28T12:00:00Z'});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(URL,{waitUntil:'load'});
  const baseline=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const seed={...baseline,book:'John',chapter:3,verse:'',notes:[
   record('one','Psalms 23','Peace and comfort'),
   record('two','John 3','Mercy and kindness'),
   record('three','John 3:16','Love that endures'),
   record('four','Personal journal','An unlinked memory')
  ]};
  await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:KEY,data:seed});
  await page.reload({waitUntil:'load'});
  await page.locator('[data-tab="notes"]').click();
  assert.match(await page.locator('#notesCount').textContent(),/4 of 4/);
  assert.equal(await page.locator('#notesList .entry').count(),4);
  await page.fill('#notesSearch','MERCY');
  assert.equal(await page.locator('#notesList .entry').count(),1,'case-insensitive full text');
  assert.match(await page.locator('#notesList .entry').innerText(),/Mercy/);
  await page.fill('#notesSearch','unlinked');
  assert.equal(await page.locator('#notesList .entry').count(),1,'unlinked notes searchable');
  assert.equal(await page.locator('#notesList .entry a').count(),0,'unparsed note never invents a Scripture link');
  await page.click('#clearNotesFilter');
  assert.equal(await page.locator('#notesList .entry').count(),4);
  await page.selectOption('#notesScope','chapter');
  assert.match(await page.locator('#notesCount').textContent(),/2 of 4.*John 3/);
  assert.equal(await page.locator('#notesList .entry').count(),2,'John 3 matches John 3:16');
  const link=page.locator('#notesList .entry').first().getByRole('link',{name:'Read official chapter'});
  assert.equal(await link.getAttribute('href'),'https://www.jw.org/en/library/bible/nwt/books/john/3/');
  assert.equal(await link.getAttribute('target'),'_blank');
  await page.locator('#notesList .entry').first().getByRole('button',{name:'Select chapter'}).click();
  assert.equal(await page.locator('#book').inputValue(),'John');
  assert.equal(await page.locator('#chapter').inputValue(),'3');
  assert.equal(await page.locator('#verse').inputValue(),'16');
  assert.equal(await page.locator('#page-read').isVisible(),true);
  await page.click('#roomFindNotes');
  assert.equal(await page.locator('#page-notes').isVisible(),true);
  assert.equal(await page.locator('#notesScope').inputValue(),'chapter');
  assert.equal(await page.locator('#notesList .entry').count(),2);
  await page.fill('#notesSearch','nothing-is-matching');
  assert.match(await page.locator('#notesList').textContent(),/No notes match/);
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).notes.length,KEY)),4,'filter never alters stored notes');
  await page.locator('#clearNotesFilter').click();

  // Existing drafts remain intact while searching, selecting and revisiting.
  await page.fill('#noteRef','John 3');
  await page.fill('#noteText','A carefully preserved unfinished draft.');
  await page.fill('#notesSearch','Comfort');
  await page.reload({waitUntil:'load'});
  await page.locator('[data-tab="notes"]').click();
  assert.equal(await page.locator('#noteText').inputValue(),'A carefully preserved unfinished draft.');

  // Deliberate failure simulation: saved note must NOT be mutated in memory.
  page.on('dialog',d=>d.accept());
  await page.click('#clearNote');
  await page.locator('#notesList .entry').first().getByRole('button',{name:'Edit'}).click();
  assert.equal(await page.locator('#noteText').inputValue(),'An unlinked memory');
  await page.fill('#noteText','Changed, but storage is unavailable');
  await page.evaluate(key=>{
   const orig=Storage.prototype.setItem;
   window.__jmOriginalSetItem=orig;
   Storage.prototype.setItem=function(k,v){if(k===key)throw Error('synthetic unavailable storage');return orig.call(this,k,v)};
  },KEY);
  await page.click('#saveNote');
  assert.match(await page.locator('#noteDraftStatus').textContent(),/NOT saved/);
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).notes,KEY)).find(x=>x.id==='four').text,'An unlinked memory','committed copy remains unchanged');
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).text,DRAFT),'Changed, but storage is unavailable');
  await page.click('#clearNotesFilter');
  assert.match(await page.locator('#notesList').textContent(),/An unlinked memory/,'in-memory rollback: list still shows prior version');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__jmOriginalSetItem});
  await page.click('#saveNote');
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).notes,KEY)).find(x=>x.id==='four').text,'Changed, but storage is unavailable');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),DRAFT),null);

  // Phone and laptop note collection never exceeds viewport.
  for(const width of [360,390,1280]){
   await page.setViewportSize({width,height:800});
   const bounds=await page.locator('#notesList .entry').first().evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,outer:innerWidth}));
   assert(bounds.left>=0&&bounds.right<=bounds.outer, 'notes fit '+width+'px');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS v1.6.3: local note search, chapter matching, safe official links, chapter return, draft recovery, failed storage rollback and phone/laptop layouts');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
