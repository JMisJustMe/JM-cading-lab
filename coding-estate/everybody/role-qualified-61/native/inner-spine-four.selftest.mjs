import assert from 'node:assert/strict';
import { ContactBand, INNER_SPINE_BRIDGES, PunctBody, RouteFrame, StateField, runInnerSpineFour } from './inner-spine-four.mjs';

const PUNCT = `
punctbody Flow {
  op COMMA "," precedence 10 effect continue
  op PROOF ".✓" precedence 30 effect fullstop
  program sample = "alpha,beta.✓"
}
`;
const CONTACT = `
contactband Pressure {
  band low 0..0 route low.route
  band medium 1..2 route medium.route
  band high 3..10 route high.route
}
`;
const STATE = `
statefield ContactState {
  state mode = "idle"
  transition arm when band == "medium" do mode = "armed"
  transition close when completion == "fullstopped" do proved = true
}
`;
const ROUTE = `
routeframe Decision {
  entry start
  step start when mode == "armed" do route accepted.route -> done
  fallback start do route hold.route -> done
  end done
}
`;

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('all four bodies declare forward bridge truth boundary', () => {
  for (const bridge of Object.values(INNER_SPINE_BRIDGES)) {
    assert.equal(bridge.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
    assert.equal(bridge.historicalRecoveryClaim, false);
  }
});
check('PunctBody longest glyph remains one operator token', () => {
  const result = PunctBody.execute(PUNCT, 'sample');
  assert.equal(result.ast.type, 'PunctBodyProgram');
  assert.equal(result.ir.type, 'PunctOperatorIR');
  assert.equal(result.runtime.type, 'PunctRuntimeResult');
  assert.equal(result.ir.tokens.filter(token => token.type === 'PunctToken').length, 2);
  assert.equal(result.ir.tokens.at(-1).glyph, '.✓');
});
check('PunctBody changes route pressure and earns fullstop Ding', () => {
  const result = PunctBody.execute(PUNCT, 'sample');
  assert.equal(result.runtime.state.routePressure, 1);
  assert.equal(result.runtime.state.completion, 'fullstopped');
  assert.equal(result.runtime.ding.state, 'FULLSTOPPED');
});
check('PunctBody rejects duplicate glyph authority', () => {
  assert.throws(() => PunctBody.parse(`punctbody Bad {\nop A "," precedence 1 effect continue\nop B "," precedence 2 effect hold\nprogram x = ","\n}`), error => error.code === 'PUNCT_DUPLICATE_GLYPH');
});
check('ContactBand routes bounded contact', () => {
  const result = ContactBand.execute(CONTACT, 1, 'punctuation-pressure');
  assert.equal(result.runtime.band, 'medium');
  assert.equal(result.runtime.route, 'medium.route');
});
check('ContactBand rejects overlapping ranges', () => {
  assert.throws(() => ContactBand.parse(`contactband Bad {\nband a 0..2 route a\nband b 2..4 route b\n}`), error => error.code === 'CB_OVERLAP');
});
check('StateField contact consequence changes native state', () => {
  const result = StateField.execute(STATE, { band: 'medium', completion: 'fullstopped' });
  assert.equal(result.runtime.state.mode, 'armed');
  assert.equal(result.runtime.state.proved, true);
  assert.deepEqual(result.runtime.applied, ['arm', 'close']);
});
check('RouteFrame chooses guarded route', () => {
  const result = RouteFrame.execute(ROUTE, { mode: 'armed' });
  assert.equal(result.runtime.state.nextRoute, 'accepted.route');
  assert.equal(result.runtime.end, 'done');
});
check('RouteFrame exposes fallback recovery path', () => {
  const result = RouteFrame.execute(ROUTE, { mode: 'idle' });
  assert.equal(result.runtime.state.nextRoute, 'hold.route');
  assert.equal(result.runtime.end, 'done');
});
check('RouteFrame rejects unknown targets', () => {
  assert.throws(() => RouteFrame.parse(`routeframe Bad {\nentry start\nstep start when ready do route x -> missing\nend done\n}`), error => error.code === 'RF_UNKNOWN_TARGET');
});
check('four-body mesh carries punctuation into contact state and route', () => {
  const result = runInnerSpineFour({ punctSource: PUNCT, contactSource: CONTACT, stateSource: STATE, routeSource: ROUTE });
  assert.deepEqual(result.outcome, { completion: 'fullstopped', pressure: 1, band: 'medium', mode: 'armed', nextRoute: 'accepted.route', end: 'done' });
});
check('mesh keeps four AST IR runtime identities distinct', () => {
  const result = runInnerSpineFour({ punctSource: PUNCT, contactSource: CONTACT, stateSource: STATE, routeSource: ROUTE });
  assert.deepEqual(result.identities, [
    ['PunctBody', 'PunctBodyProgram', 'PunctOperatorIR', 'PunctRuntimeResult'],
    ['ContactBand', 'ContactBandProgram', 'ContactBandIR', 'ContactBandRuntimeResult'],
    ['StateField', 'StateFieldProgram', 'StateTransitionIR', 'StateFieldRuntimeResult'],
    ['RouteFrame', 'RouteFrameProgram', 'RouteFrameGraph', 'RouteFrameRuntimeResult']
  ]);
});
check('equal input yields deterministic outcome', () => {
  const a = runInnerSpineFour({ punctSource: PUNCT, contactSource: CONTACT, stateSource: STATE, routeSource: ROUTE });
  const b = runInnerSpineFour({ punctSource: PUNCT, contactSource: CONTACT, stateSource: STATE, routeSource: ROUTE });
  assert.deepEqual(a.outcome, b.outcome);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({ schema: 'jm.inner-spine-four.selftest/1.0', bodies: ['PunctBody','ContactBand','StateField','RouteFrame'], historicalRecoveryClaim: false, passed, failed, checks, status: failed ? 'INNER_SPINE_FOUR_FAIL' : 'INNER_SPINE_FOUR_PASS' }, null, 2));
if (failed) process.exit(1);
