import assert from 'node:assert/strict';
import { FormeULA } from '../../../sovereign-batch-two/direct/formeula-native.mjs';
import { Buildode, FormulaBornCode, FORMULA_ROUTE_RECOVERY_BRIDGES, MarkCode, RECORP, RouteCode, TBSString } from './formula-route-recovery-six.mjs';
import { FORMULA_ROUTE_RECOVERY_BOUNDARY, FORMULA_ROUTE_RECOVERY_SOURCES, runFormulaRouteRecovery } from './formula-route-recovery-seven-route.mjs';

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('six new bodies keep declared bridge boundary while FormeULA remains donor', () => {
  for (const bridge of Object.values(FORMULA_ROUTE_RECOVERY_BRIDGES)) {
    assert.equal(bridge.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
    assert.equal(bridge.historicalRecoveryClaim, false);
  }
  assert.equal(FORMULA_ROUTE_RECOVERY_BOUNDARY.bodies[0], 'FormeULA');
});
check('existing FormeULA specialist evaluates dependency formula', () => {
  const result = FormeULA.execute(FORMULA_ROUTE_RECOVERY_SOURCES.formeula, 'Force', { base: 7, bonus: 5 });
  assert.equal(result.runtime.type, 'FormeULAResult');
  assert.equal(result.runtime.value, 12);
});
check('Formula-Born Code births passed executable body from FormeULA result', () => {
  const formula = FormeULA.execute(FORMULA_ROUTE_RECOVERY_SOURCES.formeula, 'Force', { base: 7, bonus: 5 });
  const result = FormulaBornCode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.formulaBorn, formula.runtime);
  assert.equal(result.runtime.body.type, 'FormulaBornExecutableBody');
  assert.equal(result.runtime.body.passed, true);
  assert.equal(result.runtime.body.route, 'accepted.route');
  assert.ok(result.runtime.body.proof);
});
check('Formula-Born Code retains fail route under threshold', () => {
  const formula = FormeULA.execute(FORMULA_ROUTE_RECOVERY_SOURCES.formeula, 'Force', { base: 2, bonus: 1 });
  const result = FormulaBornCode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.formulaBorn, formula.runtime);
  assert.equal(result.runtime.body.passed, false);
  assert.equal(result.runtime.body.route, 'hold.route');
});
check('Mark-Code compiles declared glyph semantics into route effect', () => {
  const result = MarkCode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.markCode, 'go');
  assert.equal(result.ast.type, 'MarkCodeProgram');
  assert.equal(result.ir.type, 'MarkCodeIR');
  assert.equal(result.runtime.type, 'MarkCodeRuntimeResult');
  assert.equal(result.runtime.finalRoute, 'accepted.route');
});
check('Mark-Code rejects undeclared marks', () => {
  assert.throws(() => MarkCode.execute(`markcode Bad {\nsemantic GO = "✓" route ok\nprogram x = "?"\n}`, 'x'), error => error.code === 'MC_UNKNOWN_MARK');
});
check('Route-Code lowers through recovered RouteScript donor and passes agreement', () => {
  const result = RouteCode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.routeCode, { formulaRoute: 'accepted.route', markRoute: 'accepted.route' });
  assert.equal(result.ir.routeAst.type, 'RSProgram');
  assert.equal(result.ir.routeIR.type, 'RSRouteGraphSet');
  assert.equal(result.runtime.status, 'executed');
  assert.equal(result.runtime.state.nextRoute, 'accepted.route');
});
check('Route-Code takes declared fail route on disagreement', () => {
  const result = RouteCode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.routeCode, { formulaRoute: 'hold.route', markRoute: 'accepted.route' });
  assert.equal(result.runtime.state.nextRoute, 'disagreement.route');
});
check('TBS.String preserves named meaning route and selected fields through roundtrip', () => {
  const result = TBSString.execute(FORMULA_ROUTE_RECOVERY_SOURCES.tbsString, { formulaRoute: 'accepted.route', markRoute: 'accepted.route', nextRoute: 'accepted.route', score: 12 });
  assert.equal(result.decoded.meaning, 'accepted');
  assert.equal(result.decoded.route, 'accepted.route');
  assert.equal(result.decoded.fields.score, 12);
  assert.equal(result.decoded.fields.nextRoute, 'accepted.route');
  assert.ok(result.runtime.digest);
});
check('TBS.String rejects a carrier without its identity prefix', () => {
  assert.throws(() => TBSString.decode('{"route":"x"}'), error => error.code === 'TBS_BAD_PREFIX');
});
check('RECORP reconstructs exact carrier and earns lock only after proof', () => {
  const carrier = TBSString.execute(FORMULA_ROUTE_RECOVERY_SOURCES.tbsString, { formulaRoute: 'accepted.route', markRoute: 'accepted.route', nextRoute: 'accepted.route', score: 12 });
  const text = carrier.runtime.encoded; const a = Math.floor(text.length / 3); const b = Math.floor(text.length * 2 / 3);
  const result = RECORP.execute(FORMULA_ROUTE_RECOVERY_SOURCES.recorp, { a: text.slice(0,a), b: text.slice(a,b), c: text.slice(b) }, carrier.runtime.digest);
  assert.equal(result.runtime.recovered, text);
  assert.equal(result.runtime.recoveredDigest, carrier.runtime.digest);
  assert.equal(result.runtime.proved, true);
  assert.equal(result.runtime.locked, true);
  assert.equal(result.runtime.route, 'recovered.route');
});
check('RECORP rejects wrong fragment order/content by digest', () => {
  assert.throws(() => RECORP.execute(FORMULA_ROUTE_RECOVERY_SOURCES.recorp, { a: 'A', b: 'B', c: 'C' }, 'wrong'), error => error.code === 'RECORP_PROOF_MISMATCH');
});
check('Buildode packages only declared included organs', () => {
  const result = Buildode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.buildode, { source: 'body', receipt: { ding: true }, locked: true, extra: 'not-carried' });
  assert.deepEqual(Object.keys(result.runtime.manifest.contents), ['source','receipt']);
  assert.equal(result.runtime.manifest.mode, 'release');
  assert.equal(result.runtime.receipt.status, 'ADAPTED_BUILD_PACKAGE');
});
check('Buildode refuses unlocked body when lock is required', () => {
  assert.throws(() => Buildode.execute(FORMULA_ROUTE_RECOVERY_SOURCES.buildode, { source: 'body', receipt: {}, locked: false }), error => error.code === 'BUILDODE_LOCK_REQUIRED');
});
check('seven-body route reaches accepted package with exact recovered carrier', () => {
  const result = runFormulaRouteRecovery();
  assert.equal(result.outcome.score, 12);
  assert.equal(result.outcome.formulaRoute, 'accepted.route');
  assert.equal(result.outcome.markRoute, 'accepted.route');
  assert.equal(result.outcome.nextRoute, 'accepted.route');
  assert.equal(result.outcome.carrierDigest, result.outcome.recoveredDigest);
  assert.equal(result.outcome.recoveredLocked, true);
  assert.ok(result.outcome.packageDigest);
});
check('seven-body route preserves all AST IR runtime identities', () => {
  const result = runFormulaRouteRecovery();
  assert.deepEqual(result.identities, [
    ['FormeULA','FormeULAProgram','FormeULAGraphSet','FormeULAResult'],
    ['Formula-Born Code','FormulaBornProgram','FormulaBornIR','FormulaBornRuntimeResult'],
    ['Mark-Code','MarkCodeProgram','MarkCodeIR','MarkCodeRuntimeResult'],
    ['Route-Code','RouteCodeProgram','RouteCodeIR','RouteCodeRuntimeResult'],
    ['TBS.String','TBSStringProgram','TBSStringIR','TBSStringRuntimeResult'],
    ['RECORP','RECORPProgram','RECORPIR','RECORPRuntimeResult'],
    ['Buildode','BuildodeProgram','BuildodeIR','BuildodeRuntimeResult']
  ]);
});
check('equal seven-body inputs are deterministic at outcome level', () => {
  assert.deepEqual(runFormulaRouteRecovery().outcome, runFormulaRouteRecovery().outcome);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({ schema: 'jm.formula-route-recovery-seven.selftest/1.0', bodies: FORMULA_ROUTE_RECOVERY_BOUNDARY.bodies, historicalRecoveryClaim: false, passed, failed, checks, status: failed ? 'FORMULA_ROUTE_RECOVERY_SEVEN_FAIL' : 'FORMULA_ROUTE_RECOVERY_SEVEN_PASS' }, null, 2));
if (failed) process.exit(1);
