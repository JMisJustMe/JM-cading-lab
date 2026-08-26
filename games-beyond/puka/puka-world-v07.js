(() => {
  'use strict';

  const MAP={
    'Pauper':{tier:'lower',stage:'LOWER COURT',mark:'◇'},
    'Servant':{tier:'lower',stage:'LOWER COURT',mark:'◇'},
    'Jester':{tier:'middle',stage:'COURT TRAINING',mark:'✦'},
    'Squire':{tier:'middle',stage:'COURT TRAINING',mark:'✦'},
    'Knight':{tier:'high',stage:'ROYAL SERVICE',mark:'♞'},
    'Courtier':{tier:'high',stage:'ROYAL SERVICE',mark:'♜'},
    'Heir':{tier:'heir',stage:'SUCCESSION',mark:'♛'},
    'King':{tier:'throne',stage:'THE CROWN',mark:'♚'},
    'Queen':{tier:'throne',stage:'THE CROWN',mark:'♛'}
  };

  function currentRank(){return document.querySelector('#rank')?.textContent?.trim()||'Pauper';}
  function currentRoom(){return document.querySelector('#courtRoom')?.textContent?.trim()||'Lower Dormitory';}

  function ensurePlaque(){
    const ribbon=document.querySelector('.court-ribbon');
    if(!ribbon||ribbon.querySelector('.ascent-plaque')) return;
    ribbon.insertAdjacentHTML('afterbegin','<span class="ascent-plaque" aria-hidden="true"><i>◇</i><em>LOWER COURT</em></span>');
  }

  function ensureSeatSeal(){
    const label=document.querySelector('.you .player-label');
    if(!label||label.querySelector('.seat-rank-seal')) return;
    label.insertAdjacentHTML('afterbegin','<i class="seat-rank-seal" aria-hidden="true">◇</i>');
  }

  function apply(){
    const rank=currentRank();
    const info=MAP[rank]||MAP.Pauper;
    const root=document.documentElement;
    root.dataset.pukaRank=rank.toLowerCase().replace(/[^a-z]+/g,'-');
    root.dataset.courtTier=info.tier;
    root.dataset.courtRoom=currentRoom().toLowerCase().replace(/[^a-z0-9]+/g,'-');
    ensurePlaque();
    ensureSeatSeal();
    const plaque=document.querySelector('.ascent-plaque');
    if(plaque){
      plaque.querySelector('i').textContent=info.mark;
      plaque.querySelector('em').textContent=info.stage;
    }
    const seal=document.querySelector('.seat-rank-seal');
    if(seal) seal.textContent=info.mark;
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener('DOMContentLoaded',apply,{once:true});
  requestAnimationFrame(apply);
})();
