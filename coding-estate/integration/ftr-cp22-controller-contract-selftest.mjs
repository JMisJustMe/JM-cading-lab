/** JM FTR CP22 deterministic bridge contract — source exact, no hardware claims. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const source=readFileSync(fileURLToPath(new URL('../../estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/ftr-gamepad-contact.js',import.meta.url)),'utf8');
const traces=[],clicks=[],listeners={},docListeners={};
let running=false,hidden='visible';
const buttons=Array.from({length:17},()=>({pressed:false}));
const pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons};
const output={textContent:'',dataset:{}};
const elements=Object.fromEntries(['jmEchoLaunch','jmCoverBuild','jmCoverMaterial','jmNativePulse'].map(id=>[id,{click:()=>clicks.push(id)}]));
const window={FTR:{
 command(name,payload={}){traces.push({name,payload});if(name==='START')running=true;},
 state:()=>({running})
},addEventListener(name,handler){listeners[name]=handler;}};
const document={getElementById:id=>id==='jmControllerStatus'?output:elements[id],
 addEventListener(name,handler){docListeners[name]=handler;},
 get visibilityState(){return hidden;}};
const navigator={getGamepads:()=>[pad]};
runInNewContext(source,{window,document,navigator,requestAnimationFrame:()=>{}});
const controller=window.FTRGamepad;const checks=[];
function check(value,message){assert(value,message);checks.push(message);}
function tick(){return controller.tick();}
function set(n,v){buttons[n].pressed=v;tick();}
function pulse(n){set(n,true);set(n,false);}
check(controller.schema.endsWith('/0.2'),'new controller bridge schema loaded');
check(tick()===true&&controller.status().connected,'standard pad recognised');
pulse(9);
check(running&&traces.filter(t=>t.name==='START').length===1,'start invokes original game once');
set(9,true);tick();tick();set(9,false);
check(traces.filter(t=>t.name==='START').length===1,'held Menu cannot restart the active game');
pad.axes=[.6,-.8,.7,-.3];tick();
check(traces.some(t=>t.name==='MOVE'&&t.payload.x===.6&&t.payload.y===.8),
 'real original MOVE command gets controller axes');
check(traces.some(t=>t.name==='LOOK'&&t.payload.x>0&&t.payload.y<0),
 'original LOOK command gets right stick');
for(const [button,name] of [[0,'FIRE'],[1,'PHASE'],[2,'SCAN'],[3,'SIDE'],[4,'FLOW']]){
 pulse(button);check(traces.some(t=>t.name===name),name+' source command delivered');
}
for(const [button,id] of [[12,'jmEchoLaunch'],[13,'jmCoverBuild'],
 [14,'jmCoverMaterial'],[15,'jmNativePulse']]){
 const previous=clicks.length;pulse(button);
 check(clicks.length===previous+1&&clicks.at(-1)===id,
  id+' activates existing mechanic recipient once');
}
set(5,true);tick();
check(traces.some(t=>t.name==='INTERACT'&&t.payload.down===true),
 'TRACE hold reaches source-owned INTERACT');
pad.connected=false;tick();
check(traces.at(-2)?.name==='INTERACT'&&traces.at(-2).payload.down===false,
 'lost controller releases held original TRACE');
check(traces.at(-1)?.name==='MOVE'&&traces.at(-1).payload.x===0,
 'lost controller zeroes only its own movement');
check(!controller.status().connected&&!controller.status().traceHeld,
 'disconnected bridge state explicitly cleared');
pad.connected=true;pad.mapping='unknown';tick();
check(controller.status().unsupported&&output.dataset.contact==='hold',
 'unsupported mapping refused and visibly explained');
pad.mapping='standard';set(5,false);set(5,true);
listeners.blur();
check(!controller.status().traceHeld&&controller.status().suspended,
 'focus loss cancels TRACE and suspends input');
listeners.focus();set(5,false);
check(!controller.status().suspended,'focus return resumes input');
set(5,true);hidden='hidden';docListeners.visibilitychange();
check(!controller.status().traceHeld,'page hidden releases TRACE');
check(!controller.status().physicalContactClaim,'no physical controller falsely certified');
check(!source.includes('FTR.test.'),'controller never uses original source test hooks');
console.log('JM_FTR_CP22_CONTROLLER_CONTRACT',JSON.stringify({
 passed:checks.length,failed:0,originalRecipient:'FTR v0.5.1',
 expectedMechanics:4,physicalController:'NOT_TESTED',checklist:checks
}));
