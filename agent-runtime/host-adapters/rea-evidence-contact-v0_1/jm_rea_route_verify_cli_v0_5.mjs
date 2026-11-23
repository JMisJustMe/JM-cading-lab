#!/usr/bin/env node
/* JM × REA v0.5 route consequence runner. Source-only, read-only on canonical JM estate. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyRouteConsequences,invalidBytecodeProof,loopProtection} from './jm_rea_route_verify_v0_5.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const SOURCES=[
 'coding-estate/sovereign-ten/direct/route-proof-native.mjs',
 'coding-estate/sovereign-ten/direct/language-native.mjs',
 'coding-estate/sovereign-ten/direct/native-core.mjs',
 'coding-estate/sovereign-ten/direct/native-corpus.mjs',
 'agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_route_consequence_v0_5.mjs',
 'agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_route_verify_v0_5.mjs'
];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export function main(argv=process.argv.slice(2)){
 if(argv.includes('--help')){console.log('Usage: node jm_rea_route_verify_cli_v0_5.mjs --output /absolute/NEW-receipt.json [--expect-route-sha256 HEX]');return 0;}
 let output=null,expect=null;
 for(let i=0;i<argv.length;i+=2){
  if(!argv[i+1])throw Error('MISSING_VALUE:'+argv[i]);
  if(argv[i]==='--output')output=argv[i+1];
  else if(argv[i]==='--expect-route-sha256')expect=argv[i+1];
  else throw Error('UNKNOWN_FLAG:'+argv[i]);
 }
 if(!output||!path.isAbsolute(output))throw Error('NEW_ABSOLUTE_OUTPUT_REQUIRED');
 if(fs.existsSync(output))throw Error('OUTPUT_ALREADY_EXISTS');
 const before=Object.fromEntries(SOURCES.map(p=>[p,sha(fs.readFileSync(path.join(ROOT,p)))]));
 if(expect!==null && ( !/^[a-f0-9]{64}$/.test(expect) ||
   expect!==before[SOURCES[0]]))throw Error('ORIGINAL_SOURCE_HASH_HOLD');
 const comparison=verifyRouteConsequences();
 const bytecode=invalidBytecodeProof(),loop=loopProtection();
 const after=Object.fromEntries(SOURCES.map(p=>[p,sha(fs.readFileSync(path.join(ROOT,p)))]));
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('SOURCE_MUTATION_DETECTED');
 const passed=comparison.failed===0&&comparison.passed===comparison.cases&&
   bytecode.rejected&&loop.both_protected&&!comparison.gate.promotable;
 const report={schema:'JM.REA.NativeRouteReceipt/0.5',status:passed?'SCOPED_ROUTE_EXECUTION_PASS':'HOLD',
   source_digests:before,compared:comparison,guards:{forged_bytecode:bytecode,loop},
   proof_boundary:'ORIGINAL_JM_NATIVE_EXECUTION_VS_INDEPENDENT_LOWERED_GRAPH_RUNNER__NO_OWNER_DEVICE_OR_REA_SOURCE_PROOF',
   original_source_changed:false};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(report.status+': '+comparison.passed+'/'+comparison.cases+' '+output);
 return passed?0:2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.exitCode=main();}
 catch(e){console.error('JM_ROUTE_RECEIPT_HOLD:',e.message);process.exitCode=2;}
}
