(() => {
  'use strict';
  const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
  const STORES=['jm-puka-v12a','jm-puka-v02a','jm-puka-v01a'];
  const loadSaved=()=>{
    try{
      for(const key of STORES){const value=localStorage.getItem(key);if(value)return JSON.parse(value);}
      return {};
    }catch{return {};}
  };
  const game=new PUKA.PukaGame(loadSaved());
  let snap=game.snapshot(),raiseOpen=false;

  function save(){try{localStorage.setItem(STORES[0],JSON.stringify(game.persistable()));}catch{}}
  function isPhone(){return matchMedia('(max-width: 700px)').matches||matchMedia('(max-height: 650px) and (orientation: landscape)').matches;}
  function mode(){
    if(isPhone()) return matchMedia('(orientation: portrait)').matches?'portrait':'royal';
    if(game.meta.mode==='portrait'||game.meta.mode==='royal') return game.meta.mode;
    return matchMedia('(orientation: portrait)').matches?'portrait':'royal';
  }
  function cardHTML(c,hidden=false,hero=false){
    if(hidden) return `<div class="playing-card back" aria-label="Hidden card"><span>PUKA</span></div>`;
    const red=c.suit==='hearts'||c.suit==='diamonds';
    const meta=PUKA.SUITS[c.suit];
    return `<div class="playing-card suit-${c.suit} ${red?'red':''} ${hero?'hero-card':''}" aria-label="${c.rank} of ${meta.label}">
      <b>${c.rank}<i>${c.symbol}</i></b><span class="pip">${c.symbol}</span><small>${meta.attribute}</small>
    </div>`;
  }
  function cardIdLabel(id){
    const at=String(id||'').lastIndexOf('-');
    if(at<1)return String(id||'');
    const rank=id.slice(0,at),suit=id.slice(at+1),meta=PUKA.SUITS[suit];
    return `${rank}${meta?.symbol||''}`;
  }
  function setModeClass(){
    const m=mode();
    document.documentElement.dataset.pukaMode=m;
    $('#modeName').textContent=m==='portrait'?'PORTRAIT ACADEMY':'ROYAL TABLE';
  }
  function suitButtons(compact=false){
    return Object.entries(PUKA.SUITS).map(([id,s])=>`<button class="${compact?'quick-suit':'suit'} ${game.meta.suit===id?'chosen':''}" data-${compact?'quick-suit':'suit'}="${id}" aria-label="${s.label}: ${s.attribute}" aria-pressed="${game.meta.suit===id}">${compact?`<span>${s.symbol}</span>`:`<span>${s.symbol}</span><b>${s.label}</b><small>${s.attribute}</small>`}</button>`).join('');
  }
  function suitPicker(){
    $('#suitPicker').innerHTML=suitButtons(false);
    $$('[data-suit]').forEach(b=>b.onclick=()=>{game.setSuit(b.dataset.suit);save();render();});
  }
  function renderTrace(){
    const rows=snap.trace.slice(0,12);
    $('#evidenceCount').textContent=`${snap.trace.length} trace${snap.trace.length===1?'':'s'} · ${snap.history.length} hand${snap.history.length===1?'':'s'}`;
    $('#trace').innerHTML=rows.length?rows.map(r=>`<article class="trace ${r.kind}"><b>${r.kind.toUpperCase()}</b><span>${r.message}</span>${r.data?.confidence?`<small>confidence: ${r.data.confidence}</small>`:''}</article>`).join(''):'<p class="empty">No evidence yet. Deal a hand.</p>';
  }
  function renderHistory(){
    $('#reviewTitle').textContent=snap.review.title;
    $('#reviewLine').textContent=snap.review.line;
    $('#historyList').innerHTML=snap.history.length?snap.history.map(h=>{
      const mine=(h.playerHole||[]).map(cardIdLabel).join(' '),house=h.houseHole?(h.houseHole||[]).map(cardIdLabel).join(' '):'not revealed';
      const board=(h.board||[]).map(cardIdLabel).join(' ')||'—';
      return `<article class="history-row"><div><b>HAND ${h.handNo}</b><span>${h.winner==='player'?'WIN':h.winner==='split'?'SPLIT':'LOSS'} · ${h.street.toUpperCase()}</span></div><small>YOU ${mine} · BOARD ${board} · HOUSE ${house}</small></article>`;
    }).join(''):'<p class="empty">No completed hands yet.</p>';
  }
  function renderCoach(){
    const t=snap.teaching;
    $('#madeHand').textContent=t.madeHand;
    $('#callCost').textContent=String(t.toCall);
    $('#potOdds').textContent=t.potOdds;
    $('#equity').textContent=t.equity;
    $('#priceRead').textContent=t.priceRead;
    $('#position').textContent=t.position;
    $('#streetChip').textContent=t.street;
    $('#lessonRank').textContent=snap.rank.name.toUpperCase();
    $('#lessonTitle').textContent=t.lesson.title;
    $('#lessonTitle').title=t.lesson.focus;
    $('#hint').textContent=t.line;
    $('#tendency').textContent=snap.tendency;
  }
  function renderMastery(){
    $('#masteryHands').textContent=String(snap.mastery.hands);
    $('#masteryShowdowns').textContent=String(snap.mastery.showdowns);
    $('#masteryDecisions').textContent=String(snap.mastery.decisions);
    $('#masteryRaises').textContent=String(snap.mastery.sizedRaises);
  }
  function deal(){
    game.newHand();raiseOpen=false;
    $('#identityDetails').open=false;
    save();render();
  }
  function openEvidence(){
    $('#evidenceDrawer').open=true;
    if(mode()==='portrait') $('#evidence').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function renderRaiseTray(){
    const tray=$('#raiseTray');
    if(!raiseOpen||!snap.raiseOptions.length){tray.hidden=true;tray.innerHTML='';return;}
    tray.hidden=false;
    tray.innerHTML=`<span class="raise-label">RAISE TO</span>${snap.raiseOptions.map(o=>`<button class="raise-size ${o.allIn?'all-in':''}" data-raise-to="${o.target}" aria-label="${o.label} raise to ${o.target}"><small>${o.label}</small><b>${o.target}</b></button>`).join('')}`;
  }
  function wireTableActions(){
    $$('[data-action]').forEach(b=>b.onclick=()=>{raiseOpen=false;game.playerAction(b.dataset.action);save();render();});
    $('[data-open-raise]')?.addEventListener('click',()=>{raiseOpen=!raiseOpen;render();});
    $$('[data-raise-to]').forEach(b=>b.onclick=()=>{raiseOpen=false;game.playerAction('raise',Number(b.dataset.raiseTo));save();render();});
    $('[data-next-hand]')?.addEventListener('click',deal);
    $('[data-review-hand]')?.addEventListener('click',openEvidence);
    $$('[data-quick-suit]').forEach(b=>b.onclick=()=>{game.setSuit(b.dataset.quickSuit);save();render();});
  }
  function render(){
    snap=game.snapshot();
    setModeClass();suitPicker();
    const s=snap.state;
    document.documentElement.dataset.handState=!s?'ready':s.ended?'ended':'active';

    $('#rank').textContent=snap.rank.name;
    $('#xp').textContent=`${snap.meta.xp} XP`;
    const pct=snap.nextRank?Math.max(0,Math.min(100,((snap.meta.xp-snap.rank.xp)/(snap.nextRank.xp-snap.rank.xp))*100)):100;
    $('#rankBar').style.width=`${pct}%`;
    $('#nextRank').textContent=snap.nextRank?`${snap.nextRank.name} at ${snap.nextRank.xp} XP`:'Court completed';
    $('#purseLine').textContent=`Purse ${snap.meta.bankroll.player} · House ${snap.meta.bankroll.ai}`;
    $('#identity').innerHTML=`<span>${snap.suit.symbol}</span><div><b>${snap.suit.label}</b><small>${snap.suit.attribute} · ${snap.suit.archetype}</small></div>`;
    $('#profileSummary').textContent=`${snap.suit.symbol} ${snap.rank.name.toUpperCase()} · ${snap.meta.bankroll.player}`;
    $('#courtRoom').textContent=snap.room;
    $('#dealerLine').textContent=s?`HAND ${s.handNo} · ${s.dealer==='player'?'YOU':'HOUSE'} BUTTON`:`SESSION ${snap.meta.sessionNo}`;
    $('#dealBtn').hidden=!!s;
    renderCoach();renderMastery();renderHistory();

    if(!s){
      $('#statusLine').textContent='READY';
      $('#tableState').innerHTML=`<section class="empty-state">
        <div class="big-suit">${snap.suit.symbol}</div>
        <h2>${snap.rank.name} · ${snap.room}</h2>
        <div class="entry-suits" aria-label="Quick suit choice">${suitButtons(true)}</div>
        <p>${snap.teaching.lesson.focus} Rotate your phone for the Royal Table.</p>
        <button class="table-deal" data-next-hand>DEAL FIRST HAND</button>
      </section>`;
      $('#actions').innerHTML='';
      raiseOpen=false;renderRaiseTray();
      $('#identityDetails').open=false;
      $('#evidenceDrawer').open=false;
      wireTableActions();renderTrace();return;
    }

    $('#identityDetails').open=false;
    $('#statusLine').textContent=s.ended?'HAND COMPLETE':`${s.street.toUpperCase()} · ${s.turn==='player'?'YOUR TURN':'HOUSE THINKING'}`;
    const hideAI=!s.ended||s.endReason==='fold';
    $('#tableState').innerHTML=`
      <section class="opponent zone">
        <div class="player-label"><b>HOUSE MIND</b><span>${s.players.ai.stack}</span></div>
        <div class="cards">${s.players.ai.hole.map(c=>cardHTML(c,hideAI)).join('')}</div>
      </section>
      <section class="pot"><span>POT</span><b>${s.pot}</b><small>${s.street.toUpperCase()}</small></section>
      <section class="board" aria-label="Community cards">${s.board.map(c=>cardHTML(c)).join('')}${Array.from({length:5-s.board.length},()=>'<div class="slot" aria-hidden="true"></div>').join('')}</section>
      <section class="you zone">
        <div class="cards">${s.players.player.hole.map(c=>cardHTML(c,false,true)).join('')}</div>
        <div class="player-label"><b>YOU · ${snap.rank.name}</b><span>${s.players.player.stack}</span></div>
      </section>
      ${s.ended?`<section class="result" role="status"><b>${s.message}</b></section>`:''}`;

    if(s.ended){
      raiseOpen=false;
      $('#actions').innerHTML=`<button class="action next" data-next-hand>DEAL NEXT</button><button class="action review" data-review-hand>REVIEW HAND</button>`;
    }else{
      const call=Math.max(0,s.currentBet-s.players.player.streetPut);
      const names={fold:'FOLD',check:'CHECK',call:`CALL ${call}`};
      $('#actions').innerHTML=snap.legal.map(a=>a==='raise'?`<button data-open-raise class="action raise" aria-expanded="${raiseOpen}">RAISE</button>`:`<button data-action="${a}" class="action ${a}">${names[a]}</button>`).join('');
    }
    renderRaiseTray();
    $('#evidenceDrawer').open=false;
    renderTrace();wireTableActions();
  }

  $('#dealBtn').onclick=deal;
  $$('[data-mode]').forEach(b=>b.onclick=()=>{game.setMode(b.dataset.mode);save();render();});
  $('#autoMode').onclick=()=>{game.setMode('auto');save();render();};
  $('#reviewBtn').onclick=openEvidence;
  const orientation=matchMedia('(orientation: portrait)');
  orientation.addEventListener?.('change',render);
  addEventListener('resize',()=>{clearTimeout(window.__pukaResize);window.__pukaResize=setTimeout(render,120);},{passive:true});
  addEventListener('pagehide',save,{passive:true});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  save();render();
})();
