#!/usr/bin/env node
'use strict';
// GitHub-hosted Chromium proof of the actual, unmodified MMZG browser source.
// Local HTTP contact is proven. Public deployment, Android/Fold acceptance NOT proven.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const {chromium} = require(process.env.PLAYWRIGHT_CORE_DIR || 'playwright-core');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.json':'application/json'};
const server = http.createServer((req,res) => {
  let file;
  try { file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname); }
  catch(e) { res.writeHead(400);res.end('bad URL');return; }
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);res.end('not found');return;
  }
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'});
  fs.createReadStream(file).pipe(res);
});
const listen=()=>new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve(server.address().port));
});
const closeServer=()=>new Promise(resolve=>server.close(resolve));
(async()=>{
  const port=await listen(),url='http://127.0.0.1:'+port+'/mmzg-runtime-v0.6/index.html';
  let browser;
  try {
    browser=await chromium.launch({executablePath:chrome,headless:true,
      args:['--no-sandbox','--disable-dev-shm-usage']});
    const context=await browser.newContext({serviceWorkers:'allow'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const first=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(first.status(),200);
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:30000});
    const tested=await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.ready;
      const keys=await caches.keys();
      const cache=await caches.open('jm-mmzg-v06-source-20261026');
      const precached=await cache.keys();
      const m=await (await fetch('./manifest.webmanifest')).json();
      const worker=await fetch('./service_worker.js');
      const runtime=await fetch('./mmzg_runtime_core_v0_6.js');
      return {
        controller:Boolean(navigator.serviceWorker.controller),
        scope:registration.scope,
        cacheNames:keys,
        precachePaths:precached.map(x=>new URL(x.url).pathname),
        manifest:m,workerStatus:worker.status,runtimeStatus:runtime.status,
        selftest:MMZG.selftest().ok,
      };
    });
    assert(tested.controller);
    assert(tested.scope.endsWith('/mmzg-runtime-v0.6/'));
    assert(tested.cacheNames.includes('jm-mmzg-v06-source-20261026'));
    assert.equal(tested.precachePaths.length,3);
    assert.equal(tested.workerStatus,200);
    assert.equal(tested.runtimeStatus,200);
    assert.equal(tested.manifest.short_name,'MMZG v0.6');
    assert(tested.selftest);
    for(let i=0;i<32;i++) {
      const r=await page.evaluate(()=>MMZG.selftest());
      assert(r.ok,'native Chrome MMZG run '+i+' failed');
      assert.equal(r.state.dings,4);
    }
    await context.setOffline(true);
    const offline=await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(offline.status(),200);
    assert((await page.title()).includes('MMZG Runtime v0.6'));
    const recovery=await page.evaluate(()=>({ready:typeof MMZG==='object',
      runtime:MMZG.selftest().ok,controller:Boolean(navigator.serviceWorker.controller)}));
    assert(recovery.ready && recovery.runtime && recovery.controller,
      'offline reload failed to restore actual runtime');
    assert.deepEqual(errors,[],'uncaught errors during browser contact');
    console.log('CHROMIUM LIVE HTTP CONTACT PASS: real installed service-worker, 3 cache assets, 32/32 runtime passes');
    console.log('CHROMIUM OFFLINE RELOAD PASS: original MMZG v0.6 runtime recovered without network');
    console.log('PRODUCTION_SITE=HOLD; FOLD_ANDROID_DEVICE=HOLD; APK=NOT_CLAIMED');
    await context.close();
  } finally {
    if(browser) await browser.close();
    await closeServer();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
