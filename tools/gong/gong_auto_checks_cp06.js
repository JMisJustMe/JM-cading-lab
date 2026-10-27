#!/usr/bin/env node
/* JM GONG CP06/v1.0 — PUBLIC-SAFE minimum-check executor.
 * Uses immutable source-diff advisory + candidate family plan; no private Fold evidence.
 * Syntax/parse checks DO NOT prove correct behaviour or phone execution.
 * No change to existing release gates, no merge or deployment authority.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const H=x=>crypto.createHash('sha256').update(x).digest('hex');
const SHA=/^[0-9a-f]{64}$/;
function verifyRecord(r,schema){if(!r||r.schema!==schema||!SHA.test(r.digest||''))throw Error('INVALID_RECEIPT_SCHEMA');const {digest,...rest}=r;if(H(JSON.stringify(rest))!==digest)throw Error('TAMPERED_INPUT_RECEIPT');}
function safePath(cwd,p){if(!p||typeof p!=='string'||path.isAbsolute(p)||p.includes('\\')||p.split('/').some(x=>x==='..'||!x)||p.includes('\0'))throw Error('UNSAFE_CHANGED_PATH');const root=path.resolve(cwd),f=path.resolve(root,p);if(!f.startsWith(root+path.sep))throw Error('OUT_OF_ROOT');let cur=f;while(cur!==root){const s=fs.lstatSync(cur);if(s.isSymbolicLink())throw Error('SYMLINK_SOURCE');cur=path.dirname(cur);}const stat=fs.statSync(f);if(!stat.isFile()||stat.size>15*1024*1024)throw Error('UNSAFE_SOURCE');return f;}
const DIRECT=new Set(['TARGETED_INPUT_TOUCH_CHECK','TARGETED_SAVED_STATE_CHECK','TARGETED_TRANSPORT_CHECK','TARGETED_IMPORT_EXPORT_CHECK','TARGETED_PERMISSION_CHECK','TARGETED_NATIVE_INSTALL_CHECK','LOCAL_RENDERER_CHECK_THEN_DEVICE_IF_NEEDED','TARGETED_STRUCTURE_AND_UNKNOWN_TRIAGE','OFFLINE_CACHE_LIFECYCLE_CHECK','LOCAL_LAYOUT_AND_ORIENTATION_CHECK']);
function minimumCheck(sourcePath,cwd){
 const ext=path.extname(sourcePath).toLowerCase();let command='NONE',tested=false;
 let file;try{file=safePath(cwd,sourcePath);}catch(e){return {result:'HOLD',check:'SOURCE_UNAVAILABLE_OR_UNSAFE',reason:e.message,executed:false};}
 if(['.js','.mjs','.cjs'].includes(ext))command='NODE_SYNTAX';
 else if(ext==='.json')command='JSON_PARSE';
 else if(ext==='.py')command='PYTHON_AST_PARSE';
 else if(['.html','.htm','.css','.yml','.yaml','.md','.txt','.gd','.kt','.java','.rs','.tsx','.ts','.vue'].includes(ext))return {result:'NOT_APPLICABLE',check:'NO_SAFE_SYNTAX_CHECKER_FOR_SOURCE_TYPE',executed:false};
 else return {result:'NOT_APPLICABLE',check:'UNKNOWN_SOURCE_CHECKER',executed:false};
 try{
   if(command==='JSON_PARSE'){JSON.parse(fs.readFileSync(file,'utf8'));tested=true;}
   else {
     const result=command==='NODE_SYNTAX'?cp.spawnSync('node',['--check',file],{encoding:'utf8',timeout:10000,maxBuffer:100000}):
       cp.spawnSync('python3',['-c','import ast,sys; ast.parse(open(sys.argv[1],encoding="utf-8").read())',file],{encoding:'utf8',timeout:10000,maxBuffer:100000});
     if(result.status!==0||result.error)return {result:'HOLD',check:command,executed:true,reason:String(result.stderr||result.error?.message||'CHECK_FAILED').slice(0,300)};
     tested=true;
   }
   return {result:'PASS',check:command,executed:tested,boundary:'Only syntax or parse, not behaviour and not physical phone pass'};
 }catch(e){return {result:'HOLD',check:command,executed:tested,reason:String(e.message).slice(0,200)};}
}
function run({plan,advisory,cwd=process.cwd()}={}){
 verifyRecord(plan,'JM_GONG_CP05_PUBLIC_FAMILY_LANE_PLAN_v1');verifyRecord(advisory,'JM_GONG_CP03_READONLY_ADVISORY_v1');
 if(plan.publicPrivateEvidenceContents!==false||plan.sourceFamilyVerification!=='PRIVATE_SOVEREIGN_AUTHORITY_PENDING'||plan.physicalFoldRun!==false||plan.descendantFoldPass!==false||plan.releaseAuthorized!==false||advisory.governance?.ownerDevicePassClaimed!==false||advisory.governance.physicalFoldTestPerformed!==false)throw Error('PROOF_INFLATION');
 if(!Array.isArray(plan.changedScopes)||!Array.isArray(advisory.changedFiles)||plan.changedScopes.length!==advisory.changedFiles.length)throw Error('FILE_MISMATCH');
 const map=new Map(advisory.changedFiles.map(r=>[r.path,r]));if(map.size!==advisory.changedFiles.length)throw Error('DUPLICATE_ADVISORY_PATH');
 const results=[];
 for(const row of plan.changedScopes){
   const prior=map.get(row.path);if(!prior||JSON.stringify(prior.changes)!==JSON.stringify(row.risks)||row.actualSovereignFamilyResolved!==false||row.knownPhysicalDeviceProof!==false||row.privateEvidenceLookupRequired!==true)throw Error('FAMILY_SOURCE_PROOF_CONFLICT');
   const checks=Array.isArray(row.minimumChecks)?row.minimumChecks:[];
   if(checks.some(x=>typeof x!=='string'||x.length>90))throw Error('INVALID_CHECK_ROUTE');
   // For each changed path, perform only a harmless checker if the new file is present.
   const parsed=prior.kind==='D'?{result:'NOT_APPLICABLE',check:'DELETED_SOURCE',executed:false}:minimumCheck(row.path,cwd);
   const required=checks.filter(x=>DIRECT.has(x));
   results.push({path:row.path,kind:prior.kind,sourceCandidateLane:row.candidateLane,sovereignIdentityVerified:false,
     safeCheck:parsed,additionalScopedChecks:checks,stillRequiresPrivateEvidence:true,
     directSensitiveScope:required.length>0,physicalDeviceTestPerformed:false,devicePass:false,
     sourceCodeCorrectnessProven:false});
 }
 const summary={parsedPassed:results.filter(x=>x.safeCheck.result==='PASS').length,parsedHeld:results.filter(x=>x.safeCheck.result==='HOLD').length,scopedContactPending:results.filter(x=>x.directSensitiveScope).length,sourceFilesReviewed:results.length};
 const data={schema:'JM_GONG_CP06_PUBLIC_AUTO_CHECK_v1',cp05Digest:plan.digest,cp03Digest:advisory.digest,head:advisory.head,base:advisory.base,mode:'READ_ONLY_MINIMUM_SYNTAX_ROUTE',counts:summary,results,
   claims:{privateEvidenceImported:false,deviceRun:false,foldPass:false,releaseAuthorized:false,automaticMerge:false,actualSovereignIdentityVerified:false},
   boundary:'Safe parse checks only; new touch/storage/network/native behaviour still requires scoped direct proof. Public CI cannot inherit private Fold evidence.'};
 return {...data,digest:H(JSON.stringify(data))};
}
function main(args){const o={};for(let i=0;i<args.length;i++){if(!['--cp03','--cp05','--json','--cwd'].includes(args[i])||!args[i+1])throw Error('BAD_ARGUMENT');o[args[i].slice(2)]=args[++i];}if(!o.cp03||!o.cp05)throw Error('MISSING_CP03_CP05');const output=run({advisory:JSON.parse(fs.readFileSync(o.cp03)),plan:JSON.parse(fs.readFileSync(o.cp05)),cwd:o.cwd||process.cwd()});if(o.json){fs.mkdirSync(path.dirname(o.json),{recursive:true});fs.writeFileSync(o.json,JSON.stringify(output,null,2)+'\n');}else process.stdout.write(JSON.stringify(output,null,2)+'\n');console.error('GONG_CP06 PUBLIC',JSON.stringify(output.counts));return output;}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('GONG_CP06_PUBLIC_HOLD '+e.message);process.exitCode=3;}}
module.exports={run,minimumCheck,safePath,verifyRecord,main};