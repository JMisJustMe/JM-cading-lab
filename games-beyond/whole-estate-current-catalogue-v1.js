(()=>{'use strict';
const REV='2026-11-07-cp22';
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
  if(view.dataset.jmCatalogueRendered!==REV){
    view.innerHTML=`
    <section class="panel" style="margin-top:0">
      <div class="panelHead"><div>
        <h2>Whole Games Catalogue · public source register</h2>
        <p>Every public catalogue record is searchable below. This is not the mounted Rooms subset: independently preserved games, descendants, proofs, families and recovery HOLDs retain separate identities, with no invented play links.</p>
      </div><a class="btn gold" href="all-games.html?v=${REV}">OPEN FULL PAGE</a></div>
      <p id="catalogueRecordCount" class="law" role="status" aria-live="polite" style="margin-top:10px">Reading public catalogue records…</p>
      <form action="all-games.html" method="get" class="row" aria-label="Search all game records"><label class="sr-only" for="catalogueQuery">Search all public Games Estate records</label><input id="catalogueQuery" name="q" type="search" class="search" placeholder="Find original games, COMBOUND, FPS…" style="flex:1 1 220px" required><button class="btn cyan" type="submit">SEARCH FULL CATALOGUE</button></form>
      <p style="font-size:.72rem;color:var(--muted)">An earlier CP14 report counted 143 catalogue identities; the current public source has a different 140-record scope. Record-by-record reconciliation remains open. Private family-only originals remain protected. These counts are not unique completed games.</p>
    </section>
    <iframe id="wholeGamesCatalogueFrame" loading="lazy" title="Searchable public Whole Current Games Estate catalogue" src="all-games.html?v=${REV}" style="display:block;width:100%;min-height:80dvh;margin-top:9px;border:1px solid var(--line);border-radius:18px;background:#050811"></iframe>`;
    view.dataset.jmCatalogueRendered=REV;
    const frame=view.querySelector('#wholeGamesCatalogueFrame');
    if(frame)frame.addEventListener('load',()=>{try{const count=frame.contentDocument?.getElementById('statAll')?.textContent?.trim();const slot=view.querySelector('#catalogueRecordCount');if(slot&&/^\d+$/.test(count||''))slot.textContent=count+' public records · mounted Rooms counted separately';else if(slot)slot.textContent='Open the full catalogue for the current count';}catch{const slot=view.querySelector('#catalogueRecordCount');if(slot)slot.textContent='Open full catalogue to browse records';}});
  }
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
      note.innerHTML='ROOMS = mounted carriers, NOT the whole Games Estate. <button type="button" data-open-whole-catalogue style="margin-left:6px;border:1px solid var(--cyan);border-radius:9px;background:#08232b;color:var(--cyan);padding:7px 9px;font-weight:900">OPEN WHOLE GAMES CATALOGUE</button>';
      panel.appendChild(note);
      note.querySelector('[data-open-whole-catalogue]').onclick=()=>btn.click();
    }
  }
  const description=document.querySelector('#view-house .hero p');
  if(description)description.textContent='Mounted Rooms follow the verified payload manifest. The two protected JMStudios originals complete the local mounted House only after owner-controlled import. The wider catalogue is a separate public source register: it is not limited to mounted Rooms, and a public listing does not certify gameplay.';
  const legacyStat=document.getElementById('catalogueStat');
  if(legacyStat?.parentElement?.querySelector('span'))legacyStat.parentElement.querySelector('span').textContent='Legacy catalogue subset';
  const status=document.getElementById('status');
  if(status){
    status.title='Mounted-room count is separate from the whole Games Estate catalogue.';
  }
  mounted=true;
  return true;
}
let tries=0;
const timer=setInterval(()=>{tries++;if(activateCatalogue()||tries>200)clearInterval(timer)},100);
window.addEventListener('load',()=>setTimeout(activateCatalogue,250));
window.addEventListener('jm-games-beyond-legacy-catalogue-ready',activateCatalogue);
})();