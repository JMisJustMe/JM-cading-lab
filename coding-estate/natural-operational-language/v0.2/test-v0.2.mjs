import assert from 'node:assert/strict';
import { BounceSpineV02, parseOperationalComposition } from './composition-spine.mjs';
import { contactSovereignBody, makeOwnerSessionGrant } from './sovereign-contact.mjs';

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || String(error?.message ?? '').includes(code));
}

const groupedSource = '(;open; door ;and; ;close; window) ;and; ;move(to=kitchen); chair';
const groupedAst = parseOperationalComposition(groupedSource);
assert.equal(groupedAst.type, 'OperationalRelation');
assert.equal(groupedAst.left.type, 'OperationalGroup');
assert.equal(groupedAst.right.type, 'OperationalLeaf');

expectCode(
  () => parseOperationalComposition(';open; door ;and; ;close; window ;and; ;hold; chest'),
  'NOL_V02_GROUPING_REQUIRED'
);

const spine = new BounceSpineV02();
const run = spine.execute(groupedSource);
assert.equal(run.state.entities.door.state.open, true);
assert.equal(run.state.entities.window.state.open, false);
assert.equal(run.state.entities.chair.state.location, 'kitchen');
assert.equal(run.state.relations.length, 2);
assert.equal(run.state.relations[0].merge, false);
assert.equal(run.state.relations[1].merge, false);
assert.equal(run.receipt.changed, true);
assert.equal(run.receipt.relationCount, 2);

const undo = spine.undo();
assert.equal(undo.changed, true);
assert.equal(Object.keys(undo.state.entities).length, 0);
assert.equal(undo.state.relations.length, 0);

const recorpState = { bodies: { shards: { parts: ['left', 'right'], state: 'scattered' } } };
expectCode(
  () => contactSovereignBody({ source: 'RECORP! shards', targetBody: 'recorp', state: recorpState }),
  'NOL_V02_PERMISSION_REQUIRED'
);

const recorpGrant = makeOwnerSessionGrant({ bodyId: 'recorp' });
const recorpContact = contactSovereignBody({
  source: 'RECORP! shards',
  targetBody: 'recorp',
  grant: recorpGrant,
  state: recorpState
});
assert.equal(recorpContact.contact.result.state.bodies.shards.state, 'grouped');
assert.equal(recorpContact.receipt.targetBody, 'recorp');
assert.equal(recorpContact.receipt.changed, true);

const wrongGrant = makeOwnerSessionGrant({ bodyId: 'flowtalk' });
expectCode(
  () => contactSovereignBody({ source: 'RECORP! shards', targetBody: 'recorp', grant: wrongGrant, state: recorpState }),
  'NOL_V02_PERMISSION_BODY_MISMATCH'
);

const flowGrant = makeOwnerSessionGrant({ bodyId: 'flowtalk' });
const flowContact = contactSovereignBody({
  source: 'open the door and keep the window readable',
  targetBody: 'flowtalk',
  grant: flowGrant,
  context: { room: 'owner-working-room' }
});
assert.equal(flowContact.contact.result.resolution.intent.name, 'operational_language');
assert.equal(flowContact.receipt.targetBody, 'flowtalk');
assert.equal(flowContact.receipt.changed, false);

const unsupportedGrant = makeOwnerSessionGrant({ bodyId: 'jm-gamecore' });
expectCode(
  () => contactSovereignBody({ source: ';open; arena', targetBody: 'jm-gamecore', grant: unsupportedGrant }),
  'NOL_V02_CONTACT_ADAPTER_MISSING'
);

console.log(JSON.stringify({
  status: 'PASS',
  groupedSource,
  relationCount: run.receipt.relationCount,
  groupingDigest: run.receipt.groupingDigest,
  recorpContact: recorpContact.receipt,
  flowTalkContact: flowContact.receipt,
  boundary: 'Multiple top-level ANDs are not guessed; direct sovereign execution requires explicit target + supported adapter + owner-session grant.'
}, null, 2));
