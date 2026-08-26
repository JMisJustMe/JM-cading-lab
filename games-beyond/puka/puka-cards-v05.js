(() => {
  'use strict';
  const PIPS={
    '2':[[50,24],[50,76]],
    '3':[[50,20],[50,50],[50,80]],
    '4':[[28,24],[72,24],[28,76],[72,76]],
    '5':[[28,22],[72,22],[50,50],[28,78],[72,78]],
    '6':[[28,20],[72,20],[28,50],[72,50],[28,80],[72,80]],
    '7':[[28,18],[72,18],[50,36],[28,50],[72,50],[28,82],[72,82]],
    '8':[[28,17],[72,17],[50,33],[28,50],[72,50],[50,67],[28,83],[72,83]],
    '9':[[28,17],[72,17],[28,37],[72,37],[50,50],[28,63],[72,63],[28,83],[72,83]],
    '10':[[28,14],[72,14],[50,28],[28,39],[72,39],[28,61],[72,61],[50,72],[28,86],[72,86]]
  };

  function courtSvg(rank,symbol){
    const crown=rank==='J'
      ?'<path d="M26 32 34 20 42 31 50 18 58 31 66 20 74 32 70 38H30Z"/>'
      :'<path d="M26 34 30 19 42 30 50 14 58 30 70 19 74 34 70 39H30Z"/>';
    const body=rank==='K'
      ?'<path d="M40 49h20v27H40z"/><path d="m41 55 18 13M59 55 41 68"/>'
      :rank==='Q'
        ?'<path d="M38 50q12-10 24 0v25H38Z"/><circle cx="50" cy="62" r="7"/>'
        :'<path d="M37 51h26l-4 24H41z"/><path d="m40 55 20 17M60 55 40 72"/>';
    return `<svg class="court-svg" viewBox="0 0 100 100" aria-hidden="true"><g class="court-line">${crown}<circle cx="50" cy="44" r="10"/>${body}</g><text x="50" y="92" text-anchor="middle" class="court-suit">${symbol}</text></svg>`;
  }

  function centre(rank,symbol){
    if(rank==='A') return `<div class="ace-art"><span>${symbol}</span><i>PUKA</i></div>`;
    if(['J','Q','K'].includes(rank)){
      const name={J:'JACK',Q:'QUEEN',K:'KING'}[rank];
      return `<div class="court-art rank-${rank.toLowerCase()}">${courtSvg(rank,symbol)}<em>${name}</em></div>`;
    }
    const layout=PIPS[rank]||[[50,50]];
    return `<div class="pip-field">${layout.map(([x,y],i)=>`<span class="pip-mark ${i%2?'pip-alt':''}" style="--x:${x}%;--y:${y}%">${symbol}</span>`).join('')}</div>`;
  }

  function enrich(card){
    if(card.dataset.pukaV05==='1'||card.classList.contains('back')) return;
    const oldRank=card.querySelector('b');
    const oldPip=card.querySelector('.pip');
    const oldMeta=card.querySelector('small');
    if(!oldRank||!oldPip) return;
    const rank=(oldRank.childNodes[0]?.textContent||oldRank.textContent||'').trim();
    const symbol=(oldPip.textContent||'').trim();
    const meta=(oldMeta?.textContent||'').trim();
    if(!rank||!symbol) return;
    card.dataset.pukaV05='1';
    card.innerHTML=`<div class="corner top-corner"><b>${rank}</b><i>${symbol}</i></div>${centre(rank,symbol)}<div class="corner bottom-corner"><b>${rank}</b><i>${symbol}</i></div><small>${meta}</small>`;
  }

  function pass(){
    document.querySelectorAll('.playing-card').forEach(enrich);
    const root=document.documentElement;
    const selected=document.querySelector('.identity > span')?.textContent?.trim();
    const suits={'♥':'hearts','♦':'diamonds','♣':'clubs','♠':'spades'};
    if(selected&&suits[selected]) root.dataset.pukaSuit=suits[selected];
  }

  const observer=new MutationObserver(pass);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',pass,{once:true});
  requestAnimationFrame(pass);
})();
