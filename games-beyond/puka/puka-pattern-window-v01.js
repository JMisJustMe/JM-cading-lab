/*
  PUKA PATTERN WINDOW v0.17A — Comparative Contact / Contradiction Handling

  Keeper:
  A PATTERN MAY EARN ATTENTION. CONTRADICTION KEEPS IT CORRIGIBLE.

  Boundary:
  This organ receives only the declared-read ledger exposed by PUKAReadLab.
  It compares public-consequence outcomes across bounded recent windows.
  It does not inspect poker state, House hole cards, hidden motive, personality,
  private notes, or real-world people. Repetition is not proof.
*/
(function(root){
  'use strict';

  const VERSION='0.17A';
  const SIZES=[3,6,12];
  const SIGNALS=['strong','weak','pressure','bluff','uncertain'];
  const RESOLVED=new Set(['supported','corrected','open','uncertain']);
  const STORE='jm-puka-pattern-window-v01';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function normalise(read){
    const signal=SIGNALS.includes(String(read?.signal||'').toLowerCase())?String(read.signal).toLowerCase():'uncertain';
    const kind=String(read?.resolution?.kind||'pending').toLowerCase();
    return {
      id:String(read?.id||''),
      signal,
      confidence:String(read?.confidence||'low').toLowerCase(),
      street:String(read?.street||'unknown').toLowerCase(),
      kind:RESOLVED.has(kind)?kind:'pending',
      status:String(read?.resolution?.status||'AWAITING CONSEQUENCE')
    };
  }

  function dominant(rows){
    const supported=rows.filter(r=>r.kind==='supported').length;
    const corrected=rows.filter(r=>r.kind==='corrected').length;
    if(supported>=2&&supported>corrected)return 'support';
    if(corrected>=2&&corrected>supported)return 'correction';
    return 'mixed';
  }

  function buildWindow(reads,size=6){
    const safeSize=SIZES.includes(Number(size))?Number(size):6;
    const resolved=(Array.isArray(reads)?reads:[]).map(normalise).filter(r=>RESOLVED.has(r.kind));
    const rows=resolved.slice(0,safeSize);
    const bySignal={};
    for(const signal of SIGNALS){
      const same=rows.filter(r=>r.signal===signal);
      bySignal[signal]={
        total:same.length,
        supported:same.filter(r=>r.kind==='supported').length,
        corrected:same.filter(r=>r.kind==='corrected').length,
        open:same.filter(r=>r.kind==='open').length,
        uncertain:same.filter(r=>r.kind==='uncertain').length
      };
    }
    const contradictionSignals=SIGNALS.filter(signal=>bySignal[signal].supported>0&&bySignal[signal].corrected>0);
    return {
      size:safeSize,
      available:rows.length,
      supported:rows.filter(r=>r.kind==='supported').length,
      corrected:rows.filter(r=>r.kind==='corrected').length,
      open:rows.filter(r=>r.kind==='open').length,
      uncertain:rows.filter(r=>r.kind==='uncertain').length,
      contradictionSignals,
      bySignal,
      direction:dominant(rows),
      rows
    };
  }

  function compare(reads,size=6){
    const current=buildWindow(reads,size);
    const short=buildWindow(reads,3);
    const long=buildWindow(reads,12);
    const shifted=short.available>=3&&long.available>=6&&short.direction!=='mixed'&&long.direction!=='mixed'&&short.direction!==long.direction;

    let headline='WINDOW NEEDS MORE CONTACT';
    let detail='Test more declared reads before treating repetition as a pattern.';
    let band='learning';

    if(current.available>=3){
      if(shifted){
        headline='RECENT CONTACT CHANGED THE READ';
        detail='The recent window points differently from the longer window. Keep both visible and test the new direction instead of protecting the older pattern.';
        band='shift';
      }else if(current.contradictionSignals.length){
        headline='CONTRADICTION IS PART OF THE PATTERN';
        detail=`${current.contradictionSignals.map(x=>x.toUpperCase()).join(' / ')} received both support and correction inside this window. Context is changing the answer; keep the read provisional.`;
        band='contradiction';
      }else if(current.supported>=3&&current.supported>=current.corrected+2){
        headline='REPEATED SUPPORT — STILL PROVISIONAL';
        detail='Several recent declared reads moved with later public consequence. Repetition earns attention, not hidden-state certainty.';
        band='support';
      }else if(current.corrected>=3&&current.corrected>=current.supported+2){
        headline='REPEATED CORRECTION — CHANGE THE MODEL';
        detail='Several recent reads were corrected by later public consequence. Revise the reading rule rather than defending the label.';
        band='correct';
      }else if(current.uncertain>=Math.max(2,Math.ceil(current.available/2))){
        headline='THE WINDOW IS CORRECTLY OPEN';
        detail='Uncertainty is recurring because the public evidence has not earned a stronger claim. That is a valid pattern of restraint.';
        band='uncertain';
      }else{
        headline='PATTERN WINDOW IS FORMING';
        detail='The window contains mixed public consequences. Compare context before increasing confidence.';
        band='forming';
      }
    }

    return {
      version:VERSION,
      current,short,long,shifted,headline,detail,band,
      law:'PATTERN != PROOF · CONTRADICTION != FAILURE · CONTEXT MAY CHANGE THE READ'
    };
  }

  function sourceReads(){
    try{
      const state=root.PUKAReadLab?.state?.();
      return state&&Array.isArray(state.reads)?state.reads:[];
    }catch{return[];}
  }

  function loadSize(){
    try{const n=Number(localStorage.getItem(STORE));if(SIZES.includes(n))return n;}catch{}
    return 6;
  }
  let selectedSize=loadSize();
  function setSize(size){
    const n=Number(size);if(!SIZES.includes(n))return selectedSize;
    selectedSize=n;try{localStorage.setItem(STORE,String(n));}catch{}
    render();return selectedSize;
  }

  function ensurePanel(){
    if(typeof document==='undefined'||document.getElementById('pukaPatternWindow'))return;
    const calibration=document.getElementById('pukaReadCalibration');
    const ledger=document.getElementById('pukaReadLedger');
    const anchor=calibration||ledger||document.querySelector('.history-head');
    if(!anchor)return;
    const section=document.createElement('section');
    section.id='pukaPatternWindow';
    section.className='puka-pattern-window';
    section.setAttribute('aria-label','PUKA comparative read pattern window');
    section.innerHTML=`
      <div class="ppw-head"><div><small>PUKA HUMAN GAME · COMPARATIVE WINDOW</small><h3>Pattern Window</h3></div><span>v0.17A</span></div>
      <p class="ppw-route">TRACE → COMPARE → <b>CONTRADICT</b> → CONTEXT → RE-READ</p>
      <div class="ppw-sizes" aria-label="Pattern window size">
        ${SIZES.map(n=>`<button type="button" data-ppw-size="${n}">LAST ${n}</button>`).join('')}
      </div>
      <div class="ppw-grid">
        <article><small>IN WINDOW</small><b id="ppwAvailable">0</b></article>
        <article><small>SUPPORTED</small><b id="ppwSupported">0</b></article>
        <article><small>CORRECTED</small><b id="ppwCorrected">0</b></article>
        <article><small>OPEN / UNCERTAIN</small><b id="ppwOpen">0</b></article>
      </div>
      <div id="ppwHeadline" class="ppw-headline">WINDOW NEEDS MORE CONTACT</div>
      <p id="ppwDetail" class="ppw-detail">Test more declared reads before treating repetition as a pattern.</p>
      <div id="ppwContradictions" class="ppw-contradictions"></div>
      <p class="ppw-boundary">PATTERN ≠ PROOF · CONTRADICTION KEEPS THE READ CORRIGIBLE</p>`;
    if(calibration)calibration.insertAdjacentElement('afterend',section);else anchor.insertAdjacentElement('beforebegin',section);
    section.addEventListener('click',e=>{
      const button=e.target.closest('[data-ppw-size]');if(button)setSize(button.dataset.ppwSize);
    });
  }

  function render(){
    if(typeof document==='undefined')return null;
    ensurePanel();
    const result=compare(sourceReads(),selectedSize);
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value);};
    set('ppwAvailable',result.current.available);
    set('ppwSupported',result.current.supported);
    set('ppwCorrected',result.current.corrected);
    set('ppwOpen',result.current.open+result.current.uncertain);
    set('ppwHeadline',result.headline);
    set('ppwDetail',result.detail);
    document.querySelectorAll('[data-ppw-size]').forEach(b=>{
      const active=Number(b.dataset.ppwSize)===selectedSize;
      b.classList.toggle('chosen',active);b.setAttribute('aria-pressed',active?'true':'false');
    });
    const panel=document.getElementById('pukaPatternWindow');if(panel)panel.dataset.band=result.band;
    const contradictions=document.getElementById('ppwContradictions');
    if(contradictions){
      contradictions.innerHTML=result.current.contradictionSignals.length
        ? result.current.contradictionSignals.map(signal=>`<span>${esc(signal.toUpperCase())} · SUPPORTED + CORRECTED</span>`).join('')
        : '<span>NO SAME-SIGNAL CONTRADICTION IN THIS WINDOW</span>';
    }
    return result;
  }

  function boot(){
    render();
    if(typeof MutationObserver==='undefined')return;
    let pending=false;
    const observer=new MutationObserver(()=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{pending=false;render();});
    });
    const targets=[document.getElementById('pukaReadLedger'),document.getElementById('pukaReadCalibration')].filter(Boolean);
    targets.forEach(t=>observer.observe(t,{childList:true,subtree:true,characterData:true}));
    addEventListener('storage',e=>{if(e.key==='jm-puka-read-lab-v01'||e.key===STORE)render();});
  }

  const API={version:VERSION,normalise,buildWindow,compare,sourceReads,setSize,render};
  root.PUKAPatternWindow=API;
  if(typeof module==='object'&&module.exports)module.exports=API;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
})(typeof window!=='undefined'?window:globalThis);
