import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const cli=path.join(here,'jm_rea_evidence_driven_cli_v1_0.mjs');
function temp(f){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-v10-real-rea-cli-'));
 try{return f(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
function inputs(dir){
 const rea=path.join(dir,'record.json'),bundle=path.join(dir,'bundle.json'),output=path.join(dir,'out.json');
 const record={evidence_id:'ev_fixture',provider:{id:'rea-javascript'}};
 fs.writeFileSync(rea,JSON.stringify(record));
 fs.writeFileSync(bundle,JSON.stringify({providers:[record.provider],records:[record]}));
 return {rea,bundle,output};
}
const call=(args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:30000});
test('the usable REA self-validating CLI has a re-entry command',()=>{
 const r=call(['--help']);
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/--bundle/);
});
test('missing REAL REA executable cannot produce a falsely successful receipt',()=>temp(dir=>{
 const {rea,bundle,output}=inputs(dir);
 const r=call(['--rea',rea,'--bundle',bundle,'--output',output,
   '--rea-bin','/nonexistent/jm-v10-rea-executable']);
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/ACTUAL_REA_EVIDENCE_IMPORT_FAILED/);
 assert.equal(fs.existsSync(output),false);
}));
test('tampered REA bundle cannot transfer external identity into execution',()=>temp(dir=>{
 const {rea,bundle,output}=inputs(dir);
 fs.writeFileSync(bundle,JSON.stringify({providers:[{id:'rea-javascript'}],
   records:[{evidence_id:'ev_other',provider:{id:'rea-javascript'}}]}));
 const r=call(['--rea',rea,'--bundle',bundle,'--output',output]);
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/REA_VALIDATOR_BUNDLE_RECORD_NOT_IDENTICAL/);
 assert.equal(fs.existsSync(output),false);
}));
test('write-once output protection runs before REA even starts',()=>temp(dir=>{
 const {rea,bundle,output}=inputs(dir);
 fs.writeFileSync(output,'protected');
 const r=call(['--rea',rea,'--bundle',bundle,'--output',output]);
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/WRITE_ONCE_OUTPUT/);
 assert.equal(fs.readFileSync(output,'utf8'),'protected');
}));
test('source/bundle file cannot be repurposed as destination',()=>temp(dir=>{
 const {rea,bundle}=inputs(dir);
 const old=fs.readFileSync(rea,'utf8');
 const r=call(['--rea',rea,'--bundle',bundle,'--output',rea]);
 assert.notEqual(r.status,0);
 assert.equal(fs.readFileSync(rea,'utf8'),old);
}));
test('unbounded REA-driven runtime execution is rejected before external contact',()=>temp(dir=>{
 const {rea,bundle,output}=inputs(dir);
 const r=call(['--rea',rea,'--bundle',bundle,'--output',output,'--sessions','9999']);
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/SESSION_BUDGET/);
 assert.equal(fs.existsSync(output),false);
}));
