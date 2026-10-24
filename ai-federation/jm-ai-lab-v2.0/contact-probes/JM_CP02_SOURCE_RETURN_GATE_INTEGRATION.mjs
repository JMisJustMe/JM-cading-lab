// CP02: recover the *existing* Mission 002 source-return gate as separate recipient.
// This test checks actual original GitHub CP01 bytes, the ChatGPT read return,
// and source/nonce binding. It does NOT prove independent model identity or Gemini.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const donor=path.join(root,'.cross-ai-gateway');
const donorHead=execFileSync('git',['-C',donor,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(donorHead,'7c84f96b904aefd74dec564e88b21b55e178bc08','Exact inherited gateway donor commit');
const mod=await import(pathToFileURL(path.join(donor,'gateway-remain-v0.3/JM_M002_SOURCE_RETURN_GATE_v0_1.mjs')).href);
const sourcePath=path.join(root,'ai-federation/jm-ai-lab-v2.0/contact-probes/JM_CROSS_AI_CONTACT_CP01_2026-10-22.md');
const sourceBytes=fs.readFileSync(sourcePath);
const report=JSON.parse(fs.readFileSync(path.join(root,'ai-federation/jm-ai-lab-v2.0/contact-probes/JM_CROSS_AI_CP01_CHATGPT_READ_RETURN_2026-10-24.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const digest=sha(sourceBytes);
const originalText=sourceBytes.toString('utf8');
const get=key=>originalText.match(new RegExp('^'+key+': ([^\\r\\n]+)$','m'))?.[1];
const checked=[
 ['exact original challenge',get('PROBE_ID')===report.probe_id],
 ['exact original nonce',get('CONTACT_NONCE')===report.contact_nonce],
 ['exact original return tag',get('RETURN_TAG')===report.return_tag],
 ['not an API-provider report',report.separate_provider_status.actual_model_api_exchange==='NOT_PERFORMED'],
 ['Gemini tool contact remains unverified',report.separate_provider_status.gemini_current_session==='NOT_RUN_UNVERIFIED_BY_THIS_RECEIPT']
];
for(const [name,pass] of checked)assert.ok(pass,name);
const request={schema:mod.REQUEST_SCHEMA,challengeId:report.probe_id,nonce:report.contact_nonce,
source:{fileName:path.basename(sourcePath),bytes:sourceBytes.length,sha256:digest}};
const returned={schema:mod.RETURN_SCHEMA,claimedProvider:'openai',
 challengeId:report.probe_id,nonce:report.contact_nonce,sourceSha256:digest,
 analysis:report.observation+' Build Mesh was contacted through a read-only tool. Gemini was not called.'};
const verify=(q=request,r=returned,b=sourceBytes)=>mod.verifySourceReturn({request:q,returned:r,sourceBytes:b});
const result=verify();
assert.equal(result.status,'SOURCE_RETURN_BYTES_BOUND');
assert.equal(result.localSourceBytesVerified,true);
assert.equal(result.sourceSha256,digest);
assert.equal(result.providerIdentityVerified,false);
assert.equal(result.providerExecutionVerified,false);
assert.equal(result.externalProviderContactVerified,false);
checked.push(['real recovered donor verifier accepted CP01 bytes and ChatGPT return',true]);
checked.push(['donor preserved scoped claim boundaries',true]);
const negatives=[
 ['altered raw source rejected',verify(request,returned,Buffer.from(originalText+'x')).status==='HOLD'],
 ['wrong challenge rejected',verify({...request,challengeId:request.challengeId+'X'}).status==='HOLD'],
 ['wrong nonce rejected',verify(request,{...returned,nonce:'0'.repeat(32)}).status==='HOLD'],
 ['wrong reported hash rejected',verify(request,{...returned,sourceSha256:'0'.repeat(64)}).status==='HOLD'],
 ['overlong response rejected',verify(request,{...returned,analysis:'A'.repeat(2401)}).status==='HOLD']
];
for(const [name,ok] of negatives){assert.ok(ok,name);checked.push([name,true]);}
// Provider-label substitution still binds bytes but NEVER grants provider identity.
const forged=verify(request,{...returned,claimedProvider:'gemini'});
assert.equal(forged.status,'SOURCE_RETURN_BYTES_BOUND');
assert.equal(forged.providerIdentityVerified,false);
assert.equal(forged.externalProviderContactVerified,false);
checked.push(['forged provider name cannot earn Gemini-origin contact',true]);
console.log(JSON.stringify({
 schema:'JM.AI.CP02.ExistingGatewaySourceReturnContact/1',
 status:'PASS',
 checksPassed:checked.length,
 sourceBytes:sourceBytes.length,
 sourceSha256:digest,
 donorGatewayCommit:donorHead,
 donorSourceReturnGate:'JM_M002_SOURCE_RETURN_GATE_v0_1.mjs',
 sourceReturnGateResult:result.status,
 providerIdentityVerified:false,
 externalGeminiRuntimeProven:false,
 externalModelApiCalls:0,
 productionMutations:0,
 checks:checked.map(x=>x[0])
},null,2));
