import assert from 'node:assert/strict';
import { P0_ROUTE_BOUNDARY, runP0FiveBodyRoute } from './p0-five-body-route.mjs';

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } });
  }
}

check('five sovereign identities remain explicit', () => {
  assert.deepEqual(P0_ROUTE_BOUNDARY.bodies, ['Mark-Level Syntax', 'Codifying', 'Kocodifying', 'JMLogic', "J’MP"]);
  assert.equal(new Set(P0_ROUTE_BOUNDARY.bodies).size, 5);
  assert.equal(P0_ROUTE_BOUNDARY.historicalRecoveryClaim, false);
});

check('positive route carries mark consequence across all five bodies', () => {
  const result = runP0FiveBodyRoute();
  assert.deepEqual(result.outcome, {
    score: 2,
    codifiedScore: 2,
    pairedScore: 2,
    approved: true,
    jumpTarget: 'accepted',
    nextRoute: 'accepted.route'
  });
});

check('negative route carries consequence into recovery branch', () => {
  const result = runP0FiveBodyRoute({ initialScore: -1 });
  assert.equal(result.outcome.score, 1);
  assert.equal(result.outcome.pairedScore, 1);
  assert.equal(result.outcome.approved, false);
  assert.equal(result.outcome.jumpTarget, 'held');
  assert.equal(result.outcome.nextRoute, 'hold.route');
});

check('each stage exposes its own AST IR and runtime identity', () => {
  const result = runP0FiveBodyRoute();
  assert.deepEqual(result.identityTrace, [
    { body: 'Mark-Level Syntax', ast: 'MarkLevelModule', ir: 'MLSExecutableMarkIR', runtime: 'MLSRuntimeResult' },
    { body: 'Codifying', ast: 'CodifyingProgram', ir: 'CodexSchemaSet', runtime: 'CodifiedRecord' },
    { body: 'Kocodifying', ast: 'KocodifyingProgram', ir: 'CoCodexBindingSet', runtime: 'CoCodexSync' },
    { body: 'JMLogic', ast: 'JMLProgram', ir: 'JMLDecisionGraphSet', runtime: 'JMLRuntimeResult' },
    { body: "J’MP", ast: 'JMPProgram', ir: 'JMPJumpGraphSet', runtime: 'JMPTransition' }
  ]);
});

check('Codifying receipt remains Codifying receipt', () => {
  const result = runP0FiveBodyRoute();
  assert.equal(result.stages.codifying.runtime.receipt.body, 'Codifying');
});

check('Kocodifying preserves left and right identities', () => {
  const result = runP0FiveBodyRoute({ partner: { label: 'right-side' } });
  assert.equal(result.stages.kocodifying.ast.bindings[0].left, 'Signal');
  assert.equal(result.stages.kocodifying.ast.bindings[0].right, 'Partner');
  assert.equal(result.stages.kocodifying.runtime.right.label, 'right-side');
  assert.equal(result.stages.kocodifying.runtime.right.points, 2);
});

check('JMLogic receipt remains JMLogic receipt', () => {
  const result = runP0FiveBodyRoute();
  assert.equal(result.stages.jmLogic.runtime.receipt.body, 'JMLogic');
});

check("J’MP receipt remains J’MP receipt", () => {
  const result = runP0FiveBodyRoute();
  assert.equal(result.stages.jmp.runtime.receipt.body, "J’MP");
});

check('Mark-Level bridge remains visibly forward-authored inside route', () => {
  const result = runP0FiveBodyRoute();
  assert.equal(result.stages.markLevel.runtime.bridge.historicalRecoveryClaim, false);
  assert.equal(result.stages.markLevel.runtime.bridge.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
});

check('route is deterministic for equal input', () => {
  const a = runP0FiveBodyRoute({ initialScore: 4, partner: { stable: true } });
  const b = runP0FiveBodyRoute({ initialScore: 4, partner: { stable: true } });
  assert.deepEqual(a.outcome, b.outcome);
  assert.deepEqual(a.identityTrace, b.identityTrace);
});

const passed = checks.filter(check => check.passed).length;
const failed = checks.length - passed;
const receipt = {
  schema: 'jm.p0-five-body-route-selftest/1.0',
  bodies: P0_ROUTE_BOUNDARY.bodies,
  historicalRecoveryClaim: P0_ROUTE_BOUNDARY.historicalRecoveryClaim,
  passed,
  failed,
  checks,
  status: failed === 0 ? 'P0_FIVE_BODY_MESH_PASS' : 'P0_FIVE_BODY_MESH_FAIL'
};

console.log(JSON.stringify(receipt, null, 2));
if (failed) process.exit(1);
