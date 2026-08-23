(() => {
  'use strict';
  const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
  const STORE='jm-puka-v01a';
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}})();
  const game=new PUKA.PukaGame(saved);
  let snap=game.snapshot();

  function save(){localStorage.setItem(STORE,JSON.stringify(game.persistable()));}
  function mode(){
    if(game.meta.mode==='portrait'||game.meta.mode==='royal')return game.meta.mode;
    return matchMedia('(orientation: portrait)').matches?'portrait':'royal';
  }
  function cardHTML(c,hidden=false,hero=false){
    if(hidden)return `<div class="playing-card back" aria-label="Hidden card"><span>PUKA</span></div>`;
    const red=c.suit==='hearts'||c.suit==='diamonds';
    const meta=PUKA.SUITS[c.suit];
    return `<div class="playing-card ${red?'red':''} ${hero?'hero-card':''}" aria-label="${c.rank} of ${meta.label}">
      <b>${c.rank}<i>${c.symbol}</i></b><span class="pip">${c.symbol}</span><span class="card-face" aria-hidden="true"><i></i><i></i><em></em></span><small>${meta.attribute}</small>
    </div>`;
  }
  function setModeClass(){document.documentElement.dataset.pukaMode=mode();$('#modeName').textContent=mode()==='portrait'?'PORTRAIT ACADEMY':'ROYAL TABLE';}
  function suitPicker(){
    $('#suitPicker').innerHTML=Object.entries(PUKA.SUITS).map(([id,s])=>`<button class="suit ${game.meta.suit===id?'chosen':''}" data-suit="${id}" aria-pressed="${game.meta.suit===id}"><span>${s.symbol}</span><b>${s.label}</b><small>${s.attribute}</small></button>`).join('');
    $$('[data-suit]').forEach(b=>b.onclick=()=>{game.setSuit(b.dataset.suit);save();render();});
  }
  function renderTrace(){
    const rows=snap.trace.slice(0,9);
    $('#trace').innerHTML=rows.length?rows.map(r=>`<article class="trace ${r.kind}"><b>${r.kind.toUpperCase()}</b><span>${r.message}</span>${r.data?.confidence?`<small>confidence: ${r.data.confidence}</small>`:''}</article>`).join(''):'<p class="empty">No evidence yet. Deal a hand.</p>';
  }
  function render(){
    snap=game.snapshot();setModeClass();suitPicker();
    const s=snap.state;
    $('#rank').textContent=snap.rank.name;
    $('#xp').textContent=`${snap.meta.xp} XP`;
    const pct=snap.nextRank?Math.max(0,Math.min(100,((snap.meta.xp-snap.rank.xp)/(snap.nextRank.xp-snap.rank.xp))*100)):100;
    $('#rankBar').style.width=`${pct}%`;
    $('#nextRank').textContent=snap.nextRank?`${snap.nextRank.name} at ${snap.nextRank.xp} XP`:'Court completed';
    $('#identity').innerHTML=`<span>${snap.suit.symbol}</span><div><b>${snap.suit.label}</b><small>${snap.suit.attribute} · ${snap.suit.archetype}</small></div>`;
    $('#hint').textContent=snap.hint;
    $('#tendency').textContent=snap.tendency;
    $('#dealBtn').textContent=s?.ended?'DEAL NEXT HAND':'DEAL HAND';
    $('#dealBtn').hidden=!!s&&!s.ended;

    if(!s){
      $('#tableState').innerHTML=`<section class="empty-state"><div class="big-suit">${snap.suit.symbol}</div><h2>Enter as ${snap.rank.name}</h2><p>Your suit is a game archetype, not a claim about your real personality. Learn the table by touching it.</p></section>`;
      $('#actions').innerHTML='';$('#statusLine').textContent='READY';renderTrace();return;
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
    const call=Math.max(0,s.currentBet-s.players.player.streetPut);
    const names={fold:'FOLD',check:'CHECK',call:`CALL ${call}`,raise:'RAISE'};
    $('#actions').innerHTML=snap.legal.map(a=>`<button data-action="${a}" class="action ${a}">${names[a]}</button>`).join('');
    $$('[data-action]').forEach(b=>b.onclick=()=>{game.playerAction(b.dataset.action);save();render();});
    renderTrace();
  }

  $('#dealBtn').onclick=()=>{game.newHand();save();render();};
  $$('[data-mode]').forEach(b=>b.onclick=()=>{game.setMode(b.dataset.mode);save();render();});
  $('#autoMode').onclick=()=>{game.setMode('auto');save();render();};
  $('#reviewBtn').onclick=()=>{$('#evidence').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  matchMedia('(orientation: portrait)').addEventListener?.('change',()=>{if(game.meta.mode==='auto')render();});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  render();
})();
