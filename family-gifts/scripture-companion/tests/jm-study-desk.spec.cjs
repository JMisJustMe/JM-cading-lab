'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:844}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4198/family-gifts/scripture-companion/',{waitUntil:'load'});
   await page.locator('[data-tab="explore"]').click();
   assert(await page.locator('#jmStudyDesk').isVisible());
   assert.equal(await page.locator('#jmStudyResults .entry').count(),18);
   await page.selectOption('#jmStudyTheme','Study');
   assert.equal(await page.locator('#jmStudyResults .entry').count(),2);
   await page.fill('#jmStudySearch','Timothy');
   assert.equal(await page.locator('#jmStudyResults .entry').count(),1);
   const card=page.locator('#jmStudyResults .entry').first();
   assert.equal(await card.getByRole('link',{name:/Read official Study Bible/}).getAttribute('href'),'https://www.jw.org/en/library/bible/study-bible/books/2-timothy/3/');
   await card.getByRole('button',{name:'Select in reader'}).click();
   await page.locator('[data-tab="explore"]').click();
   assert.equal(await page.locator('#book').inputValue(),'2 Timothy');
   assert.equal(await page.locator('#chapter').inputValue(),'3');
   assert.equal(await page.locator('#verse').inputValue(),'16');
   await card.getByRole('link',{name:/Read official Study Bible/}).dispatchEvent('click');
   const visits=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).recentVisits);
   assert.equal(visits[0].book,'2 Timothy');assert.equal(visits[0].chapter,3);
   await card.getByRole('button',{name:/Save/}).click();
   await card.getByRole('button',{name:/Save/}).click();
   await card.getByRole('button',{name:/Reading list/}).click();
   await card.getByRole('button',{name:/Reading list/}).click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.equal(saved.bookmarks.filter(r=>r.book==='2 Timothy'&&r.chapter===3&&r.verse==='16').length,1);
   assert.equal(saved.queue.filter(r=>r.book==='2 Timothy'&&r.chapter===3).length,1);
   await page.locator('[data-tab="notes"]').click();
   await page.fill('#noteRef','2 Timothy 3:16');await page.fill('#noteText','My private reflections');
   await page.locator('#saveNote').click();
   await page.reload({waitUntil:'load'});
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).notes)).length,1);
   assert.deepEqual(errors,[]);
   console.log('PASS Mum Study Desk '+width+'px: 18 refs, valid Study Bible route, exact passage, private notes, deduplicated bookmarks and reading-list');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
