import assert from 'node:assert/strict';
import { loadFederatedRegistry } from './registry-loader.mjs';
import { compileNative, NATIVE_ADAPTERS } from './native-adapters.mjs';

const registry = await loadFederatedRegistry();

const fixtures = {
  cading: 'Zzza, za-zuh, zuzz = zeze.nwona.✓',
  mmzg: 'ZG[BOND] @ CH3 :: M−[stack:fold:governance] + I[fix] ⟐ F[connector-pass] → JM?[audit-pressure] → PΔ[tighten:body] → T✓[receipt:proof] → PALM[current-best]',
  speakuals: 'source route = native landing.✓'
};

const receipts = [];
for (const [bodyId, source] of Object.entries(fixtures)) {
  const result = compileNative(bodyId, source, registry);
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.status, 'NATIVE_TO_PORTABLE_TO_RUNTIME_PASS');
  assert.equal(result.compiled.receipt.ding, true);
  assert.equal(result.compiled.receipt.body.id, bodyId);
  assert.equal(result.compiled.receipt.claimBoundary, 'Portable backend/runtime parity only; native grammar parity is reported separately.');
  receipts.push({ bodyId, adapterVersion: result.adapterVersion, irHash: result.compiled.lowered.ir.hash, ding: result.compiled.receipt.ding });
}

const refused = compileNative('flowtalk', 'invented grammar must not pass', registry);
assert.equal(refused.ok, false);
assert.equal(refused.status, 'NATIVE_ADAPTER_NOT_RECOVERED');
assert.equal(refused.diagnostics[0].code, 'NATIVE_ADAPTER_NOT_RECOVERED');

const invalidCading = compileNative('cading', 'Zzza, za-zuh.', registry);
assert.equal(invalidCading.ok, false);
assert.equal(invalidCading.status, 'NATIVE_PARSE_FAILED');

const invalidMmzg = compileNative('mmzg', 'ZG[GO] @ CH9 :: broken', registry);
assert.equal(invalidMmzg.ok, false);
assert.equal(invalidMmzg.status, 'NATIVE_PARSE_FAILED');

console.log(JSON.stringify({
  suite: 'JM EveryBody native adapter conformance',
  passed: true,
  exactAdapters: Object.keys(NATIVE_ADAPTERS),
  receipts,
  refusalBoundary: refused.status
}, null, 2));
