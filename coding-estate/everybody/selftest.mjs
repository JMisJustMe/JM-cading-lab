import assert from 'node:assert/strict';
import { createMaximiser } from './everybody-maximiser.mjs';

const maximiser = await createMaximiser('./body-registry.json');
const audit = maximiser.audit();

assert.equal(audit.ok, true);
assert.equal(audit.status, 'ALPHA_NOT_CROWN');
assert.equal(audit.noSupremeBody, true);
assert.equal(audit.finalCountClaimed, false);
assert.ok(audit.recoveredCount >= 38);
assert.ok(audit.bodyAudits.every(body => body.implementationLane.length === 15));
assert.ok(maximiser.getBody('cading'));
assert.ok(maximiser.getBody('mmzg'));
assert.ok(maximiser.getBody('theoc'));
assert.ok(maximiser.getBody('cadenvm'));
assert.ok(maximiser.getBody('jm-game-native-core'));

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
  suite: 'JM EveryBody v0.1-alpha self-test',
  passed: true,
  recoveredBodies: audit.recoveredCount,
  leadBodyForFixture: plan.leadBody.id,
  supportingBodiesForFixture: plan.supportingBodies.map(body => body.id),
  unresolvedCapabilities: plan.unresolvedCapabilities,
  receipt: plan.receipt
};

console.log(JSON.stringify(result, null, 2));
