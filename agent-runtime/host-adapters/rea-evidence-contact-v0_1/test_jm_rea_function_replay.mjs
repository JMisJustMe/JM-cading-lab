import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
    node('compatibilityBetween',line('compatibilityBetween'),'b')
   ],relations:[]}}};
}
test('genuine original JM exported functions match independent source-guided replicas',()=>{
 const result=functionReplay(fixture(),SOURCE);
 assert.equal(result.anchors.length,2);
 assert.equal(result.failed,0);
 assert.ok(result.fixture_count>135);
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
