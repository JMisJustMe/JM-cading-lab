// JM3232 CP03: real Chromium host-bridge EMULATION; not the actual ChatGPT Android client.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import worker from './worker.mjs';
const request=new Request('https://preview.example/mcp',{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({jsonrpc:'2.0',id:1,method:'resources/read',
  params:{uri:'ui://jm3232-navigator/airborne-chatgpt-cp03.html'}})
});
const response=await worker.fetch(request,{ASSETS:{fetch:()=>new Response('asset')}});
assert.equal(response.status,200,'original UI resource must be available');
const envelope=await response.json();
assert.ok(!envelope.error,'MCP resource must not be error');
const html=envelope.result.contents[0].text;
assert.ok(html.length>6_000_000,'large original JM browser source missing');
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.JM_CHROME_EXECUTABLE?{executablePath:process.env.JM_CHROME_EXECUTABLE}:{})});
try{
 for(const viewport of [{width:390,height:844},{width:1365,height:900}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    window.__jmCalls=[];
    window.__jmWidgetState=null;
    window.openai={
      get widgetState(){return window.__jmWidgetState},
      setWidgetState(state){window.__jmWidgetState=state},
      async callTool(name,args){
        window.__jmCalls.push({name,args});
        if(name!=='navigator_internet_search')throw Error('Unknown UI tool');
        return {structuredContent:{
          schema:'JM3232.InternetContact/0.1',
          status:'RESULTS',
          results:[{title:'JM CP03 Search Probe — Documentation',
             snippet:'Search result returned INSIDE the original JM browser',
             url:'https://developers.openai.com/api/docs',provider:'Test public provider',
             source_status:'SOURCE_RETURNED'}],
          provider_status:[{provider:'Test public provider',status:'RESULTS',count:1}]
        }};
      }
    };
  });
  await page.goto('about:blank');
  await page.route('**/*',route=>route.abort());
  await page.setContent(html,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForSelector('#searchForm',{timeout:30000});
  await page.locator('#searchInput').fill('OpenAI documentation');
  await page.locator('#scopeSelect').evaluate(el=>{el.value='web';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#searchForm').evaluate(form=>form.requestSubmit());
  await page.waitForFunction(()=>document.body.innerText.includes('JM CP03 Search Probe'),null,{timeout:30000});
  const state=await page.evaluate(()=>({
    calls:window.__jmCalls,
    visible:document.body.innerText.includes('JM CP03 Search Probe'),
    source:document.body.innerText.includes('Test public provider'),
    stored:window.__jmWidgetState,
    overflow:document.documentElement.scrollWidth>window.innerWidth+2,
    searchInput:document.querySelector('#searchInput')?.value
  }));
  assert.equal(state.visible,true,'original view did not show in-place Internet result');
  assert.equal(state.source,true,'source label not presented');
  assert.equal(state.calls.length,1,'exactly one ChatGPT in-app Internet tool route should be used');
  assert.equal(state.calls[0].name,'navigator_internet_search');
  assert.equal(state.calls[0].args.query,'OpenAI documentation');
  assert.ok(state.stored?.navigator?.tabs?.length,'widget-state carrier failed to save current tabs');
  assert.ok(state.stored?.lastInternetReceipt?.results>=1,'source-return receipt did not persist');
  assert.ok(!state.overflow,'horizontal viewport overflow in original browser');
  console.log('JM3232 CP03 REAL CHROMIUM EMULATED HOST PASS',viewport.width,{
    inPlaceWebResult:true,widgetState:true,sourceReceipt:true,originalBrowser:true,
    physicalAndroidClientProved:false
  });
  await context.close();
 }
}finally{await browser.close();}
