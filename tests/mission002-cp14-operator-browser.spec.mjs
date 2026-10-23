import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {makeCP13Portable} from '../navigator/estate-integration/m002-cp13-device-return.mjs';
import {prepareCP12Exchange,returnCP12Exchange}
 from '../coding-estate/integration/m002-cp12-cross-receiver-production.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:4177';
const game={schema:'jm.m002.cp11.game-host/1',identity:'JM-CP14-OWNER',
 selected:'Krix',allies:[{id:'Krix',x:200,y:330,hp:100,guardTicks:0},
 {id:'Vexa',x:240,y:330,hp:100,guardTicks:0}],
 enemies:[{id:'Nox',x:720,hp:100}],events:[]};
const comic={schema:'jm.m002.cp11.comic-host/1',owner:'JM Original Comic House',edition:0,pages:[]};
const exchange=prepareCP12Exchange({choice:'explore',subject:'JM Krix',stations:3,
 actions:[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}],game,comic});
const expected=returnCP12Exchange(exchange.envelope,{game,comic});
const packet=await makeCP13Portable({project:'JM CP14 Combined Bodies',origin:'Simulated Phone',
 revision:1,cp12:exchange.envelope});
const browser=await chromium.launch({headless:true});
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(x,m)=>{assert.ok(x,m);checks++};
const out='qa/m002-foundations';fs.mkdirSync(out,{recursive:true});
const report={schema:'jm.m002.cp14.operator-recipient-browser-proof/1',status:'HOLD',
 checks:0,scope:'Real tested operator controls, 390x844 Chromium with CP12 typed states, not private game/app UI or hardware',
 receipts:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/navigator/estate-integration/');
 await page.waitForFunction(()=>document.getElementById('jmCP14Preview')!==null);
 eq(await page.locator('#nativeOperator').count(),1,'SECOND_FRONT_DOOR_CREATED');
 eq(await page.locator('#jmCP14RecipientReturn').count(),1,'RECEIVER_PANEL_MISSING');
 await page.locator('#jmCP14Preview').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.includes('CP14_CP13_CARRIER_ABSENT_HOLD'));
 const bin=Buffer.from(JSON.stringify({game,comic}));
 await page.locator('#jmCP14BaselineFile').setInputFiles({name:'JM_OWNER_TYPED_ORIGINALS.json',
  mimeType:'application/json',buffer:bin});
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.startsWith('OWNER_RECIPIENTS_REGISTERED_WITH_READBACK'));
 const g0=await page.evaluate(()=>localStorage.getItem('JM_M002_CP14_GAME_TYPED_RETURN_v01'));
 const c0=await page.evaluate(()=>localStorage.getItem('JM_M002_CP14_COMIC_TYPED_RETURN_v01'));
 yes(g0!==null&&c0!==null,'OWNER_ORIGINALS_NOT_SAVED');
 await page.locator('#jmTransferFile').setInputFiles({name:'CP13_CP12_TRANSFER.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
 await page.waitForFunction(()=>document.getElementById('jmTransferStatus').textContent.startsWith('TRANSFER_RETURN_VERIFIED'));
 eq(await page.evaluate(()=>localStorage.getItem('JM_M002_CP14_GAME_TYPED_RETURN_v01')),g0,
    'CP13_AUTO_MUTATED_CP14_GAME');
 eq(await page.evaluate(()=>localStorage.getItem('JM_M002_CP14_COMIC_TYPED_RETURN_v01')),c0,
    'CP13_AUTO_MUTATED_CP14_COMIC');
 await page.locator('#jmCP14Kind').selectOption('game');
 await page.locator('#jmCP14Preview').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.startsWith('REVIEW ONLY'));
 yes((await page.locator('#jmCP14Status').innerText()).includes('IN_WORLD_MOVEMENT'),'NOT_ACTUAL_EXPLORE_MUTATION');
 eq(await page.evaluate(()=>localStorage.getItem('JM_M002_CP14_GAME_TYPED_RETURN_v01')),g0,
    'REVIEW_MUTATED_GAME');
 page.once('dialog',d=>d.accept());
 await page.locator('#jmCP14Commit').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.startsWith('RECIPIENT_APPLIED_READBACK_VERIFIED'));
 const g1=await page.evaluate(()=>JSON.parse(localStorage.getItem('JM_M002_CP14_GAME_TYPED_RETURN_v01')));
 eq(JSON.parse(g1.body),expected.game,'BROWSER_NATIVE_GAME_NOT_APPLIED');
 eq(g1.revision,1,'GAME_REVISION_STUCK');
 eq(await page.evaluate(()=>localStorage.getItem('JM_M002_CP14_COMIC_TYPED_RETURN_v01')),c0,
    'GAME_APPLY_MUTATED_COMIC');
 await page.locator('#jmCP14Preview').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.includes('CP14_RECIPIENT_ALREADY_APPLIED_HOLD'));
 await page.locator('#jmCP14Kind').selectOption('comic');
 await page.locator('#jmCP14Preview').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.startsWith('REVIEW ONLY'));
 yes((await page.locator('#jmCP14Status').innerText()).includes('PAGE_ILLUSTRATION_INSTRUCTION'),
    'NO_ILLUSTRATION_PAGE_MUTATION');
 page.once('dialog',d=>d.accept());
 await page.locator('#jmCP14Commit').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.startsWith('RECIPIENT_APPLIED_READBACK_VERIFIED'));
 const c1=await page.evaluate(()=>JSON.parse(localStorage.getItem('JM_M002_CP14_COMIC_TYPED_RETURN_v01')));
 eq(JSON.parse(c1.body),expected.comic,'BROWSER_NATIVE_COMIC_NOT_APPLIED');
 eq(c1.revision,1,'COMIC_REVISION_STUCK');
 await page.reload();
 await page.waitForFunction(()=>document.getElementById('jmCP14Export')!==null);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#jmCP14Export').click()]);
 eq(download.suggestedFilename(),'JM_CP14_COMIC_TYPED_RETURN.json','ACTUAL_EXPORT_MISSING');
 const fileContent=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 eq(fileContent.value,expected.comic,'POST_RELOAD_TOUCHED_COMIC_LOST');
 await page.locator('#jmCP14Kind').selectOption('game');
 const [dlGame]=await Promise.all([page.waitForEvent('download'),page.locator('#jmCP14Export').click()]);
 const gameExport=JSON.parse(fs.readFileSync(await dlGame.path(),'utf8'));
 eq(gameExport.value,expected.game,'POST_RELOAD_GAME_LOST');
 await page.screenshot({path:out+'/CP14_OPERATOR_PHONE_TYPED_APPLIED.png',fullPage:true});
 const corrupt=await page.evaluate(()=>{
   const key='JM_M002_CP14_GAME_TYPED_RETURN_v01',p=JSON.parse(localStorage.getItem(key));
   p.body=p.body.replace('JM Krix','Forger');localStorage.setItem(key,JSON.stringify(p));return p.sha256;
 });
 await page.locator('#jmCP14Export').click();
 await page.waitForFunction(()=>document.getElementById('jmCP14Status').textContent.includes('CP14_LOCAL_HASH_HOLD'));
 eq(errors,[],'BROWSER_SCRIPT_ERROR');
 report.status='PASS_REAL_TYPED_RECIPIENT_CONTROLS';report.checks=checks;
 report.receipts=[{type:'GAME_TYPED_APPLIED',digest:g1.sha256},{type:'COMIC_TYPED_APPLIED',digest:c1.sha256}];
 fs.writeFileSync(out+'/CP14_REAL_OPERATOR_BROWSER_RECEIPT.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,checks,applied:2,
  reloaded:true,filesDownloaded:2,originalsUnmodifiedBeforeApproval:true}));
}finally{await browser.close();}
