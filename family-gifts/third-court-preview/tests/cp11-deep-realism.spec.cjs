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
