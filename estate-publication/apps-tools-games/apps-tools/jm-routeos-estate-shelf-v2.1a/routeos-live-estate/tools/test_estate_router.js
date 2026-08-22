'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const router = require(path.join(ROOT, 'app', 'src', 'main', 'assets', 'estate-router.js'));

function readJson(...parts) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, ...parts), 'utf8'));
}

const meta = readJson('app', 'src', 'main', 'assets', 'estate-registry', 'REGISTRY.json');
const compatibility = readJson('app', 'src', 'main', 'assets', 'estate-registry', 'COMPATIBILITY.json');
const partFiles = meta.parts.map(rel => readJson('app', 'src', 'main', 'assets', 'estate-registry', rel));
const registry = router.combineRegistryParts(meta, partFiles);

const validation = router.validateRegistry(registry);
assert.equal(validation.valid, true, validation.failures.join(', '));
assert.equal(validation.count, 100);
assert.equal(new Set(registry.bodies.map(body => body.id)).size, 100);
assert.equal(registry.defaults.supreme, false);

const gamePlan = router.planEstateRoute(
  'Build a touch game with visual feedback, recovery and proof',
  registry,
  { includeDelivery: true }
);
const gameIds = new Set(gamePlan.route.map(item => item.id));
for (const id of [
  'gameforge', 'game-coding', 'jm-gamecore',
  'seedform-choice-interface', 'pattern-tapping',
  'tracebox', 'dings', 'source-ledger',
  'onebody-delivery', 'zionfolder'
]) {
  assert(gameIds.has(id), `game route missing ${id}`);
}
assert(gamePlan.lawsApplied.includes('identity-preserved'));
assert(gamePlan.lawsApplied.includes('no-supreme-body'));

const compilerPlan = router.planEstateRoute(
  'Compile Cading to JavaScript and package it with proof',
  registry,
  { includeDelivery: true }
);
const compilerIds = new Set(compilerPlan.route.map(item => item.id));
for (const id of ['parser', 'compiler', 'js-emitter', 'tracebox', 'dings', 'source-ledger']) {
  assert(compilerIds.has(id), `compiler route missing ${id}`);
}

const osPlan = router.planEstateRoute(
  'Create an operating system service route with permissions and recovery',
  registry
);
const osIds = new Set(osPlan.route.map(item => item.id));
for (const id of ['routecore-native', 'os-coding', 'codehand-routeos', 'tracebox', 'dings', 'source-ledger']) {
  assert(osIds.has(id), `os route missing ${id}`);
}

const byId = new Map(registry.bodies.map(body => [body.id, body]));
assert.deepEqual(
  router.compatibilityBetween(byId.get('parser'), byId.get('compiler'), compatibility),
  { mode: 'direct', relation: 'tree-to-ir' }
);
assert.equal(
  router.compatibilityBetween(byId.get('glyphplay'), byId.get('source-ledger'), compatibility).mode,
  'adapter-required'
);
assert(compatibility.forbidden.some(rule => rule.code === 'IDENTITY_COLLAPSE'));
assert(compatibility.forbidden.some(rule => rule.code === 'NO_DING'));

const manifest = {
  cartridges: [
    { id: 'five-crowns', aliases: ['routeos-five-crowns'], title: 'Five Crowns', entry: 'play' },
    { id: 'estate-router', aliases: ['sovereign-estate'], title: 'Estate Router', entry: 'router' }
  ]
};
assert.equal(router.validateCartridgeRegistry(manifest).valid, true);
assert.equal(router.resolveCartridge(manifest, 'routeos-five-crowns').id, 'five-crowns');
assert.equal(router.resolveCartridge(manifest, 'sovereign-estate').id, 'estate-router');
assert.equal(router.resolveCartridge(manifest, 'missing'), null);

const found = router.searchBodies(registry, 'creator game visual touch', 10);
assert(found.some(body => body.id === 'glyphplay'));
assert(found.some(body => body.id === 'gameforge'));

console.log('RouteOS Estate Shelf Route router proof: PASS');
console.log(JSON.stringify({
  bodies: validation.count,
  gameRoute: gamePlan.route.length,
  compilerRoute: compilerPlan.route.length,
  osRoute: osPlan.route.length,
  forbiddenLaws: compatibility.forbidden.length
}));
