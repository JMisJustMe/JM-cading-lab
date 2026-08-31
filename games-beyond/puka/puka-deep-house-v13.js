(() => {
  'use strict';

  const root=document.documentElement;
  const table=()=>document.querySelector('.table-wrap');
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let consequenceTimer=0;

  function ensureField(){
    const host=table();
    if(!host)return;
    if(!host.querySelector('.deep-house-field')){
      const field=document.createElement('div');
      field.className='deep-house-field';
      field.setAttribute('aria-hidden','true');
      host.prepend(field);
    }
    if(!host.querySelector('.deep-house-consequence')){
      const chip=document.createElement('div');
      chip.className='deep-house-consequence';
      chip.setAttribute('aria-hidden','true');
      chip.dataset.show='false';
      host.append(chip);
    }
  }

  function showConsequence(label,kind='contact'){
    ensureField();
    const chip=table()?.querySelector('.deep-house-consequence');
    if(!chip)return;
    root.dataset.contactConsequence=kind;
    chip.textContent=label;
    chip.dataset.show='true';
    clearTimeout(consequenceTimer);
    consequenceTimer=setTimeout(()=>{
      chip.dataset.show='false';
      root.dataset.contactConsequence='idle';
    },reduced()?80:900);
  }

  function syncVisibleState(){
    ensureField();
    root.dataset.deepHouse='active';
    const state=root.dataset.handState||'ready';
    const street=root.dataset.tableStreet||'ready';
    root.dataset.depthState=state==='ended'?'resolve':state==='active'?(street==='river'?'decision-deep':'decision'):'arrival';
  }

  function actionLabel(target){
    const action=target.closest('[data-action]');
    if(action)return{label:(action.dataset.action||'ACTION').toUpperCase(),kind:`action-${action.dataset.action||'contact'}`};
    const open=target.closest('[data-open-raise]');
    if(open)return{label:'RAISE OPTIONS',kind:'raise-open'};
    const sized=target.closest('[data-raise-to]');
    if(sized)return{label:`RAISE TO ${sized.dataset.raiseTo}`,kind:'raise-sized'};
    const deal=target.closest('[data-next-hand],#dealBtn');
    if(deal)return{label:'DEAL',kind:'deal'};
    const review=target.closest('[data-review-hand],#reviewBtn');
    if(review)return{label:'REVIEW',kind:'review'};
    const suit=target.closest('[data-quick-suit],[data-suit]');
    if(suit)return{label:'SUIT CHANGED',kind:'identity'};
    return null;
  }

  document.addEventListener('click',event=>{
    const read=actionLabel(event.target);
    if(read)showConsequence(read.label,read.kind);
  },true);

  document.addEventListener('pointerdown',event=>{
    const host=event.target.closest?.('.table-wrap');
    if(!host)return;
    const rect=host.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,((event.clientX-rect.left)/Math.max(1,rect.width))*100));
    const y=Math.max(0,Math.min(100,((event.clientY-rect.top)/Math.max(1,rect.height))*100));
    host.style.setProperty('--puka-contact-x',`${x.toFixed(1)}%`);
    host.style.setProperty('--puka-contact-y',`${y.toFixed(1)}%`);
    root.dataset.fieldContact='pressed';
    clearTimeout(window.__pukaFieldContact);
    window.__pukaFieldContact=setTimeout(()=>{root.dataset.fieldContact='idle';},reduced()?60:360);
  },{passive:true});

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='attributes'||record.target.id==='tableState'))syncVisibleState();
  });
  observer.observe(root,{attributes:true,attributeFilter:['data-hand-state','data-table-street','data-court-tier','data-puka-mode','data-board-count']});
  const state=document.querySelector('#tableState');
  if(state)observer.observe(state,{childList:true,subtree:true});

  addEventListener('resize',syncVisibleState,{passive:true});
  syncVisibleState();
})();
