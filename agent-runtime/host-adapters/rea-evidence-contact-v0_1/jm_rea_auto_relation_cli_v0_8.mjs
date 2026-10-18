#!/usr/bin/env node
/* Private/source-aware REA Evidence to JM IR CLI. Input REA Evidence must
 * already have passed rea evidence-import; cryptographic validation separate.
 * Own source paths and raw code deliberately absent from output. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectGenuineREA} from './jm_rea_auto_relation_ir_v0_8.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export function cli(argv=process.argv.slice(2)){
 if(argv.length===1&&argv[0]==='--help'){
  console.log('node jm_rea_auto_relation_cli_v0_8.mjs --rea /absolute/REAL_REA_RECORD.json --module my_inline_01.js --roots trigger,commitShot --source /absolute/ORIGINAL_PROTECTED_HTML --output /absolute/NEW_JM_IR.json');
  return 0;
 }
 const args={};
 for(let i=0;i<argv.length;i+=2){
  if(!argv[i]?.startsWith('--')||!argv[i+1])throw Error('JM_REA_V08_HOLD:UNKNOWN_CLI_ARGUMENT');
  const k=argv[i].slice(2);if(!['rea','module','roots','source','output'].includes(k)||k in args)
   throw Error('JM_REA_V08_HOLD:UNKNOWN_CLI_ARGUMENT');
  args[k]=argv[i+1];
 }
 if(!['rea','source','output'].every(k=>args[k]&&path.isAbsolute(args[k])))
  throw Error('JM_REA_V08_HOLD:ABSOLUTE_PATH_REQUIRED');
 if(path.resolve(args.output)===path.resolve(args.source)||
    path.resolve(args.output)===path.resolve(args.rea)||
    fs.existsSync(args.output))
  throw Error('JM_REA_V08_HOLD:WRITE_ONCE_RECEIPT_REQUIRED');
 const raw=fs.readFileSync(args.rea),original=fs.readFileSync(args.source);
 if(raw.length>32*1024*1024)throw Error('JM_REA_V08_HOLD:REA_JSON_TOO_LARGE');
 const sourceSHA=sha(original);
 const roots=args.roots?.split(',').filter(Boolean);
 const output=projectGenuineREA(JSON.parse(raw.toString('utf8')),{
   module:args.module,roots,sourceSha256:sourceSHA});
 const report={...output,rea_input_sha256:sha(raw),source_sha256:sourceSHA,
   source_hash_confirmed_against_rea_subject:false,
   rea_evidence_import_performed_here:false};
 if(sha(fs.readFileSync(args.source))!==sourceSHA)throw Error('JM_REA_V08_HOLD:PROTECTED_SOURCE_CHANGED');
 fs.writeFileSync(args.output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('JM_REA_V08_AUTO_IR:',report.selected_census.nodes,'nodes /',
   report.selected_census.edges,'edges');
 return 0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.exitCode=cli();}
 catch(e){console.error(e.message);process.exitCode=2;}
}
