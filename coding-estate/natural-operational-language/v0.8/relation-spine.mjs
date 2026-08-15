import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { NaturalWordbookV06 } from '../v0.6/wordbook.mjs';
import { ActivatedPhraseSessionV07, compileActivatedPhrase } from '../v0.7/phrase-activation.mjs';

const RELATIONS = Object.freeze({
  and: {
    operation: 'joint-custody',
    execution: 'both',
    orderClaim: 'not-specified-by-and',
    identityPolicy: 'preserve-sides',
    merge: false
  },
  then: {
    operation: 'ordered-sequence',
    execution: 'left-then-right',
    orderClaim: 'left-before-right',
    identityPolicy: 'preserve-stages',
    merge: false
  },
  or: {
    operation: 'declared-alternative',
    execution: 'selected-side-only',
    orderClaim: 'not-applicable',
    identityPolicy: 'preserve-alternatives',
    merge: false
  }
});

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
      if (end > index) { index = end; continue; }
    }
    if (text[index] === '(') depth += 1;
    else if (text[index] === ')') {
      depth -= 1;
      need(depth >= 0, 'NOL_V08_UNBALANCED_GROUP', 'Closing parenthesis appears before a matching opening parenthesis.');
      if (depth === 0 && index !== text.length - 1) return null;
    }
  }
  need(depth === 0, 'NOL_V08_UNBALANCED_GROUP', 'Operational relation grouping is not balanced.');
  return text.slice(1, -1).trim();
}

function topLevelRelations(source) {
  const text = String(source);
  const hits = [];
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === ';') {
      const end = skipMarkedToken(text, index);
      if (end > index) {
        const raw = text.slice(index, end + 1);
        const match = raw.match(/^;([A-Za-z][\w-]*)(?:\.lock|[!?~→])?(?:\([^;]*\))?;$/);
        const word = match?.[1]?.toLowerCase();
        if (depth === 0 && RELATIONS[word] && raw.toLowerCase() === `;${word};`) hits.push({ word, start: index, end: end + 1, raw });
        index = end;
        continue;
      }
    }
    if (text[index] === '(') depth += 1;
    else if (text[index] === ')') {
      depth -= 1;
      need(depth >= 0, 'NOL_V08_UNBALANCED_GROUP', 'Closing parenthesis appears before a matching opening parenthesis.');
    }
  }
  need(depth === 0, 'NOL_V08_UNBALANCED_GROUP', 'Operational relation grouping is not balanced.');
  return hits;
}

export function parseOperationalRelations(source) {
  need(typeof source === 'string' && source.trim(), 'NOL_V08_EMPTY_SOURCE', 'Operational relation source is empty.');
  const text = source.trim();
  const unwrapped = unwrapOuterGroup(text);
  if (unwrapped !== null) {
    need(unwrapped, 'NOL_V08_EMPTY_GROUP', 'Operational relation grouping cannot be empty.');
    return { type: 'RelationGroupV08', source: text, inner: parseOperationalRelations(unwrapped) };
  }

  const relations = topLevelRelations(text);
  need(relations.length <= 1, 'NOL_V08_GROUPING_REQUIRED', 'More than one top-level relation word requires parentheses so relation grouping is not guessed.');
  if (relations.length === 1) {
    const operator = relations[0];
    const leftSource = text.slice(0, operator.start).trim();
    const rightSource = text.slice(operator.end).trim();
    need(leftSource && rightSource, 'NOL_V08_RELATION_REQUIRES_SIDES', `;${operator.word}; requires a left and a right side.`);
    return {
      type: 'OperationalRelationV08',
      source: text,
      operator: operator.word,
      law: clone(RELATIONS[operator.word]),
      left: parseOperationalRelations(leftSource),
      right: parseOperationalRelations(rightSource)
    };
  }
  return { type: 'OperationalLeafV08', source: text };
}

function setWordbookState(wordbook, state) {
  wordbook.room.room.base.state = clone(state);
}

function freshWordbook(parent, state) {
  const next = new NaturalWordbookV06({ state, session: 'relation-spine-v0.8-evaluation' });
  const snapshot = parent.exportWordbook();
  if (snapshot.definitions.length) next.importWordbook(snapshot);
  return next;
}

function choiceFor(path, options) {
  const direct = options?.choices && Object.hasOwn(options.choices, path) ? options.choices[path] : null;
  const fallback = path === 'root' ? options?.choice : null;
  const value = String(direct ?? fallback ?? '').trim().toLowerCase();
  if (!value) return null;
  need(value === 'left' || value === 'right', 'NOL_V08_BAD_CHOICE', `Choice for ${path} must be left or right.`);
  return value;
}

function evaluateNode(node, wordbook, bindings, options, trace, path = 'root') {
  if (node.type === 'RelationGroupV08') {
    trace.push({ event: 'relation.group.enter', path, source: node.source });
    const inner = evaluateNode(node.inner, wordbook, bindings, options, trace, `${path}.group`);
    trace.push({ event: 'relation.group.leave', path, status: inner.status });
    return { type: 'group', source: node.source, inner, status: inner.status, changed: inner.changed };
  }

  if (node.type === 'OperationalLeafV08') {
    const run = wordbook.run(node.source, bindings);
    trace.push({ event: 'relation.leaf', path, source: node.source, receiptDigest: run.receipt.digest, changed: run.receipt.changed });
    return { type: 'leaf', source: node.source, run, status: 'executed', changed: run.receipt.changed };
  }

  need(node.type === 'OperationalRelationV08', 'NOL_V08_UNKNOWN_NODE', `Unsupported relation node ${node.type}.`);
  const law = RELATIONS[node.operator];

  if (node.operator === 'or') {
    const selected = choiceFor(path, options);
    if (!selected) {
      trace.push({ event: 'relation.choice.required', path, operator: 'or', left: node.left.source, right: node.right.source });
      return {
        type: 'relation',
        operator: 'or',
        law: clone(law),
        status: 'choice-required',
        changed: false,
        alternatives: { left: node.left.source, right: node.right.source },
        path
      };
    }
    const chosenNode = selected === 'left' ? node.left : node.right;
    const unchosenNode = selected === 'left' ? node.right : node.left;
    const chosen = evaluateNode(chosenNode, wordbook, bindings, options, trace, `${path}.${selected}`);
    const relation = {
      id: `relation:${wordbook.state.relations.length + 1}`,
      word: 'or',
      operation: law.operation,
      selected,
      chosen: { source: chosenNode.source, resultType: chosen.type },
      unchosen: { source: unchosenNode.source },
      identityPolicy: law.identityPolicy,
      merge: false
    };
    wordbook.state.relations.push(relation);
    trace.push({ event: 'relation.alternative.selected', path, relation });
    return { type: 'relation', operator: 'or', law: clone(law), status: chosen.status, selected, chosen, relation, changed: true };
  }

  const left = evaluateNode(node.left, wordbook, bindings, options, trace, `${path}.left`);
  if (left.status === 'choice-required') return { type: 'relation', operator: node.operator, status: 'choice-required', changed: false, left };
  const right = evaluateNode(node.right, wordbook, bindings, options, trace, `${path}.right`);
  if (right.status === 'choice-required') return { type: 'relation', operator: node.operator, status: 'choice-required', changed: false, left, right };

  const relation = {
    id: `relation:${wordbook.state.relations.length + 1}`,
    word: node.operator,
    operation: law.operation,
    execution: law.execution,
    orderClaim: law.orderClaim,
    left: { source: node.left.source, resultType: left.type },
    right: { source: node.right.source, resultType: right.type },
    identityPolicy: law.identityPolicy,
    merge: false
  };
  wordbook.state.relations.push(relation);
  trace.push({ event: 'relation.executed', path, relation });
  return { type: 'relation', operator: node.operator, law: clone(law), status: 'executed', left, right, relation, changed: true };
}

export class NaturalRelationSessionV08 {
  constructor(options = {}) {
    this.parent = new ActivatedPhraseSessionV07(options);
    this.history = [];
    this.events = [];
  }

  get state() {
    return this.parent.state;
  }

  define(...args) { return this.parent.define(...args); }
  grant(...args) { return this.parent.grant(...args); }
  revoke(...args) { return this.parent.revoke(...args); }

  runMarked(source, bindings = {}, options = {}) {
    const ast = parseOperationalRelations(source);
    const before = clone(this.state);
    const working = freshWordbook(this.parent.wordbook, before);
    const trace = [{ event: 'relation.contact.before', stateDigest: digest(before), source: String(source) }];
    const result = evaluateNode(ast, working, bindings, options, trace);

    if (result.status === 'choice-required') {
      const receiptBody = {
        schema: 'JM.NaturalOperationalRelationReceipt.v0.8',
        source: String(source),
        astDigest: digest(ast),
        beforeDigest: digest(before),
        afterDigest: digest(before),
        status: 'choice-required',
        changed: false,
        traceDigest: digest(trace)
      };
      const receipt = { ...receiptBody, digest: digest(receiptBody) };
      this.events.push({ event: 'relation.choice-required', source: String(source), receiptDigest: receipt.digest });
      return { ast, result, state: before, trace, receipt };
    }

    const after = clone(working.state);
    setWordbookState(this.parent.wordbook, after);
    trace.push({ event: 'relation.contact.after', stateDigest: digest(after), changed: digest(before) !== digest(after) });
    const receiptBody = {
      schema: 'JM.NaturalOperationalRelationReceipt.v0.8',
      source: String(source),
      astDigest: digest(ast),
      beforeDigest: digest(before),
      afterDigest: digest(after),
      status: 'executed',
      changed: digest(before) !== digest(after),
      traceDigest: digest(trace)
    };
    const receipt = { ...receiptBody, digest: digest(receiptBody) };
    this.history.push({ before, after, source: String(source), receiptDigest: receipt.digest });
    this.events.push({ event: 'relation.run', source: String(source), receiptDigest: receipt.digest, changed: receipt.changed });
    return { ast, result, state: after, trace, receipt };
  }

  runPhrase(phrase, activations = [], bindings = {}, options = {}) {
    const compiled = compileActivatedPhrase(phrase, activations);
    const run = this.runMarked(compiled.markedSource, bindings, options);
    return { compiled, ...run };
  }

  undo() {
    const last = this.history.pop();
    if (!last) return { changed: false, state: clone(this.state), reason: 'no-history' };
    setWordbookState(this.parent.wordbook, last.before);
    const result = { changed: true, undoneSource: last.source, state: clone(this.state), stateDigest: digest(this.state) };
    this.events.push({ event: 'relation.undo', source: last.source, stateDigest: result.stateDigest });
    return result;
  }

  receipt() {
    const body = {
      schema: 'JM.NaturalOperationalRelationSessionReceipt.v0.8',
      stateDigest: digest(this.state),
      wordbookDigest: this.parent.wordbook.exportWordbook().digest,
      events: clone(this.events)
    };
    return { ...body, digest: digest(body) };
  }
}

export const RELATION_WORDS_V08 = RELATIONS;
