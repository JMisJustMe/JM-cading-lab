/**
 * JM FTR CP15 · EARNED QUIET TRACE
 *
 * Existing FTR E/TRACE action is the one and only interaction authority.
 * Only the genuine ORIGINAL terminal's interaction progress is accelerated
 * when the player has earned an audible distraction, and no original enemy
 * currently has direct LOS to the player. World/route/core state is not copied.
 *
 * CP14 Echo + CP13 actual remembered actor + original FTR LOS
 *        -> actual JM Game-CODING/GameCore native authorisation
 *        -> existing original doInteract(delta) -> original core/mount event
 *        -> earned score if and only if a real original core is mounted.
 *
 * No separate fake trace button, game engine, Gardles, physical sensor or AI.
 */
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime}
 from '../../../../coding-estate/sovereign-ten/direct/game-native.mjs';
if(!window.FTR||typeof window.doInteract!=='function'||
   !window.JMFTREcho||!window.JMFTRMemory||!window.JMFTRSpatial||
   typeof window.los!=='function'||!Array.isArray(terminals))
 throw Error('JM_CP15_ORIGINAL_TRACE_RECIPIENT_ABSENT');

const originalInteract=window.doInteract;
const AST=GameCoding.parse(`entity QuietTrace {
 ready = false
 result = "held"
}
mechanic QuietCoreContact {
 requires quiettrace.ready == true
 effect quiettrace.result = "accelerated"
}`);
const CORE=JMGameCore.parse(`organ QuietOrgan {
 handles = [QuietTrace]
 rules = [QuietCoreContact]
 invariants = {
 quiettrace.result == "accelerated"
 }
}
system JMFTRQuietTrace {
 organs = [QuietOrgan]
 events = [OriginalCoreTrace]
 identity = "JM.FTR.EarnedQuietTrace"
}`);
const speedBoost=1.7,bonus=180;
const text=document.getElementById('jmTraceSignal');
if(!text)throw Error('JM_CP15_TRACE_FEEDBACK_ABSENT');
let session=run.started,eligibleContacts=0,boostedSeconds=0,completed=0,blockedSight=0,last=null;
let earned=new Set(),uiAt=-100;
function reset(){
 if(session===run.started)return;
 session=run.started;eligibleContacts=0;boostedSeconds=0;completed=0;blockedSight=0;
 earned=new Set();last=null;uiAt=-100;refresh();
}
function eligibility(){
 const t=promptTarget?.kind==='terminal'?promptTarget.ref:null;
 if(!running)return {eligible:false,reason:'GAME_NOT_RUNNING',target:null};
 if(!t||t.active||Math.hypot(t.x-player.x,t.y-player.y)>=1.35)
  return {eligible:false,reason:'ORIGINAL_TRACE_NOT_IN_RANGE',target:t?.id||null};
 const echo=window.JMFTREcho.state().active;
 if(!echo||echo.heard<1||!window.JMFTRMemory.enabled())
  return {eligible:false,reason:'EARNED_DISTRACTION_REQUIRED',target:t.id};
 const remembered=enemies.some((enemy,i)=>{
  if(enemy.dead)return false;
  const m=window.JMFTRMemory.inspectEnemy(i);
  return m?.last?.source==='echo'&&!m.sighted;
 });
 if(!remembered)return {eligible:false,reason:'NO_ORIGINAL_ACTOR_INVESTIGATING_ECHO',target:t.id};
 const seen=enemies.some(enemy=>!enemy.dead&&
  Math.hypot(enemy.x-player.x,enemy.y-player.y)<9.5&&
  los(enemy.x,enemy.y,player.x,player.y));
 if(seen)return {eligible:false,reason:'ORIGINAL_ENEMY_DIRECT_SIGHT',target:t.id};
 return {eligible:true,reason:'ORIGINAL_WORLD_DISTRACTION_EARNED',target:t.id};
}
function refresh(){
 if(!running){text.textContent='QUIET TRACE STANDBY';return;}
 const eligible=eligibility();
 text.textContent=eligible.eligible?
  'QUIET TRACE · '+eligible.target+' · 1.7× ORIGINAL HOLD':
  'TRACE NORMAL · '+(eligible.reason==='ORIGINAL_ENEMY_DIRECT_SIGHT'?'THREAT WATCHING':
   eligible.reason==='EARNED_DISTRACTION_REQUIRED'?'CAST AN ECHO':'ORIGINAL HOLD');
}
window.doInteract=function(dt){
 reset();
 if(!Number.isFinite(dt)||dt<=0)return originalInteract(dt);
 const target=promptTarget?.kind==='terminal'?promptTarget.ref:null;
 const check=eligibility();
 if(!check.eligible){if(check.reason==='ORIGINAL_ENEMY_DIRECT_SIGHT')blockedSight++;return originalInteract(dt);}
 const engine=new GameCodingRuntime(AST,{quiettrace:{ready:true,result:'held'}});
 const core=new JMGameCoreRuntime(CORE,engine);
 const receipt=core.dispatch('JMFTRQuietTrace','OriginalCoreTrace');
 if(receipt.executions.length!==1||!receipt.executions[0].applied||
    receipt.state.quiettrace.result!=='accelerated')
  throw Error('JM_CP15_UNEARNED_TRACE_NATIVE_STATE');
 const before=target.progress,wasMounted=target.active,originalScore=player.score;
 // This invokes original FTR doInteract. The original range, E-hold, core
 // activation, map gates, 750 score and original CORE_MOUNT event stay real.
 const response=originalInteract(dt*speedBoost);
 const gain=Math.max(0,target.progress-before);
 if(gain>0){
  boostedSeconds+=gain;eligibleContacts++;
  if(!earned.has(target.id)){
   earned.add(target.id);
   event('JM_QUIET_TRACE_CONTACT',{id:target.id,ratio:speedBoost,
    nativeIdentity:receipt.identity,traceDigest:receipt.receipt.traceDigest});
  }
  last={schema:'jm.ftr.earned-quiet-trace/0.1',
   status:'ORIGINAL_TRACE_ACCELERATED',target:target.id,delta:gain,
   nativeIdentity:receipt.identity,traceDigest:receipt.receipt.traceDigest,
   originalCoreAuthority:true,originalScore};
 }
 if(!wasMounted&&target.active){
  // Reward only after original doInteract performs the actual real capture.
  completed++;player.score+=bonus;updateHUD();
  event('JM_QUIET_CORE_MOUNT',{id:target.id,bonus,originalCoreScore:750,
   from:'original doInteract CORE_MOUNT'});
  last={...last,status:'ORIGINAL_CORE_MOUNTED_QUIETLY',
   target:target.id,originalCoreScore:750,earnedBonus:bonus};
 }
 if(time-uiAt>.15){uiAt=time;refresh();}
 return response;
};
window.JMFTRQuietTrace=Object.freeze({
 schema:'jm.ftr.source-owned-earned-trace/0.1',
 source:'FTR v0.5.1 original doInteract + original los + CP13 enemy memory + CP14 Echo',
 nativeBodies:['JMGameCoreRuntime','GameCodingRuntime'],
 eligibility:()=>{reset();return eligibility()},
 state:()=>({session,eligibleContacts,boostedSeconds,completed,
   blockedSight,last,originalCoreProgress:terminals.map(t=>({id:t.id,progress:t.progress,active:t.active}))}),
 reward:bonus,rate:speedBoost,gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'
});
setInterval(()=>{reset();if(time-uiAt>.45){uiAt=time;refresh();}},450);
refresh();
