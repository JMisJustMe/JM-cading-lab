import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4177';
const path='/unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html';
await mkdir('qa/ailatheo-v3-creator-preview',{recursive:true});

const browser=await chromium.launch({headless:true});

async function freshPage(viewport={width:390,height:844}){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+path,{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  return {context,page,errors};
}

{
  const {context,page,errors}=await freshPage();
  const gate=page.locator('#creatorPreviewGate');
  if(!await gate.isVisible()) throw new Error('FIRST_RUN_GATE_NOT_VISIBLE');
  await page.locator('#creatorStartBlank').click();
  const state=await page.evaluate(()=>window.JMAILatheoCreatorPreview?.state?.());
  if(!state||state.bodies!==0||state.links!==0||state.checkout!=='disabled-until-entitlement') throw new Error('START_BLANK_STATE_INVALID '+JSON.stringify(state));
  if(await gate.isVisible()) throw new Error('START_BLANK_GATE_NOT_DISMISSED');
  await page.screenshot({path:'qa/ailatheo-v3-creator-preview/start-blank-phone.png',fullPage:true});
  if(errors.length) throw new Error('START_BLANK_BROWSER_ERRORS '+errors.join(' | '));
  await context.close();
}

{
  const {context,page,errors}=await freshPage();
  await page.locator('#creatorExploreSignal').click();
  await page.waitForTimeout(150);
  const loaded=await page.evaluate(()=>({
    preview:window.JMAILatheoCreatorPreview?.state?.(),
    face:window.JMAILatheoGripUI?.current?.(),
    names:[...document.querySelectorAll('.sceneBody')].map(x=>x._body?.name),
    gateSize:document.querySelectorAll('.sceneBody')[2]?._body?.size,
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]')
  }));
  if(loaded.preview?.sample!=='signal-garden'||loaded.preview?.bodies!==3||loaded.preview?.links!==2) throw new Error('SIGNAL_GARDEN_LOAD_INVALID '+JSON.stringify(loaded));
  if(loaded.face!=='use') throw new Error('SIGNAL_GARDEN_NOT_IN_USE '+JSON.stringify(loaded));
  if(JSON.stringify(loaded.names)!==JSON.stringify(['Pulse Pad','Glow Orb','Gate Bloom'])) throw new Error('SIGNAL_GARDEN_NAMES_INVALID '+JSON.stringify(loaded.names));
  if(loaded.links.length!==2||loaded.links[0].from!==0||loaded.links[0].to!==1||loaded.links[1].from!==1||loaded.links[1].to!==2) throw new Error('SIGNAL_GARDEN_LINKS_INVALID '+JSON.stringify(loaded.links));

  await page.locator('.sceneBody').nth(0).click();
  await page.waitForTimeout(420);
  const afterPad=await page.evaluate(()=>({
    padOn:!!document.querySelectorAll('.sceneBody')[0]?._body?.on,
    orbOn:!!document.querySelectorAll('.sceneBody')[1]?._body?.on,
    gateSize:document.querySelectorAll('.sceneBody')[2]?._body?.size,
    event:window.JMAILatheoGripUI?.latestMaterialContact?.()
  }));
  if(afterPad.gateSize!==loaded.gateSize) throw new Error('SIGNAL_GARDEN_PAD_SKIPPED_CHAIN '+JSON.stringify({loaded,afterPad}));

  await page.locator('.sceneBody').nth(1).click();
  await page.waitForTimeout(420);
  const afterOrb=await page.evaluate(()=>({
    gateSize:document.querySelectorAll('.sceneBody')[2]?._body?.size,
    event:window.JMAILatheoGripUI?.latestMaterialContact?.()
  }));
  if(afterOrb.gateSize!==loaded.gateSize+18||afterOrb.event?.kind!=='CAUSE DING'||afterOrb.event?.body!=='Gate Bloom') throw new Error('SIGNAL_GARDEN_CAUSE_INVALID '+JSON.stringify({loaded,afterOrb}));

  await page.locator('#sampleResetButton').click();
  await page.waitForTimeout(100);
  const reset=await page.evaluate(()=>({
    preview:window.JMAILatheoCreatorPreview?.state?.(),
    names:[...document.querySelectorAll('.sceneBody')].map(x=>x._body?.name),
    sizes:[...document.querySelectorAll('.sceneBody')].map(x=>x._body?.size),
    links:JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]'),
    event:window.JMAILatheoGripUI?.latestMaterialContact?.()
  }));
  if(reset.preview?.bodies!==3||reset.preview?.links!==2||reset.sizes[2]!==88||reset.links.length!==2||reset.event?.kind!=='SAMPLE DING') throw new Error('SIGNAL_GARDEN_RESET_INVALID '+JSON.stringify(reset));
  await page.screenshot({path:'qa/ailatheo-v3-creator-preview/signal-garden-phone.png',fullPage:true});
  if(errors.length) throw new Error('SIGNAL_GARDEN_BROWSER_ERRORS '+errors.join(' | '));
  await context.close();
}

await browser.close();
console.log(JSON.stringify({
  passed:true,
  release:'Creator Preview v0.1',
  startBlank:true,
  signalGardenRuntime:true,
  nativeCauseChain:true,
  resetSample:true,
  checkoutBoundary:'disabled-until-entitlement'
},null,2));
