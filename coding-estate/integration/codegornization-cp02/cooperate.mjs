import { stable, digest, need } from './donors/native-core.mjs';

// A pure sequential cooperation runner. Bodies own their parsers and executors;
// a plan owns only argument mapping. No ambient state or executable input packets.
export function cooperate(adapters, plan, input) {
  const values = Object.create(null), trace = [];
  for (const step of plan) {
    need(!Object.hasOwn(values, step.id), 'DUPLICATE_STEP');
    need(Object.hasOwn(adapters, step.body), 'UNKNOWN_BODY');
    const args = step.args(structuredClone(input), structuredClone(values));
    const output = adapters[step.body](...args);
    values[step.id] = structuredClone(output);
    trace.push({step:step.id, body:step.body, args, output:structuredClone(output)});
  }
  return {values, trace, traceDigest:digest(trace)};
}
export function equal(a,b) { return stable(a) === stable(b); }
