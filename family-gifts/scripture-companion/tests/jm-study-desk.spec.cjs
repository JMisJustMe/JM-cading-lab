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
   // CP22: walk the entire original book map; do not mistake navigation for embedded Bible text.
   const coverage=await page.evaluate(()=>window.JMBibleCoverage);
   assert.deepEqual(coverage,{books:66,chapters:1189,hebrewBooks:39,christianBooks:27,first:'Genesis',last:'Revelation'});
   assert.equal(await page.locator('#book option').count(),66);
   assert.equal(await page.locator('#book optgroup').count(),2);
   assert.match(await page.locator('#jmBibleCoverage').textContent(),/66 books · 1189 chapters/);
   const mapCheck=await page.evaluate(()=>{
     const book=document.querySelector('#book'),chapter=document.querySelector('#chapter'),open=document.querySelector('#open'),checks=[];
     for(const option of book.options){
       book.value=option.value;book.dispatchEvent(new Event('change',{bubbles:true}));
       const max=Number(chapter.max),url=new URL(open.href);
       checks.push({name:option.value,max,valid:Number.isInteger(max)&&max>0&&url.origin==='https://www.jw.org'&&url.pathname.endsWith('/'+option.value.toLowerCase().replace(/\s+/g,'-')+'/1/')});
     }
     return checks;
   });
   assert.equal(mapCheck.length,66);
   assert(mapCheck.every(row=>row.valid),'all 66 actual book selectors produce valid official chapter-one routes');
   await page.selectOption('#book','Genesis');await page.fill('#chapter','50');await page.dispatchEvent('#chapter','change');
   await page.click('#nextChapter');
   assert.equal(await page.locator('#book').inputValue(),'Exodus');assert.equal(await page.locator('#chapter').inputValue(),'1');
   await page.click('#previousChapter');
   assert.equal(await page.locator('#book').inputValue(),'Genesis');assert.equal(await page.locator('#chapter').inputValue(),'50');
   await page.selectOption('#book','Revelation');await page.fill('#chapter','22');await page.dispatchEvent('#chapter','change');
   assert.equal(await page.locator('#nextChapter').isDisabled(),true,'cannot step beyond the final chapter');
   await page.selectOption('#book','Genesis');assert.equal(await page.locator('#previousChapter').isDisabled(),true,'cannot step before the first chapter');
   await page.selectOption('#book','Psalms');await page.fill('#chapter','23');await page.dispatchEvent('#chapter','change');
   console.log('PASS CP22 COMPLETE BIBLE NAVIGATION '+width+'px: 66 books, 1189 chapters, two sections, all official routes, both boundaries');
   // CP23 tests the real seven-chapter journey, not a standalone mockup.
   await page.locator('[data-tab="explore"]').click();
   await page.selectOption('#planPicker','family');
   assert.equal(await page.locator('#planMeter').evaluate(el=>Number(el.value)),0);
   assert.match(await page.locator('#planNext').textContent(),/Colossians 3/);
   await page.locator('#planJourney').evaluate(el=>el.open=true);
   assert.equal(await page.locator('#planSteps .entry').count(),7);
   await page.locator('#planSteps .entry').first().getByRole('button',{name:/Mark read/}).click();
   assert.equal(await page.locator('#planMeter').evaluate(el=>Number(el.value)),1);
   assert.match(await page.locator('#planNext').textContent(),/Ephesians 4/);
   await page.reload();
   await page.locator('[data-tab="explore"]').click();
   assert.equal(await page.locator('#planPicker').inputValue(),'family','selected private study path returned after reload');
   assert.equal(await page.locator('#planMeter').evaluate(el=>Number(el.value)),1,'private reading queue survived reload');
   await page.locator('#planJourney').evaluate(el=>el.open=true);
   await page.locator('#planSteps .entry').first().getByRole('button',{name:/Mark unread/}).click();
   assert.equal(await page.locator('#planMeter').evaluate(el=>Number(el.value)),0);
   await page.locator('#planSteps .entry').first().getByRole('button',{name:/Notes/}).click();
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   assert.equal(await page.locator('#notesScope').inputValue(),'chapter');
   await page.locator('[data-tab="explore"]').click();
   console.log('PASS CP23 ORIGINAL SEVEN-CHAPTER JOURNEY '+width+'px: real private queue, next reference, reversible read state, notes, reload');

   await page.locator('[data-tab="explore"]').click();
   assert(await page.locator('#jmStudyDesk').isVisible());
   assert.equal(await page.locator('#jmStudyResults .entry').count(),18);
   assert.equal(await page.locator('#jmJourneySteps .entry').count(),2);
   await page.selectOption('#jmJourneyTheme','Jehovah');
   assert.match(await page.locator('#jmJourneyResume').textContent(),/Continue Jehovah with/);
   await page.reload();
   await page.locator('[data-tab="explore"]').click();
   assert.equal(await page.locator('#jmJourneyTheme').inputValue(),'Jehovah','CP21 same-device study subject returns after reload');
   assert.match(await page.locator('#jmJourneyResume').textContent(),/Continue Jehovah with/);
   await page.click('#jmJourneyQueue');
   await page.click('#jmJourneyQueue');
   const first=page.locator('#jmJourneySteps .entry').first();
   await first.getByRole('button',{name:/Mark read/}).click();
   assert.match(await page.locator('#jmJourneyProgress').textContent(),/1 of 2/);
   await page.locator('#jmJourneySteps .entry').first().getByRole('button',{name:/Mark unread/}).click();
   assert.match(await page.locator('#jmJourneyProgress').textContent(),/0 of 2/);
   await page.locator('#jmJourneySteps .entry').first().getByRole('button',{name:/Mark read/}).click();
   assert.match(await page.locator('#jmJourneyProgress').textContent(),/1 of 2/);
   await page.locator('#jmJourneySteps .entry').first().getByRole('button',{name:/My notes/}).click();
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   assert.equal(await page.locator('#notesSearch').inputValue(),'Psalms 83');
   await page.locator('[data-tab="explore"]').click();
   const routeStore=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.equal(routeStore.queue.filter(x=>x.book==='Psalms'&&x.chapter===83).length,1);
   assert(routeStore.queue.some(x=>x.book==='Psalms'&&x.chapter===83&&x.done));
   assert.equal(routeStore.queue.filter(x=>x.book==='Isaiah'&&x.chapter===42).length,1);
   await page.click('#jmJourneyNext');
   assert.equal(await page.locator('#book').inputValue(),'Isaiah');
   assert.equal(await page.locator('#chapter').inputValue(),'42');
   await page.locator('[data-tab="explore"]').click();
   assert.match(await page.locator('#jmJourneyProgress').textContent(),/1 of 2/);
   await page.click('#jmJourneyCompare');
   assert.equal(await page.locator('#jmStudyPair .entry').count(),2);
   await page.click('#jmStudyPairClose');

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
   await card.getByRole('button',{name:'Compare related passage'}).click();
   assert.equal(await page.locator('#book').inputValue(),'2 Timothy');
   assert.equal(await page.locator('#jmStudyPair .entry').count(),2);
   assert.equal(await page.locator('#jmStudyComparison').isVisible(),true);
   await page.locator('[data-tab="explore"]').click();
   await card.getByRole('button',{name:'Write reflection'}).click();
   assert.equal(await page.locator('#noteRef').inputValue(),'2 Timothy 3:16');
   await page.fill('#noteText','My private reflections');
   await page.locator('#saveNote').click();
   await page.reload({waitUntil:'load'});
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).notes)).length,1);
   await page.locator('[data-tab="explore"]').click();
   await page.selectOption('#jmStudyTheme','Study');
   await page.fill('#jmStudySearch','');
   const study=page.locator('#jmStudyResults .entry').first();
   await study.getByRole('button',{name:'Compare related passage'}).click();
   assert.equal(await page.locator('#jmStudyComparison').isVisible(),true);
   assert.equal(await page.locator('#jmStudyPair .entry').count(),2);
   assert.equal(await page.locator('#jmStudyPair a').count(),2);
   assert.match(await page.locator('#jmStudyQuestion').textContent(),/2 Timothy 3:16/);
   await page.click('#jmStudyPairReflect');
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   assert.match(await page.locator('#noteRef').inputValue(),/Acts 17:11/);
   assert.match(await page.locator('#noteText').inputValue(),/Comparing/);
   await page.fill('#noteText','My own comparison of both passages');
   await page.click('#saveNote');
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).notes)).length,2);
   await page.locator('[data-tab="explore"]').click();
   await page.click('#jmStudyPairClose');
   assert.equal(await page.locator('#jmStudyComparison').isVisible(),false);
   // CP24 user-directed read/reflect/return stays in the real application.
   await page.locator('[data-tab="read"]').click();
   assert.match(await page.locator('#jmFocusRef').textContent(),/2 Timothy 3/);
   assert.match(await page.locator('#jmFocusOfficial').getAttribute('href'),/study-bible\/books\/2-timothy\/3\//);
   const beforeSession=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   await page.click('#jmFocusMark');
   assert.match(await page.locator('#jmFocusProgress').textContent(),/Marked read by you/);
   await page.click('#jmFocusMark');
   assert.match(await page.locator('#jmFocusProgress').textContent(),/Not marked read/);
   await page.click('#jmFocusReflect');
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   const originalDraft=await page.locator('#noteText').inputValue();
   assert.match(originalDraft,/What stood out to me/);
   assert.match((await page.evaluate(()=>localStorage.getItem('jm.family.scripture-companion.v1.draft')))||'',/What stood out to me/);
   await page.locator('[data-tab="read"]').click();
   await page.click('#jmFocusReflect');
   assert.equal(await page.locator('#noteText').inputValue(),originalDraft,'reflection entry cannot replace an unfinished draft');
   assert.match(await page.locator('#jmFocusStatus').textContent(),/existing unfinished reflection is preserved/);
   const afterSession=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(afterSession.notes,beforeSession.notes,'original saved notes unchanged by focused reading and draft');
   assert.deepEqual(afterSession.bookmarks,beforeSession.bookmarks,'original bookmarks unchanged by focused reading');
   console.log('PASS CP24 READ REFLECT RETURN '+width+'px: official Study Edition, reversible progress, private draft and preserved notes');
// CP25: selecting the next personally unread passage must never claim it was read.
   await page.locator('[data-tab="read"]').click();
   await page.click('#jmFocusChoosePath');
   assert.equal(await page.locator('#page-explore').isVisible(),true);
   await page.selectOption('#planPicker','courage');
   await page.locator('[data-tab="read"]').click();
   assert.match(await page.locator('#jmFocusPath').textContent(),/Strength & hope · 0 of 7/);
   assert.match(await page.locator('#jmFocusNext').textContent(),/Joshua 1/);
   const beforeRoute=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   await page.click('#jmFocusNext');
   assert.equal(await page.locator('#book').inputValue(),'Joshua');
   assert.equal(await page.locator('#chapter').inputValue(),'1');
   assert.match(await page.locator('#jmFocusProgress').textContent(),/Not marked read/);
   const afterSelection=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(afterSelection.queue,beforeRoute.queue,'CP25 selecting is not completing any Scripture chapter');
   assert.deepEqual(afterSelection.notes,beforeRoute.notes,'CP25 next passage does not modify private notes');
   await page.click('#jmFocusMark');
   assert.match(await page.locator('#jmFocusNext').textContent(),/Isaiah 40/);
   await page.reload();
   await page.locator('[data-tab="read"]').click();
   assert.equal(await page.locator('#planPicker').inputValue(),'courage');
   assert.match(await page.locator('#jmFocusPath').textContent(),/1 of 7/);
   await page.click('#jmFocusMark');
   assert.match(await page.locator('#jmFocusNext').textContent(),/Joshua 1/);
   assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).notes)),beforeRoute.notes);
   console.log('PASS CP25 PATH TO READING ROOM '+width+'px: next chapter, separate selection/completion, reload, reversible progress and private notes');
   // CP26: actual adjacent chapter trail, with live private-note and read status.
   assert.match(await page.locator('#jmTrailContext').textContent(),/Strength & hope · passage 1 of 7/);
   assert.equal(await page.locator('#jmTrailPrevious').isDisabled(),true);
   assert.match(await page.locator('#jmTrailFollowing').textContent(),/Isaiah 40/);
   const beforeTrail=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   await page.click('#jmTrailFollowing');
   assert.equal(await page.locator('#book').inputValue(),'Isaiah');
   assert.equal(await page.locator('#chapter').inputValue(),'40');
   assert.match(await page.locator('#jmTrailPrevious').textContent(),/Joshua 1/);
   assert.match(await page.locator('#jmTrailContext').textContent(),/passage 2 of 7/);
   await page.click('#jmTrailPrevious');
   assert.equal(await page.locator('#book').inputValue(),'Joshua');
   await page.selectOption('#book','Genesis');
   assert.match(await page.locator('#jmTrailContext').textContent(),/outside Strength & hope/);
   assert.equal(await page.locator('#jmTrailFollowing').isDisabled(),true);
   const afterTrail=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(afterTrail.notes,beforeTrail.notes,'CP26 trail does not alter personal reflections');
   assert.deepEqual(afterTrail.queue,beforeTrail.queue,'CP26 trail does not change reading completion');
   console.log('PASS CP26 CONNECTED STUDY TRAIL '+width+'px: real adjacent passages, route boundaries, private notes and progress protected');
   // CP27: professional path overview reads the only original notes/queue storage.
   await page.locator('[data-tab="read"]').click();
   await page.click('#jmFocusChoosePath');
   await page.selectOption('#planPicker','quiet');
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmJourneyOverview summary').click();
   assert.equal(await page.locator('#jmJourneyCards .jm-chapter-card').count(),7);
   assert.match(await page.locator('#jmJourneyCount').textContent(),/0 of 7/);
   await page.locator('#jmJourneyCards .jm-chapter-card').first().getByRole('button',{name:'Choose'}).click();
   assert.equal(await page.locator('#book').inputValue(),'Psalms');
   assert.equal(await page.locator('#chapter').inputValue(),'23');
   assert.equal(await page.locator('#jmJourneyCards [aria-current="step"]').count(),1);
   assert.equal(await page.locator('#jmJourneyCards .jm-chapter-card a').count(),7);
   const originalQueue=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).queue);
   await page.locator('#jmJourneyCards .jm-chapter-card').first().getByRole('button',{name:'My reflections'}).click();
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   await page.fill('#noteRef','Psalms 23');
   await page.fill('#noteText','A private note that must remain only in the original JM notes');
   await page.click('#saveNote');
   await page.locator('[data-tab="read"]').click();
   assert.match(await page.locator('#jmJourneyCards .jm-chapter-card').first().textContent(),/1 private reflection/);
   assert.match(await page.locator('#jmJourneyCards .jm-reflection-preview').first().textContent(),/A private note that must remain/);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).queue),originalQueue,
    'CP27 journal and chapter choice never silently complete a passage');
   await page.click('#jmFocusMark');
   assert.match(await page.locator('#jmJourneyCount').textContent(),/1 of 7/);
   await page.reload({waitUntil:'load'});
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmJourneyOverview summary').click();
   assert.match(await page.locator('#jmJourneyCount').textContent(),/1 of 7/);
   assert.match(await page.locator('#jmJourneyCards .jm-reflection-preview').first().textContent(),/A private note that must remain/);
   await page.click('#jmFocusMark');
   assert.match(await page.locator('#jmJourneyCount').textContent(),/0 of 7/);
   assert.match(await page.locator('#jmJourneyCards .jm-reflection-preview').first().textContent(),/A private note that must remain/);
   console.log('PASS CP27 PROFESSIONAL PRIVATE STUDY ATELIER '+width+'px: seven cards, saved local reflection, completion/reversal and reload');
   // CP28: seven existing chapter cards are now genuine, private authoring actions.
   const secondCard=page.locator('#jmJourneyCards .jm-chapter-card').nth(1);
   await secondCard.getByRole('button',{name:'Write reflection'}).click();
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   assert.equal(await page.locator('#noteRef').inputValue(),'Matthew 6');
   assert.match(await page.locator('#noteText').inputValue(),/What stood out to me in Matthew 6/);
   await page.fill('#noteText','A private Matthew 6 draft that must never be overwritten.');
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmJourneyCards .jm-chapter-card').nth(2).getByRole('button',{name:'Write reflection'}).click();
   assert.equal(await page.locator('#noteRef').inputValue(),'Matthew 6','unfinished draft reference must not be replaced by another chapter');
   assert.equal(await page.locator('#noteText').inputValue(),'A private Matthew 6 draft that must never be overwritten.');
   assert.match(await page.locator('#noteDraftStatus').textContent(),/unfinished reflection is preserved/);
   await page.click('#saveNote');
   await page.locator('[data-tab="read"]').click();
   assert.match(await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).textContent(),/1 private reflection/);
   assert.match(await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).textContent(),/A private Matthew 6 draft/);
   const beforeMark=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).getByRole('button',{name:'Mark read: Matthew 6'}).click();
   assert.match(await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).textContent(),/Marked read by you/);
   await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).getByRole('button',{name:'Mark unread: Matthew 6'}).click();
   assert.match(await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).textContent(),/Not marked read/);
   await page.reload({waitUntil:'load'});
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmJourneyOverview summary').click();
   assert.match(await page.locator('#jmJourneyCards .jm-chapter-card').nth(1).textContent(),/A private Matthew 6 draft/);
   const afterMark=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(afterMark.queue.filter(q=>!(q.book==='Matthew'&&q.chapter===6)),beforeMark.queue,
    'CP28 changing Matthew does not mutate other original reading-list chapters');
   const matthewRows=afterMark.queue.filter(q=>q.book==='Matthew'&&q.chapter===6);
   assert.equal(matthewRows.length,1,'CP28 one original reading-list entry after explicit chapter actions');
   assert.equal(matthewRows[0].done,false,'CP28 reversed chapter progress is unread and not silently completed');
   assert.deepEqual(afterMark.notes,beforeMark.notes,'CP28 reading progress must not alter any saved original notes');
   assert(afterMark.notes.some(n=>n.ref==='Matthew 6'&&n.text.includes('A private Matthew 6 draft')),'CP28 the directly authored reflection remains in the original notes collection');
   // CP31: one private seven-chapter review, rendered from the existing notes and queue only.
   await page.locator('[data-tab="explore"]').click();
   await page.selectOption('#planPicker','quiet');
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmJourneyOverview').evaluate(el=>el.open=true);
   const cp31Before=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   await page.locator('#jmPathReviewToggle').click();
   assert.equal(await page.locator('#jmPathReview').isVisible(),true);
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),7);
   assert.match(await page.locator('#jmPathReviewEntries').textContent(),/A private Matthew 6 draft/);
   assert.match(await page.locator('#jmPathReviewStatus').textContent(),/private reflections/);
   assert((await page.locator('#jmPathReviewEntries a').first().getAttribute('href')).startsWith('https://www.jw.org/en/library/bible/study-bible/'));
   const cp31After=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(cp31After.queue,cp31Before.queue,'CP31 review never marks a chapter read');
   assert.deepEqual(cp31After.notes,cp31Before.notes,'CP31 review never changes private note data');
   await page.locator('#jmPathReviewEntries .jm-chapter-card').nth(1).getByRole('button',{name:'Open my notes'}).click();
   assert.equal(await page.locator('#page-notes').isVisible(),true,'CP31 returns to original note store');
   assert.equal(await page.locator('#notesScope').inputValue(),'chapter');
   assert.match(await page.locator('#notesList').textContent(),/A private Matthew 6 draft/);
   await page.locator('[data-tab="read"]').click();
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),7);
   console.log('PASS CP31 ORIGINAL PRIVATE PATH REVIEW '+width+'px: seven original chapters, actual private note and zero queue mutation');
   // CP32: compare two actual path chapters, private content only, no silent writes.
   await page.locator('#jmPathReviewEntries .jm-chapter-card').nth(0).getByRole('button',{name:'Compare this chapter'}).click();
   assert.equal(await page.locator('#jmPathComparison').isVisible(),true);
   assert.equal(await page.locator('#jmPathCompareEntries .jm-chapter-card').count(),1);
   await page.locator('#jmPathReviewEntries .jm-chapter-card').nth(1).getByRole('button',{name:'Compare this chapter'}).click();
   assert.equal(await page.locator('#jmPathCompareEntries .jm-chapter-card').count(),2);
   assert.match(await page.locator('#jmPathCompareEntries').textContent(),/A private Matthew 6 draft/);
   assert.match(await page.locator('#jmPathCompareStatus').textContent(),/side by side/);
   const cp32After=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(cp32After.notes,cp31Before.notes,'CP32 comparisons never overwrite notes');
   assert.deepEqual(cp32After.queue,cp31Before.queue,'CP32 comparisons never mark reading complete');
   await page.locator('#jmPathReviewEntries .jm-chapter-card').nth(0).getByRole('button',{name:'Remove from comparison'}).click();
   assert.equal(await page.locator('#jmPathCompareEntries .jm-chapter-card').count(),1);
   console.log('PASS CP32 ORIGINAL TWO CHAPTER REFLECTION COMPARISON '+width+'px: two actual chapters, private data untouched');

   // CP33: private word search stays on device and filters only the already-saved notes.
   await page.fill('#jmPathSearch','matthew 6 draft');
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),1);
   assert.match(await page.locator('#jmPathReviewEntries .jm-chapter-card').textContent(),/Matthew 6/);
   assert.match(await page.locator('#jmPathReviewStatus').textContent(),/1 matching chapter/);
   await page.fill('#jmPathSearch','not-a-saved-private-term');
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),0);
   assert.match(await page.locator('#jmPathReviewEntries').textContent(),/No chapters match/);
   await page.fill('#jmPathSearch','');
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),7);
   // Re-select first chapter then explicitly author through ORIGINAL Notes editor.
   await page.locator('#jmPathReviewEntries .jm-chapter-card').nth(0).getByRole('button',{name:'Compare this chapter'}).click();
   assert.equal(await page.locator('#jmPathCompareWrite').isEnabled(),true);
   // CP34: an unrelated unfinished note cannot be destroyed by comparison authoring.
   await page.locator('[data-tab="notes"]').click();
   await page.fill('#noteRef','John 3');
   await page.fill('#noteText','An unfinished John 3 reflection must survive.');
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmPathCompareWrite').click();
   assert.equal(await page.locator('#noteRef').inputValue(),'John 3');
   assert.equal(await page.locator('#noteText').inputValue(),'An unfinished John 3 reflection must survive.');
   assert.match(await page.locator('#noteDraftStatus').textContent(),/unfinished reflection is preserved/);
   await page.locator('#clearNote').click();
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmPathCompareWrite').click();
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   assert.match(await page.locator('#noteRef').inputValue(),/Psalms 23 \/ Matthew 6/);
   assert.match(await page.locator('#noteText').inputValue(),/What do I notice in my own reflections/);
   await page.fill('#noteText','My own comparison of these two chapters, kept private.');
   await page.locator('#saveNote').click();
   const afterNew=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert(afterNew.notes.some(n=>n.text.includes('My own comparison of these two chapters')));
   assert.deepEqual(afterNew.queue,cp31Before.queue,'drafting a comparison must never mark any chapter read');
   await page.reload();
   const afterReload=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert(afterReload.notes.some(n=>n.text.includes('My own comparison of these two chapters')),'actual note survives reload through original store');
   console.log('PASS CP33 ORIGINAL PRIVATE SEARCH AND COMPARISON AUTHORING '+width+'px: local search, original Notes, explicit save and reload');

   // CP34: the same original saved comparison is found through either chapter.
   for(const [book,chapter] of [['Psalms',23],['Matthew',6]]){
    await page.evaluate(([b,ch])=>jump(b,ch),[book,chapter]);
    await page.locator('[data-tab="notes"]').click();
    await page.selectOption('#notesScope','chapter');
    await page.fill('#notesSearch','');
    assert.match(await page.locator('#notesList').textContent(),/My own comparison of these two chapters/);
    assert.equal(await page.evaluate(([b,ch])=>JMReferenceParser.noteReferencesChapter('Psalms 23 / Matthew 6',b,ch),[book,chapter]),true);
   }
   assert.equal(await page.evaluate(()=>JMReferenceParser.noteReferencesChapter('Psalms 23 / Matthew 6','John',3)),false);
   console.log('PASS CP34 COMPOSITE PRIVATE NOTE INDEX '+width+'px: either original chapter can recover the same saved comparison');


   // CP35: completed reading does not imply a written reflection; both are separate, private.
   await page.locator('[data-tab="explore"]').click();
   await page.selectOption('#planPicker','quiet');
   await page.locator('[data-tab="read"]').click();
   await page.locator('#jmJourneyOverview').evaluate(el=>el.open=true);
   await page.locator('#jmPathReviewToggle').click();
   const cp35Before=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   const progress=await page.locator('#jmPathProgress').evaluate(el=>({value:Number(el.value),max:Number(el.max)}));
   assert.equal(progress.max,7);
   assert(progress.value>0&&progress.value<7,'the current genuine journey has some but not all reflections');
   await page.selectOption('#jmPathView','unwritten');
   const notWritten=await page.locator('#jmPathReviewEntries .jm-chapter-card').count();
   assert.equal(notWritten,7-progress.value);
   await page.selectOption('#jmPathView','written');
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),progress.value);
   await page.selectOption('#jmPathView','all');
   assert.equal(await page.locator('#jmPathReviewEntries .jm-chapter-card').count(),7);
   const resumeTitle=await page.locator('#jmPathResumeWriting').textContent();
   assert.match(resumeTitle,/Continue reflection:/);
   await page.locator('#jmPathResumeWriting').click();
   assert.equal(await page.locator('#page-notes').isVisible(),true);
   assert.match(await page.locator('#noteRef').inputValue(),/Philippians 4/);
   assert.match(await page.locator('#noteText').inputValue(),/What stood out to me/);
   const cp35After=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')));
   assert.deepEqual(cp35After.notes,cp35Before.notes,'CP35 drafting is never auto-saving');
   assert.deepEqual(cp35After.queue,cp35Before.queue,'CP35 drafting is never marking a chapter read');
   await page.reload();
   assert.equal(await page.locator('#noteRef').inputValue(),'Philippians 4','original draft recovery survived reload');
   console.log('PASS CP35 PRIVATE REFLECTION CONTINUATION '+width+'px: seven-chapter filters, real next unwritten and protected draft recovery');






   console.log('PASS CP28 ORIGINAL CHAPTER AUTHORING '+width+'px: protected unsaved draft, direct authoring, reversible chapter marking, saved notes and reload');




   assert.deepEqual(errors,[]);
   console.log('PASS Mum Study Desk '+width+'px: 18 refs, valid Study Bible route, exact passage, private notes, deduplicated bookmarks and reading-list');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
