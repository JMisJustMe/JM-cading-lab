/* JM × REA v0.8 — translate genuine REA semantic Evidence into a bounded JM
 * relationship representation. Does not execute target code or authenticate
 * REA's hash scheme; requires REA's evidence-import validation separately. */
import crypto from 'node:crypto';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
import {TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const gate=(ok,m)=>{if(!ok)throw Error('JM_REA_V08_HOLD:'+m);};
const POLICY=['policy SourceGraph {',' clause Attached {',' when evidence.sourceLinked == true',
 ' oblige verdict.graphAttached = true',' }',' clause Unverified {',
 ' when evidence.ownerDevice != true',' sanction verdict.promotable = false',' }','}'].join('\n');
const DIGEST=/^[0-9a-f]{64}$/;
const NODE=/^jsrg_node_[0-9a-f]{64}$/;
export function projectGenuineREA(record,{module,roots,sourceSha256,depth=2,maxNodes=48,maxEdges=128}={}){
 gate(record?.evidence_id?.startsWith('ev_'),'NOT_REA_EVIDENCE_RECORD');
 gate(record?.provider?.id,'PROVIDER_NOT_IDENTIFIED');
 gate(Array.isArray(roots)&&roots.length>0&&roots.length<=12,'ROOTS_REQUIRED');
 gate(typeof module==='string'&&/^[A-Za-z0-9_.-]+\.m?js$/.test(module),'MODULE_NOT_SAFE');
 gate(DIGEST.test(sourceSha256??''),'ORIGINAL_SOURCE_DIGEST_REQUIRED');
 gate(Number.isInteger(depth)&&depth>=0&&depth<=4,'DEPTH_OUT_OF_BOUNDS');
 gate(Number.isInteger(maxNodes)&&maxNodes>=1&&maxNodes<=256,'NODE_LIMIT');
 gate(Number.isInteger(maxEdges)&&maxEdges>=1&&maxEdges<=512,'EDGE_LIMIT');
 const data=record.normalized_result,graph=data?.semantic_graph;
 gate(Array.isArray(graph?.nodes)&&Array.isArray(graph?.relations),'NO_SEMANTIC_RELATIONS');
 gate(graph.application_graph_id===data?.graph?.graph_id,'CROSS_GRAPH_MISMATCH');
 const map=new Map();
 for(const n of graph.nodes){
   gate(NODE.test(n.node_id),'BAD_SEMANTIC_NODE_ID');
   gate(!map.has(n.node_id),'DUPLICATE_SEMANTIC_NODE_ID');
   map.set(n.node_id,n);
 }
 const relations=[];
 for(const e of graph.relations){
   gate(typeof e.relation_id==='string'&&e.relation_id.startsWith('jsrg_rel_'),'BAD_RELATION_ID');
   gate(map.has(e.source_node_id)&&map.has(e.target_node_id),'DANGLING_REA_RELATION');
   gate(['resolved','candidate'].includes(e.resolution),'RELATION_RESOLUTION');
   relations.push(e);
 }
 const selected=new Map();
 for(const name of roots){
   gate(/^[A-Za-z_$][\w$]*$/.test(name),'BAD_ROOT_NAME');
   const found=graph.nodes.filter(n=>n.kind==='function'&&n.label===name&&n.identity?.module_path===module);
   gate(found.length===1,'MISSING_OR_AMBIGUOUS_ORIGINAL_ROOT_'+name);
   selected.set(found[0].node_id,0);
 }
 const outgoing=new Map();
 for(const e of relations){
   const list=outgoing.get(e.source_node_id)??[];list.push(e);outgoing.set(e.source_node_id,list);
 }
 const queue=[...selected.keys()],collected=[],seen=new Set();
 let limitHit=false;
 for(let i=0;i<queue.length;i++){
   const node=queue[i],level=selected.get(node);
   if(level>=depth)continue;
   for(const e of outgoing.get(node)??[]){
     if(!['calls','reads','aliases','imports','exports','references'].includes(e.relation))continue;
     if(seen.has(e.relation_id))continue;
     if(collected.length>=maxEdges){limitHit=true;break;}
     seen.add(e.relation_id);collected.push(e);
     if(!selected.has(e.target_node_id)){
       if(selected.size>=maxNodes){limitHit=true;continue;}
       selected.set(e.target_node_id,level+1);queue.push(e.target_node_id);
     }
   }
   if(collected.length>=maxEdges)break;
 }
 const outputNodes=[...selected.keys()].map(id=>{
   const n=map.get(id);
   return {identity_sha256:sha(id),kind:n.kind,original_label:n.label??null,
      original_module:n.identity?.module_path??null,static_depth:selected.get(id),
      original_line:n.identity?.source_range?.start?.line??null};
 });
 const outputEdges=collected.map(e=>({relation_sha256:sha(e.relation_id),
   from_sha256:sha(e.source_node_id),to_sha256:sha(e.target_node_id),
   relation:e.relation,resolution:e.resolution}));
 const trace=new TraceBoxRuntime();trace.create('JM_REA_V08_RELATIONS');
 for(const e of outputEdges.slice(0,64))
   trace.append('JM_REA_V08_RELATIONS',{kind:'static.relation',
     from:e.from_sha256,to:e.to_sha256,relation:e.relation,resolution:e.resolution});
 const decision=JM32.execute(POLICY,{evidence:{sourceLinked:true,ownerDevice:false},
   verdict:{graphAttached:false,promotable:false}}).runtime.state.verdict;
 gate(decision.graphAttached&&!decision.promotable,'JM_POLICY_GATE');
 gate(trace.query('JM_REA_V08_RELATIONS',{kind:'static.relation'}).length===Math.min(outputEdges.length,64),
   'JM_TRACEBOX_GATE');
 return {schema:'JM.REA.StaticRelationRepresentation/0.8',
   analysis_engine:'REA_RECORD_SOURCE_GRAPH',
   record_sha256:sha(JSON.stringify(record)),provided_source_sha256:sourceSha256,
   source_digest_binding:'CALLER_PROVIDED_NOT_REA_CRYPTO_PROOF',
   module,roots,depth,limits:{maxNodes,maxEdges,hit:limitHit},
   input_census:{nodes:graph.nodes.length,relations:relations.length,unknowns:graph.unknowns?.length??null},
   selected_census:{nodes:outputNodes.length,edges:outputEdges.length,
      candidates:outputEdges.filter(x=>x.resolution==='candidate').length},
   nodes:outputNodes,edges:outputEdges,trace_events:Math.min(outputEdges.length,64),
   gate:decision,boundary:'STATIC_REA_EVIDENCE_ONLY__NO_AUTOMATIC_TARGET_EXECUTION_OR_OWNER_DEVICE'};
}
