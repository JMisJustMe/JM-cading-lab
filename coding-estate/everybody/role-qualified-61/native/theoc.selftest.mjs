import assert from 'node:assert/strict';
import { THEOC_BRIDGE, compileTheoC, lowerTheoC, parseTheoC, verifyTheoCIR } from './theoc.mjs';

const CONTRACT = `
theoc ProofContract {
  source mark-level-syntax
  require identity
  require source-authority
  require trace
  require ding
  require lossless
  target javascript
  target cpp
}
`;
const SPEC = {
  bodyId: 'theoc-proof',
  bodyName: 'TheoC Proof Body',
  sourceAuthority: 'mark-level-syntax',
  nodes: [{ id: 'meaning', kind: 'source', value: 'mark' }, { id: 'proof', kind: 'receipt', value: 'ding' }],
  links: [{ from: 'meaning', to: 'proof', kind: 'preserves' }],
  operations: [
    { op: 'SET', name: 'score', value: 2 },
    { op: 'TRACE', value: { source: 'mark-level-syntax' } },
    { op: 'ASSERT', name: 'score', value: 2 },
    { op: 'DING', value: 'THEOC_DING' }
  ]
};

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('TheoC bridge remains declared and non-historical', () => {
  assert.equal(THEOC_BRIDGE.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
  assert.equal(THEOC_BRIDGE.historicalRecoveryClaim, false);
});
check('contract parser preserves source requirements and targets', () => {
  const contract = parseTheoC(CONTRACT);
  assert.equal(contract.sourceBody, 'mark-level-syntax');
  assert.deepEqual(contract.targets, ['javascript', 'cpp']);
  assert.equal(contract.requirements.length, 5);
});
check('TheoC IR verifies OneBody identity/source/trace/ding/lossless contracts', () => {
  const ir = lowerTheoC(parseTheoC(CONTRACT), SPEC);
  const proof = verifyTheoCIR(ir, 'javascript');
  assert.equal(proof.ok, true);
  assert.equal(proof.sourceBody, 'mark-level-syntax');
});
check('JavaScript backend is emitted through existing compiler core', () => {
  const result = compileTheoC(CONTRACT, SPEC, 'javascript');
  assert.equal(result.target, 'javascript');
  assert.match(result.output, /executePortable/);
});
check('C++ backend is emitted through existing compiler core', () => {
  const result = compileTheoC(CONTRACT, SPEC, 'cpp');
  assert.equal(result.target, 'cpp');
  assert.match(result.output, /inline bool receipt_theoc_proof/);
});
check('contract blocks unauthorised targets', () => {
  const ir = lowerTheoC(parseTheoC(CONTRACT), SPEC);
  assert.throws(() => verifyTheoCIR(ir, 'rust'), error => error.code === 'THEOC_TARGET_NOT_ALLOWED');
});
check('source authority mismatch is rejected', () => {
  assert.throws(() => lowerTheoC(parseTheoC(CONTRACT), { ...SPEC, sourceAuthority: 'other-body' }), error => error.code === 'THEOC_SOURCE_MISMATCH');
});
check('equal compilation inputs are deterministic', () => {
  const a = compileTheoC(CONTRACT, SPEC, 'javascript');
  const b = compileTheoC(CONTRACT, SPEC, 'javascript');
  assert.equal(a.ir.oneBodyHash, b.ir.oneBodyHash);
  assert.equal(a.output, b.output);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({ schema: 'jm.theoc.forward-native-selftest/1.0', body: 'TheoC Contract + TheoC IR', historicalRecoveryClaim: false, passed, failed, checks, status: failed ? 'THEOC_FORWARD_NATIVE_FAIL' : 'THEOC_FORWARD_NATIVE_PASS' }, null, 2));
if (failed) process.exit(1);
