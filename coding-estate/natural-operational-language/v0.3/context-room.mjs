import { BounceSpineV02 } from '../v0.2/composition-spine.mjs';
import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';

const BODY_REFS = new Set(['it', 'this', 'that', 'them', 'these', 'those']);
const PLACE_REFS = new Set(['here', 'there']);

function clone(value) {
  return structuredClone(value);
}

function normal(value) {
  return String(value ?? '').trim().toLowerCase();
}

function bindingFrom(table, key, label) {
  if (!table || !Object.hasOwn(table, key)) return null;
  const value = table[key];
  if (Array.isArray(value)) {
    need(value.length === 1, 'NOL_V03_CONTEXT_AMBIGUOUS', `${label} ${key} has ${value.length} candidates; context must choose one before execution.`);
    return String(value[0]);
  }
  need(value !== null && value !== undefined && String(value).trim(), 'NOL_V03_CONTEXT_EMPTY_BINDING', `${label} ${key} has an empty binding.`);
  return String(value);
}

function followAliases(value, context, resolutions, sourceKind) {
  let current = String(value).trim();
  const seen = new Set();
  for (let depth = 0; depth < 8; depth += 1) {
    const key = normal(current);
    if (!context.aliases || !Object.hasOwn(context.aliases, key)) return current;
    need(!seen.has(key), 'NOL_V03_ALIAS_CYCLE', `Context alias cycle detected at ${current}.`);
    seen.add(key);
    const next = bindingFrom(context.aliases, key, 'alias');
    resolutions.push({ kind: 'alias', sourceKind, from: current, to: next });
    current = next;
  }
  throw Object.assign(new Error('Context alias chain exceeded safe depth.'), { code: 'NOL_V03_ALIAS_DEPTH' });
}

export function resolveBodyReference(value, context = {}, resolutions = []) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    if (context.currentBody) {
      const resolved = followAliases(context.currentBody, context, resolutions, 'currentBody');
      resolutions.push({ kind: 'body-ref', from: '(current)', to: resolved });
      return resolved;
    }
    return raw;
  }

  const key = normal(raw);
  if (BODY_REFS.has(key)) {
    const direct = bindingFrom(context.refs, key, 'body reference');
    need(direct, 'NOL_V03_CONTEXT_UNBOUND', `Contextual body reference ${raw} is unbound; refusing to guess.`);
    const resolved = followAliases(direct, context, resolutions, 'body-ref');
    resolutions.push({ kind: 'body-ref', from: raw, to: resolved });
    return resolved;
  }

  const alias = context.aliases && Object.hasOwn(context.aliases, key)
    ? bindingFrom(context.aliases, key, 'alias')
    : null;
  if (alias) {
    const resolved = followAliases(alias, context, resolutions, 'alias');
    resolutions.push({ kind: 'alias', from: raw, to: resolved });
    return resolved;
  }
  return raw;
}

export function resolvePlaceReference(value, context = {}, resolutions = []) {
  const raw = String(value ?? '').trim();
  const key = normal(raw);
  if (PLACE_REFS.has(key)) {
    const direct = bindingFrom(context.places, key, 'place reference');
    need(direct, 'NOL_V03_CONTEXT_UNBOUND', `Contextual place reference ${raw} is unbound; refusing to guess.`);
    const resolved = followAliases(direct, context, resolutions, 'place-ref');
    resolutions.push({ kind: 'place-ref', from: raw, to: resolved });
    return resolved;
  }
  const alias = context.aliases && Object.hasOwn(context.aliases, key)
    ? bindingFrom(context.aliases, key, 'alias')
    : null;
  if (alias) {
    const resolved = followAliases(alias, context, resolutions, 'alias');
    resolutions.push({ kind: 'alias', from: raw, to: resolved });
    return resolved;
  }
  return raw;
}

function contextualiseLeaf(ast, context, resolutions) {
  const out = clone(ast);
  if (!out.operator?.word) return out;

  const literal = out.type === 'OperationalInfix' ? out.subject : out.target;
  if (!literal || literal.type !== 'LiteralBody') return out;

  let targetText = String(literal.text ?? '').trim();
  if (out.operator.word === 'move') {
    let destination = out.operator.payload?.named?.to ?? out.operator.payload?.positional?.[0] ?? null;
    const toMatch = targetText.match(/^(.+?)\s+to\s+(.+)$/i);
    const trailingPlace = targetText.match(/^(.+?)\s+(here|there)$/i);
    if (toMatch) {
      targetText = toMatch[1].trim();
      destination = toMatch[2].trim();
    } else if (!destination && trailingPlace) {
      targetText = trailingPlace[1].trim();
      destination = trailingPlace[2].trim();
    }

    literal.text = resolveBodyReference(targetText, context, resolutions);
    if (destination) {
      out.operator.payload ??= { positional: [], named: {} };
      out.operator.payload.named ??= {};
      out.operator.payload.named.to = resolvePlaceReference(destination, context, resolutions);
      out.operator.payload.positional = [];
    } else if (context.destination) {
      out.operator.payload ??= { positional: [], named: {} };
      out.operator.payload.named ??= {};
      out.operator.payload.named.to = resolvePlaceReference(context.destination, context, resolutions);
      resolutions.push({ kind: 'destination-default', from: '(context.destination)', to: out.operator.payload.named.to });
    }
    return out;
  }

  literal.text = resolveBodyReference(targetText, context, resolutions);
  return out;
}

function contextualiseNode(node, context, resolutions, path = 'root') {
  if (node.type === 'OperationalGroup') {
    return { ...clone(node), inner: contextualiseNode(node.inner, context, resolutions, `${path}.group`) };
  }
  if (node.type === 'OperationalRelation') {
    return {
      ...clone(node),
      left: contextualiseNode(node.left, context, resolutions, `${path}.left`),
      right: contextualiseNode(node.right, context, resolutions, `${path}.right`)
    };
  }
  need(node.type === 'OperationalLeaf', 'NOL_V03_UNKNOWN_NODE', `Unsupported contextual node ${node.type}.`);
  return { ...clone(node), ast: contextualiseLeaf(node.ast, context, resolutions), contextPath: path };
}

export function resolveOperationalContext(planV02, context = {}) {
  need(planV02?.type === 'BouncePlanV02' && planV02.ast, 'NOL_V03_PARENT_PLAN_REQUIRED', 'Context resolution requires a v0.2 plan.');
  const resolutions = [];
  const ast = contextualiseNode(planV02.ast, context, resolutions);
  const contextBody = {
    refs: clone(context.refs ?? {}),
    places: clone(context.places ?? {}),
    aliases: clone(context.aliases ?? {}),
    currentBody: context.currentBody ?? null,
    destination: context.destination ?? null
  };
  return {
    ast,
    resolutions,
    contextBody,
    contextDigest: digest(contextBody),
    resolutionDigest: digest(resolutions)
  };
}

export class ContextualBounceV03 {
  constructor(options = {}) {
    this.base = new BounceSpineV02(options);
  }

  get state() {
    return this.base.state;
  }

  register(word, definition) {
    return this.base.register(word, definition);
  }

  plan(source, context = {}) {
    const parent = this.base.plan(source);
    const resolved = resolveOperationalContext(parent, context);
    const body = {
      type: 'BouncePlanV03',
      source: String(source),
      parentPlanDigest: parent.digest,
      groupingSummary: parent.groupingSummary,
      ast: resolved.ast,
      contextBody: resolved.contextBody,
      contextDigest: resolved.contextDigest,
      resolutions: resolved.resolutions,
      resolutionDigest: resolved.resolutionDigest
    };
    return { ...body, digest: digest(body) };
  }

  execute(sourceOrPlan, context = {}) {
    const plan = typeof sourceOrPlan === 'string' ? this.plan(sourceOrPlan, context) : clone(sourceOrPlan);
    need(plan?.type === 'BouncePlanV03' && plan.ast, 'NOL_V03_BAD_PLAN', 'ContextualBounceV03.execute requires source text or a BouncePlanV03.');
    const parentBody = {
      type: 'BouncePlanV02',
      source: plan.source,
      ast: clone(plan.ast),
      groupingSummary: clone(plan.groupingSummary)
    };
    const parentPlan = { ...parentBody, digest: digest(parentBody) };
    const run = this.base.execute(parentPlan, { ...clone(context), ...clone(plan.contextBody) });
    const contextTrace = plan.resolutions.map((resolution, index) => ({ event: 'context.resolved.v0.3', order: index + 1, ...clone(resolution) }));
    const receiptBody = {
      type: 'BounceReceiptV03',
      source: plan.source,
      planDigest: plan.digest,
      parentReceiptDigest: run.receipt.traceDigest,
      contextDigest: plan.contextDigest,
      resolutionDigest: plan.resolutionDigest,
      resolutionCount: plan.resolutions.length,
      beforeDigest: run.receipt.beforeDigest,
      afterDigest: run.receipt.afterDigest,
      changed: run.receipt.changed,
      resultKind: run.receipt.resultKind
    };
    return {
      ...run,
      plan,
      contextTrace,
      trace: [...contextTrace, ...run.trace],
      receipt: { ...receiptBody, digest: digest(receiptBody) }
    };
  }

  undo() {
    return this.base.undo();
  }
}
