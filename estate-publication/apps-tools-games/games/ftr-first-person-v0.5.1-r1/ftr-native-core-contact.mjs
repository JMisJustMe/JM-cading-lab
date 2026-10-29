/**
 * JM FTR native live recipient v0.1, 2026-10-29.
 * Imports the ACTUAL sovereign Game-CODING + JM GameCore and existing FTR
 * KicPlay translator straight from this JM repository, without vendoring.
 * Original frozen game and its API remain unchanged.
 * No Gardles-native source has been recovered/mounted: not a Gardles claim.
 */
import {GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime} from '../../../../coding-estate/sovereign-ten/direct/game-native.mjs';
import {contactEvent,planExistingFirstPersonContact} from '../../../../coding-estate/integration/ftr-eight-contact.mjs';

const ftr=window.FTR;
if(!ftr || typeof ftr.command!=='function' || typeof ftr.state!=='function')throw Error('JM_NATIVE_RECIPIENT_NOT_PRESENT');

const gameSource=`entity Link {
 ready = false
 verdict = "pending"
}
mechanic EarnedCorePulse {
 requires link.ready == true
 effect link.verdict = "approved"
}`;
const coreSource=`organ FTRLinkOrgan {
 handles = [Link]
 rules = [EarnedCorePulse]
 invariants = {
 link.verdict == "approved"
 }
}
system FTRNativeLink {
 organs = [FTRLinkOrgan]
 events = [CorePulse]
 identity = "JM.FTR.NativeCorePulse"
}`;
const gameAst=GameCoding.parse(gameSource), coreAst=JMGameCore.parse(coreSource);
const history=[];
let last=null;
function record(receipt){
 last=receipt;
 history.push(receipt);
 if(history.length>24)history.shift();
 return receipt;
}
function snapshot(){return ftr.state();}
function availability(state){
 if(!state.running)return 'GAME_NOT_RUNNING';
 if(state.player.cores<1)return 'TRACE_CORE_REQUIRED';
 if(state.player.ammo<1)return 'AMMO_REQUIRED';
 if(state.player.scanCd>0)return 'SCAN_COOLDOWN';
 if(state.player.fireCd>0)return 'FIRE_COOLDOWN';
 return null;
}
/**
 * NEW real gameplay consequence, not an aesthetic state:
 * after acquiring one existing Trace Core, use a combined SCAN + FIRE action.
 * This consumes original scan cooldown and ammunition, so earning and spending
 * are observable. Original player HP, cores, world and enemy AI remain authoritative.
 * Game-CODING gates, GameCore dispatches and validates the approved rule.
 */
function corePulse(){
 const before=snapshot();
 const denied=availability(before);
 const game=new GameCodingRuntime(gameAst,{link:{ready:!denied,verdict:'pending'}});
 const core=new JMGameCoreRuntime(coreAst,game);
 if(denied){
  const gate=game.trigger('EarnedCorePulse'); // actual Game-CODING false branch
  if(gate.applied)throw Error('JM_NATIVE_DENIAL_INCONSISTENT');
  return record({schema:'jm.ftr.native-pulse/0.1',status:'DENIED',reason:denied,
   nativeGate:gate,originalBefore:before,originalAfter:snapshot(),
   gardles:'NATIVE_SOURCE_NOT_MOUNTED'});
 }
 const decision=core.dispatch('FTRNativeLink','CorePulse');
 if(decision.executions.length!==1||decision.executions[0].applied!==true||
    decision.state.link.verdict!=='approved')throw Error('JM_NATIVE_CORE_DECISION_NOT_APPLIED');
 ftr.command('SCAN');
 ftr.command('FIRE');
 const after=snapshot();
 const changed=after.run.scans===before.run.scans+1&&after.run.shots===before.run.shots+1&&
   after.player.ammo===before.player.ammo-1&&after.player.scanCd>before.player.scanCd;
 if(!changed)throw Error('JM_FTR_NATIVE_TO_GAMEPLAY_CONSEQUENCE_FAILED');
 return record({schema:'jm.ftr.native-pulse/0.1',status:'APPLIED',
   body:'JM Game-CODING + JM GameCore',action:'EARNED_CORE_PULSE',
   originalBefore:{cores:before.player.cores,ammo:before.player.ammo,scans:before.run.scans,shots:before.run.shots},
   originalAfter:{cores:after.player.cores,ammo:after.player.ammo,scans:after.run.scans,shots:after.run.shots},
   nativeIdentity:decision.identity,nativeReceipt:decision.receipt,
   traceDigest:decision.receipt.traceDigest,gardles:'NATIVE_SOURCE_NOT_MOUNTED'});
}
/**
 * KicPlay contact from original FTR contact code, delivered to original
 * window.FTR.command; retains source and reports actual game changes.
 * Not proof a physical Ama-Pro/GripRoute/PalmVerse controller was attached.
 */
function kicPlay({source,gesture,pressure=0,sequence=0,capabilities=[]}){
 const contact=contactEvent({source,gesture,pressure,sequence,capabilities});
 const plan=planExistingFirstPersonContact(contact);
 if(plan.status!=='ROUTABLE')return record({schema:'jm.ftr.native-kicplay/0.1',
   status:plan.status,source,route:contact.kicPlay,delivered:false,gardles:'NATIVE_SOURCE_NOT_MOUNTED'});
 const before=snapshot();
 ftr.command(plan.command.name,plan.command.payload);
 const after=snapshot();
 return record({schema:'jm.ftr.native-kicplay/0.1',status:'DELIVERED',source,route:contact.kicPlay,
   command:plan.command.name,delivered:true,
   before:{running:before.running,ammo:before.player.ammo,phases:before.run.phases,shots:before.run.shots},
   after:{running:after.running,ammo:after.player.ammo,phases:after.run.phases,shots:after.run.shots},
   gardles:'NATIVE_SOURCE_NOT_MOUNTED',physicalController:'NOT_TESTED'});
}
const button=document.getElementById('jmNativePulse');
if(!button)throw Error('JM_NATIVE_CORE_PULSE_CONTROL_MISSING');
button.addEventListener('click',()=>{const result=corePulse();button.title=result.status==='DENIED'?result.reason:'SCAN + FIRE performed';});
addEventListener('keydown',event=>{
 if(event.code==='KeyG'&&!event.repeat&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
  event.preventDefault();corePulse();
 }
});
let lastStatus='';
function refreshButton(now){
 if(now-lastStatusUpdate>=250){
  lastStatusUpdate=now;
  const s=snapshot(),reason=availability(s);
  const status=reason==='TRACE_CORE_REQUIRED'?'CORE PULSE · 1 CORE':reason==='GAME_NOT_RUNNING'?'CORE PULSE':reason?'CORE PULSE · WAIT':'CORE PULSE · READY';
  if(status!==lastStatus){button.textContent=status;lastStatus=status;}
  button.setAttribute('aria-disabled',reason?'true':'false');
 }
 requestAnimationFrame(refreshButton);
}
let lastStatusUpdate=-1000;
requestAnimationFrame(refreshButton);
window.JMFTRNative=Object.freeze({
 schema:'jm.ftr.native-live/0.1',source:'original JM sovereign game-native.mjs',
 bodies:Object.freeze(['GameCoding','GameCodingRuntime','JMGameCore','JMGameCoreRuntime','FTR KicPlay contact']),
 corePulse,kicPlay,eligibility:()=>availability(snapshot()),last:()=>last,
 recent:()=>history.slice(),nativeGardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED',
 physicalControl:'NOT_TESTED'
});
