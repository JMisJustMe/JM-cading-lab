// JM CP41 negative tests: all checks invoke the CLI as independent Node processes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const script=new URL('./contact-replay-proof.node.mjs',import.meta.url).pathname;
const cli=process.platform==='win32'?decodeURIComponent(script).replace(/^\/([A-Za-z]:)/,'$1'):decodeURIComponent(script);
const original=process.argv[2];
if(!original)throw Error('PROTECTED_ORIGINAL_REQUIRED');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp41-verifier-'));
let checks=0;
function check(name,fn){try{fn();checks++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e);throw e}}
function run(args,success=true,code=''){
 const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',maxBuffer:2e6});
 if(success){assert.equal(result.status,0,result.stderr);assert(result.stdout.includes('"status": "PASS"'));return JSON.parse(result.stdout)}
 assert.notEqual(result.status,0,'expected rejection');
 assert(result.stderr.includes(code),result.stderr);
 return result;
}
const trace=path.join(dir,'trace.json'),state=path.join(dir,'state'),first=path.join(dir,'first.json'),second=path.join(dir,'second.json');
check('original four-action fixture',()=>assert.equal(run(['fixture',original,trace]).receipts,4));
check('independent inspect process',()=>assert.equal(run(['inspect',original,trace]).intents,4));
const baseline=JSON.parse(fs.readFileSync(trace,'utf8'));
const corrupt=(name,fn,reason='REPLAY_MISMATCH')=>check(name,()=>{
 const x=structuredClone(baseline);fn(x);
 const f=path.join(dir,'mutated_'+checks+'.json');fs.writeFileSync(f,JSON.stringify(x));
 run(['inspect',original,f],false,reason);
});
corrupt('reject fake pressure',x=>x.receipts[0].pressure=999,'REPLAY_MISMATCH_RECEIPTS');
corrupt('reject fake event id',x=>x.receipts[0].eventId='E9999','REPLAY_MISMATCH_RECEIPTS');
corrupt('reject fake lattice coordinate',x=>x.receipts[0].coordinates.source.row=127,'REPLAY_MISMATCH_RECEIPTS');
corrupt('reject fake rupture consequence',x=>x.receipts[0].consequence='rupture_displace','REPLAY_MISMATCH_RECEIPTS');
corrupt('reject altered destination',x=>x.receipts[0].end='7,7','REPLAY_MISMATCH_RECEIPTS');
corrupt('reject altered replay start intent',x=>x.intents[0].dx=-1,'REPLAY_MISMATCH_RECEIPTS');
corrupt('reject altered field tile',x=>x.tiles[0][0].kind='rubble','REPLAY_MISMATCH_TILES');
corrupt('reject altered body',x=>x.body.x=7,'REPLAY_MISMATCH_BODY');
corrupt('reject altered 128x5 lattice',x=>x.lattice[0][0]++,'REPLAY_MISMATCH_LATTICE');
corrupt('reject forged sequence',x=>x.sequence=500,'REPLAY_MISMATCH_SEQUENCE');
corrupt('reject forged QA',x=>x.qa.results[0].pass=false,'BAD_QA');
corrupt('reject forged replay',x=>x.replay.expected=999,'BAD_REPLAY');
corrupt('reject wrong band role',x=>x.canonicalBands.source=[2,16],'BANDS');
corrupt('reject claims of canonical lanes',x=>x.laneMapping='canonical','BANDS');
corrupt('reject wrong protocol',x=>x.protocol='fake','PROTOCOL');
corrupt('reject unknown intent',x=>x.intents[0].kind='admin','INTENT_INVALID');
corrupt('reject extra recover commands',x=>x.intents[1].elevation=1,'INTENT_INVALID');
corrupt('reject forged move mode',x=>x.intents[0].mode='admin','INTENT_INVALID');
corrupt('reject diagonal move',x=>{x.intents[0].dx=1;x.intents[0].dy=1},'INTENT_INVALID');
corrupt('reject missing intents',x=>x.intents=[],'INTENTS_COUNT');
check('reject changed protected original',()=>{
 const f=path.join(dir,'bad-lab.html');fs.writeFileSync(f,fs.readFileSync(original,'utf8')+'\nX');
 run(['inspect',f,trace],false,'SOURCE_SHA');
});
check('sign after independently checked replay',()=>assert.equal(run(['sign',original,trace,state,first]).records,1));
check('valid signature can be verified in fresh process',()=>{
 const x=run(['verify-signature',original,trace,first,path.join(state,'JM_CONTACT_ED25519_PUBLIC.pem')]);
 assert.equal(x.receipts,4);
});
check('DPAPI private signing key is not PEM plaintext',()=>{
 const key=fs.readFileSync(path.join(state,'JM_CONTACT_ED25519_PRIVATE.dpapi'));
 assert(!key.toString('utf8').includes('BEGIN PRIVATE KEY'));
});
check('sign again after process exit reuses same owner key',()=>{
 const r=run(['sign',original,trace,state,second]);assert.equal(r.records,2);
});
check('two-record chain verifies across processes',()=>assert.equal(run(['verify-chain',state]).records,2));
check('modified signature fails verification',()=>{
 const a=JSON.parse(fs.readFileSync(first,'utf8'));
 a.signature=Buffer.alloc(64,1).toString('base64');
 const f=path.join(dir,'bad-signature.json');fs.writeFileSync(f,JSON.stringify(a));
 run(['verify-signature',original,trace,f,path.join(state,'JM_CONTACT_ED25519_PUBLIC.pem')],false,'RECORD_SIGNATURE');
});
check('signed receipt cannot attest altered trace',()=>{
 const x=structuredClone(baseline);x.receipts[0].pressure=999;
 const f=path.join(dir,'bad-while-signed.json');fs.writeFileSync(f,JSON.stringify(x));
 run(['verify-signature',original,f,first,path.join(state,'JM_CONTACT_ED25519_PUBLIC.pem')],false,'REPLAY_MISMATCH_RECEIPTS');
});
const cfile=path.join(state,'JM_CONTACT_PROOF_CHAIN.json'),saved=fs.readFileSync(cfile,'utf8');
check('tampered chain predecessor rejected',()=>{
 const x=JSON.parse(saved);x.entries[1].payload.previousEntry='FAKE';
 fs.writeFileSync(cfile,JSON.stringify(x));run(['verify-chain',state],false,'CHAIN_FORK');fs.writeFileSync(cfile,saved);
});
check('tampered chain head rejected',()=>{
 const x=JSON.parse(saved);x.head='FAKE';
 fs.writeFileSync(cfile,JSON.stringify(x));run(['verify-chain',state],false,'CHAIN_HEAD');fs.writeFileSync(cfile,saved);
});
check('restored chain still verifies',()=>assert.equal(run(['verify-chain',state]).records,2));
const record={schema:'jm.cp41.replay-signature-qa/1',passed:checks,failed:0,source_sha256:'ed72ec0880af89925ab78fe0de125f47613217a3758d9a744dd08420e00c3310',scope:'GroundZeroJM Windows DPAPI; cross-process, not Android or remote proof'};
fs.writeFileSync(path.join(dir,'CP41_SELFTEST_RECEIPT.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({...record,tempEvidence:dir},null,2));
