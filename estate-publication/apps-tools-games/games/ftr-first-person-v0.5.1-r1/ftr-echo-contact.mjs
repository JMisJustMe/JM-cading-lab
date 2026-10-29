/**
 * JM FTR CP14 · ORIGINAL-WORLD ECHO LURE
 *
 * Real player control -> original JM Game-CODING + GameCore authorization ->
 * original FTR ammo cost -> world-space signal -> existing CP13 memory
 * -> original FTR hunter/flanker path, collision and investigation.
 *
 * This is a new in-game contact, not a copied game engine, a "RuView"
 * sensor, speculative radio sensing, a 3D GPU renderer or Gardles.
 */
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime}
 from '../../../../coding-estate/sovereign-ten/direct/game-native.mjs';

if(!window.FTR||!window.JMFTRMemory?.hearEcho||!window.JMFTRTactics||
   typeof window.updateWorld!=='function'||typeof window.drawSprites!=='function'||
   typeof window.circleFree!=='function'||typeof window.projectSprite!=='function')
 throw Error('JM_CP14_ORIGINAL_WORLD_MEMORY_CONTACT_MISSING');

const gameSource=`entity Signal {
 ready = false
 outcome = "held"
}
mechanic CastWorldEcho {
 requires signal.ready == true
 effect signal.outcome = "launched"
}`;
const systemSource=`organ SignalOrgan {
 handles = [Signal]
 rules = [CastWorldEcho]
 invariants = {
 signal.outcome == "launched"
 }
}
system FTRWorldEcho {
 organs = [SignalOrgan]
 events = [OriginalWorldEcho]
 identity = "JM.FTR.WorldEcho"
}`;
const gameAst=GameCoding.parse(gameSource),coreAst=JMGameCore.parse(systemSource);
const originalWorld=window.updateWorld,originalSprites=window.drawSprites;
const cost=2,duration=4.5,cooldown=5.5,range=7.2,limit=3;
let session=run.started,charge=0,used=0,active=null,heard=0,pulses=0,last=null;
let lastHud=-100;
const trigger=document.getElementById('jmEchoLaunch');
const status=document.getElementById('jmEchoStatus');
if(!trigger||!status)throw Error('JM_CP14_ECHO_HUD_MISSING');

function reset(){
 if(session===run.started)return;
 session=run.started;charge=0;used=0;active=null;heard=0;pulses=0;last=null;
 lastHud=-100;refresh();
}
function placement(){
 // The player casts into the ORIGINAL source-owned FTR world; never outside
 // it, through a locked door, into a Trace Core or inside living actor bodies.
 for(const d of [2.05,1.75,1.45,1.15]){
  const x=player.x+Math.cos(player.a)*d,y=player.y+Math.sin(player.a)*d;
  if(!circleFree(x,y,.29)||!los(player.x,player.y,x,y))continue;
  if(terminals.some(t=>!t.active&&Math.hypot(t.x-x,t.y-y)<.7))continue;
  if(enemies.some(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<.55))continue;
  if(window.JMFTRCover.state().active&&
    Math.hypot(window.JMFTRCover.state().active.x-x,window.JMFTRCover.state().active.y-y)<.6)continue;
  return {x,y};
 }
 return null;
}
function refuse(reason){
 last={schema:'jm.ftr.echo-contact/0.1',status:'DENIED',reason,
  originalFTR:'0.5.1',native:'JM.FTR.WorldEcho',
  gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'};
 refresh();return last;
}
function launch(){
 reset();
 const position=placement();
 const reason=!running?'GAME_NOT_RUNNING':active?'WORLD_ECHO_ALREADY_ACTIVE':
  used>=limit?'RUN_ECHO_CAPACITY_EXHAUSTED':charge>0?'ECHO_RECHARGING':
  player.reload>0?'ORIGINAL_RELOADING':player.ammo<cost?'ORIGINAL_AMMO_REQUIRED':
  !position?'NO_SAFE_ORIGINAL_MAP_CONTACT':null;
 const engine=new GameCodingRuntime(gameAst,{signal:{ready:!reason,outcome:'held'}});
 const native=new JMGameCoreRuntime(coreAst,engine);
 if(reason){const check=engine.trigger('CastWorldEcho');
   if(check.applied)throw Error('JM_CP14_UNEARNED_CONTACT_ADMITTED');
   return refuse(reason);
 }
 const receipt=native.dispatch('FTRWorldEcho','OriginalWorldEcho');
 if(receipt.executions.length!==1||!receipt.executions[0].applied||
   receipt.state.signal.outcome!=='launched')
  throw Error('JM_CP14_NATIVE_EXECUTION_NOT_EARNED');
 const before=player.ammo;
 player.ammo-=cost;charge=cooldown;used++;
 active={...position,remaining:duration,life:duration,signalId:used,heard:0};
 const heardAtLaunch=window.JMFTRMemory.hearEcho(position.x,position.y,range);
 active.heard=heardAtLaunch.heard;
 heard+=heardAtLaunch.heard;pulses++;
 // Actual original game's non-spatial sound. Visual world marker is located
 // at the thrown contact; no falsely claimed stereo/3D positional audio.
 sound('scan');updateHUD();
 event('JM_WORLD_ECHO_LAUNCHED',{id:used,x:+position.x.toFixed(2),
  y:+position.y.toFixed(2),cost,heard:heardAtLaunch.heard});
 last={schema:'jm.ftr.echo-contact/0.1',status:'LAUNCHED',
  nativeIdentity:receipt.identity,traceDigest:receipt.receipt.traceDigest,
  source:'Original FTR GameCore + CP13 living enemy memory',position,
  ammoBefore:before,ammoAfter:player.ammo,heard:heardAtLaunch.heard,
  originalWorldAuthority:true,gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'};
 refresh();return last;
}
function refresh(){
 if(!running){
  status.textContent='ECHO STANDBY';
 }else if(active){
  status.textContent='ECHO '+active.remaining.toFixed(1)+'s · '+active.heard+' HEARD';
 }else if(charge>0){
  status.textContent='ECHO RECHARGE '+charge.toFixed(1)+'s';
 }else{
  status.textContent='ECHO READY · '+(limit-used)+' LURES LEFT';
 }
 trigger.textContent='CAST ECHO · '+cost+' AMMO';
 trigger.setAttribute('aria-disabled',active||charge>0||used>=limit?'true':'false');
}
window.updateWorld=function(dt){
 reset();
 const result=originalWorld(dt);
 if(!running){active=null;return result;}
 charge=Math.max(0,charge-dt);
 if(active){
  active.remaining=Math.max(0,active.remaining-dt);
  if(active.remaining<=0){
   const id=active.signalId;active=null;
   event('JM_WORLD_ECHO_FADED',{id});
  }
 }
 if(time-lastHud>.15){lastHud=time;refresh();}
 return result;
};
function drawEcho(){
 if(!active)return;
 const p=projectSprite(active.x,active.y,.28);
 if(!p||!visibleAt(p)||p.dist>14)return;
 const radius=Math.max(4,Math.min(45,p.size*.18));
 const fade=Math.min(1,active.remaining/.9);
 const beat=(time*3.5)%1;
 const y=p.y+p.size*.46;
 ctx.save();ctx.translate(p.x,y);
 ctx.strokeStyle='rgba(255,207,118,'+(.18+.35*fade)+')';
 ctx.lineWidth=Math.max(1,radius*.045);
 ctx.beginPath();ctx.ellipse(0,0,radius*(.48+beat*.8),radius*(.18+beat*.22),0,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.ellipse(0,0,radius*.5,radius*.22,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#ffdf9d';ctx.fillRect(-radius*.07,-radius*.42,radius*.14,radius*.75);
 ctx.restore();
}
window.drawSprites=function(){originalSprites();drawEcho()};
trigger.addEventListener('click',launch);
addEventListener('keydown',e=>{
 if(e.code==='KeyJ'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
  e.preventDefault();launch();
 }
});
window.JMFTREcho=Object.freeze({
 schema:'jm.ftr.sovereign-world-echo/0.1',
 nativeBodies:['GameCodingRuntime','JMGameCoreRuntime'],
 originalRecipient:'FTR v0.5.1 live world, ammo and drawSprites; CP13 threat memory',
 launch,placement,
 state:()=>({session,used,charge,heard,pulses,
  active:active?{...active}:null,last}),
 last:()=>last,
 physicalSensors:'NONE',gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'
});
refresh();
