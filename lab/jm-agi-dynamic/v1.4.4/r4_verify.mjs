import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const w=JSON.parse(readFileSync('JM_AGI_PROCESS_WITNESS_LAST.json','utf8'));
console.log('WITNESS',JSON.stringify(w));
if(w.runnerVersion!=='1.0.4'||w.zeroObserved!==true||w.durabilitySettleSeconds!==12)throw new Error('R4 witness metadata invalid');
if(!Number.isInteger(w.returnDebugPort)||w.returnDebugPort<1)throw new Error('return CDP port missing');
let browser;
for(let i=0;i<60&&!browser;i++){
  try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${w.returnDebugPort}`)}catch{await sleep(250)}
}
if(!browser)throw new Error('could not connect to returned Edge CDP');
const ctx=browser.contexts()[0];
const page=ctx.pages().find(p=>p.url().includes('JM_AGI_LAB_v1_4_4_DURABILITY_SETTLE_LIVE_INTEGRATION.html'))||ctx.pages()[0];
await page.waitForLoadState('domcontentloaded');
let result=null;
for(let i=0;i<60&&!result;i++){
  result=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm_agi_lab_v1_4_4_process_last')||'null'));
  if(!result)await sleep(250);
}
console.log('PROCESS_RESULT',JSON.stringify(result));
if(!result||result.status!=='PASS'||result.ownerProcessDing!==true||result.zeroObserved!==true||result.runMatch!==true||result.tokenMatch!==true||result.newLoad!==true||result.exactReadBack!==true||result.restored!==true||result.samePath!==true||result.timelineValid!==true)throw new Error('R4 process result did not earn full process Ding');
const status=await page.locator('#processHarnessStatus').innerText();
const heartbeat=await page.locator('#processHarnessHeartbeat').innerText();
const reason=await page.locator('#processHarnessReasonTop').innerText();
console.log('VISIBLE_STATUS',status);
console.log('VISIBLE_HEARTBEAT',heartbeat);
console.log('VISIBLE_REASON',reason);
if(!/PROCESS DING/i.test(status)||!/COMPLETE/i.test(heartbeat)||!/Windows Edge dedicated process tree reached zero/i.test(reason))throw new Error('final visible proof surface incomplete');
console.log('R4_EXACT_WINDOWS_DYNAMIC_INTEGRATION_PASS');