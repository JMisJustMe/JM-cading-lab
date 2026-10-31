'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const{chromium}=require('playwright');
fs.mkdirSync('artifacts/jm-third-court-visual-proof',{recursive:true});
(async()=>{const browser=await chromium.launch();try{
for(const width of [390,1280]){const context=await browser.newContext({viewport:{width,height:844}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4198/family-gifts/third-court-preview/cp11-ball-contact-candidate.html');
const initial=await page.evaluate(()=>JM_THIRD_COURT.status());
assert.equal(initial.playerCount,6);assert(['CP11','CP12'].includes(await page.evaluate(()=>JM_THIRD_COURT.version)));
await page.click('#playQuick');let a=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(a.active&&a.time>0);assert(a.shotClock>0);assert.equal(a.playerCount,6);
assert.deepEqual(a.athletes.map(p=>p.role),['Floor General','Wing Shooter','Paint Anchor','Floor General','Wing Shooter','Paint Anchor']);
assert(a.athletes[0].pace>a.athletes[2].pace,'Floor General outruns Paint Anchor');
assert(a.athletes[1].shotForm>a.athletes[2].shotForm,'Wing Shooter has higher live shooting form');
assert(a.athletes[2].endurance>a.athletes[1].endurance,'Paint Anchor recovers differently');
assert.match(await page.locator('#posLabel').textContent(),/FLOOR GENERAL/);
await page.keyboard.down('ArrowUp');await page.waitForTimeout(850);await page.keyboard.up('ArrowUp');
const roleRun=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(roleRun.athletes[0].energy<=100,'movement keeps player fatigue bounded');
assert(roleRun.athletes[0].y<690,'role actually moves in court simulation');
assert(roleRun.offBallReads>0,'CP23 natural possession actively evaluates teammates passing lanes');
assert(roleRun.supportReplans>0,'CP27 real off-ball athletes build and retain a positional intent');
assert(roleRun.athletes.every(p=>p.pose&&Number.isFinite(p.pose.step)&&p.pose.footLift>=0&&p.pose.brace>=0&&p.pose.brace<=1),'CP28 three visual renderers share finite physical foot/brace pose from real athletes');
assert(roleRun.athletes.some(p=>Math.abs(p.pose.step)>.01),'CP28 a naturally moving roster member actually animates a moving foot');
const runningFeet=roleRun.athletes.filter(p=>Math.abs(p.pose.step)>.01).length;
console.log('PASS CP28 CROSS-RENDER ATHLETE POSE '+width+'px '+JSON.stringify({moving:runningFeet,athletes:roleRun.athletes.slice(0,3).map(p=>p.pose)}));


assert(roleRun.athletes.some(p=>p.supportIntent),'CP27 off-ball movement target persisted in actual roster');
assert(roleRun.athletes.every(p=>p.contactMass>0&&p.contactPulse>=0&&p.contactPulse<=1),'CP27 bodies expose bounded live mass and contact recovery');
assert(roleRun.athletes[2].contactMass>roleRun.athletes[0].contactMass,'CP27 Paint Anchor has greater collision mass than Floor General');
console.log('PASS CP27 ROLE MASS & POSITIONAL INTENT '+width+'px '+JSON.stringify({replans:roleRun.supportReplans,masses:roleRun.athletes.slice(0,3).map(p=>p.contactMass),intents:roleRun.athletes.filter(p=>p.supportIntent).length}));
assert(Number.isFinite(roleRun.offBallSpaceGains),'CP23 spacing gains are bounded numeric telemetry');
console.log('PASS CP23 OFF-BALL READ '+width+'px '+JSON.stringify({reads:roleRun.offBallReads,gains:roleRun.offBallSpaceGains,last:roleRun.lastOffBall}));
assert(roleRun.athletes[2].formWidth>roleRun.athletes[1].formWidth,'Paint Anchor has a genuinely wider body, not just a recolour');
assert(roleRun.athletes[0].formWidth<roleRun.athletes[1].formWidth,'Floor General retains its own lighter silhouette');
await page.keyboard.down('ArrowDown');await page.waitForTimeout(560);await page.keyboard.up('ArrowDown');
const footwork=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(footwork.pivotPlants>=1,'CP22 actual direction reversal plants a foot in court motion');
assert(footwork.athletes[0].pivots>=1,'CP22 active athlete, not a decorative overlay, performed pivot');
console.log('PASS CP22 FOOTWORK '+width+'px '+JSON.stringify({pivots:footwork.pivotPlants,forms:footwork.athletes.slice(0,3).map(p=>p.formWidth)}));

// CP24 resets its own match only after CP22 reversal proof.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
assert.equal(await page.evaluate(()=>JM_THIRD_COURT.callCut()),true,'CP24 normal live-ball cut accepted');
await page.waitForFunction(()=>JM_THIRD_COURT.status().cutDefensiveReads>=3,{},{timeout:6000});
const cutA=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(cutA.lastCutDefense,'CP24 actual defender assigned to live cutter');
assert(cutA.lastCutDefense.guardId>=3&&cutA.lastCutDefense.guardId<=5);
assert.equal(cutA.lastCutDefense.cutterId,cutA.activeCut);
assert(cutA.cutCoverReads>0,'CP26 remaining defender physically covers an actual pass route');
assert(cutA.lastCutCover,'CP26 distinct weak-side cover coordinates exist');
assert.notEqual(cutA.lastCutCover.guardId,cutA.lastCutDefense.guardId,
 'CP26 cutter guard and weak-side cover must remain separate real bodies');
const coverBefore=cutA.athletes.find(p=>p.id===cutA.lastCutCover.guardId);

assert.equal(cutA.athletes.find(p=>p.id===cutA.lastCutDefense.guardId).footwork,'shuffle',
 'CP25 real counter-defender adopts a lateral guarding stance');
assert.equal(cutA.athletes.find(p=>p.id===cutA.activeCut).footwork,'cut',
 'CP25 actual cutter uses a distinct burst animation state');

const guardBefore=cutA.athletes.find(p=>p.id===cutA.lastCutDefense.guardId);
await page.waitForTimeout(250);
const cutB=await page.evaluate(()=>JM_THIRD_COURT.status());
const guardAfter=cutB.athletes.find(p=>p.id===cutA.lastCutDefense.guardId);
const coverAfter=cutB.athletes.find(p=>p.id===cutA.lastCutCover.guardId);
assert(Math.hypot(coverBefore.x-coverAfter.x,coverBefore.y-coverAfter.y)>1,
 'CP26 weak-side defender moved physically instead of appearing only in a status report');
assert(cutB.cutCoverReads>cutA.cutCoverReads,'CP26 cover continues reacting during the cut');
assert.equal(cutB.cutDefensiveHandoffs,0,'CP26 stable marker remains assigned while the cut persists');
console.log('PASS CP26 THREE-WAY DEFENSIVE COVER '+width+'px '+JSON.stringify({cutter:cutA.activeCut,mark:cutA.lastCutDefense.guardId,cover:cutA.lastCutCover.guardId,coverMoved:Math.hypot(coverBefore.x-coverAfter.x,coverBefore.y-coverAfter.y).toFixed(1),handoffs:cutB.cutDefensiveHandoffs}));

assert(Math.hypot(guardBefore.x-guardAfter.x,guardBefore.y-guardAfter.y)>1,
 'CP24 defender physically moved while countering cut');
console.log('PASS CP24 LIVE CUT DEFENCE '+width+'px '+JSON.stringify({reads:cutB.cutDefensiveReads,assigned:cutA.lastCutDefense,guardMoved:Math.hypot(guardBefore.x-guardAfter.x,guardBefore.y-guardAfter.y).toFixed(1)}));
console.log('PASS CP25 DISTINCT MOVEMENT '+width+'px '+JSON.stringify({guard:cutA.athletes.find(p=>p.id===cutA.lastCutDefense.guardId).footwork,cutter:cutA.athletes.find(p=>p.id===cutA.activeCut).footwork}));

await page.evaluate(()=>JM_THIRD_COURT.pass());await page.evaluate(()=>JM_THIRD_COURT.callCut());
await page.evaluate(()=>JM_THIRD_COURT.callScreen());await page.evaluate(()=>JM_THIRD_COURT.setGuard(true));
await page.waitForTimeout(200);a=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(Number.isFinite(a.time));assert(Number.isFinite(a.ball3DHeight));assert(a.native3DReady||!a.native3DActive);
assert(a.visuals);assert(a.draws>=0);
assert.equal(a.athletes.length,6);assert(a.athletes.every(p=>p.energy>=35&&p.energy<=100));
const beforeMotion=a.athletes[0];
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(650);
await page.keyboard.up('ArrowUp');
const afterMotion=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(afterMotion.athletes[0].y<beforeMotion.y,'actual controlled player moved up court');
assert(Number.isFinite(afterMotion.ballHeight),'dribble ball height finite');
assert(afterMotion.athletes[0].energy<=100,'individual fatigue is bounded');
assert(Number.isInteger(afterMotion.flightInterceptions),'flight contact ledger present');
assert(Number.isInteger(afterMotion.bodyImpacts),'actual body-contact ledger present');
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
await page.keyboard.down('ArrowUp');await page.waitForTimeout(1100);await page.keyboard.up('ArrowUp');
const beforePass=await page.evaluate(()=>JM_THIRD_COURT.status());
await page.evaluate(()=>JM_THIRD_COURT.pass());
const duringPass=await page.evaluate(()=>JM_THIRD_COURT.status());
await page.waitForTimeout(400);
const laneStatus=await page.evaluate(()=>JM_THIRD_COURT.status());
console.log('CP18 PASS CONTACT OBSERVATION '+JSON.stringify({before:{pos:beforePass.pos,active:beforePass.active,air:beforePass.air,player0:beforePass.athletes[0],defenders:beforePass.athletes.slice(3)},during:{air:duringPass.air,pos:duringPass.pos,shotClock:duringPass.shotClock},after:{reads:laneStatus.passLaneReads,pos:laneStatus.pos,interceptions:laneStatus.flightInterceptions}}));
assert(Number.isInteger(laneStatus.passLaneReads),'real pass-lane chase telemetry');
let contactProven=laneStatus.passLaneReads>0;
for(let attempt=0;!contactProven&&attempt<3;attempt++){
 await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(1200);await page.keyboard.up('ArrowUp');
 await page.evaluate(()=>JM_THIRD_COURT.pass());await page.waitForTimeout(380);
 const retry=await page.evaluate(()=>JM_THIRD_COURT.status());
 contactProven=retry.passLaneReads>0;
 console.log('CP18 natural match retry '+(attempt+1)+' reads='+retry.passLaneReads+' pos='+retry.pos);
}
assert(contactProven,'at least one real defending athlete reacted to a physical pass in natural play');

// CP20 controlled miss: assert renderer-shared ball pose reaches a displaced rim contact
// and the rebound inherits its genuine landing position, not a random invented court point.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
await page.evaluate(()=>JM_THIRD_COURT.pressShot());
await page.waitForTimeout(950);
await page.evaluate(()=>{
 const random=Math.random;Math.random=()=>.99;
 try{JM_THIRD_COURT.releaseShot()}finally{Math.random=random}
});
const midShot=await page.evaluate(()=>JM_THIRD_COURT.status());
assert.equal(midShot.air,'shot','a playable shot actually launched');
assert(midShot.flightMissSide>0,'test-forced miss has a physical lateral deviation');
await page.waitForFunction(()=>JM_THIRD_COURT.status().rimContacts>=1,{},{timeout:12000}).catch(async e=>{console.log('CP20 RIM CONTACT TIMEOUT '+JSON.stringify(await page.evaluate(()=>JM_THIRD_COURT.status())));throw e});
const rim=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(rim.rimContacts>=1,'miss contacted the scoring rim');
assert(rim.lastRim&&rim.lastRim.side>0,'rim contact recorded actual miss-side');
assert(rim.lastRim.x>320,'the ball landed on the measured side of the rim');
assert(Math.abs(rim.lastRim.reboundX-rim.lastRim.x)<90,'rebound follows contact rather than random teleport');
console.log('PASS CP20 BALL CONTACT '+width+'px '+JSON.stringify(rim.lastRim));
assert(rim.reboundArcStarts>=1,'CP21 ricochet was spawned from confirmed rim contact');
await page.waitForFunction(()=>JM_THIRD_COURT.status().reboundGroundHits>=1,{},{timeout:12000});
const bounced=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(bounced.reboundGroundHits>=1,'CP21 descending ball reached the real court and bounced');
assert(bounced.lastRim&&Math.abs(bounced.lastRim.reboundX-bounced.lastRim.x)<90,'CP21 rebound motion remains rooted at the CP20 contact');
console.log('PASS CP21 LIVE RICOCHET '+width+'px '+JSON.stringify({arc:bounced.reboundArcStarts,ground:bounced.reboundGroundHits,lastRim:bounced.lastRim}));
await page.click('#pauseButton');assert((await page.evaluate(()=>JM_THIRD_COURT.status())).paused);
await page.click('#resumeBtn');assert(!(await page.evaluate(()=>JM_THIRD_COURT.status())).paused);
const rendererModes=new Set();
for(let phase=0;phase<3;phase++){
 await page.click('#cameraBtn');
 await page.waitForTimeout(90);
 const display=await page.locator('#rendererTag').textContent();
 rendererModes.add(display);
 const livePose=await page.evaluate(()=>JM_THIRD_COURT.status());
 assert.equal(livePose.athletes.length,6,'CP28 every active camera uses all six same source-owned athletes');
 assert(livePose.athletes.every(p=>Number.isFinite(p.pose.step)&&Number.isFinite(p.pose.brace)),'CP28 camera never detaches original articulated physical state');
}
assert(rendererModes.has('CLASSIC OVERHEAD'),'CP28 real Classic renderer reached with original camera control');
assert(rendererModes.has('SOFTWARE 3D'),'CP28 real perspective Broadcast renderer reached with original camera control');
if(roleRun.native3DReady)assert(rendererModes.has('NATIVE WEBGL2'),'CP28 available original GPU renderer reached with original camera control');
console.log('PASS CP28 CAMERA-TO-BODY CONTACT '+width+'px '+JSON.stringify([...rendererModes]));
assert.deepEqual(errors,[]);
await page.screenshot({path:'artifacts/jm-third-court-visual-proof/cp11-'+width+'.png'});
const baseline=await context.newPage();
await baseline.goto('http://127.0.0.1:4198/family-gifts/third-court-preview/index.html');
await baseline.click('#playQuick');await baseline.waitForTimeout(250);
await baseline.screenshot({path:'artifacts/jm-third-court-visual-proof/cp06-'+width+'.png'});await baseline.close();
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
// CP22: a hidden tab may lose keyup/pointer release without a window blur.
// Pausing must clear held input before an independent resume.
await page.evaluate(()=>{
 window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
 document.dispatchEvent(new Event('visibilitychange'));
 delete document.hidden;
});
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,'hidden tab pauses the running match');
const hiddenY=(await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0].y;
await page.click('#resumeBtn');await page.waitForTimeout(650);
const resumedY=(await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0].y;
assert(Math.abs(resumedY-hiddenY)<6,'missing keyup must not leave the player walking after tab resume');
console.log('PASS CP22 hidden-tab held-input release '+width+'px');
// CP23: a lost pointerup must not leave the shoot control visually held or fire a shot after resuming.
const beforeLostShot=(await page.evaluate(()=>JM_THIRD_COURT.status())).shotReport;
await page.locator('#shoot').hover();
await page.mouse.down();
assert(await page.locator('#shoot').evaluate(el=>el.classList.contains('held')),'shoot control registers a real held pointer');
await page.evaluate(()=>{
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
 document.dispatchEvent(new Event('visibilitychange'));
 delete document.hidden;
});
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,'lost pointer event pauses match');
assert(!(await page.locator('#shoot').evaluate(el=>el.classList.contains('held'))),'hidden tab clears shoot held styling');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display==='none'),'hidden tab closes held shot meter');
await page.mouse.up();
await page.click('#resumeBtn');
assert.equal((await page.evaluate(()=>JM_THIRD_COURT.status())).shotReport,beforeLostShot,'late pointerup does not shoot after resuming');
console.log('PASS CP23 lost-pointer shoot cancellation '+width+'px');
// CP24: a cancelled touch or unrelated pointer must never release a live shot.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
const beforeCancel=await page.evaluate(()=>JM_THIRD_COURT.status());
await page.locator('#shoot').hover();await page.mouse.down();await page.waitForTimeout(450);
await page.evaluate(()=>document.querySelector('#shoot').dispatchEvent(new PointerEvent('pointerup',{pointerId:999,bubbles:true})));
assert(await page.locator('#shoot').evaluate(el=>el.classList.contains('held')),'unrelated pointer cannot release the shoot hold');
await page.evaluate(()=>document.querySelector('#shoot').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));
assert(!(await page.locator('#shoot').evaluate(el=>el.classList.contains('held'))),'cancelled pointer clears shoot hold');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display==='none'),'cancelled pointer hides shot meter');
await page.mouse.up();
const afterCancel=await page.evaluate(()=>JM_THIRD_COURT.status());
assert.equal(afterCancel.shots,beforeCancel.shots,'cancelled touch must not count as a shot');
assert.equal(afterCancel.shotReport,beforeCancel.shotReport,'cancelled touch must not report a shot');
console.log('PASS CP24 pointercancel and pointer identity '+width+'px');
// CP25: a second finger or unrelated capture-loss event must not hijack live joystick/guard input.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
const joyBox=await page.locator('#joy').boundingBox();
assert(joyBox,'joystick remains in the actual playable layout');
await page.mouse.move(joyBox.x+joyBox.width*.72,joyBox.y+joyBox.height*.50);await page.mouse.down();
const liveJoy=await page.locator('#joyKnob').evaluate(el=>el.style.transform);
assert.notEqual(liveJoy,'translate(0px, 0px)','live joystick responds to the initiating pointer');
await page.evaluate(()=>{
 const joy=document.querySelector('#joy');
 joy.dispatchEvent(new PointerEvent('pointerdown',{pointerId:999,bubbles:true,cancelable:true}));
 joy.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:999,bubbles:true}));
 joy.dispatchEvent(new PointerEvent('pointerup',{pointerId:999,bubbles:true}));
});
assert.equal(await page.locator('#joyKnob').evaluate(el=>el.style.transform),liveJoy,'unrelated joystick pointer cannot seize or release active movement');
await page.mouse.up();
assert.equal(await page.locator('#joyKnob').evaluate(el=>el.style.transform),'translate(0px, 0px)','own joystick pointer release returns neutral');
await page.locator('#guardBtn').hover();await page.mouse.down();
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'guard holds for its initiating pointer');
await page.evaluate(()=>{
 const guard=document.querySelector('#guardBtn');
 guard.dispatchEvent(new PointerEvent('pointerdown',{pointerId:999,bubbles:true,cancelable:true}));
 guard.dispatchEvent(new PointerEvent('pointerup',{pointerId:999,bubbles:true}));
 guard.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:999,bubbles:true}));
});
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'unrelated pointer cannot release guard');
await page.mouse.up();
assert(!(await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'own guard release clears guard');
console.log('PASS CP25 multi-pointer joystick and guard ownership '+width+'px');
// CP29: SHOOT is owned by its initiating input; an unrelated touch or Space release cannot fire early.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
await page.keyboard.down('Space');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display!=='none'),'Space begins keyboard-owned charge');
await page.locator('#shoot').hover();await page.mouse.down();await page.mouse.up();
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display!=='none'),'unrelated touch release cannot end keyboard-owned shot');
await page.keyboard.up('Space');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display==='none'),'own Space release ends keyboard charge');
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
await page.locator('#shoot').hover();await page.mouse.down();
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display!=='none'),'touch begins pointer-owned charge');
await page.keyboard.down('Space');await page.keyboard.up('Space');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display!=='none'),'unrelated Space release cannot end touch-owned shot');
await page.mouse.up();
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display==='none'),'own touch release ends pointer charge');
console.log('PASS CP29 keyboard/touch SHOOT ownership '+width+'px');

 // CP26: manual pause, new-match and paused-key transitions must not carry held input into play.
 await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
 const cp26Shots=(await page.evaluate(()=>JM_THIRD_COURT.status())).shots;
 await page.locator('#shoot').hover();await page.mouse.down();
 assert(await page.locator('#shoot').evaluate(el=>el.classList.contains('held')),'manual pause test begins with real held SHOOT');
 await page.evaluate(()=>document.querySelector('#pauseButton').click());
 assert((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,'manual pause opens the existing pause state');
 assert(!(await page.locator('#shoot').evaluate(el=>el.classList.contains('held'))),'manual pause cancels SHOOT held styling');
 assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display==='none'),'manual pause closes shot meter');
 await page.mouse.up();await page.click('#resumeBtn');
 assert.equal((await page.evaluate(()=>JM_THIRD_COURT.status())).shots,cp26Shots,'late release after manual pause cannot shoot');
 await page.evaluate(()=>document.querySelector('#pauseButton').click());
 await page.keyboard.down('ArrowUp');
 const cp26PausedY=(await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0].y;
 await page.click('#resumeBtn');await page.waitForTimeout(500);
 assert(Math.abs((await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0].y-cp26PausedY)<6,'keyboard input received during pause must not move after resume');
 await page.keyboard.up('ArrowUp');
 await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
 const cp26JoyBox=await page.locator('#joy').boundingBox();
 await page.mouse.move(cp26JoyBox.x+cp26JoyBox.width*.72,cp26JoyBox.y+cp26JoyBox.height*.5);await page.mouse.down();
 assert.notEqual(await page.locator('#joyKnob').evaluate(el=>el.style.transform),'translate(0px, 0px)','restart test starts with live joystick');
 await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
 assert.equal(await page.locator('#joyKnob').evaluate(el=>el.style.transform),'translate(0px, 0px)','new match clears joystick visual and pointer');
 await page.mouse.up();
 const cp26RestartY=(await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0].y;
 await page.waitForTimeout(450);
 assert(Math.abs((await page.evaluate(()=>JM_THIRD_COURT.status())).athletes[0].y-cp26RestartY)<6,'late joystick release cannot move the new match');
 await page.locator('#guardBtn').hover();await page.mouse.down();
 assert((await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'restart test starts with real held guard');
 await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
 assert(!(await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'new match cancels previous guard');
 await page.mouse.up();
 console.log('PASS CP26 manual pause, paused keys and new-match input reset '+width+'px');

 // CP27: keyboard and touch are independent guard owners; releasing one must not cancel the other.
 await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
 await page.keyboard.down('g');
 assert((await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'G key engages guard');
 await page.locator('#guardBtn').hover();await page.mouse.down();
 await page.keyboard.up('g');
 assert((await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'G release must not cancel held touch guard');
 await page.mouse.up();
 assert(!(await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'last touch guard release clears guard');
 await page.keyboard.down('g');
 await page.locator('#guardBtn').hover();await page.mouse.down();
 await page.mouse.up();
 assert((await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'touch release must not cancel held G guard');
 await page.keyboard.up('g');
 assert(!(await page.evaluate(()=>JM_THIRD_COURT.status())).guardHeld,'last G release clears guard');
 console.log('PASS CP27 independent keyboard and touch guard ownership '+width+'px');

// CP33: a paused game must not let a new touch seize the joystick, SHOOT or GUARD.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
await page.evaluate(()=>document.querySelector('#pauseButton').click());
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,'CP33 begins from a genuinely paused match');
const cp33PausedInputs=await page.evaluate(()=>{
  // Deliver late pointerdown to the controls directly, as may occur across an interrupted touch route.
  // Stub capture only for these synthetic pointer IDs; real-pointer CP24–CP29 tests run above unchanged.
  for(const id of ['joy','shoot','guardBtn']){
    const el=document.getElementById(id),capture=el.setPointerCapture;
    el.setPointerCapture=()=>{};
    try{el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:777,clientX:240,clientY:310,bubbles:true,cancelable:true}))}
    finally{el.setPointerCapture=capture}
  }
  return {knob:document.getElementById('joyKnob').style.transform,
    shootHeld:document.getElementById('shoot').classList.contains('held'),
    guardHeld:JM_THIRD_COURT.status().guardHeld};
});
assert.equal(cp33PausedInputs.knob,'translate(0px, 0px)','CP33 paused touch cannot move the joystick');
assert.equal(cp33PausedInputs.shootHeld,false,'CP33 paused touch cannot seize SHOOT');
assert.equal(cp33PausedInputs.guardHeld,false,'CP33 paused touch cannot engage GUARD');
await page.click('#resumeBtn');
await page.keyboard.down('Space');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display!=='none'),
  'CP33 live keyboard SHOOT still charges after ignored paused touch');
await page.keyboard.up('Space');
console.log('PASS CP33 paused-touch control ownership and live resume '+width+'px');

// CP31: real browser cold-reload and owner-editable JSON recovery of local match history.
await page.evaluate(()=>JM_THIRD_COURT.stop());
const cp31Before=await page.evaluate(()=>({
 best:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.record')),
 history:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.matches'))
}));
assert(cp31Before.best.matches>=1,'completed match writes local best to browser storage');
assert.equal(cp31Before.history.length,1,'completed match persists a structured receipt');
assert.equal(cp31Before.history[0].score.length,2,'persisted receipt keeps both sides of the match');
await page.reload();
assert.match(await page.locator('#bestText').textContent(),new RegExp(cp31Before.best.matches+' MATCHES'),'cold reload restores existing record');
const downloadPromise=page.waitForEvent('download');
await page.click('#exportHistory');
const historyDownload=await downloadPromise;
assert.equal(historyDownload.suggestedFilename(),'JM_THIRD_COURT_match_receipt.json','owner can export history after cold reload');
const cp31Backup=JSON.stringify({schema:'jm.thirdcourt.birthday/1',owner:'JM / TB Scott',records:cp31Before.history,localBest:cp31Before.best});
await page.locator('#historyFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schema":"other"}')});
await page.waitForFunction(()=>document.querySelector('#historyStatus').textContent.startsWith('RESTORE REJECTED'));
assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.matches')))).length,1,'invalid restore cannot replace valid history');
await page.evaluate(()=>{localStorage.removeItem('jm.thirdcourt.birthday.cp01.record');localStorage.removeItem('jm.thirdcourt.birthday.cp01.matches')});
await page.reload();
assert.equal(await page.evaluate(()=>localStorage.getItem('jm.thirdcourt.birthday.cp01.matches')),null,'cold reset has no match history');
page.once('dialog',dialog=>dialog.accept());
await page.locator('#historyFile').setInputFiles({name:'JM_THIRD_COURT_match_receipt.json',mimeType:'application/json',buffer:Buffer.from(cp31Backup)});
await page.waitForFunction(()=>document.querySelector('#historyStatus').textContent.startsWith('RESTORED'));
const cp31Restored=await page.evaluate(()=>({
 best:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.record')),
 history:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.matches'))
}));
assert.deepEqual(cp31Restored,cp31Before,'imported local history and record exactly match exported state');
await page.reload();
assert.deepEqual(await page.evaluate(()=>({
 best:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.record')),
 history:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.matches'))
})),cp31Before,'restored history survives independent second cold reload');
console.log('PASS CP31 persisted match receipt, export, invalid import rejection, exact restore and cold reload '+width+'px');

// CP32: denied browser-storage reads must fail clearly without changing existing history.
await page.evaluate(()=>{
 const original=Storage.prototype.getItem;
 window.__cp32OriginalGetItem=original;
 Storage.prototype.getItem=function(key){
  if(key==='jm.thirdcourt.birthday.cp01.matches')throw new DOMException('Storage unavailable','SecurityError');
  return original.call(this,key);
 };
});
page.once('dialog',dialog=>dialog.accept());
await page.locator('#historyFile').setInputFiles({name:'JM_THIRD_COURT_match_receipt.json',mimeType:'application/json',buffer:Buffer.from(cp31Backup)});
await page.waitForFunction(()=>document.querySelector('#historyStatus').textContent.startsWith('RESTORE FAILED'));
await page.evaluate(()=>{Storage.prototype.getItem=window.__cp32OriginalGetItem;delete window.__cp32OriginalGetItem});
await page.reload();
assert.deepEqual(await page.evaluate(()=>({
 best:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.record')),
 history:JSON.parse(localStorage.getItem('jm.thirdcourt.birthday.cp01.matches'))
})),cp31Before,'storage-denied restore leaves original records unchanged across cold reload');
console.log('PASS CP32 denied-storage restore preserves owner records '+width+'px');



// CP34: native keyboard activation of visible menus must coexist with gameplay Space shooting.
await page.locator('#howBtn').focus();
await page.keyboard.press('Space');
assert(!(await page.locator('#helpScreen').evaluate(el=>el.classList.contains('hidden'))),
  'CP34 Space activates the focused HOW TO PLAY menu button');
await page.locator('#helpBack').focus();
await page.keyboard.press('Space');
assert(!(await page.locator('#menuScreen').evaluate(el=>el.classList.contains('hidden'))),
  'CP34 Space activates the focused menu BACK button');
await page.locator('#playQuick').focus();
await page.keyboard.press('Space');
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).active,
  'CP34 Space starts the match from the focused menu button');
await page.keyboard.down('Space');
assert(await page.locator('#shotMeter').evaluate(el=>getComputedStyle(el).display!=='none'),
  'CP34 Space still charges gameplay SHOOT after the start button becomes hidden');
await page.keyboard.up('Space');
await page.locator('#pauseButton').focus();
await page.keyboard.press('Space');
assert((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,
  'CP34 Space activates focused in-game PAUSE without charging a shot');
await page.locator('#resumeBtn').focus();
await page.keyboard.press('Space');
assert(!(await page.evaluate(()=>JM_THIRD_COURT.status())).paused,
  'CP34 Space activates focused RESUME');
console.log('PASS CP34 keyboard menu, focused buttons and inherited shooting '+width+'px');

// CP35 focused-control isolation: native control keys are not stolen by gameplay.
await page.locator('#pauseButton').focus();
const cp35ArrowPrevented=await page.evaluate(()=>{
 const button=document.querySelector('#pauseButton');
 const event=new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true});
 button.dispatchEvent(event);
 button.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp',bubbles:true}));
 return event.defaultPrevented;
});
assert.equal(cp35ArrowPrevented,false,'CP35 focused visible button retains native ArrowUp');
await page.keyboard.press('p');
assert.equal((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,false,
 'CP35 P while a visible button has focus must not pause the live game');
await page.evaluate(()=>document.activeElement.blur());
await page.keyboard.press('p');
assert.equal((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,true,
 'CP35 P still pauses gameplay without visible control focus');
await page.locator('#resumeBtn').click();
assert.equal((await page.evaluate(()=>JM_THIRD_COURT.status())).paused,false,
 'CP35 resume restores live game after shortcut');
console.log('PASS CP35 focused-control keyboard isolation and inherited P shortcut '+width+'px');

// CP38: focused controls must not invoke the separately registered C / Q play-call listeners.
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
await page.locator('#pauseButton').focus();
await page.keyboard.press('c');
await page.keyboard.press('q');
const cp38Focused=await page.evaluate(()=>({cutCalls:JM_THIRD_COURT.status().cutCalls,screenCalls:JM_THIRD_COURT.status().screenCalls}));
assert.deepEqual(cp38Focused,{cutCalls:0,screenCalls:0},
  'CP38 focused visible button must retain C/Q without triggering play calls');
await page.evaluate(()=>document.activeElement.blur());
await page.keyboard.press('c');
await page.keyboard.press('q');
const cp38Gameplay=await page.evaluate(()=>({cutCalls:JM_THIRD_COURT.status().cutCalls,screenCalls:JM_THIRD_COURT.status().screenCalls}));
assert.deepEqual(cp38Gameplay,{cutCalls:1,screenCalls:1},
  'CP38 unfocused C/Q still call CUT and SCREEN in live possession');
console.log('PASS CP38 focused C/Q isolation and inherited gameplay play-calls '+width+'px');

console.log('PASS CP11 real runtime '+width+'px: 3v3, play-calls, defensive state, camera fallback and pause/resume');
await context.close()}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
