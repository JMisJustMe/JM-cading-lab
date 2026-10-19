import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const base=process.env.BASE_URL || 'http://127.0.0.1:4177';
const body='/unified-browser/OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html';
const browser=await chromium.launch({headless:true});
function must(ok, message){if(!ok)throw new Error(message)}
try {
  // Actual AILatheo owner-facing entry: preserve v3 creation and link the federation alongside it.
  {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(base+'/ailatheo/',{waitUntil:'domcontentloaded'});
    must(await page.locator('a[href="../unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html"]').count()>=1,'ORIGINAL_CREATOR_DOOR_LOST');
    await page.locator('a:has-text("OPEN LIVING FEDERATION")').click();
    must(page.url().includes('OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html'),'NEW_FEDERATION_NOT_REACHABLE_FROM_OWNER_DOOR');
    must(await page.locator('#conduct').isVisible(),'FEDERATION_FIRST_OPEN_CONTROLS_MISSING');
    await page.close();
  }
  // Browser-served, independent public registry: direct link and real readback.
  for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
    const context=await browser.newContext({viewport});
    await context.route('https://jm-ecostate-build-mesh-mcp.onrender.com/mcp',async route=>{
      const headers={'access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'accept,content-type'};
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
      const payload=JSON.parse(route.request().postData()||'{}');
      must(payload.method==='tools/call'&&['build_mesh_status','search_builds'].includes(payload.params?.name),'BAD_MCP_CALL');
      const search=payload.params.name==='search_builds';
      const data=search ? {current:[{name:'JM GameCore',score:0.82,source:'current_overlay'}],navigator:{state:'PASS',data:{results:[{id:'RL-JM-GAMECORE',title:'JM GameCore'}]}}} : {server:'JM ECOSTATE Build Mesh Native MCP',version:'0.8.5',current_registry_date:'2026-10-06',capability_profiles:34};
      return route.fulfill({status:200,headers:{...headers,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:payload.id,result:{structuredContent:data}})});
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+body,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.JMEstateIntegration?.registry?.schema==='JM.Estate.PublicNervousSystem/1',{timeout:12000});
    const linked=await page.evaluate(()=>({state:document.querySelector('#headStatus').textContent,routeCount:window.JMEstateIntegration.list().length,source:window.JMEstateIntegration.registryUrl,policy:window.JMEstateIntegration.relationshipPolicy}));
    must(linked.routeCount>=9,'PUBLIC_ROUTES_NOT_LOADED '+JSON.stringify(linked));
    must(linked.source.includes('/navigator/estate-integration/public-registry.json'),'WRONG_REGISTRY_SOURCE '+JSON.stringify(linked));
    must(linked.policy.operations.includes('MERGE')&&linked.policy.operations.includes('BREAKAWAY'),'RELATIONSHIP_POLICY_MISSING');
    await page.locator('#contact').fill('game touch visual compile proof recover delivery');
    await page.locator('#proofBtn').click();
    must(await page.locator('#drawer [data-route]').count()>=9,'REAL_ROUTE_BUTTONS_MISSING');
    must(await page.locator('#probeMeshBtn').count()===1,'BUILD_MESH_PROBE_CONTROL_MISSING');
    await page.locator('#probeMeshBtn').click();
    await page.waitForFunction(()=>document.querySelector('#meshProbeResult')?.textContent.includes('LIVE_READ_ONLY_RETURNED'));
    const mesh=await page.locator('#meshProbeResult').textContent();
    must(mesh.includes('0.8.5')&&mesh.includes('not yet declared'),'MCP_READBACK_BOUNDARY_INVALID '+mesh);
    await page.locator('#searchMeshBtn').click();
    await page.waitForFunction(()=>document.querySelector('#meshSearchResult')?.textContent.includes('LIVE_DISCOVERY_RETURNED'));
    const discovery=JSON.parse(await page.locator('#meshSearchResult').textContent());
    must(discovery.current[0].name==='JM GameCore'&&discovery.public[0].id==='RL-JM-GAMECORE','BUILD_MESH_DISCOVERY_INCORRECT');
    must(discovery.boundary.includes('not authority'),'SEARCH_ELEVATED_TO_PROOF');
    await page.locator('#runNativeRouter').click();
    await page.waitForFunction(()=>document.querySelector('#nativeRouterResult')?.textContent.includes('JM_NATIVE_ROUTER_EXECUTED'));
    const native=JSON.parse(await page.locator('#nativeRouterResult').textContent());
    must(native.registryCount===100,'NATIVE_REGISTRY_COUNT_BAD '+JSON.stringify(native));
    must(native.selected.some(x=>x.id==='tracebox'),'NATIVE_TRACE_REQUIRED');
    must(native.selected.some(x=>x.id==='onebody-delivery'),'NATIVE_DELIVERY_REQUIRED');
    must(native.claim_boundary.includes('NOT independently executed'),'NATIVE_CROWN_INFLATION');
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
