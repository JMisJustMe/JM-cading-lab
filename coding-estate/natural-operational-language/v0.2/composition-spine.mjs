import { BounceSpine, parseNaturalOperational } from '../bounce-spine.mjs';
import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';

function clone(value) {
  return structuredClone(value);
}

function skipMarkedToken(source, index) {
  if (source[index] !== ';') return index;
  const end = source.indexOf(';', index + 1);
  return end === -1 ? index : end;
}

function unwrapOuterGroup(source) {
  const text = String(source).trim();
  if (!text.startsWith('(') || !text.endsWith(')')) return null;
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === ';') {
      const end = skipMarkedToken(text, index);
      if (end > index) {
        index = end;
        continue;
      }
    }
    if (text[index] === '(') depth += 1;
    else if (text[index] === ')') {
      depth -= 1;
      need(depth >= 0, 'NOL_V02_UNBALANCED_GROUP', 'Closing parenthesis appears before a matching opening parenthesis.');
      if (depth === 0 && index !== text.length - 1) return null;
    }
  }
  need(depth === 0, 'NOL_V02_UNBALANCED_GROUP', 'Parenthesised operational group is not balanced.');
  return text.slice(1, -1).trim();
}

function topLevelAndTokens(source) {
  const text = String(source);
  const hits = [];
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === ';') {
      const end = skipMarkedToken(text, index);
      if (end > index) {
        const token = text.slice(index, end + 1).trim().toLowerCase();
        if (depth === 0 && token === ';and;') hits.push({ start: index, end: end + 1 });
        index = end;
        continue;
      }
    }
    if (text[index] === '(') depth += 1;
    else if (text[index] === ')') {
      depth -= 1;
      need(depth >= 0, 'NOL_V02_UNBALANCED_GROUP', 'Closing parenthesis appears before a matching opening parenthesis.');
    }
  }
  need(depth === 0, 'NOL_V02_UNBALANCED_GROUP', 'Operational grouping is not balanced.');
  return hits;
}

export function parseOperationalComposition(source) {
  need(typeof source === 'string' && source.trim(), 'NOL_V02_EMPTY_SOURCE', 'Natural operational-language source is empty.');
  const text = source.trim();
  const unwrapped = unwrapOuterGroup(text);
  if (unwrapped !== null) {
    need(unwrapped, 'NOL_V02_EMPTY_GROUP', 'Operational grouping cannot be empty.');
    return {
      type: 'OperationalGroup',
      source: text,
      explicit: true,
      inner: parseOperationalComposition(unwrapped)
    };
  }

  const ands = topLevelAndTokens(text);
  need(ands.length <= 1, 'NOL_V02_GROUPING_REQUIRED', 'More than one top-level ;and; requires parentheses so grouping is not guessed.');
  if (ands.length === 1) {
    const operator = ands[0];
    const leftSource = text.slice(0, operator.start).trim();
    const rightSource = text.slice(operator.end).trim();
    need(leftSource && rightSource, 'NOL_V02_AND_REQUIRES_SIDES', ';and; requires a left and a right side.');
    return {
      type: 'OperationalRelation',
      source: text,
      operator: { type: 'MarkedWord', word: 'and', raw: ';and;', designation: 'semicolon', modifier: '' },
      left: parseOperationalComposition(leftSource),
      right: parseOperationalComposition(rightSource),
      grouping: 'syntax-preserved'
    };
  }

  return {
    type: 'OperationalLeaf',
    source: text,
    ast: parseNaturalOperational(text)
  };
}

function summaryOf(node) {
  if (node.type === 'OperationalLeaf') return { type: node.ast.type, source: node.source };
  if (node.type === 'OperationalGroup') return { type: 'group', inner: summaryOf(node.inner) };
  return { type: 'relation', operator: node.operator.word, left: summaryOf(node.left), right: summaryOf(node.right) };
}

export class BounceSpineV02 {
  constructor(options = {}) {
    this.base = new BounceSpine(options);
    this.history = [];
  }

  get state() {
    return this.base.state;
  }

  set state(value) {
    this.base.state = clone(value);
  }

  get registry() {
    return this.base.registry;
  }

  register(word, definition) {
    return this.base.register(word, definition);
  }

  plan(source) {
    const ast = parseOperationalComposition(source);
    const plan = { type: 'BouncePlanV02', source: String(source), ast, groupingSummary: summaryOf(ast) };
    return { ...plan, digest: digest(plan) };
  }

  evaluateNode(node, context, trace, path = 'root') {
    if (node.type === 'OperationalGroup') {
      trace.push({ event: 'group.enter', path, source: node.source });
      const result = this.evaluateNode(node.inner, context, trace, `${path}.group`);
      trace.push({ event: 'group.leave', path, changed: Boolean(result.changed) });
      return { kind: 'group', inner: result, changed: Boolean(result.changed), source: node.source };
    }

    if (node.type === 'OperationalRelation') {
      const entry = this.registry.get('and');
      const left = this.evaluateNode(node.left, context, trace, `${path}.left`);
      const right = this.evaluateNode(node.right, context, trace, `${path}.right`);
      const relation = {
        id: `relation:${this.state.relations.length + 1}`,
        word: 'and',
        operation: entry?.operation ?? 'joint-custody',
        grouping: node.grouping,
        left: { source: node.left.source, result: clone(left) },
        right: { source: node.right.source, result: clone(right) },
        identityPolicy: entry?.identityPolicy ?? 'preserve-sides',
        merge: entry?.merge ?? false
      };
      this.state.relations.push(relation);
      trace.push({ event: 'relation.created.v0.2', path, relation });
      return { kind: 'relation', relation, left, right, changed: Boolean(left.changed || right.changed) };
    }

    need(node.type === 'OperationalLeaf', 'NOL_V02_UNKNOWN_NODE', `Unsupported v0.2 node ${node.type}.`);
    trace.push({ event: 'leaf.enter', path, source: node.source });
    const result = this.base.evaluateNode(node.ast, context, trace);
    trace.push({ event: 'leaf.leave', path, kind: result.kind, changed: Boolean(result.changed) });
    return result;
  }

  execute(sourceOrPlan, context = {}) {
    const plan = typeof sourceOrPlan === 'string' ? this.plan(sourceOrPlan) : clone(sourceOrPlan);
    need(plan?.type === 'BouncePlanV02' && plan.ast, 'NOL_V02_BAD_PLAN', 'BounceSpineV02.execute requires source text or a BouncePlanV02.');
    const activeContext = { ...clone(this.base.context), ...clone(context) };
    const before = clone(this.state);
    const trace = [{ event: 'contact.before.v0.2', source: plan.source, stateDigest: digest(before), planDigest: plan.digest }];
    const result = this.evaluateNode(plan.ast, activeContext, trace);
    const after = clone(this.state);
    const changed = digest(before) !== digest(after);
    trace.push({ event: 'contact.after.v0.2', stateDigest: digest(after), changed });
    const receipt = {
      type: 'BounceReceiptV02',
      source: plan.source,
      planDigest: plan.digest,
      groupingDigest: digest(plan.groupingSummary),
      beforeDigest: digest(before),
      afterDigest: digest(after),
      changed,
      resultKind: result.kind,
      relationCount: after.relations?.length ?? 0,
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
}
