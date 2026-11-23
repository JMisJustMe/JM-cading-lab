'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const DOOR='http://127.0.0.1:4198/family-gifts/third-court-preview/cp12-gamepad-contact-candidate.html';
(async()=>{
 const browser=await chromium.launch({headless:true});
 let tests=0;
 try{
  for(const viewport of [{width:390,height:844},{width:1280,height:844}]){
   const context=await browser.newContext({viewport});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
     const pad={id:'JM CP29 test Gamepad',index:0,connected:true,
       axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false})),
       vibrationActuator:{playEffect:()=>Promise.resolve('complete')}};
     Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
     window.__cp29TestPad=pad;
   });
   await page.goto(DOOR);
   await page.waitForFunction(()=>window.JM_THIRD_COURT_CP29?.contact.connected);
   let state=await page.evaluate(()=>JM_THIRD_COURT.status());
   assert.equal(state.playerCount,6,'CP29 cannot replace original 3v3');
   assert.equal(await page.evaluate(()=>JM_THIRD_COURT.version),'CP11','original renderer/physics identity survives');
   assert.equal(await page.locator('#gameWrap.cp29-connected').count(),1);
   assert.equal(await page.locator('#cp29Status').count(),1);
   await page.click('#playQuick');
   await page.waitForFunction(()=>JM_THIRD_COURT.status().active);
   await page.waitForTimeout(140);
   state=await page.evaluate(()=>JM_THIRD_COURT.status());
   const p0=state.athletes[0];
   await page.evaluate(()=>window.__cp29TestPad.axes[0]=.83);
   await page.waitForTimeout(230);
   await page.evaluate(()=>window.__cp29TestPad.axes[0]=0);
   const p1=(await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0];
   assert(p1.x>p0.x+5,'gamepad moves REAL original court athlete');
   assert.equal((await page.evaluate(()=>JM_THIRD_COURT_CP29.contact)).axis[0],0);
   tests++;

   // X is held guard/shield, then released, not a repeated click.
   await page.evaluate(()=>window.__cp29TestPad.buttons[2].pressed=true);
   await page.waitForFunction(()=>JM_THIRD_COURT_CP29.contact.guardHeld);
   await page.waitForTimeout(100);
   assert.equal((await page.evaluate(()=>JM_THIRD_COURT_CP29.contact)).guardHeld,true);
   await page.evaluate(()=>window.__cp29TestPad.buttons[2].pressed=false);
   await page.waitForFunction(()=>!JM_THIRD_COURT_CP29.contact.guardHeld);
   tests++;

   // Y uses original timed shot charge and releases ONLY on actual button-up.
   const shotsBefore=(await page.evaluate(()=>JM_THIRD_COURT_CP29.play)).shots;
   await page.evaluate(()=>window.__cp29TestPad.buttons[3].pressed=true);
   await page.waitForFunction(()=>JM_THIRD_COURT_CP29.contact.shotHeld);
   await page.waitForTimeout(255);
   assert.equal((await page.evaluate(()=>JM_THIRD_COURT_CP29.play)).shots,shotsBefore);
   await page.evaluate(()=>window.__cp29TestPad.buttons[3].pressed=false);
   await page.waitForFunction(()=>!JM_THIRD_COURT_CP29.contact.shotHeld);
   await page.waitForFunction(n=>JM_THIRD_COURT_CP29.play.shots>n,shotsBefore,{timeout:4000});
   tests++;

   // Force new original game state for interruption testing.
   await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
   await page.evaluate(()=>window.__cp29TestPad.buttons[3].pressed=true);
   await page.waitForFunction(()=>JM_THIRD_COURT_CP29.contact.shotHeld);
   const pending=(await page.evaluate(()=>JM_THIRD_COURT_CP29.play)).shots;
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await page.waitForFunction(()=>!JM_THIRD_COURT_CP29.contact.shotHeld);
   assert.equal((await page.evaluate(()=>JM_THIRD_COURT_CP29.play)).shots,pending,'background must NOT turn interrupted shot into basket attempt');
   await page.evaluate(()=>window.__cp29TestPad.buttons[3].pressed=false);
   tests++;

   await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
   const errorsBefore=errors.length;
   await page.evaluate(()=>{
     const e=new Event('gamepaddisconnected');
     Object.defineProperty(e,'gamepad',{value:window.__cp29TestPad});
     window.dispatchEvent(e);
   });
   await page.waitForFunction(()=>!JM_THIRD_COURT_CP29.contact.connected);
   assert.equal((await page.evaluate(()=>JM_THIRD_COURT_CP29.contact)).axis[0],0);
   assert.equal(errors.length,errorsBefore,'disconnect must not throw');
   tests++;

   // Original click-and-keyboard routes still work with gamepad disconnected.
   await page.keyboard.down('ArrowUp');await page.waitForTimeout(140);await page.keyboard.up('ArrowUp');
   assert.equal(await page.evaluate(()=>JM_THIRD_COURT.status().playerCount),6);
   const bounds=await page.locator('#gameWrap').boundingBox();
   assert(bounds&&bounds.width>180&&bounds.height>250,'original active court stays visible');
   assert.equal(errors.length,0,'zero browser page errors '+viewport.width);
   tests++;
   await context.close();
  }
  console.log('JM_THIRD_COURT_CP29',tests+'/12 ORIGINAL_CONTACT_PASS',
   'browser 390x844/1280x844; physical phone/controller/GPU FPS HOLD');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
