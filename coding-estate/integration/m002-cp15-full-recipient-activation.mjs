/**
 * CP15: scoped activation contract for FULL recipient applications.
 * Actual owner's private one-file FIVE//FLIP and Comic Atelier are NOT
 * published. This native module proves their mapping, source authority and
 * independent action semantics. Separate browser tests exercise full apps.
 */
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const copy=x=>structuredClone(x);
const modes={protect:'GUARD_FIELD',explore:'ROUTE_LEAP',amplify:'RESONANCE_BLAST'};
export const CP15_AUTHORITY=Object.freeze({
 schema:'jm.m002.cp15.recipient-activation-authority/1',
 source:'CP14 typed CP11 recipient export, with independently approved game/comic source',
 game:'actual character mapping must be explicit, no assumed Krix=ARC identity',
 comic:'source actor and all original layer commands retained in illustrated edition',
 proof:'Native host mutations here plus separate actual owner-private browser game/comic tests',
 hold:'No native APK, automatic cloud sync, original THEOGRAPHY executable, full match restore or production illustration claim'
});
export function inspectCP15Export(x,kind){
 if(x?.schema!=='jm.m002.cp14.recipient-export/1'||x.kind!==kind||
  !Number.isInteger(x.revision)||x.revision<1||
  !/^[0-9a-f]{64}$/.test(x.sha256||'')||hash(x.value)!==x.sha256)
  throw Error('CP15_EXPORT_HASH_OR_SCHEMA_HOLD');
 if(kind==='game'){
  const v=x.value,e=v?.events?.at(-1);
  if(v?.schema!=='jm.m002.cp11.game-host/1'||!v.selected||
    !v.allies?.some(a=>a.id===v.selected)||
    !Array.isArray(v.enemies)||!v.enemies.length||
    v.events?.length!==1||e?.type!=='CP11_COMPOSITION_EXECUTED'||
    e.source!=='CP10_NATIVE_COMPOSITION'||e.actor!==v.selected||
    modes[e.choice]!==e.action)throw Error('CP15_GAME_ORIGINAL_EFFECT_HOLD');
  return {sha256:x.sha256,kind,revision:x.revision,
   subject:v.selected,choice:e.choice,action:e.action,status:'REVIEW_ONLY'};
 }
 if(kind==='comic'){
  const v=x.value,panels=v?.pages;
  if(v?.schema!=='jm.m002.cp11.comic-host/1'||!v.owner||!Array.isArray(panels)||
   panels.length<3||panels.length>6||new Set(panels.map(p=>p.actor)).size!==1||
   new Set(panels.map(p=>p.layerCommands?.find(c=>c.op==='figure')?.pose)).size!==1||
   !Object.hasOwn(modes,panels[0].layerCommands.find(c=>c.op==='figure')?.pose)||
   panels.some(p=>typeof p.caption!=='string'||p.caption.length>180||
    !Array.isArray(p.layerCommands)||p.layerCommands.length!==3||
    !p.layerCommands.some(c=>c.op==='speech'&&c.text===p.caption)))
   throw Error('CP15_COMIC_ORIGINAL_LAYER_HOLD');
  return {sha256:x.sha256,kind,revision:x.revision,subject:panels[0].actor,
   choice:panels[0].layerCommands.find(c=>c.op==='figure').pose,
   panels:panels.length,status:'REVIEW_ONLY'};
 }
 throw Error('CP15_UNDECLARED_RECIPIENT_HOLD');
}
export function applyCP15Game(x,original,{recipientHero,approve=false,seen=[]}={}){
 if(approve!==true)throw Error('CP15_OWNER_APPROVAL_HOLD');
 const proof=inspectCP15Export(x,'game');
 if(!original||original.schema!=='jm.m002.cp15.live-game-scope/1'||original.phase!=='PLAYING'||
  !Array.isArray(original.allies)||!Array.isArray(original.enemies)||
  !Array.isArray(original.events))throw Error('CP15_GAME_HOST_HOLD');
 if(seen.includes(proof.sha256))throw Error('CP15_REPLAY_HOLD');
 if(!['RUSH','BRICK','ARC','JINX','LINK'].includes(recipientHero))
  throw Error('CP15_EXPLICIT_FIGHTER_MAPPING_HOLD');
 const next=copy(original),hero=next.allies.find(p=>p.name===recipientHero&&p.alive);
 if(!hero)throw Error('CP15_ACTIVE_HERO_REQUIRED_HOLD');
 const before=hash(original),sourceSubject=proof.subject;let evidence;
 if(proof.action==='GUARD_FIELD'){
  let applied=0;for(const ally of next.allies.filter(p=>p.alive)){
   ally.guard=Math.max(ally.guard||0,4.5);applied++;
  }
  if(!applied)throw Error('CP15_GUARD_NO_TARGET_HOLD');
  evidence={kind:'LIVE_ALLIED_GUARD',count:applied};
 }else if(proof.action==='ROUTE_LEAP'){
  const from=hero.x;hero.x=Math.min(1040,Math.max(160,hero.x+175*(hero.face||1)));
  if(from===hero.x)throw Error('CP15_NO_ACTUAL_MOVEMENT_HOLD');
  evidence={kind:'LIVE_FIGHTER_MOVEMENT',from,to:hero.x};
 }else if(proof.action==='RESONANCE_BLAST'){
  const victim=next.enemies.filter(p=>p.alive&&p.hp>0).sort((a,b)=>
   Math.abs(a.x-hero.x)-Math.abs(b.x-hero.x))[0];
  if(!victim)throw Error('CP15_NO_DAMAGEABLE_OPPONENT_HOLD');
  const from=victim.hp;victim.hp=Math.max(0,victim.hp-22);
  if(from===victim.hp)throw Error('CP15_NO_ACTUAL_DAMAGE_HOLD');
  victim.alive=victim.hp>0;evidence={kind:'LIVE_ENEMY_HEALTH_MUTATION',target:victim.name,from,to:victim.hp};
 }else throw Error('CP15_UNKNOWN_EFFECT_HOLD');
 next.events.push({kind:'JM_CP15_SOURCE_EFFECT',choice:proof.choice,sourceActor:sourceSubject,
  receivingHero:recipientHero,sourceSha256:proof.sha256,effect:evidence});
 if(hash(original)===hash(next))throw Error('CP15_NO_MUTATION_HOLD');
 return {schema:'jm.m002.cp15.game-result/1',status:'ACTUAL_LIVE_RECIPIENT_MUTATION',
  beforeSha256:before,afterSha256:hash(next),sourceActor:sourceSubject,receivingHero:recipientHero,
  identityMappedExplicitly:sourceSubject!==recipientHero,evidence,sourceSha256:proof.sha256,
  recipient:next,seen:[...seen,proof.sha256]};
}
export function applyCP15Comic(x,original,{approve=false,seen=[]}={}){
 if(approve!==true)throw Error('CP15_OWNER_APPROVAL_HOLD');
 const proof=inspectCP15Export(x,'comic');
 if(!original||original.schema!=='jm.m002.cp11.comic-edition/1'||
  !Array.isArray(original.panels)||!Array.isArray(original.captions)||
  original.panels.length!==original.captions.length||
  !Number.isInteger(original.edition))throw Error('CP15_COMIC_HOST_HOLD');
 if(seen.includes(proof.sha256))throw Error('CP15_REPLAY_HOLD');
 const next=copy(original),backup=copy(original);
 const panels=x.value.pages.map((p,i)=>({
  framing:p.layout.frame,shot:i===1?'recovery':i===x.value.pages.length-1?'consequence':'source',
  caption:p.caption,dialogue:p.caption,
  source:{typedSha256:proof.sha256,actor:p.actor,originalLayerCommands:copy(p.layerCommands),
   contactContinuity:copy(p.contactContinuity)} }));
 next.panels=panels;next.captions=panels.map(p=>p.caption);
 next.source={contactGate:true,choice:proof.choice,subject:proof.subject,
  earned:copy(x.value.pages.at(-1).contactContinuity),
  effect:{allowed:true,effect:{kind:'CP15_AUTHORIAL_PAGE_INHERITANCE'}},
  cp15ReturnedSha256:proof.sha256};
 next.edition++;
 return {schema:'jm.m002.cp15.comic-result/1',status:'EDITABLE_ILLUSTRATION_EDITION_CREATED',
  beforeSha256:hash(original),afterSha256:hash(next),originalBackup:backup,
  sourceActor:proof.subject,sourceSha256:proof.sha256,
  panels:next.panels.length,recipient:next,seen:[...seen,proof.sha256],
  boundary:'Existing illustrated canvas renders this native output through separately tested owner-private recipient.'};
}
