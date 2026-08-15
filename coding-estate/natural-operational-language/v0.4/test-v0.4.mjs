import assert from 'node:assert/strict';
import { makeOwnerSessionGrant } from '../v0.3/sovereign-contact-v0.3.mjs';
import { contactSovereignFederation, preflightFederation } from './federation-contact.mjs';

function expectCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code}`);
  assert.equal(caught.code, code);
}

const recorpGrant = makeOwnerSessionGrant({ bodyId: 'recorp', session: 'v0.4-test' });
const flowGrant = makeOwnerSessionGrant({ bodyId: 'flowtalk', session: 'v0.4-test' });
const initial = { bodies: { shards: { parts: ['left', 'right'], state: 'scattered' } } };

// 1. Preflight keeps selection explicit and ordered.
{
  const preflight = preflightFederation({ source: 'RECORP! it', contacts: [{ bodyId: 'recorp', grant: recorpGrant }, { bodyId: 'flowtalk', grant: flowGrant }], context: { refs: { it: 'shards' } } });
  assert.deepEqual(preflight.bodyIds, ['recorp', 'flowtalk']);
}

// 2. Missing grant fails before any execution.
{
  expectCode(() => preflightFederation({ source: 'RECORP! shards', contacts: [{ bodyId: 'recorp' }] }), 'NOL_V02_PERMISSION_REQUIRED');
}

// 3. Unsupported body fails at preflight rather than fake-running.
{
  const grant = makeOwnerSessionGrant({ bodyId: 'jm-gamecore', session: 'v0.4-test' });
  expectCode(() => preflightFederation({ source: ';open; door', contacts: [{ bodyId: 'jm-gamecore', grant }] }), 'NOL_V04_ADAPTER_MISSING');
}

// 4. Duplicate body selection is rejected for first federation pass.
{
  expectCode(() => preflightFederation({ source: 'RECORP! shards', contacts: [{ bodyId: 'recorp', grant: recorpGrant }, { bodyId: 'recorp', grant: recorpGrant }] }), 'NOL_V04_DUPLICATE_BODY');
}

// 5. Isolated mode preserves shared final state while each body receives its own copy.
{
  const fed = contactSovereignFederation({ source: 'RECORP! it', contacts: [{ bodyId: 'recorp', grant: recorpGrant }, { bodyId: 'flowtalk', grant: flowGrant }], state: initial, context: { refs: { it: 'shards' } }, stateMode: 'isolated' });
  assert.equal(fed.contacts[0].contact.contact.contact.after.bodies.shards.state, 'grouped');
  assert.equal(fed.finalState.bodies.shards.state, 'scattered');
  assert.equal(fed.receipt.merge, false);
  assert.equal(fed.receipt.identitiesPreserved, true);
}

// 6. Carry-forward mode carries explicit state change into the federation result.
{
  const fed = contactSovereignFederation({ source: 'RECORP! it', contacts: [{ bodyId: 'recorp', grant: recorpGrant }, { bodyId: 'flowtalk', grant: flowGrant }], state: initial, context: { refs: { it: 'shards' } }, stateMode: 'carry-forward' });
  assert.equal(fed.finalState.bodies.shards.state, 'grouped');
  assert.equal(fed.contacts[1].inputStateDigest, fed.contacts[0].outputStateDigest);
}

// 7. Contact order is preserved rather than score-ranked.
{
  const fed = contactSovereignFederation({ source: 'RECORP? it', contacts: [{ bodyId: 'flowtalk', grant: flowGrant }, { bodyId: 'recorp', grant: recorpGrant }], state: initial, context: { refs: { it: 'shards' } } });
  assert.deepEqual(fed.contacts.map(item => item.bodyId), ['flowtalk', 'recorp']);
}

// 8. Context remains explicit inside federation.
{
  expectCode(() => contactSovereignFederation({ source: 'RECORP! it', contacts: [{ bodyId: 'recorp', grant: recorpGrant }], state: initial }), 'NOL_V03_CONTEXT_UNBOUND');
}

// 9. Invalid state mode is refused.
{
  expectCode(() => preflightFederation({ source: 'RECORP! shards', contacts: [{ bodyId: 'recorp', grant: recorpGrant }], stateMode: 'mush' }), 'NOL_V04_STATE_MODE');
}

// 10. Federation receipt carries one receipt per body and no body identity collapse.
{
  const fed = contactSovereignFederation({ source: 'RECORP! it', contacts: [{ bodyId: 'recorp', grant: recorpGrant }, { bodyId: 'flowtalk', grant: flowGrant }], state: initial, context: { refs: { it: 'shards' } } });
  assert.equal(fed.receipt.contactReceipts.length, 2);
  assert.equal(new Set(fed.receipt.bodyIds).size, 2);
  assert.equal(fed.laws.includes('NO_ROUTE_SCORE_AUTO_EXECUTION'), true);
}

console.log(JSON.stringify({ status: 'PASS', suite: 'JM Natural Operational Language Bounce v0.4', checks: 10 }));
