#!/usr/bin/env node
/* JM GONG CP05 — PUBLIC SAFE family-lane triage over CP04's scope request.
   Paths suggest which specialty checker might be relevant, NEVER prove family identity.
   Does not read private owner evidence or grant descendant device PASS.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const H=x=>crypto.createHash('sha256').update(x).digest('hex');
const risks=new Set(['touch_routing','input_modality','persistence','network','gpu','viewport','file_access','permission','service_worker','native_packaging','unknown_high_risk','major_structure','security','third_party','cross_origin','styling','markup','text_or_content','unchanged','accessibility','script_logic','media','whitespace_only']);
function lane(p){const x=String(p).toLowerCase();if(x.includes('/.github/workflows/')||x.startsWith('.github/workflows/'))return 'GOVERNED_WORKFLOW';if(/^games?\//.test(x)||x.includes('/games/'))return 'GAME_CANDIDATE';if(x.startsWith('music/')||x.includes('/music/')||x.includes('lyric')||x.includes('beatmaker'))return 'MUSIC_CANDIDATE';if(x.startsWith('visual/')||x.includes('/artwork/')||x.includes('/render/'))return 'VISUAL_CANDIDATE';if(x.startsWith('apps/')||x.startsWith('tools/')||x.startsWith('scripts/'))return 'APP_TOOL_CANDIDATE';return 'UNRESOLVED_PATH_LANE';}
function scoped(ch){const s=new Set(ch);const out=[];
 if(s.has('unknown_high_risk')||s.has('major_structure'))out.push('TARGETED_STRUCTURE_AND_UNKNOWN_TRIAGE');
 if(s.has('touch_routing')||s.has('input_modality'))out.push('TARGETED_INPUT_TOUCH_CHECK');
 if(s.has('viewport'))out.push('LOCAL_LAYOUT_AND_ORIENTATION_CHECK');
 if(s.has('gpu'))out.push('LOCAL_RENDERER_CHECK_THEN_DEVICE_IF_NEEDED');
 if(s.has('persistence'))out.push('TARGETED_SAVED_STATE_CHECK');
 if(s.has('network')||s.has('cross_origin')||s.has('third_party'))out.push('TARGETED_TRANSPORT_CHECK');
 if(s.has('file_access'))out.push('TARGETED_IMPORT_EXPORT_CHECK');
 if(s.has('permission')||s.has('security'))out.push('TARGETED_PERMISSION_CHECK');
 if(s.has('service_worker'))out.push('OFFLINE_CACHE_LIFECYCLE_CHECK');
 if(s.has('native_packaging'))out.push('TARGETED_NATIVE_INSTALL_CHECK');
 if(!out.length&&!s.has('unchanged'))out.push('LOCAL_SOURCE_SMOKE_ONLY');
 return out;
}
function plan(request){
 if(!request||request.schema!=='JM_GONG_CP04_PUBLIC_SCOPE_REQUEST_v1'||!Array.isArray(request.changedScopes)||request.privateRegistrySupplied!==false||request.formallyInheritedEvidence!==false||request.physicalFoldTestPerformed!==false||request.descendantFoldPass!==false)throw Error('UNTRUSTED_CP04_REQUEST');
 const {digest,...body}=request;if(!/^[0-9a-f]{64}$/.test(digest||'')||H(JSON.stringify(body))!==digest)throw Error('CP04_REQUEST_TAMPER');
 const seen=new Set();const assignments=request.changedScopes.map(x=>{
  if(!x||typeof x.path!=='string'||!x.path||x.path.startsWith('/')||x.path.split('/').includes('..')||x.path.includes('\\')||seen.has(x.path))throw Error('UNSAFE_DUPLICATE_PATH');seen.add(x.path);
  if(!Array.isArray(x.risks)||x.risks.some(z=>!risks.has(z)))throw Error('UNKNOWN_RISK_CODE');
  const inferred=lane(x.path), checks=scoped(x.risks);
  return {path:x.path,candidateLane:inferred,actualSovereignFamilyResolved:false,risks:x.risks,minimumChecks:checks,knownPhysicalDeviceProof:false,privateEvidenceLookupRequired:true};
 });
 const doc={schema:'JM_GONG_CP05_PUBLIC_FAMILY_LANE_PLAN_v1',inputDigest:digest,changedScopes:assignments,sourceFamilyVerification:'PRIVATE_SOVEREIGN_AUTHORITY_PENDING',priorDeviceConfidence:'NOT_IMPORTED_IN_PUBLIC_CI',physicalFoldRun:false,descendantFoldPass:false,releaseAuthorized:false,publicPrivateEvidenceContents:false,ownerManualRetestRequiredByDefault:false,rule:'Path is a triage hint, never a source-family claim; compare exact private proof and delta before any recipient-specific continuation.'};return {...doc,digest:H(JSON.stringify(doc))};
}
function main(args){const o={};for(let i=0;i<args.length;i++){if(!['--input','--json'].includes(args[i])||!args[i+1])throw Error('BAD_ARG');o[args[i].slice(2)]=args[++i];}if(!o.input)throw Error('NEED_CP04_JSON');const x=plan(JSON.parse(fs.readFileSync(o.input,'utf8')));if(o.json){fs.mkdirSync(path.dirname(o.json),{recursive:true});fs.writeFileSync(o.json,JSON.stringify(x,null,2)+'\n');}else console.log(JSON.stringify(x,null,2));return x;}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('GONG_CP05_PUBLIC_HOLD',e.message);process.exitCode=3;}}
module.exports={plan,lane,scoped,main};