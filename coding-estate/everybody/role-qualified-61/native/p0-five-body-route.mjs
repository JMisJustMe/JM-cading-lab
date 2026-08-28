/*
 * P0 Five-Body Source-Aware Route v1.0
 *
 * Mark-Level Syntax -> Codifying -> Kocodifying -> JMLogic -> J'MP
 *
 * Identity rule: every body parses/lowers/executes through its own specialist API.
 * No body is replaced by a shared pseudo-language. This route is current-native
 * engineering proof only; it makes no historical-original source claim.
 */

import { JMLogic } from '../../../sovereign-ten/direct/language-native.mjs';
import { JMP } from '../../../sovereign-batch-two/direct/kading-jmp-native.mjs';
import { Codifying, Kocodifying } from '../../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';
import { executeMarkLevelSource } from './mark-level-syntax.mjs';

export const P0_ROUTE_BOUNDARY = Object.freeze({
  schema: 'jm.p0-five-body-route/1.0',
  historicalRecoveryClaim: false,
  bodies: ['Mark-Level Syntax', 'Codifying', 'Kocodifying', 'JMLogic', "J’MP"],
  law: 'MESH != MERGE; each body retains its own source grammar, AST/IR and runtime consequence.'
});

export const DEFAULT_P0_SOURCES = Object.freeze({
  markLevel: `
mark UP = "+" => add score 1
mark PROVE = "!" => ding "MARK_STAGE_EXECUTED"
program seed = "++!"
`,
  codifying: `
codex Signal {
  field score: number
  field status: text = "candidate"
  require score >= 1
  emit score
}
`,
  kocodifying: `
cocode Pair {
  left Signal
  right Partner
  bind left.score <-> right.points
  conflict left
  recover rollback
}
`,
  jmLogic: `
rule Approve {
  when score >= 2
  then approved = true
  recover {
    approved = false
  }
}
`,
  jmp: `
jumpmap Outcome {
  from approved
  case true -> "accepted" do nextRoute = "accepted.route"
  case false -> "held" do nextRoute = "hold.route"
}
`
});

export function runP0FiveBodyRoute(options = {}) {
  const sources = { ...DEFAULT_P0_SOURCES, ...(options.sources ?? {}) };
  const initialScore = options.initialScore ?? 0;

  const markLevel = executeMarkLevelSource(sources.markLevel, 'seed', { score: initialScore });

  const codifying = Codifying.execute(sources.codifying, 'Signal', {
    score: markLevel.runtime.state.score
  });

  const kocodifying = Kocodifying.execute(
    sources.kocodifying,
    'Pair',
    codifying.runtime.record,
    options.partner ?? {}
  );

  const jmLogic = JMLogic.execute(sources.jmLogic, {
    score: kocodifying.runtime.right.points
  });

  const jmp = JMP.execute(sources.jmp, 'Outcome', {
    approved: jmLogic.runtime.state.approved
  });

  return {
    schema: 'jm.p0-five-body-route-result/1.0',
    boundary: P0_ROUTE_BOUNDARY,
    stages: {
      markLevel,
      codifying,
      kocodifying,
      jmLogic,
      jmp
    },
    outcome: {
      score: markLevel.runtime.state.score,
      codifiedScore: codifying.runtime.record.score,
      pairedScore: kocodifying.runtime.right.points,
      approved: jmLogic.runtime.state.approved,
      jumpTarget: jmp.runtime.target,
      nextRoute: jmp.runtime.state.nextRoute
    },
    identityTrace: [
      { body: 'Mark-Level Syntax', ast: markLevel.ast.type, ir: markLevel.ir.type, runtime: markLevel.runtime.type },
      { body: 'Codifying', ast: codifying.ast.type, ir: codifying.ir.type, runtime: codifying.runtime.type },
      { body: 'Kocodifying', ast: kocodifying.ast.type, ir: kocodifying.ir.type, runtime: kocodifying.runtime.type },
      { body: 'JMLogic', ast: jmLogic.ast.type, ir: jmLogic.ir.type, runtime: jmLogic.runtime.type },
      { body: "J’MP", ast: jmp.ast.type, ir: jmp.ir.type, runtime: jmp.runtime.type }
    ]
  };
}
