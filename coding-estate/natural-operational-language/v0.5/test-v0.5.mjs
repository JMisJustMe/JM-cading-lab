import assert from 'node:assert/strict';
import { CreatorRoomSessionV05, contextFromRoomBindings } from './room-controller.mjs';

function expectCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

// 1. Room bindings stay explicit and small.
{
  const context = contextFromRoomBindings({ it: 'door', that: 'window', there: 'kitchen', blank: '' });
  assert.deepEqual(context.refs, { it: 'door', that: 'window' });
  assert.deepEqual(context.places, { there: 'kitchen' });
}

// 2. Contextual natural run changes visible room state.
{
  const room = new CreatorRoomSessionV05();
  room.run(';open; it', { it: 'door' });
  assert.equal(room.state.entities.door.state.open, true);
}

// 3. Undo is still whole-run atomic.
{
  const room = new CreatorRoomSessionV05();
  const before = JSON.stringify(room.state);
  room.run('(;open; it ;and; ;close; that) ;and; ;move; chair to there', { it: 'door', that: 'window', there: 'kitchen' });
  room.undo();
  assert.equal(JSON.stringify(room.state), before);
}

// 4. Direct contact cannot happen without an explicit creator-room grant.
{
  const room = new CreatorRoomSessionV05({ state: { bodies: { shards: { parts: [], state: 'scattered' } } } });
  expectCode(() => room.contact('RECORP! it', 'recorp', { it: 'shards' }), 'NOL_V05_EXPLICIT_GRANT_REQUIRED');
}

// 5. Granted direct RECORP contact can update the room state.
{
  const room = new CreatorRoomSessionV05({ state: { bodies: { shards: { parts: ['left', 'right'], state: 'scattered' } } } });
  room.grant('recorp');
  room.contact('RECORP! it', 'recorp', { it: 'shards' });
  assert.equal(room.state.bodies.shards.state, 'grouped');
}

// 6. Revocation removes future direct contact.
{
  const room = new CreatorRoomSessionV05({ state: { bodies: { shards: { parts: [], state: 'scattered' } } } });
  room.grant('recorp');
  assert.equal(room.revoke('recorp'), true);
  expectCode(() => room.contact('RECORP! shards', 'recorp'), 'NOL_V05_EXPLICIT_GRANT_REQUIRED');
}

// 7. Explicit federation keeps identities and can carry state when requested.
{
  const room = new CreatorRoomSessionV05({ state: { bodies: { shards: { parts: ['a', 'b'], state: 'scattered' } } } });
  room.grant('recorp');
  room.grant('flowtalk');
  const fed = room.federate('RECORP! it', ['recorp', 'flowtalk'], { it: 'shards' }, { stateMode: 'carry-forward' });
  assert.equal(fed.receipt.merge, false);
  assert.equal(room.state.bodies.shards.state, 'grouped');
}

// 8. Isolated federation does not silently mutate creator-room state.
{
  const room = new CreatorRoomSessionV05({ state: { bodies: { shards: { parts: ['a'], state: 'scattered' } } } });
  room.grant('recorp');
  room.grant('flowtalk');
  room.federate('RECORP! it', ['recorp', 'flowtalk'], { it: 'shards' }, { stateMode: 'isolated' });
  assert.equal(room.state.bodies.shards.state, 'scattered');
}

// 9. Session receipt shows explicit grants and events without pretending crown status.
{
  const room = new CreatorRoomSessionV05();
  room.grant('flowtalk');
  room.run(';glimmer; it', { it: 'room' });
  const receipt = room.receipt();
  assert.deepEqual(receipt.grants, ['flowtalk']);
  assert.equal(receipt.events.length >= 2, true);
}

console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Bounce v0.5', checks: 9 }));
