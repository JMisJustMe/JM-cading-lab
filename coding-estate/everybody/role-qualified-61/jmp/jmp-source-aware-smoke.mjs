import assert from 'node:assert/strict';
import { JMP } from '../../../sovereign-batch-two/direct/kading-jmp-native.mjs';

const source = `
jumpmap Outcome {
  from route.state
  case "ready" when permission.allowed == true -> "accepted" do route.next = "accepted.route"
  case "ready" -> "held" do route.next = "hold.route"
  case "stop" -> "stopped"
  else -> "fallback" do route.next = "fallback.route"
}

jumpmap Secondary {
  from mode
  case "x" -> "secondary-x"
  else -> "secondary-fallback"
}
`;

const acceptedInput = { route: { state: 'ready', existing: 'keep' }, permission: { allowed: true }, untouched: { value: 9 } };
const accepted = JMP.execute(source, 'Outcome', acceptedInput).runtime;
assert.equal(accepted.target, 'accepted');
assert.equal(accepted.state.route.next, 'accepted.route');
assert.equal(accepted.state.route.existing, 'keep');
assert.equal(accepted.state.untouched.value, 9);
assert.equal(acceptedInput.route.next, undefined);
assert.notStrictEqual(accepted.state, acceptedInput);

const held = JMP.execute(source, 'Outcome', { route: { state: 'ready' }, permission: { allowed: false } }).runtime;
assert.equal(held.target, 'held');
assert.equal(held.state.route.next, 'hold.route');

const stoppedInput = { route: { state: 'stop', marker: 3 }, permission: { allowed: false } };
const stopped = JMP.execute(source, 'Outcome', stoppedInput).runtime;
assert.equal(stopped.target, 'stopped');
assert.deepEqual(stopped.state, stoppedInput);
assert.notStrictEqual(stopped.state, stoppedInput);

const fallback = JMP.execute(source, 'Outcome', { route: { state: 'other' }, permission: { allowed: false } }).runtime;
assert.equal(fallback.target, 'fallback');
assert.equal(fallback.state.route.next, 'fallback.route');

const secondary = JMP.execute(source, 'Secondary', { mode: 'x', marker: true }).runtime;
assert.equal(secondary.target, 'secondary-x');
assert.equal(secondary.state.marker, true);

const noFallback = `
jumpmap NoFallback {
  from route.state
  case "open" -> "entered"
}
`;
let noJumpCode = null;
try { JMP.execute(noFallback, 'NoFallback', { route: { state: 'closed' } }); } catch (error) { noJumpCode = error.code; }
assert.equal(noJumpCode, 'JMP_NO_JUMP');

let unknownCode = null;
try { JMP.execute(source, 'Missing', { route: { state: 'ready' } }); } catch (error) { unknownCode = error.code; }
assert.equal(unknownCode, 'JMP_UNKNOWN_MAP');

const a = JMP.execute(source, 'Outcome', acceptedInput).runtime;
const b = JMP.execute(source, 'Outcome', acceptedInput).runtime;
assert.equal(a.target, b.target);
assert.deepEqual(a.state, b.state);
assert.deepEqual(a.trace, b.trace);

const ir = JMP.lower(JMP.parse(source));
assert.equal(ir.graphs.length, 2);
assert.equal(ir.graphs[0].nodes.filter(node => node.kind === 'case').length, 3);
assert.equal(ir.graphs[0].nodes.filter(node => node.kind === 'fallback').length, 1);
assert.equal(ir.graphs[0].edges[0].kind, 'guarded-jump');
assert.ok(ir.graphs[0].edges[0].guard);

console.log(JSON.stringify({
  schema: 'jm.jmp.source-aware-smoke/1.0',
  historicalRecoveryClaim: false,
  keeper: 'JUMP SELECTION != STATE ERASURE',
  guardLaw: 'VALUE MATCH != GUARANTEED JUMP; DECLARED GUARD STILL GOVERNS',
  checks: 24,
  status: 'PASS'
}, null, 2));
