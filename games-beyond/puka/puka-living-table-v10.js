(() => {
  'use strict';
  const root=document.documentElement;
  const state=document.querySelector('#tableState');
  if(!state) return;

  let lastBoardCount=-1;
  let lastPotValue=-1;

  const numberFrom=node=>{
    const text=(node?.textContent||'').replace(/[^0-9.-]/g,'');
    const value=Number(text);
    return Number.isFinite(value)?Math.max(0,value):0;
  };
  const level=value=>value<=0?0:value<350?1:value<850?2:value<1450?3:value<2300?4:5;

  function chipMarkup(value,kind){
    const n=level(value);
    if(!n) return '';
    return `<span class="living-chip-bank chip-${kind} chip-level-${n}" data-visible-chip-value="${value}" aria-hidden="true">${Array.from({length:n},(_,i)=>`<i style="--chip-i:${i}"></i>`).join('')}</span>`;
  }

  function mountZoneBank(zone,kind){
    if(!zone) return;
    const label=zone.querySelector('.player-label');
    const value=numberFrom(label?.querySelector('span'));
    let bank=zone.querySelector(`.chip-${kind}`);
    const html=chipMarkup(value,kind);
    if(!html){bank?.remove();return;}
    if(!bank){zone.insertAdjacentHTML('beforeend',html);bank=zone.querySelector(`.chip-${kind}`);}
    bank.dataset.visibleChipValue=String(value);
    bank.className=`living-chip-bank chip-${kind} chip-level-${level(value)}`;
    const need=level(value), have=bank.querySelectorAll('i').length;
    if(have!==need) bank.innerHTML=Array.from({length:need},(_,i)=>`<i style="--chip-i:${i}"></i>`).join('');
  }

  function mountPotBank(){
    const pot=state.querySelector('.pot');
    if(!pot) return;
    const value=numberFrom(pot.querySelector('b'));
    let bank=pot.querySelector('.chip-pot');
    const html=chipMarkup(value,'pot');
    if(!html){bank?.remove();return;}
    if(!bank){pot.insertAdjacentHTML('beforeend',html);bank=pot.querySelector('.chip-pot');}
    bank.dataset.visibleChipValue=String(value);
    bank.className=`living-chip-bank chip-pot chip-level-${level(value)}`;
    const need=level(value), have=bank.querySelectorAll('i').length;
    if(have!==need) bank.innerHTML=Array.from({length:need},(_,i)=>`<i style="--chip-i:${i}"></i>`).join('');
    if(lastPotValue>=0&&value!==lastPotValue){
      bank.classList.remove('chip-bank-change');
      void bank.offsetWidth;
      bank.classList.add('chip-bank-change');
    }
    lastPotValue=value;
  }

  function stageBoard(){
    const board=state.querySelector('.board');
    if(!board){root.dataset.boardCount='0';lastBoardCount=-1;return;}
    const count=board.querySelectorAll('.playing-card:not(.back)').length;
    root.dataset.boardCount=String(count);
    if(lastBoardCount>=0&&count>lastBoardCount){
      board.classList.remove('board-reveal-wave');
      void board.offsetWidth;
      board.classList.add('board-reveal-wave');
      setTimeout(()=>board.classList.remove('board-reveal-wave'),700);
    }
    lastBoardCount=count;
  }

  function stageCourtCards(){
    state.querySelectorAll('.playing-card .court-art').forEach(art=>{
      const card=art.closest('.playing-card');
      if(card) card.dataset.pukaCourtFoil='1';
    });
  }

  function sync(){
    mountZoneBank(state.querySelector('.opponent.zone'),'house');
    mountZoneBank(state.querySelector('.you.zone'),'you');
    mountPotBank();
    stageBoard();
    stageCourtCards();
  }

  let queued=false;
  const requestSync=()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;sync();});
  };
  const observer=new MutationObserver(requestSync);
  observer.observe(state,{childList:true,subtree:true,characterData:true});
  addEventListener('orientationchange',()=>setTimeout(sync,80),{passive:true});
  requestSync();
})();