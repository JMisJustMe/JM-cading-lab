/**
 * JM Pages CP11: exact-source, browser-surface, no-network security regressions.
 * Does not launch/drive the owner's browser or imply physical device acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const returnSource = fs.readFileSync(path.join(root, 'estate-return-route.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root,
  'estate-publication/apps-tools-games/apps-tools/jmisjustme-github-pages-v1.15.0/site/assets/app-core.js'), 'utf8');

function anchor(raw) {
  return {
    raw, href: raw, dataset: {},
    hasAttribute() { return false; },
    getAttribute(name) { return name === 'href' ? this.raw : null; },
  };
}
function testReturnRoutes(rawLinks) {
  const anchors = rawLinks.map(anchor);
  const current = 'https://jmisjustme-estate.pages.dev/career/';
  const document = {
    documentElement: { dataset: {} },
    querySelectorAll() { return anchors; },
  };
  const storage = new Map();
  const ctx = {
    URL, location: {
      href: current, pathname: '/career/',
      origin: 'https://jmisjustme-estate.pages.dev'
    }, document,
    sessionStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: k => storage.delete(k),
    },
    history: { replaceState() {}, state: null },
  };
  vm.runInNewContext(returnSource, ctx, { filename: 'estate-return-route.js', timeout: 2000 });
  return anchors;
}

test('known same-origin HTTP(S) link carries career origin', () => {
  const [a] = testReturnRoutes(['/games-beyond/?view=all#part']);
  const u = new URL(a.href);
  assert.equal(u.origin, 'https://jmisjustme-estate.pages.dev');
  assert.equal(u.pathname, '/games-beyond/');
  assert.equal(u.searchParams.get('jm_origin'), 'career');
  assert.equal(u.searchParams.get('view'), 'all');
  assert.equal(u.hash, '#part');
});

test('external HTTPS and HTTP links remain untouched', () => {
  const links = ['https://example.invalid/', 'http://example.invalid/test'];
  const result = testReturnRoutes(links);
  assert.deepEqual(result.map(x => x.href), links);
});

test('non-web schemes are never assigned to links', () => {
  const links = [
    'JaVaScRiPt:alert(1)', 'data:text/html,hi', 'vbscript:msgbox(1)',
    'file:///tmp/file', 'mailto:hello@example.invalid', 'tel:+4400000000'
  ];
  assert.deepEqual(testReturnRoutes(links).map(x => x.href), links);
});

test('fragments and current origin links remain unchanged', () => {
  const links = ['#about', '/career/', 'https://jmisjustme-estate.pages.dev/career/'];
  assert.deepEqual(testReturnRoutes(links).map(x => x.href), links);
});

test('protocol-relative same-origin route is still allowed', () => {
  const [a] = testReturnRoutes(['//jmisjustme-estate.pages.dev/apps/']);
  assert.equal(new URL(a.href).searchParams.get('jm_origin'), 'career');
});

test('v1.15 original six routes dispatch to their exact named office', () => {
  const calls = [];
  const main = { id: 'main', classList: { add() {}, remove() {} } };
  const doc = { querySelector: () => main, querySelectorAll: () => [] };
  const ctx = { document: doc };
  for (const [id, method] of [
    ['home', 'renderHome'], ['estates', 'renderEstates'],
    ['library', 'renderLibrary'], ['connections', 'renderConnections'],
    ['command', 'renderCommand'], ['owner', 'renderOwner']
  ]) {
    ctx[method] = observed => { assert.equal(observed, main); calls.push(method); };
  }
  vm.runInNewContext(appSource, ctx, { filename: 'app-core.js', timeout: 2000 });
  for (const id of ['home', 'estates', 'library', 'connections', 'command', 'owner']) {
    vm.runInNewContext('render(' + JSON.stringify(id) + ')', ctx);
  }
  assert.deepEqual(calls, [
    'renderHome', 'renderEstates', 'renderLibrary',
    'renderConnections', 'renderCommand', 'renderOwner'
  ]);
});

test('v1.15 unexpected and prototype route IDs safely return home', () => {
  const calls = [];
  const main = {};
  const ctx = { document: { querySelector: () => main, querySelectorAll: () => [] } };
  for (const method of [
    'renderHome', 'renderEstates', 'renderLibrary',
    'renderConnections', 'renderCommand', 'renderOwner'
  ]) ctx[method] = () => calls.push(method);
  vm.runInNewContext(appSource, ctx, { filename: 'app-core.js', timeout: 2000 });
  for (const id of ['constructor', '__proto__', 'toString', 'missing', '']) {
    vm.runInNewContext('render(' + JSON.stringify(id) + ')', ctx);
  }
  assert.deepEqual(calls, Array(5).fill('renderHome'));
});
