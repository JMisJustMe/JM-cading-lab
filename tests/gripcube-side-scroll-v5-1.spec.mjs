import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4177';
await mkdir('qa/gripcube-side-scroll-v5-1',{recursive:true});
const browser=await chromium.launch({headless:true});

async function checkedPage(name,viewport,path){
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/404 \(File not found\)/.test(m.text())) errors.push('console: '+m.text())});
  await page.goto(base+path,{waitUntil:'networkidle'});
  return {page,errors};
}

{
  const {page,errors}=await checkedPage('money-mobile',{width:390,height:844},'/money-menu/');
  await page.waitForSelector('.route-lane .route-rail .card');
  const state=await page.evaluate(()=>({
    lanes:document.querySelectorAll('.route-lane').length,
    directCards:[...document.querySelector('#grid').children].filter(x=>x.classList.contains('card')).length,
    railOverflow:[...document.querySelectorAll('.route-rail')].some(x=>x.scrollWidth>x.clientWidth+10),
    proofOverflow:document.querySelector('.proof').scrollWidth>document.querySelector('.proof').clientWidth+10,
    offerOverflow:document.querySelector('.offer-row').scrollWidth>document.querySelector('.offer-row').clientWidth+10,
    actionsOverflow:document.querySelector('.bar>.actions').scrollWidth>=document.querySelector('.bar>.actions').clientWidth
  }));
  if(state.lanes<2) throw new Error('Money Menu did not render repeated route lanes: '+JSON.stringify(state));
  if(state.directCards!==0) throw new Error('Cards still vertically stacked directly in #grid');
  if(!state.railOverflow) throw new Error('Money Menu route rails are not side-scrollable');
  if(!state.proofOverflow||!state.offerOverflow) throw new Error('Repeated side-scroll inclusivity missing from proof/front offers');
  await page.locator('#enquiryBtn').click();
  await page.waitForSelector('#enquiryDlg[open]');
  const form=await page.evaluate(()=>{const x=document.querySelector('.form-grid');return{overflow:getComputedStyle(x).overflowX,wide:x.scrollWidth>x.clientWidth+10,labels:x.children.length}});
  if(form.overflow!=='auto'||!form.wide||form.labels<6) throw new Error('Enquiry form did not compress into horizontal step rail: '+JSON.stringify(form));
  await page.screenshot({path:'qa/gripcube-side-scroll-v5-1/money-mobile.png',fullPage:true});
  if(errors.length) throw new Error(errors.join(' | '));
  await page.close();
}

{
  const {page,errors}=await checkedPage('estate-mobile',{width:390,height:844},'/');
  await page.waitForSelector('.eco-gripcube .gc-grid .gc-tile');
  const gc=await page.evaluate(()=>{const x=document.querySelector('.gc-grid'),m=document.querySelector('.gc-move');return{display:getComputedStyle(x).display,overflow:getComputedStyle(x).overflowX,wide:x.scrollWidth>x.clientWidth+10,moveWide:m.scrollWidth>m.clientWidth+10,tiles:x.children.length}});
  if(gc.display!=='flex'||gc.overflow!=='auto'||!gc.wide||!gc.moveWide||gc.tiles!==9) throw new Error('Root GripCube local route rail failed: '+JSON.stringify(gc));
  await page.screenshot({path:'qa/gripcube-side-scroll-v5-1/estate-mobile.png',fullPage:true});
  if(errors.length) throw new Error(errors.join(' | '));
  await page.close();
}

{
  const {page,errors}=await checkedPage('money-desktop',{width:1440,height:960},'/money-menu/');
  await page.waitForSelector('.route-lane .route-rail .card');
  const lanes=await page.locator('.route-lane').count();
  if(lanes<2) throw new Error('Desktop repeated route lanes missing');
  await page.screenshot({path:'qa/gripcube-side-scroll-v5-1/money-desktop.png',fullPage:true});
  if(errors.length) throw new Error(errors.join(' | '));
  await page.close();
}

await browser.close();
console.log('GripCube side-scroll v5.1 QA PASS — repeated rails + compressed enquiry + root local rail');