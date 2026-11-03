/**
 * JM CP39 — Native GameCore HUD for the protected Contact Engine Lab descendant.
 * Uses original Lab controls/rendering. It is a local browser diagnostic,
 * NOT independent authentication, Android hardware proof, or a new engine.
 */
import { createContactGameCoreSession } from './contact-gamecore-bridge.mjs';
const lab=window.JM32LAB;
const host=document.getElementById('nativeContactProof');
if(!host || !lab)throw Error('CONTACT_LAB_MOUNT_MISSING');
host.innerHTML='<h2>JM GameCore · live native contact</h2><p id="nativeContactStatus" role="status" aria-live="polite">Native dispatch ready · waiting for your first contact.</p><div id="nativeContactInfo" class="mono"></div><p class="note">Original mechanics and graphics remain intact. Session-local proof only: no external trusted signature or physical Fold8 verification.</p>';
const status=document.getElementById('nativeContactStatus');
const detail=document.getElementById('nativeContactInfo');
const secret=Object.freeze({purpose:'local-session-proof'});
let pinned,session,last,accepted;
function makeSession(){
 pinned=new Map();
 session=createContactGameCoreSession({authenticate:(r,token)=>
   token===secret && pinned.get(r?.eventId)===JSON.stringify(r)});
 last=null;accepted=0;
}
makeSession();
function reconcile(){
 const world=lab.getWorld(),r=world?.lastEvent;
 if(!r || world.ledger?.at(-1)!==r || r===last)return;
 try{
  // Capture runs immediately after the original Lab action. The node-host
  // package supplies stronger keyed receipt authority for non-browser use.
  pinned.set(r.eventId,JSON.stringify(r));
  const result=session.dispatch(r,secret);
  last=r;accepted++;
  status.textContent='NATIVE GAMECORE EXECUTED · '+r.eventId+' · '+r.consequence.replaceAll('_',' ');
  status.dataset.result='pass';
  detail.textContent='Original Lab '+r.start+' → '+r.end+' | pressure '+r.pressure.toFixed(3)+
    ' | native organ '+result.nativeTrace.find(e=>e.type==='organ.dispatched')?.payload?.organ+
    ' | native receipt '+result.nativeReceipt.resultDigest.slice(0,16)+'… | '+accepted+' authenticated session events';
  window.JMCP39_LAST_NATIVE={event:result.event,consequence:result.consequence,sourceEventId:result.sourceEventId,traceEvents:result.nativeTrace.length};
 }catch(error){
  status.textContent='NATIVE HOLD · '+(error.code||error.message);
  status.dataset.result='fail';
  console.error('JM_CP39_NATIVE_CONTACT_HOLD',error);
 }
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('button');
 if(!btn)return;
 if(btn.id==='resetBtn')queueMicrotask(()=>{
   makeSession();status.textContent='Native session reset; original Lab reset intact';
   status.dataset.result='ready';detail.textContent='';
 });
 if(btn.matches('[data-dir],#recoverBtn'))queueMicrotask(reconcile);
});
document.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)&&!e.repeat)
  queueMicrotask(reconcile);
});
// Add pointer-swipe to the existing 8x8 arena; act via original button click
// so protected draw(), metrics, and TraceBox remain the single visual authority.
const arena=document.getElementById('arena');
if(arena){
 arena.style.touchAction='none';
 let down=null;
 arena.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.pointerType==='pen'){
   down={x:e.clientX,y:e.clientY,id:e.pointerId};
  }
 });
 arena.addEventListener('pointerup',e=>{
  if(!down||down.id!==e.pointerId)return;
  const dx=e.clientX-down.x,dy=e.clientY-down.y;
  down=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
  const direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'1,0':'-1,0'):(dy>0?'0,1':'0,-1');
  const btn=document.querySelector('[data-dir="'+direction+'"]');
  btn?.click();
 });
 arena.addEventListener('pointercancel',()=>{down=null;});
}
window.JMCP39_STATUS=()=>({accepted,status:status.dataset.result||'ready',native:window.JMCP39_LAST_NATIVE||null});
