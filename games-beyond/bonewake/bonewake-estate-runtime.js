/* HUMANIMALS: BONEWAKE ARENA — Estate Standard runtime v1.12
   Recovery/persistence + PWA registration. Game-world mechanics remain in sovereign Bonewake core. */
(()=>{
'use strict';
const KEY='jm.bonewake.room-memory.v1';
const BUILD='1.12-estate-standard';
const $=(id)=>document.getElementById(id);
function safeJSON(s){try{return JSON.parse(s)}catch{return null}}
function durableSnapshot(){
  return {
    schema:'JM.BONEWAKE.SESSION/1',build:BUILD,savedAt:Date.now(),
    core:state.core,wake:state.wake,excavated:state.excavated,leaderIndex:state.leaderIndex,
    bestChain:state.bestChain,contacts:state.contacts,wakeSerial:state.wakeSerial,roomMemory:state.roomMemory,
    weights:{...weights},
    fossils:fossils.map(f=>({id:f.id,awake:!!f.awake,memory:f.memory||null,memoryCharge:f.memoryCharge||0})),
    bodypaths:bodypaths.map(p=>({kind:p.kind,awake:!!p.awake,open:!!p.open})),
    sediments:sediments.map(s=>({id:s.id,hp:s.hp,broken:!!s.broken,weakX:s.weakX})),
    sideOrgans:sideOrgans.map(o=>({id:o.id,awake:!!o.awake,stored:o.stored||null,storedCreature:o.storedCreature||null}))
  }
}
function saveRoom(){
  try{localStorage.setItem(KEY,JSON.stringify(durableSnapshot()))}catch{}
}
function flashRecovery(message){
  let b=document.querySelector('.estateResume');
  if(!b){b=document.createElement('button');b.type='button';b.className='estateResume';document.body.appendChild(b)}
  b.textContent=message;b.classList.add('show');b.onclick=()=>b.classList.remove('show');setTimeout(()=>b.classList.remove('show'),3600)
}
function restoreRoom(){
  const d=safeJSON(localStorage.getItem(KEY));
  if(!d||d.schema!=='JM.BONEWAKE.SESSION/1')return false;
  // Treat very old browser state as historical residue rather than silently restoring it.
  if(Date.now()-(d.savedAt||0)>1000*60*60*24*30)return false;
  state.core=clamp(Number(d.core)||100,0,100);state.wake=clamp(Number(d.wake)||0,0,5);state.excavated=clamp(Number(d.excavated)||0,0,4);
  state.leaderIndex=clamp(Number(d.leaderIndex)||0,0,leaders.length-1);state.bestChain=Math.max(0,Number(d.bestChain)||0);state.contacts=Math.max(0,Number(d.contacts)||0);state.wakeSerial=Math.max(0,Number(d.wakeSerial)||0);state.roomMemory=Array.isArray(d.roomMemory)?d.roomMemory:[];
  if(d.weights&&typeof d.weights==='object')Object.assign(weights,d.weights);
  (d.fossils||[]).forEach(x=>{const f=fossils.find(v=>v.id===x.id);if(f){f.awake=!!x.awake;f.memory=x.memory||null;f.memoryCharge=Number(x.memoryCharge)||0}});
  (d.bodypaths||[]).forEach(x=>{const p=bodypaths.find(v=>v.kind===x.kind);if(p){p.awake=!!x.awake;p.open=!!x.open}});
  (d.sediments||[]).forEach(x=>{const s=sediments.find(v=>v.id===x.id);if(s){s.hp=clamp(Number(x.hp)||0,0,s.maxHp);s.broken=!!x.broken;s.weakX=clamp(Number(x.weakX)||360,s.x1+25,s.x2-25)}});
  (d.sideOrgans||[]).forEach(x=>{const o=sideOrgans.find(v=>v.id===x.id);if(o){o.awake=!!x.awake;o.stored=x.stored||null;o.storedCreature=x.storedCreature||null}});
  state.phase='sleep';state.main=null;state.echoes=[];state.left=state.right=false;state.ancient=state.wake>=5;state.lastTime=0;
  ui.center.textContent='ROOM MEMORY RECOVERED · BUILD THE NEXT WAKE';
  ui.status.textContent='Recovered the Museum Bone Room from this device. Pull the Wake Lever when ready.';
  syncUI();flashRecovery('ROOM MEMORY RECOVERED');return true
}
// Preserve living room state without turning every frame into storage churn.
let lastSig='';setInterval(()=>{try{const s=durableSnapshot(),sig=JSON.stringify([s.core,s.wake,s.excavated,s.leaderIndex,s.bestChain,s.fossils,s.sediments,s.sideOrgans,s.weights]);if(sig!==lastSig){lastSig=sig;localStorage.setItem(KEY,JSON.stringify(s))}}catch{}},1800);
window.addEventListener('pagehide',saveRoom);window.addEventListener('beforeunload',saveRoom);
document.addEventListener('visibilitychange',()=>{if(document.hidden){saveRoom();state.left=state.right=false;const fs=state.flipperState;if(fs){fs.L.held=fs.R.held=false}}else state.lastTime=0});
// PWA stays on the same canonical Bonewake door.
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
// Boot after the sovereign game has created its normal new-game state.
queueMicrotask(()=>{restoreRoom();document.documentElement.dataset.estateStandard=BUILD});
})();
