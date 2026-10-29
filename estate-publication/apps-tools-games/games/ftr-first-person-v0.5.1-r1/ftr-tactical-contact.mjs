/**
 * JM FTR CP12 · TACTICAL COVER PRESSURE
 * Inherits original FTR v0.5.1 enemy AI, projectile producer and collision.
 * Actual Game-CODING/GameCore grant original sentries a *different* choice
 * when JM CP11 cover blocks a clear original-map firing lane.
 * Flankers steer using original circleFree instead of cosmetically changing colour.
 * Not a substitute AI engine, autonomous agent framework, or Gardles.
 */
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime}
 from '../../../../coding-estate/sovereign-ten/direct/game-native.mjs';

if(!window.FTR || !window.JMFTRCover || !window.JMFTRSpatial ||
 typeof window.updateWorld!=='function' || typeof window.enemyShoot!=='function' ||
 typeof window.circleFree!=='function')throw Error('JM_CP12_ORIGINAL_AI_RECIPIENT_MISSING');

const originalWorld=window.updateWorld;
const donor='estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1/ftr-world.js';
const gameSource=`entity Pressure {
 ready = false
 result = "held"
}
mechanic CoverPressure {
 requires pressure.ready == true
 effect pressure.result = "fire"
}`;
const coreSource=`organ PressureOrgan {
 handles = [Pressure]
 rules = [CoverPressure]
 invariants = {
 pressure.result == "fire"
 }
}
system JMPressureSystem {
 organs = [PressureOrgan]
 events = [FTRThreatContact]
 identity = "JM.FTR.TacticalPressure"
}`;
const gameAst=GameCoding.parse(gameSource),coreAst=JMGameCore.parse(coreSource);
let enabled=true,session=run.started,shots=0,intercepts=0,flanks=0,blocked=0,decisions=0;
let latest=null,sequence=0,uiAt=0;
const readout=document.getElementById('jmTacticsStatus');
const toggleButton=document.getElementById('jmTacticsToggle');
if(!readout||!toggleButton)throw Error('JM_CP12_HUD_RECIPIENT_MISSING');
function mapClear(x0,y0,x1,y1){
 const distance=Math.hypot(x1-x0,y1-y0);
 const n=Math.max(1,Math.ceil(distance/.11));
 for(let i=1;i<n;i++){
  const f=i/n,tile=tileAt(x0+(x1-x0)*f,y0+(y1-y0)*f);
  if(tile==='#'||tile==='D')return false;
 }
 return true;
}
function coverOnLane(enemy,cover){
 const dx=player.x-enemy.x,dy=player.y-enemy.y;
 const d2=dx*dx+dy*dy;
 if(d2<.16)return false;
 const t=Math.max(0,Math.min(1,((cover.x-enemy.x)*dx+(cover.y-enemy.y)*dy)/d2));
 const gap=Math.hypot(enemy.x+dx*t-cover.x,enemy.y+dy*t-cover.y);
 return t>.08&&t<.92&&gap<.38&&mapClear(enemy.x,enemy.y,player.x,player.y);
}
function resetSession(){
 if(run.started===session)return;
 session=run.started;
 shots=0;intercepts=0;flanks=0;blocked=0;decisions=0;latest=null;sequence=0;
}
function pressSentry(e){
 const before=projectiles.length,ammo=player.ammo;
 const gate=new GameCodingRuntime(gameAst,{pressure:{ready:true,result:'held'}});
 const jm=new JMGameCoreRuntime(coreAst,gate);
 const receipt=jm.dispatch('JMPressureSystem','FTRThreatContact');
 if(receipt.executions.length!==1||!receipt.executions[0].applied ||
    receipt.state.pressure.result!=='fire')throw Error('JM_CP12_NATIVE_DECISION_FAILED');
 enemyShoot(e); // authentic ORIGINAL projectile, not invented CP12 damage
 if(projectiles.length!==before+1)throw Error('JM_CP12_ORIGINAL_PROJECTILE_NOT_SPAWNED');
 e.cool=1.28;
 shots++;decisions++;sequence++;
 latest={schema:'jm.ftr.tactical-pressure/0.1',status:'ORIGINAL_PROJECTILE_FIRED',
  sequence,enemyType:e.type,source:donor,originalAmmoUnchanged:player.ammo===ammo,
  nativeIdentity:receipt.identity,traceDigest:receipt.receipt.traceDigest,
  gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'};
 event('JM_AI_COVER_PRESSURE',{type:e.type,source:'original enemyShoot',sequence});
}
function flank(e,dt,cover){
 if(e.type!=='flanker'||e.stun>0)return;
 const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);
 if(d<.6)return;
 const sign=e.strafe||1;
 // Move sideways around an actual source-owned obstruction. Still requires
 // the original collision/door check; never teleport or move through walls.
 const nx=e.x+(-dy/d)*sign*1.25*dt;
 const ny=e.y+( dx/d)*sign*1.25*dt;
 const oldX=e.x,oldY=e.y;
 if(circleFree(nx,e.y,.2))e.x=nx;
 if(circleFree(e.x,ny,.2))e.y=ny;
 if(Math.hypot(oldX-e.x,oldY-e.y)>.0001){
  flanks++;
  if(flanks%24===1)event('JM_AI_COVER_FLANK',{type:e.type,cover:cover.kind});
 }else e.strafe*=-1;
}
function status(){
 readout.textContent=!enabled?'TACTICS PAUSED · ORIGINAL AI':
 !running?'TACTICS STANDBY':window.JMFTRCover.state().active?
 'COVER PRESSURE · '+shots+' SHOTS · '+flanks+' STEPS':'TACTICS READY · BUILD COVER';
 toggleButton.textContent=enabled?'TACTICS ON':'TACTICS OFF';
 toggleButton.setAttribute('aria-pressed',String(enabled));
}
function toggle(value=!enabled){enabled=!!value;status();return enabled;}
window.updateWorld=function(dt){
 resetSession();
 if(!enabled||!running||testFreeze)return originalWorld(dt);
 const cover=window.JMFTRCover.state().active;
 if(!cover)return originalWorld(dt);
 const candidates=enemies.filter(e=>!e.dead&&e.stun<=0&&
  Math.hypot(e.x-player.x,e.y-player.y)<8.3&&coverOnLane(e,cover));
 blocked=candidates.length;
 for(const e of candidates){
  if(e.type==='sentry'&&e.cool<=0)pressSentry(e);
 }
 const result=originalWorld(dt);
 if(running&&window.JMFTRCover.state().active){
  for(const e of candidates){
   if(e.type==='flanker'&&!e.dead&&coverOnLane(e,cover))flank(e,dt,cover);
  }
 }
 if(time-uiAt>.24){uiAt=time;status();}
 return result;
};
toggleButton.addEventListener('click',()=>toggle());
window.addEventListener('keydown',e=>{
 if(e.code==='KeyT'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
  e.preventDefault();toggle();
 }
});
window.JMFTRTactics=Object.freeze({
 schema:'jm.ftr.tactical-world-contact/0.1',
 originalEnemySystem:donor,originalProjectile:'ftr-controls.js/enemyShoot',
 nativeBodies:['GameCodingRuntime','JMGameCoreRuntime'],
 toggle,enabled:()=>enabled,state:()=>({session,shots,flanks,blocked,decisions,
  cover:!!window.JMFTRCover.state().active,latest}),
 inspectLane:(enemyIndex=0)=>{
  const e=enemies[enemyIndex],c=window.JMFTRCover.state().active;
  return !!(e&&c&&coverOnLane(e,c));
 },gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED',physicalAutomation:'NONE'
});
status();
