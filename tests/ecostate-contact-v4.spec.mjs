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

// Lyrics House mobile Estate return proof: real route, not a CSS-only assertion.
// This checks the existing House and the existing link, not LyricStudio v0.5.1.
for(const width of [320,390,760,761,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.goto('http://127.0.0.1:4175/lyrics/',{waitUntil:'domcontentloaded'});
  const estate=page.locator('header nav a[href="../"]').first();
  const result=await estate.evaluate(link=>{
    const box=link.getBoundingClientRect();
    const css=getComputedStyle(link);
    return {
      text:link.textContent.trim(),
      target:new URL(link.href).pathname,
      visible:css.display!=='none'&&css.visibility!=='hidden'&&box.width>0&&box.height>0,
      inViewport:box.left>=-1&&box.right<=innerWidth+1,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1
    };
  });
  let navigated=false;
  if(width===390){
    await estate.click();
    navigated=new URL(page.url()).pathname==='/';
  }
  const ok=result.text==='Estate'&&result.target==='/'&&result.visible&&result.inViewport&&!result.overflow&&(width!==390||navigated);
  console.log(JSON.stringify({check:'lyrics-estate-return',width,...result,navigated,ok}));
  if(!ok)failed=true;
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

await browser.close();
if(failed)process.exit(1);
