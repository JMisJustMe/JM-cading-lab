// Additive receiver: existing native chain -> GameCore -> visual/forge contract.
// Rendering is delegated to the byte-exact GameForge v3.16 playable donor.
import {gameChain} from '../sovereign-ten/direct/game-native.mjs';
import {GameForge,JMVisualGraft,JMVisualRuntime} from '../sovereign-batch-six/direct/game-input-native-a.mjs';
export function receiveExecutedWorld(chain){
  const w=chain?.state?.world;
  if(!w||!['tboys','burning','humanimals'].includes(w.body))throw Error('WORLD_BODY_UNSUPPORTED');
  if(!Number.isInteger(w.hazards)||w.hazards<1||w.hazards>8||!Number.isFinite(w.targetX)||w.targetX<500||w.targetX>780)throw Error('WORLD_GEOMETRY_HOLD');
  if(w.verified!==true)throw Error('WORLD_NOT_VERIFIED');
  const contact=gameChain('entity World {\n entered = false\n}\nmechanic Enter {\n requires world.verified == true\n effect world.entered = true\n}',
    'organ WorldOrgan {\n handles = [World]\n rules = [Enter]\n invariants = {\n world.entered == true\n }\n}\nsystem WorldSystem {\n organs = [WorldOrgan]\n events = [Enter]\n identity = "JM.Estate.AuthoredWorld"\n}',chain.state);
  if(!contact.dispatch.executions.every(x=>x.applied))throw Error('WORLD_GAMECORE_HOLD');
  if(w.spaces!==undefined&&w.spaces!==3)throw Error('SPACES_SPEC_HOLD');
  const world={...(w.spaces?{spaces:3}:{}),body:w.body,hazards:w.hazards,targetX:w.targetX,entered:contact.dispatch.state.world.entered};
  const visual=JMVisualGraft.execute('visualgraft WorldView {\n mechanic: enter\n state_path: world.body\n expression: "world-{state}"\n asset: gameforge_v316\n contact: drag\n}',{world});
  const input=JMVisualRuntime.execute('interaction WorldTouch {\n field: arena\n inputs: ["drag","tap"]\n state_path: input.last\n feedback: collision\n render: immediate\n}',{type:'tap',value:'enter'},{world});
  const forge=GameForge.execute('gameforge EstateWorld {\n game: AuthoredWorld\n identity: JM.Estate.AuthoredWorld\n adapters: ["attachWorld"]\n build: buildWorld\n exports: ["browser"]\n}',
    {name:'AuthoredWorld',identity:'JM.Estate.AuthoredWorld'},
    {attachWorld:g=>({...g,world}),buildWorld:g=>({...g,renderer:'GameForge v3.16',renderPending:true})});
  return {world,state:contact.dispatch.state,receiptDigest:contact.dispatch.receipt.resultDigest,
    receipts:{game:contact.game.receipt.resultDigest,core:contact.dispatch.receipt.resultDigest,visual:visual.receipt.resultDigest,input:input.receipt.resultDigest,forge:forge.receipt.resultDigest},
    visual:visual.state,forge:forge.state.outputs,renderer:'GameForge v3.16',renderProof:'PENDING_BROWSER_READBACK'};
}
