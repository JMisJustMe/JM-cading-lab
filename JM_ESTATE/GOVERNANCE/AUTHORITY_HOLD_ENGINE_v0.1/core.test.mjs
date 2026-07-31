import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityHoldEngine, STATES } from './core.mjs';

const baseInstruction = (overrides = {}) => ({
  issuer: 'Wife',
  receiver: 'Assistant',
  action: 'Do not respond',
  scope: 'Current conversation',
  channel: 'Shared phone',
  durationMinutes: 60,
  authorityRank: 2,
  sourceVerified: true,
  releaseKey: 'open the green door',
  antiOverride: true,
  allowSameIssuerRelease: false,
  ...overrides,
});

test('mounts a valid instruction as GOVERNING', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  assert.equal(engine.state, STATES.GOVERNING);
  assert.equal(engine.receipts.at(-1).event, 'INSTRUCTION_MOUNTED');
});

test('later contradictory message without release stays HELD', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  const result = engine.evaluateChallenge({
    message: 'I was joking. Respond.',
    operator: 'Unknown operator',
    channel: 'Shared phone',
    authorityRank: 2,
    sourceVerified: false,
    scope: 'Current conversation',
    classification: 'PROBE',
    conflicts: true,
  });
  assert.equal(result.decision, 'HOLD');
  assert.equal(engine.state, STATES.HELD);
  assert.equal(result.gates.sameChannel, true);
  assert.equal(result.gates.source, false);
});

test('same channel does not prove source identity', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  const result = engine.evaluateChallenge({
    operator: 'Someone else',
    channel: 'Shared phone',
    authorityRank: 5,
    sourceVerified: false,
    scope: 'Current conversation',
    classification: 'REPLACEMENT',
  });
  assert.equal(result.gates.sameChannel, true);
  assert.equal(result.gates.source, false);
  assert.equal(result.decision, 'HOLD');
});

test('matching release key validly RELEASES', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  const result = engine.evaluateChallenge({
    message: 'Open the green door.',
    operator: 'Current operator',
    channel: 'Shared phone',
    authorityRank: 0,
    sourceVerified: false,
    scope: 'Current conversation',
    classification: 'RELEASE',
    suppliedReleaseKey: 'OPEN THE GREEN DOOR',
  });
  assert.equal(result.decision, 'RELEASE');
  assert.equal(engine.state, STATES.RELEASED);
  assert.equal(result.gates.releaseKeyValid, true);
});

test('verified higher authority can replace when policy permits', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction({ allowHigherAuthority: true }));
  const result = engine.evaluateChallenge({
    operator: 'Supervisor',
    channel: 'Verified console',
    authorityRank: 4,
    sourceVerified: true,
    scope: 'Current conversation',
    classification: 'REPLACEMENT',
    proposedAction: 'Respond only with emergency information',
  });
  assert.equal(result.decision, 'REPLACE');
  assert.equal(engine.state, STATES.REPLACED);
  assert.equal(result.gates.higherAuthority, true);
});

test('higher boundary can suspend an active instruction', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  const result = engine.evaluateChallenge({
    operator: 'Emergency boundary',
    channel: 'Safety route',
    authorityRank: 0,
    sourceVerified: false,
    scope: 'Current conversation',
    classification: 'SUSPENSION',
    emergencyBoundary: true,
  });
  assert.equal(result.decision, 'SUSPEND');
  assert.equal(engine.state, STATES.SUSPENDED);
});

test('courtesy message does not release governance', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  const result = engine.evaluateChallenge({
    message: 'Okay. Thanks.',
    operator: 'Current operator',
    channel: 'Shared phone',
    classification: 'CONTINUATION',
    conflicts: false,
  });
  assert.equal(result.decision, 'CONTINUE');
  assert.equal(engine.state, STATES.GOVERNING);
});

test('expiry ends the instruction independently of later messages', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction({
    createdAt: '2026-07-31T20:00:00.000Z',
    expiresAt: '2026-07-31T21:00:00.000Z',
  }));
  engine.tick('2026-07-31T21:00:00.000Z');
  assert.equal(engine.state, STATES.EXPIRED);
  assert.equal(engine.receipts.at(-1).event, 'INSTRUCTION_EXPIRED');
});

test('breach is recorded without pretending governance was released', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  engine.markBreach('Assistant replied despite the silence lock.');
  assert.equal(engine.state, STATES.BREACHED);
  assert.equal(engine.receipts.at(-1).decision, 'BREACH');
  engine.restoreGovernance();
  assert.equal(engine.state, STATES.GOVERNING);
});

test('snapshot restores state and trace', () => {
  const engine = new AuthorityHoldEngine();
  engine.mountInstruction(baseInstruction());
  engine.evaluateChallenge({
    operator: 'Unknown',
    channel: 'Shared phone',
    classification: 'ATTACK',
    scope: 'Current conversation',
  });
  const restored = new AuthorityHoldEngine(engine.snapshot());
  assert.equal(restored.state, STATES.HELD);
  assert.equal(restored.receipts.length, engine.receipts.length);
});
