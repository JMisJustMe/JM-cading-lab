import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4176';
await mkdir('qa/ecostate-griprail-v6',{recursive:true});

const browser=await chromium.launch({headless:true});

async function open(path,name){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const gripErrors=[];
  page.on('pageerror',e=>gripErrors.push(`pageerror:${e.message}`));
  page.on('response',r=>{
    const u=r.url();
    if((u.includes('ecostate-griprail-v6')||u.includes('ecostate-gripcube-v5'))&&!r.ok()) gripErrors.push(`${r.status()} ${u}`);
  });
  await page.goto(base+path,{waitUntil:'networkidle'});
  const assets=await page.evaluate(async()=>{
    const urls=['/ecostate-griprail-v6.css','/ecostate-griprail-v6.js'];
    return Object.fromEntries(await Promise.all(urls.map(async u=>[u,(await fetch(u,{cache:'no-store'})).status])));
  });
  if(Object.values(assets).some(x=>x!==200)) throw new Error(`${name}: v6 asset failure ${JSON.stringify(assets)}`);
  if(gripErrors.length) throw new Error(`${name}: ${gripErrors.join(' | ')}`);
  return page;
}

{
  const page=await open('/','root');
  await page.waitForSelector('.eco-gripcube .gc-grid.griprail-track');
  const root=await page.evaluate(()=>({
    proof:window.JMGripRail?.proof?.(),
    grid:{
      sw:document.querySelector('.gc-grid').scrollWidth,
      cw:document.querySelector('.gc-grid').clientWidth,
      flow:getComputedStyle(document.querySelector('.gc-grid')).gridAutoFlow
    },
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1
  }));
  if(root.proof?.version!=='6.0'||!root.proof.rootGripCube) throw new Error(`root: proof mismatch ${JSON.stringify(root)}`);
  if(!(root.grid.sw>root.grid.cw)||root.grid.flow!=='column') throw new Error(`root: local GripCube is not side-routed ${JSON.stringify(root.grid)}`);
  if(root.overflow) throw new Error('root: body-level horizontal overflow');
  await page.screenshot({path:'qa/ecostate-griprail-v6/root-mobile.png',fullPage:true});
  await page.close();
}

{
  const page=await open('/money-menu/','money-menu');
  await page.waitForSelector('#grid .griprail-group');
  const money=await page.evaluate(()=>({
    groups:document.querySelectorAll('#grid .griprail-group').length,
    tracks:[...document.querySelectorAll('#grid .griprail-group .griprail-track')].map(x=>({sw:x.scrollWidth,cw:x.clientWidth,count:x.children.length})),
    pageRatio:document.documentElement.scrollHeight/innerHeight,
    headerWrap:getComputedStyle(document.querySelector('header .actions')).flexWrap,
    proof:window.JMGripRail?.proof?.()
  }));
  if(money.groups<2) throw new Error(`money-menu: expected repeated house rails, got ${money.groups}`);
  if(!money.tracks.some(x=>x.sw>x.cw)) throw new Error('money-menu: no horizontal house rail has overflow/contact');
  if(money.pageRatio>=20) throw new Error(`money-menu: vertical pressure still excessive ratio=${money.pageRatio}`);
  if(money.headerWrap!=='nowrap') throw new Error(`money-menu: header actions still wrap vertically (${money.headerWrap})`);

  await page.click('#enquiryBtn');
  await page.waitForSelector('#enquiryDlg[open]');
  const form=await page.evaluate(()=>({
    sw:document.querySelector('.form-grid').scrollWidth,
    cw:document.querySelector('.form-grid').clientWidth,
    rail:document.querySelector('.form-grid').classList.contains('griprail-form')
  }));
  if(!form.rail||!(form.sw>form.cw)) throw new Error(`money-menu: enquiry form not side-routed ${JSON.stringify(form)}`);
  await page.screenshot({path:'qa/ecostate-griprail-v6/money-menu-enquiry-mobile.png',fullPage:false});
  await page.close();
}

{
  const page=await open('/earn-now/','earn-now');
  await page.waitForSelector('#offerGrid .griprail-group');
  const earn=await page.evaluate(()=>({
    groups:document.querySelectorAll('#offerGrid .griprail-group').length,
    tracks:[...document.querySelectorAll('#offerGrid .griprail-group .griprail-track')].map(x=>({sw:x.scrollWidth,cw:x.clientWidth,count:x.children.length})),
    pageRatio:document.documentElement.scrollHeight/innerHeight,
    navWrap:getComputedStyle(document.querySelector('header .nav')).flexWrap,
    proof:window.JMGripRail?.proof?.()
  }));
  if(earn.groups<2) throw new Error(`earn-now: expected repeated category rails, got ${earn.groups}`);
  if(!earn.tracks.some(x=>x.sw>x.cw)) throw new Error('earn-now: no category rail has horizontal overflow/contact');
  if(earn.pageRatio>=12) throw new Error(`earn-now: vertical pressure still excessive ratio=${earn.pageRatio}`);
  if(earn.navWrap!=='nowrap') throw new Error(`earn-now: nav still wraps vertically (${earn.navWrap})`);

  await page.click('#topEnquiry');
  await page.waitForSelector('#enquiryDlg[open]');
  const form=await page.evaluate(()=>({
    sw:document.querySelector('.formGrid').scrollWidth,
    cw:document.querySelector('.formGrid').clientWidth,
    rail:document.querySelector('.formGrid').classList.contains('griprail-form')
  }));
  if(!form.rail||!(form.sw>form.cw)) throw new Error(`earn-now: enquiry form not side-routed ${JSON.stringify(form)}`);
  await page.screenshot({path:'qa/ecostate-griprail-v6/earn-now-enquiry-mobile.png',fullPage:false});
  await page.close();
}

await browser.close();
console.log('ECOSTATE GripRail v6 QA PASS — root + Money Menu + Earn-Now side-route contacts');
