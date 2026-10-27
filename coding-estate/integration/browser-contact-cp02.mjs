// JM Sovereign Estate Integration CP02 — actual Chromium phone/tablet/desktop contact.
// This tests the existing browser surface and its real repo registry/ES modules.
// Browser emulation is not physical Android or owner-device proof.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'qa', 'sovereign-estate-integration-cp02');
await mkdir(output, { recursive: true });
const contentType = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const path = resolve(root, '.' + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const bytes = await readFile(path);
    res.writeHead(200, { 'content-type': contentType[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(bytes);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const profiles = [
  {name:'fold-phone-touch', width:390, height:844, touch:true},
  {name:'tablet-touch', width:820, height:1180, touch:true},
  {name:'desktop-keyboard', width:1440, height:900, touch:false}
];
const receipt = {
  schema:'jm.sovereign-estate.browser-contact/CP02',
  testedSurface:'coding-estate/integration/00_OPEN_FIRST.html',
  engine:'Chromium / real HTTP / repo source / ES modules',
  boundary:'Emulated viewports and browser events, not physical owner-device contact or all-Estate interoperability',
  profiles:[],
  passed:0,
  failed:0
};
let browser;
try {
  browser = await chromium.launch({ headless:true });
  for (const profile of profiles) {
    const record = {profile:profile.name, width:profile.width, height:profile.height, checks:[], pageErrors:[]};
    receipt.profiles.push(record);
    const context = await browser.newContext({
      viewport:{width:profile.width, height:profile.height},
      hasTouch:profile.touch,
      isMobile:profile.width === 390,
      deviceScaleFactor:1
    });
    const page = await context.newPage();
    page.on('pageerror', e => record.pageErrors.push(e.message));
    const check = (label, valid) => {
      record.checks.push({ label, passed:!!valid });
      if (!valid) throw new Error(profile.name + ': ' + label);
    };
    try {
      const response = await page.goto(base+'/coding-estate/integration/00_OPEN_FIRST.html',{waitUntil:'networkidle',timeout:45000});
      check('HTTP-200-original-surface',response.status()===200);
      await page.waitForFunction(() => document.querySelectorAll('#bodyGrid .body-card').length === 100, {timeout:15000});
      check('100-sovereign-bodies-render',await page.locator('#bodyGrid .body-card').count()===100);
      check('42-direct-links-render',await page.locator('#compatGrid .compat-card[data-from]').count()===42);
      check('five-forbidden-laws-visible',await page.locator('#compatGrid .compat-card.privacy').count()===5);
      const initialRoute=await page.locator('#routeOutput').innerText();
      check('default-game-with-source-trace-proof',/GameForge|Game-CODING/i.test(initialRoute) && /TraceBox/i.test(initialRoute) && /Dings/i.test(initialRoute) && /Source Ledger/i.test(initialRoute));

      const go=page.getByRole('button',{name:'Compatibility',exact:true});
      if(profile.touch) await go.tap(); else await go.click();
      const comp=page.locator('#compatSearch');
      await comp.fill('CombiBind');
      check('actual-CombiBind-to-JMQGraft-route',await page.locator('#compatGrid .compat-card[data-from="combibind"][data-to="jmqgraft"]').count()===1);
      check('unmatched-links-hidden',await page.locator('#compatGrid .compat-card[data-from]').count()===1);
      check('contract-not-device-proof-labelled',(await page.locator('#compatSummary').innerText()).includes('Runtime/device proof is a separate gate'));

      await page.screenshot({path:resolve(output,profile.name+'-combind-route.png')});
      await comp.fill('no-such-JM-route-this-is-a-negative-test');
      check('negative-search-empty',await page.locator('#compatGrid .compat-card').count()===0);
      const clear=page.locator('#compatClear');
      if(profile.touch) await clear.tap(); else await clear.click();
      check('clear-restores-all-links',await page.locator('#compatGrid .compat-card[data-from]').count()===42);

      const bodiesTab=page.getByRole('button',{name:'Bodies',exact:true});
      if(profile.touch) await bodiesTab.tap(); else await bodiesTab.click();
      const bodySearch=page.locator('#bodySearch');
      await bodySearch.fill('CombiBind');
      check('body-search-finds-one-distinct-identity',await page.locator('#bodyGrid .body-card').count()===1 && /CombiBind/.test(await page.locator('#bodyGrid .body-card').innerText()));
      if(profile.touch) await page.locator('#clearSearch').tap(); else await page.locator('#clearSearch').click();
      check('body-reset-restores-one-hundred',await page.locator('#bodyGrid .body-card').count()===100);

      const askTab=page.getByRole('button',{name:'Ask Estate',exact:true});
      if(profile.touch) await askTab.tap(); else await askTab.click();
      await page.locator('#askInput').fill('parse and compile cading to javascript with source ledger and receipt');
      if(profile.touch) await page.locator('#routeBtn').tap(); else await page.locator('#routeBtn').click();
      const compiledRoute=await page.locator('#routeOutput').innerText();
      check('live-parser-to-compiler-route',/Parser/i.test(compiledRoute) && /Compiler/i.test(compiledRoute) && /TraceBox/i.test(compiledRoute));

      const geometry=await page.evaluate(()=>({
        noRootOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,
        pageWidth:document.documentElement.clientWidth,
        appHeight:document.querySelector('.app').getBoundingClientRect().height,
        screenHeight:window.innerHeight
      }));
      record.geometry=geometry;
      check('viewport-bound-no-horizontal-page-crop',geometry.noRootOverflow && geometry.appHeight<=geometry.screenHeight+2);

      await page.reload({waitUntil:'networkidle',timeout:45000});
      await page.waitForFunction(()=>document.querySelectorAll('#bodyGrid .body-card').length===100);
      check('reload-recovers-registry-and-links',await page.locator('#compatGrid .compat-card[data-from]').count()===42);
      check('browser-page-errors-zero',record.pageErrors.length===0);
    } catch(error) {
      record.failure={message:error.message, pageErrors:record.pageErrors};
      try { await page.screenshot({path:resolve(output,profile.name+'-failure.png')}); } catch {}
    } finally {
      await context.close();
    }
  }
} catch(error) {
  receipt.startupFailure=error.message;
} finally {
  if(browser) await browser.close();
  await new Promise(r => server.close(r));
  receipt.passed=receipt.profiles.flatMap(p=>p.checks).filter(c=>c.passed).length;
  receipt.failed=receipt.profiles.flatMap(p=>p.checks).filter(c=>!c.passed).length + receipt.profiles.filter(p=>p.failure).length + (receipt.startupFailure?1:0);
  await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({
    schema:receipt.schema,
    passed:receipt.passed,failed:receipt.failed,
    profileStates:receipt.profiles.map(p=>({name:p.profile,checks:p.checks.length,failure:p.failure||null})),
    startupFailure:receipt.startupFailure||null
  },null,2));
}
if(receipt.failed) process.exitCode=1;