import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4177';
const url=base+'/unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html';
const key='jm.ailatheo.consequence-return.v1';
const browser=await chromium.launch({headless:true});
function assert(x,n){if(!x)throw Error(n)}
async function toWorkbench(page,task){
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#jmRelayStart').waitFor();
 await page.locator('#contact').fill(task);
 await page.locator('#conduct').click();
 await page.locator('#jmRelayStart').click();
 await page.waitForURL('**/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html?jm_return_id=*');
 if(await page.locator('#creatorPreviewGate').isVisible())await page.locator('#creatorStartBlank').click();
 await page.locator('#jmRelayNative').waitFor();
}
try{
 for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('pageerror',x=>errors.push(String(x)));
  await toWorkbench(page,'make game with native coding and verifiable six receiver return');
  await page.locator('#jmRelayNative').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RELAY HOLD'));
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert(before.phase==='HANDOFF_PREPARED'&&!before.nativeProof,'NATIVE_PROOF_GRANTED_WITHOUT_MATERIAL');
  await page.locator('#jmRelaySample').click();
  await page.locator('#jmRelayVerify').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RECEIVER PROVED'));
  await page.locator('#jmRelayNative').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('NATIVE RECEIVERS PROVED'),{timeout:16000});
  const ticket=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert(ticket.nativeProof?.testedBodies?.length===6,'SIX_ACTUAL_RECEIVERS_NOT_VERIFIED');
  assert(ticket.nativeProof?.receipts===9&&ticket.nativeProof?.gates===8,'NINE_RECEIPTS_EIGHT_GATES_MISSING');
  assert(ticket.nativeProof?.recoverable===true&&ticket.nativeProof?.nativePassed===true,'NATIVE_RECOVERABILITY_MISSING');
  assert(ticket.nativeProofSha256?.length===64&&ticket.nativeProof?.proofSha256?.length===64,'PROOF_SHA_INVALID');
  const recipient=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.ailatheo.v3.projectProof')));
  assert(recipient.nativePassed&&recipient.receipts.length===9&&recipient.buildGates.passed.length===8,'REAL_WORKBENCH_NATIVE_PROOF_MISSING');
  await page.locator('#jmRelayReturn').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html?jm_return_id=*');
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('NATIVE SIX RECEIVERS VERIFIED'));
  const receipt=await page.evaluate(k=>({ticket:JSON.parse(localStorage.getItem(k)),history:JSON.parse(localStorage.getItem('jm-ailatheo-living-federation-v1'))}),key);
  assert(receipt.ticket.phase==='FEDERATION_RETURN_VERIFIED','NO_FEDERATION_NATIVE_RETURN');
  assert(receipt.history.history.some(x=>x.receiver_return?.native_six_return?.executed_bodies?.length===6),'NATIVE_TRACE_ABSENT');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('NATIVE SIX RECEIVERS VERIFIED'));
  assert(!errors.length,'PAGE_ERROR '+errors.join('|'));
  console.log('NATIVE_SIX_ROUNDTRIP_PASS',JSON.stringify({viewport,receivers:6,receipts:9,gates:8,sha:ticket.nativeProofSha256.slice(0,12)}));
  await context.close();
 }
 // Claim mutation: source record changes without matching receipt must be rejected on federation return.
 {
  const context=await browser.newContext(),page=await context.newPage();
  await toWorkbench(page,'tamper test native execution proof');
  await page.locator('#jmRelaySample').click();
  await page.locator('#jmRelayVerify').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RECEIVER PROVED'));
  await page.locator('#jmRelayNative').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('NATIVE RECEIVERS PROVED'),{timeout:16000});
  await page.evaluate(()=>{const x=JSON.parse(localStorage.getItem('jm.ailatheo.v3.projectProof'));x.nativePassed=false;localStorage.setItem('jm.ailatheo.v3.projectProof',JSON.stringify(x))});
  await page.locator('#jmRelayReturn').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html?jm_return_id=*');
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RELAY HOLD'));
  assert(!await page.evaluate(()=>window.JMAILatheoReturn?.state?.()),'TAMPERED_NATIVE_PROMOTED');
  await context.close();
 }
 console.log('JM_NATIVE_SIX_RECEIVER_RETURN_PASS · real specialized engines + 9 receipts + 8 gates + 2 viewports + reload + tamper rejection');
}finally{await browser.close()}
