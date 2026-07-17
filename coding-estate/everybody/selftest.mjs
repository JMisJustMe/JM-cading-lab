import assert from 'node:assert/strict';
import { EverybodyMaximiser } from './everybody-maximiser.mjs';
import { loadFederatedRegistry } from './registry-loader.mjs';

const registry = await loadFederatedRegistry();
const maximiser = new EverybodyMaximiser(registry);
const audit = maximiser.audit();

assert.equal(audit.ok, true);
assert.equal(audit.status, 'ALPHA_NOT_CROWN');
assert.equal(audit.noSupremeBody, true);
assert.equal(audit.finalCountClaimed, false);
assert.ok(audit.recoveredCount >= 76);
assert.ok(audit.bodyAudits.every(body => body.implementationLane.length === 15));

for (const requiredBody of [
  'cading', 'mmzg', 'jmlogic', 'flowtalk', 'mark-level-syntax', 'speakuals',
  'tokenbody', 'punctbody', 'routeframe', 'statefield', 'contactband',
  'theoc', 'cadenvm', 'routevm', 'jm-game-native-core', 'game-coding',
  'hybrid-auto-compiler', 'bugg-error-library', 'coding-body-house'
]) {
  assert.ok(maximiser.getBody(requiredBody), `Missing recovered body: ${requiredBody}`);
}

const plan = maximiser.resolve({
  goal: 'Compile a JM-native mobile game body with visible state, trace, recovery and deterministic native runtime.',
  capabilities: ['game', 'runtime', 'parser', 'IR', 'trace', 'recovery', 'compatibility'],
  targets: ['javascript', 'cpp_lineage', 'rust', 'wasm'],
  constraints: ['Android', 'identity preservation', 'no supreme body', 'round-trip receipts']
});

assert.equal(plan.status, 'MAXIMISATION_PLAN_NOT_CROWN');
assert.ok(plan.leadBody.id);
assert.equal(plan.leadBody.authorityBoundary, 'lead for this request only; never supreme over the estate');
assert.ok(plan.supportingBodies.length > 0);
assert.equal(plan.receipt.ding, true);
assert.equal(plan.receipt.claimBoundary, 'This receipt proves resolution and planning only, not compiler/runtime/target parity.');
assert.ok(plan.invariants.includes('target emitter cannot silently govern source'));
assert.ok(plan.invariants.includes('compatibility requires conformance and round-trip receipts'));

const result = {
  suite: 'JM EveryBody v0.1-alpha federated self-test',
  passed: true,
  recoveredBodies: audit.recoveredCount,
  finalCountClaimed: false,
  leadBodyForFixture: plan.leadBody.id,
  supportingBodiesForFixture: plan.supportingBodies.map(body => body.id),
  unresolvedCapabilities: plan.unresolvedCapabilities,
  receipt: plan.receipt
};

console.log(JSON.stringify(result, null, 2));
