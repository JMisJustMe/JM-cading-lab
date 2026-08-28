import assert from 'node:assert/strict';
import { JMLogic } from '../../../sovereign-ten/direct/language-native.mjs';

const source = `
rule PreserveDifference {
  when left.id != right.id
  then relation.comparable = true
  recover {
    relation.comparable = false
  }
}
rule TraceChangedRelation {
  when relation.comparable == true
  then trace.changed = true
  recover {
    trace.changed = false
  }
}
`;

const ast = JMLogic.parse(source);
const ir = JMLogic.lower(ast);
assert.equal(ast.rules.length, 2);
assert.equal(ir.graphs[0].recoveryNodes.length, 1);

const different = JMLogic.execute(source, { left: { id: 'A' }, right: { id: 'B' } }).runtime;
assert.equal(different.state.relation.comparable, true);
assert.equal(different.state.trace.changed, true);
assert.deepEqual(different.decisions.map(x => x.matched), [true, true]);

const same = JMLogic.execute(source, { left: { id: 'A' }, right: { id: 'A' } }).runtime;
assert.equal(same.state.relation.comparable, false);
assert.equal(same.state.trace.changed, false);
assert.deepEqual(same.decisions.map(x => x.matched), [false, false]);

const repeat = JMLogic.execute(source, { left: { id: 'A' }, right: { id: 'B' } }).runtime;
assert.deepEqual(different.state, repeat.state);
assert.deepEqual(different.decisions, repeat.decisions);

console.log(JSON.stringify({
  schema: 'jm.jmlogic.source-aware-smoke/1.0',
  historicalRecoveryClaim: false,
  checks: 9,
  status: 'PASS'
}, null, 2));
