import assert from 'node:assert/strict';
import { loadFederatedRegistry } from './registry-loader.mjs';
import { loadRecovered53Profiles } from './profile-evidence.mjs';
import { compileNativeV1_1, NATIVE_ADAPTERS_V1_1 } from './native-adapters-v1-1.mjs';
import { runEqualisation } from './maximal-equaliser.mjs';

const registry = await loadFederatedRegistry();
assert.equal(registry.bodies.length, 100, 'The v1.1 recovered federation must contain 100 separately classified entries.');

const profiles = await loadRecovered53Profiles();
assert.equal(profiles.profiles.length, 53);
assert.equal(new Set(profiles.profiles.map(profile => profile.id)).size, 53);
for (const profile of profiles.profiles) {
  assert.ok(profile.defaultProgram.trim());
  assert.ok(Object.keys(profile.operations).length > 0);
}

const quadze = compileNativeV1_1('quadze', "# Mini-QUADZE Tier-0 runtime\nbody Alpha {\n  local_time: 0\n  membrane: soft(ε = 2)\n  routes: [Pulse, Cross]\n}\nbody Beta {\n  local_time: 0\n  membrane: porous(ε = 3)\n  routes: [Pulse, Recovery]\n}\nroute Pulse { cost: 1 apply: increment_state }\nroute Cross { cost: 2 apply: cross_boundary }\nroute Recovery { cost: 1 apply: restore_state }\nkeeper Gate1 { rule: allow_if Alpha.local_time > 3 }\nglyph Echo { window: [5..12] latency: 1 hysteresis: 3 }\npolicy rejected: dingandreceipt\n", registry);
assert.equal(quadze.ok, true, JSON.stringify(quadze, null, 2));
assert.equal(quadze.compiled.receipt.ding, true);
assert.equal(quadze.parsed.ast.bodies.length, 2);
assert.equal(quadze.parsed.ast.routes.length, 3);

const report = await runEqualisation({ write: true });
assert.equal(report.summary.registered, 100);
assert.equal(report.summary.portableComplete, 100);
assert.equal(report.summary.recoveredProfiles, 53);
assert.equal(report.summary.profileEvidenceBodies, 57);
assert.equal(report.summary.exactNativeAdapters, 4);
assert.deepEqual(Object.keys(NATIVE_ADAPTERS_V1_1).sort(), ['cading','mmzg','quadze','speakuals']);

const strongest = report.bodies.find(body => body.id === 'quadze');
assert.equal(strongest.degree, 10);
assert.equal(strongest.nativeState, 'EXACT_RECOVERED_SUBSET_EXECUTABLE');

const previouslyThin = report.bodies.find(body => body.id === 'root-method');
assert.equal(previouslyThin.axes.parserIrRuntime, 10);
assert.equal(previouslyThin.axes.targetParity, 10);
assert.equal(previouslyThin.axes.traceReceipt, 10);
assert.equal(previouslyThin.portableReceipt, 'PORTABLE_BODY_EXECUTED');
assert.equal(previouslyThin.nativeState, 'HISTORICAL_NATIVE_SOURCE_NOT_RECOVERED');

assert.equal(report.summary.supremeBody, null);
assert.equal(report.summary.finalHistoricalCountClaimed, false);

console.log(JSON.stringify({
  suite: 'JM EveryBody v1.1 maximal equalisation',
  passed: true,
  registered: report.summary.registered,
  portableComplete: report.summary.portableComplete,
  recoveredProfiles: report.summary.recoveredProfiles,
  profileEvidenceBodies: report.summary.profileEvidenceBodies,
  exactNativeAdapters: report.summary.exactNativeBodyIds,
  maximalProofLeader: strongest.id,
  weakestPortableRaised: previouslyThin.id,
  historicalTruthPreserved: previouslyThin.nativeState,
  supremeBody: report.summary.supremeBody
}, null, 2));
