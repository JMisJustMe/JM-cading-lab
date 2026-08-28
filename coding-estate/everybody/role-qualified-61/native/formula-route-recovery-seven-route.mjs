import { FormeULA } from '../../../sovereign-batch-two/direct/formeula-native.mjs';
import { Buildode, FormulaBornCode, MarkCode, RECORP, RouteCode, TBSString } from './formula-route-recovery-six.mjs';

export const FORMULA_ROUTE_RECOVERY_BOUNDARY = Object.freeze({
  schema: 'jm.formula-route-recovery-seven/1.0',
  bodies: ['FormeULA','Formula-Born Code','Mark-Code','Route-Code','TBS.String','RECORP','Buildode'],
  historicalRecoveryClaim: false,
  law: 'RECOVERED SPECIALIST DONOR + DECLARED DESCENDANTS; MESH != MERGE.'
});

export const FORMULA_ROUTE_RECOVERY_SOURCES = Object.freeze({
  formeula: `
forme Force(base, bonus) {
  bind total = base + bonus
  yield total
}
`,
  formulaBorn: `
formulaborn GateBirth {
  source Force
  threshold 10
  body formula-gate
  pass route accepted.route
  fail route hold.route
  ding "FORMULA_BIRTH_DING"
}
`,
  markCode: `
markcode RoutingMarks {
  semantic GO = "✓" route accepted.route
  semantic HOLD = "?" route hold.route
  program go = "✓"
  program hold = "?"
}
`,
  routeCode: `
routecode Agreement {
  route agreement
  when formulaRoute == markRoute
  pass accepted.route
  fail disagreement.route
  recover recovery.route
}
`,
  tbsString: `
tbsstring ResultCarrier {
  meaning accepted
  route accepted.route
  field formulaRoute from formulaRoute
  field markRoute from markRoute
  field nextRoute from nextRoute
  field score from score
}
`,
  recorp: `
recorp CarrierRecovery {
  RECORP? inspect
  RECORP~ regroup a,b,c
  RECORP! prove
  RECORP.lock
  RECORP→ recovered.route
}
`,
  buildode: `
buildode Release {
  body recovered-result
  purpose "portable recovered route proof"
  mode release
  include source
  include receipt
  require locked
}
`
});

function splitThree(text) {
  const a = Math.floor(text.length / 3);
  const b = Math.floor((text.length * 2) / 3);
  return { a: text.slice(0, a), b: text.slice(a, b), c: text.slice(b) };
}

export function runFormulaRouteRecovery(options = {}) {
  const source = { ...FORMULA_ROUTE_RECOVERY_SOURCES, ...(options.sources ?? {}) };
  const args = { base: options.base ?? 7, bonus: options.bonus ?? 5 };

  const formeula = FormeULA.execute(source.formeula, 'Force', args);
  const formulaBorn = FormulaBornCode.execute(source.formulaBorn, formeula.runtime);
  const markProgram = formulaBorn.runtime.body.passed ? 'go' : 'hold';
  const markCode = MarkCode.execute(source.markCode, markProgram);

  const routeInput = {
    formulaRoute: formulaBorn.runtime.body.route,
    markRoute: markCode.runtime.finalRoute,
    score: formeula.runtime.value
  };
  const routeCode = RouteCode.execute(source.routeCode, routeInput);
  const carrierState = { ...routeInput, nextRoute: routeCode.runtime.state.nextRoute };
  const tbsString = TBSString.execute(source.tbsString, carrierState);
  const fragments = splitThree(tbsString.runtime.encoded);
  const recorp = RECORP.execute(source.recorp, fragments, tbsString.runtime.digest);
  const buildode = Buildode.execute(source.buildode, {
    source: recorp.runtime.recovered,
    receipt: recorp.runtime.ding,
    locked: recorp.runtime.locked
  });

  return {
    type: 'FormulaRouteRecoverySevenResult',
    boundary: FORMULA_ROUTE_RECOVERY_BOUNDARY,
    stages: { formeula, formulaBorn, markCode, routeCode, tbsString, recorp, buildode },
    outcome: {
      score: formeula.runtime.value,
      formulaRoute: formulaBorn.runtime.body.route,
      markRoute: markCode.runtime.finalRoute,
      nextRoute: routeCode.runtime.state.nextRoute,
      carrierDigest: tbsString.runtime.digest,
      recoveredDigest: recorp.runtime.recoveredDigest,
      recoveredLocked: recorp.runtime.locked,
      packageDigest: buildode.runtime.packageDigest
    },
    identities: [
      ['FormeULA', formeula.ast.type, formeula.ir.type, formeula.runtime.type],
      ['Formula-Born Code', formulaBorn.ast.type, formulaBorn.ir.type, formulaBorn.runtime.type],
      ['Mark-Code', markCode.ast.type, markCode.ir.type, markCode.runtime.type],
      ['Route-Code', routeCode.ast.type, routeCode.ir.type, routeCode.runtime.type],
      ['TBS.String', tbsString.ast.type, tbsString.ir.type, tbsString.runtime.type],
      ['RECORP', recorp.ast.type, recorp.ir.type, recorp.runtime.type],
      ['Buildode', buildode.ast.type, buildode.ir.type, buildode.runtime.type]
    ]
  };
}
