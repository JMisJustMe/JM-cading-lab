const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const sizes=[{name:'fold-portrait',width:360,height:780},{name:'desktop',width:1366,height:900}];
 const out=[];
 try{
  for(const vp of sizes){
   const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
   const page=await context.newPage();
   const errors=[];let external=0;
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:4187/')&&!req.url().startsWith('blob:'))external++;});
   const response=await page.goto('http://127.0.0.1:4187/access/browser-contact.html',{waitUntil:'load'});
   assert.equal(response.status(),200,'Browser contact route must exist');
   assert.match(await page.locator('h1').innerText(),/Browser contact/);
   await page.locator('#run').click();
   await page.waitForFunction(()=>document.getElementById('run').disabled===false&&document.getElementById('copy').disabled===false,null,{timeout:30000});
   const receipt=JSON.parse(await page.locator('#trace').textContent());
   assert.equal(receipt.worker.pass,32,'32 authentic Worker messages');
   assert.equal(receipt.indexeddb.pass,32,'32 authentic IndexedDB reads following writes');
   assert.equal(receipt.worker.status,'PASS');
   assert.equal(receipt.indexeddb.status,'PASS');
   assert.equal(receipt.mcp_contact,'NOT_TESTED','MCP no proof transfer');
   assert.equal(receipt.android_native,'NOT_TESTED','Android no proof transfer');
   assert.equal(receipt.cp04_five_workers,'NOT_TESTED','CP04 no proof transfer');
   assert.equal(receipt.chatgpt_browser_permission,'NOT_OBSERVABLE','permission unknown');
   assert.deepEqual(receipt.errors,[],'no errors');
   const width=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(width<=1,'no horizontal overflow: '+width);
   await page.locator('#copy').click();
   const stored=await page.evaluate(()=>localStorage.getItem('jm-browser-contact-last-run-cp01'));
   assert.ok(stored&&JSON.parse(stored).worker.pass===32,'local persisted receipt');
   await page.reload({waitUntil:'load'});
   assert.equal(await page.locator('#pmetric').innerText(),'READ','re-entry storage proof');
   const persistedCycle=await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('jm-ecostate-browser-contact-cp01',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('contact','readonly');const get=tx.objectStore('contact').get('cycle-32');get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);};}));
   assert.equal(persistedCycle.sequence,32,'IndexedDB persists across reload');
   assert.equal(errors.length,0,errors.join('\n'));
   assert.equal(external,0,'no implicit remote requests');
   out.push({viewport:vp.name,worker:receipt.worker.pass,idb:receipt.indexeddb.pass,reentry:'PASS',errors:0});
   await context.close();
  }
  const access=await browser.newPage();
  await access.goto('http://127.0.0.1:4187/access/',{waitUntil:'domcontentloaded'});
  assert.equal(await access.locator('a[href="./browser-contact.html"]').count(),1,'legacy Access Mesh has additive door');
  assert.equal(await access.locator('a[href="../games-beyond/"]').count(),1,'game door preserved');
  await access.close();
  console.log(JSON.stringify({status:'PASS',surface_contact:out,checks:'32 worker + 32 IndexedDB per viewport, persisted re-entry, main Access Mesh mount, no unexpected outbound requests'},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
