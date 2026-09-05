/*
  PUKA READ LAB v0.15A — Declared Bluff / Table Read Practice
  Human Game descendant organ.

  Keeper:
  OBSERVE -> DECLARE -> TEST -> CONSEQUENCE -> TRACE -> CORRECT

  Boundary:
  A declared read is an interpretation of public table behaviour.
  It is never promoted into hidden-card fact, motive, personality diagnosis,
  or knowledge about a real person.
*/
(function(root){
  'use strict';

  const LAB_STORE='jm-puka-read-lab-v01';
  const GAME_STORES=['jm-puka-v12a','jm-puka-v02a','jm-puka-v01a'];
  const MAX_READS=48;
  const SIGNALS={
    strong:{label:'STRONG?',detail:'The public line is consistent with strength, but hidden cards remain unknown.'},
    weak:{label:'WEAK?',detail:'The public line is consistent with weakness, but hidden cards remain unknown.'},
    pressure:{label:'PRESSURE',detail:'The House is applying visible pressure; pressure does not prove strength.'},
    bluff:{label:'BLUFF?',detail:'A bluff is being considered as one explanation, not asserted as motive or fact.'},
    uncertain:{label:'UNCERTAIN',detail:'There is not enough public evidence yet to earn a stronger read.'}
  };
  const CONFIDENCE={low:'LOW',medium:'MEDIUM',high:'HIGH'};

  const clone=x=>JSON.parse(JSON.stringify(x));
  const now=()=>new Date().toISOString();
  const safeParse=(text,fallback)=>{try{return text?JSON.parse(text):fallback;}catch{return fallback;}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function loadGame(){
    try{
      for(const key of GAME_STORES){
        const raw=localStorage.getItem(key);
        if(raw){const parsed=safeParse(raw,null);if(parsed)return parsed;}
      }
    }catch{}
    return null;
  }

  function loadLab(){
    try{
      const found=safeParse(localStorage.getItem(LAB_STORE),null);
      if(found&&Array.isArray(found.reads)) return {
        version:'0.15A',
        draft:{signal:SIGNALS[found.draft?.signal]?found.draft.signal:'uncertain',confidence:CONFIDENCE[found.draft?.confidence]?found.draft.confidence:'low'},
        reads:found.reads.slice(0,MAX_READS)
      };
    }catch{}
    return{version:'0.15A',draft:{signal:'uncertain',confidence:'low'},reads:[]};
  }

  const lab=loadLab();
  function saveLab(){try{localStorage.setItem(LAB_STORE,JSON.stringify(lab));}catch{}}

  function safeAction(a){
    if(!a||!['player','ai'].includes(a.who)||!['fold','check','call','raise'].includes(a.action))return null;
    const out={who:a.who,action:a.action,street:String(a.street||'unknown')};
    for(const key of ['potAfter','toCall','paid','totalBet','increment']){
      const n=Number(a[key]);if(Number.isFinite(n))out[key]=Math.max(0,n);
    }
    if(a.allIn===true)out.allIn=true;
    return out;
  }

  function packetFromGame(game){
    const history=(game?.history||[]).map(h=>({
      handNo:h.handNo,endReason:h.endReason,winner:h.winner,
      actions:(h.actions||[]).map(safeAction).filter(Boolean)
    }));
    const s=game?.state;
    const currentActions=s?(s.actions||[]).map(safeAction).filter(Boolean):[];
    return{history,currentActions,currentHandNo:s?.handNo??null,currentStreet:s?.street??null};
  }

  function houseReport(game){
    try{
      if(root.PUKAHumanGame?.analyze){
        const report=root.PUKAHumanGame.analyze(packetFromGame(game));
        if(report?.house)return report.house;
      }
    }catch{}
    const actions=(game?.state?.actions||[]).map(safeAction).filter(Boolean).filter(a=>a.who==='ai');
    if(!actions.length)return{sample:0,headline:'NO READ EARNED YET',observation:'No visible House action has been recorded yet.',interpretation:'Keep hidden strength open.',confidence:{band:'LOW',score:0}};
    const raises=actions.filter(a=>a.action==='raise').length;
    return{sample:actions.length,headline:raises?'VISIBLE PRESSURE PRESENT':'VISIBLE ACTIONS RECORDED',observation:`House has ${actions.length} visible action${actions.length===1?'':'s'}${raises?`, including ${raises} raise${raises===1?'':'s'}`:''}.`,interpretation:'The action pattern can support a provisional table read, not a motive claim.',confidence:{band:actions.length>=6?'MEDIUM':'LOW',score:actions.length}};
  }

  function currentStreetRead(game){
    const s=game?.state;if(!s)return null;
    return lab.reads.find(r=>r.handNo===s.handNo&&r.street===s.street&&!r.superseded)||null;
  }

  function canChooseSignal(signal,report){
    if(signal==='uncertain')return true;
    if(!report||report.sample<1)return false;
    if(signal==='bluff')return /raise|pressure/i.test(`${report.headline||''} ${report.observation||''}`);
    return true;
  }

  function lockRead(){
    const game=loadGame(),s=game?.state;
    if(!s||s.ended)return{ok:false,message:'Deal or continue a live hand before locking a read.'};
    if(currentStreetRead(game))return{ok:false,message:`A ${String(s.street).toUpperCase()} read is already locked. Test it, then read again on the next street.`};
    const report=houseReport(game),signal=lab.draft.signal;
    if(!canChooseSignal(signal,report))return{ok:false,message:signal==='bluff'?'A bluff candidate needs visible House pressure first.':'No visible House action yet. UNCERTAIN is the only earned read.'};
    const actions=(s.actions||[]).map(safeAction).filter(Boolean);
    const entry={
      id:`${s.handNo}-${s.street}-${Date.now()}`,
      handNo:s.handNo,street:s.street,signal,confidence:lab.draft.confidence,
      actionCount:actions.length,houseActionCount:actions.filter(a=>a.who==='ai').length,
      observation:String(report.observation||'No public observation recorded.'),
      behaviouralContext:String(report.interpretation||'No behavioural interpretation earned.'),
      headline:String(report.headline||'NO READ EARNED YET'),
      lockedAt:now(),resolution:null
    };
    lab.reads.unshift(entry);lab.reads=lab.reads.slice(0,MAX_READS);saveLab();
    return{ok:true,entry};
  }

  function resolveEntry(read,game){
    if(read.resolution)return read;
    const s=game?.state;
    if(!s||!s.ended||s.handNo!==read.handNo)return read;
    const actions=(s.actions||[]).map(safeAction).filter(Boolean);
    const later=actions.slice(Math.max(0,Number(read.actionCount)||0));
    const laterHouseRaises=later.filter(a=>a.who==='ai'&&a.action==='raise').length;
    let status='UNRESOLVED',kind='open',detail='The hand ended without enough public consequence to settle this interpretation.';

    if(read.signal==='uncertain'){
      status='DISCIPLINED UNCERTAINTY';kind='uncertain';
      detail='You explicitly kept the hidden state open instead of manufacturing certainty.';
    }else if(read.signal==='pressure'){
      if(laterHouseRaises){status='SUPPORTED BY LATER ACTION';kind='supported';detail=`House produced ${laterHouseRaises} later visible raise${laterHouseRaises===1?'':'s'} after the read was locked. This supports continued pressure, not hidden strength.`;}
      else{status='NOT CONFIRMED';kind='open';detail='No later House raise appeared after the lock. Pressure may still have existed earlier; the later line did not strengthen it.';}
    }else if(read.signal==='bluff'){
      if(s.endReason==='showdown'){
        if(s.winner==='player'){status='CONSISTENT, NOT PROVED';kind='supported';detail='House lost at showdown after visible pressure. That is compatible with a bluff candidate, but does not prove motive or that every earlier bet lacked value.';}
        else if(s.winner==='ai'){status='NOT SUPPORTED BY RESULT';kind='open';detail='House won at showdown. The result does not support the bluff read, but it cannot prove that no earlier street contained a bluffing component.';}
        else{status='UNRESOLVED';kind='open';detail='The showdown split does not settle the bluff interpretation.';}
      }else if(s.winner==='player'){
        status='CONSISTENT WITH HOUSE FOLD';kind='supported';detail='House folded after visible pressure. That is compatible with abandoned pressure, but hidden cards and motive remain unknown.';
      }else{
        status='UNRESOLVED';kind='open';detail='You folded before reveal, so the bluff interpretation remains open.';
      }
    }else if(s.endReason==='showdown'){
      if(s.winner==='split'){
        status='UNRESOLVED';kind='open';detail='The split result does not clearly support either STRONG? or WEAK?.';
      }else{
        const supports=(read.signal==='strong'&&s.winner==='ai')||(read.signal==='weak'&&s.winner==='player');
        status=supports?'SUPPORTED BY SHOWDOWN RESULT':'CONTRADICTED BY SHOWDOWN RESULT';kind=supports?'supported':'corrected';
        detail=supports?'The public showdown result moved in the same direction as your declared read. Result support is not proof of motive.':'The public showdown result moved against your declared read. Correct the read rather than protecting the label.';
      }
    }else if(s.winner==='player'&&read.signal==='weak'){
      status='CONSISTENT WITH HOUSE FOLD';kind='supported';detail='House folded, which is compatible with a WEAK? read, but the hidden holding was not revealed and therefore is not fact.';
    }else{
      status='UNRESOLVED';kind='open';detail='No revealing public consequence settled the hidden-strength interpretation.';
    }

    read.resolution={status,kind,detail,resolvedAt:now(),winner:s.winner||null,endReason:s.endReason||null};
    return read;
  }

  function resolveCurrentGame(){
    const game=loadGame(),s=game?.state;
    if(!s||!s.ended)return false;
    let changed=false;
    for(const read of lab.reads){
      if(read.handNo===s.handNo&&!read.resolution){resolveEntry(read,game);changed=true;}
    }
    if(changed)saveLab();return changed;
  }

  function ensureDock(){
    if(document.getElementById('pukaReadLabDock'))return;
    const tendency=document.getElementById('tendency');if(!tendency)return;
    const section=document.createElement('section');section.id='pukaReadLabDock';section.className='puka-read-lab-dock';
    section.setAttribute('aria-label','PUKA Human Game declared read lab');
    section.innerHTML=`
      <div class="prl-head"><div><small>PUKA HUMAN GAME · READ LAB</small><b id="prlState">WAITING FOR HAND</b></div><span id="prlStreet">—</span></div>
      <p id="prlObservation" class="prl-observation"><b>OBSERVED</b> · No public House action yet.</p>
      <div class="prl-signals" aria-label="Declare your provisional read">
        <button type="button" data-prl-signal="strong">STRONG?</button>
        <button type="button" data-prl-signal="weak">WEAK?</button>
        <button type="button" data-prl-signal="pressure">PRESSURE</button>
        <button type="button" data-prl-signal="bluff">BLUFF?</button>
        <button type="button" data-prl-signal="uncertain">UNCERTAIN</button>
      </div>
      <div class="prl-bottom"><div class="prl-confidence" aria-label="Read confidence"><button type="button" data-prl-confidence="low">LOW</button><button type="button" data-prl-confidence="medium">MED</button><button type="button" data-prl-confidence="high">HIGH</button></div><button type="button" id="prlLock" class="prl-lock">LOCK READ</button></div>
      <p id="prlBoundary" class="prl-boundary">INTERPRETATION ONLY · HIDDEN CARDS REMAIN UNKNOWN</p>`;
    tendency.insertAdjacentElement('afterend',section);

    section.addEventListener('click',e=>{
      const sig=e.target.closest('[data-prl-signal]');
      if(sig&&!sig.disabled){lab.draft.signal=sig.dataset.prlSignal;saveLab();render();return;}
      const conf=e.target.closest('[data-prl-confidence]');
      if(conf&&!conf.disabled){lab.draft.confidence=conf.dataset.prlConfidence;saveLab();render();return;}
      if(e.target.closest('#prlLock')){
        const result=lockRead();
        const line=document.getElementById('prlBoundary');
        if(line)line.textContent=result.ok?'READ LOCKED · WAIT FOR CONSEQUENCE':result.message;
        render();
      }
    });
  }

  function ensureLedger(){
    if(document.getElementById('pukaReadLedger'))return;
    const historyHead=document.querySelector('.history-head');if(!historyHead)return;
    const section=document.createElement('section');section.id='pukaReadLedger';section.className='puka-read-ledger';
    section.innerHTML=`<div class="prl-ledger-head"><div><small>DECLARED READ TRACE</small><h3>Read Ledger</h3></div><span id="prlLedgerCount">0 READS</span></div><p class="prl-ledger-law">OBSERVATION ≠ INTERPRETATION ≠ FACT · outcome can support, contradict or leave a read unresolved.</p><div id="prlLedgerRows"></div>`;
    historyHead.insertAdjacentElement('beforebegin',section);
  }

  function render(){
    ensureDock();ensureLedger();resolveCurrentGame();
    const game=loadGame(),s=game?.state,report=houseReport(game),streetRead=currentStreetRead(game);
    const state=document.getElementById('prlState'),street=document.getElementById('prlStreet'),obs=document.getElementById('prlObservation'),boundary=document.getElementById('prlBoundary'),lock=document.getElementById('prlLock');
    if(state)state.textContent=!s?'WAITING FOR HAND':s.ended?'HAND COMPLETE':streetRead?'READ LOCKED THIS STREET':'DECLARE A PROVISIONAL READ';
    if(street)street.textContent=s?String(s.street).toUpperCase():'—';
    if(obs)obs.innerHTML=`<b>OBSERVED</b> · ${esc(report.observation||'No public House action yet.')}`;
    document.querySelectorAll('[data-prl-signal]').forEach(b=>{
      const signal=b.dataset.prlSignal,allowed=canChooseSignal(signal,report);
      b.classList.toggle('chosen',lab.draft.signal===signal);
      b.disabled=!!(s?.ended)||!s||!!streetRead||!allowed;
      b.setAttribute('aria-pressed',lab.draft.signal===signal?'true':'false');
    });
    document.querySelectorAll('[data-prl-confidence]').forEach(b=>{
      b.classList.toggle('chosen',lab.draft.confidence===b.dataset.prlConfidence);
      b.disabled=!!(s?.ended)||!s||!!streetRead;
      b.setAttribute('aria-pressed',lab.draft.confidence===b.dataset.prlConfidence?'true':'false');
    });
    if(lock){lock.disabled=!s||!!s.ended||!!streetRead||!canChooseSignal(lab.draft.signal,report);lock.textContent=streetRead?'LOCKED':'LOCK READ';}
    if(boundary){
      if(streetRead)boundary.textContent=`${SIGNALS[streetRead.signal]?.label||streetRead.signal.toUpperCase()} · ${CONFIDENCE[streetRead.confidence]||streetRead.confidence.toUpperCase()} CONFIDENCE · TEST IT, DON'T PROTECT IT`;
      else if(!s)boundary.textContent='DEAL A HAND · THEN READ FROM PUBLIC CONTACT';
      else if(s.ended)boundary.textContent='HAND COMPLETE · REVIEW CONSEQUENCE IN THE LEDGER';
      else boundary.textContent=SIGNALS[lab.draft.signal]?.detail||'INTERPRETATION ONLY';
    }

    const rows=document.getElementById('prlLedgerRows'),count=document.getElementById('prlLedgerCount');
    if(count)count.textContent=`${lab.reads.length} READ${lab.reads.length===1?'':'S'}`;
    if(rows){
      rows.innerHTML=lab.reads.length?lab.reads.slice(0,16).map(r=>{
        const resolution=r.resolution||{status:'AWAITING CONSEQUENCE',kind:'pending',detail:'The read is locked. Later public contact may support it, correct it, or leave it open.'};
        return `<article class="prl-row ${esc(resolution.kind)}"><div class="prl-row-top"><b>HAND ${esc(r.handNo)} · ${esc(String(r.street).toUpperCase())}</b><span>${esc(SIGNALS[r.signal]?.label||r.signal)} · ${esc(CONFIDENCE[r.confidence]||r.confidence)}</span></div><p><b>OBSERVED</b> · ${esc(r.observation)}</p><p><b>DECLARED READ</b> · ${esc(SIGNALS[r.signal]?.detail||r.signal)}</p><p class="prl-result"><b>${esc(resolution.status)}</b> · ${esc(resolution.detail)}</p></article>`;
      }).join(''):'<p class="empty">No declared reads yet. During a live hand, lock a provisional read before the outcome is known.</p>';
    }
  }

  function boot(){
    if(!document?.body)return;
    render();
    const target=document.querySelector('.app')||document.body;
    let pending=false;
    const observer=new MutationObserver(()=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{pending=false;render();});
    });
    observer.observe(target,{childList:true,subtree:true,characterData:true});
    addEventListener('storage',e=>{if(e.key===LAB_STORE||GAME_STORES.includes(e.key))render();});
    addEventListener('pagehide',saveLab,{passive:true});
  }

  const API={version:'0.15A',SIGNALS,CONFIDENCE,safeAction,packetFromGame,houseReport,lockRead,resolveEntry,resolveCurrentGame,state:()=>clone(lab)};
  root.PUKAReadLab=API;
  if(typeof module==='object'&&module.exports)module.exports=API;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
})(typeof window!=='undefined'?window:globalThis);
