import {
  newState, normalizeState, applyCommand, makeReloadChallenge,
  verifyReloadChallenge, attachReceipt, publicSnapshot
} from './runtime-core.mjs';

const STORE='JM_AGI_LAB_RUNTIME_CONTACT_V1';
const PENDING='JM_AGI_LAB_RUNTIME_CONTACT_V1_PENDING';
const PROBE='JM_AGI_LAB_RUNTIME_CONTACT_V1_PROBE';
const LAST='JM_AGI_LAB_RUNTIME_CONTACT_V1_LAST_RECEIPT';
const loadId=(globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('load-'+Date.now()+'-'+Math.random());
let state=loadState();
let settleTimer=null;

function el(id){return document.getElementById(id);}
function loadState(){
  try{
    const raw=localStorage.getItem(STORE);
    return raw ? normalizeState(JSON.parse(raw)) : newState();
  }catch(e){
    return newState();
  }
}
function saveState(){
  state.updatedAt=Date.now();
  localStorage.setItem(STORE,JSON.stringify(state));
}
function safeJson(key){
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch(e){return null;}
}
function setReceiptClass(receipt){
  const node=el('reloadState');
  node.className='receipt-state';
  if(!receipt){node.textContent='NO RELOAD RECEIPT YET';return;}
  node.classList.add(receipt.state==='PASS'?'pass':'hold');
  node.textContent=(receipt.state==='PASS'?'RELOAD DING':'RELOAD HOLD')+' · exactReadBack '+String(receipt.checks?.exactReadBack)+' · probe '+String(receipt.checks?.probeMatch);
}
function completePending(){
  const pending=safeJson(PENDING);
  if(!pending || pending.armedLoadId===loadId) return null;
  const probe=localStorage.getItem(PROBE);
  const receipt=verifyReloadChallenge(state,pending,{loadId,probeValue:probe,now:Date.now()});
  if(pending.priorProbe===null || pending.priorProbe===undefined) localStorage.removeItem(PROBE);
  else localStorage.setItem(PROBE,String(pending.priorProbe));
  localStorage.removeItem(PENDING);
  localStorage.setItem(LAST,JSON.stringify(receipt));
  state=attachReceipt(state,receipt);
  saveState();
  return receipt;
}
function renderFacts(){
  const entries=Object.entries(state.facts);
  const root=el('facts');
  root.innerHTML='';
  root.className='facts'+(entries.length?'':' empty');
  if(!entries.length){root.textContent='No facts yet.';return;}
  entries.sort((a,b)=>b[1].revision-a[1].revision).forEach(function(pair){
    const item=document.createElement('article');
    item.className='fact';
    const b=document.createElement('b');b.textContent=pair[0];
    const p=document.createElement('p');p.textContent=pair[1].value;
    const s=document.createElement('span');s.textContent='confidence '+Number(pair[1].confidence).toFixed(2)+' · rev '+pair[1].revision;
    item.append(b,p,s);root.appendChild(item);
  });
}
function renderTimeline(){
  const root=el('timeline');root.innerHTML='';
  state.timeline.slice().reverse().slice(0,20).forEach(function(ev){
    const row=document.createElement('div');row.className='event';
    const b=document.createElement('b');b.textContent='r'+ev.revision+' '+ev.kind;
    const s=document.createElement('span');s.textContent=typeof ev.detail==='string'?ev.detail:JSON.stringify(ev.detail);
    row.append(b,s);root.appendChild(row);
  });
}
function render(){
  el('revision').textContent=String(state.revision);
  el('phase').textContent=state.phase;
  el('factCount').textContent=String(Object.keys(state.facts).length);
  el('consequenceCount').textContent=String(state.consequenceCount);
  el('heartbeat').textContent=String(state.durability.heartbeat)+' / 12';
  el('settleState').textContent=state.durability.status;
  el('ring').style.setProperty('--progress',String((state.durability.heartbeat/12)*360)+'deg');
  el('armReloadBtn').disabled=state.durability.status!=='SETTLED';
  el('reloadBtn').disabled=!safeJson(PENDING);
  renderFacts();renderTimeline();
  const receipt=state.lastReceipt || safeJson(LAST);
  setReceiptClass(receipt);
}
function toast(text){
  el('storageState').textContent=text;
  setTimeout(function(){el('storageState').textContent='LOCAL · READY';},1800);
}

el('contactBtn').addEventListener('click',function(){
  try{
    state=applyCommand(state,{
      type:'OBSERVE',
      key:el('factKey').value,
      value:el('factValue').value,
      confidence:Number(el('confidence').value)
    });
    saveState();render();toast('STATE WRITTEN');
  }catch(e){toast('HOLD · '+e.message);}
});
el('consequenceBtn').addEventListener('click',function(){
  state=applyCommand(state,{type:'CONSEQUENCE',label:'bounded UI consequence'});
  saveState();render();toast('CONSEQUENCE WRITTEN');
});
el('settleBtn').addEventListener('click',function(){
  if(settleTimer) return;
  state=applyCommand(state,{type:'ARM_SETTLE'});saveState();render();
  settleTimer=setInterval(function(){
    try{
      state=applyCommand(state,{type:'TICK_SETTLE'});
      saveState();render();
      if(state.durability.status==='SETTLED'){
        clearInterval(settleTimer);settleTimer=null;toast('SETTLED · RETURN MAY ARM');
      }
    }catch(e){
      clearInterval(settleTimer);settleTimer=null;toast('HOLD · '+e.message);
    }
  },1000);
});
el('armReloadBtn').addEventListener('click',function(){
  try{
    const priorProbe=localStorage.getItem(PROBE);
    const token=(globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('token-'+Date.now());
    const challenge=makeReloadChallenge(state,{token,loadId,priorProbe,now:Date.now()});
    localStorage.setItem(PROBE,challenge.expectedProbe);
    localStorage.setItem(PENDING,JSON.stringify(challenge));
    el('reloadState').className='receipt-state';
    el('reloadState').textContent='ARMED · RELOAD OR CLOSE/REOPEN THIS BROWSER PROFILE';
    el('reloadBtn').disabled=false;
    toast('RELOAD CONTACT ARMED');
  }catch(e){toast('HOLD · '+e.message);}
});
el('reloadBtn').addEventListener('click',function(){location.reload();});
el('exportBtn').addEventListener('click',function(){
  const body={
    schema:'JM.AGILab.RuntimeExport/1',
    exportedAt:Date.now(),
    loadId,
    state:publicSnapshot(state),
    pending:safeJson(PENDING),
    boundary:'Local runtime receipt only. No AGI/general-intelligence or external-actuation claim.'
  };
  const blob=new Blob([JSON.stringify(body,null,2)+'\n'],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='JM_AGI_LAB_RUNTIME_CONTACT_RECEIPT.json';
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  toast('RECEIPT EXPORTED');
});
el('resetBtn').addEventListener('click',function(){
  if(!confirm('Clear this local runtime state?')) return;
  if(settleTimer){clearInterval(settleTimer);settleTimer=null;}
  [STORE,PENDING,PROBE,LAST].forEach(function(k){localStorage.removeItem(k);});
  state=newState();saveState();render();toast('LOCAL RUNTIME CLEARED');
});

completePending();
render();

globalThis.__JM_RUNTIME_DEBUG__=function(){
  return {
    loadId,
    state:publicSnapshot(state),
    pending:safeJson(PENDING),
    probe:localStorage.getItem(PROBE),
    last:safeJson(LAST)
  };
};
