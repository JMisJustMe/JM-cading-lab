/**
 * JM M002 CP14 — two independent CP11 typed recipient returns.
 * Reuses CP13 CP12_CROSS_SLOT; no new operator or silent game import.
 * Browser/Node pure module; SHA256 detects corruption, never sender identity.
 */
import {CP13_CROSS_SLOT} from './m002-cp13-device-return.mjs';
export const CP14_GAME_SLOT='JM_M002_CP14_GAME_TYPED_RETURN_v01';
export const CP14_COMIC_SLOT='JM_M002_CP14_COMIC_TYPED_RETURN_v01';
export const CP14_APPLIED_SLOT='JM_M002_CP14_APPLIED_RECEIPTS_v01';
const te=new TextEncoder(), own=x=>structuredClone(x);
const sha=async(x,subtle)=>[...new Uint8Array(await subtle.digest('SHA-256',te.encode(x)))]
 .map(b=>b.toString(16).padStart(2,'0')).join('');
const slots={game:CP14_GAME_SLOT,comic:CP14_COMIC_SLOT};
const deepScan=(x,d=0)=>{
 if(d>24)throw Error('CP14_DEPTH_HOLD');
 if(x&&typeof x==='object')for(const [k,v] of Object.entries(x)){
  if(['__proto__','prototype','constructor'].includes(k))throw Error('CP14_UNSAFE_KEY_HOLD');
  deepScan(v,d+1);
 }
};
function typed(kind,x){
 deepScan(x);
 if(kind==='game'){
  if(x?.schema!=='jm.m002.cp11.game-host/1'||!Array.isArray(x.allies)||!x.allies.length||
   !Array.isArray(x.enemies)||!x.enemies.length||typeof x.selected!=='string'||
   !x.allies.some(a=>a.id===x.selected)||!Array.isArray(x.events))throw Error('CP14_GAME_TYPE_HOLD');
 }else if(kind==='comic'){
  if(x?.schema!=='jm.m002.cp11.comic-host/1'||!Array.isArray(x.pages)||
   !Number.isInteger(x.edition)||x.edition<0||typeof x.owner!=='string')
   throw Error('CP14_COMIC_TYPE_HOLD');
 }else throw Error('CP14_RECIPIENT_KIND_HOLD');
 return x;
}
async function wrap(kind,x,revision,subtle){
 typed(kind,x);
 const body=JSON.stringify(x);
 if(te.encode(body).length>120000)throw Error('CP14_RECIPIENT_SIZE_HOLD');
 return {schema:'jm.m002.cp14.typed-return/1',kind,revision,body,sha256:await sha(body,subtle)};
}
async function read(store,kind,subtle,required=true){
 const raw=store.getItem(slots[kind]);
 if(raw===null){if(required)throw Error('CP14_RECIPIENT_ABSENT_HOLD');return null;}
 let packet;try{packet=JSON.parse(raw)}catch{throw Error('CP14_LOCAL_JSON_HOLD')}
 if(packet.schema!=='jm.m002.cp14.typed-return/1'||packet.kind!==kind||
  typeof packet.body!=='string'||!/^[a-f0-9]{64}$/.test(packet.sha256||'')||
  !Number.isInteger(packet.revision)||packet.revision<0||
  await sha(packet.body,subtle)!==packet.sha256)throw Error('CP14_LOCAL_HASH_HOLD');
 let value;try{value=JSON.parse(packet.body)}catch{throw Error('CP14_LOCAL_BODY_HOLD')}
 typed(kind,value);
 return {packet,value};
}
async function cross(store,subtle){
 const raw=store.getItem(CP13_CROSS_SLOT);
 if(!raw)throw Error('CP14_CP13_CARRIER_ABSENT_HOLD');
 let env;try{env=JSON.parse(raw)}catch{throw Error('CP14_CARRIER_JSON_HOLD')}
 if(env?.schema!=='jm.m002.cp12.cross-receiver-envelope/1'||typeof env.body!=='string'||
  te.encode(env.body).length>100000||!/^[a-f0-9]{64}$/.test(env.sha256||'')||
  await sha(env.body,subtle)!==env.sha256)throw Error('CP14_CARRIER_HASH_HOLD');
 let b;try{b=JSON.parse(env.body)}catch{throw Error('CP14_SOURCE_JSON_HOLD')}
 deepScan(b);
 if(b.schema!=='jm.m002.cp12.cross-receiver-body/1'||b.source?.portableDing!==true||
  !b.source.contact?.routeOpen||b.source.contact.earned?.length!==b.stations||
  !['protect','explore','amplify'].includes(b.choice)||
  b.receiving?.game?.state?.schema!=='jm.m002.cp11.game-host/1'||
  b.receiving?.comic?.state?.schema!=='jm.m002.cp11.comic-host/1'||
  !Array.isArray(b.receiving?.game?.changes)||b.receiving.game.changes.length===0||
  !Array.isArray(b.receiving?.comic?.changes)||b.receiving.comic.changes.length===0||
  b.receiving.game.state.events?.at(-1)?.choice!==b.choice||
  b.receiving.comic.state.pages?.some(p=>p.actor!==b.subject)||
  !/^[a-f0-9]{64}$/.test(b.ancestors?.game||'')||
  !/^[a-f0-9]{64}$/.test(b.ancestors?.comic||''))
  throw Error('CP14_CP12_SOURCE_CONTRACT_HOLD');
 // Validate original-value destination types before approving any mutation.
 typed('game',b.receiving.game.state);typed('comic',b.receiving.comic.state);
 return {env,b};
}
function ledger(store){
 const raw=store.getItem(CP14_APPLIED_SLOT);
 if(raw===null)return {schema:'jm.m002.cp14.application-ledger/1',seen:[]};
 let x;try{x=JSON.parse(raw)}catch{throw Error('CP14_LEDGER_JSON_HOLD')}
 if(x?.schema!=='jm.m002.cp14.application-ledger/1'||!Array.isArray(x.seen)||
  x.seen.length>1000||new Set(x.seen).size!==x.seen.length||
  x.seen.some(x=>typeof x!=='string'||!/^[a-f0-9]{64}:(game|comic)$/.test(x)))
  throw Error('CP14_LEDGER_HOLD');
 return x;
}
export async function registerCP14Original(store,{game,comic},subtle=crypto.subtle){
 if(store.getItem(CP14_GAME_SLOT)!==null||store.getItem(CP14_COMIC_SLOT)!==null)
  throw Error('CP14_EXISTING_OWNER_PROJECT_HOLD');
 const both={game:await wrap('game',game,0,subtle),comic:await wrap('comic',comic,0,subtle)};
 const previous=[CP14_GAME_SLOT,CP14_COMIC_SLOT].map(k=>[k,store.getItem(k)]);
 try{
  store.setItem(CP14_GAME_SLOT,JSON.stringify(both.game));
  store.setItem(CP14_COMIC_SLOT,JSON.stringify(both.comic));
  for(const k of ['game','comic']){
   const recovered=await read(store,k,subtle);
   if(recovered.packet.sha256!==both[k].sha256)throw Error('CP14_BASELINE_READBACK_HOLD');
  }
 }catch(e){for(const [k,v] of previous)v===null?store.removeItem(k):store.setItem(k,v);throw e;}
 return {status:'OWNER_RECIPIENTS_REGISTERED_WITH_READBACK',
  gameSha256:both.game.sha256,comicSha256:both.comic.sha256};
}
export async function inspectCP14RecipientReturn(store,kind,subtle=crypto.subtle){
 if(!Object.hasOwn(slots,kind))throw Error('CP14_RECIPIENT_KIND_HOLD');
 const {env,b}=await cross(store,subtle),local=await read(store,kind,subtle);
 const prior=ledger(store),receiptKey=env.sha256+':'+kind;
 if(prior.seen.includes(receiptKey))throw Error('CP14_RECIPIENT_ALREADY_APPLIED_HOLD');
 if(local.packet.sha256!==b.ancestors[kind])throw Error('CP14_STALE_RECIPIENT_CONFLICT_HOLD');
 const target=await wrap(kind,b.receiving[kind].state,local.packet.revision+1,subtle);
 if(target.sha256===local.packet.sha256)throw Error('CP14_NO_ACTUAL_MUTATION_HOLD');
 const proposal={schema:'jm.m002.cp14.recipient-review/1',kind,
  originSha256:local.packet.sha256,sourceSha256:env.sha256,
  targetSha256:target.sha256,revision:target.revision,
  choice:b.choice,subject:b.subject,changes:own(b.receiving[kind].changes),
  impact:kind==='game'?'real typed actor/health/guard state':'real typed page/edition state'};
 const reviewToken=await sha(JSON.stringify(proposal),subtle);
 return {...proposal,reviewToken,status:'REVIEW_ONLY_NO_STATE_CHANGE'};
}
export async function applyCP14RecipientReturn(store,kind,reviewToken,
 {approve=false}={},subtle=crypto.subtle){
 if(approve!==true)throw Error('CP14_EXPLICIT_OWNER_APPROVAL_HOLD');
 const check=await inspectCP14RecipientReturn(store,kind,subtle);
 if(check.reviewToken!==reviewToken)throw Error('CP14_REVIEW_CHANGED_HOLD');
 const {env,b}=await cross(store,subtle),existing=await read(store,kind,subtle);
 const next=await wrap(kind,b.receiving[kind].state,existing.packet.revision+1,subtle);
 if(next.sha256!==check.targetSha256)throw Error('CP14_TARGET_DRIFT_HOLD');
 const l=ledger(store),key=env.sha256+':'+kind;
 const touched=[slots[kind],CP14_APPLIED_SLOT].map(k=>[k,store.getItem(k)]);
 try{
  store.setItem(slots[kind],JSON.stringify(next));
  store.setItem(CP14_APPLIED_SLOT,JSON.stringify({...l,seen:[...l.seen,key]}));
  const readback=await read(store,kind,subtle);
  if(readback.packet.sha256!==next.sha256||!ledger(store).seen.includes(key))
   throw Error('CP14_COMMIT_READBACK_HOLD');
 }catch(e){for(const [k,v] of touched)v===null?store.removeItem(k):store.setItem(k,v);throw e;}
 return {schema:'jm.m002.cp14.real-recipient-application/1',
  status:'RECIPIENT_APPLIED_READBACK_VERIFIED',kind,sourceSha256:env.sha256,
  recipientSha256:next.sha256,revision:next.revision,
  mutationCount:check.changes.length,scope:'TYPED CP11 RECIPIENT STATE, NOT PRIVATE GAME/COMIC UI APP'};
}
export async function exportCP14Recipient(store,kind,subtle=crypto.subtle){
 const readback=await read(store,kind,subtle);
 return {schema:'jm.m002.cp14.recipient-export/1',kind,
  value:own(readback.value),sha256:readback.packet.sha256,revision:readback.packet.revision};
}
