import assert from 'node:assert/strict';
import { NaturalRelationSessionV08, parseOperationalRelations } from './relation-spine.mjs';

function throwsCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

const parsed = parseOperationalRelations(';open; door ;then; ;close; window');
assert.equal(parsed.operator, 'then');
assert.equal(parsed.law.orderClaim, 'left-before-right');

const room = new NaturalRelationSessionV08();
const andRun = room.runMarked(';open; door ;and; ;close; window');
assert.equal(andRun.state.entities.door.state.open, true);
assert.equal(andRun.state.entities.window.state.open, false);
assert.equal(andRun.state.relations.at(-1).word, 'and');
assert.equal(andRun.state.relations.at(-1).merge, false);

const thenRun = room.runPhrase('open hatch then move crate', [
  { word: 'open' },
  { word: 'then' },
  { word: 'move', payload: { to: 'vault' } }
]);
assert.equal(thenRun.state.entities.hatch.state.open, true);
assert.equal(thenRun.state.entities.crate.state.location, 'vault');
assert.equal(thenRun.state.relations.at(-1).word, 'then');
assert.equal(thenRun.state.relations.at(-1).orderClaim, 'left-before-right');

const beforeChoice = JSON.stringify(room.state);
const pending = room.runMarked(';close; alpha ;or; ;open; beta');
assert.equal(pending.receipt.status, 'choice-required');
assert.equal(pending.receipt.changed, false);
assert.equal(JSON.stringify(room.state), beforeChoice);

const chooseLeft = room.runMarked(';close; alpha ;or; ;open; beta', {}, { choice: 'left' });
assert.equal(chooseLeft.state.entities.alpha.state.open, false);
assert.equal(chooseLeft.state.entities.beta, undefined);
assert.equal(chooseLeft.state.relations.at(-1).selected, 'left');
assert.equal(chooseLeft.state.relations.at(-1).merge, false);

const nestedBefore = JSON.stringify(room.state);
const nestedPending = room.runMarked('(;open; one ;then; ;close; two) ;and; (;open; three ;or; ;close; four)');
assert.equal(nestedPending.receipt.status, 'choice-required');
assert.equal(JSON.stringify(room.state), nestedBefore);

const nested = room.runMarked('(;open; one ;then; ;close; two) ;and; (;open; three ;or; ;close; four)', {}, {
  choices: { 'root.right.group': 'right' }
});
assert.equal(nested.state.entities.one.state.open, true);
assert.equal(nested.state.entities.two.state.open, false);
assert.equal(nested.state.entities.three, undefined);
assert.equal(nested.state.entities.four.state.open, false);
assert.equal(nested.state.relations.filter(item => item.word === 'then').length >= 1, true);
assert.equal(nested.state.relations.filter(item => item.word === 'or').length >= 1, true);
assert.equal(nested.state.relations.at(-1).word, 'and');

room.define('unseal', { as: 'open' });
const authored = room.runPhrase('unseal panel then close hatch', [
  { word: 'unseal' },
  { word: 'then' },
  { word: 'close' }
]);
assert.equal(authored.state.entities.panel.state.open, true);
assert.equal(authored.state.entities.hatch.state.open, false);

throwsCode(() => parseOperationalRelations(';open; a ;and; ;close; b ;then; ;open; c'), 'NOL_V08_GROUPING_REQUIRED');
throwsCode(() => room.runMarked(';open; a ;or; ;close; b', {}, { choice: 'maybe' }), 'NOL_V08_BAD_CHOICE');
throwsCode(() => parseOperationalRelations(';then; ;open; a'), 'NOL_V08_RELATION_REQUIRES_SIDES');

const preUndo = JSON.stringify(room.state);
room.runMarked(';close; panel ;then; ;open; hatch');
assert.notEqual(JSON.stringify(room.state), preUndo);
const undone = room.undo();
assert.equal(undone.changed, true);
assert.equal(JSON.stringify(room.state), preUndo);

assert.ok(room.receipt().digest);
console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Bounce v0.8', checks: 28 }));
