/* JM HUMAN-SCALE INTERACTION ORGAN v1.0
 * THE BODY CARRIES THE COMPLEXITY. THE PERSON CARRIES THE INTENTION.
 * FROZEN PARENTS ARE NOT MUTATED; this organ is for forward descendants/adapters.
 */
(() => {
  'use strict';
  const cfg = Object.assign({
    schema: 'jm.human-scale/config/1.0',
    mode: 'guided', // guided | calm | expert
    title: document.title || 'JM Body',
    intention: 'USE THIS BODY',
    primaryLabel: 'START',
    primarySelector: '',
    resultSelector: '',
    detailsLabel: 'DETAILS / TRACE',
    nextLabel: 'NEXT',
    hideOriginalUntilDetails: false,
    ownerContactRequired: true,
    receiverProofState: 'OPEN',
    sourceAuthority: '',
    bodyId: '',
    version: ''
  }, window.JM_HUMAN_SCALE_CONFIG || {});

  const $ = (s, root=document) => { try { return root.querySelector(s); } catch { return null; } };
  const all = (s, root=document) => { try { return [...root.querySelectorAll(s)]; } catch { return []; } };
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const stamp = () => new Date().toISOString();
  const KEY = `jm-human-scale:${cfg.bodyId || location.pathname}:v1`;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = x => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch {} };
  let state = Object.assign({runs:0,lastState:'READY',lastAt:null,lastNote:'',detailsOpen:false}, read());

  const css = document.createElement('style');
  css.id = 'jm-human-scale-style-v1';
  css.textContent = `
  :root{--jmhs-bg:#0a0d12;--jmhs-panel:#121923;--jmhs-panel2:#192431;--jmhs-line:#314052;--jmhs-ink:#f5f8fc;--jmhs-muted:#aebdcd;--jmhs-accent:#79e4f2;--jmhs-good:#8ce2a6;--jmhs-bad:#ff9aa5;--jmhs-warn:#ffd27d}
  #jm-human-scale-dock{position:relative;z-index:2147483000;color:var(--jmhs-ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(145deg,#101925,#090d13);border:1px solid var(--jmhs-line);border-radius:20px;margin:12px auto;max-width:980px;box-shadow:0 18px 60px #0007;overflow:hidden}
  #jm-human-scale-dock *{box-sizing:border-box}
  .jmhs-main{padding:clamp(15px,4vw,26px)}.jmhs-eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--jmhs-accent);font-weight:900}.jmhs-title{font-size:clamp(21px,5vw,36px);line-height:1.04;margin:8px 0 5px}.jmhs-intent{font-weight:900;color:#fff;margin:9px 0 16px}.jmhs-row{display:flex;gap:9px;flex-wrap:wrap}.jmhs-btn{min-height:50px;border-radius:14px;border:1px solid var(--jmhs-line);background:var(--jmhs-panel2);color:var(--jmhs-ink);font:inherit;font-weight:900;padding:11px 15px;cursor:pointer}.jmhs-btn.primary{flex:1 1 230px;background:var(--jmhs-accent);color:#061318;border-color:transparent;font-size:16px}.jmhs-btn.details{flex:0 1 auto}.jmhs-status{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 15px;border-top:1px solid var(--jmhs-line);font-size:12px;color:var(--jmhs-muted)}.jmhs-pill{border:1px solid var(--jmhs-line);border-radius:999px;padding:5px 8px;font-weight:900}.jmhs-pill.good{color:var(--jmhs-good)}.jmhs-pill.bad{color:var(--jmhs-bad)}.jmhs-pill.warn{color:var(--jmhs-warn)}.jmhs-detail{display:none;border-top:1px solid var(--jmhs-line);padding:14px 16px;background:#0b1119;color:var(--jmhs-muted);font-size:12px;line-height:1.5}.jmhs-detail.open{display:block}.jmhs-detail code{color:#d9edff;overflow-wrap:anywhere}.jmhs-note{width:100%;min-height:64px;background:#080d13;color:var(--jmhs-ink);border:1px solid var(--jmhs-line);border-radius:11px;padding:9px;margin-top:9px}.jmhs-result{margin-top:10px;padding:10px 12px;border:1px solid var(--jmhs-line);border-radius:12px;background:#0c131c;white-space:pre-wrap;overflow-wrap:anywhere}.jmhs-deep-hidden{display:none!important}.jmhs-original-marker{display:none!important}
  @media(max-width:560px){#jm-human-scale-dock{margin:8px;border-radius:17px}.jmhs-main{padding:14px}.jmhs-btn{width:100%}.jmhs-status{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(css);

  const dock = document.createElement('section');
  dock.id = 'jm-human-scale-dock';
  dock.setAttribute('data-jm-human-scale', 'v1.0');
  dock.innerHTML = `<div class="jmhs-main">
    <div class="jmhs-eyebrow">${esc(cfg.mode === 'calm' ? 'SIMPLE DOOR · DEEP HOUSE' : 'CURRENT USE ROUTE')}</div>
    <div class="jmhs-title">${esc(cfg.title)}</div>
    <div class="jmhs-intent">${esc(cfg.intention)}</div>
    <div class="jmhs-row">
      <button class="jmhs-btn primary" id="jmhs-primary" type="button">${esc(cfg.primaryLabel)}</button>
      <button class="jmhs-btn details" id="jmhs-details" type="button">${esc(cfg.detailsLabel)}</button>
    </div>
    <div class="jmhs-result" id="jmhs-result" aria-live="polite">READY</div>
  </div>
  <div class="jmhs-status"><span id="jmhs-runmeta">${state.runs} run${state.runs===1?'':'s'} recorded on this surface</span><span class="jmhs-pill warn" id="jmhs-pill">${esc(state.lastState || 'READY')}</span></div>
  <div class="jmhs-detail" id="jmhs-detail">
    <div><b>Body:</b> <code>${esc(cfg.bodyId || 'not declared')}</code></div>
    <div><b>Version:</b> <code>${esc(cfg.version || 'not declared')}</code></div>
    <div><b>Source authority:</b> <code>${esc(cfg.sourceAuthority || 'preserved by receiver lineage')}</code></div>
    <div><b>Receiver proof:</b> <code>${esc(cfg.receiverProofState)}</code></div>
    <div><b>Owner contact required:</b> <code>${cfg.ownerContactRequired ? 'YES' : 'NO / not applicable'}</code></div>
    <textarea class="jmhs-note" id="jmhs-note" placeholder="Optional note / bug / felt consequence…">${esc(state.lastNote || '')}</textarea>
    <div class="jmhs-row" style="margin-top:9px"><button class="jmhs-btn" id="jmhs-copy" type="button">COPY TRACE</button><button class="jmhs-btn" id="jmhs-showdeep" type="button">SHOW FULL BODY</button></div>
  </div>`;

  const firstBodyChild = [...document.body.children].find(x => !['SCRIPT','STYLE'].includes(x.tagName));
  document.body.insertBefore(dock, firstBodyChild || document.body.firstChild);

  const originalTop = [...document.body.children].filter(x => x !== dock && !['SCRIPT','STYLE'].includes(x.tagName));
  if (cfg.mode === 'calm' && cfg.hideOriginalUntilDetails) originalTop.forEach(x => x.classList.add('jmhs-deep-hidden'));

  const resultBox = $('#jmhs-result');
  const pill = $('#jmhs-pill');
  const runMeta = $('#jmhs-runmeta');
  const detail = $('#jmhs-detail');
  const note = $('#jmhs-note');

  function setState(label, message, kind='warn') {
    state.lastState = label; state.lastAt = stamp();
    resultBox.textContent = message || label;
    pill.textContent = label; pill.className = `jmhs-pill ${kind}`;
    runMeta.textContent = `${state.runs} run${state.runs===1?'':'s'} recorded on this surface`;
    write(state);
    window.dispatchEvent(new CustomEvent('jm-human-scale-state', {detail:{label,message,kind,config:cfg,state:{...state}}}));
  }

  function revealDeep() {
    originalTop.forEach(x => x.classList.remove('jmhs-deep-hidden'));
    const target = cfg.primarySelector ? $(cfg.primarySelector) : null;
    if (target) setTimeout(() => target.scrollIntoView({block:'center',behavior:'smooth'}), 50);
  }

  function primary() {
    state.runs += 1; write(state);
    setState('RUNNING', `${cfg.primaryLabel} requested. The body is carrying the internal route.`, 'warn');
    let handled = false;
    try {
      if (typeof cfg.primaryAction === 'function') { cfg.primaryAction(); handled = true; }
      else if (typeof cfg.primaryAction === 'string' && typeof window[cfg.primaryAction] === 'function') { window[cfg.primaryAction](); handled = true; }
      else if (cfg.primarySelector) {
        const target = $(cfg.primarySelector);
        if (target) { revealDeep(); target.click(); target.focus?.({preventScroll:true}); handled = true; }
      }
    } catch (e) {
      setState('BUG', `The simple route reached the body but its primary action threw: ${e.message || e}`, 'bad');
      return;
    }
    if (!handled) {
      revealDeep();
      const target = all('button,a[href],input[type=submit]').find(x => !dock.contains(x) && !x.disabled);
      if (target) {
        target.scrollIntoView({block:'center',behavior:'smooth'});
        setState('READY FOR CONTACT', 'The full body is open at its first available action. No automatic action was invented.', 'warn');
      } else setState('BUG', 'No safe primary action could be resolved. Open Details / Trace and inspect the body.', 'bad');
    } else {
      const readResult = () => {
        if (cfg.resultSelector) {
          const r = $(cfg.resultSelector); if (r && r.textContent.trim()) return r.textContent.trim();
        }
        return `${cfg.primaryLabel} handed to the existing body. Observe the real consequence; receiver proof remains ${cfg.receiverProofState}.`;
      };
      setTimeout(() => setState('CONTACTED', readResult(), 'good'), Number(cfg.resultDelayMs || 250));
    }
  }

  $('#jmhs-primary').addEventListener('click', primary);
  $('#jmhs-details').addEventListener('click', () => {
    state.detailsOpen = !detail.classList.contains('open'); write(state);
    detail.classList.toggle('open');
  });
  $('#jmhs-showdeep').addEventListener('click', revealDeep);
  note.addEventListener('input', e => { state.lastNote = e.target.value; write(state); });
  $('#jmhs-copy').addEventListener('click', async () => {
    const payload = {
      schema:'jm.human-scale/trace/1.0', at:stamp(), bodyId:cfg.bodyId, version:cfg.version,
      intention:cfg.intention, runs:state.runs, state:state.lastState, note:state.lastNote,
      receiverProofState:cfg.receiverProofState, ownerContactRequired:cfg.ownerContactRequired
    };
    const text = JSON.stringify(payload,null,2);
    try { await navigator.clipboard.writeText(text); setState('TRACE COPIED','Human-scale trace copied.','good'); }
    catch { window.prompt('Copy trace:', text); }
  });

  window.JM_HUMAN_SCALE = Object.freeze({
    version:'1.0', config:cfg, state:()=>({...state}), setState, revealDeep, run:primary,
    law:'THE BODY CARRIES THE COMPLEXITY. THE PERSON CARRIES THE INTENTION.'
  });
})();
