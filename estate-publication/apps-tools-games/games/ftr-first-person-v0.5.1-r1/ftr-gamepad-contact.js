/* JM FTR CP22: full original-world standard-gamepad contact.
 * Authority: FTR.command for original movement, aim, shot, abilities and TRACE;
 * real already-mounted buttons for JM Echo, Cover, material, native Core Pulse.
 * No cloned gameplay state, no invented Gardles or physical-HID proof.
 */
(function(){
 'use strict';
 const recipient=window.FTR;
 if(!recipient||typeof recipient.command!=='function'||typeof recipient.state!=='function')
  throw Error('JM_FTR_EXISTING_RECIPIENT_NOT_READY');
 const buttons=Object.freeze({
  FIRE:0,PHASE:1,SCAN:2,SIDE:3,FLOW:4,INTERACT:5,START:9,
  ECHO:12,COVER:13,MATERIAL:14,CORE_PULSE:15
 });
 const already=new Set();
 const accepted=Object.freeze({
  ECHO:'jmEchoLaunch',COVER:'jmCoverBuild',
  MATERIAL:'jmCoverMaterial',CORE_PULSE:'jmNativePulse'
 });
 const counters={starts:0,fire:0,phase:0,scan:0,side:0,flow:0,
  tracePress:0,traceRelease:0,echo:0,cover:0,material:0,corePulse:0,
  safetyReleases:0};
 const feedback=document.getElementById('jmControllerStatus');
 const deadzone=v=>Number.isFinite(v)&&Math.abs(v)>.18?Math.max(-1,Math.min(1,v)):0;
 let connected=false,unsupported=false,frameCount=0,suspended=false;
 let livePad=null,reported='';
 function report(message,kind=''){
  if(!feedback||reported===message)return;
  reported=message;feedback.textContent=message;feedback.dataset.contact=kind;
 }
 function release(reason){
  const held=already.has('INTERACT');
  if(held){recipient.command('INTERACT',{down:false});counters.traceRelease++;}
  if(connected){recipient.command('MOVE',{x:0,y:0});counters.safetyReleases++;}
  already.clear();connected=false;livePad=null;
  if(reason==='UNSUPPORTED')report('PAD MAPPING UNSUPPORTED — TOUCH / KEYS ACTIVE','hold');
  else if(reason==='HIDDEN')report('CONTROLLER PAUSED — TOUCH / KEYS ACTIVE','hold');
  else if(reason==='DISCONNECTED')report('CONTROLLER LOST — TOUCH / KEYS ACTIVE','hold');
  return held;
 }
 function dispatch(name){
  if(name in accepted){
   const element=document.getElementById(accepted[name]);
   if(!element||element.disabled)return false;
   // Existing source-mounted button is the mechanic's own execution authority.
   element.click();
   const counter={ECHO:'echo',COVER:'cover',MATERIAL:'material',CORE_PULSE:'corePulse'}[name];
   counters[counter]++;
   return true;
  }
  recipient.command(name);
  const counter={START:'starts',FIRE:'fire',PHASE:'phase',
   SCAN:'scan',SIDE:'side',FLOW:'flow'}[name];
  if(counter)counters[counter]++;
  return true;
 }
 function edge(name,pressed,active){
  if(pressed&&!already.has(name)&&active)dispatch(name);
  if(pressed)already.add(name);else already.delete(name);
 }
 function tick(){
  frameCount++;
  const hidden=typeof document!=='undefined'&&document.visibilityState==='hidden';
  if(hidden||suspended){if(connected||already.size)release('HIDDEN');return false;}
  let pads=[];
  try{pads=typeof navigator.getGamepads==='function'?Array.from(navigator.getGamepads()||[]):[];}
  catch{pads=[];}
  const pad=pads.find(x=>x&&x.connected&&x.mapping==='standard');
  unsupported=pads.some(x=>x&&x.connected&&x.mapping!=='standard');
  if(!pad){
   if(connected||already.size)release(unsupported?'UNSUPPORTED':'DISCONNECTED');
   else if(unsupported)report('PAD MAPPING UNSUPPORTED — TOUCH / KEYS ACTIVE','hold');
   return false;
  }
  connected=true;livePad=pad.index??0;
  const running=recipient.state().running===true;
  const axes=pad.axes||[];
  const lx=deadzone(axes[0]||0),ly=deadzone(axes[1]||0),
   rx=deadzone(axes[2]||0),ry=deadzone(axes[3]||0);
  const pressed=name=>pad.buttons?.[buttons[name]]?.pressed===true;
  // Starting the game is an edge, never restart an active run on Menu press.
  edge('START',pressed('START'),!running);
  const active=recipient.state().running===true;
  recipient.command('MOVE',{x:active?lx:0,y:active?-ly:0});
  if(active&&(rx||ry))recipient.command('LOOK',{x:rx*.035,y:ry*.025});
  for(const name of ['FIRE','PHASE','SCAN','SIDE','FLOW',
   'ECHO','COVER','MATERIAL','CORE_PULSE'])
   edge(name,pressed(name),active);
  const held=active&&pressed('INTERACT');
  if(held!==already.has('INTERACT')){
   recipient.command('INTERACT',{down:held});
   if(held)counters.tracePress++;else counters.traceRelease++;
  }
  if(held)already.add('INTERACT');else already.delete('INTERACT');
  report('PAD CONNECTED · RB TRACE · D-PAD ECHO / COVER / MATERIAL / PULSE','ready');
  return true;
 }
 function loop(){tick();requestAnimationFrame(loop);}
 window.addEventListener('blur',()=>{suspended=true;if(connected||already.size)release('HIDDEN');});
 window.addEventListener('focus',()=>{suspended=false;});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&(connected||already.size))release('HIDDEN');
 });
 window.addEventListener('gamepaddisconnected',()=>{if(connected||already.size)release('DISCONNECTED');});
 window.FTRGamepad=Object.freeze({
  schema:'jm.ftr.first-person.existing-gamepad-contact/0.2',
  recipient:'FTR First-Person v0.5.1',
  mapping:'standard-only',buttons,tick,
  status:()=>({connected,unsupported,frames:frameCount,livePad,
   traceHeld:already.has('INTERACT'),suspended,counts:{...counters},
   physicalContactClaim:false,gameplayAuthority:'original FTR + existing JM recipients'})
 });
 requestAnimationFrame(loop);
})();
