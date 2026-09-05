/*
  PUKA READ CALIBRATION v0.16A — Counterread / Confidence Discipline

  Keeper:
  READ THE TABLE -> READ YOUR READ.

  Boundary:
  This organ receives only the declared-read ledger exposed by PUKAReadLab.
  It does not inspect poker state, House hole cards, hidden motive, or real people.
  "Supported" means later public consequence moved in the same direction;
  it never means a hidden interpretation became fact.
*/
(function(root){
  'use strict';

  const VERSION='0.16A';
  const SUPPORT_KINDS=new Set(['supported']);
  const CORRECT_KINDS=new Set(['corrected']);
  const OPEN_KINDS=new Set(['open']);
  const RESOLVED_KINDS=new Set(['supported','corrected','open','uncertain']);
  const CONFIDENCE=['low','medium','high'];

  const clone=x=>JSON.parse(JSON.stringify(x));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pct=(a,b)=>b?Math.round((a/b)*100):0;

  function normalise(read){
    const signal=String(read?.signal||'uncertain').toLowerCase();
    const confidence=CONFIDENCE.includes(String(read?.confidence||'').toLowerCase())?String(read.confidence).toLowerCase():'low';
    const kind=String(read?.resolution?.kind||'pending').toLowerCase();
    return {signal,confidence,kind,status:String(read?.resolution?.status||'AWAITING CONSEQUENCE')};
  }

  function summarise(reads){
    const src=Array.isArray(reads)?reads.map(normalise):[];
    const resolved=src.filter(r=>RESOLVED_KINDS.has(r.kind));
    const byConfidence={};
    for(const confidence of CONFIDENCE){
      const all=resolved.filter(r=>r.confidence===confidence);
      const supported=all.filter(r=>SUPPORT_KINDS.has(r.kind)).length;
      const corrected=all.filter(r=>CORRECT_KINDS.has(r.kind)).length;
      const open=all.filter(r=>OPEN_KINDS.has(r.kind)).length;
      const uncertain=all.filter(r=>r.kind==='uncertain'||r.signal==='uncertain').length;
      byConfidence[confidence]={tested:all.length,supported,corrected,open,uncertain,supportRate:pct(supported,all.length),correctionRate:pct(corrected,all.length)};
    }

    const supported=resolved.filter(r=>SUPPORT_KINDS.has(r.kind)).length;
    const corrected=resolved.filter(r=>CORRECT_KINDS.has(r.kind)).length;
    const open=resolved.filter(r=>OPEN_KINDS.has(r.kind)).length;
    const uncertain=resolved.filter(r=>r.kind==='uncertain'||r.signal==='uncertain').length;
    const high=byConfidence.high;

    let headline='BUILD A TESTED READ SAMPLE';
    let detail='Lock provisional reads, let later public contact answer, then calibrate your confidence.';
    let band='learning';

    if(resolved.length>=3){
      if(high.tested>=2&&high.corrected>high.supported){
        headline='HIGH CONFIDENCE IS RUNNING AHEAD';
        detail='More HIGH-confidence tested reads have been corrected than supported. Lower certainty until the public evidence earns it.';
        band='correct';
      }else if(high.tested>=3&&high.supported>=high.corrected+2){
        headline='HIGH CONFIDENCE IS EARNING SUPPORT';
        detail='Several HIGH-confidence reads later received directional support. Keep testing them; support still is not hidden-state proof.';
        band='support';
      }else if(uncertain>=Math.max(2,Math.ceil(resolved.length/3))){
        headline='UNCERTAINTY IS ACTIVE DISCIPLINE';
        detail='You are repeatedly leaving hidden state open when the visible evidence does not earn a stronger claim.';
        band='uncertain';
      }else{
        headline='CALIBRATION IS FORMING';
        detail='Your tested reads now contain enough consequence to compare confidence with later public outcomes.';
        band='forming';
      }
    }

    return {
      version:VERSION,
      total:src.length,
      pending:src.length-resolved.length,
      resolved:resolved.length,
      supported,corrected,open,uncertain,
      supportRate:pct(supported,resolved.length),
      correctionRate:pct(corrected,resolved.length),
      byConfidence,
      headline,detail,band,
      law:'SUPPORTED != PROVED · CONTRADICTED RESULT != PERSON JUDGEMENT'
    };
  }

  function sourceState(){
    try{
      const state=root.PUKAReadLab?.state?.();
      return state&&Array.isArray(state.reads)?state:{reads:[]};
    }catch{return{reads:[]};}
  }

  function ensurePanel(){
    if(typeof document==='undefined'||document.getElementById('pukaReadCalibration'))return;
    const ledger=document.getElementById('pukaReadLedger');
    const history=document.querySelector('.history-head');
    const anchor=ledger||history;
    if(!anchor)return;
    const section=document.createElement('section');
    section.id='pukaReadCalibration';
    section.className='puka-read-calibration';
    section.setAttribute('aria-label','PUKA read calibration and counterread');
    section.innerHTML=`
      <div class="prc-head"><div><small>PUKA HUMAN GAME · COUNTERREAD</small><h3>Read Your Read</h3></div><span id="prcVersion">v0.16A</span></div>
      <p class="prc-route">CONTACT → OBSERVE → DECLARE → TEST → CONSEQUENCE → TRACE → <b>CALIBRATE</b></p>
      <div class="prc-grid">
        <article><small>TESTED</small><b id="prcTested">0</b></article>
        <article><small>SUPPORTED</small><b id="prcSupported">0</b></article>
        <article><small>CORRECTED</small><b id="prcCorrected">0</b></article>
        <article><small>UNCERTAIN</small><b id="prcUncertain">0</b></article>
      </div>
      <div id="prcHeadline" class="prc-headline">BUILD A TESTED READ SAMPLE</div>
      <p id="prcDetail" class="prc-detail">Lock provisional reads, let later public contact answer, then calibrate your confidence.</p>
      <div id="prcConfidence" class="prc-confidence"></div>
      <p class="prc-boundary">SUPPORTED ≠ PROVED · CORRECTION IS MODEL FEEDBACK, NOT A PERSON JUDGEMENT</p>`;
    anchor.insertAdjacentElement('beforebegin',section);
  }

  function render(){
    if(typeof document==='undefined')return null;
    ensurePanel();
    const summary=summarise(sourceState().reads);
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value);};
    set('prcTested',summary.resolved);
    set('prcSupported',summary.supported);
    set('prcCorrected',summary.corrected);
    set('prcUncertain',summary.uncertain);
    set('prcHeadline',summary.headline);
    set('prcDetail',summary.detail);
    const panel=document.getElementById('pukaReadCalibration');
    if(panel)panel.dataset.band=summary.band;
    const confidence=document.getElementById('prcConfidence');
    if(confidence){
      confidence.innerHTML=CONFIDENCE.map(c=>{
        const x=summary.byConfidence[c];
        return `<article><b>${esc(c.toUpperCase())}</b><span>${x.tested} tested</span><small>${x.supported} supported · ${x.corrected} corrected · ${x.open} open</small></article>`;
      }).join('');
    }
    return summary;
  }

  function boot(){
    render();
    if(typeof MutationObserver==='undefined')return;
    let pending=false;
    const observer=new MutationObserver(()=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{pending=false;render();});
    });
    const targets=[document.getElementById('pukaReadLedger'),document.getElementById('tableState'),document.getElementById('actions')].filter(Boolean);
    targets.forEach(t=>observer.observe(t,{childList:true,subtree:true,characterData:true}));
    addEventListener('storage',e=>{if(e.key==='jm-puka-read-lab-v01')render();});
  }

  const API={version:VERSION,normalise,summarise,sourceState,render};
  root.PUKAReadCalibration=API;
  if(typeof module==='object'&&module.exports)module.exports=API;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
})(typeof window!=='undefined'?window:globalThis);
