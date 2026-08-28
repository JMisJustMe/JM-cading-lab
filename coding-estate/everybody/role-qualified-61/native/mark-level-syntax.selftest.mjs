import assert from 'node:assert/strict';
import {
  MARK_LEVEL_BRIDGE,
  MarkLevelError,
  executeMarkLevelSource,
  lexMarkProgram,
  lowerMarkLevel,
  parseMarkLevel
} from './mark-level-syntax.mjs';

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } });
  }
}

function expectCode(code, fn) {
  assert.throws(fn, error => error instanceof MarkLevelError && error.code === code);
}

const source = `
mark INC = "+" => add counter 1
mark DEC = "-" => add counter -1
mark PATH = ">" => route next.stage
mark PROVE = "!" => ding "MARKS_EXECUTED"
program main = "++->!"
`;

check('bridge declares no historical recovery', () => {
  assert.equal(MARK_LEVEL_BRIDGE.historicalRecoveryClaim, false);
  assert.equal(MARK_LEVEL_BRIDGE.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
});

check('parse produces four first-class executable marks', () => {
  const ast = parseMarkLevel(source);
  assert.equal(ast.marks.length, 4);
  assert.equal(ast.programs.length, 1);
  assert.deepEqual(ast.marks.map(mark => mark.name), ['INC', 'DEC', 'PATH', 'PROVE']);
});

check('lexer preserves mark identity and source order', () => {
  const ast = parseMarkLevel(source);
  const tokens = lexMarkProgram(ast, 'main');
  assert.deepEqual(tokens.tokens.map(token => token.mark), ['INC', 'INC', 'DEC', 'PATH', 'PROVE']);
  assert.deepEqual(tokens.tokens.map(token => token.glyph), ['+', '+', '-', '>', '!']);
});

check('lowering produces body-specific executable mark IR', () => {
  const ast = parseMarkLevel(source);
  const tokens = lexMarkProgram(ast, 'main');
  const ir = lowerMarkLevel(ast, tokens);
  assert.equal(ir.type, 'MLSExecutableMarkIR');
  assert.equal(ir.schema, 'jm.mark-level-syntax.ir/1.0');
  assert.equal(ir.operations.length, 5);
  assert.equal(ir.sourceTruth, 'AUTHORISED_FORWARD_NATIVE_BRIDGE_NOT_HISTORICAL_ORIGINAL');
});

check('runtime executes mark-level state consequence', () => {
  const result = executeMarkLevelSource(source, 'main', { counter: 10 });
  assert.equal(result.runtime.state.counter, 11);
});

check('runtime carries route consequence', () => {
  const result = executeMarkLevelSource(source, 'main');
  assert.equal(result.runtime.routes.length, 1);
  assert.equal(result.runtime.routes[0].route, 'next.stage');
  assert.equal(result.runtime.routes[0].mark, 'PATH');
});

check('runtime carries explicit Ding consequence', () => {
  const result = executeMarkLevelSource(source, 'main');
  assert.equal(result.runtime.dings.length, 1);
  assert.equal(result.runtime.dings[0].value, 'MARKS_EXECUTED');
  assert.equal(result.runtime.dings[0].mark, 'PROVE');
});

check('execution is deterministic', () => {
  const a = executeMarkLevelSource(source, 'main', { counter: 3 });
  const b = executeMarkLevelSource(source, 'main', { counter: 3 });
  assert.deepEqual(a.runtime.state, b.runtime.state);
  assert.deepEqual(a.runtime.routes, b.runtime.routes);
  assert.deepEqual(a.runtime.dings, b.runtime.dings);
  assert.deepEqual(a.runtime.trace, b.runtime.trace);
});

check('duplicate glyph is rejected', () => {
  expectCode('MLS_DUPLICATE_GLYPH', () => parseMarkLevel(`
mark A = "+" => add x 1
mark B = "+" => add x 2
program p = "+"
`));
});

check('unknown glyph in program is rejected at lexical contact', () => {
  const ast = parseMarkLevel(`
mark A = "+" => add x 1
program p = "+?"
`);
  expectCode('MLS_UNKNOWN_GLYPH', () => lexMarkProgram(ast, 'p'));
});

check('unsupported mark action is rejected', () => {
  expectCode('MLS_BAD_ACTION', () => parseMarkLevel(`
mark A = "+" => teleport nowhere
program p = "+"
`));
});

check('non-numeric add target is rejected at runtime', () => {
  expectCode('MLS_ADD_NON_NUMBER', () => executeMarkLevelSource(`
mark A = "+" => add x 1
program p = "+"
`, 'p', { x: 'not-number' }));
});

const passed = checks.filter(check => check.passed).length;
const failed = checks.length - passed;
const receipt = {
  schema: 'jm.mark-level-syntax.forward-native-selftest/1.0',
  body: 'Mark-Level Syntax',
  bridgeStatus: MARK_LEVEL_BRIDGE.status,
  historicalRecoveryClaim: MARK_LEVEL_BRIDGE.historicalRecoveryClaim,
  passed,
  failed,
  checks,
  status: failed === 0 ? 'MARK_LEVEL_FORWARD_NATIVE_PASS' : 'MARK_LEVEL_FORWARD_NATIVE_FAIL'
};

console.log(JSON.stringify(receipt, null, 2));
if (failed) process.exit(1);
