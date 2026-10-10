/* JM Target Bridge — GameCore Aiming Run exact-body RouteOS recipient 0.1
  Own source executes inside RouteOS, no gameplay clone / no generic Seed Runner.
  Only completed-track progress, selected/unlocked track and tuning are portable.
*/
(()=>{
'use strict';
if(window.JMAimingRouteOS)return;
const ID='jm.gamecore.aiming-run-v0-1a',BLOB='d737b7a05eeed657fbe3934a1e16d65c23cf9e61';
const ROUTE='../../bodies/aiming-run-v0-1a.html',SLOT='jm.routeos.gamecore.aiming-run.progress.v1';
const SCHEMA='JM.GameCore.RouteOSProgress/0.1',BUNDLE='jm.routeos.gamecore.aiming-run-transfer/0.1';
const KIND='jm.routeos.gamecore.aiming-run.progress';
const TRACKS=['moving-target','vertical-drift','pressure-lane','split-window','run-relay'];
const KEYS=['shotForce','gravity','runSpeed','targetMotion','routeGuide','haptics','sound','highContrast'];
const clone=x=>JSON.parse(JSON.stringify(x)),obj=x=>x&&typeof x==='object'&&!Array.isArray(x),num=x=>typeof x==='number'&&Number.isFinite(x);
let overlay,frame,status,proved=false,ready=false,sourceSize=0;
const url=()=>new URL(ROUTE,document.baseURI);
const bus=()=>{const a=window.JMAppsToolsSpine;if(!a||!a.send)throw Error('JM shared packet spine unavailable');return a};
const host=()=>{const a=window.JMRouteOSHostPort;if(!a||!a.signal)throw Error('RouteOS native receipt port missing');return a};
const report=(s,bad=false)=>{if(status){status.textContent=s;status.style.color=bad?'#ff91a9':'#90f2b1'}};
const game=()=>{const a=frame?.contentWindow?.AimingRun;if(!ready||!proved||!a)throw Error('The exact GameCore source is not running');return a};
async function verify(){
 const r=await fetch(url(),{cache:'no-store'});if(!r.ok)throw Error('Exact Aiming Run source unavailable');
 const b=new Uint8Array(await r.arrayBuffer()),h=new TextEncoder().encode('blob '+b.byteLength+'\0'),payload=new Uint8Array(h.length+b.length);
 payload.set(h);payload.set(b,h.length);
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-1',payload));
 const sha=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(sha!==BLOB)throw Error('SOURCE HOLD: GameCore source no longer matches the exact Git blob');
 proved=true;sourceSize=b.byteLength;return sha;
}
function valid(p){
 if(!obj(p)||p.schema!==SCHEMA||p.id!==ID||p.source_blob!==BLOB||
 !Number.isInteger(p.track)||p.track<0||p.track>4||
 !Number.isInteger(p.unlocked)||p.unlocked<1||p.unlocked>5||p.track>=p.unlocked||
 !obj(p.completed)||!obj(p.tuning)||Object.keys(p.completed).some(k=>!TRACKS.includes(k)))return false;
 for(const v of Object.values(p.completed))if(!obj(v)||!num(v.hits)||!num(v.score)||!num(v.shots)||v.shots<v.hits||typeof v.time!=='string'||v.time.length>90)return false;
 for(const k of KEYS)if(!Object.hasOwn(p.tuning,k))return false;
 for(const k of KEYS.slice(0,4))if(!num(p.tuning[k])||p.tuning[k]<0||p.tuning[k]>10)return false;
 for(const k of KEYS.slice(4))if(typeof p.tuning[k]!=='boolean')return false;
 return JSON.stringify(p).length<16000;
}
function local(){try{const p=JSON.parse(localStorage.getItem(SLOT)||'null');return valid(p)?p:null}catch{return null}}
function capture(){
 const s=game().state,completed={},tuning={};
 for(const id of TRACKS)if(s.completed[id]){
  const v=s.completed[id];completed[id]={score:v.score,shots:v.shots,hits:v.hits,time:v.time};
 }
 for(const k of KEYS)tuning[k]=s.tuning[k];
 const p={schema:SCHEMA,id:ID,source_blob:BLOB,source_size:sourceSize,created_at:new Date().toISOString(),track:s.trackIndex,
 unlocked:s.unlocked,completed,tuning,evidence:{source_receipt_head:s.previousHash,source_receipt_count:s.receipts.length,
 last_source_reason:s.receipts[0]?.reason||'none',source_running:s.running}};
 if(!valid(p))throw Error('GameCore produced an invalid progress checkpoint');
 return p;
}
function save(){
 const p=capture();localStorage.setItem(SLOT,JSON.stringify(p));
 host().signal('GAMECORE_PROGRESS_SAVED',{track:p.track,unlocked:p.unlocked,source:BLOB,head:p.evidence.source_receipt_head});
 report('Native source progress saved (tracks/tuning only; no in-flight projectile).');return p;
}
function restore(p){
 if(!valid(p))throw Error('GameCore source/progress passport mismatch');
 const g=game(),s=g.state;if(s.running&&!s.paused)throw Error('Pause GameCore before restoring progress');
 s.unlocked=p.unlocked;s.completed=clone(p.completed);
 Object.assign(s.tuning,clone(p.tuning));g.openTrack(p.track);
 host().signal('GAMECORE_PROGRESS_RESTORED',{track:p.track,unlocked:p.unlocked,source:BLOB});
 report('GameCore original source reopened track '+(p.track+1)+' with its own gameplay.');
 return s.trackIndex;
}
function restoreLocal(){const p=local();if(!p)throw Error('No valid local progress');return restore(p)}
function isPacket(p){return p?.schema==='jm.packet/1.0'&&p.kind===KIND&&p.source==='JM.GameCore.AimingRun.v0.1A'&&p.meta?.source_blob===BLOB&&valid(p.payload?.progress)}
function inbox(){return bus().read().filter(isPacket)}
function publish(){
 const p=save(),b=bus();if(b.read().length>=250)throw Error('JM bus full; protect donors');
 const msg={schema:'jm.packet/1.0',id:b.uid('JM-GAMECORE'),created_at:b.now(),kind:KIND,
 source:'JM.GameCore.AimingRun.v0.1A',payload:{progress:p},meta:{source_blob:BLOB,recipient:'RouteOS v0.8.2',proof:'SOURCE_SCOPE_ONLY'}};
 b.send(msg);host().signal('GAMECORE_PACKET_SENT',{id:msg.id,source:BLOB});report('Real GameCore track/tuning packet sent to existing JM bus.');
 return msg;
}
function restorePacket(id){
 const p=inbox().find(v=>v.id===id);if(!p)throw Error('No verified GameCore packet');
 const earlier=local();
 if(earlier&&JSON.stringify(earlier.completed)!==JSON.stringify(p.payload.progress.completed))
  throw Error('HOLD: distinct completed-track histories; existing progress protected');
 localStorage.setItem(SLOT,JSON.stringify(p.payload.progress));
 if(ready)restore(p.payload.progress);
 report('GameCore packet preserved and source progress restored.');return p.payload.progress;
}
function bundle(){return {schema:BUNDLE,id:ID,source_blob:BLOB,exported_at:new Date().toISOString(),packets:clone(inbox())}}
function importBundle(d){
 if(!obj(d)||d.schema!==BUNDLE||d.id!==ID||d.source_blob!==BLOB||!Array.isArray(d.packets)||d.packets.length>40||
 d.packets.some(p=>!isPacket(p)||typeof p.id!=='string'||p.id.length>120))throw Error('Unverified GameCore transfer; entire import refused');
 const b=bus(),seen=new Set(b.read().map(x=>x.id)),add=[];
 for(const p of d.packets)if(!seen.has(p.id)){add.push(p);seen.add(p.id)}
 if(b.read().length+add.length>250)throw Error('JM packet bus full; preserved without overwrite');
 for(const p of add)b.send(clone(p));
 return {imported:add.length,duplicates:d.packets.length-add.length};
}
function listings(){
 const node=overlay?.querySelector('#jmGcIncoming');if(!node)return;node.replaceChildren();
 const pack=inbox();if(!pack.length){node.textContent='No received GameCore progress packets.';return}
 for(const p of pack.slice(0,12)){
  const row=document.createElement('div');row.className='jm-gc-item';
  const t=document.createElement('small');t.textContent='TRACK '+(p.payload.progress.track+1)+' · '+p.id;
  const b=document.createElement('button');b.textContent='RESTORE';b.onclick=()=>{try{restorePacket(p.id)}catch(e){report(e.message,true)}};
  row.append(t,b);node.append(row);
 }
}
async function open(){
 if(overlay){overlay.hidden=false;return}
 overlay=document.createElement('section');overlay.id='jmGcHost';overlay.setAttribute('aria-label','JM Aiming Run in RouteOS host');
 const head=document.createElement('div');head.className='jm-gc-bar';
 const h=document.createElement('strong');h.textContent='ROUTEOS × GAMECORE · AIMING RUN';
 const close=document.createElement('button');close.textContent='RETURN TO CONSOLE';close.onclick=()=>{
  try{if(ready){const g=game();if(g.state.running&&!g.state.paused)g.startRun()}host().signal('GAMECORE_RETURN',{source:BLOB})}catch(e){report(e.message,true)}
  overlay.hidden=true;
 };
 head.append(h,close);overlay.append(head);
 status=document.createElement('p');status.setAttribute('role','status');status.textContent='Checking existing GameCore source…';overlay.append(status);
 const tools=document.createElement('div');tools.className='jm-gc-actions';overlay.append(tools);
 const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{try{const r=fn();if(r?.then)r.catch(e=>report(e.message,true))}catch(e){report(e.message,true)}};tools.append(b);return b};
 button('SAVE TRACK PROGRESS',save);button('LOAD LOCAL PROGRESS',restoreLocal);
 button('SEND TO JM BUS',()=>{publish();listings()});
 button('EXPORT DEVICE PACKET',()=>{bus().download('JM_GAMECORE_AIMING_RUN_TRANSFER.json',bundle());report('Transfer exported for manual device carriage')});
 const pick=document.createElement('input');pick.type='file';pick.accept='.json,application/json';pick.hidden=true;tools.append(pick);
 button('IMPORT DEVICE PACKET',()=>pick.click());
 pick.onchange=async()=>{try{const f=pick.files?.[0];if(!f)return;
 if(f.size>1200000)throw Error('GameCore file exceeds transfer limit');
 const result=importBundle(JSON.parse(await f.text()));report(result.imported+' GameCore packet(s) received');listings()
 }catch(e){report(e.message,true)}finally{pick.value=''}};
 const incoming=document.createElement('div');incoming.id='jmGcIncoming';overlay.append(incoming);
 frame=document.createElement('iframe');frame.title='Exact existing Aiming Run v0.1A playable';frame.id='jmGcSource';overlay.append(frame);document.body.append(overlay);
 try{
  await verify();report('Exact GameCore source verified and mounting…');
  frame.addEventListener('load',()=>{
   try{const api=frame.contentWindow.AimingRun;if(!api?.state||!api.startRun||!api.openTrack)throw Error('Existing GameCore playable API missing');
    ready=true;host().signal('GAMECORE_MOUNT',{source:BLOB,recipient:'RouteOS',bytes:sourceSize});
    const saved=local();if(saved)restore(saved);
    else report('Original Aiming Run live. Use its own play/aim controls. RouteOS carries source receipts and track progress.');
    listings();
   }catch(e){report(e.message,true)}
  },{once:true});
  frame.src=url().href;
 }catch(e){report(e.message,true)}
}
function mount(){
 const css=document.createElement('style');
 css.textContent='#jmGcHost{position:fixed;z-index:2500;inset:0;overflow:auto;background:#050c15;color:white;padding:env(safe-area-inset-top) 7px env(safe-area-inset-bottom);font:14px system-ui}#jmGcHost[hidden]{display:none!important}.jm-gc-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px;background:#102539;border-radius:9px}.jm-gc-actions{display:flex;flex-wrap:wrap;gap:4px;padding:6px}.jm-gc-actions button,.jm-gc-bar button,#jmGcIncoming button{min-height:42px;padding:7px 10px;background:#0e3447;color:white;border:1px solid #6296b1;border-radius:9px;font-weight:750}.jm-gc-item{display:flex;justify-content:space-between;gap:8px;padding:5px;border-bottom:1px solid #345}#jmGcHost p{color:#abe9bb;padding:0 7px}#jmGcSource{display:block;width:100%;height:75dvh;min-height:440px;border:1px solid #516b93;border-radius:10px}#jmGcCart{margin-top:10px}';
 document.head.append(css);
 const bay=document.getElementById('screen-bay');if(!bay)return;
 const c=document.createElement('article');c.className='card';c.id='jmGcCart';
 const h=document.createElement('h2');h.textContent='GAMECORE → ROUTEOS · EXACT PLAYABLE';c.append(h);
 const p=document.createElement('p');p.textContent='Open Aiming Run v0.1A inside RouteOS. Its original moving-target engine and source receipts stay intact; track progress can move through the JM packet spine.';c.append(p);
 const b=document.createElement('button');b.id='jmGcLaunch';b.className='btn gold';b.textContent='PLAY GAMECORE AIMING RUN';b.onclick=()=>open().catch(e=>report(e.message,true));c.append(b);bay.append(c);
}
Object.defineProperty(window,'JMAimingRouteOS',{value:Object.freeze({
 id:ID,sourceBlob:BLOB,open,verify,running:()=>ready,game,frame:()=>frame,
 local,capture,save,restore,restoreLocal,publish,inbox,restorePacket,bundle,importBundle
}),configurable:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();