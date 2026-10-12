#!/usr/bin/env node
/* JM × REA genuine Evidence → bounded executable original/independent JM test.
 * Requires an actual installed 'rea' CLI; independently executes the upstream
 * rea evidence-import validator before invoking the already-owned JM bodies.
 * Output contains compact hashes, counts and scope only. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {executeBoundReconstruction} from './jm_rea_evidence_driven_execution_v1_0.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const gate=(yes,reason)=>{if(!yes)throw Error('JM_REA_V10_CLI_HOLD:'+reason)};
function safeRead(filename){
 const stat=fs.statSync(filename);
 gate(stat.isFile()&&stat.size>0&&stat.size<64*1024*1024,'EVIDENCE_FILE_SIZE');
 return fs.readFileSync(filename);
}
export function runCLI(argv=process.argv.slice(2)){
 if(argv.length===1&&argv[0]==='--help'){
   console.log('node jm_rea_evidence_driven_cli_v1_0.mjs --rea /absolute/record.json --bundle /absolute/rea_bundle.json --output /absolute/NEW_RECEIPT.json [--rea-bin rea] [--sessions 32]');
   return 0;
 }
 const args={};
 for(let i=0;i<argv.length;i+=2){
   const key=argv[i]?.slice(2),value=argv[i+1];
   gate(argv[i]?.startsWith('--')&&value&&['rea','bundle','output','rea-bin','sessions'].includes(key)
     &&!(key in args),'INVALID_ARGUMENT');
   args[key]=value;
 }
 for(const k of ['rea','bundle','output'])gate(typeof args[k]==='string'&&path.isAbsolute(args[k]),'ABSOLUTE_PATH_'+k);
 const output=path.resolve(args.output);
 gate(output!==path.resolve(args.rea)&&output!==path.resolve(args.bundle)&&!fs.existsSync(output),
   'WRITE_ONCE_OUTPUT');
 const sessions=args.sessions?Number(args.sessions):32;
 gate(Number.isInteger(sessions)&&sessions>=1&&sessions<=128,'SESSION_BUDGET');
 const recordBytes=safeRead(args.rea),bundleBytes=safeRead(args.bundle);
 const record=JSON.parse(recordBytes.toString('utf8'));
 const bundle=JSON.parse(bundleBytes.toString('utf8'));
 gate(bundle?.records?.length===1&&JSON.stringify(bundle.records[0])===JSON.stringify(record),
   'REA_VALIDATOR_BUNDLE_RECORD_NOT_IDENTICAL');
 gate(bundle?.providers?.some(p=>p?.id===record.provider?.id),
   'REA_PROVIDER_NOT_IN_BUNDLE');
 const binary=args['rea-bin']??'rea';
 gate(/^(?:rea|\/[A-Za-z0-9_./-]+)$/.test(binary),'REA_BINARY_PATH_NOT_SAFE');
 // No shell used, and no source displayed. This calls REAL installed REA.
 const validator=spawnSync(binary,['evidence-import',args.bundle],{
   encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});
 gate(!validator.error&&validator.status===0,'ACTUAL_REA_EVIDENCE_IMPORT_FAILED');
 // Native source SHA is checked against REA module node identities inside.
 const result=executeBoundReconstruction(record,{reaValidated:true,sessions});
 gate(result.verdict.executionMatched===true&&result.matching===result.comparisons,
   'INDEPENDENT_JM_EXECUTION_DIVERGENCE');
 const report={...result,
   validation:{source:'REA_CLI_EVIDENCE_IMPORT_EXECUTED_HERE',
     validator_exit_status:validator.status,upstream_bundle_sha256:sha(bundleBytes),
     original_rea_record_sha256:sha(recordBytes)},
   private_source_recovered:false,
   named_recipient_bound:'PUBLIC_ORIGINAL_JM_GAMECORE',
   claim_boundary:'EXACT_REA_PUBLIC_JM_SOURCE_TO_EXISTING_JM_INDEPENDENT_EXECUTABLE_PARITY__NOT_PRIVATE_COMBOUND'};
 // Re-read input to catch any in-place changes while tests were executing.
 gate(sha(safeRead(args.rea))===sha(recordBytes)&&sha(safeRead(args.bundle))===sha(bundleBytes),
   'EVIDENCE_CHANGED_DURING_EXECUTION');
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('JM_REA_V10_REAL_REA_TO_EXECUTABLE_JM: PASS');
 console.log(JSON.stringify({sessions:report.sessions,comparisons:report.comparisons,
   matching:report.matching,frames:report.frames,reoProven:true,
   source:report.named_recipient_bound}));
 return 0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.exitCode=runCLI();}
 catch(error){console.error(error.message);process.exitCode=2;}
}
