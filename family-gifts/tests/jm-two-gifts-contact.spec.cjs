'use strict';
// Real Chromium contact for two independent JM family gifts; never merges their code or storage.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:4198/family-gifts/';
const mother='scripture-companion/';
const brother='third-court-preview/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
   const context=await browser.newContext({viewport,acceptDownloads:true});
   const scripture=await context.newPage(),court=await context.newPage();
   const failures=[];
   scripture.on('pageerror',e=>failures.push('Scripture '+e.message));
   court.on('pageerror',e=>failures.push('Court '+e.message));
   await scripture.goto(base+mother,{waitUntil:'load'});
   assert.equal(await scripture.locator('#book option').count(),66);
   await scripture.selectOption('#book','John');
   await scripture.fill('#chapter','3');
   assert.match(await scripture.locator('#open').getAttribute('href'),/jw\.org\/en\/library\/bible\/nwt\/books\/john\/3\//);
   await scripture.locator('[data-tab="notes"]').click();
   await scripture.fill('#noteRef','John 3');
   await scripture.fill('#noteText','Private JM birthday gift reflection');
   await scripture.click('#saveNote');
   assert.equal(await scripture.locator('#notesList .entry').count(),1);
   const saved=await scripture.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).notes.length);
   assert.equal(saved,1);
   await court.goto(base+brother,{waitUntil:'load'});
   assert(await court.locator('#court').isVisible(),'original canvas renders');
   const initial=await court.evaluate(()=>window.JM_THIRD_COURT?.status());
   assert(initial,'native JM game runtime exported');
   assert.equal(initial.playerCount,6,'3v3 starting roster');
   assert.equal(initial.active,false,'starts on menu, not in match');
   await court.click('#playQuick');
   const started=await court.evaluate(()=>window.JM_THIRD_COURT.status());
   assert.equal(started.active,true);
   assert.equal(started.mode,'quick');
   assert.equal(started.playerCount,6);
   assert(started.time>0,'real playable match clock');
   await court.locator('#pass').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',clientX:30,clientY:500});
   await court.locator('#switch').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',clientX:60,clientY:550});
   await court.click('#pauseButton');
   let paused=await court.evaluate(()=>window.JM_THIRD_COURT.status());
   assert.equal(paused.paused,true);
   assert.equal(paused.ui,'pauseScreen');
   await court.click('#resumeBtn');
   paused=await court.evaluate(()=>window.JM_THIRD_COURT.status());
   assert.equal(paused.paused,false);
   await court.keyboard.press('p');
   assert.equal((await court.evaluate(()=>window.JM_THIRD_COURT.status())).paused,true);
   await court.click('#pauseMenu');
   assert.equal((await court.evaluate(()=>window.JM_THIRD_COURT.status())).active,false);
   assert.equal(await scripture.evaluate(()=>JSON.parse(localStorage.getItem('jm.family.scripture-companion.v1')).notes.length),1,'game did not overwrite gift notes');
   assert.deepEqual(failures,[],'no runtime crashes in either gift');
   const courtBounds=await court.locator('#court').boundingBox();
   assert(courtBounds&&courtBounds.width>100&&courtBounds.height>100,'actual court visual extent');
   console.log('PASS JM TWO GIFTS '+viewport.width+'px: 66-book Bible, private note write, original 3v3 match, touch pass/switch, pause/resume, keyboard and storage coexistence');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
