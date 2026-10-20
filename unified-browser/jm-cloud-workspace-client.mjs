// One callable adapter, shared by browser and Node. Authority remains with the
// existing Service Mesh token; a target acknowledgement alone is not success.
const encode=new TextEncoder();
export const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export async function digest(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(v)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function createCloudWorkspaceClient({request,token='',checkpoint=null,onCheckpoint=()=>{}}){
  if(token&&!/^[A-Za-z0-9_.-]{20,2048}$/.test(token))throw Error('INVALID_SCOPED_KEY');
  if(checkpoint&&!/^ws_[A-Za-z0-9_-]{8,64}$/.test(checkpoint.workspaceId||''))throw Error('INVALID_RECOVERY_CHECKPOINT');
  let bearer=token,seat=checkpoint;
  const retain=value=>{onCheckpoint({...value});seat=value;return seat};
  const call=(method,path,payload)=>request(method,path,bearer,payload);
  async function verifyCloud(receipt){
    if(receipt?.schema!=='jm.cloud-contact.space-receipt/0.5')throw Error('CLOUD_RECEIPT_SCHEMA');
    const {receiptHash,serverSig,publicSig,publicKeyId,signatureAlgorithm,claimBoundary,...snapshot}=receipt;
    if(await digest(canonical(snapshot))!==receiptHash)throw Error('CLOUD_RECEIPT_HASH');
    if(signatureAlgorithm!=='ECDSA-P256-SHA256-P1363')throw Error('CLOUD_SIGNATURE_ALGORITHM');
    const key=await call('GET','/receipt-key');
    if(seat.cloudKeyId&&publicKeyId!==seat.cloudKeyId)throw Error('PINNED_CLOUD_SIGNER_CHANGED');
    if(key.keyId!==publicKeyId)throw Error('CLOUD_SIGNER_CHANGED');
    const jwk=await crypto.subtle.importKey('jwk',key.publicKeyJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    const signature=Uint8Array.from(atob(publicSig.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},jwk,signature,encode.encode(receiptHash)))throw Error('CLOUD_SIGNATURE_INVALID');
    return true;
  }
  async function recover(){
    if(!bearer||!seat?.workspaceId)throw Error('RECOVERY_CREDENTIAL_AND_CHECKPOINT_REQUIRED');
    const got=await call('GET','/mesh/v1/workspaces/'+seat.workspaceId);
    const w=got.workspace;
    if(!seat.receiptHash){
      // A lost HTTP response is uncertain, not failure. Recover the existing
      // target consequence without replaying a mutation or minting a receipt.
      if(w?.content?.operationId!==seat.operationId||w.contentHash!==seat.expectedContentHash)throw Error('PENDING_TARGET_CONSEQUENCE_NOT_FOUND');
      const d=await call('GET','/mesh/v1/dashboard');
      const receipt=d.dashboard?.latestReceipts?.find(r=>r.kind==='workspace.save'&&r.payload?.workspaceId===seat.workspaceId&&r.payload?.contentHash===seat.expectedContentHash&&r.payload?.revision===w.revision);
      if(!receipt)throw Error('PENDING_SAVE_RECEIPT_NOT_FOUND');
      retain({...seat,revision:w.revision,contentHash:w.contentHash,receiptHash:receipt.receiptHash,cloudReceiptHash:receipt.payload.cloudReceiptHash,state:'VERIFY_PENDING'});
    }
    if(w?.revision!==seat.revision||w?.contentHash!==seat.contentHash||await digest(JSON.stringify(w.content))!==seat.contentHash)throw Error('TARGET_STATE_CHANGED');
    const verified=await call('POST','/mesh/v1/verify',{receiptHash:seat.receiptHash});
    if(!verified.valid||verified.receipt?.payload?.workspaceId!==seat.workspaceId||verified.receipt?.payload?.revision!==seat.revision||verified.receipt?.payload?.contentHash!==seat.contentHash||verified.receipt?.payload?.cloudReceiptHash!==seat.cloudReceiptHash)throw Error('TARGET_RECEIPT_MISMATCH');
    const cloud=await call('POST','/mesh/v1/verify',{receiptHash:seat.cloudReceiptHash});
    if(!cloud.valid||cloud.receipt?.spaceId!==w.cloudSpaceId)throw Error('CLOUD_TRACE_MISMATCH');
    await verifyCloud(cloud.receipt);
    retain({...seat,cloudKeyId:cloud.receipt.publicKeyId,state:'VERIFIED'});
    return {state:'TARGET_READBACK_VERIFIED',checkpoint:{...seat},content:w.content,
      boundary:'Existing cloud workspace and signed contact receipt; runtime-file durability only. Physical Android, server replacement and database-backed workspace durability unproved.'};
  }
  return Object.freeze({
    async register(handle){
      if(bearer)throw Error('EXISTING_CONNECTION_PROTECTED');
      const r=await request('POST','/mesh/v1/auth/register','',{handle});
      if(!r.token||!r.authuser?.authuserId)throw Error('AUTHORITY_NOT_RETURNED');
      bearer=r.token;return {token:bearer,authuserId:r.authuser.authuserId};
    },
    async saveIntent(intent){
      if(!bearer)throw Error('SCOPED_CREDENTIAL_REQUIRED');
      if(typeof intent!=='string'||!intent.trim()||encode.encode(intent).length>16000)throw Error('INTENT_REQUIRED_OR_TOO_LARGE');
      // Every explicit new submission creates its own workspace; a failed or
      // uncertain attempt must be recovered, never automatically resubmitted.
      if(seat)throw Error('RECOVER_EXISTING_ATTEMPT_FIRST');
      const op=crypto.randomUUID(),content={schema:'JM.AILatheo.CloudIntent/1',operationId:op,
        source:'JM_AILATHEO_LIVING_FEDERATION',recipient:'JM RouteVault',relationship:'MESH',intent,createdAt:new Date().toISOString()};
      const created=await call('POST','/mesh/v1/workspaces',{label:'AILatheo '+op,kind:'federation-intent'});
      retain({workspaceId:created.workspace.workspaceId,operationId:op,expectedContentHash:await digest(JSON.stringify(content)),state:'SAVE_PENDING'});
      const saved=await call('POST','/mesh/v1/workspaces/'+seat.workspaceId+'/save',{sourceBody:content.source,content});
      retain({...seat,revision:saved.workspace.revision,contentHash:saved.workspace.contentHash,
        receiptHash:saved.receipt.receiptHash,cloudReceiptHash:saved.cloudReceipt.receiptHash,cloudKeyId:saved.cloudReceipt.publicKeyId,state:'VERIFY_PENDING'});
      if(seat.contentHash!==await digest(JSON.stringify(content)))throw Error('SAVE_HASH_MISMATCH');
      const result=await recover();
      return {...result,checkpoint:{...seat}};
    },
    recover,
    checkpoint:()=>seat?{...seat}:null
  });
}
export function httpRequest(base,{relay=false}={}){
  return async(method,path,token,payload)=>{
    const url=relay?base+'?route='+encodeURIComponent(path):base+path;
    const r=await fetch(url,{method,redirect:'error',headers:{accept:'application/json',...(payload?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(25000)});
    const value=await r.json();if(!r.ok||value.ok===false)throw Error(value.error||'TARGET_HTTP_'+r.status);return value;
  };
}
