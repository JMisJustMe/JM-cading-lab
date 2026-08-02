function uid(prefix='id'){ return prefix + '-' + Math.random().toString(36).slice(2,9); }
function today(){ return new Date().toISOString().slice(0,10); }
function loadState(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || structuredClone(SAMPLE_STATE); }
  catch(e){ return structuredClone(SAMPLE_STATE); }
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); render(); }
function resetState(){ if(confirm('Reset LiveForge engine state to sample data?')){ state = structuredClone(SAMPLE_STATE); save(); } }
function branchById(id){ return BRANCHES.find(b=>b.id===id) || BRANCHES[0]; }
function autoRouteText(text){
  const t = (text||'').toLowerCase();
  const scores = BRANCHES.map(b=>({b, score:b.keywords.reduce((n,k)=> n + (t.includes(k.toLowerCase())?1:0),0)}));
  scores.sort((a,b)=>b.score-a.score);
  const best = scores[0].score>0 ? scores[0].b : branchById('liveforge');
  return {branch:best.id, rail:best.rail, score:scores[0].score};
}
function setTab(tab){ currentTab = tab; document.querySelectorAll('.section').forEach(s=>s.classList.remove('active')); document.getElementById(tab).classList.add('active'); document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab)); render(); }
function addFeed(ev){
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const text = fd.get('text'); const routed = autoRouteText(fd.get('title')+' '+text);
  const manualBranch = fd.get('branch');
  const branch = manualBranch || routed.branch;
  const b = branchById(branch);
  state.feeds.unshift({id:uid('feed'), title:fd.get('title')||'Untitled feed', type:fd.get('type'), text, branch, rail:b.rail, claim:fd.get('claim'), status:'INTAKED', priority:fd.get('priority'), created:today()});
  ev.target.reset(); selectedFeedId = state.feeds[0].id; save(); setTab('route');
}
function deleteFeed(id){ state.feeds = state.feeds.filter(f=>f.id!==id); if(selectedFeedId===id) selectedFeedId=null; save(); }
function selectFeed(id){ selectedFeedId = id; render(); }
function rerouteFeed(id){ const f = state.feeds.find(x=>x.id===id); const r = autoRouteText(f.title+' '+f.text); f.branch = r.branch; f.rail = branchById(r.branch).rail; f.status='ROUTED'; save(); }
function dingFeed(id){ const f=state.feeds.find(x=>x.id===id); if(!f) return; f.status='DINGED'; const b=branchById(f.branch); state.receipts.unshift({id:uid('receipt'), date:today(), feedId:id, title:f.title, branch:b.name, output:`${f.title} routed through ${b.name}`, ding:'DING', trace:`Claim ${f.claim}; rail ${f.rail}; status ${f.status}`, next:'Package or recover through Switchboard'}); save(); }
function generatePack(feed){
  const b = branchById(feed.branch);
  return `# LIVEFORGE PRODUCT BODY\n\n## 00_OPEN_FIRST\n\nSource feed: ${feed.title}\nType: ${feed.type}\nClaim-status: ${feed.claim}\nPriority: ${feed.priority}\n\n## Branch route\n\nBranch: ${b.name}\nHeader: ${b.header}\nRootRail: ${b.rail}\nRole: ${b.role}\n\n## Source material\n\n${feed.text}\n\n## LiveForge decision\n\nThis material should be handled as a ${feed.type} feed and routed through ${b.name}. LiveForge may produce a product body, but it must not replace Central Switchboard or flatten the branch.\n\n## Product shell\n\n- 00_OPEN_FIRST.md\n- README.md\n- BUILD_REPORT.md\n- PRODUCT_RECEIPT.md\n- TRACE_REPORT.md\n- SWITCHBOARD_UPDATE.md\n- SOURCE_ROUTE.md\n- RECOVERY_NOTES.md\n\n## QA / Ding checklist\n\n- [ ] Source preserved\n- [ ] Branch identity preserved\n- [ ] Claim-status labelled\n- [ ] Output body named\n- [ ] Receipt written\n- [ ] Switchboard update prepared\n- [ ] Recovery route exists\n\n## Do-not-change lock\n\n${b.lock}\n\n## Receipt\n\nOutput made: ${feed.title}\nBranch: ${b.name}\nWhat changed: routed into a LiveForge product shell.\nWhat did not change: Central Switchboard remains master; LiveForge remains bench.\nNext action: build/export actual output body or recover missing source if needed.\n`;
}
function copyForge(){ navigator.clipboard.writeText(document.getElementById('forgeOut').textContent); alert('Copied forge output.'); }
function downloadText(name, text, type='text/markdown'){
  const blob = new Blob([text], {type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href);
}
function downloadForge(){ const f = selectedFeed(); if(!f) return; downloadText(`LIVEFORGE_PRODUCT_${slug(f.title)}.md`, generatePack(f)); }
function selectedFeed(){ return state.feeds.find(f=>f.id===selectedFeedId) || state.feeds[0]; }
function slug(s){return (s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)}
function exportState(){ downloadText(`liveforge-engine-state-${today()}.json`, JSON.stringify(state,null,2), 'application/json'); }
function importState(file){ const r=new FileReader(); r.onload=()=>{ try{ state=JSON.parse(r.result); save(); alert('Imported state.'); }catch(e){alert('Invalid JSON.')} }; r.readAsText(file); }
function exportReceipts(){ const md = state.receipts.map(r=>`# ${r.title}\n\nDate: ${r.date}\nBranch: ${r.branch}\nOutput: ${r.output}\nTrace: ${r.trace}\nNext: ${r.next}\n`).join('\n---\n'); downloadText(`liveforge-receipts-${today()}.md`, md || '# No receipts yet'); }
function branchStats(){ const o={}; BRANCHES.forEach(b=>o[b.id]=0); state.feeds.forEach(f=>o[f.branch]=(o[f.branch]||0)+1); return o; }
function render(){
  renderMetrics(); renderBranches(); renderFeeds(); renderRoute(); renderForge(); renderReceipts(); renderSwitchboard();
}
function renderMetrics(){
  const d=document.getElementById('metrics'); if(!d) return;
  d.innerHTML = `<div class="card"><h3>Feeds</h3><div class="metric">${state.feeds.length}</div><div class="muted">intaked source items</div></div><div class="card"><h3>Receipts</h3><div class="metric">${state.receipts.length}</div><div class="muted">Ding / trace records</div></div><div class="card"><h3>Branches</h3><div class="metric">${new Set(state.feeds.map(f=>f.branch)).size}</div><div class="muted">active routes touched</div></div><div class="card"><h3>Mode</h3><div class="metric">BENCH</div><div class="muted">LiveForge is not hub</div></div>`;
}
function renderBranches(){
  const stats=branchStats(); const d=document.getElementById('branchList'); if(!d) return;
  d.innerHTML = BRANCHES.map(b=>`<div class="item"><div class="item-head"><div><b>${b.name}</b><p class="muted">${b.role}</p></div><span class="tag ok">${stats[b.id]||0} feeds</span></div><span class="tag">${b.header}</span><span class="tag">${b.rail}</span><p><b>Lock:</b> ${b.lock}</p></div>`).join('');
}
function renderFeeds(){
  const targets=[document.getElementById('feedListIntake'), document.getElementById('feedListRoute')].filter(Boolean); if(!targets.length) return;
  const html = state.feeds.map(f=>{const b=branchById(f.branch); return `<div class="item"><div class="item-head"><div><b>${f.title}</b><p class="muted">${f.text.slice(0,180)}${f.text.length>180?'…':''}</p></div><div><button class="btn" onclick="selectFeed('${f.id}')">Select</button></div></div><span class="tag">${f.type}</span><span class="tag ok">${f.claim}</span><span class="tag warn">${f.priority}</span><span class="tag">${b.name}</span><span class="tag">${f.status}</span><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="rerouteFeed('${f.id}')">Auto-route</button><button class="btn ok" onclick="dingFeed('${f.id}')">Ding receipt</button><button class="btn" onclick="selectFeed('${f.id}');setTab('forge')">Forge</button><button class="btn" onclick="deleteFeed('${f.id}')">Delete</button></div></div>`}).join('') || '<p class="muted">No feeds yet.</p>';
  targets.forEach(d=>d.innerHTML=html);
}
function renderRoute(){
  const d=document.getElementById('routeDetail'); if(!d) return; const f=selectedFeed();
  if(!f){d.innerHTML='<p class="muted">Select a feed first.</p>'; return} const b=branchById(f.branch);
  d.innerHTML = `<div class="grid"><div class="card"><h3>Selected feed</h3><div class="metric" style="font-size:25px">${f.title}</div><p class="muted">${f.text}</p></div><div class="card"><h3>Routed branch</h3><div class="metric" style="font-size:25px">${b.name}</div><p>${b.role}</p><span class="tag">${b.header}</span><span class="tag">${b.rail}</span></div><div class="card"><h3>Lock</h3><p>${b.lock}</p><button class="btn ok" onclick="dingFeed('${f.id}')">Ding this route</button></div></div>`;
}
function renderForge(){
  const out=document.getElementById('forgeOut'); if(!out) return; const f=selectedFeed(); out.textContent = f ? generatePack(f) : 'Select or add a feed to forge a product body.';
}
function renderReceipts(){
  const d=document.getElementById('receiptList'); if(!d) return;
  d.innerHTML = state.receipts.map(r=>`<div class="item"><div class="item-head"><div><b>${r.title}</b><p class="muted">${r.output}</p></div><span class="tag ok">${r.ding}</span></div><span class="tag">${r.date}</span><span class="tag">${r.branch}</span><p><b>Trace:</b> ${r.trace}</p><p><b>Next:</b> ${r.next}</p></div>`).join('') || '<p class="muted">No receipts yet. Ding a feed route to create one.</p>';
}
function renderSwitchboard(){
 const d=document.getElementById('switchboardOut'); if(!d) return;
 d.textContent = `SWITCHBOARD UPDATE PACK\n\nBranch updated:\nLiveForge Engine Build Room\n\nCurrent product body:\nLiveForge Engine Body v0.1\n\nPrimary header:\nOutputs / Exports / Receipts\n\nSecondary headers:\nRuntime / Governance\nGame Engines / Playable Systems\n\nStatus:\nACTIVE BUILT APP / PRODUCT BENCH\n\nReceives from:\nCentral Switchboard, FlowTalk, JM32-1DA, JM GameCore v0.2I, BodyMesh, Build Laws, JMISJUSTME, Game/Engine Native Build Lock\n\nFeeds into:\nEstate Intake Register recovery, Branch Cards, Product Receipts, LiveForge output packs, app/game/site bodies\n\nLatest proof:\nRunnable engine body built with intake, routing, forging, receipts, visual dashboard, export/import, and PWA package.\n\nDo not alter:\nLiveForge is bench, not hub. Central Switchboard remains master. Restore before rewrite. No Ding, no completion claim.`;
}
function init(){
  document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  document.getElementById('feedForm').addEventListener('submit',addFeed);
  document.getElementById('branchSelect').innerHTML = '<option value="">Auto-route</option>' + BRANCHES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  document.getElementById('importFile').addEventListener('change',e=>{ if(e.target.files[0]) importState(e.target.files[0]); });
  document.getElementById('routeMap').innerHTML = `<svg class="route-svg" viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="LiveForge ecosystem route map">
<defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#79c0ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity=".35"/></filter></defs>
<rect width="1100" height="520" rx="28" fill="#0b1119"/>
<g font-family="system-ui,Segoe UI,Arial" font-size="16" fill="#eaf2ff" text-anchor="middle">
  <g filter="url(#s)">
    <rect x="430" y="26" width="240" height="66" rx="20" fill="#151e2a" stroke="#2b3545"/><text x="550" y="56" font-weight="800">JM ESTATE / ECO</text><text x="550" y="77" font-size="12" fill="#94a3b8">source field</text>
    <rect x="390" y="132" width="320" height="74" rx="22" fill="#151e2a" stroke="url(#g)"/><text x="550" y="163" font-weight="900">CENTRAL SWITCHBOARD</text><text x="550" y="185" font-size="12" fill="#94a3b8">master routing / branch index</text>
    <rect x="410" y="248" width="280" height="66" rx="20" fill="#151e2a" stroke="#2b3545"/><text x="550" y="278" font-weight="800">ROOTRAILS</text><text x="550" y="299" font-size="12" fill="#94a3b8">shared route layers</text>
    <rect x="70" y="356" width="220" height="74" rx="22" fill="#111822" stroke="#2b3545"/><text x="180" y="388" font-weight="800">FLOWTALK</text><text x="180" y="410" font-size="12" fill="#94a3b8">readable route</text>
    <rect x="330" y="356" width="220" height="74" rx="22" fill="#111822" stroke="#2b3545"/><text x="440" y="388" font-weight="800">JM32-1DA</text><text x="440" y="410" font-size="12" fill="#94a3b8">governance</text>
    <rect x="590" y="356" width="220" height="74" rx="22" fill="#111822" stroke="#2b3545"/><text x="700" y="388" font-weight="800">HYDRAMAIL</text><text x="700" y="410" font-size="12" fill="#94a3b8">archive / receipt</text>
    <rect x="840" y="356" width="220" height="74" rx="22" fill="url(#g)"/><text x="950" y="388" fill="#07111d" font-weight="900">LIVEFORGE</text><text x="950" y="410" font-size="12" fill="#07111d">bench, not hub</text>
  </g>
  <g stroke="#79c0ff" stroke-width="3" fill="none" opacity=".8">
    <path d="M550 92 V132"/><path d="M550 206 V248"/><path d="M550 314 V340 H180 V356"/><path d="M550 314 V356"/><path d="M550 340 H700 V356"/><path d="M700 430 C760 480 890 480 950 430"/><path d="M440 430 C510 492 880 492 950 430"/><path d="M180 430 C280 504 850 504 950 430"/>
  </g>
</g>
</svg>`;
  setTab('dashboard');
}
window.addEventListener('DOMContentLoaded', init);
