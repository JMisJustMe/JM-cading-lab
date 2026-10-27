#!/usr/bin/env node
/* GONG CP07: public-safe independent cross-stage receipt concordance.
 * A hash is an integrity checksum, NOT an owner signature or device attestation.
 * No release authorization, merge permission, private evidence or Fold PASS.
 */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const H=x=>crypto.createHash('sha256').update(x).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
const schemas=['JM_GONG_CP03_READONLY_ADVISORY_v1','JM_GONG_CP04_PUBLIC_SCOPE_REQUEST_v1','JM_GONG_CP05_PUBLIC_FAMILY_LANE_PLAN_v1','JM_GONG_CP06_PUBLIC_AUTO_CHECK_v1'];
function verify(r,schema){
 if(!r||r.schema!==schema||!SHA.test(r.digest||''))throw Error('BAD_STAGE_SCHEMA_OR_DIGEST');
 const {digest,...body}=r;if(H(JSON.stringify(body))!==digest)throw Error('STAGE_TAMPER');
}
function rejectPublicInflation({cp03:a,cp04:b,cp05:c,cp06:d}){
 if(a.governance?.ownerDevicePassClaimed!==false||a.governance?.physicalFoldTestPerformed!==false||a.governance?.autoInheritanceGranted!==false)throw Error('STAGE3_DEVICE_INFLATION');
 if(b.privateRegistrySupplied!==false||b.formallyInheritedEvidence!==false||b.physicalFoldTestPerformed!==false||b.descendantFoldPass!==false)throw Error('STAGE4_DEVICE_INFLATION');
 if(c.actualSovereignFamilyResolved===true||c.publicPrivateEvidenceContents!==false||c.physicalFoldRun!==false||c.descendantFoldPass!==false||c.releaseAuthorized!==false)throw Error('STAGE5_DEVICE_INFLATION');
 const x=d.claims||{};if(x.privateEvidenceImported!==false||x.deviceRun!==false||x.foldPass!==false||x.releaseAuthorized!==false||x.automaticMerge!==false||x.actualSovereignIdentityVerified!==false)throw Error('STAGE6_DEVICE_INFLATION');
}
function reconcile({cp03:a,cp04:b,cp05:c,cp06:d}){
 [a,b,c,d].forEach((x,i)=>verify(x,schemas[i]));
 rejectPublicInflation({cp03:a,cp04:b,cp05:c,cp06:d});
 if(b.cp03Digest!==a.digest||c.inputDigest!==b.digest||d.cp05Digest!==c.digest||d.cp03Digest!==a.digest)throw Error('BROKEN_DIGEST_ANCESTRY');
 if(b.cp03Base!==a.base||b.cp03Head!==a.head||d.base!==a.base||d.head!==a.head)throw Error('CROSS_COMMIT_REBIND');
 if(!Array.isArray(a.changedFiles)||!Array.isArray(b.changedScopes)||!Array.isArray(c.changedScopes)||!Array.isArray(d.results))throw Error('MISSING_SOURCE_SCOPE_ARRAYS');
 const n=a.changedFiles.length;
 if(n>2000||b.changedScopes.length!==n||c.changedScopes.length!==n||d.results.length!==n||a.changedFileCount!==n||b.changeCount!==n)throw Error('SOURCE_SCOPE_CARDINALITY_MISMATCH');
 const seen=new Set();let parsedPassed=0,parsedHeld=0,scopedPending=0;
 for(let i=0;i<n;i++){
  const x=a.changedFiles[i],y=b.changedScopes[i],z=c.changedScopes[i],w=d.results[i];
  if(!x||!y||!z||!w||typeof x.path!=='string'||!x.path||seen.has(x.path))throw Error('AMBIGUOUS_OR_INVALID_FILE_ID');seen.add(x.path);
  if(y.path!==x.path||z.path!==x.path||w.path!==x.path)throw Error('CROSS_STAGE_FILE_MISMATCH');
  if(x.kind!==w.kind)throw Error('CROSS_STAGE_FILE_OPERATION_MISMATCH');
  if(!Array.isArray(x.changes)||!Array.isArray(y.risks)||!Array.isArray(z.risks)||JSON.stringify(x.changes)!==JSON.stringify(y.risks)||JSON.stringify(x.changes)!==JSON.stringify(z.risks))throw Error('CROSS_STAGE_RISK_MISMATCH');
  if(z.actualSovereignFamilyResolved!==false||z.knownPhysicalDeviceProof!==false||z.privateEvidenceLookupRequired!==true||w.sovereignIdentityVerified!==false||w.stillRequiresPrivateEvidence!==true||w.physicalDeviceTestPerformed!==false||w.devicePass!==false)throw Error('FILE_PROOF_INFLATION');
  if(!Array.isArray(z.minimumChecks)||!Array.isArray(w.additionalScopedChecks)||JSON.stringify(z.minimumChecks)!==JSON.stringify(w.additionalScopedChecks))throw Error('CROSS_STAGE_TEST_ROUTING_MISMATCH');
  if(w.safeCheck?.result==='PASS')parsedPassed++;if(w.safeCheck?.result==='HOLD')parsedHeld++;if(w.directSensitiveScope===true)scopedPending++;
 }
 if(d.counts?.parsedPassed!==parsedPassed||d.counts?.parsedHeld!==parsedHeld||d.counts?.scopedContactPending!==scopedPending||d.counts?.sourceFilesReviewed!==n)throw Error('SUMMARY_RECOUNT_MISMATCH');
 const body={schema:'JM_GONG_CP07_CROSS_STAGE_CONCORDANCE_v1',revision:a.head,base:a.base,stages:[a.digest,b.digest,c.digest,d.digest],changedFiles:n,verifiedLineage:true,
  localSyntaxPassed:parsedPassed,localSyntaxHeld:parsedHeld,scopedContactPending:scopedPending,physicalFoldPass:false,privateEvidenceImported:false,
  deviceEvidenceResolved:false,mergeReleaseAuthorized:false,advisoryOnly:true,
  boundary:'Verified checksum continuity over public analysis artifacts, not semantic correctness, protected evidence, real device contact or owner cryptographic attestation.'};
 return {...body,digest:H(JSON.stringify(body))};
}
function main(argv){const o={};for(let i=0;i<argv.length;i++){if(!['--cp03','--cp04','--cp05','--cp06','--json'].includes(argv[i])||!argv[i+1])throw Error('BAD_ARG');o[argv[i].slice(2)]=argv[++i];}
 if(!['cp03','cp04','cp05','cp06'].every(x=>o[x]))throw Error('REQUIRE_ALL_FOUR_STAGES');const i={};for(const k of ['cp03','cp04','cp05','cp06'])i[k]=JSON.parse(fs.readFileSync(o[k],'utf8'));
 const p=reconcile(i);const s=JSON.stringify(p,null,2)+'\n';if(o.json){fs.mkdirSync(path.dirname(o.json),{recursive:true});fs.writeFileSync(o.json,s);}else process.stdout.write(s);return p;}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('GONG_CP07_FAIL_CLOSED',e.message);process.exitCode=2;}}
module.exports={reconcile,verify,main};