import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const base=process.env.BASE_URL || 'http://127.0.0.1:4177';
const body='/unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html';
const browser=await chromium.launch({headless:true});
function must(ok, message){if(!ok)throw new Error(message)}
try {
  // Browser-served, independent public registry: direct link and real readback.
  for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+body,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.JMEstateIntegration?.registry?.schema==='JM.Estate.PublicNervousSystem/1',{timeout:12000});
    const linked=await page.evaluate(()=>({state:document.querySelector('#headStatus').textContent,routeCount:window.JMEstateIntegration.list().length,source:window.JMEstateIntegration.registryUrl,policy:window.JMEstateIntegration.relationshipPolicy}));
    must(linked.routeCount>=9,'PUBLIC_ROUTES_NOT_LOADED '+JSON.stringify(linked));
    must(linked.source.includes('/navigator/estate-integration/public-registry.json'),'WRONG_REGISTRY_SOURCE '+JSON.stringify(linked));
    must(linked.policy.operations.includes('MERGE')&&linked.policy.operations.includes('BREAKAWAY'),'RELATIONSHIP_POLICY_MISSING');
    await page.locator('#proofBtn').click();
    must(await page.locator('#drawer [data-route]').count()>=9,'REAL_ROUTE_BUTTONS_MISSING');
    await page.locator('#close').click();
    await page.locator('#contact').fill('Connect the evidence, code and route without merging identities');
    await page.locator('#conduct').click();
    must((await page.locator('#headStatus').textContent()).startsWith('ROUTED'),'LOCAL_CONTACT_NOT_ROUTED');
    const last=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-ailatheo-living-federation-v1')).last);
    must(last.outcome==='CONTACT_ROUTED_LOCAL'&&last.ding===null,'FALSE_DING');
    must(last.estate_link.state==='CONNECTED_PUBLIC_READ_ONLY','NETWORK_NOT_RECORDED');
    must(last.payload_sha256?.length===64,'SHA_DIGEST_NOT_EARNED');
    await page.reload({waitUntil:'domcontentloaded'});
    must((await page.locator('#headStatus').textContent())==='RETURN','REENTRY_NOT_DETECTED');
    await page.locator('#recover').click();
    must((await page.locator('#headStatus').textContent())==='RECOVERED','RECOVERY_NOT_READBACK');
    must(errors.length===0,'BROWSER_ERRORS '+errors.join(' | '));
    await context.close();
  }
  // Block the source on a fresh browser: app must fail visibly but remain locally usable.
  {
    const context=await browser.newContext();
    await context.route('**/navigator/estate-integration/public-registry.json',r=>r.abort());
    const page=await context.newPage();
    await page.goto(base+body,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#headStatus').textContent==='OFFLINE',{timeout:12000});
    await page.locator('#conduct').click();
    must((await page.locator('#headStatus').textContent()).startsWith('ROUTED'),'OFFLINE_CONTACT_UNUSABLE');
    const last=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-ailatheo-living-federation-v1')).last);
    must(last.estate_link.state==='HOLD'&&last.ding===null,'OFFLINE_PROOF_FABRICATION');
    await context.close();
  }
  // Direct file entry must not require a server for controls to work.
  {
    const page=await browser.newPage();
    const file=pathToFileURL(resolve('unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html')).href;
    await page.goto(file,{waitUntil:'domcontentloaded'});
    await page.locator('#conduct').click();
    must((await page.locator('#headStatus').textContent()).startsWith('ROUTED'),'FILE_OPEN_CONTACT_BROKEN');
    await page.close();
  }
  console.log('AILATHEO_ESTATE_BRIDGE_BROWSER_CONTACT_PASS · HTTP + phone/desktop + offline + file');
} finally {await browser.close()}
