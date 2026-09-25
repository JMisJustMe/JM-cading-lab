import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4176';
const viewports=[['mobile',{width:390,height:844}],['desktop',{width:1440,height:960}]];
await mkdir('qa/ecostate-gripcube-v5',{recursive:true});

const browser=await chromium.launch({headless:true});
let failed=false;

for(const [name,viewport] of viewports){
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error') errors.push(`console: ${m.text()}`)});
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.waitForSelector('.eco-gripcube');

  const proof=await page.evaluate(()=>window.JMGripCube?.proof?.());
  const counts=await page.evaluate(()=>({
    districts:document.querySelectorAll('.gc-district').length,
    faces:document.querySelectorAll('.gc-lens').length,
    tiles:document.querySelectorAll('.gc-tile').length,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
  }));

  if(!proof||proof.districts!==7||proof.faces!==6||proof.localRoutes!==63) throw new Error(`${name}: GripCube proof mismatch ${JSON.stringify(proof)}`);
  if(counts.districts!==7||counts.faces!==6||counts.tiles!==9) throw new Error(`${name}: rendered counts mismatch ${JSON.stringify(counts)}`);
  if(counts.overflow) throw new Error(`${name}: horizontal viewport overflow`);

  await page.locator('.gc-district').filter({hasText:'WORK'}).click();
  await page.waitForTimeout(120);
  const work=await page.evaluate(()=>({
    titles:[...document.querySelectorAll('.gc-tile b')].map(x=>x.textContent.trim()),
    hold:[...document.querySelectorAll('.gc-tile.hold b')].map(x=>x.textContent.trim()),
    openDisabled:document.querySelector('#gcOpen')?.disabled
  }));
  if(!work.titles.includes('JM LEGAL')||!work.titles.includes('RUKQUSS REALITY LTD')) throw new Error(`${name}: work formation routes missing`);
  if(!work.hold.includes('JM LEGAL')||!work.hold.includes('RUKQUSS REALITY LTD')) throw new Error(`${name}: pre-public HOLD boundary missing`);

  const cubeBefore=await page.locator('#gcCube').evaluate(el=>getComputedStyle(el).transform);
  await page.locator('.gc-lens').filter({hasText:'PROOF'}).click();
  await page.waitForTimeout(650);
  const cubeAfter=await page.locator('#gcCube').evaluate(el=>getComputedStyle(el).transform);
  if(cubeBefore===cubeAfter) throw new Error(`${name}: cube lens did not rotate`);

  await page.locator('.gc-district').filter({hasText:'PLAY'}).click();
  const fight=await page.evaluate(()=>window.JMGripCube.districts.find(x=>x.id==='play').items.find(x=>x[0]==='Fight Clash'));
  if(fight?.[2]!=='./games-beyond/bodies/fight-clash-v0-4.html') throw new Error(`${name}: Fight Clash route drift`);

  await page.screenshot({path:`qa/ecostate-gripcube-v5/${name}.png`,fullPage:true});
  if(errors.length) throw new Error(`${name}: ${errors.join(' | ')}`);
  await page.close();
}

await browser.close();
console.log('ECOSTATE GripCube v5 QA PASS — 2/2 rendered contacts');