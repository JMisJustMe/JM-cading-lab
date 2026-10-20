/* JM ECOSTATE second independent recipient: existing Federation ↔ existing Games&Beyond House.
   Touch/click invokes the ORIGINAL GamesBeyond.runProof(), never substitutes its audit.
   Receiver-owned IndexedDB receipt is independently read back before federation return.
   Does NOT claim game execution, private writeback, full 23-body mount or merger. */
(()=>{'use strict';
const script=document.currentScript,role=script?.dataset?.jmGamesReturn;
if(!['federation','games-house'].includes(role))return;
const KEY='jm.ecostate.games-beyond.return.v1',DB='jm-games-beyond-public-v05',MAX_AGE=3600000;
const here=new URL('./',script.src),houseURL=new URL('../games-beyond/index.html',here),fedURL=new URL('OPEN_FIRST_AILATHEO_LIVING_FEDERATION_v1_0.html',here);
const $=id=>document.getElementById(id);
const status=message=>{const n=$('jmGBStatus');if(n)n.textContent=message;return false};
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
function valid(t){return !!(t&&t.schema==='JM.GamesBeyond.FederationReturn/1'&&typeof t.id==='string'&&t.id.length>20&&t.source==='JM_AILATHEO_LIVING_FEDERATION'&&t.target==='JM_GAMES_BEYOND_V05'&&Number.isFinite(t.createdAt)&&Date.now()-t.createdAt>=0&&Date.now()-t.createdAt<MAX_AGE)}
function save(t){localStorage.setItem(KEY,JSON.stringify(t));const r=read();if(!r||r.id!==t.id||r.phase!==t.phase)throw Error('GAMES_RETURN_PERSISTENCE_HOLD');return r}
async function sha(value){if(!crypto?.subtle)throw Error('WEB_CRYPTO_HOLD');const buf=new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',buf))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function panel(title){const p=document.createElement('section');p.id='jmGamesReturnPanel';p.setAttribute('aria-label',title);p.style.cssText='background:#092237;color:#f4fafe;border:1px solid #72dcc4;border-radius:13px;padding:10px 12px;margin:7px 0;max-width:900px;font:14px/1.45 system-ui;position:relative;z-index:5;max-height:52vh;overflow:auto';const b=document.createElement('strong');b.textContent=title;const q=document.createElement('p');q.id='jmGBStatus';q.setAttribute('role','status');q.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0';p.append(b,q);return p}
function action(title,id,fn,p){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=title;b.style.cssText='min-height:44px;max-width:100%;white-space:normal;padding:8px 12px;margin:3px;border:1px solid #78edbd;border-radius:9px;background:#163b46;color:#f4ffff;cursor:pointer';b.onclick=()=>Promise.resolve().then(fn).catch(e=>status('GAMES RETURN HOLD — '+String(e?.message||e)));p.appendChild(b)}
function receipts(){
 return new Promise((resolve,reject)=>{const req=indexedDB.open(DB);req.onerror=()=>reject(Error('GAMES_HOUSE_DB_HOLD'));req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains('receipts')){db.close();return reject(Error('GAMES_HOUSE_RECEIPTS_NOT_PRESENT'))}const tx=db.transaction('receipts','readonly'),get=tx.objectStore('receipts').getAll();get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(Error('GAMES_HOUSE_RECEIPT_READ_FAILED'));tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(Error('GAMES_HOUSE_DB_TRANSACTION_HOLD'))}}})
}
async function latestReceipt(){const records=await receipts();return records.sort((a,b)=>b.key-a.key)[0]||null}
async function prepare(){
 const intent=String($('contact')?.value||'').trim().slice(0,1024);
 if(!intent)return status('GAMES RETURN HOLD — enter an intent before contact');
 const id=crypto.randomUUID();
 save({schema:'JM.GamesBeyond.FederationReturn/1',id,source:'JM_AILATHEO_LIVING_FEDERATION',target:'JM_GAMES_BEYOND_V05',
   intent,createdAt:Date.now(),intentSha256:await sha(intent),phase:'HANDOFF_PREPARED',recipientProof:null});
 const u=new URL(houseURL);u.searchParams.set('jm_games_return_id',id);location.assign(u.href);
}
async function execute(t,priorKey){
 const house=window.GamesBeyond;
 if(!house?.runProof||!house?.pack?.bodies?.length)return status('GAMES RETURN HOLD — existing Games&Beyond House not loaded');
 if(!valid(read())||read().id!==t.id||read().phase!=='HANDOFF_PREPARED')return status('GAMES RETURN HOLD — invalid or already used handoff');
 $('jmGBStatus').textContent='EXECUTING ORIGINAL GAMES&BEYOND PROOF · reading mounted bodies...';
 await house.runProof();
 const report=JSON.parse($('proofBox')?.textContent||'null');
 const stored=await latestReceipt();
 if(!report||report.schema!=='JM.GamesBeyond.PublicProof/0.5'||report.pass!==true||
    !Array.isArray(report.results)||report.results.length!==report.bodyCount||
    report.bodyCount<report.builtInExpected||report.builtInExpected<21||
    !report.results.every(x=>x.html===true&&x.bytes>0&&/^[0-9a-f]{64}$/.test(x.digest)))
   return status('GAMES RETURN HOLD — original Games&Beyond body/source proof failed');
 const expectedType=report.fullMount?'FULL_23_BODY_HOUSE_PROOF':'BUILT_IN_HOUSE_PROOF';
 if(!stored||stored.key<=priorKey||stored.type!==expectedType||stored.body!=='DING'||stored.extra?.pass!==true||
    stored.extra?.bodyCount!==report.bodyCount||stored.extra?.fullMount!==report.fullMount)
   return status('GAMES RETURN HOLD — no NEW receiver-owned IndexedDB PASS receipt');
 // Verify that persisted DB record is intact independently of the federation ticket.
 const actual=(await receipts()).find(x=>x.key===stored.key);
 if(!actual||await sha(actual)!==await sha(stored))return status('GAMES RETURN HOLD — receiver DB readback mismatch');
 const proof={schema:'JM.GamesBeyond.IndependentHouseProof/1',recipient:'JM_GAMES_BEYOND_V05',
  receiptKey:stored.key,receiptSha256:await sha(stored),reportSha256:await sha(report),
  bodyCount:report.bodyCount,builtInExpected:report.builtInExpected,fullTarget:report.fullTarget,
  fullMount:report.fullMount,editedCount:report.results.filter(x=>x.edited).length,
  execution:'ORIGINAL_GAMES_BEYOND_RUN_PROOF_AND_INDEXEDDB_RECEIPT',
  boundary:'21+ mounted carriers verified by Games&Beyond; no claim that individual games executed, 23 were all mounted, private writeback or merger'};
 const saved=save({...t,recipientProof:proof,proofSha256:await sha(proof),phase:'RECEIVER_RETURN_READY'});
 if(await sha(saved.recipientProof)!==saved.proofSha256)return status('GAMES RETURN HOLD — ticket hash mismatch');
 status('GAMES HOUSE RECEIVER PROVED · '+proof.bodyCount+' mounted bodies verified · NEW receiver-owned IndexedDB receipt read back · '+(proof.fullMount?'full House':'full 23-body House NOT claimed')+'. Return to federation.');
}
async function returnToFederation(t){
 const current=read();
 if(!valid(current)||current.id!==t.id||current.phase!=='RECEIVER_RETURN_READY'||!current.recipientProof)
  return status('GAMES RETURN HOLD — execute original Games&Beyond proof before return');
 const u=new URL(fedURL);u.searchParams.set('jm_games_return_id',t.id);location.assign(u.href);
}
async function verifyFederation(t){
 if(!valid(t)||!t.recipientProof||!['RECEIVER_RETURN_READY','FEDERATION_RETURN_VERIFIED'].includes(t.phase))return status('GAMES RETURN HOLD — missing fresh receiver execution');
 if(await sha(t.intent)!==t.intentSha256||await sha(t.recipientProof)!==t.proofSha256)return status('GAMES RETURN HOLD — returned ticket hash mismatch');
 const proof=t.recipientProof,rs=await receipts(),stored=rs.find(x=>x.key===proof.receiptKey);
 if(!stored||await sha(stored)!==proof.receiptSha256||stored.extra?.pass!==true||
    stored.extra?.bodyCount!==proof.bodyCount||stored.type!==(proof.fullMount?'FULL_23_BODY_HOUSE_PROOF':'BUILT_IN_HOUSE_PROOF'))
  return status('GAMES RETURN HOLD — independent recipient IndexedDB receipt absent or changed');
 const v=save({...t,phase:'FEDERATION_RETURN_VERIFIED',verifiedAt:Date.now()});
 status('GAMES&BEYOND FEDERATION RETURN VERIFIED · '+proof.bodyCount+' mounted bodies · receiver-owned IndexedDB readback PASS · game execution NOT claimed');
 if($('meaningText'))$('meaningText').textContent=$('jmGBStatus').textContent;
 if($('headStatus'))$('headStatus').textContent='GAMES HOUSE RETURN VERIFIED';
 window.JMGamesBeyondReturn=Object.freeze({state:()=>({...v,scope:'SAME_ORIGIN_GAMES_HOUSE_PROOF_ONLY'})});
 window.dispatchEvent(new CustomEvent('jm-games-beyond-return',{detail:{...v}}));
}
function mountFederation(){
 const p=panel('JM FEDERATION ↔ GAMES&BEYOND · SECOND INDEPENDENT RECIPIENT');
 const contact=$('contact')?.closest('.contact');
 (contact?.parentNode||document.body).insertBefore(p,contact||null);
 status('Run the existing Games House proof in its own body and return an independently saved receipt. No game launch or private write implied.');
 action('OPEN EXISTING GAMES&BEYOND FOR EARNED PROOF ↗','jmGBStart',prepare,p);
 const id=new URL(location.href).searchParams.get('jm_games_return_id');
 if(id){const t=read();if(!t||t.id!==id)return status('GAMES RETURN HOLD — no matching ticket');verifyFederation(t).catch(e=>status('GAMES RETURN HOLD — '+e.message))}
}
function mountHouse(){
 const id=new URL(location.href).searchParams.get('jm_games_return_id');if(!id)return;
 const t=read(),p=panel('GAMES&BEYOND · INDEPENDENT FEDERATION RECIPIENT');
 const target=document.querySelector('main')||document.body;
 target.insertBefore(p,target.firstChild);
 if(!valid(t)||t.id!==id||!['HANDOFF_PREPARED','RECEIVER_RETURN_READY'].includes(t.phase))
  return status('GAMES RETURN HOLD — invalid, expired or changed handoff');
 status('Intent received: '+t.intent+'\nOriginal Games&Beyond House remains sovereign. No project, game or source modified by this handoff.');
 const priorPromise=receipts().then(rows=>Math.max(0,...rows.map(x=>x.key)));
 action('EXECUTE EXISTING GAMES HOUSE PROOF','jmGBExecute',async()=>{
   const prior=await priorPromise;
   return execute(t,prior);
 },p);
 action('↩ RETURN VERIFIED GAMES HOUSE RECEIPT','jmGBReturn',()=>returnToFederation(t),p);
}
if(role==='federation')mountFederation();else mountHouse();
})();