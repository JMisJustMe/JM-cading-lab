import assert from 'node:assert/strict';
import { BounceSpine, parseNaturalOperational } from './bounce-spine.mjs';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('marking gives an ordinary word operational standing and visible consequence', () => {
  const spine = new BounceSpine();
  const run = spine.execute(';open; door');
  assert.equal(run.result.standing.operational, true);
  assert.equal(run.result.standing.word, 'open');
  assert.equal(run.state.entities.door.state.open, true);
  assert.equal(run.receipt.changed, true);
});

test('unknown marked word is operational but its semantics are not guessed', () => {
  const spine = new BounceSpine();
  const run = spine.execute(';glimmer; room');
  assert.equal(run.result.kind, 'unbound-operational-word');
  assert.equal(run.result.standing.operational, true);
  assert.equal(run.result.standing.evidence, 'unbound');
  assert.equal(run.receipt.changed, false);
});

test(';and; keeps two sides in accountable relation without merging them', () => {
  const spine = new BounceSpine();
  const run = spine.execute(';open; door ;and; ;close; window');
  assert.equal(run.result.kind, 'relation');
  assert.equal(run.result.relation.word, 'and');
  assert.equal(run.result.relation.merge, false);
  assert.equal(run.result.relation.identityPolicy, 'preserve-sides');
  assert.equal(run.state.entities.door.state.open, true);
  assert.equal(run.state.entities.window.state.open, false);
  assert.notEqual(run.result.relation.left.source, run.result.relation.right.source);
});

test('question mark inspects a local trial operation without changing entity state', () => {
  const spine = new BounceSpine({ state: { entities: { door: { id: 'door', state: { open: false }, trace: [] } } } });
  const before = structuredClone(spine.state);
  const run = spine.execute(';open?; door');
  assert.equal(run.result.kind, 'inspection');
  assert.deepEqual(run.state, before);
  assert.equal(run.receipt.changed, false);
});

test('RECORP pressure form delegates to the already-built sovereign RECORP body', () => {
  const spine = new BounceSpine({ state: { bodies: { shards: { parts: ['a', 'b'], state: 'scattered' } } } });
  const run = spine.execute('RECORP! shards');
  assert.equal(run.result.kind, 'native-recorp');
  assert.equal(run.state.bodies.shards.state, 'grouped');
  assert.equal(run.trace.some(event => event.event === 'native.recorp'), true);
});

test('semicolon-only RECORP changes standing but does not invent a pressure mode', () => {
  const spine = new BounceSpine({ state: { bodies: { shards: { parts: ['a'], state: 'scattered' } } } });
  const run = spine.execute(';RECORP; shards');
  assert.equal(run.result.kind, 'standing-only');
  assert.equal(run.result.standing.operational, true);
  assert.equal(run.state.bodies.shards.state, 'scattered');
});

test('move uses payload and leaves a reversible state change', () => {
  const spine = new BounceSpine();
  const run = spine.execute(';move(to=kitchen); chair');
  assert.equal(run.state.entities.chair.state.location, 'kitchen');
  const undone = spine.undo();
  assert.equal(undone.changed, true);
  assert.equal(spine.state.entities.chair, undefined);
});

test('plans can be reused and altered instead of reparsed from historical receipts', () => {
  const spine = new BounceSpine();
  const plan = spine.reuse(';open; hatch');
  spine.execute(plan);
  assert.equal(spine.state.entities.hatch.state.open, true);
  const altered = spine.alter(plan, ';close; hatch');
  spine.execute(altered);
  assert.equal(spine.state.entities.hatch.state.open, false);
});

test('FlowTalk bridge carries the natural source underneath without replacing it', () => {
  const spine = new BounceSpine();
  const plan = spine.plan(';open; door');
  const bridge = spine.flowTalkBridge(plan, { room: 'studio' });
  assert.equal(bridge.type, 'FlowTalkBridge');
  assert.equal(bridge.resolution.intent.name, 'open');
  assert.match(bridge.source, /utterance ";open; door"/);
  assert.match(bridge.source, /as intent open/);
});

test('federation envelope requests a sovereign body without claiming execution', () => {
  const spine = new BounceSpine();
  const envelope = spine.federationEnvelope(';open; door', 'FlowTalk');
  assert.equal(envelope.targetBody, 'FlowTalk');
  assert.equal(envelope.permission, 'request');
  assert.equal(envelope.laws.includes('MEET_NOT_MERGE'), true);
  assert.equal(envelope.laws.includes('DONOR_PERMISSION_REQUIRED'), true);
});

test('parser preserves plain language as plain when nothing is operationally marked', () => {
  const ast = parseNaturalOperational('open the door when you are ready');
  assert.equal(ast.type, 'PlainLanguage');
  assert.equal(ast.operational, false);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`JM_NATURAL_OPERATIONAL_LANGUAGE_BOUNCE_TESTS ${passed}/${tests.length} PASS`);
