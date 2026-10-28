/* JM CAPABILITY ENVIRONMENT RUNTIME v0.1
 * Four environments; shared packet/state spine; human-scale room navigation.
 */
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cfg=window.JM_ENV_CONFIG;if(!cfg)throw new Error('JM_ENV_CONFIG missing');
const spine=window.JMAppsToolsSpine;if(!spine)throw new Error('JMAppsToolsSpine missing');
let sourceHold=null;
let state;
try{state=spine.loadState(cfg.id,{rooms:{},active:cfg.rooms[0]?.id||null})}
catch(error){sourceHold=error;state={rooms:{},active:cfg.rooms[0]?.id||null}}
const $=s=>document.querySelector(s);
function roomState(id){return state.rooms[id]||{}}
function status(message,bad=false){
  const node=$('#continuityStatus');
  if(node){node.textContent=message;node.dataset.state=bad?'HOLD':'SAVED'}
}
function commit(change){
  if(sourceHold)throw new Error('PROTECTED_EXISTING_STATE_HOLD: '+sourceHold.message);
  const next=structuredClone(state);
  change(next);
  spine.saveState(cfg.id,next);
  state=next;
  status('Saved to this device and read back · export for another device');
  return true;
}
function safeCommit(change){
  try{return commit(change)}
  catch(error){status('SAVE HOLD: '+error.message+'. Existing stored source preserved.',true);return false}
}
function renderNav(){const box=$('#rooms');box.innerHTML=cfg.rooms.map(r=>`<button class="roomtab ${state.active===r.id?'on':''}" data-room="${esc(r.id)}"><b>${esc(r.label)}</b><span>${esc(r.intent)}</span></button>`).join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(safeCommit(next=>{next.active=b.dataset.room}))render()})}
function renderRoom(){const r=cfg.rooms.find(x=>x.id===state.active)||cfg.rooms[0];const rs=roomState(r.id);const fields=(r.fields||[]).map(f=>`<label><span>${esc(f.label)}</span>${f.type==='textarea'?`<textarea data-field="${esc(f.id)}" placeholder="${esc(f.placeholder||'')}">${esc(rs[f.id]||'')}</textarea>`:`<input data-field="${esc(f.id)}" value="${esc(rs[f.id]||'')}" placeholder="${esc(f.placeholder||'')}">`}</label>`).join('');
$('#room').innerHTML=`<div class="eyebrow">${esc(r.family||cfg.label)}</div><h2>${esc(r.label)}</h2><p class="intent">${esc(r.intent)}</p><div class="route">${esc(r.route)}</div><div class="fields">${fields}</div><div class="actions"><button id="primary" class="primary">${esc(r.action||'RUN')}</button><button id="clearRoom">CLEAR ROOM</button></div><div id="result" class="result">${rs._result?esc(rs._result):'Ready.'}</div><details><summary>DONOR / DETAILS</summary><div class="detail"><b>Donor:</b> ${esc(r.donor)}<br><b>Boundary:</b> Integrated room preserves the donor capability and shared packet route; it does not erase or retroactively replace the standalone donor body.</div></details>`;
$('#room').querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{
  safeCommit(next=>{next.rooms[r.id] ||= {};next.rooms[r.id][el.dataset.field]=el.value});
});
$('#primary').onclick=()=>runRoom(r,roomState(r.id));
$('#clearRoom').onclick=()=>{if(safeCommit(next=>{next.rooms[r.id]={}}))renderRoom()};
}
function runRoom(r,rs){
  if(sourceHold){status('RUN HOLD: stored source unreadable. Existing data preserved.',true);return}
  const payload={};for(const f of r.fields||[])payload[f.id]=rs[f.id]||'';
  payload.route=r.route;payload.environment=cfg.label;payload.room=r.label;
  let p;
  try{p=spine.emit(r.kind||'capability.'+r.id,cfg.label+' / '+r.label,payload,{environment:cfg.id,room:r.id,donor:r.donor})}
  catch(error){status('PACKET HOLD: '+error.message+'. No new packet committed.',true);return}
  const result='Packet '+p.id+' created · '+(r.next||'ready for next contact');
  if(safeCommit(next=>{next.rooms[r.id] ||= {};next.rooms[r.id]._result=result}))$('#result').textContent=result;
  else $('#result').textContent='Packet '+p.id+' stored in bus; room result persistence HOLD. Export bus before recovery.';
  renderBus();
}
function renderBus(){
  try{
    const rows=spine.read().filter(p=>p?.meta?.environment===cfg.id||p?.source?.startsWith(cfg.label)).slice(0,10);
    $('#bus').innerHTML=rows.length?rows.map(p=>'<article><b>'+esc(p.kind)+'</b><span>'+esc(p.source)+'</span><small>'+esc(p.id)+' · '+esc(p.created_at)+'</small></article>').join(''):'<p class="muted">No packets in this environment yet.</p>';
  }catch(error){
    $('#bus').textContent='BUS HOLD: '+error.message+'. Existing stored packets were not cleared.';
    status('BUS HOLD: '+error.message,true);
  }
}
function render(){renderNav();renderRoom();renderBus();$('#envTitle').textContent=cfg.label;$('#envSub').textContent=cfg.subtitle;}
function installPortableControls(){
  const bar=$('.toolbar');if(!bar)return;
  const statusNode=document.createElement('p');statusNode.id='continuityStatus';statusNode.setAttribute('role','status');statusNode.setAttribute('aria-live','polite');statusNode.style.cssText='width:100%;font-size:.82rem;line-height:1.45';
  bar.after(statusNode);
  status(sourceHold?'HOLD: existing saved source unreadable ('+sourceHold.message+'). No overwrite permitted.':'Device-local source ready · export for cross-device recovery',!!sourceHold);
  const exp=document.createElement('button');exp.textContent='EXPORT ENVIRONMENT';
  exp.onclick=()=>{try{spine.download('JM_'+cfg.id.toUpperCase()+'_PORTABLE_'+Date.now()+'.json',spine.exportEnvironment(cfg.id));status('Portable environment export requested; keep the file for recovery')}catch(error){status('EXPORT HOLD: '+error.message,true)}};const imp=document.createElement('button');imp.textContent='IMPORT ENVIRONMENT';const picker=document.createElement('input');picker.type='file';picker.accept='application/json';picker.hidden=true;imp.onclick=()=>picker.click();picker.onchange=async()=>{const f=picker.files?.[0];if(!f)return;try{const obj=await spine.readFile(f);const result=spine.importEnvironment(cfg.id,obj);state=result.state;sourceHold=null;render();status('Imported, saved and re-read '+result.packets+' incoming packets · '+result.mergedPackets+' shared packets preserved');alert('Environment restored · '+result.packets+' incoming packet(s), '+result.mergedPackets+' shared packets held')}catch(err){alert(`Import stopped: ${err.message||err}`)}finally{picker.value=''}};bar.append(exp,imp,picker)}
window.JMAppsToolsEnvironment={get state(){return structuredClone(state)},get sourceHold(){return sourceHold?.message||null}};
window.addEventListener('jm:packet',renderBus);window.addEventListener('jm:bus-cleared',renderBus);window.addEventListener('jm:bus-imported',renderBus);
document.addEventListener('DOMContentLoaded',()=>{render();installPortableControls();$('#exportBus').onclick=()=>spine.download(`JM_${cfg.id.toUpperCase()}_BUS_${Date.now()}.json`,spine.exportBus());$('#clearBus').onclick=()=>{if(confirm('Clear the shared local packet bus? Donor files are untouched.'))spine.clear()}});
})();