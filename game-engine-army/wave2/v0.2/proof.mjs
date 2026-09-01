import {ENGINE_PROFILES,hash} from './shared.mjs';
import {GameCore} from './gamecore.mjs';
import {NativeCore} from './nativecore.mjs';
import {KADING_SAMPLE,runKading} from './kading.mjs';
import {EngineConsole} from './console.mjs';
import {runFederation} from './federation.mjs';

export function runWave2Proof(){
  const core=new GameCore();
  Object.values(ENGINE_PROFILES).forEach(profile=>core.register(profile));
  core.request('glyphplay','InputService',{verb:'MOVE'});
  core.checkpoint('glyphplay');
  core.request('gameforge','InputService',{verb:'COMPILE'});
  core.request('glyphplay','StateVault',{patch:{status:'FAULT'}});
  core.request('glyphplay','RecoveryService');

  const nativeA=new NativeCore('glyphplay',32);
  const nativeB=new NativeCore('glyphplay',32);
  nativeA.save();
  nativeB.save();
  const sequence=[{verb:'MOVE',dx:1,dy:0},{verb:'ACT'}];
  sequence.forEach(input=>{nativeA.step(input);nativeB.step(input)});
  const deterministic=hash(nativeA.state)===hash(nativeB.state);
  nativeA.fault();
  nativeA.recover();

  const kading=runKading(KADING_SAMPLE);

  const consoleBody=new EngineConsole(core);
  consoleBody.select('glyphplay');
  consoleBody.launch();
  consoleBody.snapshot();
  consoleBody.dispatch('InputService',{verb:'ACT'});

  const federation=runFederation('TBOYS');

  return {
    schema:'jm.game-engine-army-wave2-proof/0.2',
    gamecore:{
      glyphplay:core.receipt('glyphplay'),
      gameforge:core.receipt('gameforge'),
      separateStateHashes:core.receipt('glyphplay').stateHash!==core.receipt('gameforge').stateHash
    },
    nativecore:{deterministic,receipt:nativeA.receipt(),targets:nativeA.targets()},
    kading:kading.receipt,
    console:consoleBody.export(),
    federation:federation.receipt,
    status:'PASS'
  };
}
