import assert from 'node:assert/strict';
import { NaturalOperationalCreatorSurfaceV10 } from './creator-surface.mjs';

function throwsCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

const surface = new NaturalOperationalCreatorSurfaceV10();

const first = surface.runPhrase('open door and move chair to there', [
  { word: 'open' },
  { word: 'and' },
  { word: 'move' }
], { there: 'studio' });
assert.equal(first.state.entities.door.state.open, true);
assert.equal(first.state.entities.chair.state.location, 'studio');
assert.equal(first.state.relations.at(-1).word, 'and');
assert.equal(first.state.relations.at(-1).merge, false);

surface.defineWord('unseal', { as: 'open' });
const authored = surface.runPhrase('unseal hatch then close door', [
  { word: 'unseal' },
  { word: 'then' },
  { word: 'close' }
]);
assert.equal(authored.state.entities.hatch.state.open, true);
assert.equal(authored.state.entities.door.state.open, false);
assert.equal(authored.state.relations.at(-1).word, 'then');

const beforeOr = JSON.stringify(surface.state);
const pending = surface.runPhrase('open alpha or close beta', [
  { word: 'open' },
  { word: 'or' },
  { word: 'close' }
]);
assert.equal(pending.receipt.status, 'choice-required');
assert.equal(JSON.stringify(surface.state), beforeOr);
const chosen = surface.runPhrase('open alpha or close beta', [
  { word: 'open' },
  { word: 'or' },
  { word: 'close' }
], {}, { choice: 'right' });
assert.equal(chosen.state.entities.alpha, undefined);
assert.equal(chosen.state.entities.beta.state.open, false);

const portable = surface.portableFromPhrase('open door then move chair', [
  { word: 'open' },
  { word: 'then' },
  { word: 'move', payload: { to: 'vault' } }
]);
assert.equal(portable.ir.schema, 'JM.NaturalOperationalPortableIR.v0.9');
assert.equal(portable.ir.operations.length, 3);
assert.ok(portable.ir.operations.some(item => item.op === 'relation.then'));

throwsCode(() => surface.contact('RECORP! shards', 'recorp'), 'NOL_V05_EXPLICIT_GRANT_REQUIRED');
surface.grant('recorp');
const contact = surface.contact('RECORP! shards', 'recorp');
assert.equal(contact.contact.contact.changed, true);
assert.equal(surface.state.bodies.shards.state, 'grouped');
surface.revoke('recorp');
throwsCode(() => surface.contact('RECORP! shards', 'recorp'), 'NOL_V05_EXPLICIT_GRANT_REQUIRED');

surface.grant('flowtalk');
const flow = surface.contact('keep this ordinary sentence readable', 'flowtalk');
assert.equal(flow.contact.contact.changed, false);
assert.equal(flow.targetBody, 'flowtalk');

const beforeUndo = JSON.stringify(surface.state);
surface.runPhrase('open cabinet', [{ word: 'open' }]);
assert.equal(surface.state.entities.cabinet.state.open, true);
const undone = surface.undo();
assert.equal(undone.changed, true);
assert.equal(JSON.stringify(surface.state), beforeUndo);

const receipt = surface.receipt();
assert.equal(receipt.schema, 'JM.NaturalOperationalCreatorSurfaceReceipt.v1.0');
assert.ok(receipt.digest);
assert.equal(surface.wordbook().definitions.length, 1);

console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Creator Surface v1.0', checks: 25, receipt: receipt.digest }));
