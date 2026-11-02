import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const routes=[
  ['front-door','/'],['games','/games-beyond/'],['theory','/theory/'],['lyrics','/lyrics/'],['apps','/apps/'],
  ['creator','/author/authuser.html'],['work','/money-menu/'],['market','/market-lab/'],['navigator','/navigator/'],['recovery','/recovery/'],['recent','/recent/']
];
const viewports=[['mobile',{width:390,height:844}],['desktop',{width:1440,height:960}]];
await mkdir('qa/ecostate-contact-v4',{recursive:true});

const browser=await chromium.launch({headless:true});
let failed=false;
for(const [vpName,viewport] of viewports){
  const page=await browser.newPage({viewport});
  for(const [surface,path] of routes){
    const errors=[];
    page.removeAllListeners('pageerror');
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4175'+path,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('body[data-ecostate-contact="v4"]',{timeout:10000});
    await page.waitForSelector('.eco4-state',{timeout:10000});
    await page.waitForSelector('.eco4-veil',{timeout:10000});
    await page.waitForTimeout(980);

    const base=await page.evaluate(()=>({
      surface:document.body.dataset.ecostateSurface,
      contact:document.body.dataset.ecostateContact,
      phase:document.body.dataset.eco4Phase,
      storyCount:document.querySelectorAll('.eco4-story').length,
      stateCount:document.querySelectorAll('.eco4-state').length,
      veilCount:document.querySelectorAll('.eco4-veil').length,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1
    }));

    const ctl=page.locator('a,button,summary,[tabindex]').first();
    let interaction={phase:'none',text:''};
    if(await ctl.count()){
      await page.keyboard.press('Tab');
      await ctl.focus();
      await page.waitForTimeout(80);
      interaction=await page.evaluate(()=>({
        phase:document.body.dataset.eco4Phase,
        input:document.body.dataset.eco4Input,
        text:document.querySelector('.eco4-state span')?.textContent||''
      }));
    }

    await page.screenshot({path:`qa/ecostate-contact-v4/${surface}-${vpName}.png`,fullPage:true});
    const ok=
      base.surface===surface &&
      base.contact==='v4' &&
      base.storyCount===1 &&
      base.stateCount===1 &&
      base.veilCount===1 &&
      !base.overflow &&
      errors.length===0 &&
      interaction.text.length>0;
    console.log(JSON.stringify({vpName,path,...base,interaction,errors,ok}));
    if(!ok)failed=true;
  }
  await page.close();
}

// Reduced-motion proof: no animated transition dependence.
const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await reduced.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
await reduced.waitForSelector('body[data-ecostate-contact="v4"]');
const reducedState=await reduced.evaluate(()=>({
  contact:document.body.dataset.ecostateContact,
  story:!!document.querySelector('.eco4-story'),
  veil:!!document.querySelector('.eco4-veil'),
  overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1
}));
console.log(JSON.stringify({reducedMotion:true,...reducedState,ok:reducedState.contact==='v4'&&reducedState.story&&reducedState.veil&&!reducedState.overflow}));
if(!(reducedState.contact==='v4'&&reducedState.story&&reducedState.veil&&!reducedState.overflow))failed=true;
await reduced.close();

// November front-door regression: browser storage may be malformed or denied.
// These are public-shell boot and owner-byte preservation checks, not device custody proof.
for (const scenario of ['malformed-recent', 'unknown-mounted', 'denied-storage']) {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(kind=>{
    if(kind==='malformed-recent') localStorage.setItem('jm-estate-recent','{bad-json');
    if(kind==='unknown-mounted') localStorage.setItem('jm-estate-mounted','{"unknown":"owner bytes"}');
    if(kind==='denied-storage'){
      for(const method of ['getItem','setItem','removeItem']){
        Storage.prototype[method]=()=>{throw new Error('Device storage denied')};
      }
    }
  },scenario);
  const page=await context.newPage();
  let ok=true,detail={};
  try{
    await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#featureDoors .door-card',{timeout:10000});
    detail=await page.evaluate(()=>({
      features:document.querySelectorAll('#featureDoors .door-card').length,
      year:document.querySelector('#year')?.textContent,
      mounted:document.querySelector('#mountedCount')?.textContent,
      storageHold:document.querySelector('#storageSupport')?.textContent||''
    }));
    const expectedHold=scenario==='malformed-recent'?'recent':scenario==='unknown-mounted'?'mounted':'favourites';
    ok=detail.features>=5 && Number(detail.year)>2020 && Boolean(detail.mounted) && detail.storageHold.includes('OWNER STORAGE HOLD') && detail.storageHold.includes(expectedHold);
    if(scenario==='malformed-recent'){
      // Click the real feature-door handler; module-private trackRecent is not global.
      await page.locator('#featureDoors [data-card-id]').first().click();
      await page.waitForLoadState('domcontentloaded');
      const preserved=await page.evaluate(()=>localStorage.getItem('jm-estate-recent')==='{bad-json');
      ok=ok&&preserved;detail.preserved=preserved;
    }
    if(scenario==='unknown-mounted'){
      // Exercise the actual file-input owner mount, not an inaccessible module function.
      await page.locator('#htmlMountInput').setInputFiles({
        name:'storage-probe.html',mimeType:'text/html',
        buffer:Buffer.from('<!doctype html><html><body>JM probe</body></html>')
      });
      await page.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('Local storage could not accept'));
      const preserved=await page.evaluate(()=>localStorage.getItem('jm-estate-mounted')==='{"unknown":"owner bytes"}'&&document.querySelector('#mountedCount')?.textContent==='0 BODIES');
      ok=ok&&preserved;detail.preserved=preserved;
    }
    if(scenario==='denied-storage'){
      // Dispatch the real notes input event even when the Owner view is not visible.
      const kept=await page.locator('#ownerNotes').evaluate(el=>{
        el.value='session-only test';
        el.dispatchEvent(new Event('input',{bubbles:true}));
        return el.value;
      });
      const warning=(await page.locator('#toast').textContent())||'';
      ok=ok&&kept==='session-only test'&&warning.includes('Owner notes are session-only');
      detail.notesInput=kept;detail.sessionOnlyWarning=warning.includes('Owner notes are session-only');
    }
  }catch(error){ok=false;detail.error=String(error)}
  console.log(JSON.stringify({frontDoorStorageScenario:scenario,...detail,ok}));
  if(!ok)failed=true;
  await context.close();
}

await browser.close();
if(failed)process.exit(1);
