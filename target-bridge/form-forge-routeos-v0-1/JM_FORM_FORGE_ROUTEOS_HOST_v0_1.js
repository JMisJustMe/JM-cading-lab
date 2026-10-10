/* JM Form Forge → RouteOS bounded real geometry contact host v0.1
   Only the manually imported GLB reaches recipient. Private Forge v0.24 source never goes public.
   Native console records witnessed face contacts, not invented engine merger.
*/
(()=>{
'use strict';
if(window.JMFormForgeRouteOS)return;
const SHA='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const CONTRACT='JM.FormForge.RouteOSHostContact/0.1';
const VALID=new Set(['MESH_ACCEPTED','FACE_CONTACT','CONTACT_DING']);
const source='../../../target-bridge/form-forge-routeos-v0-1/index.html';
let frame=null,surface=null,status=null,mesh=null,snapshot=null,contacts=new Set(),lastScore=0;
function info(s,bad=false){if(!status)return;status.textContent=s;status.style.color=bad?'#ff9ab1':'#a0efbb'}
function accepted(p){
 if(!p||p.schema!==CONTRACT||!VALID.has(p.event)||p.source!==SHA||
 !/^[a-f0-9]{64}$/.test(p.geometryHash||'')||!/^[a-f0-9]{8}$/.test(p.snapshotHash||'')||
 !Number.isInteger(p.contacts)||p.contacts<0||p.contacts>100000||
 !Number.isSafeInteger(p.score)||p.score<0||p.score>10000000)return false;
 if(p.event==='MESH_ACCEPTED')return p.contacts===0&&p.score===0;
 return Number.isInteger(p.face)&&p.face>=0&&p.face<=300000;
}
function handle(e){
 if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;
 const p=e.data;if(!accepted(p))return;
 if(p.event==='MESH_ACCEPTED'){
   mesh=p.geometryHash;snapshot=p.snapshotHash;contacts.clear();lastScore=0;
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_MESH_ACCEPTED',p);
   info(ok?'Forge-sourced geometry arrived in RouteOS. Touch distinct mesh faces to play.':'Native recipient receipt HOLD.',!ok);
   return;
 }
 if(!mesh||mesh!==p.geometryHash||snapshot!==p.snapshotHash)return;
 if(p.event==='FACE_CONTACT'){
   if(contacts.has(p.face)||p.contacts!==contacts.size+1||p.score<=lastScore)return;
   contacts.add(p.face);lastScore=p.score;
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_FACE_CONTACT',p);
   info(ok?'Mesh triangle '+p.face+' contacted · '+contacts.size+'/5 · Score '+p.score:'RouteOS receipt HOLD',!ok);
   return;
 }
 if(p.event==='CONTACT_DING'&&contacts.size>=5&&p.contacts===contacts.size&&p.score===lastScore){
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_CONTACT_DING',p);
   if(ok){
     const b=window.JMAppsToolsSpine;
     if(b?.packet&&b?.send&&Array.isArray(b.read())&&b.read().length<250){
       const result=b.packet('jm.fieldform.game-contact.receipt','JM.RouteOS.FormContact',{
         source_sha256:p.source,mesh_sha256:p.geometryHash,forge_snapshot_hash:p.snapshotHash,
         contacts:contacts.size,face_ids:[...contacts],score:lastScore,
         receiver:'JM RouteOS v0.8.2',proof:'BROWSER_CONTACT_WITH_NATIVE_HOST_RECEIPT'
       },{source:'JM.FieldFormForge/0.24',bridge:'JM.FormForge.RouteOSHostContact/0.1',private_source_embedded:false});
       b.send(result);
       info('DING · RouteOS native receipt + existing JM Apps & Tools packet bus recorded real mesh-contact consequence.');
     }else info('RouteOS Ding earned; shared JM bus full/unavailable (no bus packet claimed).');
   }else info('Native Ding HOLD',true);
 }
}
function open(){
 if(surface){surface.hidden=false;return}
 surface=document.createElement('section');surface.id='jmForgeRouteOSHost';surface.setAttribute('aria-label','JM Form Forge contact game inside RouteOS');
 const bar=document.createElement('div');bar.className='jm-ffbar';
 const title=document.createElement('strong');title.textContent='ROUTEOS × FIELD/FORM FORGE · CONTACT GAME';
 const close=document.createElement('button');close.textContent='RETURN TO ROUTEOS';close.onclick=()=>{surface.hidden=true};
 bar.append(title,close);surface.append(bar);
 status=document.createElement('p');status.setAttribute('role','status');status.textContent='Waiting for JM Forge geometry packet. Import using LOAD FORGE PACKET below.';surface.append(status);
 frame=document.createElement('iframe');frame.title='JM GameCore FORM CONTACT from user-supplied Form Forge geometry';frame.src=new URL(source,document.baseURI).href;frame.referrerPolicy='no-referrer';
 surface.append(frame);document.body.append(surface);
}
function mount(){
 const styles=document.createElement('style');
 styles.textContent='#jmForgeRouteOSHost{position:fixed;inset:0;z-index:2600;display:flex;flex-direction:column;box-sizing:border-box;max-height:100dvh;padding:env(safe-area-inset-top) 7px env(safe-area-inset-bottom);background:#06121d;color:white;font:12px system-ui}#jmForgeRouteOSHost[hidden]{display:none}.jm-ffbar{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#102b3c;padding:9px;border-radius:9px}.jm-ffbar button{min-height:40px;color:#dff9ff;border:1px solid #4d8295;background:#123447;border-radius:9px}#jmForgeRouteOSHost p{flex:none;margin:4px 0;padding:4px;color:#b5e5be}#jmForgeRouteOSHost iframe{width:100%;min-height:270px;height:100%;flex:1;border:1px solid #345f74;border-radius:10px;background:#071321}';
 document.head.append(styles);
 const bay=document.getElementById('screen-bay');if(!bay)return;
 const c=document.createElement('article');c.className='card';c.id='jmForgeGameCart';
 const h=document.createElement('h2');h.textContent='FIELD / FORM FORGE → GAMECORE CONTACT';c.append(h);
 const p=document.createElement('p');p.textContent='Import owner-exported Forge v0.24 real geometry and play a touch-contact game on its actual mesh. RouteOS records verified host contact. Source remains in private Library.';c.append(p);
 const btn=document.createElement('button');btn.id='jmForgeGameLaunch';btn.className='btn gold';btn.textContent='PLAY FORGE FORM CONTACT';btn.onclick=open;c.append(btn);bay.append(c);
 window.addEventListener('message',handle);
}
Object.defineProperty(window,'JMFormForgeRouteOS',{value:Object.freeze({open,hasMesh:()=>!!mesh,snapshot:()=>snapshot,contactCount:()=>contacts.size}),configurable:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();