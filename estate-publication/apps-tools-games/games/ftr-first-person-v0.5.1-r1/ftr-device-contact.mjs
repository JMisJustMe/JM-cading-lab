/**
 * JM FTR CP19 / Device2Device-adjacent USER INPUT CONTACT (not Device2Device itself).
 * Reuses and preserves original FTR #act, original joystick/look/deck, and
 * original FTR.command / original gamepad bridge. Never owns gameplay state.
 * Mobile tactical shelf only rearranges additive panels in their R1 carrier.
 *
 * No claim of a real phone, foldable or physical HID until owner-device proof.
 */
const ftr=window.FTR;
const act=document.getElementById('act');
const menu=document.getElementById('jmMobileTools');
const shelf=document.getElementById('jmMobileShelf');
const echo=document.getElementById('jmEchoLaunch');
if(!ftr||typeof ftr.command!=='function'||!act||!menu||!shelf||!echo)
 throw Error('JM_CP19_ORIGINAL_DEVICE_RECIPIENT_NOT_MOUNTED');
const coarse=matchMedia('(pointer:coarse), (hover:none)');
let touchHeld=false,activePointer=null,releases=0,presses=0,opens=0;
function release(reason='RELEASE'){
 if(!touchHeld)return false;
 touchHeld=false;activePointer=null;releases++;
 act.classList.remove('jm-held');
 act.setAttribute('aria-pressed','false');
 // Authentic original FTR INTERACT recipient. No secondary game state.
 ftr.command('INTERACT',{down:false});
 return true;
}
function press(event){
 if(event.pointerType==='mouse'&&!coarse.matches)return;
 if(!ftr.state().running)return;
 if(touchHeld&&event.pointerId!==activePointer)return;
 if(event.cancelable)event.preventDefault();
 if(!touchHeld){
  touchHeld=true;activePointer=event.pointerId;presses++;
  act.classList.add('jm-held');
  act.setAttribute('aria-pressed','true');
  ftr.command('INTERACT',{down:true});
 }
 try{act.setPointerCapture(event.pointerId);}catch{}
}
function finished(event){
 if(touchHeld&&activePointer===event.pointerId)release(event.type);
}
act.addEventListener('pointerdown',press);
act.addEventListener('pointerup',finished);
act.addEventListener('pointercancel',finished);
act.addEventListener('lostpointercapture',finished);
window.addEventListener('blur',()=>release('WINDOW_BLUR'));
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden')release('BACKGROUND');
});
window.addEventListener('pagehide',()=>release('PAGE_HIDDEN'));
window.addEventListener('pointerup',e=>{if(touchHeld&&activePointer===e.pointerId)release('WINDOW_POINTER_UP');});
window.addEventListener('pointercancel',e=>{if(touchHeld&&activePointer===e.pointerId)release('WINDOW_POINTER_CANCEL');});
function close(){
 shelf.classList.remove('is-open');
 menu.setAttribute('aria-expanded','false');
 menu.textContent='TOOLS';
}
function toggle(){
 const expanded=!shelf.classList.contains('is-open');
 if(expanded){shelf.classList.add('is-open');menu.setAttribute('aria-expanded','true');
  menu.textContent='CLOSE TOOLS';opens++;}
 else close();
 return expanded;
}
menu.addEventListener('click',toggle);
document.addEventListener('keydown',e=>{
 if(e.code==='Escape'&&shelf.classList.contains('is-open'))close();
});
coarse.addEventListener?.('change',()=>{close();release('INPUT_MODE_CHANGE');});
act.setAttribute('aria-label','Hold original TRACE to mount the real Trace Core');
act.setAttribute('aria-pressed','false');
menu.setAttribute('aria-expanded','false');
menu.setAttribute('aria-controls','jmMobileShelf');
menu.textContent='TOOLS';
shelf.setAttribute('aria-label','Original JM optional tactical controls');
shelf.setAttribute('role','region');
// Existing device controls are intentionally not re-created as JS proxies.
window.JMFTRDevice=Object.freeze({
 schema:'jm.ftr.original-device-fit/0.1',
 originalControl:'FTR v0.5.1 #act pointer-hold and FTR.command INTERACT',
 originalJoystick:'ftr-input-bridge.js / #joy',originalLook:'ftr-input-bridge.js / #lookZone',
 originalController:'ftr-gamepad-contact.js / standard browser Gamepad API',
 state:()=>({coarse:coarse.matches,touchHeld,presses,releases,
   shelfExpanded:shelf.classList.contains('is-open'),opens,
   traceDisplayed:getComputedStyle(act).display!=='none',
   deviceProof:'BROWSER_ONLY; PHYSICAL_DEVICE_HOLD'}),
 closeShelf:close,
 physicalPhone:'HOLD',nativeGardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'
});
