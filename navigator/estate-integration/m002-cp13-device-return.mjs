/**
 * M002 CP13 — portable project return through EXISTING JM Native Operator.
 * No cloud, peer discovery, new front door, implicit merge or unsigned trust.
 * A packet can carry an operator checkpoint and/or a CP12 native exchange.
 * SHA-256 = integrity only; not author authentication or encryption.
 */
import {saveLocalReturn,recoverLocalReturn,RETURN_SLOT} from './return-checkpoint.mjs';
export const CP13_LEDGER_SLOT='JM_M002_CP13_DEVICE_TRANSFER_LEDGER_v01';
export const CP13_CROSS_SLOT='JM_M002_CP13_CROSS_MEDIA_ENVELOPE_v01';
const te=new TextEncoder();
const own=x=>structuredClone(x);
const sha=async(raw,subtle)=>[...new Uint8Array(await subtle.digest('SHA-256',te.encode(raw)))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');
const mapStore=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,String(v)),removeItem:key=>map.delete(key)}};
const device=label=>typeof label==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _.-]{1,39}$/.test(label);
const json=o=>JSON.stringify(o);
function scan(x,depth=0){
 if(depth>24)throw Error('CP13_DEPTH_HOLD');
 if(x&&typeof x==='object')for(const [key,v] of Object.entries(x)){
  if(['__proto__','prototype','constructor'].includes(key))throw Error('CP13_UNSAFE_KEY_HOLD');
  scan(v,depth+1);
 }
}
async function verifyCross(cp12,subtle){
 if(cp12===null)return null;
 if(!cp12||cp12.schema!=='jm.m002.cp12.cross-receiver-envelope/1'||
  typeof cp12.body!=='string'||te.encode(cp12.body).byteLength>100000||
  !/^[0-9a-f]{64}$/.test(cp12.sha256||'')||
  await sha(cp12.body,subtle)!==cp12.sha256)throw Error('CP13_CP12_SOURCE_HOLD');
 let b;try{b=JSON.parse(cp12.body)}catch{throw Error('CP13_CP12_JSON_HOLD')}
 scan(b);
 if(b.schema!=='jm.m002.cp12.cross-receiver-body/1'||b.source?.portableDing!==true||
  b.source?.contact?.routeOpen!==true||
  b.source?.contact?.earned?.length!==b.stations||
  b.receiving?.game?.state?.schema!=='jm.m002.cp11.game-host/1'||
  b.receiving?.comic?.state?.schema!=='jm.m002.cp11.comic-host/1')
  throw Error('CP13_CP12_SCOPE_HOLD');
 return {schema:cp12.schema,sha256:cp12.sha256,body:cp12.body};
}
async function verifyReturn(value,subtle){
 if(value===null)return null;
 // Invoke existing operator's ORIGINAL return save/restore, not parallel validation.
 const store=mapStore();
 const check=await saveLocalReturn(store,own(value),subtle);
 return {value:own(check.value),sha256:check.sha256};
}
async function validatePacket(packet,subtle){
 if(!packet||packet.schema!=='jm.m002.cp13.portable-envelope/1'||
  typeof packet.body!=='string'||te.encode(packet.body).byteLength>400000||
  !/^[a-f0-9]{64}$/.test(packet.sha256||'')||
  await sha(packet.body,subtle)!==packet.sha256)throw Error('CP13_ENVELOPE_HASH_HOLD');
 let body;try{body=JSON.parse(packet.body)}catch{throw Error('CP13_BODY_JSON_HOLD')}
 scan(body);
 if(body.schema!=='jm.m002.cp13.project-return/1'||!device(body.origin)||
  !device(body.project)||!Number.isInteger(body.revision)||body.revision<1||
  (body.operator===null&&body.crossMedia===null)||
  (body.operator!==null&&!body.operator?.value)||
  (body.crossMedia!==null&&!body.crossMedia?.sha256))
  throw Error('CP13_PACKET_SCHEMA_HOLD');
 const check=await verifyReturn(body.operator?.value||null,subtle);
 if(body.operator&&(check?.sha256!==body.operator.sha256))throw Error('CP13_INNER_RETURN_HASH_HOLD');
 const cross=await verifyCross(body.crossMedia,subtle);
 return {body,operator:check,cross};
}
function readLedger(store){
 const raw=store.getItem(CP13_LEDGER_SLOT);
 if(!raw)return {schema:'jm.m002.cp13.local-transfer-ledger/1',seen:[]};
 let x;try{x=JSON.parse(raw)}catch{throw Error('CP13_LEDGER_JSON_HOLD')}
 if(x?.schema!=='jm.m002.cp13.local-transfer-ledger/1'||!Array.isArray(x.seen)||
  x.seen.length>1000||x.seen.some(y=>!(/^[a-f0-9]{64}$/.test(y)))||
  new Set(x.seen).size!==x.seen.length)throw Error('CP13_LEDGER_CORRUPT_HOLD');
 return x;
}
export async function makeCP13Portable({project,origin,revision=1,returnValue=null,cp12=null},
 subtle=crypto.subtle){
 if(!device(project)||!device(origin)||!Number.isInteger(revision)||revision<1||
  (returnValue===null&&cp12===null))throw Error('CP13_EXPORT_INPUT_HOLD');
 const oper=await verifyReturn(returnValue,subtle);
 const cross=await verifyCross(cp12,subtle);
 const body=json({schema:'jm.m002.cp13.project-return/1',project,origin,revision,
  operator:oper,crossMedia:cross,
  scopes:{origin:'declared-label-not-hardware-attested',custody:'manual-file-transfer',
   signing:'SHA256_ONLY_NOT_PRODUCER_AUTHENTICATION',
   application:'import-carrier-not-automatic-game-or-comic-state-application'}});
 return {schema:'jm.m002.cp13.portable-envelope/1',body,sha256:await sha(body,subtle)};
}
export async function inspectCP13Portable(packet,subtle=crypto.subtle){
 const checked=await validatePacket(packet,subtle);
 return {schema:'jm.m002.cp13.inspection/1',project:checked.body.project,
  origin:checked.body.origin,revision:checked.body.revision,sha256:packet.sha256,
  containsOperator:Boolean(checked.operator),containsCP12:Boolean(checked.cross),
  status:'STRUCTURE_AND_HASH_VERIFIED_NOT_APPLIED'};
}
/** Fail-closed. A different saved local project requires explicit expected SHA
 * AND allowReplace=true; existing source never overwritten by default. */
export async function receiveCP13Portable(store,packet,opts={},subtle=crypto.subtle){
 const {body,operator,cross}=await validatePacket(packet,subtle);
 const ledger=readLedger(store);
 if(ledger.seen.includes(packet.sha256))throw Error('CP13_DUPLICATE_PACKET_HOLD');
 let previous=null;
 if(store.getItem(RETURN_SLOT)!==null){
  previous=await recoverLocalReturn(store,subtle); // rejects existing tamper too
  if(operator&&(previous.sha256!==operator.sha256)){
   if(opts.allowReplace!==true||opts.expectedCurrentSha256!==previous.sha256)
    throw Error('CP13_CONFLICT_REVIEW_REQUIRED_HOLD');
  }
 }
 const prior=[RETURN_SLOT,CP13_CROSS_SLOT,CP13_LEDGER_SLOT].map(k=>[k,store.getItem(k)]);
 const receipt={schema:'jm.m002.cp13.receiving-readback/1',status:'TRANSFER_RETURN_VERIFIED',
  project:body.project,origin:body.origin,revision:body.revision,
  envelopeSha256:packet.sha256,operatorSha256:operator?.sha256||null,
  crossMediaSha256:cross?.sha256||null,
  localOverwrite:Boolean(previous&&operator&&previous.sha256!==operator.sha256),
  scope:'LOCAL IMPORT; NO REMOTE DEVICE ACCESS, CLOUD RETURN OR CP12 GAME/COMIC STATE APPLICATION'};
 try{
  if(operator){
   const read=await saveLocalReturn(store,operator.value,subtle);
   if(read.sha256!==operator.sha256)throw Error('CP13_OPERATOR_RETURN_READBACK_HOLD');
  }
  if(cross){
   store.setItem(CP13_CROSS_SLOT,json(cross));
   const read=JSON.parse(store.getItem(CP13_CROSS_SLOT));
   if(read.sha256!==cross.sha256||await verifyCross(read,subtle)===null)
    throw Error('CP13_CROSS_RETURN_READBACK_HOLD');
  }
  store.setItem(CP13_LEDGER_SLOT,json({...ledger,seen:[...ledger.seen,packet.sha256]}));
  if(!readLedger(store).seen.includes(packet.sha256))throw Error('CP13_LEDGER_READBACK_HOLD');
 }catch(e){
  for(const [k,v] of prior){if(v===null)store.removeItem(k);else store.setItem(k,v)}
  throw e;
 }
 return receipt;
}
