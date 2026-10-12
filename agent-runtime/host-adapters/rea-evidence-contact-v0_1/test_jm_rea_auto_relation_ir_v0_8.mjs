import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGenuineREA} from './jm_rea_auto_relation_ir_v0_8.mjs';
const h=n=>n.repeat(64);
const id=n=>'jsrg_node_'+h(n);
const rel=n=>'jsrg_relation_'+h(n);
const gsha=h('e');
const node=(key,name,mod='game-native.mjs')=>({
  node_id:id(key),kind:'function',label:name,
  identity:{module_path:mod,source_range:{start:{line:10}}}
});
function fixture(){
 return {evidence_id:'ev_'+h('a'),provider:{id:'rea-javascript'},
   normalized_result:{graph:{graph_id:'jag_'+h('f')},
   semantic_graph:{application_graph_id:'jag_'+h('f'),
    nodes:[node('a','trigger'),node('b','applyAction','native-core.mjs'),node('c','dispatch')],
    relations:[{relation_id:rel('a'),source_node_id:id('a'),target_node_id:id('b'),
     relation:'calls',resolution:'resolved'},
     {relation_id:rel('b'),source_node_id:id('a'),target_node_id:id('c'),
      relation:'aliases',resolution:'candidate'}],
    unknowns:[{id:'unresolved'}]}}};
}
const opts={module:'game-native.mjs',roots:['trigger'],sourceSha256:gsha};
test('original JM32+TraceBox automatically project bounded genuine REA graph shape',()=>{
 const result=projectGenuineREA(fixture(),opts);
 assert.equal(result.schema,'JM.REA.StaticRelationRepresentation/0.8');
 assert.equal(result.analysis_engine,'REA_RECORD_SOURCE_GRAPH');
 assert.equal(result.selected_census.nodes,3);
 assert.equal(result.selected_census.edges,2);
 assert.equal(result.selected_census.candidates,1);
 assert.equal(result.input_census.unknowns,1);
 assert.equal(result.trace_events,2);
 assert.equal(result.gate.graphAttached,true);
 assert.equal(result.gate.promotable,false);
 assert.equal(result.source_digest_binding,'CALLER_PROVIDED_NOT_REA_CRYPTO_PROOF');
 assert.ok(result.nodes.every(x=>!x.identity_sha256.includes('jsrg_')));
});
test('bounded projection refuses missing exact JM original function',()=>{
 assert.throws(()=>projectGenuineREA(fixture(),{...opts,roots:['unknown']}),/MISSING_OR_AMBIGUOUS_ORIGINAL_ROOT_unknown/);
});
test('bounded projection refuses a dangling REA semantic target instead of fabricating a relationship',()=>{
 const f=fixture();f.normalized_result.semantic_graph.relations[0].target_node_id=id('d');
 assert.throws(()=>projectGenuineREA(f,opts),/DANGLING_REA_RELATION/);
});
test('candidate never silently becomes resolved',()=>{
 const result=projectGenuineREA(fixture(),opts);
 const candidate=result.edges.filter(x=>x.resolution==='candidate');
 assert.equal(candidate.length,1);
 assert.equal(candidate[0].relation,'aliases');
});
test('depth and budget caps explicitly bound the static graph',()=>{
 const r=projectGenuineREA(fixture(),{...opts,maxEdges:1});
 assert.equal(r.selected_census.edges,1);
 assert.equal(r.limits.hit,true);
});
test('authored source SHA and original REA record type are mandatory',()=>{
 assert.throws(()=>projectGenuineREA(fixture(),{...opts,sourceSha256:'0'}),/ORIGINAL_SOURCE_DIGEST_REQUIRED/);
 assert.throws(()=>projectGenuineREA({...fixture(),evidence_id:'madeup'},opts),/NOT_REA_EVIDENCE_RECORD/);
});
test('never mistake a falsified graph identity for REA',()=>{
 const f=fixture();f.normalized_result.semantic_graph.application_graph_id='jag_'+h('1');
 assert.throws(()=>projectGenuineREA(f,opts),/CROSS_GRAPH_MISMATCH/);
});

test('edge projections remain reference-complete even under hard node budget',()=>{
 const r=projectGenuineREA(fixture(),{...opts,maxNodes:2});
 const nodes=new Set(r.nodes.map(n=>n.identity_sha256));
 assert.ok(r.limits.hit);
 assert.ok(r.edges.every(e=>nodes.has(e.from_sha256)&&nodes.has(e.to_sha256)));
});
