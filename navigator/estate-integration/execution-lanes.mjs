// JM ECOSTATE operator lanes v0.2: contact proven native organs rather than
// describing them. Each lane is bounded and preserves its own proof jurisdiction.
import {validateRegistry,planEstateRoute} from '../../coding-estate/integration/router-core.mjs';
import {CadingCompiler} from '../../coding-estate/sovereign-batch-four/direct/toolchain-native.mjs';
import {executeNativeContacts} from '../../coding-estate/integration/theogamy-contact.mjs';
import {runOSAdoptionProof} from '../../coding-estate/integration/adoption-proofs.mjs';
import {runEmbodiedEight} from '../../coding-estate/everybody/role-qualified-61/native/embodied-eight-route.mjs';

export const OPERATOR_LANES=Object.freeze({
  route:{label:'Route a JM intention',input:'Build a touch visual game with drag aim, browser and Android delivery'},
  'compile-js':{label:'Cading → JavaScript',input:'source = landing.✓'},
  'compile-rust':{label:'Cading → Rust',input:'source = landing.✓'},
  gamecore:{label:'GameCore + visual contact',input:'RUN EXISTING GAMECORE CONTACT'},
  os:{label:'RouteCore + OS contact',input:'RUN EXISTING OS CONTACT'},
  embodied:{label:'JM speech → meaning → route',input:'open gate'}
});
function needInput(input) {
  if(typeof input!=='string'||!input.trim()||input.length>2000)throw Error('CONTACT_REQUIRED_OR_TOO_LONG');
  return input.trim();
}
function validate(registry){
  const result=validateRegistry(registry);
  if(!result.valid)throw Error('REGISTRY_VALIDATION_HOLD:'+result.failures.slice(0,5).join(','));
}
export function runNativeOperatorLane(mode,input,registry){
  needInput(input);
  if(!Object.hasOwn(OPERATOR_LANES,mode))throw Error('OPERATOR_LANE_NOT_SUPPORTED');
  validate(registry);
  if(mode==='route'){
    const result=planEstateRoute(input,registry,{includeDelivery:/android|deliver|package|export/i.test(input)});
    if(!result.route.length)throw Error('ROUTE_NOT_FOUND');
    return {schema:'jm.estate.operator.return/0.2',mode,state:'PLAN_ONLY',changed:false,
      executedBodies:['JM Coding Estate Router'],result,
      boundary:'Actual native route selection; selected JM bodies have NOT executed merely because they were selected.'};
  }
  if(mode==='compile-js'||mode==='compile-rust'){
    const target=mode==='compile-js'?'javascript':'rust';
    const compiled=CadingCompiler.execute(input,target);
    if(compiled.output.target!==target||!compiled.receipt?.resultDigest||!compiled.output.body)throw Error('CADING_COMPILE_HOLD');
    return {schema:'jm.estate.operator.return/0.2',mode,state:'EMITTED_SOURCE',changed:true,
      executedBodies:['Cading Compiler'],result:{target,source:input,ir:compiled.ir,output:compiled.output,receiptDigest:compiled.receipt.resultDigest},
      boundary:'JM Cading source parsed and source text emitted. Emission is not downstream target compilation, application execution, build or Android proof.'};
  }
  if(mode==='gamecore'){
    const contact=executeNativeContacts();
    if(!contact.game.changed||!contact.rendererContact.consequenceReadable||!contact.game.receipt)throw Error('GAMECORE_CONTACT_HOLD');
    return {schema:'jm.estate.operator.return/0.2',mode,state:'NATIVE_GAMECORE_STATE_CHANGED',changed:true,
      executedBodies:['JM Parser','GameCoding','JMGameCore','JMVisualGraft','JMVisualRuntime'],result:contact,
      boundary:'Executed existing fixed Island/Establish native proof scenario. This does not turn the arbitrary input into a new game, nor demonstrate rendered GPU/Android play.'};
  }
  if(mode==='embodied'){
    // Simulated owner identity is an existing deterministic JM donor test value,
    // NOT authentication or permission on the host or service.
    const contact=runEmbodiedEight({utterance:input,identity:'owner'});
    if(contact.outcome.finalRoute!=='accepted.route'||!contact.outcome.permitted||contact.identities?.length!==8)
      throw Error('EMBODIED_RECEIVER_HOLD');
    return {schema:'jm.estate.operator.return/0.2',mode,state:'EMBODIED_ROUTE_EXECUTED',changed:true,
      executedBodies:contact.identities.map(row=>row[0]),
      result:{outcome:contact.outcome,stages:contact.identities,receiptDigests:Object.values(contact.stages).map(row=>row.receipt?.resultDigest||null)},
      boundary:'Existing eight-body speech, gesture and contact demonstration. The owner role is SIMULATED inside the local proof, not real authentication. Exact recognised utterance only; no open-ended NLP, device speech capture, remote write or receiver deployment.'};
  }
  const proof=runOSAdoptionProof();
  if(!proof.passed||proof.receipts?.length!==4)throw Error('OS_CONTACT_HOLD');
  return {schema:'jm.estate.operator.return/0.2',mode,state:'NATIVE_OS_CONTACT_EXECUTED',changed:true,
    executedBodies:proof.bodies,result:proof,
    boundary:'Existing deterministic RouteCore/OSCoding/CodeHand/ChoiceBox contact executed. It is not a kernel or device OS deployment.'};
}
