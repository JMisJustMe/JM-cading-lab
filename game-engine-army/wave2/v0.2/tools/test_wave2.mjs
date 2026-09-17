import assert from 'node:assert/strict';
import {ENGINE_PROFILES,hash} from '../shared.mjs';
import {GameCore} from '../gamecore.mjs';
import {NativeCore} from '../nativecore.mjs';
import {parseKading,lowerKading,runKading,KADING_SAMPLE} from '../kading.mjs';
import {EngineConsole} from '../console.mjs';
import {runFederation} from '../federation.mjs';
import {runWave2Proof} from '../proof.mjs';

const core=new GameCore();
Object.values(ENGINE_PROFILES).forEach(profile=>core.register(profile));
assert.equal(core.registry.size,5);
assert.notEqual(core.identity('glyphplay'),core.identity('gameforge'));
core.request('glyphplay','InputService',{verb:'MOVE'});
core.request('gameforge','InputService',{verb:'COMPILE'});
assert.notDeepEqual(core.state('glyphplay'),core.state('gameforge'));
core.checkpoint('glyphplay');
core.request('glyphplay','StateVault',{patch:{status:'FAULT',score:99}});
core.request('glyphplay','RecoveryService');
assert.equal(core.state('glyphplay').status,'READY');
assert.notEqual(core.state('glyphplay').score,99);
const bad=core.request('glyphplay','InputService',{verb:'COMPILE'});
assert.equal(bad.ok,false);
assert.equal(core.state('glyphplay').status,'FAULT');

const nativeA=new NativeCore('glyphplay',32);
const nativeB=new NativeCore('glyphplay',32);
const sequence=[{verb:'MOVE',dx:1,dy:0},{verb:'ACT'}];
sequence.forEach(input=>{nativeA.step(input);nativeB.step(input)});
assert.equal(hash(nativeA.state),hash(nativeB.state));
nativeA.save();
nativeA.fault();
assert.equal(nativeA.state.status,'FAULT');
nativeA.recover();
assert.equal(nativeA.state.status,'READY');
assert.equal(nativeA.targets().status,'TARGET_CONTRACTS_EMITTED_NOT_NATIVE_BINARIES');

const ast=parseKading(KADING_SAMPLE);
const ir=lowerKading(ast);
const run=runKading(KADING_SAMPLE);
assert.equal(ast.schema,'jm.kading-ast/0.2');
assert.equal(ir.schema,'jm.kading-game-ir/0.2');
assert.equal(run.events.length,6);
assert.equal(run.receipt.cycles,2);
assert.throws(()=>parseKading('GAME X\nBROKEN Y'));

const consoleBody=new EngineConsole(core);
consoleBody.select('gameforge');
const launch=consoleBody.launch();
assert.equal(launch.engineId,'gameforge');
consoleBody.snapshot();
consoleBody.recover();
assert.equal(consoleBody.export().selected,'gameforge');

const federation=runFederation('TBOYS');
assert.equal(federation.handoffs.length,7);
assert.equal(federation.receipt.identityPreserved,true);
assert.equal(federation.receipt.distinctRoutes,true);
assert.equal(new Set(federation.trials.map(trial=>trial.identityHash)).size,1);
assert.equal(new Set(federation.trials.map(trial=>trial.routeHash)).size,5);

const proof=runWave2Proof();
assert.equal(proof.status,'PASS');
assert.equal(proof.gamecore.separateStateHashes,true);
assert.equal(proof.nativecore.deterministic,true);
assert.equal(proof.federation.status,'PASS');

console.log(JSON.stringify({status:'PASS',assertions:25,proof},null,2));
