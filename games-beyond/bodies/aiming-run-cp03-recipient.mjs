/* JM CP03 — Opt-in, reversible recipient bridge for sovereign Aiming Run v0.1A.
 * CP02 owns computed threshold. Aiming Run keeps shots, hits, score and play rules.
 * This is NOT a source patch to the original game, or a claimed physical Fold test.
 */
export const AIMING_RUN_SOURCE_SHA='1d1fe40eb421bd4b9d7c2565e69af48b77041818ed48d8997aae2d112bc37aa7';
const anchors=new WeakMap();
const result=(ok,status,more={})=>({schema:'JM.AimingRun.CP03RecipientContact/1.0',ok,status,...more,
 boundary:'CP02 has its own four-native-body host proof. Aiming Run keeps all native input, hit, score and track logic; CP03 only modifies the live per-track targetSpeed temporarily. Not a new gameplay hit, final release, separate process or physical Fold PASS.'});
function checkRecipient(game){
 if(!game||typeof game.projectBody!=='function'||!game.state||typeof game.startRun!=='function') throw Error('NO_REAL_AIMING_RUN');
 const source=game.projectBody(),s=game.state;
 if(source.schema!=='JM.AimingRunBody/0.1'||source.name!=='Aiming Run'||
    source.source?.sha256!==AIMING_RUN_SOURCE_SHA||source.version!=='0.1A-alpha')throw Error('AIMING_RUN_SOURCE_MISMATCH');
 if(!Array.isArray(s.tracks)||!Number.isInteger(s.trackIndex)||s.trackIndex<0||s.trackIndex>=s.tracks.length)throw Error('AIMING_RUN_TRACK_MISMATCH');
 const track=s.tracks[s.trackIndex];
 if(!track||track.id!==source.track?.id||typeof track.targetSpeed!=='number'||!Number.isFinite(track.targetSpeed)||track.targetSpeed<=0||track.targetSpeed>5)throw Error('AIMING_RUN_TRACK_MISMATCH');
 if(s.running&&!s.paused)throw Error('RUN_IN_MOTION_HOLD');
 return {s,track,source};
}
function checkProducer(ex){
 if(ex?.schema!=='JM.CodingEstate.SpecialistExecution/0.1'||ex?.ok!==true||ex?.committed!==true||
    ex.status!=='BOUNDED_SPECIALIST_HOST_PASS'||!Array.isArray(ex.receipts)||ex.receipts.length!==4)
   throw Error('CP02_PRODUCER_NOT_PROVEN');
 const expected=[['route-code',26,'route_opened'],['statefield',29,'state_written'],
    ['formula-born-code',21,'formula_add'],['game-coding',39,'game_threshold_score']];
 for(let i=0;i<4;i++){
  const r=ex.receipts[i],[id,code,effect]=expected[i];
  if(r?.bodyId!==id||r.codeId!==code||r.effect!==effect||r.sourceValidated!==true)
   throw Error('CP02_BODY_PROVENANCE_HOLD');
 }
 const p=ex.state?.pressure,g=ex.state?.game;
 if(typeof p!=='number'||!Number.isFinite(p)||p< -1000||p>1000||
    typeof g?.thresholdMet!=='boolean'||!Number.isInteger(g?.score)||g.score<0||g.score>100)
   throw Error('CP02_EFFECT_BOUNDS_HOLD');
 if(ex.receipts[2].delta?.pressure!==p||ex.receipts[3].delta?.score!==g.score||
    ex.receipts[3].delta?.thresholdMet!==g.thresholdMet)
   throw Error('CP02_EFFECT_TRACE_MISMATCH');
 return {pressure:p,game:g};
}
export function applyAimingRunCP03(execution,game){
 try {
  // Assess both source authorities before the first recipient mutation.
  const {pressure,game:producerGame}=checkProducer(execution);
  const {s,track,source}=checkRecipient(game);
  if(anchors.has(s))throw Error('ACTIVE_CP03_MODIFIER_MUST_RESTORE_FIRST');
  // This affects the original game's movement update; never its score or hit proof.
  const multiplier=producerGame.thresholdMet?1+Math.min(Math.max(pressure,0),20)*0.04:0.85;
  const before=track.targetSpeed;
  const after=Math.round(Math.min(3,Math.max(0.5,before*multiplier))*1000)/1000;
  if(after===before)throw Error('NO_RECEIVER_DELTA');
  const scoreBefore=s.score,hitsBefore=s.hits,shotsBefore=s.shots;
  track.targetSpeed=after;
  if(track.targetSpeed!==after)throw Error('RECEIVER_WRITE_NOT_CONFIRMED');
  anchors.set(s,{track,trackId:track.id,before,after});
  return result(true,'RECIPIENT_TARGET_MOTION_CHANGED',{
   recipient:{name:source.name,version:source.version,trackId:track.id,originalSourceSHA:source.source.sha256},
   producer:{bodyIds:execution.receipts.map(r=>r.bodyId),pressure,thresholdMet:producerGame.thresholdMet,scoreOnlyInProducer:producerGame.score},
   before:{targetSpeed:before,gameScore:scoreBefore,hits:hitsBefore,shots:shotsBefore},
   after:{targetSpeed:after,gameScore:s.score,hits:s.hits,shots:s.shots},
   effect:'ORIGINAL_AIMING_RUN_TARGET_SPEED_MUTATED'
  });
 }catch(err){return result(false,'HOLD_NO_NEW_GAME_MUTATION',{diagnostic:String(err.message??err)});}
}
export function restoreAimingRunCP03(game){
 try{
  const {s,track}=checkRecipient(game);
  const held=anchors.get(s);
  if(!held)throw Error('NO_CP03_MODIFIER_TO_RESTORE');
  if(track!==held.track||track.id!==held.trackId||track.targetSpeed!==held.after)throw Error('RECEIVER_DRIFT_HOLD');
  track.targetSpeed=held.before;
  if(track.targetSpeed!==held.before)throw Error('RESTORE_READBACK_FAILED');
  anchors.delete(s);
  return result(true,'ORIGINAL_TARGET_MOTION_RESTORED',{trackId:track.id,targetSpeed:track.targetSpeed});
 }catch(err){return result(false,'HOLD_NO_RESTORE_WRITE',{diagnostic:String(err.message??err)});}
}
