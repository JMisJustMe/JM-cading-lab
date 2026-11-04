// JM ECOSTATE CP14: bounded public read-only Cloud Contact v0.5.1 HTTPS contact.
// No credentials, no state changes, no login or deployment. Production target is fixed.
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const EXPECTED_ORIGIN='https://jm-cloud-contact-server-v05.onrender.com';
export const DONOR_COMMIT='0921217d95285bcb21cda7a995d02f7ec0725810';
const VERSION='0.5.1-hosted', SCHEMA='jm.cloud-contact.server/0.5';
const MAX_BYTES=64*1024;
const fail=(tag)=>{throw Error(`CP14_${tag}`)};
const insist=(v,tag)=>{if(!v)fail(tag)};
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const canon=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canon).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function validateOrigin(origin){
  insist(origin===EXPECTED_ORIGIN,'ORIGIN_PIN_REQUIRED');
  const u=new URL(origin);insist(u.protocol==='https:'&&u.hostname==='jm-cloud-contact-server-v05.onrender.com'&&u.port===''&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/', 'HTTPS_ORIGIN_ONLY');
}
async function readPublicJson(url, transport, signal){
  const expected=new URL(url);
  insist(expected.protocol==='https:'&&expected.origin===EXPECTED_ORIGIN&&['/ready','/meta','/receipt-key'].includes(expected.pathname)&&!expected.search,'ENDPOINT_PIN');
  const res=await transport(url,{method:'GET',headers:{accept:'application/json'},redirect:'manual',signal});
  insist(res&&Number.isInteger(res.status),'BAD_RESPONSE');
  insist(res.status===200,'HTTP_NOT_200_'+res.status);
  insist((res.headers?.get('content-type')||'').toLowerCase().includes('application/json'),'NON_JSON_CONTENT_TYPE');
  const target=String(res.url||url);
  insist(target===url,'REDIRECT_OR_ORIGIN_DRIFT');
  const declared=Number(res.headers?.get('content-length'));
  if(Number.isFinite(declared)&&declared>MAX_BYTES)fail('OVERSIZED_DECLARED_BODY');
  // Stream carefully; response size can be wrong or missing.
  const reader=res.body?.getReader();insist(reader,'STREAM_REQUIRED');
  let length=0,parts=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES){await reader.cancel();fail('OVERSIZED_BODY')}parts.push(Buffer.from(value));}}
  finally{reader.releaseLock()}
  let data;try{data=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{fail('INVALID_JSON')}
  insist(object(data),'JSON_OBJECT_REQUIRED');return data;
}
function assertReadiness(data){
  insist(data.ok===true&&data.ready===true,'NOT_READY');
  insist(data.version===VERSION,'VERSION_MISMATCH');
  insist(data.receiptSigning===true,'SIGNING_NOT_READY');
  insist(Number.isInteger(data.profileCount)&&data.profileCount>0,'NO_PROFILE_MOUNTS');
  insist(Array.isArray(data.errors)&&data.errors.length===0,'READINESS_ERRORS');
  return {ready:true,version:VERSION,profileCount:data.profileCount,receiptSigning:true,turnConfigured:data.turnConfigured===true};
}
function assertMeta(data){
  insist(data.ok===true&&data.name==='JM CLOUD CONTACT SERVER'&&data.version===VERSION&&data.schema===SCHEMA,'DONOR_META_MISMATCH');
  insist(Array.isArray(data.apiRoots)&&data.apiRoots.includes('/v5')&&data.receiptKey==='/receipt-key','ROUTES_MISSING');
  return {version:VERSION,schema:SCHEMA,apiRoots:data.apiRoots.filter(x=>x==='/v5'||x==='/v4'||x==='/v3')};
}
function assertPublicKey(data){
  insist(data.ok===true&&data.algorithm==='ECDSA-P256-SHA256-P1363','SIGNER_KEY_NOT_READY');
  insist(object(data.publicKeyJwk)&&data.publicKeyJwk.kty==='EC'&&data.publicKeyJwk.crv==='P-256'&&!('d' in data.publicKeyJwk),'BAD_PUBLIC_JWK');
  insist(typeof data.keyId==='string'&&/^[a-f0-9]{24}$/.test(data.keyId),'BAD_KEY_ID');
  let pub;try{pub=crypto.createPublicKey({key:data.publicKeyJwk,format:'jwk'})}catch{fail('BAD_PUBLIC_KEY')}
  insist(pub.asymmetricKeyType==='ec','UNSUPPORTED_SIGNING_KEY');
  insist(hash(canon(data.publicKeyJwk)).slice(0,24)===data.keyId,'KEY_ID_NOT_CONSISTENT');
  return {publicSignatureKeySelfConsistent:true, keyId:data.keyId};
}
export async function probePublicCloudContact({origin=EXPECTED_ORIGIN,transport=fetch,timeoutMs=80000}={}){
  validateOrigin(origin);
  insist(Number.isInteger(timeoutMs)&&timeoutMs>=500&&timeoutMs<=120000,'TIMEOUT_BOUNDS');
  insist(typeof transport==='function','TRANSPORT_REQUIRED');
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
    const ready=assertReadiness(await readPublicJson(origin+'/ready',transport,abort.signal));
    const meta=assertMeta(await readPublicJson(origin+'/meta',transport,abort.signal));
    const key=assertPublicKey(await readPublicJson(origin+'/receipt-key',transport,abort.signal));
    return {ok:true,scope:'PUBLIC_READ_ONLY_REAL_HTTPS_CONTACT_NOT_DATA_RECOVERY',origin,expectedSourceCommit:DONOR_COMMIT,ready,meta,key,
      boundaries:['CANNOT_VERIFY_CURRENT_DEPLOY_COMMIT_FROM_PUBLIC_API','KEY_ID_NOT_INDEPENDENTLY_PINNED','NO_PRIVATE_DATA_READ','NO_DATABASE_ACCESS','NO_OWNER_DEVICE','NO_MUTATION','NO_DURABILITY_OR_RECOVERY_CLAIM']};
  }finally{clearTimeout(timer)}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  probePublicCloudContact().then(r=>console.log(JSON.stringify(r))).catch(e=>{const code=String(e.message||'PROBE_FAILED').startsWith('CP14_')?e.message:'CP14_PUBLIC_NETWORK_OR_TIMEOUT_HOLD';console.log(JSON.stringify({ok:false,scope:'PUBLIC_HTTP_CONTACT_HOLD',error:code,expectedSourceCommit:DONOR_COMMIT}));process.exitCode=1});
}
