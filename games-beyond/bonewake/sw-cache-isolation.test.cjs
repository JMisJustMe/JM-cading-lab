'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
async function activation(keys) {
  const listeners = {}, deleted = [];
  const caches = {
    keys: async () => keys,
    delete: async name => { deleted.push(name); return true; }
  };
  const self = {
    addEventListener: (type, handler) => { listeners[type] = handler; },
    clients: { claim: async () => true }
  };
  vm.runInNewContext(source, { self, caches, location: { origin: 'https://estate.example' }, URL, fetch: async () => {} });
  assert.equal(typeof listeners.activate, 'function');
  let completed;
  listeners.activate({ waitUntil(promise) { completed = promise; } });
  await completed;
  return deleted;
}
(async () => {
  assert.deepEqual(await activation([
    'jm-bonewake-v1-11', 'jm-bonewake-v1-12', 'jm-puka-v17a', 'jm-fourfold-v31', 'other-app'
  ]), ['jm-bonewake-v1-11'], 'Only an obsolete Bonewake cache may be retired');
  assert.deepEqual(await activation(['jm-puka-v17a', 'jm-fourfold-v31']), [], 'Other JM bodies retain offline caches');
  assert.deepEqual(await activation(['jm-bonewake-v1-12']), [], 'Current Bonewake cache is preserved');
  console.log('PASS Bonewake service-worker cache isolation (3 activation cases)');
})().catch(error => { console.error(error); process.exitCode = 1; });
