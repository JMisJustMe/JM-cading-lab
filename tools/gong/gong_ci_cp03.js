#!/usr/bin/env node
/* JM ECOSTATE GONG CP03 · read-only change-scope advisory gate.
 * Retains CP02/CP01 and DONG original bytes. Author: JM / Theodore Benjamin Scott.
 * Never creates a physical Fold PASS, a new DONG, or inheritance by filename resemblance.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const G=require('./public_risk_cp03.js');
const hash=G.H;
const DIRECT=new Set(G.DIRECT), LOCAL=new Set(G.LOCAL), SAFE=new Set(G.SAFE);
const REFS=/^[0-9a-f]{40}$/;
const MAX_FILES=2000,MAX_BYTES=15*1024*1024,MAX_TOTAL=100*1024*1024;
function execGit(args,opts={}) {
 const p=cp.spawnSync('git',args,{cwd:opts.cwd||process.cwd(),encoding:null,timeout:20000,maxBuffer:24*1024*1024});
 if(p.error||p.signal||p.status!==0)throw new Error('GIT_FAILURE '+args[0]+' '+String(p.stderr||'').slice(0,200));
 return p.stdout;
}
function exactCommit(spec,cwd){
 if(!/^[\w./-]{1,160}$/.test(spec)||spec.startsWith('-')||spec.includes('..'))throw Error('BAD_REVISION');
 const sha=String(execGit(['rev-parse','--verify',spec+'^{commit}'],{cwd})).trim();
 if(!REFS.test(sha))throw Error('BAD_SHA');return sha;
}
function isSource(file){return /\.(html?|mjs|cjs|js|css|scss|tsx?|jsx|json|jsonc|vue|svelte|gd|py|java|kt|rs|swift|wasm|apk|aab|so|ya?ml|sh|ps1|toml|gradle|godot)$/i.test(file);}
function names(base,head,cwd){
 const raw=execGit(['diff','--no-renames','--name-status','-z',base,head,'--'],{cwd});
 const bits=raw.toString('utf8').split('\0').filter(Boolean),out=[];
 for(let i=0;i<bits.length;i+=2){const kind=bits[i],p=bits[i+1];
  if(!p||!['A','M','D','T'].includes(kind)||p.includes('\0')||p.includes('\n'))throw Error('UNSUPPORTED_DIFF_STATUS');
  if(p.startsWith('/')||p.split('/').includes('..')||p.startsWith('-'))throw Error('UNSAFE_PATH');
  out.push({kind,path:p});
  if(out.length>MAX_FILES)throw Error('TOO_MANY_CHANGED_FILES');
 }
 return out.sort((a,b)=>a.path.localeCompare(b.path));
}
function gitBlob(rev,p,cwd){
 const info=execGit(['ls-tree',rev,'--',p],{cwd}).toString('utf8').trim();
 const match=/^(100644|100755|120000|160000) (blob|commit) ([a-f0-9]{40})\t/.exec(info);
 if(!match)throw Error('MISSING_GIT_TREE '+p);
 if(match[1]==='120000'||match[1]==='160000')return {type:'UNTRUSTED_LINK',data:null,mode:match[1]};
 const data=execGit(['show',rev+':'+p],{cwd});
 if(data.length>MAX_BYTES)return {type:'OVERSIZE',data:null,bytes:data.length,mode:match[1]};
 return {type:'FILE',data,bytes:data.length,sha:hash(data),mode:match[1]};
}
function classifyOne(entry,base,head,cwd){
 const prev=entry.kind==='A'?null:gitBlob(base,entry.path,cwd);
 const next=entry.kind==='D'?null:gitBlob(head,entry.path,cwd);
 const flags=[];
 if(prev?.type&&prev.type!=='FILE'||next?.type&&next.type!=='FILE')flags.push('unknown_high_risk');
 if(entry.kind==='A'||entry.kind==='D'||entry.kind==='T')flags.push('major_structure');
 if(prev?.mode&&next?.mode&&prev.mode!==next.mode)flags.push('major_structure');
 let analysis={changes:['major_structure'],regions:0,notes:['NEW_DELETED_OR_MODE_CHANGED_ASSET']};
 if(!flags.length&&prev?.data&&next?.data){
  if(!isSource(entry.path))analysis={changes:['media'],regions:1,notes:['UNRECOGNIZED_EXTENSION_MODIFIED']};
  else if(/\.(gd|py|java|kt|rs|swift|ya?ml|sh|ps1|toml|gradle|godot)$/i.test(entry.path))analysis={changes:['unknown_high_risk'],regions:1,notes:['NON_BROWSER_SOURCE_NEEDS_OWN_TEST_LANE']};
  else analysis=G.classify(entry.path,prev.data,next.data);
 }
 const changes=[...new Set([...analysis.changes,...flags])].sort();
 let priority=changes.some(x=>x==='unknown_high_risk')?'HOLD_TRIAGE':changes.some(x=>DIRECT.has(x))?'DIRECT_CHANGED_SCOPE':changes.some(x=>LOCAL.has(x))?'LOCAL_CHECK':changes.every(x=>SAFE.has(x))?'INHERITED_UNCHANGED':'HOLD_TRIAGE';
 return {path:entry.path,kind:entry.kind,before:prev?.sha||null,after:next?.sha||null,modeBefore:prev?.mode||null,modeAfter:next?.mode||null,bytesBefore:prev?.bytes??null,bytesAfter:next?.bytes??null,changes,priority,notes:analysis.notes||[],physicalFoldTestPerformed:false,devicePassClaimed:false};
}
function report(options){
 const cwd=path.resolve(options.cwd||process.cwd());
 const base=exactCommit(options.base,cwd),head=exactCommit(options.head,cwd);
 const entries=names(base,head,cwd),out=[];let total=0;
 for(const e of entries){
  const r=classifyOne(e,base,head,cwd);
  total+=(r.bytesBefore||0)+(r.bytesAfter||0);
  if(total>MAX_TOTAL)throw Error('CHANGED_BYTE_BUDGET_EXCEEDED');
  out.push(r);
 }
 const relevant=out.filter(x=>isSource(x.path));
 const priorityOrder=['HOLD_TRIAGE','DIRECT_CHANGED_SCOPE','LOCAL_CHECK','INHERITED_UNCHANGED'];
 const overall=relevant.length?priorityOrder.find(p=>relevant.some(x=>x.priority===p)):'NO_APPLICABLE_CODE_CHANGE';
 const baseReceipt={schema:'JM_GONG_CP03_READONLY_ADVISORY_v1',base,head,kind:'READ_ONLY_CHANGE_SCOPE_ADVISORY',
  source:'GONG CP03 public-safe conservative projection; protected CP02, CP01 and DONG stay in private Estate',changedFileCount:out.length,applicableCount:relevant.length,
  changedFiles:out,overall,
  governance:{foldCompatibility:'NOT_CERTIFIED_BY_THIS_RECEIPT',provenFamilyRegistry:'NOT_LOADED',ownerDevicePassClaimed:false,
    physicalFoldTestPerformed:false,autoInheritanceGranted:false,releaseGateChanged:false},
  instructions:{HOLD_TRIAGE:'Investigate unknown/structural changes before inheriting confidence',
    DIRECT_CHANGED_SCOPE:'Test only newly changed sensitive behaviour; preserve other proven functionality',
    LOCAL_CHECK:'Run local regression/smoke checks; do not automatically demand another owner Fold test',
    INHERITED_UNCHANGED:'No new change scope detected',NO_APPLICABLE_CODE_CHANGE:'No recognized source file changed'},
  boundary:'Advisory CI analysis only: heuristic changed-file inspection, not semantic equivalence, device execution, or release approval.'};
 const digest=hash(Buffer.from(JSON.stringify(baseReceipt),'utf8'));
 return {...baseReceipt,digest};
}
function markdown(record){
 const cell=x=>String(x).replaceAll('|','\\|').replaceAll('\n',' ');
 const lines=['# 🔔 JM GONG CP03 — read-only PR advisory','',
  '**Decision: '+record.overall+'**','',
  'Base: `'+record.base.slice(0,12)+'` · Head: `'+record.head.slice(0,12)+'` · '+record.applicableCount+' applicable files','',
  '| File | Change | Recommendation |','|---|---|---|',
  ...record.changedFiles.slice(0,80).map(x=>'| `'+cell(x.path)+'` | '+cell(x.changes.join(', '))+' | '+x.priority+' |'),
  '',record.changedFiles.length>80?'Showing first 80 changed files. Full receipt in JSON.':'',
  '**Boundary:** Nothing here confers a new Fold PASS, DONG permission, owner approval or merge authority. Existing tests stay intact.','',
  'SHA-256 receipt digest: `'+record.digest+'`'];
 return lines.filter(Boolean).join('\n')+'\n';
}
function main(argv){
 let o={};for(let i=0;i<argv.length;i++){const k=argv[i];if(!/^--(?:base|head|cwd|json|markdown)$/.test(k)||!argv[i+1])throw Error('BAD_ARGUMENT '+k);o[k.slice(2)]=argv[++i];}
 if(!o.base||!o.head)throw Error('NEED_BASE_AND_HEAD');
 const result=report(o);const json=JSON.stringify(result,null,2)+'\n',md=markdown(result);
 if(o.json){fs.mkdirSync(path.dirname(path.resolve(o.json)),{recursive:true});fs.writeFileSync(o.json,json);}else process.stdout.write(json);
 if(o.markdown){fs.mkdirSync(path.dirname(path.resolve(o.markdown)),{recursive:true});fs.writeFileSync(o.markdown,md);}
 process.stderr.write('GONG_CP03 '+result.overall+' '+result.changedFileCount+' changed files; device PASS not claimed\n');
 return result;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('GONG CP03 ERROR '+e.message+'\n');process.exitCode=3;}}
module.exports={exactCommit,isSource,names,classifyOne,report,markdown,main};