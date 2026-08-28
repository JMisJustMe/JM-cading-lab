import assert from 'node:assert/strict';
import { OS_CODING_BRIDGE, executeOSCoding, lowerOSCoding, parseOSCoding } from './os-coding.mjs';

const SOURCE = `
oscoding EstateShell {
  permission storage allow
  permission admin deny
  service save requires storage route storage.save
  service wipe requires admin route admin.wipe
  service ping route system.ping
}
`;

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('bridge is explicitly forward-authored', () => {
  assert.equal(OS_CODING_BRIDGE.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
  assert.equal(OS_CODING_BRIDGE.historicalRecoveryClaim, false);
  assert.equal(OS_CODING_BRIDGE.runtimeDonor, 'RouteScript -> RouteVM -> RouteOS');
});

check('parser preserves permissions and service identities', () => {
  const ast = parseOSCoding(SOURCE);
  assert.equal(ast.type, 'OSCodingProgram');
  assert.equal(ast.permissions.length, 2);
  assert.equal(ast.services.length, 3);
  assert.equal(ast.services[0].route, 'storage.save');
});

check('lowering produces permission-gated service IR', () => {
  const ir = lowerOSCoding(parseOSCoding(SOURCE));
  assert.equal(ir.type, 'OSCodingIR');
  assert.equal(ir.permissionNodes.length, 2);
  assert.equal(ir.serviceNodes.length, 3);
  assert.equal(ir.edges.length, 2);
});

check('allowed service executes through RouteOS donor', () => {
  const result = executeOSCoding(SOURCE, 'save', { document: 'keeper' });
  assert.equal(result.runtime.status, 'executed');
  assert.equal(result.runtime.nextRoute, 'storage.save');
  assert.equal(result.runtime.state.document, 'keeper');
  assert.equal(result.runtime.routeExecution.type, 'RVMExecution');
});

check('denied service does not execute route', () => {
  const result = executeOSCoding(SOURCE, 'wipe', { protected: true });
  assert.equal(result.runtime.status, 'permission-denied');
  assert.equal(result.runtime.nextRoute, null);
  assert.equal(result.runtime.state.protected, true);
});

check('ungated service executes normally', () => {
  const result = executeOSCoding(SOURCE, 'ping');
  assert.equal(result.runtime.status, 'executed');
  assert.equal(result.runtime.nextRoute, 'system.ping');
});

check('unknown permission is rejected before runtime', () => {
  assert.throws(() => parseOSCoding(`oscoding Bad {\nservice save requires missing route storage.save\n}`), error => error.code === 'OSC_UNKNOWN_PERMISSION');
});

check('duplicate services are rejected', () => {
  assert.throws(() => parseOSCoding(`oscoding Bad {\nservice ping route a\nservice ping route b\n}`), error => error.code === 'OSC_DUPLICATE_SERVICE');
});

check('equal source and payload are deterministic', () => {
  const a = executeOSCoding(SOURCE, 'save', { n: 1 });
  const b = executeOSCoding(SOURCE, 'save', { n: 1 });
  assert.deepEqual(a.runtime.state, b.runtime.state);
  assert.equal(a.runtime.nextRoute, b.runtime.nextRoute);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({
  schema: 'jm.os-coding.forward-native-selftest/1.0',
  body: 'OS_CODING',
  bridgeStatus: OS_CODING_BRIDGE.status,
  historicalRecoveryClaim: OS_CODING_BRIDGE.historicalRecoveryClaim,
  passed,
  failed,
  checks,
  status: failed ? 'OS_CODING_FORWARD_NATIVE_FAIL' : 'OS_CODING_FORWARD_NATIVE_PASS'
}, null, 2));
if (failed) process.exit(1);
