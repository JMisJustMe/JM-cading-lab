/**
 * Mission 002 CP14 — original Python knowledge ↔ observed Build Mesh ↔
 * CP13 whole-Estate execution, all with independent source and target replay.
 *
 * Untrusted documents NEVER become instructions. This module invokes original
 * JM Knowledge Intake/Assurance/Query/Recipient via fixed Python -c code:
 * no eval of document text, shell interpolation, network, host write or training.
 * Build Mesh status is supplied read-only; no claim of signed source.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {executeEstateFederation,recoverEstateFederation} from './m002-cp13-federated-execution.mjs';
import {reconcileBuildMeshAuthority} from '../../navigator/estate-integration/mesh-authority-reconciliation.mjs';

const REPO=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const SKILL=join(REPO,'.agents/skills/jm-ecostate-route');
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const clone=x=>structuredClone(x);
const PYTHON="import json,sys,hashlib\nfrom pathlib import Path\nsys.path.insert(0,sys.argv[1])\nimport jm_knowledge_intake as intake\nimport jm_knowledge_capability_recipient as recipient\nreq=json.load(sys.stdin)\nsources=[Path(x) for x in req[\"sources\"]]\nworkspace=Path(req[\"workspace\"])\ncandidate=workspace/\"candidate\"\noutput=workspace/\"recipient\"\nintake.compile_sources(sources,candidate,req[\"question\"])\nfirst=recipient.build(candidate,sources,req[\"question\"],output,\n                     top=req[\"top\"],route_existing=req[\"route_existing\"])\nagain=recipient.recover(candidate,sources,output)\nif first!=again or first[\"recovery\"]!=\"PASS_SOURCE_AND_RESULT_REPLAY\":\n  raise RuntimeError(\"JM_ORIGINAL_RECOVERY_HOLD\")\nbytes_evidence=(output/\"EVIDENCE_CARDS.json\").read_bytes()\nm=(output/\"CONTACT_MANIFEST.json\").read_bytes()\nobj=json.loads(bytes_evidence)\nif obj[\"state\"]!=\"HELD\" or obj[\"agent_executed\"] is not False:\n  raise RuntimeError(\"JM_ORIGINAL_EVIDENCE_AUTHORITY_HOLD\")\nprint(json.dumps({\"evidence\":obj,\"originalRecovery\":first,\n \"evidenceSha256\":hashlib.sha256(bytes_evidence).hexdigest(),\n \"manifestSha256\":hashlib.sha256(m).hexdigest(),\n \"originalCandidateManifestSha256\":hashlib.sha256((candidate/\"SHA256_MANIFEST.json\").read_bytes()).hexdigest()},\n sort_keys=True))";
const ALLOWED_PYTHON=/^(python3|python)$/;
function verifiedPythonKnowledge({sources,question,top=3,routeExisting=true,python='python3'}){
 if(!Array.isArray(sources)||sources.length<1||sources.length>12||
   sources.some(x=>typeof x!=='string'||!x||x.length>1000)||
   typeof question!=='string'||!question.trim()||question.length>1200||
   !Number.isInteger(top)||top<1||top>20||
   typeof routeExisting!=='boolean'||!ALLOWED_PYTHON.test(python))
  throw Error('CP14_KNOWLEDGE_INPUT_HOLD');
 const workspace=mkdtempSync(join(tmpdir(),'jm-m002-cp14-'));
 try{
  const run=spawnSync(python,['-c',PYTHON,SKILL],{
   input:JSON.stringify({sources,question,top,route_existing:routeExisting,workspace}),
   cwd:REPO,encoding:'utf8',timeout:90000,maxBuffer:600000,windowsHide:true
  });
  if(run.error||run.status!==0||!run.stdout||run.stdout.length>600000)
   throw Error('CP14_ORIGINAL_PYTHON_CONTACT_HOLD');
  let result;try{result=JSON.parse(run.stdout)}catch{throw Error('CP14_PYTHON_RECEIPT_JSON_HOLD')}
  if(result.evidence?.schema!=='JM.KnowledgeCapabilityRecipient/0.2'||
     result.evidence?.source_integrity!=='CANONICAL_ORIGINAL_REPLAY_PASS'||
     result.evidence?.agent_executed!==false||
     result.evidence?.promotion!=='NOT_ALLOWED'||
     result.originalRecovery?.recovery!=='PASS_SOURCE_AND_RESULT_REPLAY'||
     !/^[0-9a-f]{64}$/.test(result.evidenceSha256)||
     !/^[0-9a-f]{64}$/.test(result.manifestSha256))
   throw Error('CP14_PYTHON_PROOF_SCOPE_HOLD');
  return result;
 }finally{rmSync(workspace,{recursive:true,force:true});}
}
export const CP14_SCOPE=Object.freeze({
 schema:'jm.m002.cp14.original-authority-knowledge-federation/1',
 inherited:['Build Mesh source reconciler PR398','JM Knowledge donor PR410 exact Python sources',
 'Estate CP13 ten-target original native executor and recovery'],
 safeguards:['source-replay before write','untrusted text inert','read-only public mesh','same inputs rerun original JM binaries','CP13 exact native recipients'],
 excludes:['physical Android','cloud mutation or deployed mesh update','model training','truth corroboration',
 'private owner historical corpus certification','published media','automatic GitHub branch merge']
});
export function executeAuthorityKnowledgeFederation({request,receivers,registry,
 sources,question,top=3,routeExisting=true,python='python3',mesh}){
 if(!mesh||!mesh.candidate||!mesh.published||!mesh.hosted)
  throw Error('CP14_MESH_INPUT_HOLD');
 const authority=reconcileBuildMeshAuthority(mesh);
 if(!authority.eligibleForReview||authority.mutationPerformed||authority.deploymentPerformed)
  throw Error('CP14_MESH_SOURCE_DRIFT_HOLD');
 if(request?.knowledge!==undefined)throw Error('CP14_UNVERIFIED_KNOWLEDGE_INJECTION_HOLD');
 const knowledge=verifiedPythonKnowledge({sources,question,top,routeExisting,python});
 const prepared={...clone(request),knowledge:knowledge.evidence};
 const federation=executeEstateFederation({request:prepared,receivers,registry});
 if(federation.status!=='EXECUTED_MULTIFAMILY')
  return {schema:'jm.m002.cp14.result/1',status:'HELD_NO_MUTATION',reason:federation.reason,
    envelope:null,mutations:0};
 const proof=recoverEstateFederation(federation.envelope,{request:prepared,receivers,registry});
 if(proof.knowledge.instructionsExecuted!==false||
   proof.knowledge.pythonSourceReplay!=='NOT_RUN_BY_CP13')
  throw Error('CP14_CANONICAL_BOUNDARY_INFLATION_HOLD');
 const body={schema:'jm.m002.cp14.return-body/1',state:'LOCAL_MULTI_SOURCE_REPLAY',
  originalPython:{schema:knowledge.evidence.schema,sourceIntegrity:knowledge.evidence.source_integrity,
   evidenceSha256:knowledge.evidenceSha256,recipientManifestSha256:knowledge.manifestSha256,
   candidateManifestSha256:knowledge.originalCandidateManifestSha256,
   sourceCoverage:knowledge.originalRecovery.jm_documents,
   cards:knowledge.originalRecovery.cards,routeExisting,
   runtimeContact:knowledge.evidence.existing_jm_runtime_contact,
   routeReceiptSha256:knowledge.evidence.route_receipt_sha256,
   quarantinedSourceText:true,sourceTruth:'NOT_ESTABLISHED'},
  publicMesh:{version:authority.directHosted.version,
   registrySha256:authority.directHosted.registrySha256,
   candidateState:authority.candidate.state,publishedState:authority.publicCurrent.state,
   attestation:'CALLER_OBSERVATION_NOT_SIGNED_OR_MUTATING'},
  federationEnvelope:clone(federation.envelope),
  lastNativeTrace:proof.trace,recipientMutationCount:federation.mutations,
  inputDigest:sha({request,receivers,sources,question,top,routeExisting,mesh}),
  promotionsAllowed:false};
 const raw=JSON.stringify(body);
 return {schema:'jm.m002.cp14.result/1',status:'EXECUTED_SOURCE_QUALIFIED_NATIVE_FEDERATION',
  envelope:{schema:'jm.m002.cp14.envelope/1',body:raw,sha256:sha(raw)},
  mutations:federation.mutations,knowledgeCards:knowledge.originalRecovery.cards,
  authorityState:authority.candidate.state,scope:CP14_SCOPE};
}
export function recoverAuthorityKnowledgeFederation(envelope,inputs,seen=[]){
 if(envelope?.schema!=='jm.m002.cp14.envelope/1'||
    typeof envelope.body!=='string'||envelope.body.length>2400000||
    !/^[a-f0-9]{64}$/.test(envelope.sha256||'')||sha(envelope.body)!==envelope.sha256)
  throw Error('CP14_ENVELOPE_HASH_HOLD');
 if(seen.includes(envelope.sha256))throw Error('CP14_REPLAY_ALREADY_APPLIED_HOLD');
 const rebuilt=executeAuthorityKnowledgeFederation(inputs);
 if(rebuilt.status!=='EXECUTED_SOURCE_QUALIFIED_NATIVE_FEDERATION'||
   rebuilt.envelope.body!==envelope.body)
   throw Error('CP14_ORIGINAL_SOURCE_OR_EXECUTION_DRIFT_HOLD');
 return {schema:'jm.m002.cp14.return/1',status:'PYTHON_AND_NATIVE_INDEPENDENT_REPLAY_PASS',
  envelopeSha256:envelope.sha256,knowledgeCards:rebuilt.knowledgeCards,
  sourceIntegrity:'CANONICAL_PYTHON_REPLAY_EXECUTED',
  nativeReceipt:JSON.parse(envelope.body).lastNativeTrace,
  meshReviewOnly:true,seen:[...seen,envelope.sha256],scope:CP14_SCOPE};
}
