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
assert(Number.isFinite(roleRun.offBallSpaceGains),'CP23 spacing gains are bounded numeric telemetry');
console.log('PASS CP23 OFF-BALL READ '+width+'px '+JSON.stringify({reads:roleRun.offBallReads,gains:roleRun.offBallSpaceGains,last:roleRun.lastOffBall}));
await page.evaluate(()=>JM_THIRD_COURT.start('quick'));
assert.equal(await page.evaluate(()=>JM_THIRD_COURT.callCut()),true,'CP24 normal live-ball cut accepted');
await page.waitForFunction(()=>JM_THIRD_COURT.status().cutDefensiveReads>=3,{},{timeout:6000});
const cutA=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(cutA.lastCutDefense,'CP24 actual defender assigned to live cutter');
assert(cutA.lastCutDefense.guardId>=3&&cutA.lastCutDefense.guardId<=5);
assert.equal(cutA.lastCutDefense.cutterId,cutA.activeCut);
const guardBefore=cutA.athletes.find(p=>p.id===cutA.lastCutDefense.guardId);
await page.waitForTimeout(250);
const cutB=await page.evaluate(()=>JM_THIRD_COURT.status());
const guardAfter=cutB.athletes.find(p=>p.id===cutA.lastCutDefense.guardId);
assert(Math.hypot(guardBefore.x-guardAfter.x,guardBefore.y-guardAfter.y)>1,
 'CP24 defender physically moved while countering cut');
console.log('PASS CP24 LIVE CUT DEFENCE '+width+'px '+JSON.stringify({reads:cutB.cutDefensiveReads,assigned:cutA.lastCutDefense,guardMoved:Math.hypot(guardBefore.x-guardAfter.x,guardBefore.y-guardAfter.y).toFixed(1)}));

assert(roleRun.athletes[2].formWidth>roleRun.athletes[1].formWidth,'Paint Anchor has a genuinely wider body, not just a recolour');
assert(roleRun.athletes[0].formWidth<roleRun.athletes[1].formWidth,'Floor General retains its own lighter silhouette');
await page.keyboard.down('ArrowDown');await page.waitForTimeout(560);await page.keyboard.up('ArrowDown');
const footwork=await page.evaluate(()=>JM_THIRD_COURT.status());
assert(footwork.pivotPlants>=1,'CP22 actual direction reversal plants a foot in court motion');
assert(footwork.athletes[0].pivots>=1,'CP22 active athlete, not a decorative overlay, performed pivot');
console.log('PASS CP22 FOOTWORK '+width+'px '+JSON.stringify({pivots:footwork.pivotPlants,forms:footwork.athletes.slice(0,3).map(p=>p.formWidth)}));

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
assert.deepEqual(errors,[]);
await page.screenshot({path:'artifacts/jm-third-court-visual-proof/cp11-'+width+'.png'});
const baseline=await context.newPage();
await baseline.goto('http://127.0.0.1:4198/family-gifts/third-court-preview/index.html');
await baseline.click('#playQuick');await baseline.waitForTimeout(250);
await baseline.screenshot({path:'artifacts/jm-third-court-visual-proof/cp06-'+width+'.png'});await baseline.close();
console.log('PASS CP11 real runtime '+width+'px: 3v3, play-calls, defensive state, camera fallback and pause/resume');
await context.close()}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
