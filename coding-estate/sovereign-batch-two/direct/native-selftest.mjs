import { digest, stable } from './native-core.mjs';
import { Codifying, FormeULA, JMP, Kading, Kocodifying } from './language-shape-native.mjs';
import { CadenVM, JMVM, PolyglotBridge, RootMethod, THEOPrimeBody, runtimeChain } from './runtime-bridge-native.mjs';
import {
  CODIFYING_SOURCE, FORMEULA_SOURCE, INITIAL_STATE, JMVM_SOURCE, JMP_SOURCE, KADING_SOURCE,
  KOCODIFYING_SOURCE, POLYGLOT_BRIDGE_SOURCE, PRIMEBODY_SOURCE, ROOT_METHOD_SOURCE, nativeServices
} from './native-corpus.mjs';

const checks = [];
function check(name, fn) {
  try {
    const value = fn();
    checks.push({ name, passed: true, digest: digest(value) });
  } catch (error) {
    checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message, details: error.details } });
  }
}
function expect(condition, message) { if (!condition) throw new Error(message); }
function rejects(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  expect(caught, `Expected rejection ${code}.`);
  if (code) expect(caught.code === code, `Expected ${code}, got ${caught.code}.`);
  return caught.code;
}

const serviceSet = nativeServices();
const services = serviceSet.services;

check('01 Kading parses keyed cadence grammar', () => {
  const ast = Kading.parse(KADING_SOURCE);
  expect(ast.type === 'KProgram' && ast.body.cadences[0].beats.length === 2, 'Kading AST mismatch.');
  return ast;
});
check('02 Kading lowers to cadence graph', () => {
  const ir = Kading.lower(Kading.parse(KADING_SOURCE));
  expect(ir.graphs[0].type === 'KCadenceGraph' && ir.graphs[0].nodes.length === 3, 'Kading IR mismatch.');
  return ir;
});
check('03 Kading executes authorised cadence', () => {
  const state = structuredClone(INITIAL_STATE); state.door.authorized = true;
  const result = Kading.execute(KADING_SOURCE, 'OpenDoor', state, services).runtime;
  expect(result.state.door.state === 'open' && result.completed.length === 2 && !result.recovered, 'Kading cadence failed.');
  return result;
});
check('04 Kading follows native recovery', () => {
  const result = Kading.execute(KADING_SOURCE, 'OpenDoor', structuredClone(INITIAL_STATE), services).runtime;
  expect(result.recovered && result.state.door.denied === true, 'Kading recovery failed.');
  return result;
});
check('05 Kading rejects cadence without beats', () => rejects(() => Kading.parse('kading Bad { cadence Empty { recover x do door.bad = true } }'), 'KADING_NO_BEATS'));

check('06 J’MP parses guarded jump maps', () => {
  const ast = JMP.parse(JMP_SOURCE); const ir = JMP.lower(ast);
  expect(ir.graphs[0].type === 'JMPJumpGraph' && ast.maps[0].cases.length === 2, 'J’MP structure mismatch.');
  return { ast, ir };
});
check('07 J’MP selects guarded transition', () => {
  const state = { door: { state: 'open', authorized: true } };
  const result = JMP.execute(JMP_SOURCE, 'DoorJump', state, services).runtime;
  expect(result.target === 'entered' && result.state.door.entered === true, 'J’MP guarded jump failed.');
  return result;
});
check('08 J’MP selects fallback deterministically', () => {
  const state = { door: { state: 'broken', authorized: false } };
  const a = JMP.execute(JMP_SOURCE, 'DoorJump', state, services).runtime;
  const b = JMP.execute(JMP_SOURCE, 'DoorJump', state, services).runtime;
  expect(a.target === 'blocked' && stable(a.state) === stable(b.state), 'J’MP fallback/determinism failed.');
  return a;
});
check('09 J’MP rejects maps without cases', () => rejects(() => JMP.parse(`jumpmap Empty {\n  from door.state\n  else -> "x"\n}`), 'JMP_NO_CASES'));

check('10 Codifying parses typed codex', () => {
  const ast = Codifying.parse(CODIFYING_SOURCE); const ir = Codifying.lower(ast);
  expect(ir.schemas[0].type === 'CodexSchemaIR' && ast.codices[0].fields.length === 3, 'Codifying structure mismatch.');
  return { ast, ir };
});
check('11 Codifying materialises typed record', () => {
  const result = Codifying.execute(CODIFYING_SOURCE, 'DoorRecord', { authorized: true, force: 4 }).runtime;
  expect(result.record.state === 'closed' && result.record.authorized === true && result.emissions[0] === 'DoorState', 'Codifying materialisation failed.');
  return result;
});
check('12 Codifying rejects type mismatch', () => rejects(() => Codifying.execute(CODIFYING_SOURCE, 'DoorRecord', { authorized: 'yes', force: 4 }), 'CODIFY_TYPE_MISMATCH'));
check('13 Codifying enforces constraints', () => rejects(() => Codifying.execute(CODIFYING_SOURCE, 'DoorRecord', { state: 'broken', authorized: true, force: 4 }), 'CODIFY_CONSTRAINT_FAILED'));

check('14 Kocodifying parses bidirectional bindings', () => {
  const ast = Kocodifying.parse(KOCODIFYING_SOURCE); const ir = Kocodifying.lower(ast);
  expect(ir.graphs[0].type === 'BidirectionalBindingGraph' && ast.bindings[0].maps.length === 3, 'Kocodifying structure mismatch.');
  return { ast, ir };
});
check('15 Kocodifying synchronises without identity collapse', () => {
  const left = { state: 'closed', authorized: true, force: 6 };
  const right = { doorState: 'open', allowed: false, force: 1 };
  const result = Kocodifying.execute(KOCODIFYING_SOURCE, 'DoorSync', left, right).runtime;
  expect(result.status === 'synced' && result.right.doorState === 'closed' && result.right.allowed === true && result.left.authorized === true, 'Kocodifying sync failed.');
  return result;
});
check('16 Kocodifying rollback preserves original target', () => {
  const source = KOCODIFYING_SOURCE.replace('conflict left', 'conflict reject');
  const right = { doorState: 'open', allowed: false, force: 1 };
  const result = Kocodifying.execute(source, 'DoorSync', { state: 'closed', authorized: true, force: 6 }, right).runtime;
  expect(result.status === 'rolled-back' && result.right.doorState === 'open', 'Kocodifying rollback failed.');
  return result;
});

check('17 FormeULA parses dependency form', () => {
  const ast = FormeULA.parse(FORMEULA_SOURCE); const ir = FormeULA.lower(ast);
  expect(ir.graphs[0].type === 'FormulaDependencyGraph' && ir.graphs[0].nodes.length === 2, 'FormeULA graph mismatch.');
  return { ast, ir };
});
check('18 FormeULA evaluates formula deterministically', () => {
  const a = FormeULA.execute(FORMEULA_SOURCE, 'DoorForce', { input: 7 }).runtime;
  const b = FormeULA.execute(FORMEULA_SOURCE, 'DoorForce', { input: 7 }).runtime;
  expect(a.value === 10 && stable(a.scope) === stable(b.scope), 'FormeULA evaluation failed.');
  return a;
});
check('19 FormeULA rejects unresolved references', () => rejects(() => FormeULA.execute(`forme Bad(x) {\n  bind y = missing + 1\n  yield y\n}`, 'Bad', { x: 1 }), 'FORMEULA_UNRESOLVED_REFERENCE'));

check('20 Root Method parses rooted provenance tree', () => {
  const ast = RootMethod.parse(ROOT_METHOD_SOURCE); const ir = RootMethod.lower(ast);
  expect(ir.trees[0].type === 'RootedMethodTree' && ir.trees[0].methodNodes.length === 1, 'Root Method tree mismatch.');
  return { ast, ir };
});
check('21 Root Method traverses premise, branch and method', () => {
  const result = RootMethod.execute(ROOT_METHOD_SOURCE, 'AuthorizeDoor', structuredClone(INITIAL_STATE), services).runtime;
  expect(result.value === true && result.provenance.join('>') === 'AuthorizeDoor>allowed>Authorize>door.authorized', 'Root Method traversal failed.');
  return result;
});
check('22 Root Method rejects failed premise', () => {
  const state = structuredClone(INITIAL_STATE); state.user.hasKey = false;
  return rejects(() => RootMethod.execute(ROOT_METHOD_SOURCE, 'AuthorizeDoor', state, services), 'ROOT_PREMISE_FAILED');
});

check('23 CadenVM compiles and executes Kading bytecode', () => {
  const ast = Kading.parse(KADING_SOURCE); const bytecode = CadenVM.compile(ast, 'OpenDoor');
  const state = structuredClone(INITIAL_STATE); state.door.authorized = true;
  const result = CadenVM.execute(bytecode, state, services);
  expect(result.state.door.state === 'open' && CadenVM.verify(bytecode), 'CadenVM execution failed.');
  return { bytecode, result };
});
check('24 CadenVM rejects bytecode tampering', () => {
  const bytecode = CadenVM.compile(Kading.parse(KADING_SOURCE), 'OpenDoor');
  const tampered = structuredClone(bytecode); tampered.instructions[0].operands[0] = 'door.intruded';
  return rejects(() => CadenVM.verify(tampered), 'CADEN_BAD_CHECKSUM');
});

check('25 THEO/PrimeBody parses compiler pipeline', () => {
  const ast = THEOPrimeBody.parse(PRIMEBODY_SOURCE); const ir = THEOPrimeBody.lower(ast);
  expect(ir.pipelines[0].type === 'PrimePipeline' && ir.pipelines[0].stageNodes.length === 3, 'PrimeBody pipeline mismatch.');
  return { ast, ir };
});
check('26 THEO/PrimeBody executes and proves all stages', () => {
  const operations = {
    parseKading: source => Kading.parse(source),
    lowerKading: ast => ({ ast, ir: Kading.lower(ast) }),
    compileCaden: value => CadenVM.compile(value.ast, 'OpenDoor')
  };
  const result = THEOPrimeBody.execute(PRIMEBODY_SOURCE, 'DoorBuild', KADING_SOURCE, operations).runtime;
  expect(result.proof.stages.length === 3 && CadenVM.verify(result.value), 'PrimeBody execution/proof failed.');
  return result;
});
check('27 THEO/PrimeBody rejects missing stage operation', () => rejects(() => THEOPrimeBody.execute(PRIMEBODY_SOURCE, 'DoorBuild', KADING_SOURCE, {}), 'PRIME_UNKNOWN_OPERATION'));

check('28 JMVM parses, lowers and executes verified machine', () => {
  const state = { door: { state: 'open', authorized: true } };
  const result = JMVM.execute(JMVM_SOURCE, 'DoorMachine', state, services);
  expect(result.runtime.state.door.vmVerified === true && result.runtime.ding.value === 'JMVM_DOOR_PASS', 'JMVM runtime failed.');
  return result;
});
check('29 JMVM rejects bytecode tampering', () => {
  const ir = JMVM.lower(JMVM.parse(JMVM_SOURCE)); const bytecode = structuredClone(ir.machines[0]);
  bytecode.instructions[2].operands[1] = false;
  return rejects(() => JMVM.verify(bytecode), 'JMVM_BAD_CHECKSUM');
});
check('30 JMVM rejects failed assertion', () => rejects(() => JMVM.execute(JMVM_SOURCE, 'DoorMachine', { door: { state: 'closed' } }, services), 'JMVM_ASSERT_FAILED'));

check('31 Polyglot Bridge parses identity contract', () => {
  const ast = PolyglotBridge.parse(POLYGLOT_BRIDGE_SOURCE); const ir = PolyglotBridge.lower(ast);
  expect(ir.graphs[0].type === 'BridgeContractGraph' && ir.graphs[0].preserve === 'identity', 'Polyglot Bridge graph mismatch.');
  return { ast, ir };
});
check('32 Polyglot Bridge transfers state and preserves identities', () => {
  const source = { door: { state: 'open', authorized: true, vmVerified: true } };
  const result = PolyglotBridge.execute(POLYGLOT_BRIDGE_SOURCE, 'DoorBridge', source, { facts: {} }).runtime;
  expect(result.status === 'transferred' && result.target.facts.allowed === true && result.sourceIdentity !== result.targetIdentity, 'Polyglot Bridge transfer failed.');
  return result;
});
check('33 Polyglot Bridge rolls back incomplete mapping', () => {
  const target = { facts: { untouched: true } };
  const result = PolyglotBridge.execute(POLYGLOT_BRIDGE_SOURCE, 'DoorBridge', { door: { state: 'open' } }, target).runtime;
  expect(result.status === 'rolled-back' && result.target.facts.untouched === true, 'Polyglot Bridge rollback failed.');
  return result;
});

check('34 Continuous Sovereign Batch Two route completes', () => {
  const codified = Codifying.execute(CODIFYING_SOURCE, 'DoorRecord', { state: 'closed', authorized: false, force: 7 }).runtime;
  const synced = Kocodifying.execute(KOCODIFYING_SOURCE, 'DoorSync', codified.record, { doorState: 'closed', allowed: false, force: 0 }).runtime;
  const formula = FormeULA.execute(FORMEULA_SOURCE, 'DoorForce', { input: synced.right.force }).runtime;
  const rootedState = { user: { hasKey: true }, door: { state: synced.right.doorState, authorized: synced.right.allowed, force: formula.value } };
  const root = RootMethod.execute(ROOT_METHOD_SOURCE, 'AuthorizeDoor', rootedState, services).runtime;
  const caden = CadenVM.executeSource(KADING_SOURCE, 'OpenDoor', root.state, services);
  const jump = JMP.execute(JMP_SOURCE, 'DoorJump', caden.runtime.state, services).runtime;
  const prime = THEOPrimeBody.execute(PRIMEBODY_SOURCE, 'DoorBuild', KADING_SOURCE, {
    parseKading: source => Kading.parse(source),
    lowerKading: ast => ({ ast, ir: Kading.lower(ast) }),
    compileCaden: value => CadenVM.compile(value.ast, 'OpenDoor')
  }).runtime;
  expect(CadenVM.verify(prime.value), 'PrimeBody did not emit valid Caden bytecode.');
  const vm = JMVM.execute(JMVM_SOURCE, 'DoorMachine', jump.state, services).runtime;
  const bridge = PolyglotBridge.execute(POLYGLOT_BRIDGE_SOURCE, 'DoorBridge', { door: vm.state.door }, { facts: {}, identity: 'JMLogic.DoorOpenAllowed' }).runtime;
  expect(bridge.status === 'transferred' && bridge.target.facts.doorState === 'open' && bridge.target.facts.allowed === true && bridge.target.facts.vmVerified === true, 'Batch Two continuous route failed.');
  return {
    codifying: codified.recordDigest,
    kocodifying: digest(synced.right),
    formeula: formula.valueDigest,
    root: root.receipt.resultDigest,
    caden: caden.runtime.checksum,
    jmp: jump.target,
    prime: prime.proof.proofDigest,
    jmvm: vm.checksum,
    bridge: bridge.receipt.resultDigest,
    finalTarget: bridge.target,
    services: serviceSet.calls
  };
});
check('35 Continuous route is deterministic', () => {
  function run() {
    const codified = Codifying.execute(CODIFYING_SOURCE, 'DoorRecord', { state: 'closed', authorized: false, force: 7 }).runtime;
    const synced = Kocodifying.execute(KOCODIFYING_SOURCE, 'DoorSync', codified.record, { doorState: 'closed', allowed: false, force: 0 }).runtime;
    const formula = FormeULA.execute(FORMEULA_SOURCE, 'DoorForce', { input: synced.right.force }).runtime;
    const root = RootMethod.execute(ROOT_METHOD_SOURCE, 'AuthorizeDoor', { user: { hasKey: true }, door: { state: synced.right.doorState, authorized: synced.right.allowed, force: formula.value } }, services).runtime;
    const caden = CadenVM.executeSource(KADING_SOURCE, 'OpenDoor', root.state, services).runtime;
    const jump = JMP.execute(JMP_SOURCE, 'DoorJump', caden.state, services).runtime;
    const vm = JMVM.execute(JMVM_SOURCE, 'DoorMachine', jump.state, services).runtime;
    return PolyglotBridge.execute(POLYGLOT_BRIDGE_SOURCE, 'DoorBridge', { door: vm.state.door }, { facts: {} }).runtime.target;
  }
  const a = run(); const b = run();
  expect(stable(a) === stable(b), 'Sovereign Batch Two route is not deterministic.');
  return a;
});

check('36 Exported runtime-chain API preserves the full compiler/VM bridge', () => {
  const result = runtimeChain({
    root: ROOT_METHOD_SOURCE,
    kading: KADING_SOURCE,
    prime: PRIMEBODY_SOURCE,
    jmvm: JMVM_SOURCE,
    bridge: POLYGLOT_BRIDGE_SOURCE
  }, structuredClone(INITIAL_STATE), services);
  expect(result.caden.runtime.state.door.state === 'open', 'Runtime chain did not execute CadenVM.');
  expect(CadenVM.verify(result.prime.value), 'Runtime chain PrimeBody did not emit verified Caden bytecode.');
  expect(result.bridge.status === 'transferred' && result.bridge.target.facts.vmVerified === true, 'Runtime chain bridge failed.');
  return result;
});

const failed = checks.filter(item => !item.passed);
const receipt = {
  schema: 'jm.sovereign-batch-two.conformance/1.0',
  bodies: ['Kading', 'J’MP', 'Codifying', 'Kocodifying', 'FormeULA / MarkeULA', 'Root Method', 'CadenVM', 'THEO / PrimeBody', 'JMVM', 'Polyglot Bridge'],
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  digest: digest(checks),
  currentNativeClaim: failed.length === 0,
  historicalRecoveryClaim: false
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
