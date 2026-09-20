(()=>{'use strict';
const REV='2026-09-20-r1';
let mounted=false;
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function activateCatalogue(){
  const nav=document.getElementById('houseNav');
  if(!nav)return false;
  let btn=[...nav.querySelectorAll('button')].find(b=>/CATALOGUE/i.test(b.textContent||''));
  if(!btn){
    btn=document.createElement('button');
    btn.dataset.view='catalogue-current';
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected','false');
    btn.textContent='CATALOGUE';
    const hall=[...nav.querySelectorAll('button')].find(b=>/HALL/i.test(b.textContent||''));
    nav.insertBefore(btn,hall||nav.children[2]||null);
    btn.addEventListener('click',()=>{
      nav.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===btn);x.setAttribute('aria-selected',String(x===btn))});
      document.querySelectorAll('.view').forEach(v=>v.hidden=true);
      const v=document.getElementById('view-catalogue-current');if(v)v.hidden=false;
    });
  }
  const key=btn.dataset.view||'catalogue';
  let view=document.getElementById('view-'+key);
  if(!view){
    view=document.createElement('section');
    view.id='view-'+key;
    view.className='view';
    view.dataset.view=key;
    view.setAttribute('role','tabpanel');
    view.hidden=true;
    const main=document.getElementById('main');
    if(main)main.appendChild(view);
  }
  if(!view)return false;
  view.innerHTML=`
    <section class="panel" style="margin-top:0">
      <div class="panelHead"><div>
        <h2>Whole Current Games Estate</h2>
        <p>This is the whole-game catalogue lane. Mounted Rooms remain exact carriers; this view also keeps current heads, unmounted/private bodies, families, HOLDs and playable proof loops visible without pretending they are all mounted or publicly released.</p>
      </div><a class="btn gold" href="all-games.html?v=${REV}">OPEN FULL PAGE</a></div>
      <div class="law" style="margin-top:10px">COUNT THE GAME ONCE. KEEP EVERY PLAYABLE FORM IT EARNED. CONNECT THE WHOLE LINE.</div>
    </section>
    <iframe title="Whole Current Games Estate catalogue" src="all-games.html?v=${REV}" style="display:block;width:100%;min-height:78dvh;margin-top:9px;border:1px solid var(--line);border-radius:18px;background:#050811"></iframe>`;
  btn.textContent='CATALOGUE';
  const label=document.querySelector('.brand small');
  if(label)label.textContent='Whole-Estate House · Mounted Rooms + Current Catalogue';
  document.title='Games&Beyond — Whole-Estate House · Current Catalogue';
  const rooms=document.getElementById('view-rooms');
  if(rooms&&!rooms.querySelector('[data-jm-whole-catalogue-note]')){
    const panel=rooms.querySelector('.panel');
    if(panel){
      const note=document.createElement('div');
      note.dataset.jmWholeCatalogueNote='1';
      note.className='law';
      note.style.marginTop='9px';
      note.innerHTML='ROOMS = exact mounted carriers. <button type="button" data-open-whole-catalogue style="margin-left:6px;border:1px solid var(--cyan);border-radius:9px;background:#08232b;color:var(--cyan);padding:7px 9px;font-weight:900">OPEN WHOLE GAMES CATALOGUE</button>';
      panel.appendChild(note);
      note.querySelector('[data-open-whole-catalogue]').onclick=()=>btn.click();
    }
  }
  const status=document.getElementById('status');
  if(status){
    const n=document.getElementById('mountedStat')?.textContent?.trim();
    status.textContent=(n&&/^\d+$/.test(n)?n+' MOUNTED · ':'')+'WHOLE CATALOGUE CURRENT';
    status.classList.add('ok');
    status.title='Mounted-room count is separate from the whole Games Estate catalogue.';
  }
  mounted=true;
  return true;
}
let tries=0;
const timer=setInterval(()=>{tries++;if(activateCatalogue()||tries>200)clearInterval(timer)},100);
window.addEventListener('load',()=>setTimeout(activateCatalogue,250));
})();