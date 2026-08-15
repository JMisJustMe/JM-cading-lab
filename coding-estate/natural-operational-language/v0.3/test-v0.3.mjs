import assert from 'node:assert/strict';
import { ContextualBounceV03 } from './context-room.mjs';
import { contactContextualSovereignBody, makeOwnerSessionGrant } from './sovereign-contact-v0.3.mjs';

function expectCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

// 1. Bound pronoun resolves and acts.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';open; it', { refs: { it: 'door' } });
  assert.equal(run.state.entities.door.state.open, true);
  assert.equal(run.plan.resolutions.some(item => item.kind === 'body-ref' && item.to === 'door'), true);
}

// 2. Context references are never guessed.
{
  const room = new ContextualBounceV03();
  expectCode(() => room.plan(';open; it', {}), 'NOL_V03_CONTEXT_UNBOUND');
}

// 3. Ambiguous bindings must be resolved by the room/owner first.
{
  const room = new ContextualBounceV03();
  expectCode(() => room.plan(';open; it', { refs: { it: ['door', 'window'] } }), 'NOL_V03_CONTEXT_AMBIGUOUS');
}

// 4. Aliases can carry an explicit reference into the body registry/state route.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';hold; this', { refs: { this: 'front' }, aliases: { front: 'door' } });
  assert.equal(run.state.entities.door.state.held, true);
}

// 5. Natural move phrase resolves a contextual destination.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';move; chair to there', { places: { there: 'kitchen' } });
  assert.equal(run.state.entities.chair.state.location, 'kitchen');
}

// 6. Trailing natural locative is also accepted when explicitly bound.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';move; chair there', { places: { there: 'studio' } });
  assert.equal(run.state.entities.chair.state.location, 'studio');
}

// 7. Existing payload form remains valid and can itself use a contextual place.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';move(to=there); chair', { places: { there: 'vault' } });
  assert.equal(run.state.entities.chair.state.location, 'vault');
}

// 8. Two-sided custody survives contextual resolution.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';open; it ;and; ;close; that', { refs: { it: 'door', that: 'window' } });
  assert.equal(run.state.entities.door.state.open, true);
  assert.equal(run.state.entities.window.state.open, false);
  assert.equal(run.state.relations.at(-1).merge, false);
  assert.equal(run.state.relations.at(-1).identityPolicy, 'preserve-sides');
}

// 9. v0.2 grouping law still wins; context does not make ambiguity acceptable.
{
  const room = new ContextualBounceV03();
  expectCode(
    () => room.plan(';open; it ;and; ;close; that ;and; ;hold; them', { refs: { it: 'door', that: 'window', them: 'shards' } }),
    'NOL_V02_GROUPING_REQUIRED'
  );
}

// 10. Explicit grouping executes atomically and undo returns to the whole pre-run state.
{
  const room = new ContextualBounceV03();
  const before = JSON.stringify(room.state);
  room.execute('(;open; it ;and; ;close; that) ;and; ;hold; them', { refs: { it: 'door', that: 'window', them: 'shards' } });
  const undone = room.undo();
  assert.equal(undone.changed, true);
  assert.equal(JSON.stringify(undone.state), before);
}

// 11. Unknown operational words remain unbound even when their target is context-resolved.
{
  const room = new ContextualBounceV03();
  const run = room.execute(';glimmer; it', { refs: { it: 'room' } });
  assert.equal(run.result.kind, 'unbound-operational-word');
  assert.equal(run.receipt.changed, false);
}

// 12. Inspect remains non-mutating after contextual resolution.
{
  const room = new ContextualBounceV03();
  const before = JSON.stringify(room.state);
  const run = room.execute(';open?; it', { refs: { it: 'door' } });
  assert.equal(run.receipt.changed, false);
  assert.equal(JSON.stringify(room.state), before);
}

// 13. Alias cycles are rejected instead of looping.
{
  const room = new ContextualBounceV03();
  expectCode(() => room.plan(';open; it', { refs: { it: 'a' }, aliases: { a: 'b', b: 'a' } }), 'NOL_V03_ALIAS_CYCLE');
}

// 14. Contextual RECORP can contact the real RECORP adapter only with explicit grant.
{
  const state = { bodies: { shards: { parts: ['left', 'right'], state: 'scattered' } } };
  const grant = makeOwnerSessionGrant({ bodyId: 'recorp', session: 'v0.3-test' });
  const contacted = contactContextualSovereignBody({ source: 'RECORP! it', targetBody: 'recorp', grant, state, context: { refs: { it: 'shards' } } });
  assert.equal(contacted.concreteSource, 'RECORP! shards');
  assert.equal(contacted.contact.contact.contactKind, 'direct-native-recorp');
  assert.equal(contacted.contact.contact.after.bodies.shards.state, 'grouped');
}

// 15. Context does not grant permission by implication.
{
  const state = { bodies: { shards: { parts: [], state: 'scattered' } } };
  expectCode(
    () => contactContextualSovereignBody({ source: 'RECORP! it', targetBody: 'recorp', state, context: { refs: { it: 'shards' } } }),
    'NOL_V02_PERMISSION_REQUIRED'
  );
}

// 16. Unsupported sovereign bodies remain unsupported even when context can resolve the source.
{
  const grant = makeOwnerSessionGrant({ bodyId: 'jm-gamecore', session: 'v0.3-test' });
  expectCode(
    () => contactContextualSovereignBody({ source: ';open; it', targetBody: 'jm-gamecore', grant, context: { refs: { it: 'door' } } }),
    'NOL_V02_CONTACT_ADAPTER_MISSING'
  );
}

console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Bounce v0.3', checks: 16 }));
