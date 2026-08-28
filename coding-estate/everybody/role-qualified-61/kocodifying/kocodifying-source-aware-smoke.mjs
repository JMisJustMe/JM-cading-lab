import assert from 'node:assert/strict';
import { Kocodifying } from '../../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';

const base = `
cocode Pair {
  left Signal
  right Partner
  bind left.profile.score <-> right.stats.points
  conflict left
  recover rollback
}
`;

const left = { identity: 'Signal', profile: { score: 7 }, untouched: { owner: 'left' } };
const right = { identity: 'Partner', stats: { points: 2 }, untouched: { owner: 'right' } };

const leftWins = Kocodifying.execute(base, 'Pair', left, right).runtime;
assert.equal(leftWins.status, 'synced');
assert.equal(leftWins.right.stats.points, 7);
assert.equal(leftWins.left.profile.score, 7);
assert.equal(leftWins.left.identity, 'Signal');
assert.equal(leftWins.right.identity, 'Partner');
assert.equal(leftWins.left.untouched.owner, 'left');
assert.equal(leftWins.right.untouched.owner, 'right');

const rightSource = base.replace('conflict left', 'conflict right');
const rightWins = Kocodifying.execute(rightSource, 'Pair', left, right).runtime;
assert.equal(rightWins.left.profile.score, 2);
assert.equal(rightWins.right.stats.points, 2);
assert.equal(rightWins.left.identity, 'Signal');
assert.equal(rightWins.right.identity, 'Partner');

const rollbackSource = base.replace('conflict left', 'conflict reject');
const rolled = Kocodifying.execute(rollbackSource, 'Pair', left, right).runtime;
assert.equal(rolled.status, 'rolled-back');
assert.deepEqual(rolled.left, left);
assert.deepEqual(rolled.right, right);
assert.strictEqual(rolled.left, left);
assert.strictEqual(rolled.right, right);

const rejectSource = rollbackSource.replace('recover rollback', '');
let conflictCode = null;
try { Kocodifying.execute(rejectSource, 'Pair', left, right); } catch (error) { conflictCode = error.code; }
assert.equal(conflictCode, 'KOCODIFY_CONFLICT');

const repeat = Kocodifying.execute(base, 'Pair', left, right).runtime;
assert.deepEqual(leftWins.left, repeat.left);
assert.deepEqual(leftWins.right, repeat.right);
assert.deepEqual(leftWins.conflicts, repeat.conflicts);
assert.deepEqual(leftWins.trace, repeat.trace);

console.log(JSON.stringify({
  schema: 'jm.kocodifying.source-aware-smoke/1.0',
  historicalRecoveryClaim: false,
  keeper: 'CO-CODIFYING != IDENTITY COLLAPSE',
  rollbackIdentity: 'original-input-references-preserved',
  checks: 20,
  status: 'PASS'
}, null, 2));
