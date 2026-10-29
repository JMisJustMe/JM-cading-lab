/* JM FTR First-Person R1: original-game command route for standard browser Gamepad API.
 * Reuses original window.FTR.command. No clone of game engine, KicPlay or native hardware claims.
 * Gamepads often differ: only 'standard' mapping is accepted, other mapping => explicit hold.
 */
(function(){
 'use strict';
 const recipient=window.FTR;
 if(!recipient || typeof recipient.command!=='function' || typeof recipient.state!=='function')throw Error('JM_FTR_EXISTING_RECIPIENT_NOT_READY');
 const buttons=Object.freeze({FIRE:0,PHASE:1,SCAN:2,SIDE:3,FLOW:4,INTERACT:5,START:9});
 const prior=new Set();
 const deadzone=v=>Number.isFinite(v)&&Math.abs(v)>.18?Math.max(-1,Math.min(1,v)):0;
 let connected=false,frameCount=0,unsupported=false;
 const fireEdge=(name,pressed,payload={})=>{
  if(pressed&&!prior.has(name))recipient.command(name,payload);
  if(pressed)prior.add(name);else prior.delete(name);
 };
 function tick(){
  frameCount++;
  const pads=typeof navigator.getGamepads==='function'?Array.from(navigator.getGamepads()||[]):[];
  const pad=pads.find(x=>x&&x.connected&&x.mapping==='standard');
  unsupported=pads.some(x=>x&&x.connected&&x.mapping!=='standard');
  if(!pad){
   if(prior.has('INTERACT'))recipient.command('INTERACT',{down:false});
   prior.clear();
   if(connected)recipient.command('MOVE',{x:0,y:0});
   connected=false;
   return false;
  }
  connected=true;
  const ax=pad.axes||[];
  const lx=deadzone(ax[0]||0),ly=deadzone(ax[1]||0);
  const rx=deadzone(ax[2]||0),ry=deadzone(ax[3]||0);
  // Original game MOVE contract accepts positive y for forward, matching stick up negative.
  recipient.command('MOVE',{x:lx,y:-ly});
  if(rx||ry)recipient.command('LOOK',{x:rx*.035,y:ry*.025});
  const isDown=name=>pad.buttons?.[buttons[name]]?.pressed===true;
  fireEdge('START',isDown('START'));
  fireEdge('FIRE',isDown('FIRE'));
  fireEdge('PHASE',isDown('PHASE'));
  fireEdge('SCAN',isDown('SCAN'));
  fireEdge('SIDE',isDown('SIDE'));
  fireEdge('FLOW',isDown('FLOW'));
  const holding=isDown('INTERACT');
  if(holding!==prior.has('INTERACT'))recipient.command('INTERACT',{down:holding});
  if(holding)prior.add('INTERACT');else prior.delete('INTERACT');
  return true;
 }
 function loop(){tick();requestAnimationFrame(loop);}
 window.FTRGamepad=Object.freeze({
  schema:'jm.ftr.first-person.existing-gamepad-contact/0.1',
  recipient:'FTR First-Person v0.5.1',
  mapping:'standard-only',
  buttons, tick,
  status:()=>({connected,unsupported,frames:frameCount,physicalContactClaim:false})
 });
 requestAnimationFrame(loop);
})();
