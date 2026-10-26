#!/usr/bin/env node
'use strict';
// JM MMZG v0.6 browser-delivery boundary tests.
// VM exercises real checked-in Service Worker code with mocked host primitives.
// NOT proof of physical device, browser installation, or live deployment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'mmzg-runtime-v0.6');
const source = (name) => fs.readFileSync(path.join(dir, name), 'utf8');
const html = source('index.html');
const coreJs = source('mmzg_runtime_core_v0_6.js');
const workerJs = source('service_worker.js');
const manifest = JSON.parse(source('manifest.webmanifest'));
const core = require(path.join(dir, 'mmzg_runtime_core_v0_6.js'));
const scope = 'https://example.test/JM-cading-lab/mmzg-runtime-v0.6/';
assert.equal(manifest.start_url, './index.html');
assert.equal(manifest.scope, './');
assert.equal(manifest.id, './');
assert.equal(manifest.icons[0].src, '../icon.svg');
assert(fs.existsSync(path.join(root, 'icon.svg')));
assert(html.includes('href="manifest.webmanifest"'));
assert(html.includes("register('./service_worker.js')"));
assert(html.includes('src="mmzg_runtime_core_v0_6.js"'));
assert(!/addEventListener\s*\(\s*['"](?:sync|push)['"]/.test(workerJs));

async function oneOfflineRound(round) {
  const registrations = {};
  const stores = new Map();
  const name = 'jm-mmzg-v06-source-20261026';
  const otherName = 'other-jm-estate-cache';
  stores.set(otherName, new Map([['independent', new Response('preserved')]]));
  stores.set('jm-mmzg-v06-obsolete', new Map([['stale', new Response('old')]]));
  let offline = false;
  let fetched = 0;
  const cacheKey = (req) => typeof req === 'string' ? req : (req instanceof URL ? req.href : req.url);
  const caches = {
    async open(key) {
      if (!stores.has(key)) stores.set(key, new Map());
      const map = stores.get(key);
      return {
        async addAll(files) {
          for (const file of files) {
            const dest = new URL(file, scope);
            const filePath = path.join(dir, file.slice(2));
            assert(fs.existsSync(filePath), 'precache source missing: ' + file);
            map.set(dest.href, new Response(fs.readFileSync(filePath), {status: 200}));
          }
        },
        async match(req) { return map.get(cacheKey(req)); }
      };
    },
    async match(req) {
      for (const store of stores.values()) {
        if (store.has(cacheKey(req))) return store.get(cacheKey(req)).clone();
      }
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = {
    registration: {scope},
    addEventListener(name, fn) { registrations[name] = fn; },
    skipWaiting() { return Promise.resolve(); },
    clients: {claim() { return Promise.resolve(); }}
  };
  async function fetchMock(request) {
    fetched += 1;
    if (offline) throw new TypeError('offline');
    return new Response('NETWORK_' + round, {status: 200});
  }
  vm.runInNewContext(workerJs, {self, caches, URL, Response, fetch: fetchMock, console}, {filename:'service_worker.js'});
  assert.deepEqual(Object.keys(registrations).sort(), ['activate', 'fetch', 'install']);
  async function lifecycle(name) {
    let task = Promise.resolve();
    registrations[name]({waitUntil(p) { task = Promise.resolve(p); }});
    await task;
  }
  await lifecycle('install');
  await lifecycle('activate');
  assert(stores.has(name), 'current cache missing');
  assert(stores.has(otherName), 'foreign cache was deleted');
  assert(!stores.has('jm-mmzg-v06-obsolete'), 'MMZG stale cache was not retired');
  assert.equal(stores.get(name).size, 3, 'only the 3 original files are precached');
  async function intercepted(request) {
    let response;
    registrations.fetch({request, respondWith(p) { response = Promise.resolve(p); }});
    return response ? await response : null;
  }
  const req = (url, method='GET', mode='cors') => ({url, method, mode});
  let x=await intercepted(req(scope+'index.html','POST','navigate'));
  assert.equal(x,null,'POST must not be hijacked');
  x=await intercepted(req('https://elsewhere.test/JM-cading-lab/mmzg-runtime-v0.6/index.html'));
  assert.equal(x,null,'foreign origin must not be hijacked');
  x=await intercepted(req('https://example.test/JM-cading-lab/mmzg-runtime-v0.6-foreign/index.html'));
  assert.equal(x,null,'sibling path must not be hijacked');
  x=await intercepted(req(scope+'manifest.webmanifest'));
  assert.equal((await x.json()).short_name, 'MMZG v0.6');
  x=await intercepted(req(scope+'mmzg_runtime_core_v0_6.js'));
  assert.equal(await x.text(), coreJs);
  assert.equal(fetched,0,'cacheable original assets should hit cache');
  x=await intercepted(req(scope+'index.html?online='+round,'GET','navigate'));
  assert.equal(await x.text(),'NETWORK_'+round,'navigation must be network-first');
  offline=true;
  x=await intercepted(req(scope+'index.html?offline='+round,'GET','navigate'));
  assert.equal(await x.text(),html,'offline navigation should recover original index');
  assert(stores.has(otherName));
  return 10;
}
(async () => {
  let assertions=0;
  for(let i=0;i<32;i++) {
    const result=core.selftest();
    assert(result.ok,'MMZG original runtime selftest failure at run '+i);
    assert.equal(result.rows.length,4);
    assert.equal(result.state.dings,4);
    assert.equal(result.state.executions,4);
    const bad=core.exec('not valid source',core.state());
    assert.equal(bad.ok,false);
    assert.equal(bad.receipt.ding,false,'No Ding must remain No Ding');
    assertions+=await oneOfflineRound(i);
  }
  console.log('MMZG v0.6 32/32 independent source-runtime + scoped worker simulated-contact runs PASS');
  console.log('Offline fallback, network-first, cross-origin, sister-path and foreign cache controls PASS');
  console.log('Assertions exercised in worker simulation: '+assertions+'; real browser/production/device HOLD');
})().catch(err => {console.error(err);process.exitCode=1;});
