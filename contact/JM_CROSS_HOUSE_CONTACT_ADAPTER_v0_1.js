/* JM Cross-House Contact Adapter v0.1 — additive, non-authoritative.
 * Reuses jm.packet/1.0 and jm.apps.tools.shared.bus.v1; no game-save interception.
 * Created 2026-10-10. SOURCE -> HANDOFF -> RECEIPT; owner-device contact open.
 */
(()=>{
'use strict';
if(window.JMEstateHandoff) return;
const schema='jm.packet/1.0', bridge='JM.CrossHouseHandoff/0.1', busKey='jm.apps.tools.shared.bus.v1';
const places=[
  {id:'games-house',label:'Games & Beyond',path:'games-beyond/'},
  {id:'lyrics',label:'Lyrics & Music',path:'lyrics/'},
  {id:'apps-tools',label:'Apps & Tools Convergence',path:'estate-publication/apps-tools-convergence/'}
];
const current=(document.body.dataset.ecostateSurface==='lyrics'||location.pathname.includes('/lyrics/'))?'lyrics':
 location.pathname.includes('/games-beyond/')?'games-house':
 location.pathname.includes('/apps-tools-convergence/')?'apps-tools':'access';
const root=(()=>{const base=document.querySelector('script[src$="JM_CROSS_HOUSE_CONTACT_ADAPTER_v0_1.js"]')?.src;if(!base)return location.origin+'/';return new URL('../',base).href})();
const safe=(v,n)=>String(v??'').trim().slice(0,n);
const read=()=>{try{const o=JSON.parse(localStorage.getItem(busKey)||'[]');return Array.isArray(o)?o:[]}catch{return []}};
const save=(list)=>{if(list.length>250)throw Error('Shared packet bus is full (250); existing entries were not replaced');localStorage.setItem(busKey,JSON.stringify(list));window.dispatchEvent(new Event('jm:handoff-updated'))};
const uuid=()=>('JM-HO-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
const packet=(kind,payload,source=current)=>({schema,id:uuid(),created_at:new Date().toISOString(),kind,source,payload,meta:{bridge,proof:'local-packet-persisted-only'}});
const emit=(p)=>{save([p,...read().filter(x=>x?.id!==p.id)]);window.dispatchEvent(new CustomEvent('jm:packet',{detail:p}));return p};
function handoff(target,subject,note='',source=current){
  if(!places.some(p=>p.id===target)||target===source)throw Error('Choose a different valid destination');
  subject=safe(subject,120);if(!subject)throw Error('A subject is required');
  return emit(packet('estate.handoff',{target,subject,note:safe(note,2000)},safe(source,60)));
}
function acknowledge(id,receiver=current){
  const found=read().find(x=>x?.id===id&&x?.kind==='estate.handoff'&&x?.payload?.target===receiver);
  if(!found)throw Error('No matching incoming handoff');
  const existing=read().find(x=>x?.kind==='estate.handoff.ack'&&x.payload?.handoff_id===id&&x.source===receiver);
  return existing||emit(packet('estate.handoff.ack',{handoff_id:id,target:found.source,subject:found.payload.subject},receiver));
}
function inbox(receiver=current){
  const rows=read(),ack=new Set(rows.filter(x=>x?.kind==='estate.handoff.ack').map(x=>x.payload?.handoff_id));
  return rows.filter(x=>x?.schema===schema&&x.kind==='estate.handoff'&&x.payload?.target===receiver).map(x=>({...x,acknowledged:ack.has(x.id)}));
}
function exportPack(){
  const packets=read().filter(x=>x?.meta?.bridge===bridge&&['estate.handoff','estate.handoff.ack'].includes(x.kind));
  return {schema:'jm.ecostate.cross-house-portable/1.0',exported_at:new Date().toISOString(),packets};
}
function importPack(o){
  if(!o||o.schema!=='jm.ecostate.cross-house-portable/1.0'||!Array.isArray(o.packets)||o.packets.length>250)
    throw Error('This is not a JM cross-house portable packet');
  const valid=o.packets.filter(x=>x&&x.schema===schema&&x.meta?.bridge===bridge&&
    typeof x.id==='string'&&x.id.length<128&&
    ['estate.handoff','estate.handoff.ack'].includes(x.kind)&&typeof x.source==='string'&&
    x.payload&&typeof x.payload==='object'&&Object.keys(x.payload).length<=8);
  if(valid.length!==o.packets.length)throw Error('Packet failed integrity/shape checks; nothing imported');
  const old=read(),seen=new Set(old.map(x=>x.id));const fresh=valid.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true});
  save([...fresh,...old]);return fresh.length;
}
const api={schema:bridge,read,inbox,handoff,acknowledge,exportPack,importPack,places,current};
Object.defineProperty(window,'JMEstateHandoff',{value:api,configurable:false});
function download(){
  const blob=new Blob([JSON.stringify(exportPack(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='JM_CROSS_HOUSE_PACKET_TRANSFER.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function mount(){
 const style=document.createElement('style');style.textContent=`
 .jmch-toggle{position:fixed;z-index:990;top:83px;right:12px;background:#16283a;color:#fff;border:1px solid #7cecff;border-radius:999px;padding:9px 12px;font:800 12px system-ui;cursor:pointer;box-shadow:0 7px 25px #0008}
 .jmch-panel{position:fixed;z-index:991;top:128px;right:10px;width:min(390px,calc(100vw - 20px));max-height:calc(100dvh - 144px);overflow:auto;background:#0c1724;color:#f3f8fc;border:1px solid #7cecff66;border-radius:16px;box-shadow:0 15px 60px #000c;font:14px/1.45 system-ui;padding:15px}
 .jmch-panel[hidden]{display:none}.jmch-panel h2{font-size:19px;margin:0 0 5px}.jmch-panel p{font-size:12px;color:#b5cad7;margin:5px 0 12px}
 .jmch-panel label{display:block;font-size:12px;font-weight:750;margin:9px 0 4px}
 .jmch-panel input,.jmch-panel textarea,.jmch-panel select{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #46627d;border-radius:8px;background:#07111d;color:white;font:14px system-ui}
 .jmch-panel textarea{resize:vertical;min-height:68px}.jmch-panel button,.jmch-panel .jmch-link{padding:9px 11px;background:#102f40;color:#eaffff;border:1px solid #5085a2;border-radius:9px;cursor:pointer;text-decoration:none;font:750 12px system-ui}
 .jmch-panel .jmch-actions{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0}.jmch-panel .jmch-in{border-top:1px solid #345; padding:9px 0}
 .jmch-panel .jmch-in small{color:#aab;display:block}.jmch-panel .jmch-status{min-height:20px;color:#95f5be;overflow-wrap:anywhere}
 @media(max-width:430px){.jmch-toggle{top:76px;font-size:11px}.jmch-panel{top:116px;max-height:calc(100dvh - 129px)}}
 `;document.head.append(style);
 const toggle=document.createElement('button');toggle.className='jmch-toggle';toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.textContent='JM ↔ CONTACT';document.body.append(toggle);
 const panel=document.createElement('section');panel.className='jmch-panel';panel.hidden=true;panel.setAttribute('aria-label','JM cross-house contact');document.body.append(panel);
 const make=(tag,txt,parent)=>{const el=document.createElement(tag);if(txt)el.textContent=txt;parent.append(el);return el};
 const head=make('h2','Cross-house contact',panel),intro=make('p','Shared jm.packet/1.0 bus · local to this browser. Each House stays sovereign.',panel);
 const targetLabel=make('label','Send to',panel),dest=make('select','',panel);dest.setAttribute('aria-label','Destination');
 for(const place of places.filter(x=>x.id!==current)){const o=make('option',place.label,dest);o.value=place.id}
 make('label','What is moving?',panel);const subject=make('input','',panel);subject.maxLength=120;subject.placeholder='Source / purpose / work';
 make('label','Context, evidence or next action',panel);const note=make('textarea','',panel);note.maxLength=2000;note.placeholder='Context only; no automatic game-save extraction';
 const buttons=make('div','',panel);buttons.className='jmch-actions';const send=make('button','Send packet',buttons);
 const exp=make('button','Export phone ↔ laptop',buttons),imp=make('button','Import transfer',buttons);
 const go=make('a','Open destination',buttons);go.className='jmch-link';go.href=new URL(dest.value==='games-house'?'games-beyond/':dest.value==='lyrics'?'lyrics/':'estate-publication/apps-tools-convergence/',root).href;
 dest.onchange=()=>{const p=places.find(x=>x.id===dest.value);go.href=new URL(p.path,root).href};
 const file=make('input','',panel);file.type='file';file.accept='.json,application/json';file.hidden=true;
 const status=make('div','',panel);status.className='jmch-status';status.setAttribute('role','status');
 const inboxTitle=make('h2','Incoming handoffs',panel),incoming=make('div','',panel);
 const report=(s,error=false)=>{status.style.color=error?'#ff9cb0':'#95f5be';status.textContent=s};
 const render=()=>{incoming.replaceChildren();const entries=inbox();if(!entries.length){make('p','No incoming packets for this House yet.',incoming);return}
   for(const p of entries.slice(0,20)){const row=make('div','',incoming);row.className='jmch-in';make('b',safe(p.payload.subject,120),row);make('small','From '+safe(p.source,70)+' · '+safe(p.created_at,30),row);make('p',safe(p.payload.note,2000),row);
     const ack=make('button',p.acknowledged?'Receipt recorded':'Acknowledge receipt',row);ack.disabled=p.acknowledged;ack.onclick=()=>{try{acknowledge(p.id);render();report('Receipt recorded in shared packet bus')}catch(e){report(e.message,true)}}}}
 };
 send.onclick=()=>{try{const p=handoff(dest.value,subject.value,note.value);render();report('Local handoff '+p.id+' saved. Open the destination to receive it.')}catch(e){report(e.message,true)}};
 exp.onclick=()=>{try{download();report('Portable packet file generated (manual device transfer).')}catch(e){report(e.message,true)}};
 imp.onclick=()=>file.click();file.onchange=async()=>{try{const f=file.files?.[0];if(!f)return;if(f.size>500000)throw Error('Transfer exceeds 500 KB');const count=importPack(JSON.parse(await f.text()));render();report(count+' packets added; existing bus entries retained.')}catch(e){report(e.message,true)}finally{file.value=''}};
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)render()};
 window.addEventListener('storage',e=>{if(e.key===busKey&&!panel.hidden)render()});
 window.addEventListener('jm:handoff-updated',()=>{if(!panel.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();