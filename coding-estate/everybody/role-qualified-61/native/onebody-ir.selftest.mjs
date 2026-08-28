import assert from 'node:assert/strict';
import { ONEBODY_IR_BRIDGE, createOneBodyIR, executeOneBodyIR, lowerOneBodyToPortable, verifyOneBodyIR } from './onebody-ir.mjs';

const spec = {
  bodyId: 'onebody-proof',
  bodyName: 'OneBody Proof Body',
  sourceAuthority: 'mark-level-syntax',
  nodes: [
    { id: 'source', kind: 'source', value: 'mark-level-syntax' },
    { id: 'state', kind: 'state', value: 'score' },
    { id: 'receipt', kind: 'proof', value: 'ding' }
  ],
  links: [
    { from: 'source', to: 'state', kind: 'meaning-to-state' },
    { from: 'state', to: 'receipt', kind: 'state-to-proof' }
  ],
  operations: [
    { op: 'SET', name: 'score', value: 1 },
    { op: 'ADD', name: 'score', value: 2 },
    { op: 'ROUTE', route: 'onebody.proof' },
    { op: 'TRACE', value: { body: 'onebody-proof' } },
    { op: 'ASSERT', name: 'score', value: 3 },
    { op: 'DING', value: 'ONEBODY_IR_DING' }
  ]
};

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('bridge boundary remains explicit', () => {
  assert.equal(ONEBODY_IR_BRIDGE.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
  assert.equal(ONEBODY_IR_BRIDGE.historicalRecoveryClaim, false);
});
check('neutral nodes links and operations verify', () => {
  const ir = createOneBodyIR(spec);
  const proof = verifyOneBodyIR(ir);
  assert.deepEqual({ nodes: proof.nodes, links: proof.links, operations: proof.operations, dings: proof.dings }, { nodes: 3, links: 2, operations: 6, dings: 1 });
});
check('portable lowering preserves source authority and identity', () => {
  const portable = lowerOneBodyToPortable(createOneBodyIR(spec));
  assert.equal(portable.body.id, 'onebody-proof');
  assert.equal(portable.contracts.sourceAuthority, 'mark-level-syntax');
  assert.equal(portable.contracts.identityPreserved, true);
});
check('execution reaches route state assertion and Ding', () => {
  const result = executeOneBodyIR(createOneBodyIR(spec));
  assert.equal(result.receipt.ok, true);
  assert.equal(result.receipt.state.score, 3);
  assert.equal(result.receipt.routes[0].route, 'onebody.proof');
  assert.equal(result.receipt.dingValue, 'ONEBODY_IR_DING');
});
check('dangling links are rejected', () => {
  const bad = createOneBodyIR({ ...spec, links: [{ from: 'source', to: 'missing' }] });
  assert.throws(() => verifyOneBodyIR(bad), error => error.code === 'OBIR_DANGLING_LINK');
});
check('state mutation before SET is rejected', () => {
  const bad = createOneBodyIR({ ...spec, operations: [{ op: 'ADD', name: 'score', value: 1 }, { op: 'DING', value: 'x' }] });
  assert.throws(() => verifyOneBodyIR(bad), error => error.code === 'OBIR_STATE_BEFORE_SET');
});
check('missing Ding is rejected', () => {
  const bad = createOneBodyIR({ ...spec, operations: [{ op: 'SET', name: 'score', value: 1 }] });
  assert.throws(() => verifyOneBodyIR(bad), error => error.code === 'OBIR_DING_REQUIRED');
});
check('equal specs produce equal IR hashes', () => {
  assert.equal(createOneBodyIR(spec).hash, createOneBodyIR(spec).hash);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({ schema: 'jm.onebody-ir.forward-native-selftest/1.0', body: 'IR / OneBody IR', historicalRecoveryClaim: false, passed, failed, checks, status: failed ? 'ONEBODY_IR_FORWARD_NATIVE_FAIL' : 'ONEBODY_IR_FORWARD_NATIVE_PASS' }, null, 2));
if (failed) process.exit(1);
