(() => {
  'use strict';
  const root=document.documentElement;
  const table=document.querySelector('.table-wrap');
  const state=document.querySelector('#tableState');
  const dealerLine=document.querySelector('#dealerLine');
  if(!table||!state||!dealerLine) return;

  function mountChrome(){
    let chrome=table.querySelector('.table-theatre-chrome');
    if(chrome) return chrome;
    chrome=document.createElement('div');
    chrome.className='table-theatre-chrome';
    chrome.setAttribute('aria-hidden','true');
    chrome.innerHTML=`
      <span class="dealer-medallion"></span>
      <span class="seat-plate seat-house">HOUSE</span>
      <span class="seat-plate seat-you">YOU</span>
      <i class="table-sightline sightline-house"></i>
      <i class="table-sightline sightline-you"></i>`;
    table.appendChild(chrome);
    return chrome;
  }

  function visibleDealer(){
    const text=(dealerLine.textContent||'').toUpperCase();
    if(text.includes('YOU BUTTON')) return 'you';
    if(text.includes('HOUSE BUTTON')) return 'house';
    return 'none';
  }

  function visibleStreet(){
    const street=(state.querySelector('.pot small')?.textContent||'ready').trim().toLowerCase();
    return ['preflop','flop','turn','river','showdown'].includes(street)?street:'ready';
  }

  function sync(){
    mountChrome();
    const hand=root.dataset.handState||'ready';
    root.dataset.dealerSeat=hand==='ready'?'none':visibleDealer();
    root.dataset.tableStreet=hand==='ready'?'ready':visibleStreet();
    root.dataset.tableTheatre=hand==='ready'?'waiting':'live';
  }

  mountChrome();
  const observer=new MutationObserver(sync);
  observer.observe(state,{childList:true,subtree:true,characterData:true});
  observer.observe(dealerLine,{childList:true,subtree:true,characterData:true});
  addEventListener('resize',sync,{passive:true});
  sync();
})();