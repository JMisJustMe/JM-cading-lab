// JM Sovereign Ten / native-core-derived primitives used by this app.
class NativeError extends Error { constructor(code,message,details={}){super(message);this.name='NativeError';this.code=code;this.details=details;} }
function nativeNeed(condition,code,message,details={}){if(!condition)throw new NativeError(code,message,details)}
function nativeStable(value){if(Array.isArray(value))return `[${value.map(nativeStable).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${nativeStable(value[key])}`).join(',')}}`;return JSON.stringify(value)}
function nativeDigest(value){const text=typeof value==='string'?value:nativeStable(value);let hash=0xcbf29ce484222325n;for(let i=0;i<text.length;i+=1){hash^=BigInt(text.charCodeAt(i));hash=BigInt.asUintN(64,hash*0x100000001b3n)}return hash.toString(16).padStart(16,'0')}
class NativeTrace{constructor(body){this.body=body;this.events=[]}emit(type,payload={}){const event={index:this.events.length,body:this.body,type,payload};event.digest=nativeDigest(event);this.events.push(event);return event}receipt(claim,result){return {schema:'jm.native.receipt/1.0',body:this.body,claim,eventCount:this.events.length,traceDigest:nativeDigest(this.events),resultDigest:nativeDigest(result)}}}
const nativeTrace=new NativeTrace('JM Estate Live Registry App v0.2');

const SEED=window.JM_REGISTRY_SEED;

const KEY='jm-estate-live-registry-app-v0.2';
let records=load(); let editing=null;
function load(){try{const x=localStorage.getItem(KEY);return x?JSON.parse(x):structuredClone(SEED)}catch(e){return JSON.parse(JSON.stringify(SEED))}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(records));nativeTrace.emit('registry.saved',{count:records.length,digest:nativeDigest(records)})}catch(e){nativeTrace.emit('registry.save.failed',{message:e.message})}}
const $=s=>document.querySelector(s);
const esc=s=>(s??'').toString().replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function arr(v){return (v||'').split(',').map(x=>x.trim()).filter(Boolean)}
function uniq(vals){return [...new Set(vals.filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function cls(s){s=(s||'').toLowerCase();return s.includes('frozen')?'frozen':s.includes('active')?'active':s.includes('proven')||s.includes('complete')?'proven':'open'}
function populateFilters(){
 const f=$('#familyFilter'),st=$('#statusFilter'),sf=$('#surfaceFilter'); const fv=f.value,sv=st.value,surfv=sf.value;
 f.innerHTML='<option value="">All families</option>'+uniq(records.map(r=>r.family)).map(x=>`<option>${esc(x)}</option>`).join('');
 st.innerHTML='<option value="">All statuses</option>'+uniq(records.map(r=>r.status)).map(x=>`<option>${esc(x)}</option>`).join('');
 sf.innerHTML='<option value="">All surfaces</option>'+uniq(records.flatMap(r=>arr(r.surfaces))).map(x=>`<option>${esc(x)}</option>`).join('');
 f.value=fv;st.value=sv;sf.value=surfv;
}
function filtered(){const q=$('#search').value.trim().toLowerCase(),f=$('#familyFilter').value,st=$('#statusFilter').value,sf=$('#surfaceFilter').value;
 return records.filter(r=>{const blob=Object.values(r).join(' ').toLowerCase();return (!q||blob.includes(q))&&(!f||r.family===f)&&(!st||r.status===st)&&(!sf||arr(r.surfaces).includes(sf));});}
function render(){populateFilters(); const items=filtered();
 const frozen=records.filter(r=>/frozen/i.test(r.status)).length, active=records.filter(r=>/active/i.test(r.status)).length, proven=records.filter(r=>/proven|complete/i.test(r.status)).length, open=records.filter(r=>/open|planned/i.test(r.status)).length;
 const issues=auditRecords(false).length;
 $('#stats').innerHTML=[['Bodies',records.length],['Active',active],['Frozen',frozen],['Proven/Complete',proven],['Open',open],['Audit issues',issues]].map(([a,b])=>`<div class="stat"><b>${b}</b><span>${a}</span></div>`).join('');
 $('#grid').innerHTML=items.length?items.map(r=>`<article class="card">
 <div class="card-actions"><button class="icon" onclick="editRecord('${esc(r.id)}')">Edit</button><button class="icon" onclick="removeRecord('${esc(r.id)}')">×</button></div>
 <h3>${esc(r.name)}</h3><div class="meta">${esc(r.family)} · ${esc(r.keeper||'No keeper recorded')}</div>
 <span class="pill ${cls(r.status)}">${esc(r.status)}</span>${arr(r.surfaces).slice(0,4).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}
 <div class="row"><label>Parent</label><div>${esc(r.parent)||'—'}</div></div>
 <div class="row"><label>Donors</label><div>${esc(r.donors)||'—'}</div></div>
 <div class="row"><label>Runtime</label><div>${esc(r.runtime)||'—'}</div></div>
 <div class="row"><label>Proof</label><div>${esc(r.proof)||'—'}</div></div>
 <div class="row"><label>Hash</label><div style="word-break:break-all">${esc(r.hash)||'—'}</div></div>
 <div class="row"><label>Location</label><div>${esc(r.location)||'—'}</div></div>
 <div class="next"><strong>Next:</strong> ${esc(r.next)||'No next action recorded.'}</div>
 </article>`).join(''):`<div class="empty">No Estate bodies match these filters.</div>`;
 save();}

function auditRecords(emit=true){
 const issues=[];
 const ids=new Set();
 for(const r of records){
  try{nativeNeed(r.id,'REG_ID','Record is missing id',{record:r.name});nativeNeed(!ids.has(r.id),'REG_DUP_ID','Duplicate registry id',{id:r.id});ids.add(r.id);nativeNeed(r.name&&r.family,'REG_IDENTITY','Body requires name and family',{id:r.id});nativeNeed(r.status,'REG_STATUS','Body requires status',{id:r.id});nativeNeed(r.next,'REG_NEXT','Body requires next action',{id:r.id});
   if(/frozen/i.test(r.status)){nativeNeed(r.proof,'REG_FROZEN_PROOF','Frozen body requires proof',{id:r.id});nativeNeed(r.location,'REG_FROZEN_MOUNT','Frozen body requires mount/location',{id:r.id});}
   if(r.hash)nativeNeed(/^[a-f0-9]{16}$|^[a-f0-9]{64}$/i.test(r.hash),'REG_HASH','Hash must be JM native 64-bit digest or SHA-256',{id:r.id,hash:r.hash});
  }catch(error){issues.push({id:r.id||null,name:r.name||null,code:error.code||error.name,message:error.message});}
 }
 if(emit)nativeTrace.emit('audit.completed',{recordCount:records.length,issueCount:issues.length,registryDigest:nativeDigest(records)});
 return issues;
}
function nativeReceipt(){const issues=auditRecords(true);const result={version:'0.2',parentSha256:'ae72073716b6be2bbe9897103625b04b48a9a6561a5db7a4e910e91f9cb49121',recordCount:records.length,registryDigest:nativeDigest(records),issues};return {...nativeTrace.receipt('audit Estate registry circulation',result),generatedAt:new Date().toISOString(),result,trace:nativeTrace.events.slice()};}
function downloadJson(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}

function openModal(rec){editing=rec?.id||null; $('#modalTitle').textContent=rec?'Edit Estate body':'Add Estate body'; const form=$('#bodyForm'); form.reset(); if(rec){for(const [k,v] of Object.entries(rec)){if(form.elements[k])form.elements[k].value=v||'';}} $('#modal').classList.add('show');}
function closeModal(){$('#modal').classList.remove('show');editing=null;}
window.editRecord=id=>openModal(records.find(r=>r.id===id));
window.removeRecord=id=>{const r=records.find(x=>x.id===id); if(confirm(`Remove registry record “${r?.name||id}”? This does not delete the underlying Estate body.`)){records=records.filter(x=>x.id!==id);render();}}
$('#addBtn').onclick=()=>openModal(); $('#cancelBtn').onclick=closeModal; $('#modal').onclick=e=>{if(e.target.id==='modal')closeModal();};
$('#bodyForm').onsubmit=e=>{e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries()); nativeTrace.emit('record.write.requested',{editing:editing||null,name:data.name}); if(editing){const i=records.findIndex(r=>r.id===editing);records[i]={...records[i],...data};}else{data.id='jm-'+Date.now().toString(36);records.unshift(data);} closeModal();render();};
['search','familyFilter','statusFilter','surfaceFilter'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',render));
$('#exportBtn').onclick=()=>{nativeTrace.emit('registry.exported',{count:records.length,digest:nativeDigest(records)});const blob=new Blob([JSON.stringify({format:'JM_ESTATE_LIVE_REGISTRY',version:'0.2',nativeSchema:'jm.native.receipt/1.0',exportedAt:new Date().toISOString(),registryDigest:nativeDigest(records),records},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='JM_ESTATE_LIVE_REGISTRY_APP_v0.2_EXPORT.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);};
$('#importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());const incoming=Array.isArray(parsed)?parsed:parsed.records;if(!Array.isArray(incoming))throw new Error('No records array');if(confirm(`Import ${incoming.length} records? This replaces the current registry view, not the underlying Estate files.`)){records=incoming;nativeTrace.emit('registry.imported',{count:records.length,digest:nativeDigest(records)});render();}}catch(err){alert('Import failed: '+err.message);}e.target.value='';};
$('#resetBtn').onclick=()=>{if(confirm('Reset the registry to the v0.1 seed census?')){records=structuredClone(SEED);nativeTrace.emit('registry.seed.reset',{count:records.length});render();}};
let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').hidden=false;});
$('#installBtn').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();const choice=await deferredInstall.userChoice;nativeTrace.emit('pwa.install.prompt',{outcome:choice.outcome});deferredInstall=null;$('#installBtn').hidden=true;};
$('#auditBtn').onclick=()=>{const issues=auditRecords(true);$('#nativeRail').textContent=issues.length?`Native audit: ${issues.length} issue(s) · ${issues.map(x=>x.code).join(', ')}`:`Native audit PASS · ${records.length} bodies · registry digest ${nativeDigest(records)}`;render();};
$('#receiptBtn').onclick=()=>downloadJson('JM_ESTATE_LIVE_REGISTRY_APP_v0.2_NATIVE_RECEIPT.json',nativeReceipt());
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js').then(()=>nativeTrace.emit('pwa.serviceworker.registered')).catch(e=>nativeTrace.emit('pwa.serviceworker.failed',{message:e.message}));}
nativeTrace.emit('app.boot',{version:'0.2',parentSha256:'ae72073716b6be2bbe9897103625b04b48a9a6561a5db7a4e910e91f9cb49121',seedCount:records.length});
render();
