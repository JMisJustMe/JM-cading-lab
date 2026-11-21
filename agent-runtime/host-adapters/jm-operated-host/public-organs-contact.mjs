// JM CP15 — public, read-only functional contact of five sovereign original v0.5.1 organs.
// No authentication, body export, POST, arbitrary URLs or deployment control.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EXPECTED_ORIGIN,DONOR_COMMIT,probePublicCloudContact} from './public-readiness-contact.mjs';
const fail=x=>{throw Error('CP15_'+x)};
const insist=(v,x)=>{if(!v)fail(x)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const paths=Object.freeze([
 '/game/v1/meta','/game/v1/ready',
 '/mesh/v1/meta','/mesh/v1/ready','/mesh/v2/meta',
 '/market/v1/meta','/market/v1/ready','/market/v1/persistence',
 '/zezu/v1/meta','/zezu/v1/ready'
]);
export const PUBLIC_ORGAN_ROUTES=paths;
const MAX=65536;
export async function getPublicOrgan({path:pathname,origin=EXPECTED_ORIGIN,transport=fetch,signal}={}){
 insist(origin===EXPECTED_ORIGIN,'PINNED_ORIGIN_REQUIRED');
 insist(paths.includes(pathname),'UNKNOWN_OR_SENSITIVE_ENDPOINT');
 insist(typeof transport==='function','TRANSPORT_REQUIRED');
 const url=origin+pathname;
 const response=await transport(url,{method:'GET',headers:{accept:'application/json'},redirect:'manual',signal});
 insist(response&&response.status===200,'HTTP_'+(response?.status||'INVALID'));
 insist(String(response.url||url)===url,'REDIRECT_OR_WRONG_HOST');
 insist((response.headers?.get('content-type')||'').toLowerCase().includes('application/json'),'JSON_REQUIRED');
 const declared=response.headers?.get('content-length');
 if(declared!==null&&declared!==undefined&&Number(declared)>MAX)fail('OVERSIZED_HEADER');
 const reader=response.body?.getReader();insist(reader,'STREAM_REQUIRED');
 let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){await reader.cancel();fail('OVERSIZED_BODY')}chunks.push(Buffer.from(value));}}finally{reader.releaseLock()}
 let obj;try{obj=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail('MALFORMED_JSON')}
 insist(object(obj)&&obj.ok===true,'NOT_OK');
 return obj;
}
function validateResponses(x){
 insist(Object.keys(x).length===paths.length&&paths.every(p=>object(x[p])),'MISSING_ORGAN_PROOF');
 const game=x['/game/v1/meta'],gameReady=x['/game/v1/ready'];
 insist(game.root==='JM CLOUD CONTACT SERVER v0.5.1-hosted','GAME_DONOR_MISMATCH');
 insist(typeof game.schema==='string'&&Array.isArray(game.organs)&&game.organs.includes('matchmaking'),'GAME_ORGAN_MISSING');
 insist(gameReady.ready===true&&Number.isInteger(gameReady.players)&&Number.isInteger(gameReady.matches)&&Number.isInteger(gameReady.clans),'GAME_NOT_READY');
 const mesh=x['/mesh/v1/meta'],meshReady=x['/mesh/v1/ready'],meshV2=x['/mesh/v2/meta'];
 insist(mesh.keeper==='MESH ≠ MERGE'&&mesh.cloudRoot==='/v5'&&Array.isArray(mesh.mountedBodies),'MESH_V1_MISSING');
 insist(meshReady.ready===true&&Number.isInteger(meshReady.authusers)&&Number.isInteger(meshReady.workspaces),'MESH_NOT_READY');
 insist(meshV2.keeper==='MESH ≠ MERGE'&&meshV2.packetSchema==='jm.packet/1.0'&&Array.isArray(meshV2.mountedBodies),'MESH_V2_MISSING');
 const market=x['/market/v1/meta'],marketReady=x['/market/v1/ready'],persistence=x['/market/v1/persistence'];
 insist(market.schema==='JM.MarketEcosystemLab.HostedProfile/0.41'&&market.cloudRoot==='JM CLOUD CONTACT SERVER v0.5.1-hosted','MARKET_DONOR_MISMATCH');
 insist(marketReady.ready===true&&marketReady.page===true&&Number.isInteger(marketReady.supportedPairs)&&marketReady.supportedPairs>0,'MARKET_NOT_READY');
 insist(typeof persistence.mode==='string'&&typeof persistence.durable==='boolean'&&typeof persistence.databaseConfigured==='boolean','MARKET_PERSISTENCE_STATUS_MISSING');
 const zezu=x['/zezu/v1/meta'],zezuReady=x['/zezu/v1/ready'];
 insist(typeof zezu.schema==='string'&&typeof zezu.manifestSchema==='string'&&Array.isArray(zezu.admissions),'ZEZU_MANIFEST_MISSING');
 insist(zezuReady.ready===true&&Number.isInteger(zezuReady.admitted),'ZEZU_NOT_READY');
 // No complete response bodies, identifiers, witness data, raw objects, credentials or URLs in receipt.
 return {
  cloud:{sourceCommitFromRenderMetadata:DONOR_COMMIT,origin:EXPECTED_ORIGIN},
  game:{ready:true,hasMatchingOrgan:true,playerCount:gameReady.players,matchCount:gameReady.matches},
  mesh:{ready:true,v1:true,v2:true,meshNotMerge:true,workspaceCount:meshReady.workspaces},
  market:{ready:true,profile:'HostedProfile/0.41',supportedPairs:marketReady.supportedPairs,persistenceMode:persistence.mode,databaseConfigured:persistence.databaseConfigured,durableClaimFromPublicAPI:persistence.durable},
  zezu:{ready:true,admitted:zezuReady.admitted,bootErrorCount:Array.isArray(zezuReady.boot?.errors)?zezuReady.boot.errors.length:null}
 };
}
export function validatePublicOrganFixture(responses){return validateResponses(responses)};
export async function probeOriginalPublicOrgans({origin=EXPECTED_ORIGIN,transport=fetch,timeoutMs=110000,probeParent=probePublicCloudContact}={}){
 insist(origin===EXPECTED_ORIGIN,'PINNED_ORIGIN_REQUIRED');
 insist(typeof transport==='function'&&typeof probeParent==='function','TRANSPORT_REQUIRED');
 insist(Number.isInteger(timeoutMs)&&timeoutMs>=1000&&timeoutMs<=180000,'BAD_TIMEOUT');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{
  // CP14 proof must remain in force, not bypassed by a successful organ path.
  const original=await probeParent({origin,transport,timeoutMs:Math.min(timeoutMs,120000)});
  insist(original?.ok===true&&original.ready?.ready===true,'CP14_PARENT_NOT_READY');
  const records={};for(const pathname of paths)records[pathname]=await getPublicOrgan({path:pathname,origin,transport,signal:ctl.signal});
  const organs=validateResponses(records);
  return {ok:true,scope:'PUBLIC_READ_ONLY_FIVE_ORGAN_CONTACT_NOT_STATE_RECOVERY',original:{ready:true,version:original.ready.version,signerId:original.key?.keyId},organs,pathsChecked:paths.length,limits:['PUBLIC_METADATA_ONLY','NO_AUTHENTICATION','NO_PRIVATE_STATE','NO_POST_OR_WRITE','NO_DATABASE_INSPECTION','MARKET_DURABLE_FIELD_IS_SELF_REPORT_ONLY','NO_OWNER_DEVICE','NO_HARDWARE_CONTACT','NO_OFFSITE_CUSTODY','NO_MERGE_OR_DEPLOY']};
 }finally{clearTimeout(timer)}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 probeOriginalPublicOrgans().then(x=>console.log(JSON.stringify(x))).catch(e=>{const m=String(e.message||'');console.error(JSON.stringify({ok:false,scope:'CP15_REAL_PUBLIC_CONTACT_HOLD',reason:m.startsWith('CP15_')?m:'CP15_NETWORK_OR_TIMEOUT_HOLD'}));process.exitCode=1});
}
