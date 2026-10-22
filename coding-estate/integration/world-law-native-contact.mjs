/**
 * JM M002 CP6 — source-informed THEOGRAPHY world-law contact.
 * Source is the RECOVERED 21 Oct 2026 THEOPTICNEATHRIC Game Spine v0.2
 * (Library SHA256 e0c48fbf25ed7ff68a894172879b32c23124d64c8e93c415c565179c315985e9).
 * This document assigns a role to THEOGRAPHY; it is NOT the independent
 * original THEOGRAPHY runtime. No original-runtime authority asserted.
 *
 * Existing CP5 THEOGAMY/Shared Mechanisms executes the actual encounter;
 * JMLogic gates allowed or denied movement; PR395 native world receiver
 * only runs after an earned/completed route. Source and recipient stay distinct.
 */
import {JMLogic} from '../sovereign-ten/direct/language-native.mjs';
import {executeSharedTwoCurrentCreation,ORIGINAL_SHARED_EXCHANGE} from './shared-two-current-creation.mjs';
import {gaugeCreativeContact} from './theoplus-source-gauger-contact.mjs';
import {executeSourceAwareCreation} from './source-aware-creation.mjs';

export const WORLD_LAW_SOURCE=Object.freeze({
  scope:'SOURCE_INFORMED_WORLD_LAW_ADAPTATION_ONLY',
  file:'JM_THEOPTICNEATHRIC_GAME_SPINE_v0_2.md',
  sha256:'e0c48fbf25ed7ff68a894172879b32c23124d64c8e93c415c565179c315985e9',
  role:'Authored world identity, physical bounds, relations, permitted transitions',
  originalTheographyRuntime:'NOT_RECOVERED_NO_CLAIM',
  buildGovernance:'DISTINCT_NOT_WORLD_MECHANIC'
});
const RULE='rule EarnedTwoCurrentContact {\n when contact.eligible == true\n then world.allowed = true\n recover {\n world.allowed = false\n }\n}';
const DEST=Object.freeze({bridge:{body:'humanimals',hazards:5,targetX:640},
                           arena:{body:'tboys',hazards:6,targetX:600}});
const sha256=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))]
  .map(x=>x.toString(16).padStart(2,'0')).join('');
const snapshot=value=>structuredClone(value);
function sourceProgram(worldBody,hazards,targetX){
  return JSON.stringify({
    flowtalk:'utterance "enter the '+worldBody+' arena"\nas intent enterWorld(target="'+worldBody+'")\nrespond {\n world.spaces = 3\n world.body = "'+worldBody+'"\n world.hazards = '+hazards+'\n world.targetX = '+targetX+'\n world.allowed = true\n}',
    caden:'kading WorldCadence {\n cadence Enter {\n beat enter when world.allowed == true do world.ready = true\n recover denied do world.denied = true\n }\n}',
    jmvm:'machine WorldCheck {\n instruction ASSERT world.ready == true\n instruction SET world.verified = true\n instruction DING "WORLD_VERIFIED"\n instruction HALT\n}'
  });
}
/**
 * The input is actions, never an arbitrarily supplied "complete" flag,
 * world or operator script. Incomplete routes must not invoke PR395 receiver.
 */
export async function executeWorldLawContact({kind,actions,registry}){
  if(!Object.hasOwn(DEST,kind))throw Error('WORLD_LAW_KIND_HOLD');
  if(!registry||!Array.isArray(registry.bodies))throw Error('WORLD_LAW_REGISTRY_HOLD');
  const ownedActions=snapshot(actions),creation=executeSharedTwoCurrentCreation({medium:'game',kind,actions:ownedActions});
  const w=creation.state.world,trace=creation.trace;
  const earned=trace.filter(t=>t.phase==='EARN').length===2&&w.earned.length===2&&w.earned.every(Boolean);
  const completed=trace.some(t=>t.phase==='COMPLETE')&&w.completed===true;
  const eligible=earned&&completed&&trace.at(-1)?.complete===true;
  const logic=JMLogic.execute(RULE,{contact:{eligible},world:{allowed:false}}).runtime;
  const allowed=logic.state.world.allowed===true;
  if(allowed!==eligible)throw Error('WORLD_LAW_JMLOGIC_CONTRADICTION_HOLD');
  const gauge=gaugeCreativeContact(creation,'executed-event-state');
  if(gauge.status!=='EXECUTED_SCOPE_GAUGED')throw Error('WORLD_LAW_THEOPLUS_SCOPE_HOLD');
  const boundary={originalTheography:'HOLD',renderedDevice:'HOLD',sourceRuleDocumentSha256:WORLD_LAW_SOURCE.sha256,
    originalSharedMechanismSha256:ORIGINAL_SHARED_EXCHANGE.sha256};
  if(!allowed)return {
    schema:'jm.m002.cp6.world-law-native-return/1',
    status:'DENIED_NO_NATIVE_WORLD_MUTATION',worldLaw:{allowed:false,reason:earned?'COMPLETION_NOT_EARNED':'TWO_CONTACTS_NOT_EARNED',
      decisions:logic.decisions},mechanism:{world:w,trace,oneBody:creation.oneBody.receipt},
    recipient:null,source:null,proof:gauge.status,boundary,
    effect:'No native receiver call; no authoritative world entered.'
  };
  const dest=DEST[kind];
  const content=sourceProgram(dest.body,dest.hazards,dest.targetX);
  const source={identity:'JM M002 CP6 / '+kind+' / source-informed world gate',content,sha256:await sha256(content)};
  const before=JSON.stringify(creation.state);
  const native=await executeSourceAwareCreation(source,registry);
  if(JSON.stringify(creation.state)!==before)throw Error('WORLD_LAW_MECHANISM_INPUT_MUTATED');
  const receiver=native?.execution?.result?.receiver,received=receiver?.world;
  if(native?.execution?.state!=='WORLD_RECEIVER_EXECUTED_RENDER_PENDING'||
     received?.entered!==true||received?.spaces!==3||received?.body!==dest.body||
     received?.hazards!==dest.hazards||received?.targetX!==dest.targetX||
     receiver?.state?.world?.entered!==true||!Object.values(receiver?.receipts||{}).every(Boolean)||
     Object.values(receiver?.receipts||{}).length<4)throw Error('WORLD_LAW_RECIPIENT_CONSEQUENCE_HOLD');
  return {schema:'jm.m002.cp6.world-law-native-return/1',
    status:'ALLOWED_NATIVE_WORLD_EXECUTED',worldLaw:{allowed:true,reason:'EARNED_CONTACT_THEN_COMPLETION',
      decisions:logic.decisions},mechanism:{world:w,trace,oneBody:creation.oneBody.receipt},
    source:{identity:source.identity,sha256:source.sha256},recipient:{
      world:received,stateDigest:native.execution.result.receiptDigest,
      chain:native.execution.result.chain.stages.map(s=>s.name||s.stage||s.type||'executed'),
      receipts:snapshot(receiver.receipts),executionState:native.execution.state
    },proof:gauge.status,boundary,
    effect:'Actual PR395 native receiver state changed; GameForge rendering and physical Android require their own proof.'
  };
}
