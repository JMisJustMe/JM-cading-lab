import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const base=process.env.BASE_URL||'http://127.0.0.1:4177';
const federation='/unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html';
const workbench='/unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html';
const KEY='jm.ailatheo.consequence-return.v1';
const browser=await chromium.launch({headless:true});
function need(value,reason){if(!value)throw Error(reason)}
async function openFlow(viewport){
 const context=await browser.newContext({viewport});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+federation,{waitUntil:'domcontentloaded'});
 await page.locator('#jmRelayStart').waitFor();
 return {context,page,errors};
}
try{
 for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
  const {context,page,errors}=await openFlow(viewport);
  const task='game touch visual compile proof recover delivery — federated receiver test';
  await page.locator('#contact').fill(task);
  await page.locator('#conduct').click();
  await page.locator('#jmRelayStart').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html?jm_return_id=*');
  if(await page.locator('#creatorPreviewGate').isVisible()) await page.locator('#creatorStartBlank').click();
  need(page.url().includes('jm_return_id='),'HANDOFF_ID_MISSING');
  await page.locator('#jmRelayVerify').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RELAY HOLD'));
  let before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  need(before.phase==='HANDOFF_PREPARED','FALSE_PRECONTACT_RECIPIENT_DING');
  await page.locator('#jmRelaySample').click();
  await page.locator('#jmRelayVerify').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RECEIVER PROVED'));
  const receiver=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  need(receiver.phase==='RECEIVER_RETURN_READY','RECEIVER_PHASE_MISSING');
  need(receiver.receiverProof?.eventKind==='SAMPLE DING','WRONG_MATERIAL_EVENT');
  need(receiver.receiverProof?.bodyCount===3&&receiver.receiverProof?.linkCount===2,'ACTUAL_PROJECT_STATE_MISSING');
  need(receiver.receiverProof?.recoveryRevision,'MISSING_RECOVERY_LINK');
  need(receiver.proofSha256?.length===64,'INVALID_RECEIPT_DIGEST');
  await page.locator('#jmRelayReturn').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html?jm_return_id=*');
  await page.waitForFunction(()=>document.querySelector('#headStatus')?.textContent==='RECEIVER RETURN VERIFIED');
  const roundtrip=await page.evaluate(key=>({ticket:JSON.parse(localStorage.getItem(key)),federation:JSON.parse(localStorage.getItem('jm-ailatheo-living-federation-v1')),bridge:window.JMAILatheoReturn?.state?.()}),KEY);
  need(roundtrip.ticket.phase==='FEDERATION_RETURN_VERIFIED','NO_FEDERATION_VERIFICATION');
  need(roundtrip.bridge?.receiverProof?.bodyCount===3,'NO_RECEIVING_BODY_RETURN');
  need(roundtrip.federation.history.some(x=>x.receiver_return?.proof_sha256===receiver.proofSha256),'RETURN_NOT_IN_INHERITED_TRACE');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#headStatus')?.textContent==='RECEIVER RETURN VERIFIED');
  need(errors.length===0,'UNHANDLED_BROWSER_ERRORS '+errors.join(' | '));
  console.log('RETURN_PHONE_DESKTOP_PASS',JSON.stringify({viewport,event:receiver.receiverProof.eventKind,bytes:receiver.proofSha256.length,phase:roundtrip.ticket.phase}));
  await context.close();
 }
 // Changing the real recipient's saved project after it issued a receipt invalidates federation return.
 {
  const {context,page}=await openFlow({width:390,height:844});
  await page.locator('#contact').fill('test receipt tamper revalidation');
  await page.locator('#jmRelayStart').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html?jm_return_id=*');
  if(await page.locator('#creatorPreviewGate').isVisible()) await page.locator('#creatorStartBlank').click();
  await page.locator('#jmRelaySample').click();
  await page.locator('#jmRelayVerify').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RECEIVER PROVED'));
  await page.evaluate(()=>localStorage.setItem('jm.ailatheo.v3.links','[]'));
  await page.locator('#jmRelayReturn').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html?jm_return_id=*');
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('RELAY HOLD'));
  need(!(await page.locator('#headStatus').textContent()).includes('RECEIVER RETURN VERIFIED'),'TAMPERED_REENTRY_PROMOTED');
  await context.close();
 }
 // Existing creator data must not be overwritten merely because federation supplied a task.
 {
  const {context,page}=await openFlow({width:390,height:844});
  const project=[{name:'Protected Original',type:'lamp',shape:'square',action:'ToggleLight',x:20,y:40,size:70,colour:'#aaaaaa'}];
  await page.evaluate(data=>localStorage.setItem('jm.ailatheo.v3.bodies',JSON.stringify(data)),project);
  await page.locator('#contact').fill('protect existing project');
  await page.locator('#jmRelayStart').click();
  await page.waitForURL('**/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html?jm_return_id=*');
  if(await page.locator('#creatorPreviewGate').isVisible()) await page.locator('#creatorStartBlank').click();
  await page.locator('#jmRelaySample').click();
  await page.waitForFunction(()=>document.querySelector('#jmRelayStatus')?.textContent.includes('Existing creator project protected'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')));
  need(saved[0]?.name==='Protected Original'&&saved.length===1,'EXISTING_PROJECT_CLOBBERED');
  await context.close();
 }
 // First-open local file cannot manufacture a remote write or full claim.
 {
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve('unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html')).href,{waitUntil:'domcontentloaded'});
  await page.locator('#jmRelayStart').waitFor();
  await page.locator('#conduct').click();
  need((await page.locator('#headStatus').textContent()).startsWith('ROUTED'),'FILE_LOCAL_CONTACT_BROKEN');
  await page.close();
 }
 console.log('JM_AILATHEO_FEDERATED_RECEIVER_RETURN_PROOF_PASS · 2 viewports · honest precontact · material consequence · SHA-256 · trace · reload · tamper rejection · project protection · direct file');
}finally{await browser.close()}
