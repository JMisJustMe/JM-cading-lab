// JM historical source companion proof: browser network → service-worker install → offline reentry.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const samples=[
  {
    "path": "games-beyond/bodies/source_vault/OPEN_FIRST_JMGAMECORE_v0_2I_A_CORRECTED_THREE_GAME_INTEGRATION.html",
    "manifest": "games-beyond/bodies/source_vault/manifest.webmanifest",
    "worker": "games-beyond/bodies/source_vault/service-worker.js",
    "expected": "JM GameCore v0.2I-A — T-Boys + Catching Run + Aiming Run"
  },
  {
    "path": "estate-publication/contact-organ-descendants/phone-browser/JM3232_UNIFIED_BROWSER_v1_0_OPEN_CONTACT_ORGAN_v1_1_DESCENDANT.html",
    "manifest": "estate-publication/contact-organ-descendants/phone-browser/manifest.webmanifest",
    "worker": "estate-publication/contact-organ-descendants/phone-browser/service-worker.js",
    "expected": "JM3232 Unified Browser v1.0 — Preserved Contact Organ Descendant"
  },
  {
    "path": "ai-federation/jm-ai-lab-v2.0/00_OPEN_FIRST_JM_AI_LAB_v2_0_FULL_COMPLETE.html",
    "manifest": "ai-federation/jm-ai-lab-v2.0/04_MANIFEST.webmanifest",
    "worker": null,
    "expected": "JM AI Lab v2.0 — Full Complete Production Body"
  }
];
const root='http://127.0.0.1:4197/';
for(const c of samples){
 const source=readFileSync(c.path,'utf8');
 const manifest=JSON.parse(readFileSync(c.manifest,'utf8'));
 assert(source.includes(c.manifest.split('/').pop()),c.path+': original manifest reference absent');
 assert.equal(manifest.start_url,'./'+c.path.split('/').pop());
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.name,c.expected);
 if(c.worker){
  const sw=readFileSync(c.worker,'utf8');
  assert(sw.includes('self.registration.scope')&&sw.includes('req.method!=="GET"'),c.worker);
 }
}
const browser=await chromium.launch({headless:true});
try{
 for(const c of samples){
  const context=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const res=await page.goto(root+c.path,{waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(res.status(),200,c.path+': original HTML unreachable');
  const installedManifest=await page.evaluate(async()=>{
    const target=document.querySelector('link[rel="manifest"]');
    if(!target)throw Error('No original manifest link');
    const response=await fetch(target.href);
    if(!response.ok)throw Error('Manifest HTTP '+response.status);
    return response.json();
  });
  assert.equal(installedManifest.start_url,'./'+c.path.split('/').pop());
  if(c.worker){
   const result=await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.register('./service-worker.js');
      await navigator.serviceWorker.ready;
      if(!registration.active)throw Error('Service worker not active');
      return {script:registration.active.scriptURL,scope:registration.scope};
   });
   assert(result.scope.endsWith(c.worker.replace('service-worker.js','')),c.path+': worker escaped scope');
   await page.reload({waitUntil:'domcontentloaded',timeout:35000});
   await context.setOffline(true);
   const offline=await page.reload({waitUntil:'domcontentloaded',timeout:35000});
   assert(offline&&offline.ok(),c.path+': original HTML offline reload not delivered');
   assert(await page.title(),c.path+': offline title absent');
   await context.setOffline(false);
   console.log('OFFLINE SOURCE CONTACT PASS',c.path,'scope',result.scope);
  }else console.log('MANIFEST CONTACT PASS',c.path);
  await context.close();
 }
 console.log('HISTORICAL_COMPANIONS_BROWSER_PROOF_PASS=5_FILES_3_BODIES');
}finally{await browser.close();}
