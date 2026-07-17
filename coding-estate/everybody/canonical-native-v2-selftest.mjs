import assert from 'node:assert/strict';
import { loadFederatedRegistry } from './registry-loader.mjs';
import { NATIVE_ADAPTERS_V1_1 } from './native-adapters-v1-1.mjs';
import {
  CANONICAL_NATIVE_VERSION,
  FAMILY_DEFINITIONS,
  canonicalNativeAvailability,
  canonicalNativeSpec,
  compileCanonicalNative,
  fixtureCanonicalNativeSource,
  parseCanonicalNative
} from './canonical-native-v2.mjs';

const registry = await loadFederatedRegistry();
assert.equal(registry.bodies.length, 100, 'Canonical native v2 requires the complete 100-body recovered federation.');

const exactIds = Object.keys(NATIVE_ADAPTERS_V1_1).sort();
assert.deepEqual(exactIds, ['cading', 'mmzg', 'quadze', 'speakuals']);

const results = [];
const familyCounts = Object.create(null);
for (const body of registry.bodies) {
  const spec = canonicalNativeSpec(body);
  assert.equal(spec.version, CANONICAL_NATIVE_VERSION);
  assert.equal(spec.body.id, body.id);
  assert.equal(spec.body.law, body.law);
  assert.equal(spec.historicalClaim, false);
  assert.ok(FAMILY_DEFINITIONS[spec.family], body.id);
  assert.ok(spec.commands.includes('LAW'));
  assert.ok(spec.commands.includes('TRACE'));
  assert.ok(spec.commands.includes('DING'));
  assert.ok(spec.familyCommands.length >= 4);
  assert.ok(spec.requiredAny.length >= 1);
  assert.ok(Object.keys(spec.capabilityCommands).length >= 1, `${body.id} has no canonical capability commands.`);

  const source = fixtureCanonicalNativeSource(body);
  const compiled = compileCanonicalNative(body.id, source, registry);
  assert.equal(compiled.ok, true, JSON.stringify(compiled, null, 2));
  assert.equal(compiled.status, 'CANONICAL_NATIVE_V2_TO_PORTABLE_RUNTIME_PASS');
  assert.equal(compiled.roundTrip, true);
  assert.equal(compiled.parsed.ast.body.id, body.id);
  assert.equal(compiled.parsed.ast.family, spec.family);
  assert.equal(compiled.parsed.ast.historicalClaim, false);
  assert.equal(compiled.parsed.ast.sourceMap.length, compiled.parsed.ast.statements.length);
  assert.equal(compiled.compiled.receipt.ok, true);
  assert.equal(compiled.compiled.receipt.ding, true);
  assert.equal(compiled.compiled.receipt.body.id, body.id);
  assert.equal(compiled.compiled.receipt.dingValue.status, 'CANONICAL_NATIVE_V2_EXECUTED');

  const availability = canonicalNativeAvailability(body, exactIds);
  assert.equal(availability.currentCanonicalNative, 'COMPLETE_V2');
  assert.equal(availability.currentDegree, 10);
  assert.equal(availability.historicalClaim, false);

  const wrongBodySource = source.replace(`NATIVE ${body.id} `, 'NATIVE wrong-body ');
  const wrongBody = parseCanonicalNative(body.id, wrongBodySource, registry);
  assert.equal(wrongBody.ok, false);
  assert.ok(wrongBody.diagnostics.some(item => item.code === 'BODY_ID_MISMATCH'));

  const unknownCommandSource = source.replace(/\n([A-Z][A-Z0-9_]*)\s+/, '\nNOT_IN_SPEC ');
  const unknownCommand = parseCanonicalNative(body.id, unknownCommandSource, registry);
  assert.equal(unknownCommand.ok, false);
  assert.ok(unknownCommand.diagnostics.some(item => item.code === 'COMMAND_NOT_IN_BODY_SPEC'));

  const noDingSource = source.split('\n').filter(line => !line.startsWith('DING ')).join('\n');
  const noDing = parseCanonicalNative(body.id, noDingSource, registry);
  assert.equal(noDing.ok, false);
  assert.ok(noDing.diagnostics.some(item => item.code === 'ONE_DING_REQUIRED'));

  familyCounts[spec.family] = (familyCounts[spec.family] ?? 0) + 1;
  results.push({
    id: body.id,
    family: spec.family,
    commands: spec.commands.length,
    capabilityCommands: Object.keys(spec.capabilityCommands).length,
    roundTrip: compiled.roundTrip,
    ding: compiled.compiled.receipt.ding,
    historicalNative: availability.historicalNative
  });
}

assert.equal(results.length, 100);
assert.equal(results.filter(result => result.ding).length, 100);
assert.equal(results.filter(result => result.roundTrip).length, 100);
assert.ok(Object.keys(familyCounts).length >= 10, 'Canonical completion must preserve multiple native grammar families.');

console.log(JSON.stringify({
  suite: 'JM EveryBody canonical native v2 conformance',
  passed: true,
  registeredBodies: registry.bodies.length,
  currentCanonicalNativeComplete: results.length,
  exactHistoricalAdaptersPreserved: exactIds,
  grammarFamilies: familyCounts,
  negativeTestsPerBody: 3,
  historicalClaimFabricated: false
}, null, 2));
