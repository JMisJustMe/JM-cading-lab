// Real Chromium contact test, independent from DOM-mock QA. No outgoing email or payments.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
const here=resolve(fileURLToPath(import.meta.url),'..');
const html=resolve(here,'index.html');
const chrome=process.env.CHROME_BIN ||
 ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync) ||
 spawnSync('which',['google-chrome'],{encoding:'utf8'}).stdout.trim();
assert.ok(chrome&&existsSync(chrome),'Real Chrome/Chromium browser executable missing: browser QA must HOLD.');
const out=resolve(here,'screenshots');
mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-first-run']});
const errors=[];
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',request=>{
  if(!request.url().startsWith('file://')&&!request.url().startsWith('data:'))errors.push('unexpected network request: '+request.url());
 });
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.goto(pathToFileURL(html).href+'?interest=play',{waitUntil:'load'});
 assert.equal(await page.$eval('[data-filter="play"]',e=>e.getAttribute('aria-pressed')),'true');
 assert.equal((await page.$$eval('article.offer',a=>a.filter(x=>!x.hidden).length)),2,'play category count');
 let overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=1,'mobile horizontal overflow '+overflow);
 await page.screenshot({path:resolve(out,'launch-mobile-390.png'),fullPage:true});
 await page.click('button[data-enquire="Fight Clash — Founders Collection"]');
 assert.equal(await page.$eval('#chosenOffer',e=>e.value),'Fight Clash — Founders Collection');
 await page.type('#customerNeed','Please let me know when I can test this on my Android phone.');
 assert.equal(await page.$eval('#customerNeed',e=>e.value.includes('Android phone')),true);
 assert.equal(await page.$eval('#status',e=>e.textContent.includes('Offer selected')),true);
 console.log('PASS real Chromium mobile 390px category, no overflow, offer enquiry control');
 await page.setViewport({width:1280,height:800,deviceScaleFactor:1,isMobile:false,hasTouch:false});
 await page.goto(pathToFileURL(html).href,{waitUntil:'load'});
 assert.equal((await page.$$eval('article.offer',a=>a.filter(x=>!x.hidden).length)),8,'all offers visible by default');
 await page.click('[data-filter="services"]');
 assert.equal((await page.$$eval('article.offer',a=>a.filter(x=>!x.hidden).length)),3,'service count');
 await page.click('button[data-enquire="Control Grammar Audit"]');
 assert.equal(await page.$eval('#chosenOffer',e=>e.value),'Control Grammar Audit');
 overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=1,'desktop horizontal overflow '+overflow);
 await page.screenshot({path:resolve(out,'launch-desktop-1280.png'),fullPage:true});
 console.log('PASS real Chromium desktop 1280px category and offer selection');
 assert.deepEqual(errors,[],'browser JavaScript or network errors');
 console.log('PASS zero page JS errors / zero unexpected outbound network');
 console.log('JM Commercial 003 — real browser QA PASS 3/3, screenshot proofs saved');
}finally{await browser.close();}
