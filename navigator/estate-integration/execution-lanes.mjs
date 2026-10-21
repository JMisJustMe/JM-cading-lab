// JM ECOSTATE operator lanes v0.2: contact proven native organs rather than
// describing them. Each lane is bounded and preserves its own proof jurisdiction.
import {receiveExecutedWorld} from '../../coding-estate/integration/rendered-world-receiver.mjs';
import {validateRegistry,planEstateRoute} from '../../coding-estate/integration/router-core.mjs';
import {CadingCompiler} from '../../coding-estate/sovereign-batch-four/direct/toolchain-native.mjs';
import {executeNativeContacts} from '../../coding-estate/integration/theogamy-contact.mjs';
import {runOSAdoptionProof} from '../../coding-estate/integration/adoption-proofs.mjs';
import {FlowTalk} from '../../coding-estate/sovereign-ten/direct/language-native.mjs';
import {Kading} from '../../coding-estate/sovereign-batch-two/direct/kading-jmp-native.mjs';
import {CadenVM} from '../../coding-estate/sovereign-batch-two/direct/root-caden-native.mjs';
import {JMVM} from '../../coding-estate/sovereign-batch-two/direct/prime-jmvm-native.mjs';
import {digest} from '../../coding-estate/sovereign-batch-two/direct/native-core.mjs';
import {runEmbodiedEight} from '../../coding-estate/everybody/role-qualified-61/native/embodied-eight-route.mjs';

// Existing donor grammars, editable as one bounded request; no host services.
export const NATIVE_CHAIN_EXAMPLE=JSON.stringify({
  flowtalk:'utterance "open the gate"\nas intent openGate(target="gate")\nrespond {\n gate.allowed = true\n say "Gate request accepted"\n}',
  caden:'kading GateCadence {\n key gate.state = "closed"\n cadence Open {\n beat open when gate.allowed == true do gate.state = "open"\n recover denied do gate.denied = true\n }\n}',
  jmvm:'machine GateCheck {\n instruction ASSERT gate.state == "open"\n instruction SET gate.verified = true\n instruction DING "GATE_VERIFIED"\n instruction HALT\n}'
},null,2);

const worldExample=JSON.parse(NATIVE_CHAIN_EXAMPLE);
worldExample.flowtalk='utterance "enter the heat arena"\nas intent enterWorld(target="burning")\nrespond {\n world.body = "burning"\n world.hazards = 5\n world.targetX = 700\n world.allowed = true\n}';
worldExample.caden='kading WorldCadence {\n cadence Enter {\n beat enter when world.allowed == true do world.ready = true\n recover denied do world.denied = true\n }\n}';
worldExample.jmvm='machine WorldCheck {\n instruction ASSERT world.ready == true\n instruction SET world.verified = true\n instruction DING "WORLD_VERIFIED"\n instruction HALT\n}';
export const NATIVE_WORLD_EXAMPLE=JSON.stringify(worldExample,null,2);
const connectedExample={...worldExample,flowtalk:worldExample.flowtalk.replace(' world.body', ' world.spaces = 3\n world.body')};
export const NATIVE_CONNECTED_WORLD_EXAMPLE=JSON.stringify(connectedExample,null,2);
// Donor runtimes use object paths. Preflight the complete request before any
// receiver executes; the operator grants no host function/service capability.
function checkProgram(value) {
  if(typeof value==='string' && /(?:^|[^A-Za-z0-9_])(?:__proto__|prototype|constructor)(?:$|[^A-Za-z0-9_])/.test(value))throw Error('NATIVE_PROGRAM_PATH_HOLD');
  if(value && typeof value==='object'){
    if(value.type==='call'||value.op==='CALL')throw Error('NATIVE_PROGRAM_SERVICE_HOLD');
    for(const [key,child] of Object.entries(value)){checkProgram(key);checkProgram(child);}
  }
}
function executeNativeChain(input){
  let source;try{source=JSON.parse(input)}catch{throw Error('NATIVE_CHAIN_JSON_REQUIRED')}
  if(!source||Object.keys(source).sort().join(',')!=='caden,flowtalk,jmvm')throw Error('NATIVE_CHAIN_FIELDS_HOLD');
  for(const text of Object.values(source)){
    if(typeof text!=='string'||!text.trim())throw Error('NATIVE_CHAIN_SOURCE_REQUIRED');
    checkProgram(text);
  }
  const ft=FlowTalk.parse(source.flowtalk), k=Kading.parse(source.caden), vm=JMVM.parse(source.jmvm);
  [ft,k,vm].forEach(checkProgram);
  if(k.body.cadences.length!==1||vm.machines.length!==1)throw Error('NATIVE_CHAIN_SINGLE_ENTRY_REQUIRED');
  if(!ft.responses.some(r=>r.actions.length)||!vm.machines[0].instructions.some(i=>i.op==='ASSERT'))throw Error('NATIVE_CHAIN_CONSEQUENCE_REQUIRED');
  const services=Object.create(null);
  const language=FlowTalk.execute(source.flowtalk,{},services);
  const cadence=CadenVM.executeSource(source.caden,undefined,language.response.state,services);
  if(cadence.runtime.recovered||digest(cadence.runtime.state)===digest(language.response.state))throw Error('NATIVE_CHAIN_CADENCE_HOLD');
  const machine=JMVM.execute(source.jmvm,undefined,cadence.runtime.state,services);
  if(digest(machine.runtime.state)===digest(cadence.runtime.state))throw Error('NATIVE_CHAIN_MACHINE_NO_CHANGE');
  const stage=(body,before,after,receipt,trace)=>({body,inputDigest:digest(before),outputDigest:digest(after),receiptDigest:receipt.resultDigest,traceEvents:trace.length});
  const stages=[
    stage('FlowTalk',{},language.response.state,language.response.receipt,language.response.trace),
    stage('CadenVM',language.response.state,cadence.runtime.state,cadence.runtime.receipt,cadence.runtime.trace),
    stage('JMVM',cadence.runtime.state,machine.runtime.state,machine.runtime.receipt,machine.runtime.trace)
  ];
  if(stages.some(s=>!s.receiptDigest))throw Error('NATIVE_CHAIN_RECEIPT_HOLD');
  return {state:machine.runtime.state,stages,receiptDigest:machine.runtime.receipt.resultDigest,
    chosenIntent:language.resolution.intent,bytecodeChecksums:{caden:cadence.bytecode.header.checksum,jmvm:machine.runtime.checksum}};
}
export const OPERATOR_LANES=Object.freeze({
  'native-world':{label:'Native chain → playable GameForge world',input:NATIVE_CONNECTED_WORLD_EXAMPLE},
  'native-chain':{label:'FlowTalk → CadenVM → JMVM',input:NATIVE_CHAIN_EXAMPLE},
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
  if(mode==='native-world'){
    const chain=executeNativeChain(input),receiver=receiveExecutedWorld(chain);
    return {schema:'jm.estate.operator.return/0.2',mode,state:'WORLD_RECEIVER_EXECUTED_RENDER_PENDING',changed:true,
      executedBodies:['FlowTalk','Kading','CadenVM','JMVM','Game-CODING','JMGameCore','JMVisualGraft','JMVisualRuntime','GameForge'],
      result:{chain,receiver,receiptDigest:receiver.receiptDigest},
      boundary:'Native state executed into supported GameForge world parameters. Actual visual PASS requires sandbox renderer readback; no arbitrary-world generation or Android claim.'};
  }
  if(mode==='native-chain')return {
    schema:'jm.estate.operator.return/0.2',mode,state:'NATIVE_PROGRAM_CHAIN_EXECUTED',changed:true,
    executedBodies:['FlowTalk','Kading','CadenVM','JMVM'],result:executeNativeChain(input),
    boundary:'Authored FlowTalk response state is passed into verified CadenVM bytecode execution, then JMVM assertions and state changes. Local JS-hosted JM interpreters; no host services, open-ended language understanding, device OS, cloud write or production deployment. Native digests/checksums are non-cryptographic; explicit local return save uses SHA-256.'
  };
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
      result:{outcome:contact.outcome,stages:contact.identities,receiptDigests:Object.values(contact.stages).flatMap(row=>row.receipt?.resultDigest?[row.receipt.resultDigest]:[])},
      boundary:'Existing eight-body speech, gesture and contact demonstration. The owner role is SIMULATED inside the local proof, not real authentication. Exact recognised utterance only; no open-ended NLP, device speech capture, remote write or receiver deployment.'};
  }
  const proof=runOSAdoptionProof();
  if(!proof.passed||proof.receipts?.length!==4)throw Error('OS_CONTACT_HOLD');
  return {schema:'jm.estate.operator.return/0.2',mode,state:'NATIVE_OS_CONTACT_EXECUTED',changed:true,
    executedBodies:proof.bodies,result:proof,
    boundary:'Existing deterministic RouteCore/OSCoding/CodeHand/ChoiceBox contact executed. It is not a kernel or device OS deployment.'};
}
