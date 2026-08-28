import assert from 'node:assert/strict';
import { CODEHAND_BRIDGE, executeCodeHand, parseCodeHand } from './codehand.mjs';
import { executeMarkLevelSource } from './mark-level-syntax.mjs';
import { executeOSCoding } from './os-coding.mjs';

const MARK_SOURCE = `
mark UP = "+" => add score 1
mark PROVE = "!" => ding "MARK_DONE"
program seed = "++!"
`;
const OS_SOURCE = `
oscoding Shell {
  permission storage allow
  service save requires storage route storage.save
}
`;
const CODEHAND_SOURCE = `
codehand Bench {
  arena trial-field
  world estate
  mount marks mark-level-syntax
  mount os os-coding
  run marks seed
  inspect marks runtime.state.score
  run os save
  inspect os runtime.nextRoute
  console "mesh-visible"
  cold-ding "CODEHAND_COLD_DING"
}
`;
const plugins = {
  'mark-level-syntax': ({ entry, input }) => executeMarkLevelSource(MARK_SOURCE, entry, input),
  'os-coding': ({ entry, input }) => executeOSCoding(OS_SOURCE, entry, input)
};

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('CodeHand remains declared forward bridge', () => {
  assert.equal(CODEHAND_BRIDGE.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
  assert.equal(CODEHAND_BRIDGE.historicalRecoveryClaim, false);
});
check('parser preserves hand arena world mounts and commands', () => {
  const ast = parseCodeHand(CODEHAND_SOURCE);
  assert.equal(ast.type, 'CodeHandProgram');
  assert.equal(ast.arena, 'trial-field');
  assert.equal(ast.world, 'estate');
  assert.deepEqual(ast.mounts.map(item => item.bodyId), ['mark-level-syntax', 'os-coding']);
});
check('authoring session runs two bodies without identity collapse', () => {
  const result = executeCodeHand(CODEHAND_SOURCE, plugins, { marks: { score: 0 }, os: { document: 'keeper' } });
  assert.equal(result.runtime.results.marks.runtime.type, 'MLSRuntimeResult');
  assert.equal(result.runtime.results.os.runtime.type, 'OSCodingServiceResult');
  assert.equal(result.runtime.results.marks.runtime.state.score, 2);
  assert.equal(result.runtime.results.os.runtime.nextRoute, 'storage.save');
});
check('inspection writes body-specific values to console', () => {
  const result = executeCodeHand(CODEHAND_SOURCE, plugins, { marks: { score: 0 } });
  assert.equal(result.runtime.console[0].value, 2);
  assert.equal(result.runtime.console[1].value, 'storage.save');
  assert.equal(result.runtime.console[2].message, 'mesh-visible');
});
check('Cold Ding records mounted body identities', () => {
  const result = executeCodeHand(CODEHAND_SOURCE, plugins);
  assert.equal(result.runtime.coldDing.value, 'CODEHAND_COLD_DING');
  assert.deepEqual(result.runtime.coldDing.mountedBodies, [
    { alias: 'marks', bodyId: 'mark-level-syntax' },
    { alias: 'os', bodyId: 'os-coding' }
  ]);
  assert.equal(result.runtime.receipt.coldDing, true);
});
check('unknown aliases are rejected during parsing', () => {
  assert.throws(() => parseCodeHand(`codehand Bad {\narena a\nworld w\nmount x mark-level-syntax\nrun missing seed\ncold-ding "x"\n}`), error => error.code === 'CODEHAND_UNKNOWN_ALIAS');
});
check('missing body plugin is rejected before execution', () => {
  assert.throws(() => executeCodeHand(CODEHAND_SOURCE, {}), error => error.code === 'CODEHAND_PLUGIN_MISSING');
});
check('Cold Ding is compulsory for a closed authoring run', () => {
  assert.throws(() => parseCodeHand(`codehand Bad {\narena a\nworld w\nmount x mark-level-syntax\nrun x seed\n}`), error => error.code === 'CODEHAND_COLD_DING_REQUIRED');
});
check('equal inputs are deterministic at receipt level', () => {
  const a = executeCodeHand(CODEHAND_SOURCE, plugins, { marks: { score: 1 } });
  const b = executeCodeHand(CODEHAND_SOURCE, plugins, { marks: { score: 1 } });
  assert.deepEqual(a.runtime.receipt, b.runtime.receipt);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({ schema: 'jm.codehand.forward-native-selftest/1.0', body: 'CodeHand RouteOS', historicalRecoveryClaim: false, passed, failed, checks, status: failed ? 'CODEHAND_FORWARD_NATIVE_FAIL' : 'CODEHAND_FORWARD_NATIVE_PASS' }, null, 2));
if (failed) process.exit(1);
