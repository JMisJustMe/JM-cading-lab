// JM ECOSTATE M002 CP4: additive original-compiler capsule -> existing PR395 operator.
// This recipient executes existing Codifying/JMLogic/FlowTalk/CadenVM/JMVM/GameCore.
// The capsule records earlier Python original-host proof; it does NOT run Python
// in the browser or authenticate a remote producer. No service or network calls.
import {executeSourceAwareCreation} from './source-aware-creation.mjs';

const ORIGINAL=Object.freeze({
  cb:'03a237debc9f1d26efb213171cd759e35572450313a2a5636ebce46efcceeab1',
  jm:'404aa48d9e89b4423ef8346c79c81de39ff2007c5bc370b86e458e43d8e7f78f',
  program:'701443a7443fc4c87bad69e51aef89ba567ec4693581ba70ee34d07d6d2ccd6c'
});
const PROFILE=Object.freeze({
  CbVM:{profile:'32_Cb::CbPy/1.0',body:'humanimals',hazards:5},
  CbShape:{profile:'32_Cb::CbJson/1.0',body:'tboys',hazards:6}
});
const hex=x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x);
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
  x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
async function sha(text){
  if(!globalThis.crypto?.subtle)throw Error('M002_WEBCRYPTO_HOLD');
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
  return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function equal(a,b){return canonical(a)===canonical(b)}
export async function verifyOriginalCompilerWorldCapsule(c){
  if(!c||c.schema!=='jm.m002.pr395.native-source-capsule/1')throw Error('M002_CAPSULE_SCHEMA_HOLD');
  const p=c.producer,s=c.source,w=c.expectedWorld;
  if(!p||!s||!w||!Object.hasOwn(PROFILE,p.engine))throw Error('M002_CAPSULE_FIELDS_HOLD');
  const e=PROFILE[p.engine];
  if(Object.keys(s).sort().join(',')!=='content,identity,sha256' ||
    Object.keys(w).sort().join(',')!=='body,entered,hazards,spaces,targetX')
    throw Error('M002_EXACT_FIELDS_HOLD');
  if(p.profile!==e.profile||w.body!==e.body||w.hazards!==e.hazards||w.entered!==true||w.spaces!==3||
    !Number.isInteger(w.targetX)||w.targetX<500||w.targetX>780)throw Error('M002_WORLD_PROFILE_HOLD');
  if(p.native_source_sha256!==ORIGINAL.cb||p.jm_zipapp_sha256!==ORIGINAL.jm||
    p.jm_original_program_sha256!==ORIGINAL.program)throw Error('M002_ORIGINAL_SOURCE_HOLD');
  if(!hex(p.native_return_sha256)||!hex(p.jm_executed_program_sha256)||!hex(p.upstream_receipt_sha256)||
    p.attestation!=='ORIGINAL_PYTHON_SUBPROCESSES_VERIFIED_LOCALLY_NOT_BROWSER_OR_PROVIDER')
    throw Error('M002_UPSTREAM_PROOF_SCOPE_HOLD');
  if(s.identity!=='JM M002 CP3 / '+p.engine+' / '+p.native_return_sha256.slice(0,12)||
    typeof s.content!=='string'||s.content.length>2000||await sha(s.content)!==s.sha256)
    throw Error('M002_SOURCE_SHA256_HOLD');
  let q;try{q=JSON.parse(s.content)}catch{throw Error('M002_NATIVE_JSON_HOLD')}
  if(Object.keys(q).sort().join(',')!=='caden,flowtalk,jmvm')throw Error('M002_NATIVE_FIELDS_HOLD');
  const flow='utterance "enter the '+w.body+' arena"\nas intent enterWorld(target="'+w.body+'")\nrespond {\n world.spaces = 3\n world.body = "'+w.body+'"\n world.hazards = '+w.hazards+'\n world.targetX = '+w.targetX+'\n world.allowed = true\n}';
  const cad='kading WorldCadence {\n cadence Enter {\n beat enter when world.allowed == true do world.ready = true\n recover denied do world.denied = true\n }\n}';
  const vm='machine WorldCheck {\n instruction ASSERT world.ready == true\n instruction SET world.verified = true\n instruction DING "WORLD_VERIFIED"\n instruction HALT\n}';
  if(q.flowtalk!==flow||q.caden!==cad||q.jmvm!==vm)throw Error('M002_PROGRAM_ALLOWLIST_HOLD');
  if(!hex(c.capsule_sha256)||await sha(canonical(Object.fromEntries(Object.entries(c).filter(([k])=>k!=='capsule_sha256'))))!==c.capsule_sha256)
    throw Error('M002_CAPSULE_SHA256_HOLD');
  return {engine:p.engine,profile:p.profile,sourceSha256:s.sha256,upstreamReceipt:p.upstream_receipt_sha256,world:structuredClone(w)};
}
export async function executeOriginalCompilerWorldCapsule(c,registry){
  const bound=await verifyOriginalCompilerWorldCapsule(c);
  const result=await executeSourceAwareCreation(c.source,registry);
  const receiver=result?.execution?.result?.receiver;
  if(result?.execution?.mode!=='native-world'||result?.execution?.state!=='WORLD_RECEIVER_EXECUTED_RENDER_PENDING'||
     !equal(receiver?.world,bound.world)||receiver?.state?.world?.entered!==true||
     !receiver?.receipts||Object.values(receiver.receipts).length<4||!Object.values(receiver.receipts).every(Boolean))
    throw Error('M002_NATIVE_RECEIVER_CONSEQUENCE_HOLD');
  return {schema:'jm.m002.original-compiler-native-return/1',status:'NATIVE_WORLD_RECEIVER_EXECUTED_RENDER_PENDING',
    bound,operator:result,boundary:'Existing PR395 source-aware native execution only; rendering, Android, real producer attestation and release are separate proof gates.'};
}
