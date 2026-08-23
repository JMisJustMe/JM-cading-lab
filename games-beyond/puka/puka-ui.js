(() => {
  'use strict';
  const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
  const STORE='jm-puka-v02a', OLD_STORE='jm-puka-v01a';
  const loadSaved=()=>{
    try{
      const fresh=localStorage.getItem(STORE);
      if(fresh) return JSON.parse(fresh);
      const old=localStorage.getItem(OLD_STORE);
      return old?JSON.parse(old):{};
    }catch{return {};}
  };
  const game=new PUKA.PukaGame(loadSaved());
  let snap=game.snapshot();

  function save(){localStorage.setItem(STORE,JSON.stringify(game.persistable()));}
  function mode(){
    if(game.meta.mode==='portrait'||game.meta.mode==='royal') return game.meta.mode;
    return matchMedia('(orientation: portrait)').matches?'portrait':'royal';
  }
  function cardHTML(c,hidden=false,hero=false){
    if(hidden) return `<div class="playing-card back" aria-label="Hidden card"><span>PUKA</span></div>`;
    const red=c.suit==='hearts'||c.suit==='diamonds';
    const meta=PUKA.SUITS[c.suit];
    return `<div class="playing-card suit-${c.suit} ${red?'red':''} ${hero?'hero-card':''}" aria-label="${c.rank} of ${meta.label}">
      <b>${c.rank}<i>${c.symbol}</i></b><span class="pip">${c.symbol}</span><span class="card-face" aria-hidden="true"><i></i><i></i><em></em></span><small>${meta.attribute}</small>
    </div>`;
  }
  function setModeClass(){
    const m=mode();
    document.documentElement.dataset.pukaMode=m;
    $('#modeName').textContent=m==='portrait'?'PORTRAIT ACADEMY':'ROYAL TABLE';
  }
  function suitPicker(){
    $('#suitPicker').innerHTML=Object.entries(PUKA.SUITS).map(([id,s])=>`<button class="suit ${game.meta.suit===id?'chosen':''}" data-suit="${id}" aria-pressed="${game.meta.suit===id}"><span>${s.symbol}</span><b>${s.label}</b><small>${s.attribute}</small></button>`).join('');
    $$('[data-suit]').forEach(b=>b.onclick=()=>{game.setSuit(b.dataset.suit);save();render();});
  }
  function renderTrace(){
    const rows=snap.trace.slice(0,14);
    $('#evidenceCount').textContent=`${snap.trace.length} trace${snap.trace.length===1?'':'s'}`;
    $('#trace').innerHTML=rows.length?rows.map(r=>`<article class="trace ${r.kind}"><b>${r.kind.toUpperCase()}</b><span>${r.message}</span>${r.data?.confidence?`<small>confidence: ${r.data.confidence}</small>`:''}</article>`).join(''):'<p class="empty">No evidence yet. Deal a hand.</p>';
  }
  function renderCoach(){
    const t=snap.teaching;
    $('#madeHand').textContent=t.madeHand;
    $('#callCost').textContent=String(t.toCall);
    $('#potOdds').textContent=t.potOdds;
    $('#position').textContent=t.position;
    $('#streetChip').textContent=t.street;
    $('#hint').textContent=t.line;
    $('#tendency').textContent=snap.tendency;
  }
  function deal(){
    game.newHand();
    $('#identityDetails').open=false;
    save();
    render();
  }
  function openEvidence(){
    $('#evidenceDrawer').open=true;
    $('#evidence').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function wireTableActions(){
    $$('[data-action]').forEach(b=>b.onclick=()=>{game.playerAction(b.dataset.action);save();render();});
    $('[data-next-hand]')?.addEventListener('click',deal);
    $('[data-review-hand]')?.addEventListener('click',openEvidence);
  }
  function render(){
    snap=game.snapshot();
    setModeClass();
    suitPicker();
    const s=snap.state;
    document.documentElement.dataset.handState=!s?'ready':s.ended?'ended':'active';

    $('#rank').textContent=snap.rank.name;
    $('#xp').textContent=`${snap.meta.xp} XP`;
    const pct=snap.nextRank?Math.max(0,Math.min(100,((snap.meta.xp-snap.rank.xp)/(snap.nextRank.xp-snap.rank.xp))*100)):100;
    $('#rankBar').style.width=`${pct}%`;
    $('#nextRank').textContent=snap.nextRank?`${snap.nextRank.name} at ${snap.nextRank.xp} XP`:'Court completed';
    $('#purseLine').textContent=`Purse ${snap.meta.bankroll.player} · House ${snap.meta.bankroll.ai}`;
    $('#identity').innerHTML=`<span>${snap.suit.symbol}</span><div><b>${snap.suit.label}</b><small>${snap.suit.attribute} · ${snap.suit.archetype}</small></div>`;
    $('#profileSummary').textContent=`${snap.suit.symbol} ${snap.suit.label.toUpperCase()} · ${snap.rank.name.toUpperCase()}`;
    $('#courtRoom').textContent=snap.room;
    $('#dealerLine').textContent=s?`HAND ${s.handNo} · ${s.dealer==='player'?'YOU':'HOUSE'} ON BUTTON`:`SESSION ${snap.meta.sessionNo}`;
    $('#dealBtn').hidden=!!s;

    renderCoach();

    if(!s){
      $('#statusLine').textContent='READY';
      $('#tableState').innerHTML=`<section class="empty-state"><div class="big-suit">${snap.suit.symbol}</div><h2>Enter as ${snap.rank.name}</h2><p>${snap.room}. Your suit is a game archetype, not a claim about your real personality.</p><button class="table-deal" data-next-hand>DEAL FIRST HAND</button></section>`;
      $('#actions').innerHTML='';
      $('#identityDetails').open=true;
      if(mode()==='portrait') $('#evidenceDrawer').open=false;
      wireTableActions();
      renderTrace();
      return;
    }

    $('#statusLine').textContent=s.ended?'HAND COMPLETE':`${s.street.toUpperCase()} · ${s.turn==='player'?'YOUR TURN':'HOUSE THINKING'}`;
    const hideAI=!s.ended;
    $('#tableState').innerHTML=`
      <section class="opponent zone">
        <div class="player-label"><b>HOUSE MIND</b><span>${s.players.ai.stack} chips</span></div>
        <div class="cards">${s.players.ai.hole.map(c=>cardHTML(c,hideAI)).join('')}</div>
      </section>
      <section class="pot"><span>POT</span><b>${s.pot}</b><small>${s.street.toUpperCase()}</small></section>
      <section class="board" aria-label="Community cards">${s.board.map(c=>cardHTML(c)).join('')}${Array.from({length:5-s.board.length},()=>'<div class="slot" aria-hidden="true"></div>').join('')}</section>
      <section class="you zone">
        <div class="cards">${s.players.player.hole.map(c=>cardHTML(c,false,true)).join('')}</div>
        <div class="player-label"><b>YOU · ${snap.rank.name}</b><span>${s.players.player.stack} chips</span></div>
      </section>
      ${s.ended?`<section class="result" role="status"><b>${s.message}</b></section>`:''}`;

    if(s.ended){
      $('#actions').innerHTML=`<button class="action next" data-next-hand>DEAL NEXT HAND</button><button class="action review" data-review-hand>REVIEW HAND</button>`;
    }else{
      const call=Math.max(0,s.currentBet-s.players.player.streetPut);
      const names={fold:'FOLD',check:'CHECK',call:`CALL ${call}`,raise:'RAISE'};
      $('#actions').innerHTML=snap.legal.map(a=>`<button data-action="${a}" class="action ${a}">${names[a]}</button>`).join('');
    }
    if(mode()==='royal') $('#evidenceDrawer').open=true;
    renderTrace();
    wireTableActions();
  }

  $('#dealBtn').onclick=deal;
  $$('[data-mode]').forEach(b=>b.onclick=()=>{
    game.setMode(b.dataset.mode);
    if(b.dataset.mode==='royal') $('#evidenceDrawer').open=true;
    save();render();
  });
  $('#autoMode').onclick=()=>{game.setMode('auto');save();render();};
  $('#reviewBtn').onclick=openEvidence;
  matchMedia('(orientation: portrait)').addEventListener?.('change',()=>{if(game.meta.mode==='auto')render();});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  render();
})();
