import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('qa',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={schema:'jm.visual-lab.browser-proof/0.1',created_at:new Date().toISOString(),views:[],errors:[]};

async function verify(name,viewport){
  const page=await browser.newPage({viewportSize:viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(`console: ${msg.text()}`)});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.waitForSelector('#illusionCanvas');
  const initial=await page.evaluate(()=>({
    routeButtons:document.querySelectorAll('.route').length,
    rooms:document.querySelectorAll('.room').length,
    canvas:[document.querySelector('#illusionCanvas').width,document.querySelector('#illusionCanvas').height],
    overflowX:document.documentElement.scrollWidth-window.innerWidth,
    world:document.querySelector('#world').getBoundingClientRect().toJSON(),
    actionBank:getComputedStyle(document.querySelector('.action-bank')).display
  }));
  if(initial.routeButtons!==6)errors.push(`expected 6 routes, got ${initial.routeButtons}`);
  if(initial.rooms!==6)errors.push(`expected 6 rooms, got ${initial.rooms}`);
  if(initial.canvas[0]<100||initial.canvas[1]<100)errors.push(`illusion canvas not fitted: ${initial.canvas.join('x')}`);
  if(initial.overflowX>2)errors.push(`horizontal overflow: ${initial.overflowX}px`);
  await page.click('#illusionCycle');
  await page.click('#measureToggle');
  await page.keyboard.press('4');
  await page.waitForSelector('#room-motion:not([hidden])');
  await page.click('#motionPause');
  await page.keyboard.press('t');
  await page.waitForSelector('#traceDrawer.open');
  await page.click('#closeTrace');
  await page.screenshot({path:`qa/${name}.png`,fullPage:false});
  const final=await page.evaluate(()=>({route:document.querySelector('.route.active')?.dataset.route,trace:document.querySelectorAll('#traceList li').length,viewport:[innerWidth,innerHeight]}));
  if(final.route!=='motion')errors.push(`keyboard route failed: ${final.route}`);
  if(final.trace<3)errors.push(`trace did not record contacts: ${final.trace}`);
  report.views.push({name,viewport,initial,final,errors});
  report.errors.push(...errors.map(error=>`${name}: ${error}`));
  await page.close();
}

await verify('desktop-1440x900',{width:1440,height:900});
await verify('android-412x915',{width:412,height:915});
await browser.close();
await writeFile('qa/report.json',JSON.stringify(report,null,2));
if(report.errors.length){console.error(report.errors.join('\n'));process.exit(1)}
console.log('JM VISUAL LAB BROWSER PROOF PASS',JSON.stringify(report.views.map(v=>({name:v.name,route:v.final.route,trace:v.final.trace}))));
