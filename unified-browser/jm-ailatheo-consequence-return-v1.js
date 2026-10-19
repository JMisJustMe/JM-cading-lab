/* JM AILatheo — existing Living Federation ↔ existing Creation Workbench
   Consent-gated, same-origin, local persistence; NEVER a public/private backend write.
   No copied project bodies, no payment, no silent scene replacement.
   One transactional ticket is updated in place. Source ≠ receiver proof. */
(()=>{
'use strict';
const KEY='jm.ailatheo.consequence-return.v1';
const script=document.currentScript;
const role=script?.dataset?.jmRelay||'';
const isFederation=role==='federation';
const isWorkbench=role==='workbench';
if(!isFederation&&!isWorkbench)return;
const MAX_AGE=60*60*1000;
const $=id=>document.getElementById(id);
const root=new URL('./',script.src);
const federationUrl=new URL('OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html',root);
const workbenchUrl=new URL('OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html',root);
function hold(message){const n=$('jmRelayStatus');if(n)n.textContent='RELAY HOLD — '+message;return false}
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function save(record){
 localStorage.setItem(KEY,JSON.stringify(record));
 const returned=read();
 if(!returned||returned.id!==record.id||returned.phase!==record.phase)throw Error('PERSISTENCE_READBACK_MISMATCH');
 return returned;
}
async function digest(value){
 if(!crypto?.subtle)throw Error('SHA256_UNAVAILABLE');
 const bytes=new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value));
 const hashed=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hashed)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function validTicket(t){
 return !!(t&&t.schema==='JM.AILatheo.ReceiverReturn/1'&&typeof t.id==='string'&&t.id.length>=20&&
 t.source==='JM_AILATHEO_LIVING_FEDERATION'&&t.target==='JM_AILATHEO_CREATION_WORKBENCH_V3'&&
 Number.isFinite(t.createdAt)&&Date.now()-t.createdAt>=0&&Date.now()-t.createdAt<MAX_AGE);
}
function makePanel(label){
 const panel=document.createElement('section');
 panel.id='jmConsequenceRelay';
 panel.setAttribute('aria-label',label);
 panel.style.cssText='margin:8px auto;padding:10px 12px;max-width:850px;border:1px solid #427b87;border-radius:12px;background:#102537;color:#f5f9ff;font:14px/1.4 system-ui;position:relative;z-index:2';
 const title=document.createElement('strong');title.textContent=label;
 const status=document.createElement('p');status.id='jmRelayStatus';status.setAttribute('role','status');
 status.style.cssText='margin:7px 0;white-space:pre-wrap;overflow-wrap:anywhere';
 panel.append(title,status);return panel;
}
function button(text,id,fn,container){
 const b=document.createElement('button');b.type='button';b.textContent=text;b.id=id;
 b.style.cssText='font:inherit;min-height:44px;margin:3px;padding:8px 12px;background:#153951;color:#fff;border:1px solid #64bbce;border-radius:10px;cursor:pointer';
 b.onclick=()=>Promise.resolve().then(fn).catch(e=>hold(String(e?.message||e)));
 container.appendChild(b);return b;
}
function loadPersistedProject(){
 const bodies=JSON.parse(localStorage.getItem('jm.ailatheo.v3.bodies')||'[]');
 const links=JSON.parse(localStorage.getItem('jm.ailatheo.v3.links')||'[]');
 if(!Array.isArray(bodies)||!Array.isArray(links))throw Error('PROJECT_STATE_INVALID');
 return {bodies,links};
}
async function prepare(){
 const input=$('contact');
 const intent=String(input?.value||'').trim().slice(0,1024);
 if(!intent)return hold('Enter an intention before handoff');
 if(!crypto?.randomUUID)return hold('CRYPTO_ID_UNAVAILABLE');
 const ticket={schema:'JM.AILatheo.ReceiverReturn/1',id:crypto.randomUUID(),source:'JM_AILATHEO_LIVING_FEDERATION',
 target:'JM_AILATHEO_CREATION_WORKBENCH_V3',createdAt:Date.now(),phase:'HANDOFF_PREPARED',intent,
 intentSha256:await digest(intent),receiverProof:null};
 save(ticket);
 const target=new URL(workbenchUrl.href);target.searchParams.set('jm_return_id',ticket.id);
 window.location.assign(target.href);
}
async function verifyCurrent(t,startedEventId){
 const ui=window.JMAILatheoGripUI;
 const event=ui?.latestMaterialContact?.();
 const live=window.JMAILatheoCreatorPreview?.state?.();
 if(!event||!event.kind?.includes('DING')||!event.recoveryRevision||!(Number(event.id)>startedEventId))
  return hold('Receiver has no independently earned, recoverable material consequence');
 if(!live)return hold('Creation Workbench state is not readable');
 const {bodies,links}=loadPersistedProject();
 if(!bodies.length||bodies.length!==live.bodies||links.length!==live.links)
  return hold('Receiver memory/persistence disagree; no proof returned');
 const bodySig=await digest(bodies);
 const linkSig=await digest(links);
 const proof={schema:'JM.AILatheo.LocalConsequenceReadback/1',recipient:'JM_AILATHEO_CREATION_WORKBENCH_V3',
  eventId:event.id,eventKind:event.kind,recoveryRevision:event.recoveryRevision,
  bodyCount:bodies.length,linkCount:links.length,bodySha256:bodySig,linkSha256:linkSig,
  state:'RECEIVER_MATERIAL_AND_STORAGE_READBACK_PASS',
  boundary:'Local same-origin receiver state and recorded workbench event only; not external/private-host execution, owner physical-device proof or universal merge'};
 const updated={...t,phase:'RECEIVER_RETURN_READY',receiverProof:proof,returnedAt:Date.now(),proofSha256:await digest(proof)};
 const back=save(updated);
 if(back.proofSha256!==updated.proofSha256)return hold('RETURN_STORAGE_HASH_MISMATCH');
 $('jmRelayStatus').textContent='RECEIVER PROVED — '+event.kind+' · '+bodies.length+' bodies · '+links.length+' links · stored readback PASS. Return to federation.';
 return true;
}
function mountFederation(){
 const panel=makePanel('FEDERATION ↔ WORKBENCH · EARNED CONSEQUENCE RETURN');
 panel.querySelector('#jmRelayStatus').textContent='User-authorised handoff into the EXISTING Creation Workbench. No automatic project changes.';
 button('OPEN WORKBENCH WITH THIS INTENT ↗','jmRelayStart',prepare,panel);
 const contact=$('contact')?.closest('.contact');
 (contact?.parentNode||document.body).insertBefore(panel,contact||null);
 const id=new URL(location.href).searchParams.get('jm_return_id');
 if(!id)return;
 const t=read();
 if(!validTicket(t)||t.id!==id||t.phase!=='RECEIVER_RETURN_READY'||!t.receiverProof)return hold('No matching fresh verified receiver return');
 Promise.resolve().then(async()=>{
  if(await digest(t.intent)!==t.intentSha256||await digest(t.receiverProof)!==t.proofSha256)return hold('Return evidence hash mismatch');
  const {bodies,links}=loadPersistedProject();
  if(await digest(bodies)!==t.receiverProof.bodySha256||await digest(links)!==t.receiverProof.linkSha256)
   return hold('Recipient persisted state changed after receipt: independent recovery required');
  const returned=save({...t,phase:'FEDERATION_RETURN_VERIFIED',federationReadbackAt:Date.now()});
  $('jmRelayStatus').textContent='FEDERATION RETURN VERIFIED · '+returned.receiverProof.eventKind+' · '+returned.receiverProof.bodyCount+' bodies · '+returned.receiverProof.linkCount+' links · local persisted consequence readback PASS.';
  const msg=$('meaningText');if(msg)msg.textContent=$('jmRelayStatus').textContent;
  const head=$('headStatus');if(head)head.textContent='RECEIVER RETURN VERIFIED';
  window.JMAILatheoReturn=Object.freeze({state:()=>({...returned,claimBoundary:'LOCAL_SAME_ORIGIN_ONLY'})});
  window.dispatchEvent(new CustomEvent('jm-ailatheo-consequence-return',{detail:{...returned}}));
 }).catch(e=>hold(String(e?.message||e)));
}
function mountWorkbench(){
 const id=new URL(location.href).searchParams.get('jm_return_id');
 if(!id)return;
 const t=read();
 const panel=makePanel('WORKBENCH RECEIVER · FEDERATION CONTACT');
 const app=document.querySelector('.app')||document.body;
 app.parentNode.insertBefore(panel,app);
 if(!validTicket(t)||t.id!==id||!['HANDOFF_PREPARED','RECEIVER_RETURN_READY'].includes(t.phase))return hold('Handoff missing or expired');
 const startedEventId=Number(window.JMAILatheoGripUI?.latestMaterialContact?.()?.id)||0;
 $('jmRelayStatus').textContent='Intent received from federation: '+t.intent+'\nNo project touched. Execute a real workbench action, then verify its persisted consequence.';
 button('LOAD SIGNAL GARDEN (EMPTY PROJECT ONLY)','jmRelaySample',()=>{
  const ui=window.JMAILatheoCreatorPreview;
  if(!ui?.loadSignalGarden)return hold('Workbench recipient not initialised');
  const stored=loadPersistedProject();
  if(stored.bodies.length||stored.links.length||localStorage.getItem('jm.ailatheo.v3.project'))
   return hold('Existing creator project protected — use workbench normally, then VERIFY CURRENT RESULT');
  ui.loadSignalGarden();
  $('jmRelayStatus').textContent='Signal Garden loaded by existing workbench. Verify the recorded and persisted consequence next.';
 },panel);
 button('VERIFY CURRENT MATERIAL RESULT','jmRelayVerify',()=>verifyCurrent(t,startedEventId),panel);
 button('↩ RETURN VERIFIED RESULT','jmRelayReturn',()=>{
  const current=read();
  if(!validTicket(current)||current.id!==id||current.phase!=='RECEIVER_RETURN_READY')return hold('Verify an earned material result before returning');
  const dest=new URL(federationUrl.href);dest.searchParams.set('jm_return_id',id);
  window.location.assign(dest.href);
 },panel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',isFederation?mountFederation:mountWorkbench,{once:true});
else(isFederation?mountFederation:mountWorkbench)();
})();
