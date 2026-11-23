import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {functionReplay} from './jm_rea_function_replay.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SOURCE=path.resolve(HERE,'../../../coding-estate/integration/router-core.mjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const node=(n,line,id)=>({kind:'function',label:n,node_id:'jsrg_node_'+id.repeat(64),
  identity:{module_path:'router-core.mjs',source_range:{start:{line,column:0}}}});
function fixture(){
 const rows=fs.readFileSync(SOURCE,'utf8').split(/\r?\n/);
 const line=n=>rows.findIndex(s=>s.startsWith('export function '+n+'('))+1;
 return {normalized_result:{semantic_graph:{nodes:[
    node('normalise',line('normalise'),'a'),
    node('compatibilityBetween',line('compatibilityBetween'),'b'),
    node('scoreBody',line('scoreBody'),'c'),
    node('planEstateRoute',line('planEstateRoute'),'d')
   ],relations:[]}}};
}
test('genuine original JM exported functions match independent source-guided replicas',()=>{
 const result=functionReplay(fixture(),SOURCE);
 assert.equal(result.anchors.length,4);
 assert.equal(result.failed,0);
 assert.ok(result.fixture_count>250);
 assert.equal(result.matched,result.fixture_count);
 assert.equal(result.trace_events,result.fixture_count);
 assert.equal(result.source_sha256,hash(fs.readFileSync(SOURCE)));
 assert.equal(result.jm32_verdict.promotable,false);
 assert.equal(result.jm32_verdict.anchored,true);
});
test('mutated reconstruction exposes mismatch without promotion',()=>{
 const result=functionReplay(fixture(),SOURCE,{tokensReplica:()=>['wrong']});
 assert.ok(result.failed>0);
 assert.ok(result.matched<result.fixture_count);
 assert.equal(result.jm32_verdict.promotable,false);
 assert.ok(result.mismatches.some(m=>m.name==='normalise'));
});
test('REA graph cannot anchor function in a wrong source location',()=>{
 const f=fixture();f.normalized_result.semantic_graph.nodes[0].identity.source_range.start.line+=1;
 assert.throws(()=>functionReplay(f,SOURCE),/JM_FUNCTION_HOLD:REA_ANCHOR_normalise/);
});
test('REA must contain the exact named public JM function identity',()=>{
 const f=fixture();f.normalized_result.semantic_graph.nodes[0].label='unknown';
 assert.throws(()=>functionReplay(f,SOURCE),/JM_FUNCTION_HOLD:REA_ANCHOR_normalise/);
});

test('standalone CLI produces write-once scoped receipt and protects source input',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-rea-replay-cli-'));
 try{
  const input=path.join(dir,'rea.fixture.json'),output=path.join(dir,'receipt.json');
  const source=JSON.stringify(fixture());fs.writeFileSync(input,source);
  const file=path.join(HERE,'jm_rea_function_replay_cli.mjs');
  const args=[file,'--rea',input,'--output',output,'--expect-input-sha256',hash(source)];
  const first=spawnSync(process.execPath,args,{encoding:'utf8',timeout:30000});
  assert.equal(first.status,0,first.stderr);
  const result=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(result.failed,0);
  assert.ok(result.fixture_count>250);
  assert.equal(result.rea_input_sha256,hash(source));
  assert.equal(result.rea_self_validation_attached,false);
  const old=fs.readFileSync(output,'utf8');
  const second=spawnSync(process.execPath,args,{encoding:'utf8',timeout:30000});
  assert.notEqual(second.status,0);
  assert.equal(fs.readFileSync(output,'utf8'),old);
  assert.equal(fs.readFileSync(input,'utf8'),source);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('standalone CLI rejects incorrect upstream digest before writing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-rea-replay-cli-'));
 try{
  const input=path.join(dir,'rea.json'),out=path.join(dir,'out.json');
  fs.writeFileSync(input,JSON.stringify(fixture()));
  const r=spawnSync(process.execPath,[path.join(HERE,'jm_rea_function_replay_cli.mjs'),
     '--rea',input,'--output',out,'--expect-input-sha256','0'.repeat(64)],
     {encoding:'utf8',timeout:30000});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/EXPECTED_REA_INPUT_DIGEST_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
