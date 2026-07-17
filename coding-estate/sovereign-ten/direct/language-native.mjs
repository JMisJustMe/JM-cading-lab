import { NativeError, Trace, applyAction, argsOf, blocks, digest, evaluate, need, parseAction, parseExpr, setPath, stable, valueOf } from './native-core.mjs';

function entriesOf(body) {
  const entries = {};
  for (const line of body.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
    if (match) entries[match[1]] = valueOf(match[2]);
  }
  return entries;
}

function intentOf(name, raw = '') {
  return { type: 'FTIntent', name, slots: argsOf(raw).named };
}

export const FlowTalk = {
  parse(source) {
    need(typeof source === 'string' && source.trim(), 'FT_EMPTY_SOURCE', 'FlowTalk source is empty.');
    const contextMatch = source.match(/\bcontext\s*\{([\s\S]*?)\}/);
    const utterance = source.match(/\butterance\s+("(?:\\.|[^"\\])*")/);
    need(utterance, 'FT_MISSING_UTTERANCE', 'FlowTalk requires an utterance declaration.');
    const intents = [...source.matchAll(/\bas\s+intent\s+([A-Za-z_][\w.-]*)\s*\(([^)]*)\)/g)].map(match => intentOf(match[1], match[2]));
    need(intents.length > 0, 'FT_MISSING_INTENT', 'FlowTalk requires at least one primary intent.');
    const alternatives = [...source.matchAll(/\balt\s*:\s*intent\s+([A-Za-z_][\w.-]*)\s*\(([^)]*)\)/g)].map(match => intentOf(match[1], match[2]));
    const priorities = [...source.matchAll(/^\s*([A-Za-z_][\w.-]*)\s*<\s*([A-Za-z_][\w.-]*)\s*$/gm)].map(match => [match[1], match[2]]);
    const responseMatch = source.match(/\brespond\s*\{([\s\S]*?)\}/);
    const actions = [];
    if (responseMatch) {
      for (const raw of responseMatch[1].split(/\r?\n/).map(line => line.trim()).filter(Boolean)) actions.push(parseAction(raw));
    }
    return {
      type: 'FTProgram',
      context: { type: 'FTContext', entries: contextMatch ? entriesOf(contextMatch[1]) : {} },
      meanings: [{ type: 'FTMeaning', utterance: valueOf(utterance[1]), intents, branch: { alternatives }, ambiguity: { priorities } }],
      responses: [{ type: 'FTResponse', actions }]
    };
  },

  lower(program, context = {}) {
    need(program?.type === 'FTProgram', 'FT_INVALID_AST', 'FlowTalk lowering requires FTProgram.');
    return program.meanings.map((meaning, meaningIndex) => {
      const all = [...meaning.intents, ...meaning.branch.alternatives];
      const nodes = all.map((intent, index) => ({ id: `ft:${meaningIndex}:${index}:${intent.name}`, intent }));
      const byName = new Map(nodes.map(node => [node.intent.name, node]));
      const edges = [];
      for (const alternative of meaning.branch.alternatives) {
        edges.push({ from: nodes[0].id, to: byName.get(alternative.name).id, kind: 'branch', weight: 0 });
      }
      meaning.ambiguity.priorities.forEach(([before, after], index) => {
        need(byName.has(before) && byName.has(after), 'FT_UNKNOWN_PRIORITY_INTENT', `Unknown FlowTalk priority ${before} < ${after}.`);
        edges.push({ from: byName.get(before).id, to: byName.get(after).id, kind: 'ambiguity', weight: index + 1 });
      });
      for (const key of Object.keys({ ...program.context.entries, ...context }).sort()) {
        for (const node of nodes) edges.push({ from: `context:${key}`, to: node.id, kind: 'contextual', weight: 0 });
      }
      return { type: 'FTInterpretationGraph', utterance: meaning.utterance, nodes, edges, context: { ...program.context.entries, ...context } };
    });
  },

  resolve(graph) {
    need(graph?.type === 'FTInterpretationGraph', 'FT_INVALID_GRAPH', 'FlowTalk resolver requires FTInterpretationGraph.');
    const rank = new Map(graph.nodes.map((node, index) => [node.id, index * 100]));
    for (const edge of graph.edges.filter(edge => edge.kind === 'ambiguity')) {
      rank.set(edge.from, Math.min(rank.get(edge.from), rank.get(edge.to) - 1));
    }
    const chosen = [...graph.nodes].sort((left, right) => rank.get(left.id) - rank.get(right.id) || left.id.localeCompare(right.id))[0];
    return { type: 'FTResolution', chosenIntentId: chosen.id, intent: chosen.intent, reasons: ['declared-intent', ...graph.edges.filter(edge => edge.to === chosen.id || edge.from === chosen.id).map(edge => edge.kind)], digest: digest({ graph, chosen: chosen.id }) };
  },

  respond(program, resolution, services = {}) {
    const state = { intent: resolution.intent, responses: [], events: [] };
    const trace = new Trace('FlowTalk');
    trace.emit('interpretation.chosen', resolution);
    for (const action of program.responses.flatMap(response => response.actions)) applyAction(action, state, services, trace);
    return { type: 'FTResponseResult', state, trace: trace.events, receipt: trace.receipt('interpret utterance and respond', state) };
  },

  execute(source, context = {}, services = {}) {
    const ast = this.parse(source);
    const graph = this.lower(ast, context)[0];
    const resolution = this.resolve(graph);
    return { ast, graph, resolution, response: this.respond(ast, resolution, services) };
  }
};

function actionLines(body) {
  return body.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(parseAction);
}

export const JMLogic = {
  parse(source) {
    const rules = blocks(source, 'rule').map(block => {
      const recoveryMatch = block.body.match(/\brecover\s*\{([\s\S]*?)\}/);
      const body = recoveryMatch ? block.body.replace(recoveryMatch[0], '') : block.body;
      const condition = body.match(/\bwhen\s+([^\n]+)/);
      need(condition, 'JML_MISSING_WHEN', `JMLogic rule ${block.name} requires when.`);
      const effects = [...body.matchAll(/^\s*then\s+(.+)$/gm)].map(match => parseAction(match[1]));
      need(effects.length > 0, 'JML_MISSING_THEN', `JMLogic rule ${block.name} requires then.`);
      return { type: 'JMLRule', name: block.name, condition: parseExpr(condition[1]), effects, recovery: recoveryMatch ? actionLines(recoveryMatch[1]) : [] };
    });
    need(rules.length > 0, 'JML_NO_RULES', 'JMLogic requires at least one rule.');
    return { type: 'JMLProgram', rules };
  },

  lower(program) {
    return {
      type: 'JMLDecisionGraphSet',
      graphs: program.rules.map(rule => ({
        type: 'JMLDecisionGraph',
        ruleName: rule.name,
        conditionNodes: [{ id: `${rule.name}:condition`, expr: rule.condition }],
        effectNodes: rule.effects.map((effect, index) => ({ id: `${rule.name}:effect:${index}`, effect })),
        recoveryNodes: rule.recovery.map((action, index) => ({ id: `${rule.name}:recovery:${index}`, action }))
      }))
    };
  },

  evaluate(program, facts, services = {}) {
    const state = structuredClone(facts);
    const trace = new Trace('JMLogic');
    const decisions = [];
    for (const rule of program.rules) {
      const matched = evaluate(rule.condition, state, services);
      trace.emit('condition.evaluated', { rule: rule.name, matched });
      const actions = matched ? rule.effects : rule.recovery;
      const outcomes = [];
      for (const action of actions) outcomes.push(applyAction(action, state, services, trace));
      decisions.push({ type: 'JMLDecision', ruleName: rule.name, matched, actions, outcomes, stateDigest: digest(state) });
    }
    return { type: 'JMLRuntimeResult', state, decisions, trace: trace.events, receipt: trace.receipt('evaluate native rules', decisions) };
  },

  execute(source, facts, services = {}) {
    const ast = this.parse(source);
    return { ast, ir: this.lower(ast), runtime: this.evaluate(ast, facts, services) };
  }
};

export const JM32 = {
  parse(source) {
    const policies = blocks(source, 'policy').map(policy => {
      const clauses = blocks(policy.body, 'clause').map(clause => {
        const condition = clause.body.match(/\bwhen\s+([^\n]+)/);
        need(condition, 'JM32_MISSING_WHEN', `JM32 clause ${clause.name} requires when.`);
        const obligation = clause.body.match(/^\s*oblige\s+(.+)$/m);
        const sanction = clause.body.match(/^\s*sanction\s+(.+)$/m);
        need(obligation || sanction, 'JM32_MISSING_EFFECT', `JM32 clause ${clause.name} requires oblige or sanction.`);
        return { type: 'JM32Clause', name: clause.name, condition: parseExpr(condition[1]), obligation: obligation ? parseAction(obligation[1]) : null, sanction: sanction ? parseAction(sanction[1]) : null };
      });
      need(clauses.length > 0, 'JM32_NO_CLAUSES', `JM32 policy ${policy.name} requires clauses.`);
      return { type: 'JM32Policy', name: policy.name, clauses };
    });
    const guards = blocks(source, 'guard').map(guard => {
      const condition = guard.body.match(/\bwhen\s+([^\n]+)/);
      const action = guard.body.match(/^\s*do\s+(.+)$/m);
      need(condition && action, 'JM32_INVALID_GUARD', `JM32 guard ${guard.name} requires when and do.`);
      return { type: 'JM32Guard', name: guard.name, condition: parseExpr(condition[1]), action: parseAction(action[1]) };
    });
    need(policies.length > 0, 'JM32_NO_POLICIES', 'JM32-1DA requires at least one policy.');
    return { type: 'JM32Program', policies, guards };
  },

  lower(program) {
    return {
      type: 'JM32PolicyGraphSet',
      graphs: program.policies.map(policy => ({
        type: 'JM32PolicyGraph',
        policyName: policy.name,
        clauseNodes: policy.clauses.map(clause => ({ id: `${policy.name}:${clause.name}`, ...clause })),
        guardNodes: program.guards.map(guard => ({ id: `guard:${guard.name}`, ...guard }))
      }))
    };
  },

  enforce(program, facts, services = {}) {
    const state = structuredClone(facts);
    const trace = new Trace('JM32-1DA');
    const decisions = [];
    const matched = [];
    for (const policy of program.policies) {
      for (const clause of policy.clauses) {
        const passes = evaluate(clause.condition, state, services);
        trace.emit('clause.evaluated', { policy: policy.name, clause: clause.name, passes });
        if (passes) matched.push({ policy, clause });
      }
    }
    for (const item of matched.filter(item => item.clause.obligation)) {
      applyAction(item.clause.obligation, state, services, trace);
      decisions.push({ policyName: item.policy.name, clauseName: item.clause.name, decision: 'oblige', action: item.clause.obligation });
    }
    for (const item of matched.filter(item => item.clause.sanction)) {
      applyAction(item.clause.sanction, state, services, trace);
      decisions.push({ policyName: item.policy.name, clauseName: item.clause.name, decision: 'sanction', action: item.clause.sanction });
    }
    for (const guard of program.guards) {
      const passes = evaluate(guard.condition, state, services);
      trace.emit('guard.evaluated', { guard: guard.name, passes });
      if (passes) applyAction(guard.action, state, services, trace);
    }
    return { type: 'JM32RuntimeResult', state, decisions, trace: trace.events, receipt: trace.receipt('enforce native policy', decisions) };
  },

  execute(source, facts, services = {}) {
    const ast = this.parse(source);
    return { ast, ir: this.lower(ast), runtime: this.enforce(ast, facts, services) };
  }
};

export function languageChain(flowSource, logicSource, policySource, facts, services = {}) {
  const flow = FlowTalk.execute(flowSource, facts.context ?? {}, services);
  const merged = structuredClone(facts);
  setPath(merged, `intent.${flow.resolution.intent.name}`, true);
  Object.assign(merged, flow.resolution.intent.slots);
  const logic = JMLogic.execute(logicSource, merged, services);
  const policy = JM32.execute(policySource, logic.runtime.state, services);
  return { flow, logic, policy, digest: digest(stable({ flow: flow.resolution, logic: logic.runtime.decisions, policy: policy.runtime.decisions })) };
}

export { NativeError };
