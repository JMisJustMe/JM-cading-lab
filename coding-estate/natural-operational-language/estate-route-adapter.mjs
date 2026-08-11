import { digest, need } from '../sovereign-ten/direct/native-core.mjs';
import { planEstateRoute, validateRegistry } from '../integration/router-core.mjs';
import { parseNaturalOperational } from './bounce-spine.mjs';

const OPERATOR_HINTS = Object.freeze({
  and: ['compose', 'join', 'relation', 'bridge'],
  recorp: ['recover', 'restore', 'route'],
  open: ['route', 'state', 'transition'],
  close: ['route', 'state', 'transition'],
  move: ['route', 'state', 'transition'],
  hold: ['state', 'permission', 'govern']
});

function collectOperators(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.operator?.word) out.push(node.operator.word);
  if (node.left) collectOperators(node.left, out);
  if (node.right) collectOperators(node.right, out);
  return out;
}

function asPlan(sourceOrPlan) {
  if (typeof sourceOrPlan === 'string') {
    const ast = parseNaturalOperational(sourceOrPlan);
    const plan = { type: 'BouncePlan', source: sourceOrPlan, ast };
    return { ...plan, digest: digest(plan) };
  }
  need(sourceOrPlan?.type === 'BouncePlan' && sourceOrPlan.ast, 'NOL_ROUTE_BAD_PLAN', 'Estate route adapter requires source text or BouncePlan.');
  return sourceOrPlan;
}

function normalIdentity(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function exactBodyForOperator(word, registry) {
  const needle = normalIdentity(word);
  return registry.bodies.find(body => {
    if (normalIdentity(body.id) === needle) return true;
    if (normalIdentity(body.name) === needle) return true;
    return (body.aliases ?? []).some(alias => normalIdentity(alias) === needle);
  }) ?? null;
}

function preserveOperatorCustody(estatePlan, operators, registry) {
  const explicit = operators
    .map(word => ({ word, body: exactBodyForOperator(word, registry) }))
    .filter(item => item.body);
  if (!explicit.length) return { estatePlan, explicitBodies: [] };

  const existing = new Set(estatePlan.route.map(item => item.id));
  const additions = explicit
    .filter(item => !existing.has(item.body.id))
    .map(item => ({
      order: 0,
      id: item.body.id,
      name: item.body.name,
      category: item.body.category,
      family: item.body.family,
      score: Number.MAX_SAFE_INTEGER,
      reasons: [`explicit-natural-operator:${item.word}`],
      role: item.body.role
    }));

  const route = [...additions, ...estatePlan.route].map((item, index) => ({ ...item, order: index + 1 }));
  return {
    estatePlan: { ...estatePlan, route },
    explicitBodies: explicit.map(item => ({ word: item.word, id: item.body.id, name: item.body.name }))
  };
}

export function naturalRoutingQuery(sourceOrPlan) {
  const plan = asPlan(sourceOrPlan);
  const operators = [...new Set(collectOperators(plan.ast))];
  const hints = [...new Set(operators.flatMap(word => OPERATOR_HINTS[word] ?? []))];
  return {
    source: plan.source,
    operators,
    hints,
    query: [plan.source, ...hints].join(' ').trim()
  };
}

export function planNaturalEstateRoute(sourceOrPlan, registry, options = {}) {
  const validation = validateRegistry(registry);
  need(validation.valid, 'NOL_ROUTE_REGISTRY_INVALID', `Sovereign registry invalid: ${validation.failures.join(', ')}`);
  const plan = asPlan(sourceOrPlan);
  const routing = naturalRoutingQuery(plan);
  const rankedPlan = planEstateRoute(routing.query, registry, options);
  const custody = preserveOperatorCustody(rankedPlan, routing.operators, registry);
  const estatePlan = custody.estatePlan;
  return {
    type: 'JM.NaturalOperationalEstateRoute.v0.1',
    naturalSource: plan.source,
    naturalPlanDigest: plan.digest,
    operators: routing.operators,
    explicitOperatorBodies: custody.explicitBodies,
    inferredRouteHints: routing.hints,
    estatePlan,
    laws: [
      'NATURAL_LANGUAGE_FRONT_DOOR',
      'EXPLICIT_OPERATOR_CUSTODY',
      'IDENTITY_PRESERVED',
      'SOURCE_AUTHORITY_REQUIRED',
      'TRACE_REQUIRED',
      'DING_REQUIRED',
      'NO_SUPREME_BODY'
    ],
    digest: digest({ planDigest: plan.digest, route: estatePlan.route, hints: routing.hints, explicit: custody.explicitBodies })
  };
}
