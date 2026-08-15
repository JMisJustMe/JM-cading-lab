import assert from 'node:assert/strict';
import { NaturalWordbookV06 } from './wordbook.mjs';

function throwsCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

const room = new NaturalWordbookV06();

const before = room.run(';unseal; door');
assert.equal(before.result.kind, 'unbound-operational-word');
assert.equal(before.receipt.changed, false);

const unseal = room.define('unseal', { as: 'open', description: 'Open without replacing the ordinary word-body.' });
assert.equal(unseal.canonical, 'open');
const opened = room.run(';unseal; door');
assert.equal(opened.state.entities.door.state.open, true);

room.define('seal', { as: 'close' });
room.define('park', { as: 'move' });
room.define('steady', { as: 'hold' });

const customComposition = room.run(';seal; door ;and; ;steady.lock; crate');
assert.equal(customComposition.state.entities.door.state.open, false);
assert.equal(customComposition.state.entities.crate.state.held, true);
assert.equal(customComposition.state.entities.crate.state.locked, true);
assert.equal(customComposition.state.relations.at(-1).merge, false);

const contextual = room.run(';park; it to there', { it: 'chair', there: 'kitchen' });
assert.equal(contextual.state.entities.chair.state.location, 'kitchen');

const snapshot = room.exportWordbook();
assert.equal(snapshot.definitions.length, 4);
const imported = new NaturalWordbookV06();
const importedSnapshot = imported.importWordbook(snapshot);
assert.equal(importedSnapshot.digest, snapshot.digest);
assert.equal(imported.run(';unseal; hatch').state.entities.hatch.state.open, true);

const tampered = structuredClone(snapshot);
tampered.definitions[0].canonical = 'close';
throwsCode(() => new NaturalWordbookV06().importWordbook(tampered), 'NOL_V06_WORDBOOK_DIGEST_MISMATCH');
throwsCode(() => room.define('recorp', { as: 'open' }), 'NOL_V06_RESERVED_WORD');
throwsCode(() => room.define('unseal', { as: 'open' }), 'NOL_V06_WORD_EXISTS');
throwsCode(() => room.define('spark', { as: 'invented' }), 'NOL_V06_UNKNOWN_CANONICAL_ROLE');

const undoBefore = JSON.stringify(room.state);
room.run(';unseal; window');
assert.equal(room.state.entities.window.state.open, true);
const undone = room.undo();
assert.equal(undone.changed, true);
assert.equal(JSON.stringify(room.state), undoBefore);

const receipt = room.receipt();
assert.equal(receipt.wordCount, 4);
assert.ok(receipt.digest);

console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Bounce v0.6', checks: 16, wordbookDigest: snapshot.digest }));
