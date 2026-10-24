// JM Cross-AI CP02 — immutable original probe and ChatGPT read-return verification.
// Scope: versioned GitHub content/readback; NOT proof that Gemini executed a tool.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const dir=path.join(root,'ai-federation/jm-ai-lab-v2.0/contact-probes');
const original=fs.readFileSync(path.join(dir,'JM_CROSS_AI_CONTACT_CP01_2026-10-22.md'),'utf8');
const guide=fs.readFileSync(path.join(root,'ai-federation/jm-ai-lab-v2.0/CROSS_AI_CONTACT_CREATION_v1.md'),'utf8');
const adapter=fs.readFileSync(path.join(root,'ai-host-contact/GITHUB_HOST_ADAPTER_v0_1.json'),'utf8');
const legacyProbe=fs.readFileSync(path.join(root,'ai-host-contact/REAL_HOST_PROBE_v0_1.txt'),'utf8');
const receipt=JSON.parse(fs.readFileSync(path.join(dir,'JM_CROSS_AI_CP01_CHATGPT_READ_RETURN_2026-10-24.json'),'utf8'));
const shaBlob=s=>{
 const data=Buffer.from(s,'utf8');
 return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length+'\0'),data])).digest('hex');
};
const fields=s=>Object.fromEntries([...s.matchAll(/^(PROBE_ID|CONTACT_NONCE|RETURN_TAG): ([^\r\n]+)$/gm)].map(m=>[m[1],m[2]]));
const checks=[];
function check(label,condition){
 assert.ok(condition,label);
 checks.push(label);
}
function receiptMatches(r,probe=original,g=guide,a=adapter,p=legacyProbe){
 const f=fields(probe);
 return r.schema==='JM.AI.CrossAIContactReadReturn/0.2' &&
 r.probe_id===f.PROBE_ID &&
 r.contact_nonce===f.CONTACT_NONCE &&
 r.return_tag===f.RETURN_TAG &&
 r.original_probe_blob_sha===shaBlob(probe) &&
 r.guide_blob_sha===shaBlob(g) &&
 r.legacy_github_host_adapter_blob_sha===shaBlob(a) &&
 r.legacy_host_contact_probe_blob_sha===shaBlob(p) &&
 r.source_url.includes('/blob/'+r.original_probe_commit+'/') &&
 r.read_stage_state_change==='READ_ONLY' &&
 r.separate_provider_status.gemini_current_session==='NOT_RUN_UNVERIFIED_BY_THIS_RECEIPT' &&
 r.separate_provider_status.actual_model_api_exchange==='NOT_PERFORMED' &&
 r.build_mesh_contact.status==='READ_ONLY_RESPONSE_PASS';
}
check('source schema and exact recovered nonce/ID/tag',receiptMatches(receipt));
check('original immutable probe git blob matches recorded SHA',shaBlob(original)==='128253c5729873cf54ede56bc1272eec3e73b758');
check('guide git blob matches original CP01 inherited guide',shaBlob(guide)==='f1a92a0cdf5c214a7c4b0a3d01ad3693fbd36b9c');
check('GitHub adapter ancestor exact blob',shaBlob(adapter)==='699dc576453cfaa172467c9fcf8f89c9ec58c8a4');
check('old GitHub probe exact blob',shaBlob(legacyProbe)==='07c2f3257a530b1b9c543f2c71e7295541fb7efc');
check('original pinned source commit',receipt.original_probe_commit==='492001a22054a712fa2e7c35bf6a8d71a4f519be');
check('guide explicitly scoped to v1.1',guide.includes('v1.1 · 2026-10-21'));
check('new return declares live ChatGPT connector access',receipt.access_method.includes('GitHub plugin fetch_file'));
check('new return does not promote a Gemini execution',receipt.separate_provider_status.gemini_current_session.startsWith('NOT_RUN'));
check('no live paid-model exchange falsely promoted',receipt.separate_provider_status.actual_model_api_exchange==='NOT_PERFORMED');
check('Build Mesh status is explicitly read only',receipt.build_mesh_contact.actual_tool.endsWith('__build_mesh_status')&&receipt.build_mesh_contact.owner_private_write_exposed===false);
check('new GitHub writeback is separate from original read',receipt.mutation_performed_by_original_read===false);
check('actual relay authority remains a separate draft PR',receipt.separate_provider_status.cross_ai_relay_reference.endsWith('/pull/66'));

const negatives=[
 ['tampered challenge nonce',{...receipt,contact_nonce:'0'.repeat(32)},original,guide,adapter,legacyProbe],
 ['forged original file bytes',receipt,original+'\n',guide,adapter,legacyProbe],
 ['mismatched guide bytes',receipt,original,guide+'\n',adapter,legacyProbe],
 ['forged adapter bytes',receipt,original,guide,adapter+' ',legacyProbe],
 ['counterfeit Gemini PASS',{...receipt,separate_provider_status:{...receipt.separate_provider_status,gemini_current_session:'PASS'}},original,guide,adapter,legacyProbe],
 ['counterfeit API call',{...receipt,separate_provider_status:{...receipt.separate_provider_status,actual_model_api_exchange:'PASS'}},original,guide,adapter,legacyProbe],
 ['unearned write/crown',{...receipt,read_stage_state_change:'PRODUCTION_WRITE'},original,guide,adapter,legacyProbe],
 ['wrong pin',{...receipt,original_probe_commit:'deadbeef'},original,guide,adapter,legacyProbe]
];
for(const [label,r,p,g,a,l] of negatives)check('reject '+label,!receiptMatches(r,p,g,a,l));
console.log(JSON.stringify({
 schema:'JM.AI.CrossAI.CP02.SourceReadbackCI/1',
 status:'PASS',checksPassed:checks.length,checks,
 originalSourceImmutable:true,
 chatgptGitHubReadEvidence:true,
 buildMeshEvidenceIsExternalObservation:true,
 cryptographicModelIdentityAttestation:false,
 geminiProviderExecuted:false,
 externalApiInference:false,
 productionMutation:false
},null,2));
