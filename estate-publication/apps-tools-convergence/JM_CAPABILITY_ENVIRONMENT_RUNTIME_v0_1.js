/* JM CAPABILITY ENVIRONMENT RUNTIME v0.1
 * Four environments; shared packet/state spine; human-scale room navigation.
 */
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cfg=window.JM_ENV_CONFIG;if(!cfg)throw new Error('JM_ENV_CONFIG missing');
const spine=window.JMAppsToolsSpine;if(!spine)throw new Error('JMAppsToolsSpine missing');
let state=spine.loadState(cfg.id,{rooms:{},active:cfg.rooms[0]?.id||null});
const $=s=>document.querySelector(s);
function roomState(id){return state.rooms[id]||(state.rooms[id]={})}
function save(){spine.saveState(cfg.id,state)}
function renderNav(){const box=$('#rooms');box.innerHTML=cfg.rooms.map(r=>`<button class="roomtab ${state.active===r.id?'on':''}" data-room="${esc(r.id)}"><b>${esc(r.label)}</b><span>${esc(r.intent)}</span></button>`).join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.active=b.dataset.room;save();render()})}
function renderRoom(){const r=cfg.rooms.find(x=>x.id===state.active)||cfg.rooms[0];state.active=r.id;const rs=roomState(r.id);const fields=(r.fields||[]).map(f=>`<label><span>${esc(f.label)}</span>${f.type==='textarea'?`<textarea data-field="${esc(f.id)}" placeholder="${esc(f.placeholder||'')}">${esc(rs[f.id]||'')}</textarea>`:`<input data-field="${esc(f.id)}" value="${esc(rs[f.id]||'')}" placeholder="${esc(f.placeholder||'')}">`}</label>`).join('');
$('#room').innerHTML=`<div class="eyebrow">${esc(r.family||cfg.label)}</div><h2>${esc(r.label)}</h2><p class="intent">${esc(r.intent)}</p><div class="route">${esc(r.route)}</div><div class="fields">${fields}</div><div class="actions"><button id="primary" class="primary">${esc(r.action||'RUN')}</button><button id="clearRoom">CLEAR ROOM</button></div><div id="result" class="result">${rs._result?esc(rs._result):'Ready.'}</div><details><summary>DONOR / DETAILS</summary><div class="detail"><b>Donor:</b> ${esc(r.donor)}<br><b>Boundary:</b> Integrated room preserves the donor capability and shared packet route; it does not erase or retroactively replace the standalone donor body.</div></details>`;
$('#room').querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{rs[el.dataset.field]=el.value;save()});
$('#primary').onclick=()=>runRoom(r,rs);$('#clearRoom').onclick=()=>{state.rooms[r.id]={};save();renderRoom()};
}
function runRoom(r,rs){const payload={};for(const f of r.fields||[])payload[f.id]=rs[f.id]||'';payload.route=r.route;payload.environment=cfg.label;payload.room=r.label;const p=spine.emit(r.kind||`capability.${r.id}`,`${cfg.label} / ${r.label}`,payload,{environment:cfg.id,room:r.id,donor:r.donor});rs._result=`Packet ${p.id} created · ${r.next||'ready for next contact'}`;save();$('#result').textContent=rs._result;renderBus();}
function renderBus(){const rows=spine.read().filter(p=>p?.meta?.environment===cfg.id||p?.source?.startsWith(cfg.label)).slice(0,10);$('#bus').innerHTML=rows.length?rows.map(p=>`<article><b>${esc(p.kind)}</b><span>${esc(p.source)}</span><small>${esc(p.id)} · ${esc(p.created_at)}</small></article>`).join(''):'<p class="muted">No packets in this environment yet.</p>'}
function render(){renderNav();renderRoom();renderBus();$('#envTitle').textContent=cfg.label;$('#envSub').textContent=cfg.subtitle;}
window.addEventListener('jm:packet',renderBus);window.addEventListener('jm:bus-cleared',renderBus);
document.addEventListener('DOMContentLoaded',()=>{render();$('#exportBus').onclick=()=>spine.download(`JM_${cfg.id.toUpperCase()}_BUS_${Date.now()}.json`,spine.exportBus());$('#clearBus').onclick=()=>{if(confirm('Clear the shared local packet bus? Donor files are untouched.'))spine.clear()}});
})();