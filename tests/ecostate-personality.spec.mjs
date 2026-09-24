import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const routes=[
  ['front-door','/'],
  ['games','/games-beyond/'],
  ['theory','/theory/'],
  ['lyrics','/lyrics/'],
  ['apps','/apps/'],
  ['creator','/author/authuser.html'],
  ['work','/money-menu/'],
  ['navigator','/navigator/'],
  ['recovery','/recovery/'],
  ['recent','/recent/']
];
const viewports=[
  ['mobile',{width:390,height:844}],
  ['desktop',{width:1440,height:960}]
];
await mkdir('qa/ecostate-personality',{recursive:true});
const browser=await chromium.launch({headless:true});
let failed=false;
for(const [vpName,viewport] of viewports){
  const page=await browser.newPage({viewport});
  for(const [surface,path] of routes){
    const errors=[];
    page.removeAllListeners('pageerror');
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4174'+path,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('body[data-ecostate-personality="v2"]',{timeout:10000});
    await page.waitForSelector('.eco2-scene',{state:'attached',timeout:10000});
    const state=await page.evaluate(()=>({
      surface:document.body.dataset.ecostateSurface,
      personality:document.body.dataset.ecostatePersonality,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
      scene:!!document.querySelector('.eco2-scene'),
      sceneBox:(()=>{const n=document.querySelector('.eco2-scene');if(!n)return false;const r=n.getBoundingClientRect();return r.width>0&&r.height>0})(),
      heading:!!document.querySelector('h1')
    }));
    await page.screenshot({path:`qa/ecostate-personality/${surface}-${vpName}.png`,fullPage:true});
    const ok=state.surface===surface&&state.personality==='v2'&&state.scene&&state.sceneBox&&state.heading&&!state.overflow&&errors.length===0;
    console.log(JSON.stringify({vpName,path,...state,errors,ok}));
    if(!ok)failed=true;
  }
  await page.close();
}
await browser.close();
if(failed)process.exit(1);
