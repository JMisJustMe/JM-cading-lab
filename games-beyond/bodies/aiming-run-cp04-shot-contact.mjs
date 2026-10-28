/* JM CP04 — original Aiming Run shot_release → four native coding bodies
 * → real targetAmp response. Does not create a shot/hit/score, alter donor HTML,
 * or convert an in-browser hash chain into cryptographic author authentication.
 */
import {AIMING_RUN_SOURCE_SHA} from './aiming-run-cp03-recipient.mjs';
import {specialistPrograms,executeSpecialistLine} from '../../coding-estate/everybody/specialist-execution-cp02.mjs';
const sessions=new WeakMap();
const out=(ok,status,extra={})=>({schema:'JM.AimingRun.CP04ShotContact/1.0',ok,status,...extra,
  boundary:'Observed original Aiming Run shot_release with original receipt continuity (noncryptographic). Four current JM coding sources execute through CP02; original game physics reads amended targetAmp. Not a manufactured hit, forged game score, historical-native, physical Fold or release proof.'});
function hashString(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)}return('00000000'+(h>>>0).toString(16)).slice(-8);}
export function verifyAimingRunReceiptChain(state){
 const receipts=state?.receipts;
 if(!Array.isArray(receipts)||!receipts.length||receipts.length>20000)return false;
 let previous='00000000';
 for(const r of [...receipts].reverse()){
  if(!r||typeof r!=='object'||r.previousHash!==previous||typeof r.hash!=='string')return false;
  const c=JSON.parse(JSON.stringify(r));delete c.hash;
  if(hashString(JSON.stringify(c))!==r.hash)return false;
  previous=r.hash;
 }
 return previous===state.previousHash;
}
function live(game){
 if(!game||typeof game.projectBody!=='function'||typeof game.startRun!=='function')throw Error('NOT_ORIGINAL_AIMING_RUN');
 const meta=game.projectBody(),s=game.state;
 if(!s||meta.schema!=='JM.AimingRunBody/0.1'||meta.version!=='0.1A-alpha'||meta.source?.sha256!==AIMING_RUN_SOURCE_SHA)throw Error('RECIPIENT_SOURCE_HOLD');
 if(!Array.isArray(s.tracks)||!Number.isInteger(s.trackIndex)||s.trackIndex<0||s.trackIndex>=s.tracks.length)throw Error('TRACK_ROUTE_HOLD');
 const track=s.tracks[s.trackIndex];
 if(track?.id!==meta.track?.id||typeof track.targetAmp!=='number'||!Number.isFinite(track.targetAmp)||track.targetAmp<1||track.targetAmp>200)throw Error('TRACK_AMPLITUDE_HOLD');
 if(!verifyAimingRunReceiptChain(s))throw Error('RECEIPT_CHAIN_HOLD');
 return {s,track,meta};
}
function shotWitness(s,track){
 const event=s.events?.[0],receipt=s.receipts?.[0];
 if(event?.type!=='shot_release'||receipt?.reason!=='Shot released'||receipt.track!==track.id)throw Error('NO_ORIGINAL_SHOT_EVENT');
 const power=event.body?.power;
 if(!Number.isInteger(power)||power<=0||power>100||receipt.extra?.power!==power)throw Error('SHOT_POWER_MISMATCH');
 if(typeof s.shots!=='number'||s.shots<1||!s.projectiles?.some(p=>p?.live===true))throw Error('NO_ACTUAL_PROJECTILE');
 if(typeof s.running!=='boolean'||!s.running||s.paused)throw Error('SHOT_NOT_DURING_LIVE_GAME');
 if(typeof receipt.hash!=='string'||receipt.hash.length!==8)throw Error('BAD_RECEIPT_HASH');
 return {power,receiptHash:receipt.hash,time:event.time,shots:s.shots};
}
export function applyOriginalShotResponseCP04(game,registry,current64,{by=5,threshold=50,team='bird'}={}){
 try{
  const {s,track,meta}=live(game),witness=shotWitness(s,track);
  let session=sessions.get(s);
  if(!session){session={used:new Set(),active:null};sessions.set(s,session);}
  if(session.active)throw Error('CP04_RESPONSE_MUST_RESTORE_FIRST');
  if(session.used.has(witness.receiptHash))throw Error('SHOT_ALREADY_CONSUMED');
  // The ORIGINAL user/game-generated power, not a slider or invented shot, becomes energy.
  const programs=specialistPrograms(registry,{energy:witness.power,by,threshold,team,points:2});
  const producer=executeSpecialistLine(programs,registry,current64);
  if(!producer.ok||!producer.committed||producer.receipts?.length!==4)throw Error('CP02_PRODUCER_HOLD');
  if(producer.state.energy!==witness.power)throw Error('SHOT_ENERGY_ROUTE_HOLD');
  const pressure=producer.state.pressure,met=producer.state.game.thresholdMet;
  if(typeof pressure!=='number'||!Number.isFinite(pressure)||typeof met!=='boolean')throw Error('PRODUCER_EFFECT_INVALID');
  const before=track.targetAmp;
  const factor=met?1+Math.min(Math.max(pressure,0),100)*.006:.82;
  const after=Math.round(Math.min(200,Math.max(4,before*factor))*1000)/1000;
  if(before===after)throw Error('NO_GAMEPLAY_DELTA');
  const prev={score:s.score,hits:s.hits,shots:s.shots,misses:s.misses,streak:s.streak};
  track.targetAmp=after;
  if(track.targetAmp!==after)throw Error('RECIPIENT_WRITE_FAILED');
  session.active={track,trackId:track.id,before,after,shotHash:witness.receiptHash};
  session.used.add(witness.receiptHash);
  if(session.used.size>128)session.used.delete(session.used.values().next().value);
  return out(true,'REAL_SHOT_CHANGED_LIVE_TARGET_MOTION',{
   recipient:{game:meta.name,trackId:track.id,sourceSHA:meta.source.sha256},
   event:{type:'shot_release',power:witness.power,shotReceiptHash:witness.receiptHash,shots:witness.shots},
   producer:{identity:producer.receipts.map(r=>({bodyId:r.bodyId,codeId:r.codeId,effect:r.effect})),pressure,thresholdMet:met},
   before:{targetAmp:before,...prev},after:{targetAmp:after,score:s.score,hits:s.hits,shots:s.shots,misses:s.misses,streak:s.streak},
   actualPhysics:'Original target.y = baseY + sin(age * targetSpeed * targetMotion + phase) * targetAmp'
  });
 }catch(err){return out(false,'HOLD_NO_EVENT_EFFECT',{diagnostic:String(err.message??err)});}
}
export function restoreOriginalShotResponseCP04(game){
 try{
  const {s,track}=live(game),session=sessions.get(s),active=session?.active;
  if(!active)throw Error('NO_CP04_ACTIVE_EFFECT');
  if(s.running&&!s.paused)throw Error('PAUSE_BEFORE_RESTORE');
  if(track!==active.track||track.id!==active.trackId||track.targetAmp!==active.after)throw Error('GAME_STATE_DRIFT_HOLD');
  track.targetAmp=active.before;
  if(track.targetAmp!==active.before)throw Error('RESTORE_READBACK_HOLD');
  session.active=null;
  return out(true,'ORIGINAL_TARGET_AMPLITUDE_RESTORED',{trackId:track.id,targetAmp:track.targetAmp,consumedShot:active.shotHash});
 }catch(err){return out(false,'HOLD_NO_RESTORE_WRITE',{diagnostic:String(err.message??err)});}
}
