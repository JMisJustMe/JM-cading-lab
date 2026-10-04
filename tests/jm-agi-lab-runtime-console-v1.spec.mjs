import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const base=process.env.BASE_URL || 'http://127.0.0.1:4188';
const route='/apps/jm-agi-lab-runtime-console-v1/';
const profile=path.resolve('qa/jm-agi-lab-runtime-console-v1/profile');
const outDir=path.resolve('qa/jm-agi-lab-runtime-console-v1');
await fs.rm(outDir,{recursive:true,force:true});
await fs.mkdir(outDir,{recursive:true});

const errors=[];
function watch(page){
  page.on('pageerror',e=>errors.push('pageerror:'+e.message));
  page.on('console',m=>{ if(m.type()==='error') errors.push('console:'+m.text()); });
}

let context=await chromium.launchPersistentContext(profile,{
  headless:true,
  viewport:{width:390,height:844}
});
let pages=context.pages();
let page=pages[0] || await context.newPage();
watch(page);
await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>typeof window.__JM_RUNTIME_DEBUG__==='function',{timeout:10000});

await page.fill('#factKey','browser-contact');
await page.fill('#factValue','persistent Chromium runtime executed');
await page.selectOption('#confidence','1');
await page.click('#contactBtn');
await page.click('#consequenceBtn');

let pre=await page.evaluate(()=>window.__JM_RUNTIME_DEBUG__());
assert.equal(pre.state.revision,2);
assert.equal(pre.state.consequenceCount,1);
assert.equal(pre.state.facts['browser-contact'].value,'persistent Chromium runtime executed');

await page.click('#settleBtn');
await page.waitForFunction(()=>document.querySelector('#settleState')?.textContent==='SETTLED',{timeout:18000});
await page.waitForFunction(()=>document.querySelector('#heartbeat')?.textContent==='12 / 12',{timeout:3000});

await page.click('#armReloadBtn');
await page.waitForFunction(()=>window.__JM_RUNTIME_DEBUG__().pending!==null,{timeout:3000});
pre=await page.evaluate(()=>window.__JM_RUNTIME_DEBUG__());
assert.equal(pre.state.durability.status,'SETTLED');
assert.equal(pre.state.durability.heartbeat,12);
assert.ok(pre.pending);
assert.equal(pre.pending.armedRevision,pre.state.revision);
assert.equal(pre.probe,pre.pending.expectedProbe);
const armedLoadId=pre.loadId;
const armedRevision=pre.state.revision;

await page.screenshot({path:path.join(outDir,'01-armed-mobile.png'),fullPage:true});
await context.close();

context=await chromium.launchPersistentContext(profile,{
  headless:true,
  viewport:{width:390,height:844}
});
pages=context.pages();
page=pages[0] || await context.newPage();
watch(page);
await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>typeof window.__JM_RUNTIME_DEBUG__==='function',{timeout:10000});
await page.waitForFunction(()=>document.querySelector('#reloadState')?.textContent.includes('RELOAD DING'),{timeout:10000});

const returned=await page.evaluate(()=>window.__JM_RUNTIME_DEBUG__());
assert.notEqual(returned.loadId,armedLoadId);
assert.equal(returned.pending,null);
assert.equal(returned.probe,null);
assert.equal(returned.state.revision,armedRevision);
assert.equal(returned.state.phase,'RETURNED');
assert.equal(returned.state.lastReceipt.state,'PASS');
assert.equal(returned.state.lastReceipt.kind,'RELOAD_REENTRY');
for(const [name,value] of Object.entries(returned.state.lastReceipt.checks)) assert.equal(value,true,'receipt check '+name);
assert.equal(returned.state.facts['browser-contact'].value,'persistent Chromium runtime executed');
assert.equal(returned.state.consequenceCount,1);

await page.screenshot({path:path.join(outDir,'02-returned-mobile.png'),fullPage:true});

await page.setViewportSize({width:1440,height:960});
await page.waitForTimeout(250);
const desktop=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
  runtimeGrid:getComputedStyle(document.querySelector('.runtime-grid')).gridTemplateColumns,
  reloadText:document.querySelector('#reloadState')?.textContent||'',
  revision:document.querySelector('#revision')?.textContent||''
}));
assert.equal(desktop.overflow,false);
assert.match(desktop.reloadText,/RELOAD DING/);
await page.screenshot({path:path.join(outDir,'03-returned-desktop.png'),fullPage:true});

await context.close();

assert.deepEqual(errors,[]);

const receipt={
  schema:'JM.AGILab.RuntimeBrowserProof/1',
  state:'PASS',
  route,
  browser:'Playwright Chromium persistent profile',
  viewport_contacts:['390x844','1440x960'],
  input_consequence:'PASS',
  settle:'PASS_12_OF_12_REAL_SECONDS',
  process_reentry:{
    state:'PASS',
    distinctLoad:true,
    armedRevision,
    exactReadBack:true,
    probeMatch:true,
    probeRestored:true,
    pendingCleared:true
  },
  errors,
  boundary:'Headless Chromium proves executable browser state, a real 12-second settle and persistent-profile process re-entry. It does not transfer owner Windows/Edge proof, OS reboot, cross-device persistence, external-model contact or AGI/general-intelligence claims.'
};
await fs.writeFile(path.join(outDir,'browser-proof.json'),JSON.stringify(receipt,null,2)+'\n','utf8');
console.log(JSON.stringify(receipt,null,2));
