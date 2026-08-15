import assert from 'node:assert/strict';
import { ActivatedPhraseSessionV07, compileActivatedPhrase } from './phrase-activation.mjs';

function throwsCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

const compiled = compileActivatedPhrase('Open door, and close window.', [
  { word: 'open' },
  { word: 'and' },
  { word: 'close' }
]);
assert.equal(compiled.markedSource, ';Open; door, ;and; ;close; window.');

const room = new ActivatedPhraseSessionV07();
const run = room.runPhrase('open door and close window', [
  { word: 'open' },
  { word: 'and' },
  { word: 'close' }
]);
assert.equal(run.state.entities.door.state.open, true);
assert.equal(run.state.entities.window.state.open, false);
assert.equal(run.state.relations.length, 1);
assert.equal(run.state.relations[0].merge, false);

room.define('unseal', { as: 'open' });
room.define('park', { as: 'move' });
const custom = room.runPhrase('unseal hatch and park chair to there', [
  { word: 'unseal' },
  { word: 'and' },
  { word: 'park' }
], { there: 'studio' });
assert.equal(custom.state.entities.hatch.state.open, true);
assert.equal(custom.state.entities.chair.state.location, 'studio');

const payload = room.runPhrase('move crate', [
  { word: 'move', payload: { to: 'vault' } }
]);
assert.equal(payload.state.entities.crate.state.location, 'vault');

const inspect = room.runPhrase('open cabinet', [{ word: 'open', modifier: '?' }]);
assert.equal(inspect.run.result.kind, 'inspection');
assert.equal(inspect.receipt.changed, false);

const recorp = room.runPhrase('RECORP shards', [{ word: 'recorp', modifier: '!' }]);
assert.equal(recorp.run.result.kind, 'native-recorp');
assert.equal(recorp.state.bodies.shards.state, 'grouped');

const repeated = compileActivatedPhrase('open door then open window', [{ word: 'open', occurrence: 2 }]);
assert.equal(repeated.markedSource, 'open door then ;open; window');

throwsCode(() => compileActivatedPhrase('open door', [{ word: 'open' }, { word: 'open' }]), 'NOL_V07_DUPLICATE_ACTIVATION');
throwsCode(() => compileActivatedPhrase('open door', [{ word: 'close' }]), 'NOL_V07_ACTIVATION_NOT_FOUND');
throwsCode(() => compileActivatedPhrase(';open; door', [{ word: 'open' }]), 'NOL_V07_EXPECTS_UNMARKED_PHRASE');
throwsCode(() => compileActivatedPhrase('open door', [{ word: 'open', modifier: '^' }]), 'NOL_V07_BAD_MODIFIER');

const beforeUndo = JSON.stringify(room.state);
room.runPhrase('close hatch', [{ word: 'close' }]);
assert.equal(room.state.entities.hatch.state.open, false);
room.undo();
assert.equal(JSON.stringify(room.state), beforeUndo);

assert.ok(room.receipt().digest);
console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Bounce v0.7', checks: 17, compiled: compiled.markedSource }));
