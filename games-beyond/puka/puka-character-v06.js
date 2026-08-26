(() => {
  'use strict';

  const seenCards=new Set();
  let lastPot=null;

  const suitFromCard=card=>{
    for(const s of ['hearts','diamonds','clubs','spades']) if(card.classList.contains(`suit-${s}`)) return s;
    return 'spades';
  };
  const rankFromCard=card=>card.querySelector('.top-corner b')?.textContent?.trim()||card.querySelector('b')?.textContent?.trim()||'?';
  const symbolFromCard=card=>card.querySelector('.top-corner i')?.textContent?.trim()||card.querySelector('.pip')?.textContent?.trim()||'♠';

  function mood(){
    const result=document.querySelector('.result')?.textContent?.toLowerCase()||'';
    if(result.includes('you win')||result.includes('wins')) return 'joy';
    if(result.includes('house')&&result.includes('win')) return 'rueful';
    const status=document.querySelector('#statusLine')?.textContent?.toLowerCase()||'';
    if(status.includes('your turn')) return 'focus';
    if(status.includes('thinking')) return 'watch';
    return 'ready';
  }

  function faceMarkup(rank,symbol,suit){
    const court=['J','Q','K'].includes(rank);
    const royal=rank==='K'?'king':rank==='Q'?'queen':rank==='J'?'jack':'pip';
    return `<span class="card-spirit spirit-${suit} spirit-${royal}" aria-hidden="true">
      <i class="brow brow-a"></i><i class="brow brow-b"></i>
      <i class="eye eye-a"><u></u></i><i class="eye eye-b"><u></u></i>
      <i class="mouth"></i>
      <b class="spirit-mark">${court?rank:symbol}</b>
    </span>`;
  }

  function enrichHero(card){
    if(card.dataset.pukaCharacter==='1'||card.classList.contains('back')) return;
    const rank=rankFromCard(card), symbol=symbolFromCard(card), suit=suitFromCard(card);
    card.dataset.pukaCharacter='1';
    card.dataset.cardRank=rank;
    card.dataset.cardSuit=suit;
    card.insertAdjacentHTML('beforeend',faceMarkup(rank,symbol,suit));
  }

  function animateNew(card){
    if(card.dataset.pukaMotion==='1') return;
    card.dataset.pukaMotion='1';
    const key=card.getAttribute('aria-label')||`${card.className}-${card.textContent.trim().slice(0,8)}`;
    if(seenCards.has(key)) return;
    seenCards.add(key);
    card.classList.add('puka-card-enter');
    card.addEventListener('animationend',()=>card.classList.remove('puka-card-enter'),{once:true});
  }

  function animatePot(){
    const pot=document.querySelector('.pot b');
    if(!pot) return;
    const value=pot.textContent?.trim();
    if(lastPot!==null&&value!==lastPot){
      const shell=pot.closest('.pot');
      shell?.classList.remove('puka-pot-bump');
      void shell?.offsetWidth;
      shell?.classList.add('puka-pot-bump');
    }
    lastPot=value;
  }

  function pass(){
    const currentMood=mood();
    document.documentElement.dataset.pukaMood=currentMood;
    document.querySelectorAll('.playing-card.hero-card').forEach(enrichHero);
    document.querySelectorAll('.playing-card').forEach(animateNew);
    animatePot();
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(pass));
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener('DOMContentLoaded',pass,{once:true});
  addEventListener('orientationchange',()=>setTimeout(pass,80),{passive:true});
  requestAnimationFrame(pass);
})();
