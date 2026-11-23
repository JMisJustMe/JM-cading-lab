import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {IndependentGameRuntime} from './jm_rea_game_application_v0_6.mjs';
import {bindExecutableREA,synthesizeNativeExecutionPlan,
  executeBoundReconstruction} from './jm_rea_evidence_driven_execution_v1_0.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const GAME=path.resolve(HERE,'../../../coding-estate/sovereign-ten/direct/game-native.mjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const digest=sha(fs.readFileSync(GAME));
const hex=n=>n.repeat(64);
const node=(name,k)=>({kind:'function',label:name,node_id:'jsrg_node_'+hex(k),
  identity:{module_path:'game-native.mjs',artifact_sha256:digest,
    source_range:{start:{line:12}}}});
const functions=[node('trigger','a'),node('simulateFrame','b'),node('dispatch','c'),
  node('collide','d'),node('combo','e')];
const edge={source_node_id:functions[0].node_id,target_node_id:functions[1].node_id,
  relation:'calls',resolution:'resolved',relation_id:'jsrg_relation_'+hex('f')};
function fixture(){
 return {evidence_id:'ev_'+hex('a'),provider:{id:'rea-javascript'},
  subject:{digest:{sha256:hex('1')}},
  normalized_result:{graph:{graph_id:'jag_'+hex('2')},
   semantic_graph:{root_artifact_sha256:hex('1'),application_graph_id:'jag_'+hex('2'),
    nodes:structuredClone(functions),relations:[structuredClone(edge)],unknowns:[{why:'unresolved'}]}}};
}
test('REA-verified selected functions produce executable native JM-source-derived plans',()=>{
 const bound=bindExecutableREA(fixture(),{reaValidated:true});
 assert.deepEqual(bound.roots,['trigger','simulateFrame','dispatch','collide','combo']);
 const plan=synthesizeNativeExecutionPlan(bound);
 assert.ok(plan.commands.some(c=>c.type==='trigger'&&c.name==='OpenDoor'));
 assert.ok(plan.commands.some(c=>c.type==='trigger'&&c.name==='CloseDoor'));
 assert.ok(plan.commands.some(c=>c.type==='dispatch'&&c.system==='PlayerInteraction'));
 assert.ok(plan.commands.some(c=>c.type==='frames'&&c.count===61));
 assert.ok(plan.commands.some(c=>c.type==='collision'));
 assert.ok(plan.commands.some(c=>c.type==='combo'));
 assert.equal(bound.original_source_sha256,digest);
 assert.equal(bound.candidate_relations,0);
});
test('independent JM parser+game runtime actually execute REA-selected original game commands',()=>{
 const result=executeBoundReconstruction(fixture(),{reaValidated:true,sessions:12});
 assert.equal(result.sessions,12);
 assert.equal(result.comparisons,12*result.executable_plan.length);
 assert.equal(result.matching,result.comparisons);
 assert.equal(result.mismatches.length,0);
 assert.equal(result.trace_sessions,12);
 assert.equal(result.verdict.sourceLinked,true);
 assert.equal(result.verdict.executionMatched,true);
 assert.equal(result.verdict.promotable,false);
 assert.ok(result.mode_counts.frames>0);
 assert.ok(result.mode_counts.trigger>0);
 assert.ok(result.mode_counts.dispatch>0);
});
test('non-authenticated evidence cannot power native JM execution',()=>{
 assert.throws(()=>executeBoundReconstruction(fixture(),{sessions:1}),
   /JM_REA_V10_HOLD:REAL_REA_EVIDENCE_IMPORT_NOT_ATTESTED/);
});
test('REA method identity forged against different local source is HOLD',()=>{
 const record=fixture();record.normalized_result.semantic_graph.nodes[0].identity.artifact_sha256=hex('0');
 assert.throws(()=>executeBoundReconstruction(record,{reaValidated:true,sessions:1}),
   /JM_REA_V10_HOLD:REA_ORIGINAL_NATIVE_SOURCE_MISMATCH_trigger/);
});
test('REA root with candidate or incorrect graph join is not silently promoted',()=>{
 const record=fixture();record.normalized_result.semantic_graph.application_graph_id='jag_'+hex('3');
 assert.throws(()=>executeBoundReconstruction(record,{reaValidated:true,sessions:1}),
   /JM_REA_V10_HOLD:APPLICATION_SEMANTIC_GRAPH_JOIN/);
});
test('REA lost original native dispatch cannot enter executable plan',()=>{
 const record=fixture();
 record.normalized_result.semantic_graph.nodes=record.normalized_result.semantic_graph.nodes.filter(n=>n.label!=='dispatch');
 assert.throws(()=>executeBoundReconstruction(record,{reaValidated:true,sessions:1}),
   /JM_REA_V10_HOLD:MISSING_OR_AMBIGUOUS_REA_METHOD_dispatch/);
});
test('source-guided independent runtime mutation produces recorded executable divergence',()=>{
 class BrokenIndependent extends IndependentGameRuntime{
  trigger(name){
   const out=super.trigger(name);
   this.state.door.state='corrupted_state';
   return out;
  }
 }
 const result=executeBoundReconstruction(fixture(),{reaValidated:true,sessions:3,replicaClass:BrokenIndependent});
 assert.ok(result.mismatches.length>0);
 assert.equal(result.verdict.executionMatched,false);
 assert.equal(result.verdict.promotable,false);
});
test('session budget cannot become unbounded play-test mission',()=>{
 assert.throws(()=>executeBoundReconstruction(fixture(),{reaValidated:true,sessions:10000}),
   /JM_REA_V10_HOLD:SESSION_BUDGET/);
});


test('bounded mismatch receipts cannot inflate the actual successful execution count',()=>{
 class AlwaysDrifts extends IndependentGameRuntime{
  simulateFrame(){super.simulateFrame();this.state.door.state='drift-at-every-frame';}
  trigger(name){const out=super.trigger(name);this.state.door.state='drift-at-trigger';return out;}
 }
 const proof=executeBoundReconstruction(fixture(),{reaValidated:true,
   sessions:12,replicaClass:AlwaysDrifts});
 assert.ok(proof.comparisons>16);
 assert.equal(proof.mismatches.length,16);
 assert.ok(proof.matching<=proof.comparisons-16);
 assert.equal(proof.verdict.executionMatched,false);
 assert.equal(proof.verdict.promotable,false);
});
