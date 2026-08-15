import assert from 'node:assert/strict';
import { NaturalOperationalRecoverableWorkspaceV20, ROOM_SCHEMA_V20 } from './recoverable-workspace.mjs';

function throwsCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

const room = new NaturalOperationalRecoverableWorkspaceV20({ roomName: 'Bounce Lab' });
assert.equal(room.roomName, 'Bounce Lab');
assert.equal(room.cursor, 0);
assert.equal(room.log.length, 0);

room.setDraft({
  phrase: 'open door and move chair to there',
  activations: [{ word: 'open' }, { word: 'and' }, { word: 'move' }],
  bindings: { there: 'studio' },
  options: {}
});

const preview = room.previewPhrase(room.draft.phrase, room.draft.activations, room.draft.bindings);
assert.equal(preview.committed, false);
assert.equal(preview.diff.changed, true);
assert.equal(preview.after.entities.door.state.open, true);
assert.equal(preview.after.entities.chair.state.location, 'studio');
assert.equal(room.state.entities?.door, undefined);
assert.equal(room.log.length, 0);

const first = room.runPhrase(room.draft.phrase, room.draft.activations, room.draft.bindings);
assert.equal(first.committed, true);
assert.equal(room.state.entities.door.state.open, true);
assert.equal(room.state.entities.chair.state.location, 'studio');
assert.equal(room.state.relations.at(-1).word, 'and');
assert.equal(room.cursor, 1);

room.defineWord('unseal', { as: 'open' });
const authored = room.runPhrase('unseal hatch then close door', [
  { word: 'unseal' }, { word: 'then' }, { word: 'close' }
]);
assert.equal(authored.committed, true);
assert.equal(room.state.entities.hatch.state.open, true);
assert.equal(room.state.entities.door.state.open, false);
assert.equal(room.wordbook().definitions.some(item => item.word === 'unseal'), true);
assert.equal(room.cursor, 3);

const checkpoint = room.checkpoint('Working three');
assert.equal(checkpoint.cursor, 3);
assert.ok(checkpoint.digest);

const beforeChoiceLog = room.log.length;
const pending = room.runPhrase('open alpha or close beta', [
  { word: 'open' }, { word: 'or' }, { word: 'close' }
]);
assert.equal(pending.committed, false);
assert.equal(pending.receipt.status, 'choice-required');
assert.equal(room.log.length, beforeChoiceLog);

const chosen = room.runPhrase('open alpha or close beta', [
  { word: 'open' }, { word: 'or' }, { word: 'close' }
], {}, { choice: 'right' });
assert.equal(chosen.committed, true);
assert.equal(room.state.entities.alpha, undefined);
assert.equal(room.state.entities.beta.state.open, false);
assert.equal(room.cursor, 4);

const undo = room.undo();
assert.equal(undo.changed, true);
assert.equal(room.cursor, 3);
assert.equal(room.state.entities.beta, undefined);
const redo = room.redo();
assert.equal(redo.changed, true);
assert.equal(room.cursor, 4);
assert.equal(room.state.entities.beta.state.open, false);

room.restoreCheckpoint('Working three');
assert.equal(room.cursor, 3);
assert.equal(room.state.entities.beta, undefined);
assert.equal(room.state.entities.hatch.state.open, true);

const futureLength = room.log.length;
room.runPhrase('open vault', [{ word: 'open' }]);
assert.equal(room.cursor, 4);
assert.equal(room.log.length, 4);
assert.equal(futureLength, 4);
assert.equal(room.state.entities.beta, undefined);
assert.equal(room.state.entities.vault.state.open, true);
assert.equal(room.history().every(item => item.status === 'applied'), true);

const portable = room.portableFromPhrase('open vault then move chair', [
  { word: 'open' }, { word: 'then' }, { word: 'move', payload: { to: 'stage' } }
]);
assert.equal(portable.ir.schema, 'JM.NaturalOperationalPortableIR.v0.9');
assert.ok(portable.ir.operations.length >= 3);

const packageBeforeContact = room.exportRoom();
assert.equal(packageBeforeContact.schema, ROOM_SCHEMA_V20);
assert.equal(packageBeforeContact.roomName, 'Bounce Lab');
assert.equal('sessionGrants' in packageBeforeContact, false);
assert.equal('transientContacts' in packageBeforeContact, false);
assert.ok(packageBeforeContact.digest);

throwsCode(() => room.contact('RECORP! shards', 'recorp'), 'NOL_V20_EXPLICIT_GRANT_REQUIRED');
room.grant('recorp');
const contact = room.contact('RECORP! shards', 'recorp');
assert.equal(contact.result.contact.contact.changed, true);
assert.equal(contact.after.bodies.shards.state, 'grouped');
assert.equal(room.state.bodies?.shards, undefined);
assert.equal(room.exportRoom().digest, packageBeforeContact.digest);
assert.equal(room.receipt().transientContactDigests.length, 1);
room.revoke('recorp');
throwsCode(() => room.contact('RECORP! shards', 'recorp'), 'NOL_V20_EXPLICIT_GRANT_REQUIRED');

const exported = room.exportRoom();
const recovered = new NaturalOperationalRecoverableWorkspaceV20({ roomName: 'Other' });
const recovery = recovered.importRoom(exported);
assert.equal(recovered.roomName, 'Bounce Lab');
assert.deepEqual(recovered.state, room.state);
assert.equal(recovered.wordbook().digest, room.wordbook().digest);
assert.deepEqual(recovered.draft, room.draft);
assert.equal(recovered.exportRoom().digest, exported.digest);
assert.equal(recovery.room.digest, exported.digest);
assert.equal(recovered.receipt().activeSessionGrants.length, 0);
assert.equal(recovered.receipt().transientContactDigests.length, 0);

const tampered = structuredClone(exported);
tampered.roomName = 'Tampered';
throwsCode(() => new NaturalOperationalRecoverableWorkspaceV20().importRoom(tampered), 'NOL_V20_ROOM_DIGEST');

const tamperedCommand = structuredClone(exported);
tamperedCommand.log[0].args.phrase = 'close door';
const { digest: _ignored, ...bodyWithoutDigest } = tamperedCommand;
// Deliberately update only the outer package digest: inner command custody must still catch the edit.
import { digest } from '../../sovereign-ten/direct/native-core.mjs';
tamperedCommand.digest = digest(bodyWithoutDigest);
throwsCode(() => new NaturalOperationalRecoverableWorkspaceV20().importRoom(tamperedCommand), 'NOL_V20_ROOM_COMMAND_DIGEST');

const receipt = room.receipt();
assert.equal(receipt.schema, 'JM.NaturalOperationalRecoverableWorkspaceReceipt.v2.0');
assert.equal(receipt.logLength, 4);
assert.ok(receipt.roomDigest);
assert.ok(receipt.digest);

console.log(JSON.stringify({
  status: 'PASS',
  suite: 'JM Natural Operational Language Recoverable Workspace v2.0',
  checks: 47,
  roomDigest: receipt.roomDigest,
  workspaceReceipt: receipt.digest
}));
