import {chromium} from 'playwright';
const url=process.env.BASE_URL||'http://127.0.0.1:4177';
const federation=url+'/unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html';
const key='jm.ecostate.games-beyond.return.v1';
const browser=await chromium.launch({headless:true});
const ensure=(yes,msg)=>{if(!yes)throw Error(msg)};
async function readHouseReceipt(page,key){
 return page.evaluate(async key=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('jm-games-beyond-public-v05');open.onerror=()=>reject(Error('DB_OPEN_FAIL'));open.onsuccess=()=>{
   const db=open.result,tx=db.transaction('receipts','readonly');const req=tx.objectStore('receipts').get(key);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('DB_GET_FAIL'));tx.oncomplete=()=>db.close();
  }
 }),key);
}
async function runCase(viewport,breakReceipt=false){
 const c=await browser.newContext({viewport}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 try{
  await p.goto(federation,{waitUntil:'domcontentloaded'});
  await p.locator('#jmGBStart').waitFor();
  await p.locator('#contact').fill('Existing Games&Beyond independent House proof and receiver return');
  await p.locator('#conduct').click();
  await p.locator('#jmGBStart').click();
  await p.waitForURL('**/games-beyond/index.html?jm_games_return_id=*');
  await p.locator('#jmGBExecute').waitFor();
  const first=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  ensure(first?.phase==='HANDOFF_PREPARED'&&first.recipientProof===null,'EARLY_UNEARNED_HOUSE_CLAIM');
  await p.locator('#jmGBReturn').click();
  await p.waitForFunction(()=>document.querySelector('#jmGBStatus')?.textContent.includes('GAMES RETURN HOLD'));
  // Wait for existing Games&Beyond loader, not a fake source or mocked registry.
  await p.waitForFunction(()=>window.GamesBeyond?.pack?.bodies?.length>=21,{timeout:120000});
  const before=await p.evaluate(async()=>new Promise((ok,no)=>{
   const o=indexedDB.open('jm-games-beyond-public-v05');o.onsuccess=()=>{
    const d=o.result,x=d.transaction('receipts').objectStore('receipts').getAll();
    x.onsuccess=()=>{ok(x.result.length);d.close()};x.onerror=()=>no(Error('receipt read fail'))
   };o.onerror=()=>no(Error('db open fail'))
  }));
  await p.locator('#jmGBExecute').click();
  await p.waitForFunction(()=>document.querySelector('#jmGBStatus')?.textContent.includes('GAMES HOUSE RECEIVER PROVED'),{timeout:120000});
  const ticket=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  ensure(ticket.phase==='RECEIVER_RETURN_READY','ORIGINAL_GAMES_HOUSE_EXECUTION_NOT_RETURNED');
  ensure(ticket.recipientProof?.bodyCount>=21,'MISSING_21_GAMES_MOUNTED');
  ensure(ticket.recipientProof?.execution==='ORIGINAL_GAMES_BEYOND_RUN_PROOF_AND_INDEXEDDB_RECEIPT','FAKE_GAME_RECEIVER');
  ensure(ticket.recipientProof.fullTarget>=ticket.recipientProof.bodyCount,'FALSE_FULL_HOUSE');
  const body=await readHouseReceipt(p,ticket.recipientProof.receiptKey);
  ensure(body?.extra?.pass&&body?.extra?.bodyCount===ticket.recipientProof.bodyCount,'NO_NEW_INDEPENDENT_INDEXEDDB_RECEIPT');
  const after=await p.evaluate(async()=>new Promise((ok,no)=>{
   const o=indexedDB.open('jm-games-beyond-public-v05');o.onsuccess=()=>{const d=o.result,x=d.transaction('receipts').objectStore('receipts').getAll();x.onsuccess=()=>{ok(x.result.length);d.close()};x.onerror=()=>no(Error('receipt read failed'))};o.onerror=()=>no(Error('db failed'))
  }));
  ensure(after>before,'ORIGINAL_PROOF_DID_NOT_WRITE_NEW_RECEIPT');
  if(breakReceipt){
   await p.evaluate(async id=>new Promise((done,reject)=>{
    const o=indexedDB.open('jm-games-beyond-public-v05');o.onsuccess=()=>{
     const db=o.result,tx=db.transaction('receipts','readwrite'),store=tx.objectStore('receipts');
     const q=store.get(id);q.onsuccess=()=>{const x=q.result;x.extra.pass=false;store.put(x)};
     tx.oncomplete=()=>{db.close();done()};tx.onerror=()=>reject(tx.error);
    };o.onerror=()=>reject(o.error)
   }),ticket.recipientProof.receiptKey);
  }
  await p.locator('#jmGBReturn').click();
  await p.waitForURL('**/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html?jm_games_return_id=*');
  await p.waitForFunction(hold=>document.querySelector('#jmGBStatus')?.textContent.includes(hold?'GAMES RETURN HOLD':'GAMES&BEYOND FEDERATION RETURN VERIFIED'),breakReceipt,{timeout:25000});
  if(breakReceipt){
    ensure(!await p.evaluate(()=>window.JMGamesBeyondReturn?.state?.()),'TAMPERED_DB_PROOF_CROWNED');
    console.log('JM_GAMES_BEYOND_TAMPER_HOLD_PASS');
  }else{
    const record=await p.evaluate(()=>window.JMGamesBeyondReturn?.state?.());
    ensure(record?.phase==='FEDERATION_RETURN_VERIFIED','GAMES_RETURN_RECORD_NOT_PERSISTED');
    await p.locator('#proofBtn').click();
    await p.waitForFunction(()=>document.querySelector('#drawerBody')?.textContent.includes('games_house_return'));
    const trace=await p.evaluate(()=>JSON.parse(localStorage.getItem('jm-ailatheo-living-federation-v1')));
    ensure(trace.history.some(x=>x.games_beyond_return?.receipt_key===record.recipientProof.receiptKey),'GAMES_RECEIVER_TRACE_NOT_INHERITED');
    await p.reload({waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>document.querySelector('#jmGBStatus')?.textContent.includes('GAMES&BEYOND FEDERATION RETURN VERIFIED'));
    ensure(!errors.length,'BROWSER_PAGE_ERRORS '+errors.join(' | '));
    console.log('JM_GAMES_BEYOND_SECOND_INDEPENDENT_RECEIVER_PASS',JSON.stringify({viewport,bodyCount:ticket.recipientProof.bodyCount,fullMount:ticket.recipientProof.fullMount,store:'Games&Beyond IndexedDB',trace:true,reentry:true}));
  }
 }finally{await c.close()}
}
try{
 await runCase({width:390,height:844});
 await runCase({width:1366,height:900});
 await runCase({width:390,height:844},true);
 console.log('JM SECOND SOVEREIGN RECIPIENT PASSED; no claim of individual game execution, private backend or 23-body full mount');
}finally{await browser.close()}
