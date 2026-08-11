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
  const estatePlan = planEstateRoute(routing.query, registry, options);
  return {
    type: 'JM.NaturalOperationalEstateRoute.v0.1',
    naturalSource: plan.source,
    naturalPlanDigest: plan.digest,
    operators: routing.operators,
    inferredRouteHints: routing.hints,
    estatePlan,
    laws: [
      'NATURAL_LANGUAGE_FRONT_DOOR',
      'IDENTITY_PRESERVED',
      'SOURCE_AUTHORITY_REQUIRED',
      'TRACE_REQUIRED',
      'DING_REQUIRED',
      'NO_SUPREME_BODY'
    ],
    digest: digest({ planDigest: plan.digest, route: estatePlan.route, hints: routing.hints })
  };
}
