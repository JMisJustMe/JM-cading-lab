import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reconcileBuildMeshAuthority} from '../navigator/estate-integration/mesh-authority-reconciliation.mjs';
const path='navigator/estate-integration/public-registry.json';
const candidate=JSON.parse(fs.readFileSync(path,'utf8'));
const base='https://jm-ecostate-build-mesh-mcp.onrender.com';
const publicUrl='https://jmisjustme-estate.pages.dev/navigator/estate-integration/public-registry.json';
const fetchJSON=async(url,init={})=>{
 const r=await fetch(url,{...init,signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw Error('JM_MESH_HTTP_HOLD:'+r.status+':'+url);
 return r.json();
};
const published=await fetchJSON(publicUrl+'?m002='+Date.now());
const init=await fetchJSON(base+'/mcp',{
 method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
 body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'JM M002 read-only reconciliation',version:'1'}}})
});
assert.equal(init?.result?.serverInfo?.name,'JM ECOSTATE Build Mesh Native MCP','JM_MESH_HOST_IDENTITY_HOLD');
const reply=await fetchJSON(base+'/mcp',{
 method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
 body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'build_mesh_status',arguments:{probe_navigator:false}}})
});
if(reply?.error||reply?.result?.isError||!reply?.result?.structuredContent)throw Error('JM_MESH_REMOTE_STATUS_HOLD');
const hosted=reply.result.structuredContent;
const result=reconcileBuildMeshAuthority({candidate,published,hosted});
assert.equal(result.candidate.state,'SOURCE_RECONCILED_DEPLOY_HOLD');
assert.equal(result.eligibleForReview,true);
assert.equal(result.directHosted.registrySha256,'7debfd83bb13ccebc94acf96978e567ceaf8772272cb1ccbcd0c6931850a5d31');
assert.equal(result.directHosted.registryBytes,27978);
assert.equal(result.directHosted.records,22);
assert.equal(result.directHosted.capabilityProfiles,34);
assert.equal(result.mutationPerformed,false);
assert.equal(result.deploymentPerformed,false);
assert.ok(['PUBLIC_SOURCE_DRIFT','MATCHES_DIRECT_HOSTED'].includes(result.publicCurrent.state));
const copy=x=>structuredClone(x);
const newer=copy(hosted);newer.version='0.9.9';
assert.equal(reconcileBuildMeshAuthority({candidate,published,hosted:newer}).eligibleForReview,false);
const altered=copy(candidate);altered.lineage_seats.find(x=>x.id==='JM-BUILD-MESH-001').authority.hosted_mcp_current='v0.8.6';
assert.equal(reconcileBuildMeshAuthority({candidate:altered,published,hosted}).eligibleForReview,false);
const leaked=copy(candidate);leaked.privacy_boundary.contains_owner_write_endpoint=true;
assert.throws(()=>reconcileBuildMeshAuthority({candidate:leaked,published,hosted}),/PRIVACY_OR_SEAT_HOLD/);
const falseHash=copy(hosted);falseHash.current_registry_sha256='fake';
assert.throws(()=>reconcileBuildMeshAuthority({candidate,published,hosted:falseHash}),/LIVE_STATUS_CONTRACT_HOLD/);
const snapshot={
 ...result,proofSource:'DIRECT_LIVE_MCP_JSONRPC_AND_CANONICAL_PUBLIC_HTTP',
 observedAt:new Date().toISOString(),
 candidateCommit:process.env.GITHUB_SHA||'LOCAL_TEST',
 doNotPromote:'Live matching public-safe metadata is not private source authority or deployment approval.',
 checks:12, status:'PASS_SCOPED_READONLY'
};
fs.mkdirSync('qa/m002-mesh',{recursive:true});
fs.writeFileSync('qa/m002-mesh/live-authority-reconciliation.json',JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify(snapshot));
