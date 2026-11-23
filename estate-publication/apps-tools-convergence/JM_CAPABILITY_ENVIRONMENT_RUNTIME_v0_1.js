/* JM CAPABILITY ENVIRONMENT RUNTIME v0.1
 * Four environments; shared packet/state spine; human-scale room navigation.
 */
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cfg=window.JM_ENV_CONFIG;if(!cfg)throw new Error('JM_ENV_CONFIG missing');
const spine=window.JMAppsToolsSpine;if(!spine)throw new Error('JMAppsToolsSpine missing');
let sourceHold=null;
let busHold=null;
let rawRecoveryButton=null;
let state;
let unsavedRoomInput=false;
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
// One failed field cannot become a seemingly successful packet. Persist the ENTIRE
// visible room together; a later field save must not hide an earlier failed field.
function liveRoomFields(){
  return Array.from($('#room').querySelectorAll('[data-field]'),el=>[el.dataset.field,el.value]);
}
function persistVisibleRoom(r){
  const fields=liveRoomFields();
  const saved=safeCommit(next=>{
    next.rooms[r.id] ||= {};
    for(const [field,value] of fields)next.rooms[r.id][field]=value;
  });
  unsavedRoomInput=!saved;
  return saved;
}
function renderNav(){const box=$('#rooms');box.innerHTML=cfg.rooms.map(r=>`<button class="roomtab ${state.active===r.id?'on':''}" data-room="${esc(r.id)}"><b>${esc(r.label)}</b><span>${esc(r.intent)}</span></button>`).join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(unsavedRoomInput){status('NAVIGATION HOLD: there are unsaved visible fields. Retry saving or copy your draft before leaving this room.',true);return}if(safeCommit(next=>{next.active=b.dataset.room}))render()})}
function renderRoom(){const r=cfg.rooms.find(x=>x.id===state.active)||cfg.rooms[0];const rs=roomState(r.id);const fields=(r.fields||[]).map(f=>`<label><span>${esc(f.label)}</span>${f.type==='textarea'?`<textarea data-field="${esc(f.id)}" placeholder="${esc(f.placeholder||'')}">${esc(rs[f.id]||'')}</textarea>`:`<input data-field="${esc(f.id)}" value="${esc(rs[f.id]||'')}" placeholder="${esc(f.placeholder||'')}">`}</label>`).join('');
$('#room').innerHTML=`<div class="eyebrow">${esc(r.family||cfg.label)}</div><h2>${esc(r.label)}</h2><p class="intent">${esc(r.intent)}</p><div class="route">${esc(r.route)}</div><div class="fields">${fields}</div><div class="actions"><button id="primary" class="primary">${esc(r.action||'RUN')}</button><button id="clearRoom">CLEAR ROOM</button></div><div id="result" class="result">${rs._result?esc(rs._result):'Ready.'}</div><details><summary>DONOR / DETAILS</summary><div class="detail"><b>Donor:</b> ${esc(r.donor)}<br><b>Boundary:</b> Integrated room preserves the donor capability and shared packet route; it does not erase or retroactively replace the standalone donor body.</div></details>`;
$('#room').querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>persistVisibleRoom(r));
$('#primary').onclick=()=>runRoom(r);
$('#clearRoom').onclick=()=>{
  if(!window.confirm('Clear saved fields in '+r.label+'? This cannot be undone without a previous private environment export. Other rooms and packets will remain.')){
    status('Clear cancelled; saved room fields preserved.');return;
  }
  if(safeCommit(next=>{next.rooms[r.id]={}})){unsavedRoomInput=false;renderRoom()}
};
}
function runRoom(r){
  if(sourceHold){status('RUN HOLD: stored source unreadable. Existing data preserved.',true);return}
  const visible=liveRoomFields();
  const stored=roomState(r.id);
  const differs=visible.some(([id,value])=>String(stored[id]??'')!==value);
  if((unsavedRoomInput||differs)&&!persistVisibleRoom(r)){
    status('RUN HOLD: input was not saved; no packet was created. Copy your draft before leaving this page.',true);
    return;
  }
  const rs=roomState(r.id);
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
    busHold=null;
  }catch(error){
    busHold=error;
    $('#bus').textContent='BUS HOLD: '+error.message+'. Existing stored packets were not cleared.';
    status('BUS HOLD: '+error.message+'. Export raw recovery before any repair.',true);
  }
  if(rawRecoveryButton)rawRecoveryButton.hidden=!(sourceHold||busHold);
}
function render(){renderNav();renderRoom();renderBus();$('#envTitle').textContent=cfg.label;$('#envSub').textContent=cfg.subtitle;}
function installPortableControls(){
  const bar=$('.toolbar');if(!bar)return;
  const statusNode=document.createElement('p');statusNode.id='continuityStatus';statusNode.setAttribute('role','status');statusNode.setAttribute('aria-live','polite');statusNode.style.cssText='width:100%;font-size:.82rem;line-height:1.45';
  bar.after(statusNode);
  status(sourceHold?'HOLD: existing saved source unreadable ('+sourceHold.message+'). Export raw recovery before any repair.':busHold?'BUS HOLD: '+busHold.message+'. Export raw recovery before any repair.':'Device-local source ready · export for cross-device recovery',!!(sourceHold||busHold));
  rawRecoveryButton=document.createElement('button');
  rawRecoveryButton.type='button';
  rawRecoveryButton.textContent='EXPORT RAW RECOVERY';
  rawRecoveryButton.title='Read-only private export of the exact saved state and shared bus strings. Includes malformed data; NOT a normal import backup.';
  rawRecoveryButton.hidden=!(sourceHold||busHold);
  rawRecoveryButton.onclick=()=>{
    try{
      spine.download('JM_'+cfg.id.toUpperCase()+'_RAW_RECOVERY_'+Date.now()+'.json',spine.exportRawRecovery(cfg.id));
      status('PRIVATE RAW RECOVERY EXPORT REQUESTED: verify the downloaded file. Exact source strings retained; this did not repair or overwrite local storage.',true);
    }catch(error){status('RAW RECOVERY EXPORT HOLD: '+String(error.message||error)+'. Original stored bytes remain untouched.',true)}
  };
  bar.append(rawRecoveryButton);
  const exp=document.createElement('button');exp.textContent='EXPORT ENVIRONMENT';exp.title='Includes the entire shared packet bus across workrooms, which may contain private source or notes.';
  exp.onclick=()=>{try{spine.download('JM_'+cfg.id.toUpperCase()+'_PORTABLE_'+Date.now()+'.json',spine.exportEnvironment(cfg.id));status('PRIVATE EXPORT REQUESTED: check your Downloads before relying on it. JSON includes the shared bus across workrooms; keep it private.')}catch(error){status('EXPORT HOLD: '+error.message,true)}};const imp=document.createElement('button');imp.textContent='IMPORT ENVIRONMENT';const picker=document.createElement('input');picker.type='file';picker.accept='application/json';picker.hidden=true;imp.onclick=()=>picker.click();picker.onchange=async()=>{
    const f=picker.files?.[0];if(!f)return;
    try{
      if(f.size>5*1024*1024)throw new Error('IMPORT_FILE_TOO_LARGE_HOLD (5 MB maximum)');
      const obj=await spine.readFile(f);
      if(!obj||obj.schema!=='jm.apps.tools.portable-environment/1.0'||obj.environment!==cfg.id)
        throw new Error('ENVIRONMENT_ID_OR_SCHEMA_HOLD');
      if(!obj.state||!obj.state.rooms||typeof obj.state.rooms!=='object'||Array.isArray(obj.state.rooms)||!Array.isArray(obj.packets))
        throw new Error('ENVIRONMENT_SHAPE_HOLD');
      const roomCount=Object.keys(obj.state.rooms).length;
      const allow=window.confirm('RESTORE '+cfg.label+' from private JSON?\\n\\nThis replaces the saved fields and active room for THIS environment ('+roomCount+' recorded rooms). It also merges '+obj.packets.length+' imported packets into the shared bus, keeping existing packet IDs unless an identity conflict blocks the operation.\\n\\nAny newer unsaved/exported room data could be lost. Keep a backup before proceeding.\\n\\nRestore now?');
      if(!allow){status('Import cancelled. Existing environment and shared packets are unchanged.');return}
      const result=spine.importEnvironment(cfg.id,obj);
      state=result.state;sourceHold=null;unsavedRoomInput=false;render();
      status('Environment restored and read back · '+result.packets+' imported packet(s); '+result.mergedPackets+' total shared packets.');
    }catch(err){
      status('IMPORT HOLD: '+String(err.message||err)+'. No intentional overwrite of existing source.',true);
    }finally{picker.value=''}
  };bar.append(exp,imp,picker);
  // CP04: the exported packet bus has its own restore path, independent of room state.
  const busImport=document.createElement('button');
  busImport.type='button';
  busImport.textContent='IMPORT BUS';
  busImport.setAttribute('aria-label','Import Bus — merge exported packets while preserving existing saved packets');
  const busPicker=document.createElement('input');
  busPicker.type='file';busPicker.accept='application/json,.json';busPicker.hidden=true;
  busImport.onclick=()=>busPicker.click();
  busPicker.onchange=async()=>{
    const file=busPicker.files?.[0];if(!file)return;
    try{
      const result=spine.mergeBus(await spine.readFile(file));
      status('Imported '+result.added+' new shared packet(s), preserving '+result.preserved+' existing; '+result.total+' now stored and read back');
    }catch(error){
      status('BUS IMPORT HOLD: '+String(error.message||error)+'. Existing stored packets preserved.',true);
    }finally{busPicker.value=''}
  };
  bar.append(busImport,busPicker);
}
window.JMAppsToolsEnvironment={get state(){return structuredClone(state)},get sourceHold(){return sourceHold?.message||null}};
window.addEventListener('jm:packet',renderBus);window.addEventListener('jm:bus-cleared',renderBus);window.addEventListener('jm:bus-imported',renderBus);
document.addEventListener('DOMContentLoaded',()=>{render();installPortableControls();$('#exportBus').onclick=()=>spine.download(`JM_${cfg.id.toUpperCase()}_BUS_${Date.now()}.json`,spine.exportBus());$('#clearBus').onclick=()=>{if(confirm('Clear the shared local packet bus? Donor files are untouched.'))spine.clear()}});
})();