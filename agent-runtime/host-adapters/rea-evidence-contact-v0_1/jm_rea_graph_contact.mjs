import crypto from 'node:crypto';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
import {TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex').slice(0,24);
const idShape={app:/^jag_node_[0-9a-f]{64}$/,sem:/^jsrg_node_[0-9a-f]{64}$/,edge:/^jag_edge_[0-9a-f]{64}$/,relation:/^jsrg_relation_[0-9a-f]{64}$/};
const hold = (b,why) => {if(!b)throw Error('GRAPH_HOLD:'+why)};
export function contactREAGraphs(source) {
  const b=source?.evidence_bundle??source;
  hold(Array.isArray(b?.records),'NOT_BUNDLE');
  const trace=new TraceBoxRuntime(); trace.create('rea');
  const graphs=[];
  for (const r of b.records) {
    const g=r.normalized_result?.graph, s=r.normalized_result?.semantic_graph;
    if(!g&&!s)continue;
    hold(g&&s&&s.application_graph_id===g.graph_id,'BINDING');
    hold(Array.isArray(g.nodes)&&Array.isArray(g.edges)&&Array.isArray(s.nodes)&&Array.isArray(s.relations)&&Array.isArray(s.unknowns),'SHAPE');
    const ga=new Set(g.nodes.map(x=>x.node_id)),sa=new Set(s.nodes.map(x=>x.node_id));
    hold(g.nodes.every(x=>idShape.app.test(x.node_id))&&s.nodes.every(x=>idShape.sem.test(x.node_id)),'NODE_ID_SHAPE');
    const ge=new Set(g.edges.map(x=>x.edge_id)),se=new Set(s.relations.map(x=>x.relation_id));
    hold(ge.size===g.edges.length && se.size===s.relations.length,'DUPLICATE_RELATION');
    hold(g.edges.every(x=>idShape.edge.test(x.edge_id))&&s.relations.every(x=>idShape.relation.test(x.relation_id)),'RELATION_ID_SHAPE');
    hold(g.edges.every(x=>/^[a-z_]{1,50}$/.test(x.relation))&&s.relations.every(x=>/^[a-z-]{1,50}$/.test(x.relation)),'RELATION_KIND_SHAPE');
    hold(s.relations.every(x=>['candidate','resolved'].includes(x.resolution)),'SEMANTIC_RESOLUTION_SHAPE');
    hold(ga.size===g.nodes.length&&sa.size===s.nodes.length,'NODE_DUPLICATE');
    for(const e of g.edges)hold(ga.has(e.source_node_id)&&ga.has(e.target_node_id),'DANGLING_APP_EDGE');
    for(const e of s.relations)hold(sa.has(e.source_node_id)&&sa.has(e.target_node_id),'DANGLING_SEM_RELATION');
    trace.append('rea',{kind:'source',evidence:sha(r.evidence_id),appNodes:g.nodes.length,semNodes:s.nodes.length});
    for(const e of [...g.edges].sort((x,y)=>x.edge_id.localeCompare(y.edge_id)).slice(0,24))trace.append('rea',{kind:'static-app',from:sha(e.source_node_id),to:sha(e.target_node_id),relation:e.relation});
    for(const e of [...s.relations].sort((x,y)=>x.relation_id.localeCompare(y.relation_id)).slice(0,24))trace.append('rea',{kind:'static-semantic',from:sha(e.source_node_id),to:sha(e.target_node_id),relation:e.relation,resolution:e.resolution});
    graphs.push({evidence:sha(r.evidence_id),application_nodes:g.nodes.length,application_edges:g.edges.length,semantic_nodes:s.nodes.length,semantic_relations:s.relations.length,semantic_candidates:s.relations.filter(x=>x.resolution==='candidate').length,semantic_resolved:s.relations.filter(x=>x.resolution==='resolved').length,unresolved:s.unknowns.length,application_coverage:g.coverage?.status??'unknown',semantic_coverage:s.coverage?.status??'unknown',sample_limit:24});
  }
  const sourcePolicy=['policy NoPromotion {',' clause External {',' when evidence.external == true',' oblige verdict.external = true',' }',' clause StaticOnly {',' when evidence.runtime != true',' sanction verdict.runtimeProved = false',' }',' clause NoIntegrityPromotion {',' when evidence.integrityValidated != true',' sanction verdict.promotable = false',' }','}'].join('\n');
  const guarded=JM32.execute(sourcePolicy,{evidence:{external:true,runtime:false,integrityValidated:false},verdict:{external:false,runtimeProved:false,promotable:false}});
  hold(guarded.runtime.state.verdict.external && !guarded.runtime.state.verdict.runtimeProved && !guarded.runtime.state.verdict.promotable,'JM32_FAILED');
  const events=trace.replay('rea');
  const sample=events.filter(x=>x.kind==='static-app'||x.kind==='static-semantic').slice(0,32).map(({kind,from,to,relation,resolution})=>({kind,from,to,relation,resolution:resolution??null}));
  return {schema:'JM.REA.GraphContact/0.3',graphs,trace_events:events.length,trace_digest:sha(JSON.stringify(events)),trace_sample:sample,sample_is_complete:events.length===sample.length,policy:guarded.runtime.state.verdict,proof:'STATIC_GRAPH_ONLY_NO_RUNTIME_DING'};
}