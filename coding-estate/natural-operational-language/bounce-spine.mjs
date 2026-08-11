import { digest, need } from '../sovereign-ten/direct/native-core.mjs';
import { FlowTalk } from '../sovereign-ten/direct/language-native.mjs';
import { RECORP } from '../sovereign-batch-four/direct/bridge-native.mjs';

const MODES = Object.freeze({
  '': { name: 'designate', pressure: 0.5, mutate: true },
  '!': { name: 'command', pressure: 1, mutate: true },
  '?': { name: 'inspect', pressure: 0, mutate: false },
  '~': { name: 'soften', pressure: 0.25, mutate: true },
  '.lock': { name: 'hold', pressure: 0.75, mutate: true },
  '→': { name: 'route-forward', pressure: 0.75, mutate: true }
});

export const DEFAULT_WORD_BODIES = Object.freeze({
  and: {
    word: 'and',
    office: 'relation',
    operation: 'joint-custody',
    evidence: 'recovered-lineage-working-semantics',
    identityPolicy: 'preserve-sides',
    merge: false,
    description: 'Bring admitted sides into one accountable relation without silently erasing either side.'
  },
  recorp: {
    word: 'recorp',
    office: 'recovery-action',
    operation: 'recorp-native',
    evidence: 'recovered-current-native',
    identityPolicy: 'preserve-body',
    description: 'Regroup, inspect, soften, hold or route a body according to mark pressure.'
  },
  open: {
    word: 'open',
    office: 'state-action',
    operation: 'set-open',
    evidence: 'local-trial-role',
    description: 'Local proof role: make the contacted body open.'
  },
  close: {
    word: 'close',
    office: 'state-action',
    operation: 'set-closed',
    evidence: 'local-trial-role',
    description: 'Local proof role: make the contacted body closed.'
  },
  move: {
    word: 'move',
    office: 'route-action',
    operation: 'move-to',
    evidence: 'local-trial-role',
    description: 'Local proof role: move the contacted body to a named destination.'
  },
  hold: {
    word: 'hold',
    office: 'state-action',
    operation: 'hold-body',
    evidence: 'local-trial-role',
    description: 'Local proof role: hold the contacted body in its current state.'
  }
});

function clone(value) {
  return structuredClone(value);
}

function cleanPhrase(value) {
  return String(value ?? '')
    .trim()
    .replace(/^[\s,.:]+|[\s,.:]+$/g, '')
    .replace(/^(?:the|a|an)\s+/i, '')
    .trim();
}

function parsePayload(raw = '') {
  const text = String(raw).trim();
  if (!text) return { positional: [], named: {} };
  const positional = [];
  const named = {};
  for (const piece of text.split(',').map(part => part.trim()).filter(Boolean)) {
    const equals = piece.indexOf('=');
    if (equals > 0) {
      const key = piece.slice(0, equals).trim();
      const value = piece.slice(equals + 1).trim().replace(/^['"]|['"]$/g, '');
      named[key] = value;
    } else positional.push(piece.replace(/^['"]|['"]$/g, ''));
  }
  return { positional, named };
}

function semicolonTokens(source) {
  const tokens = [];
  const pattern = /;([A-Za-z][\w-]*)(\.lock|[!?~→])?(?:\(([^;]*?)\))?;/g;
  let match;
  while ((match = pattern.exec(source))) {
    tokens.push({
      type: 'MarkedWord',
      raw: match[0],
      word: match[1].toLowerCase(),
      surfaceWord: match[1],
      modifier: match[2] ?? '',
      payload: parsePayload(match[3]),
      designation: 'semicolon',
      start: match.index,
      end: pattern.lastIndex
    });
  }
  return tokens;
}

function bareRecorpToken(source) {
  const match = String(source).match(/^\s*(RECORP)(\.lock|[!?~→])(?=\s|$)/i);
  if (!match) return null;
  return {
    type: 'MarkedWord',
    raw: match[0].trim(),
    word: 'recorp',
    surfaceWord: match[1],
    modifier: match[2],
    payload: { positional: [], named: {} },
    designation: 'punctuation-pressure',
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length
  };
}

function literalNode(text) {
  return { type: 'LiteralBody', text: cleanPhrase(text) };
}

export function parseNaturalOperational(source) {
  need(typeof source === 'string' && source.trim(), 'NOL_EMPTY_SOURCE', 'Natural operational-language source is empty.');
  const tokens = semicolonTokens(source);
  const andToken = tokens.find(token => token.word === 'and');
  if (andToken) {
    const left = source.slice(0, andToken.start).trim();
    const right = source.slice(andToken.end).trim();
    need(left && right, 'NOL_AND_REQUIRES_SIDES', ';and; requires a left and a right side.');
    return {
      type: 'OperationalRelation',
      source,
      operator: andToken,
      left: parseNaturalOperational(left),
      right: parseNaturalOperational(right)
    };
  }

  const first = tokens[0] ?? bareRecorpToken(source);
  if (!first) return { type: 'PlainLanguage', source, body: literalNode(source), operational: false };

  const before = source.slice(0, first.start).trim();
  const after = source.slice(first.end).trim();
  if (before && first.designation !== 'punctuation-pressure') {
    return {
      type: 'OperationalInfix',
      source,
      subject: literalNode(before),
      operator: first,
      object: literalNode(after)
    };
  }

  return {
    type: 'OperationalAction',
    source,
    operator: first,
    target: literalNode(after || first.payload.named.target || first.payload.positional[0] || '')
  };
}

function entityKey(phrase, context = {}) {
  let text = cleanPhrase(phrase);
  if (!text && context.currentBody) text = String(context.currentBody);
  if (context.aliases && Object.hasOwn(context.aliases, text)) text = String(context.aliases[text]);
  return text || null;
}

function ensureEntity(state, key) {
  state.entities ??= {};
  state.entities[key] ??= { id: key, state: {}, trace: [] };
  return state.entities[key];
}

function effectPreview(entry, operator, target, context) {
  return {
    word: operator.word,
    office: entry?.office ?? 'unbound-operational-word',
    operation: entry?.operation ?? null,
    target,
    mode: MODES[operator.modifier]?.name ?? 'unknown',
    pressure: MODES[operator.modifier]?.pressure ?? null,
    context: clone(context)
  };
}

function executeBoundAction(entry, operator, target, state, context, trace) {
  const mode = MODES[operator.modifier];
  need(mode, 'NOL_UNKNOWN_MODIFIER', `Unknown operational modifier ${operator.modifier}.`);

  const preview = effectPreview(entry, operator, target, context);
  if (operator.modifier === '?' && entry.operation !== 'recorp-native') {
    trace.push({ event: 'operation.inspected', preview });
    return { kind: 'inspection', preview, changed: false };
  }

  if (!target) {
    trace.push({ event: 'operation.standing-only', preview });
    return { kind: 'standing-only', preview, changed: false };
  }

  if (entry.operation === 'recorp-native') {
    if (!operator.modifier) {
      trace.push({ event: 'operation.standing-only', preview, reason: 'RECORP requires a pressure/form mark for state change.' });
      return { kind: 'standing-only', preview, changed: false };
    }
    state.bodies ??= {};
    state.bodies[target] ??= { parts: [], state: 'scattered' };
    const nativeSource = `RECORP${operator.modifier} ${target}`;
    const native = RECORP.execute(nativeSource, state);
    Object.assign(state, native.state);
    trace.push({ event: 'native.recorp', source: nativeSource, nativeTrace: native.trace });
    return { kind: 'native-recorp', native, changed: operator.modifier !== '?' };
  }

  const entity = ensureEntity(state, target);
  const before = clone(entity);
  entity.trace ??= [];
  entity.trace.push({ word: operator.word, modifier: operator.modifier, pressure: mode.pressure });

  if (entry.operation === 'set-open') entity.state.open = true;
  else if (entry.operation === 'set-closed') entity.state.open = false;
  else if (entry.operation === 'hold-body') entity.state.held = true;
  else if (entry.operation === 'move-to') {
    const destination = operator.payload.named.to ?? operator.payload.positional[0] ?? context.destination;
    need(destination, 'NOL_MOVE_DESTINATION_REQUIRED', ';move; requires to=<destination>, a positional payload, or context.destination.');
    entity.state.location = destination;
  } else {
    trace.push({ event: 'operation.unimplemented', preview });
    return { kind: 'unimplemented', preview, changed: false };
  }

  if (operator.modifier === '.lock') entity.state.locked = true;
  if (operator.modifier === '→') {
    state.routes ??= [];
    state.routes.push({ from: target, via: operator.word, to: operator.payload.named.to ?? context.nextRoute ?? `${target}.forward` });
  }
  if (operator.modifier === '~') entity.state.pressure = mode.pressure;

  const after = clone(entity);
  trace.push({ event: 'operation.applied', word: operator.word, target, mode: mode.name, before, after });
  return { kind: 'applied', before, after, changed: digest(before) !== digest(after) };
}

function nodeTarget(node, context) {
  if (!node) return null;
  if (node.type === 'LiteralBody') return entityKey(node.text, context);
  if (node.type === 'PlainLanguage') return entityKey(node.body.text, context);
  return null;
}

export class BounceSpine {
  constructor({ registry = DEFAULT_WORD_BODIES, state = {}, context = {} } = {}) {
    this.registry = new Map(Object.entries(registry).map(([key, value]) => [key.toLowerCase(), clone(value)]));
    this.state = clone({ entities: {}, relations: [], routes: [], bodies: {}, ...state });
    this.context = clone(context);
    this.history = [];
  }

  register(word, definition) {
    need(word && definition && typeof definition === 'object', 'NOL_BAD_REGISTRATION', 'register(word, definition) requires a word and definition.');
    this.registry.set(String(word).toLowerCase(), { word: String(word).toLowerCase(), evidence: 'owner-local-role', ...clone(definition) });
    return this.registry.get(String(word).toLowerCase());
  }

  plan(source) {
    const ast = parseNaturalOperational(source);
    const plan = { type: 'BouncePlan', source, ast };
    return { ...plan, digest: digest(plan) };
  }

  evaluateNode(node, context, trace) {
    if (node.type === 'PlainLanguage') {
      const result = { kind: 'plain-language', body: node.body, operational: false };
      trace.push({ event: 'plain.readable', text: node.body.text });
      return result;
    }

    if (node.type === 'OperationalRelation') {
      const entry = this.registry.get(node.operator.word);
      const left = this.evaluateNode(node.left, context, trace);
      const right = this.evaluateNode(node.right, context, trace);
      const relation = {
        id: `relation:${this.state.relations.length + 1}`,
        word: node.operator.word,
        operation: entry?.operation ?? 'unbound-relation',
        left: { source: node.left.source ?? node.left.body?.text ?? '', result: clone(left) },
        right: { source: node.right.source ?? node.right.body?.text ?? '', result: clone(right) },
        identityPolicy: entry?.identityPolicy ?? 'preserve-sides',
        merge: entry?.merge ?? false
      };
      this.state.relations.push(relation);
      trace.push({ event: 'relation.created', relation });
      return { kind: 'relation', relation, left, right, changed: Boolean(left.changed || right.changed) };
    }

    const operator = node.operator;
    const entry = this.registry.get(operator.word);
    const standing = {
      operational: true,
      word: operator.word,
      designation: operator.designation,
      modifier: operator.modifier,
      mode: MODES[operator.modifier]?.name ?? 'unknown',
      evidence: entry?.evidence ?? 'unbound'
    };
    trace.push({ event: 'word.operational-standing', standing });

    if (!entry) {
      return {
        kind: 'unbound-operational-word',
        standing,
        sourceWord: operator.surfaceWord,
        changed: false,
        note: 'Marking changed standing, but no executable semantic role was guessed.'
      };
    }

    if (entry.office === 'relation' && node.type !== 'OperationalRelation') {
      return { kind: 'relation-awaiting-sides', standing, changed: false };
    }

    const target = node.type === 'OperationalInfix'
      ? nodeTarget(node.subject, context)
      : nodeTarget(node.target, context);
    const result = executeBoundAction(entry, operator, target, this.state, context, trace);
    return { ...result, standing, target };
  }

  execute(sourceOrPlan, context = {}) {
    const plan = typeof sourceOrPlan === 'string' ? this.plan(sourceOrPlan) : clone(sourceOrPlan);
    need(plan?.type === 'BouncePlan' && plan.ast, 'NOL_BAD_PLAN', 'BounceSpine.execute requires source text or a BouncePlan.');
    const activeContext = { ...clone(this.context), ...clone(context) };
    const before = clone(this.state);
    const trace = [{ event: 'contact.before', stateDigest: digest(before), source: plan.source }];
    const result = this.evaluateNode(plan.ast, activeContext, trace);
    const after = clone(this.state);
    trace.push({ event: 'contact.after', stateDigest: digest(after), changed: digest(before) !== digest(after) });
    const receipt = {
      type: 'BounceReceipt',
      source: plan.source,
      planDigest: plan.digest,
      beforeDigest: digest(before),
      afterDigest: digest(after),
      changed: digest(before) !== digest(after),
      resultKind: result.kind,
      traceDigest: digest(trace)
    };
    this.history.push({ source: plan.source, plan, before, after, receipt });
    return { plan, result, state: after, trace, receipt };
  }

  undo() {
    const last = this.history.pop();
    if (!last) return { changed: false, state: clone(this.state), reason: 'no-history' };
    this.state = clone(last.before);
    return { changed: true, undoneSource: last.source, state: clone(this.state), stateDigest: digest(this.state) };
  }

  reuse(source) {
    return this.plan(source);
  }

  alter(plan, newSource) {
    need(plan?.type === 'BouncePlan', 'NOL_ALTER_REQUIRES_PLAN', 'alter requires an existing BouncePlan.');
    return this.plan(newSource);
  }

  flowTalkBridge(sourceOrPlan, context = {}) {
    const plan = typeof sourceOrPlan === 'string' ? this.plan(sourceOrPlan) : sourceOrPlan;
    const ast = plan.ast;
    let intent = 'operational_language';
    const slots = {};
    if (ast.operator?.word) intent = ast.operator.word.replace(/[^A-Za-z0-9_.-]/g, '_');
    if (ast.type === 'OperationalRelation') {
      intent = ast.operator.word;
      slots.left = ast.left.source ?? '';
      slots.right = ast.right.source ?? '';
    } else {
      const target = ast.target?.text ?? ast.subject?.text ?? '';
      if (target) slots.target = target;
      if (ast.operator?.modifier) slots.modifier = ast.operator.modifier;
    }
    const slotText = Object.entries(slots).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ');
    const contextLines = Object.entries(context).map(([key, value]) => `  ${key} = ${JSON.stringify(value)}`).join('\n');
    const flowSource = `${contextLines ? `context {\n${contextLines}\n}\n` : ''}utterance ${JSON.stringify(plan.source)}\nas intent ${intent}(${slotText})`;
    const flow = FlowTalk.execute(flowSource, context);
    return { type: 'FlowTalkBridge', planDigest: plan.digest, source: flowSource, resolution: flow.resolution, graph: flow.graph };
  }

  federationEnvelope(sourceOrPlan, targetBody, { permission = 'request', context = {} } = {}) {
    need(targetBody, 'NOL_FEDERATION_TARGET_REQUIRED', 'Federation envelope requires targetBody.');
    const plan = typeof sourceOrPlan === 'string' ? this.plan(sourceOrPlan) : sourceOrPlan;
    return {
      type: 'JM.NaturalOperationalFederationEnvelope.v0.1',
      targetBody,
      permission,
      source: plan.source,
      planDigest: plan.digest,
      ast: clone(plan.ast),
      context: clone(context),
      laws: ['MEET_NOT_MERGE', 'IDENTITY_PRESERVED', 'DONOR_PERMISSION_REQUIRED', 'TRACE_REQUIRED'],
      digest: digest({ targetBody, permission, source: plan.source, planDigest: plan.digest, context })
    };
  }
}

export function demoBounce() {
  const spine = new BounceSpine();
  const first = spine.execute(';open; door ;and; ;close; window');
  const inspection = spine.execute(';move?(to=kitchen); door');
  const recorp = spine.execute('RECORP! shards');
  return { first, inspection, recorp, state: clone(spine.state) };
}
