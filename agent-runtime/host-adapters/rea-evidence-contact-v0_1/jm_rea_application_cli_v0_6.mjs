#!/usr/bin/env node
/* JM × REA v0.6 source/application parity: offline, write-once, source-digested. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyFullSourceAndApplication} from './jm_rea_application_verify_v0_6.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const FILES=[
 'coding-estate/sovereign-ten/direct/game-native.mjs',
 'coding-estate/sovereign-ten/direct/route-proof-native.mjs',
 'coding-estate/sovereign-ten/direct/native-corpus.mjs',
 'coding-estate/sovereign-ten/direct/native-core.mjs',
 'agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_source_parser_v0_6.mjs',
 'agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_game_application_v0_6.mjs',
 'agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_application_verify_v0_6.mjs'
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function run(argv=process.argv.slice(2)){
 if(argv.length===1&&argv[0]==='--help'){
  console.log('node jm_rea_application_cli_v0_6.mjs --output /absolute/NEW-receipt.json [--expect-game-sha256 64hex]');
  return 0;
 }
 let out,expected;
 for(let i=0;i<argv.length;i+=2){
  if(i+1>=argv.length)throw Error('ARGUMENT_VALUE_REQUIRED');
  if(argv[i]==='--output')out=argv[i+1];
  else if(argv[i]==='--expect-game-sha256')expected=argv[i+1];
  else throw Error('UNKNOWN_ARGUMENT');
 }
 if(!out||!path.isAbsolute(out))throw Error('OUTPUT_ABSOLUTE_PATH_REQUIRED');
 if(fs.existsSync(out))throw Error('OUTPUT_ALREADY_EXISTS');
 const before=Object.fromEntries(FILES.map(p=>[p,sha(fs.readFileSync(path.join(ROOT,p)))]));
 if(expected!==undefined&&(!/^[0-9a-f]{64}$/.test(expected)||expected!==before[FILES[0]]))
  throw Error('ORIGINAL_GAME_SOURCE_HASH_HOLD');
 const comparison=verifyFullSourceAndApplication();
 const after=Object.fromEntries(FILES.map(p=>[p,sha(fs.readFileSync(path.join(ROOT,p)))]));
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('SOURCE_CHANGED_DURING_REPLAY');
 const pass=comparison.route_source.ast_and_ir_matches===120&&
  comparison.route_source.consequence_matches===120&&
  comparison.game_sessions.matched===96&&
  comparison.game_sessions.matching_steps===672&&
  comparison.application_source.every(x=>x.ast&&x.lower)&&comparison.mismatches.length===0&&
  comparison.proof.promotable===false;
 const report={schema:'JM.REA.SourceAndApplicationReceipt/0.6',
  result:pass?'SCOPED_MICRO_APPLICATION_PARITY_PASS':'SCOPED_PARITY_HOLD',
  source_digests:before,source_changed:false,comparison,
  external_rea_evidence_validated_in_this_process:false,
  limitation:'JM Sovereign Ten source and micro-application; no physical-device/game-release contact'};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(report.result+' route='+comparison.route_source.ast_and_ir_matches+
  '/120 sessions='+comparison.game_sessions.matched+'/96 steps='+
  comparison.game_sessions.matching_steps+'/672');
 return pass?0:2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.exitCode=run();}
 catch(e){console.error('JM_V06_RECEIPT_HOLD:',e.message);process.exitCode=2;}
}
