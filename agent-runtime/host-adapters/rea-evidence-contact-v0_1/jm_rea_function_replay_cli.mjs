#!/usr/bin/env node
/* JM × REA v0.4: offline, read-only original-function differential replay CLI. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {functionReplay} from './jm_rea_function_replay.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL=path.resolve(HERE,'../../../coding-estate/integration/router-core.mjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function argument(argv,flag){
 const i=argv.indexOf(flag);
 if(i<0)return null;
 if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error('MISSING_'+flag);
 return argv[i+1];
}
export function runCLI(argv=process.argv.slice(2)){
 const help='Usage: node jm_rea_function_replay_cli.mjs --rea /absolute/REA-Evidence.json --output /absolute/NEW-replay-receipt.json [--expect-input-sha256 HEX]';
 if(argv.includes('--help')){console.log(help);return 0;}
 const input=argument(argv,'--rea'),output=argument(argv,'--output');
 const expected=argument(argv,'--expect-input-sha256');
 const recognised=new Set(['--rea','--output','--expect-input-sha256']);
 for(let i=0;i<argv.length;i+=2){
   if(!recognised.has(argv[i])||argv[i+1]===undefined)throw Error('UNKNOWN_ARGUMENT:'+argv[i]);
 }
 if(!input||!output||!path.isAbsolute(input)||!path.isAbsolute(output))
   throw Error('ABSOLUTE_INPUT_AND_OUTPUT_REQUIRED: '+help);
 if(path.resolve(input)===path.resolve(output))throw Error('SOURCE_AND_RECEIPT_SAME_PATH');
 const stat=fs.lstatSync(input);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)throw Error('INPUT_NOT_REGULAR_OR_TOO_LARGE');
 const bytes=fs.readFileSync(input),digest=sha(bytes);
 if(expected!==null && (!/^[a-f0-9]{64}$/.test(expected)||expected!==digest))
   throw Error('EXPECTED_REA_INPUT_DIGEST_MISMATCH');
 const before=sha(fs.readFileSync(ORIGINAL));
 const replay=functionReplay(JSON.parse(bytes.toString('utf8')),ORIGINAL);
 if(replay.source_sha256!==before||sha(fs.readFileSync(ORIGINAL))!==before)
   throw Error('JM_ORIGINAL_SOURCE_CHANGED_DURING_TEST');
 const report={schema:'JM.REA.StandaloneFunctionReplay/0.4',
   rea_input_sha256:digest,rea_self_validation_attached:false,
   analysis_kind:'SOURCE_GUIDED_EVIDENCE_ANCHORED_DIFFERENTIAL_REPLAY',
   ...replay,
   result:replay.failed===0?'SCOPED_FIXTURE_PARITY_PASS':'SCOPED_FIXTURE_PARITY_HOLD'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(report.result+': cases='+report.fixture_count+' matched='+report.matched+
   ' failed='+report.failed+' receipt='+output);
 return replay.failed===0?0:2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.exitCode=runCLI();}
 catch(error){console.error('JM_REA_REPLAY_HOLD:',error.message);process.exitCode=2;}
}
