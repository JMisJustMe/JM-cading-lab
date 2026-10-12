/* JM × REA v1.0 — genuine REA evidence selects original JM executable functions.
   Existing JM native GameCoding/GameCore source → independent JM parser+runtime;
   no remote dynamic code, eval, private COMBOUND source or newly invented engine.
   REA static anchors justify function identity only, never functional equivalence. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime} from '../../../coding-estate/sovereign-ten/direct/game-native.mjs';
import {GAME_CODING_SOURCE,JM_GAMECORE_SOURCE,INITIAL_FACTS} from '../../../coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
import {TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
import {independentGameParse,independentCoreParse} from './jm_rea_source_parser_v0_6.mjs';
import {IndependentGameRuntime,IndependentGameCore,normaliseNativeGameTrace,normaliseNativeCoreTrace} from './jm_rea_game_application_v0_6.mjs';
import {projectGenuineREA} from './jm_rea_auto_relation_ir_v0_8.mjs';

const sha=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)?x:typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const gate=(condition,reason)=>{if(!condition)throw Error('JM_REA_V10_HOLD:'+reason);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const slim=o=>Array.isArray(o)?o.map(slim):o&&typeof o==='object'&&'applied'in o?
  {name:o.name,applied:o.applied}:o;
const POLICY=['policy REAExecuted {',
 ' clause Linked {',' when evidence.sourceLinked == true',
 ' oblige verdict.sourceLinked = true',' }',
 ' clause Executed {',' when evidence.executionMatched == true',
 ' oblige verdict.executionMatched = true',' }',
 ' clause NoDeviceCrown {',' when evidence.ownerDevice != true',
 ' sanction verdict.promotable = false',' }','}'].join('\n');

const HERE=path.dirname(fileURLToPath(import.meta.url));
const GAME=path.resolve(HERE,'../../../coding-estate/sovereign-ten/direct/game-native.mjs');
const ROOTS=['trigger','simulateFrame','dispatch'];
const OPTIONAL=['collide','combo'];
const validMethods=new Set([...ROOTS,...OPTIONAL]);

/** Bind named native functions to this exact local authored source, not just an
 * attacker supplied root name or candidate REA edge. The REA record must have
 * separately passed upstream rea evidence-import in the host workflow. */
export function bindExecutableREA(record,{reaValidated=false,gameSource=GAME}={}){
 gate(reaValidated===true,'REAL_REA_EVIDENCE_IMPORT_NOT_ATTESTED');
 gate(record?.evidence_id?.startsWith('ev_'),'REA_EVIDENCE_ID');
 const data=record?.normalized_result,graph=data?.semantic_graph;
 gate(graph?.application_graph_id===data?.graph?.graph_id,'APPLICATION_SEMANTIC_GRAPH_JOIN');
 gate(graph?.root_artifact_sha256===record?.subject?.digest?.sha256,
   'REA_GRAPH_SUBJECT_DIGEST');
 const source=fs.readFileSync(gameSource);
 const digest=sha(source);
 const identities=new Map();
 for(const name of [...ROOTS,...OPTIONAL]){
  const found=(graph?.nodes??[]).filter(n=>n.kind==='function'&&n.label===name&&
    n.identity?.module_path==='game-native.mjs');
  if(!ROOTS.includes(name)&&found.length===0)continue;
  gate(found.length===1,'MISSING_OR_AMBIGUOUS_REA_METHOD_'+name);
  const n=found[0];
  gate(/^jsrg_node_[a-f0-9]{64}$/.test(n.node_id),'INVALID_REA_NODE_'+name);
  gate(n.identity.artifact_sha256===digest,'REA_ORIGINAL_NATIVE_SOURCE_MISMATCH_'+name);
  identities.set(name,n);
 }
 for(const name of ROOTS)gate(identities.has(name),'REQUIRED_ROOT_NOT_BOUND_'+name);
 // Consumes the inherited genuine-REA → native JM32/TraceBox projection.
 const staticIR=projectGenuineREA(record,{module:'game-native.mjs',
   roots:ROOTS,sourceSha256:digest,maxNodes:48,maxEdges:128,depth:2});
 gate(staticIR.selected_census.edges>0,'REA_FUNCTIONS_HAVE_NO_STATIC_CONTACT');
 const links=[...identities].map(([name,n])=>({
   function:name,rea_node_sha256:sha(n.node_id),
   original_line:n.identity?.source_range?.start?.line??null,
   native_source_sha256:digest
 }));
 return {schema:'JM.REA.SourceBoundExecutionEligibility/1.0',
   original_source_sha256:digest,
   original_source_path_recorded:false,
   roots:[...identities.keys()],
   authorisation:'EXPLICIT_INHERITED_METHOD_ALLOWLIST',
   relation_count:staticIR.selected_census.edges,
   candidate_relations:staticIR.selected_census.candidates,
   rea_static_unknowns:staticIR.input_census.unknowns,
   rea_graph_fingerprint:staticIR.record_sha256,
   links};
}

/** Executable plan created by REA-verified method eligibility AND JM source
 * grammar. Nothing in an REA calls/captures edge is interpreted as an effect. */
export function synthesizeNativeExecutionPlan(binding,source=GAME_CODING_SOURCE,coreSource=JM_GAMECORE_SOURCE){
 gate(binding?.schema==='JM.REA.SourceBoundExecutionEligibility/1.0',
   'UNBOUND_REA_EXECUTION');
 const eligibility=new Set(binding.roots);
 for(const name of eligibility)gate(validMethods.has(name),'UNAPPROVED_TARGET_'+name);
 for(const name of ROOTS)gate(eligibility.has(name),'INCOMPLETE_EXECUTABLE_ANCHORS_'+name);
 const nativeAst=GameCoding.parse(source), independentAst=independentGameParse(source);
 const coreNative=JMGameCore.parse(coreSource),coreOwn=independentCoreParse(coreSource);
 gate(same(nativeAst,independentAst)&&same(coreNative,coreOwn),
   'ORIGINAL_VERSUS_INDEPENDENT_SOURCE_AST_DRIFT');
 const commands=[];
 // Every mechanic and system comes FROM JM source grammar, not hardcoded samples.
 if(eligibility.has('trigger'))
  for(const m of independentAst.mechanics)commands.push({type:'trigger',name:m.name});
 if(eligibility.has('collide')&&independentAst.collisions.length)
  commands.push({type:'collision'});
 if(eligibility.has('combo'))
  for(const c of independentAst.combos)commands.push({type:'combo',name:c.name});
 if(eligibility.has('dispatch'))
  for(const s of coreOwn.systems)
   for(const event of s.events)commands.push({type:'dispatch',system:s.name,event});
 if(eligibility.has('simulateFrame'))
  for(const u of independentAst.updates)
   commands.push({type:'frames',name:u.name,count:Math.min(u.intervalFrames+1,150)});
 gate(commands.some(c=>c.type==='trigger')&&commands.some(c=>c.type==='dispatch')&&
   commands.some(c=>c.type==='frames'),'UNEXECUTABLE_JM_SOURCE');
 gate(commands.length>0&&commands.length<=50,'COMMAND_BUDGET');
 return {schema:'JM.REA.SourceGeneratedExecutablePlan/1.0',commands,
   originalAst:nativeAst,independentAst,originalCore:coreNative,independentCore:coreOwn,
   input_sha256:sha(source),core_sha256:sha(coreSource)};
}
function perform(action,game,core){
 switch(action.type){
  case 'trigger':return game.trigger(action.name);
  case 'collision':return game.collide();
  case 'combo':return game.combo(action.name);
  case 'dispatch':{
    const x=core.dispatch(action.system,action.event);
    return {system:x.system,identity:x.identity,event:x.event,executions:slim(x.executions)};
  }
  case 'frames':{
    for(let i=0;i<action.count;i++)game.simulateFrame();
    return {frame:game.frame};
  }
  default:gate(false,'UNSUPPORTED_INSTRUCTION_'+action.type);
 }
}
/** Differentials are real original JM runtime vs pre-existing independent
 * executable lowerer/runtime. REA evidence is required to choose entrypoints. */
export function executeBoundReconstruction(record,{
  reaValidated=false,sessions=24,replicaClass=IndependentGameRuntime,
  bindingTransform=null}={}){
 gate(Number.isInteger(sessions)&&sessions>=1&&sessions<=128,'SESSION_BUDGET');
 const binding=bindExecutableREA(record,{reaValidated});
 const bounded=bindingTransform?bindingTransform(structuredClone(binding)):binding;
 const plan=synthesizeNativeExecutionPlan(bounded);
 const trace=new TraceBoxRuntime();trace.create('JM_REA_V10_EXECUTE');
 const mismatches=[];let comparisons=0,matching=0,frames=0;
 const modeCounts={};
 for(let i=0;i<sessions;i++){
  const seed=structuredClone(INITIAL_FACTS);
  seed.door.authorized=i%3!==0;seed.door.allowed=i%4!==0;
  seed.door.state=i%6===0?'open':'closed';
  seed.player.position=i%2===0?4:2;
  const native=new GameCodingRuntime(plan.originalAst,seed);
  const replica=new replicaClass(plan.independentAst,seed);
  const nativeCore=new JMGameCoreRuntime(plan.originalCore,native);
  const replicaCore=new IndependentGameCore(plan.independentCore,replica);
  for(const [index,command] of plan.commands.entries()){
   const original=perform(command,native,nativeCore);
   const rebuilt=perform(command,replica,replicaCore);
   const ok=same(slim(original),slim(rebuilt))&&same(native.state,replica.state)&&
     native.frame===replica.frame&&
     same(normaliseNativeGameTrace(native.trace.events),replica.trace)&&
     same(normaliseNativeCoreTrace(nativeCore.trace.events),replicaCore.trace);
   comparisons++;if(ok)matching++;if(command.type==='frames')frames+=command.count;
   modeCounts[command.type]=(modeCounts[command.type]??0)+1;
   if(!ok&&mismatches.length<16)mismatches.push({session:i,step:index,
      instruction:command.type,original_sha256:sha({state:native.state,output:slim(original)}),
      replica_sha256:sha({state:replica.state,output:slim(rebuilt)})});
  }
  trace.append('JM_REA_V10_EXECUTE',{kind:'session.compared',
   session:i,checks:plan.commands.length,
   state_sha256:sha(native.state),native_trace:native.trace.events.length});
 }
 const verdict=JM32.execute(POLICY,{evidence:{sourceLinked:true,
   executionMatched:matching===comparisons,ownerDevice:false},
   verdict:{sourceLinked:false,executionMatched:false,promotable:false}}).runtime.state.verdict;
 gate(verdict.sourceLinked&&!verdict.promotable,'JM32_POLICY_DRIFT');
 gate(trace.query('JM_REA_V10_EXECUTE',{kind:'session.compared'}).length===sessions,'TRACE_READBACK');
 return {schema:'JM.REA.EvidenceBoundExecutableReconstruction/1.0',
   source_sha256:binding.original_source_sha256,ast_source_sha256:plan.input_sha256,
   core_source_sha256:plan.core_sha256,
   actual_original_JM_bodies:['GameCoding','GameCodingRuntime','JMGameCore',
    'JMGameCoreRuntime','TraceBoxRuntime','JM32'],
   independent_existing_bodies:['independentGameParse','independentCoreParse',
    'IndependentGameRuntime','IndependentGameCore'],
   selection:'REA_VERIFIED_METHOD_IDENTITIES_PLUS_JM_SOURCE_DERIVED_COMMANDS',
   evidence:{nodes:binding.links.length,edges:binding.relation_count,
     candidate_edges:binding.candidate_relations,
     unknown_frontiers:binding.rea_static_unknowns,
     raw_graph_retained:false},
   executable_plan:plan.commands,
   sessions,comparisons,matching,frames,mode_counts:modeCounts,
   mismatches,trace_sessions:trace.replay('JM_REA_V10_EXECUTE').length,
   verdict,
   boundary:'REAL_REA_PUBLIC_JM_SOURCE__INDEPENDENT_JM_CORPUS_RUNTIME__NOT_REA_SYNTHESIZED_ARBITRARY_CODE_OR_PRIVATE_COMBOUND'};
}
