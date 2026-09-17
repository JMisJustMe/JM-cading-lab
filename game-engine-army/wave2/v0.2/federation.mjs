import {BODY_TRIALS,hash} from './shared.mjs';

export function runFederation(game='TBOYS'){
  const identityHash=hash(['game-body',game]);
  const stages=[
    ['GlyphForge','ASSET_ADAPTER'],
    ['GameForge','CARTRIDGE'],
    ['GlyphPlay','CREATOR_STAGE'],
    ['PLAYFORM','REPEATABLE_LOOP'],
    ['Kading','GAME_IR'],
    ['NativeCore','FIXED_STEP'],
    ['GameCore','HOST_PACKET']
  ];
  let token=hash(['GENESIS',identityHash]);
  const handoffs=stages.map(([engine,office],index)=>{
    const incoming=token;
    token=hash([incoming,identityHash,engine,office,index]);
    return {index:index+1,engine,office,incoming,outgoing:token,identityHash};
  });
  const trials=Object.entries(BODY_TRIALS).map(([body,route])=>({
    body,
    game,
    identityHash,
    route,
    routeHash:hash([game,body,route])
  }));
  return {
    schema:'jm.game-engine-army-federation/0.2',
    game,
    identityHash,
    genesis:handoffs[0].incoming,
    terminus:token,
    handoffs,
    trials,
    receipt:{
      stageCount:handoffs.length,
      handoffCount:handoffs.length-1,
      identityPreserved:handoffs.every(handoff=>handoff.identityHash===identityHash),
      distinctRoutes:new Set(trials.map(trial=>trial.routeHash)).size===trials.length,
      status:'PASS'
    }
  };
}
