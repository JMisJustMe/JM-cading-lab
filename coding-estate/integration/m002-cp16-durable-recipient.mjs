/**
 * JM M002 CP16: source-aware, DIFFERENT durable creative/game recipients.
 * This core validates typed custody and conflict/rollback; it is an additional
 * proof-side organ, not a replacement for owner-private FIVE//FLIP or Comic Atelier.
 */
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const deep=x=>structuredClone(x);
const names=['RUSH','BRICK','ARC','JINX','LINK','BLAZE','AXE','VOLT','SHADE','NOVA'];
function validate(kind,p){
 if(kind==='game'){
  if(p?.schema!=='jm.m002.cp16.whole-match/1'||p.phase!=='PAUSED'||
   !['MANUAL','SEMI'].includes(p.mode)||!Number.isInteger(p.selected)||p.selected<0||p.selected>4||
   typeof p.elapsed!=='number'||p.elapsed<0||p.elapsed>300||
   typeof p.remaining!=='number'||Math.abs(p.elapsed+p.remaining-300)>0.2||
   !Array.isArray(p.bodies)||p.bodies.length!==10||
   !Array.isArray(p.projectiles)||p.projectiles.length>400||
   !Array.isArray(p.particles)||p.particles.length>1800||
   p.bodies.some((b,i)=>b?.id!==i||b?.name!==names[i]||
      !Number.isFinite(b.hp)||b.hp<0||!Number.isFinite(b.maxHp)||b.hp>b.maxHp||
      !Number.isFinite(b.x)||!Number.isFinite(b.y))||
   p.source?.originalFIVEFLIP?.length!==64||
   !p.cp8?.receipts||!p.cp11?.activations||!p.cp15Ledger?.events)
    throw Error('CP16_NATIVE_MATCH_AUTHORITY_HOLD');
 }else if(kind==='comic'){
  if(p?.schema!=='jm.m002.cp16.editable-edition-archive/1'||
   !Array.isArray(p.entries)||p.entries.length>16)throw Error('CP16_NATIVE_ARCHIVE_AUTHORITY_HOLD');
  let last='ROOT';
  for(const [i,x] of p.entries.entries()){
   if(x.sequence!==i+1||x.prev!==last||typeof x.body!=='string'||
      hash(x.body)!==x.sha256)throw Error('CP16_NATIVE_COMIC_CHAIN_HOLD');
   let v;try{v=JSON.parse(x.body)}catch{throw Error('CP16_NATIVE_COMIC_JSON_HOLD')}
   if(v?.schema!=='jm.m002.cp11.comic-edition/1'||!v.source?.subject||
     !Array.isArray(v.panels)||v.panels.length<1||
     !Array.isArray(v.captions)||v.captions.length!==v.panels.length)
    throw Error('CP16_NATIVE_EDITABLE_AUTHORITY_HOLD');
   last=x.sha256;
  }
 }else throw Error('CP16_NATIVE_UNDECLARED_MEDIUM_HOLD');
 return p;
}
export const CP16_NATIVE_SCOPE=Object.freeze({
 schema:'jm.m002.cp16.durable-recipient-contract/1',
 game:'live whole-match original ten-suit runtime snapshot and paused return',
 comic:'editable source-derived panel edition chain, not only exported PNG',
 test:'native custody plus separate owner-private Chromium gameplay and render tests',
 physicalSamsung:'HOLD',cloud:'HOLD',originalTheography:'HOLD',
 source:'CP15 stacked on CP14, original private HTML donor remains private'});
export function sealCP16(kind,p){
 validate(kind,p);
 const body=JSON.stringify(p);
 if(body.length>600000)throw Error('CP16_NATIVE_BODY_SIZE_HOLD');
 return {schema:'jm.m002.cp16.durable-seal/1',kind,
  body,sha256:hash(body)};
}
export function readCP16(packet){
 if(packet?.schema!=='jm.m002.cp16.durable-seal/1'||!['game','comic'].includes(packet.kind)||
   typeof packet.body!=='string'||packet.body.length>600000||
   !/^[a-f0-9]{64}$/.test(packet.sha256||'')||
   hash(packet.body)!==packet.sha256)throw Error('CP16_NATIVE_HASH_HOLD');
 let p;try{p=JSON.parse(packet.body)}catch{throw Error('CP16_NATIVE_BODY_HOLD')}
 return deep(validate(packet.kind,p));
}
export function resumeCP16(live,packet,{approve=false,expectedCurrentSha256=null,seen=[]}={}){
 if(!approve)throw Error('CP16_NATIVE_OWNER_APPROVAL_HOLD');
 if(seen.includes(packet?.sha256))throw Error('CP16_NATIVE_REPLAY_HOLD');
 const payload=readCP16(packet);
 const current=live===null?null:sealCP16(packet.kind,live);
 if(current&&current.sha256!==packet.sha256&&expectedCurrentSha256!==current.sha256)
  throw Error('CP16_NATIVE_CONFLICT_HOLD');
 const prior=live===null?null:deep(live);
 const recovered=deep(payload);
 if(packet.kind==='game'&&recovered.phase!=='PAUSED')throw Error('CP16_NATIVE_FALSE_RESUME_HOLD');
 return {status:'CP16_SCOPED_RETURN_VERIFIED',kind:packet.kind,prior,recovered,
  sourceSha256:packet.sha256,seen:[...seen,packet.sha256],
  receipt:{kind:'CP16_DURABLE_RETURN_DING',stateChanged:JSON.stringify(prior)!==JSON.stringify(recovered)}};
}
