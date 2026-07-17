import { digest, stable } from './native-core.mjs';
import { FlowTalk, JM32, JMLogic, languageChain } from './language-native.mjs';
import { Dings, RealityContact, RouteOS, RouteScript, RouteVM, TraceBox, TraceBoxRuntime, routeProofChain } from './route-proof-native.mjs';
import { GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime, gameChain } from './game-native.mjs';
import {
  DINGS_SOURCE, FLOWTALK_SOURCE, GAME_CODING_SOURCE, INITIAL_FACTS, JM32_SOURCE, JMLOGIC_SOURCE,
  JM_GAMECORE_SOURCE, REALITY_CONTACT_SOURCE, ROUTESCRIPT_SOURCE, TRACEBOX_SOURCE, nativeServices
} from './native-corpus.mjs';

const checks = [];
function check(name, fn) {
  try {
    const value = fn();
    checks.push({ name, passed: true, digest: digest(value) });
  } catch (error) {
    checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } });
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

check('01 FlowTalk parses its native grammar', () => {
  const ast = FlowTalk.parse(FLOWTALK_SOURCE);
  expect(ast.type === 'FTProgram' && ast.meanings[0].intents[0].name === 'openDoor', 'FlowTalk AST mismatch.');
  return ast;
});
check('02 FlowTalk lowers to interpretation graph', () => {
  const graph = FlowTalk.lower(FlowTalk.parse(FLOWTALK_SOURCE), INITIAL_FACTS.context)[0];
  expect(graph.type === 'FTInterpretationGraph' && graph.nodes.length === 2, 'FlowTalk graph mismatch.');
  return graph;
});
check('03 FlowTalk resolves ambiguity deterministically', () => {
  const first = FlowTalk.execute(FLOWTALK_SOURCE, INITIAL_FACTS.context, services);
  const second = FlowTalk.execute(FLOWTALK_SOURCE, INITIAL_FACTS.context, services);
  expect(first.resolution.intent.name === 'openDoor', 'FlowTalk chose wrong intent.');
  expect(stable(first.resolution) === stable(second.resolution), 'FlowTalk was not deterministic.');
  return first.resolution;
});
check('04 FlowTalk executes response actions and trace', () => {
  const result = FlowTalk.execute(FLOWTALK_SOURCE, INITIAL_FACTS.context, services).response;
  expect(result.state.nextRoute === 'DoorOpenRoute' && result.trace.length > 0, 'FlowTalk response failed.');
  return result;
});
check('05 FlowTalk rejects incomplete source', () => rejects(() => FlowTalk.parse('utterance "hello"'), 'FT_MISSING_INTENT'));

check('06 JMLogic parses and lowers native rules', () => {
  const ast = JMLogic.parse(JMLOGIC_SOURCE);
  const ir = JMLogic.lower(ast);
  expect(ir.graphs[0].type === 'JMLDecisionGraph', 'JMLogic IR mismatch.');
  return { ast, ir };
});
check('07 JMLogic permits and changes state', () => {
  const facts = structuredClone(INITIAL_FACTS);
  facts.intent = { openDoor: true };
  const result = JMLogic.execute(JMLOGIC_SOURCE, facts, services).runtime;
  expect(result.state.permission === 'permit' && result.state.door.allowed === true, 'JMLogic decision failed.');
  return result;
});
check('08 JMLogic is deterministic', () => {
  const facts = structuredClone(INITIAL_FACTS); facts.intent = { openDoor: true };
  const a = JMLogic.execute(JMLOGIC_SOURCE, facts, services).runtime.decisions;
  const b = JMLogic.execute(JMLOGIC_SOURCE, facts, services).runtime.decisions;
  expect(stable(a) === stable(b), 'JMLogic decisions differ.');
  return a;
});
check('09 JMLogic rejects rules without consequences', () => rejects(() => JMLogic.parse('rule Bad { when user.ok }'), 'JML_MISSING_THEN'));

check('10 JM32 parses and lowers policy graphs', () => {
  const ast = JM32.parse(JM32_SOURCE);
  const ir = JM32.lower(ast);
  expect(ir.graphs[0].type === 'JM32PolicyGraph', 'JM32 IR mismatch.');
  return { ast, ir };
});
check('11 JM32 applies obligations before guards', () => {
  const facts = structuredClone(INITIAL_FACTS); facts.intent = { openDoor: true }; facts.door.allowed = true;
  const result = JM32.execute(JM32_SOURCE, facts, services).runtime;
  expect(result.state.door.authorized === true, 'JM32 obligation failed.');
  expect(result.decisions[0].decision === 'oblige', 'JM32 decision order failed.');
  return result;
});
check('12 JM32 is deterministic', () => {
  const facts = structuredClone(INITIAL_FACTS); facts.intent = { openDoor: true }; facts.door.allowed = true;
  const a = JM32.execute(JM32_SOURCE, facts, services).runtime.decisions;
  const b = JM32.execute(JM32_SOURCE, facts, services).runtime.decisions;
  expect(stable(a) === stable(b), 'JM32 decisions differ.');
  return a;
});
check('13 JM32 rejects effectless clauses', () => rejects(() => JM32.parse('policy Bad { clause Empty { when user.ok } }'), 'JM32_MISSING_EFFECT'));

check('14 RouteScript parses and lowers deterministic graph', () => {
  const ast = RouteScript.parse(ROUTESCRIPT_SOURCE);
  const graph = RouteScript.lower(ast).graphs[0];
  expect(graph.entry === 'DoorOpenRoute:start' && graph.nodes.length === 5, 'RouteScript graph mismatch.');
  return { ast, graph };
});
check('15 RouteScript opens the authorised door', () => {
  const state = structuredClone(INITIAL_FACTS); state.door.authorized = true;
  const result = RouteScript.execute(ROUTESCRIPT_SOURCE, state, services).runtime;
  expect(result.state.door.state === 'open' && result.state.ended === true, 'RouteScript route failed.');
  return result;
});
check('16 RouteVM verifies bytecode and rejects tampering', () => {
  const graph = RouteScript.lower(RouteScript.parse(ROUTESCRIPT_SOURCE)).graphs[0];
  const bytecode = RouteVM.compile(graph);
  expect(RouteVM.verify(bytecode), 'RouteVM verification failed.');
  const tampered = structuredClone(bytecode); tampered.instructions[0].operands[0] = 'Tampered:start';
  rejects(() => RouteVM.verify(tampered), 'RVM_BAD_CHECKSUM');
  return bytecode;
});
check('17 RouteOS registers and dispatches route services', () => {
  const graph = RouteScript.lower(RouteScript.parse(ROUTESCRIPT_SOURCE)).graphs[0];
  const bytecode = RouteVM.compile(graph);
  const os = new RouteOS();
  os.registerRoute(graph.routeName, bytecode, graph, services);
  const state = structuredClone(INITIAL_FACTS); state.door.authorized = true;
  const result = os.callService(graph.routeName, state);
  expect(result.state.door.state === 'open', 'RouteOS service failed.');
  return result;
});

check('18 Reality Contact records mapped evidence', () => {
  const result = RealityContact.execute(REALITY_CONTACT_SOURCE);
  expect(result.runtime.records[0].mappedSignal.state === 'open', 'Reality Contact mapping failed.');
  return result;
});
check('19 TraceBox parses, stores, queries and replays traces', () => {
  const ast = TraceBox.parse(TRACEBOX_SOURCE);
  const ir = TraceBox.lower(ast);
  const runtime = new TraceBoxRuntime().import(ast);
  expect(runtime.query('T1', { type: 'JMLogicDecision' }).length === 1, 'TraceBox query failed.');
  expect(runtime.replay('T1').length === 3, 'TraceBox replay failed.');
  return { ir, replay: runtime.replay('T1') };
});
check('20 Dings creates proof objects and rejects tampering', () => {
  const result = Dings.execute(DINGS_SOURCE);
  expect(Dings.verify(result.runtime[0]), 'Ding verification failed.');
  const tampered = structuredClone(result.runtime[0]); tampered.claim.action = 'closeDoor';
  rejects(() => Dings.verify(tampered), 'DING_TAMPERED');
  return result;
});

check('21 Game-CODING parses and runs native mechanics', () => {
  const ast = GameCoding.parse(GAME_CODING_SOURCE);
  const ir = GameCoding.lower(ast);
  const runtime = new GameCodingRuntime(ast, { door: { authorized: true, state: 'closed', position: 4 }, player: { position: 4 } }, services);
  const outcomes = runtime.collide();
  expect(outcomes[0].applied && runtime.state.door.state === 'open', 'Game-CODING collision/mechanic failed.');
  return { ir, result: runtime.result() };
});
check('22 JM GameCore dispatches without identity collapse', () => {
  const gameAst = GameCoding.parse(GAME_CODING_SOURCE);
  const game = new GameCodingRuntime(gameAst, { door: { authorized: true, state: 'closed' } }, services);
  const coreAst = JMGameCore.parse(JM_GAMECORE_SOURCE);
  const runtime = new JMGameCoreRuntime(coreAst, game);
  const result = runtime.dispatch('PlayerInteraction', 'DoorCollision');
  expect(result.identity === 'PlayerInteraction.v1' && result.state.door.state === 'open', 'JM GameCore dispatch failed.');
  return result;
});

check('23 Continuous ten-body native route completes', () => {
  const language = languageChain(FLOWTALK_SOURCE, JMLOGIC_SOURCE, JM32_SOURCE, structuredClone(INITIAL_FACTS), services);
  expect(language.policy.runtime.state.door.authorized === true, 'Language/policy spine did not authorise door.');
  const route = routeProofChain(ROUTESCRIPT_SOURCE, REALITY_CONTACT_SOURCE, DINGS_SOURCE, language.policy.runtime.state, services);
  expect(route.service.state.door.state === 'open', 'Route/proof spine did not open door.');
  const game = gameChain(GAME_CODING_SOURCE, JM_GAMECORE_SOURCE, route.service.state, services);
  expect(game.dispatch.state.door.state === 'open' && game.dispatch.identity === 'PlayerInteraction.v1', 'Game spine failed.');
  return { languageDigest: language.digest, routeDigest: route.digest, gameDigest: game.digest, finalState: game.dispatch.state, serviceCalls: serviceSet.calls };
});

const failed = checks.filter(check => !check.passed);
const receipt = {
  schema: 'jm.sovereign-ten.conformance/1.0',
  bodies: ['FlowTalk', 'JMLogic', 'JM32-1DA', 'RouteScript', 'RouteVM / RouteOS', 'Reality Contact', 'Dings', 'TraceBox', 'Game-CODING', 'JM GameCore'],
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  digest: digest(checks)
};

console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
