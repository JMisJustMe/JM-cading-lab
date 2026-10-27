#!/usr/bin/env node
/* JM GONG CP04 — public-safe scope-request projection, no owner proof carried.
 * Protected CP04 source/evidence registry never committed here. Read-only.
 * Copyright (c) JM / Theodore Benjamin Scott; additive to CP03.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const kinds=new Set(['HOLD_TRIAGE','DIRECT_CHANGED_SCOPE','LOCAL_CHECK','INHERITED_UNCHANGED','NO_APPLICABLE_CODE_CHANGE']);
function request(advisory,options={}){
 if(!advisory||advisory.schema!=='JM_GONG_CP03_READONLY_ADVISORY_v1'||!kinds.has(advisory.overall)||!Array.isArray(advisory.changedFiles)||!advisory.digest)throw Error('INVALID_CP03_RECEIPT');
 const {digest,...body}=advisory;if(h(JSON.stringify(body))!==digest)throw Error('CP03_RECEIPT_DIGEST_MISMATCH');
 if(advisory.changedFiles.some(x=>x.devicePassClaimed!==false||x.physicalFoldTestPerformed!==false)||advisory.governance?.ownerDevicePassClaimed!==false)throw Error('DEVICE_PROOF_INFLATION');
 const mode={HOLD_TRIAGE:'TRIAGE_UNKNOWN',DIRECT_CHANGED_SCOPE:'FRESH_SCOPED_CONTACT',LOCAL_CHECK:'LOCAL_REGRESSION_PLUS_EVIDENCE_LOOKUP',INHERITED_UNCHANGED:'EVIDENCE_LOOKUP_ELIGIBLE',NO_APPLICABLE_CODE_CHANGE:'NO_SOURCE_SCOPE'}[advisory.overall];
 const doc={schema:'JM_GONG_CP04_PUBLIC_SCOPE_REQUEST_v1',cp03Digest:digest,cp03Base:advisory.base,cp03Head:advisory.head,changeCount:advisory.changedFileCount,changedScopes:advisory.changedFiles.map(x=>({path:x.path,priority:x.priority,risks:x.changes})),recommendedNext:mode,privateRegistrySupplied:false,formallyInheritedEvidence:false,physicalFoldTestPerformed:false,descendantFoldPass:false,ownerAction:'NONE_BY_DEFAULT',nextAction:mode==='LOCAL_REGRESSION_PLUS_EVIDENCE_LOOKUP'?'Run local change checks and ask protected GONG CP04 registry for exact matching prior scope':mode==='EVIDENCE_LOOKUP_ELIGIBLE'?'Consult protected evidence registry; never auto-crown a Fold PASS':mode==='NO_SOURCE_SCOPE'?'No new recognized source scope; existing production admission still applies':'Test/investigate changed scope without resetting unrelated previously earned functionality',boundaries:['Public CI cannot access owner private Fold receipts','No sovereign DONG route or fresh device PASS is generated','No automatic release/merge authority']};
 return {...doc,digest:h(JSON.stringify(doc))};
}
function verify(x){if(!x||!x.digest)return false;const {digest,...body}=x;return h(JSON.stringify(body))===digest;}
function main(args){let opts={};for(let i=0;i<args.length;i++){if(!['--advisory','--json','--markdown'].includes(args[i])||!args[i+1])throw Error('BAD_ARGUMENT');opts[args[i].slice(2)]=args[++i];}if(!opts.advisory)throw Error('NEED_CP03_ADVISORY');const p=request(JSON.parse(fs.readFileSync(opts.advisory)));if(opts.json){fs.mkdirSync(path.dirname(opts.json),{recursive:true});fs.writeFileSync(opts.json,JSON.stringify(p,null,2)+'\n');}const md=`# JM GONG CP04 — Evidence Scope Request\n\nDecision: **${p.recommendedNext}**\n\nCP03 source digest: \`${p.cp03Digest}\`\n\nOwner Fold PASS: **NOT CLAIMED**. Family evidence must be resolved privately and in exact scope.\n\n${p.nextAction}\n`;if(opts.markdown){fs.mkdirSync(path.dirname(opts.markdown),{recursive:true});fs.writeFileSync(opts.markdown,md);}else if(!opts.json)process.stdout.write(md);return p;}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('GONG_CP04_PUBLIC_HOLD',e.message);process.exitCode=3;}}
module.exports={request,verify,main};