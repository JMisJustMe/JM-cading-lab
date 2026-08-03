import {chromium} from 'playwright';
import {mkdir,rm,writeFile} from 'node:fs/promises';

await rm('qa',{recursive:true,force:true});
await mkdir('qa',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={schema:'jm.visual-lab.browser-proof/0.3',created_at:new Date().toISOString(),views:[],errors:[]};

async function verify(name,viewport,{mobile=false}={}){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(`console: ${msg.text()}`)});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.waitForSelector('#illusionCanvas');
  await page.waitForTimeout(120);
  const initial=await page.evaluate(()=>{
    const canvas=document.querySelector('#illusionCanvas');
    const crown=document.querySelector('#room-illusion .visual-crown');
    return {
      routeButtons:document.querySelectorAll('.route').length,
      rooms:document.querySelectorAll('.room').length,
      canvasPixels:[canvas.width,canvas.height],
      canvasCss:[Math.round(canvas.getBoundingClientRect().width),Math.round(canvas.getBoundingClientRect().height)],
      crown:[Math.round(crown.getBoundingClientRect().width),Math.round(crown.getBoundingClientRect().height)],
      overflowX:document.documentElement.scrollWidth-window.innerWidth,
      world:document.querySelector('#world').getBoundingClientRect().toJSON(),
      actionBank:getComputedStyle(document.querySelector('.action-bank')).display,
      viewport:[innerWidth,innerHeight]
    };
  });
  if(initial.viewport[0]!==viewport.width||initial.viewport[1]!==viewport.height)errors.push(`wrong viewport: expected ${viewport.width}x${viewport.height}, got ${initial.viewport.join('x')}`);
  if(initial.routeButtons!==6)errors.push(`expected 6 routes, got ${initial.routeButtons}`);
  if(initial.rooms!==6)errors.push(`expected 6 rooms, got ${initial.rooms}`);
  if(initial.canvasCss[0]<100||initial.canvasCss[1]<100)errors.push(`illusion canvas CSS field not fitted: ${initial.canvasCss.join('x')}`);
  if(initial.crown[0]<100||initial.crown[1]<150)errors.push(`protected visual crown too small: ${initial.crown.join('x')}`);
  if(initial.overflowX>2)errors.push(`horizontal overflow: ${initial.overflowX}px`);
  if(mobile&&initial.actionBank!=='grid')errors.push(`mobile recovery/action bank unavailable: ${initial.actionBank}`);
  if(!mobile&&initial.actionBank!=='none')errors.push(`desktop action bank should be compressed away: ${initial.actionBank}`);

  await page.click('#illusionCycle');
  await page.click('#measureToggle');
  await page.keyboard.press('4');
  await page.waitForSelector('#room-motion:not([hidden])');
  await page.click('#motionPause');
  await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));
  await page.waitForTimeout(120);
  await page.screenshot({path:`qa/${name}-main.png`,fullPage:false});

  await page.keyboard.press('t');
  await page.waitForSelector('#traceDrawer.open');
  await page.waitForTimeout(320);
  await page.screenshot({path:`qa/${name}-trace.png`,fullPage:false});
  await page.click('#closeTrace');
  await page.waitForTimeout(320);

  const final=await page.evaluate(()=>({
    route:document.querySelector('.route.active')?.dataset.route,
    trace:document.querySelectorAll('#traceList li').length,
    viewport:[innerWidth,innerHeight],
    drawerOpen:document.querySelector('#traceDrawer').classList.contains('open'),
    overflowX:document.documentElement.scrollWidth-window.innerWidth
  }));
  if(final.route!=='motion')errors.push(`keyboard route failed: ${final.route}`);
  if(final.trace<3)errors.push(`trace did not record contacts: ${final.trace}`);
  if(final.drawerOpen)errors.push('trace drawer did not close');
  if(final.overflowX>2)errors.push(`final horizontal overflow: ${final.overflowX}px`);
  report.views.push({name,requestedViewport:viewport,mobile,initial,final,errors});
  report.errors.push(...errors.map(error=>`${name}: ${error}`));
  await context.close();
}

await verify('desktop-1440x900',{width:1440,height:900});
await verify('android-412x915',{width:412,height:915},{mobile:true});
await browser.close();
await writeFile('qa/report.json',JSON.stringify(report,null,2));
if(report.errors.length){console.error(report.errors.join('\n'));process.exit(1)}
console.log('JM VISUAL LAB BROWSER PROOF PASS',JSON.stringify(report.views.map(v=>({name:v.name,viewport:v.final.viewport,route:v.final.route,trace:v.final.trace}))));
