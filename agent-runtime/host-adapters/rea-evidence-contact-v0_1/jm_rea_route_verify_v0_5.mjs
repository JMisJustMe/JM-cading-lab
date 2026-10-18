/* v0.5: native JM RouteScript/RouteVM/RouteOS state and consequence comparison. */
import crypto from 'node:crypto';
import {RouteScript,RouteVM,RouteOS,TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
import {ROUTESCRIPT_SOURCE,INITIAL_FACTS} from '../../../coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {independentRouteRun,normaliseOriginalTrace} from './jm_rea_route_consequence_v0_5.mjs';

const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const d=(name,lines)=>['route '+name+' {',...lines,'}'].join('\n');
const cases=[];
for(let k=0;k<32;k++){
 const state=structuredClone(INITIAL_FACTS);state.door.authorized=(k%2===0);
 cases.push({name:'inherited-original-door-'+k,source:ROUTESCRIPT_SOURCE,state,
   expected:state.door.authorized?'open':'closed'});
}
const branch=d('BranchPressure',['start:','  count = 4','  goto gate','gate:',
 '  branch score >= 7 -> high','  branch score < 7 -> low','high:',
 '  score = 100','  emit HIGH','  end','low:',
 '  score = 10','  emit LOW','  end']);
for(let k=0;k<24;k++)cases.push({name:'priority-branch-'+k,source:branch,state:{score:k}});
const recover=d('RecoveryRoute',['start:','  attempt = true','  call unavailable()','  onError -> returnRoute',
 'returnRoute:','  recovery = "controlled"','  show "safe return"','  end']);
for(let k=0;k<18;k++)cases.push({name:'missing-service-recovery-'+k,source:recover,state:{sequence:k}});
const failure=d('ExplicitFailure',['start:','  flag = true','  fail','  onError -> safe',
 'safe:','  show "recovered"','  end']);
for(let k=0;k<12;k++)cases.push({name:'explicit-failure-'+k,source:failure,state:{sequence:k}});
const fall=d('Fallthrough',['start:','  result = 5','middle:','  result = 6','  emit PROGRESSED',
 'finish:','  end']);
for(let k=0;k<14;k++)cases.push({name:'implicit-transition-'+k,source:fall,state:{sequence:k}});
const operations=d('Ops',['start:','  permit','  say "hello"','  route NewRoute','  recover repair',
 '  emit REACHED','  end']);
for(let k=0;k<10;k++)cases.push({name:'action-family-'+k,source:operations,state:{sequence:k}});
const serviceRoute=d('Service',['start:','  call markStarted()','  goto set','set:',
 '  flag = true','  end']);
for(let k=0;k<10;k++)cases.push({name:'service-side-effect-'+k,source:serviceRoute,state:{sequence:k}});
export const routeCases=cases;
function serviceBag(){
 const calls=[];
 const services={markStarted:()=>{calls.push('markStarted');return true;}};
 return {calls,services};
}
const policy=['policy ReplayGate {',' clause Checked {',' when receipt.scoped == true',
 ' oblige verdict.executed = true',' }',' clause NoDeviceCrown {',
 ' when receipt.deviceVerified != true',' sanction verdict.promotable = false',' }','}'].join('\n');
export function verifyRouteConsequences({replica=independentRouteRun}={}){
 const trace=new TraceBoxRuntime();trace.create('JM_REA_STATE_REPLAY');
 let passed=0;const mismatches=[];const summary=[];
 for(const item of cases){
   const ast=RouteScript.parse(item.source),graph=RouteScript.lower(ast).graphs[0];
   const first=serviceBag(),second=serviceBag(),third=serviceBag(),fourth=serviceBag();
   const original=RouteScript.run(graph,item.state,first.services);
   const compiled=RouteVM.compile(graph);
   if(!RouteVM.verify(compiled))throw Error('BYTECODE_NOT_VERIFIED');
   const machine=RouteVM.execute(compiled,graph,item.state,second.services);
   const os=new RouteOS();os.registerRoute(graph.routeName,compiled,graph,third.services);
   const hosted=os.callService(graph.routeName,item.state);
   const rebuilt=replica(graph,item.state,fourth.services);
   const projection=normaliseOriginalTrace(original.trace);
   const equivalent=same(original.state,rebuilt.state)
     &&original.transitions===rebuilt.transitions &&same(projection,rebuilt.events)
     &&same(first.calls,fourth.calls)
     &&same(machine.outcome.state,original.state)
     &&same(machine.outcome.trace,original.trace)
     &&same(hosted.state,original.state) && same(third.calls,first.calls)
     &&same(second.calls,first.calls)
     &&JSON.stringify(compiled.header.checksum).length>2;
   if(equivalent)passed++;else mismatches.push({scenario:item.name,
     original_sha256:sha({state:original.state,transitions:original.transitions,trace:projection,calls:first.calls}),
     replica_sha256:sha({state:rebuilt.state,transitions:rebuilt.transitions,trace:rebuilt.events,calls:fourth.calls})});
   trace.append('JM_REA_STATE_REPLAY',{kind:equivalent?'consequence.match':'consequence.mismatch',
     scenario:item.name,route:graph.routeName,transitions:original.transitions,
     original_state_sha256:sha(original.state),replica_state_sha256:sha(rebuilt.state)});
   summary.push({name:item.name,transition_count:original.transitions,
     state_sha256:sha(original.state),consequence:equivalent?'MATCH':'DRIFT'});
 }
 const verdict=JM32.execute(policy,{receipt:{scoped:true,deviceVerified:false},
   verdict:{executed:false,promotable:false}}).runtime.state.verdict;
 if(!verdict.executed||verdict.promotable)throw Error('JM32_GATE_FAILURE');
 if(trace.query('JM_REA_STATE_REPLAY',{kind:'consequence.match'}).length!==passed)
   throw Error('JM_TRACEBOX_QUERY_FAILURE');
 return {schema:'JM.REA.RouteConsequenceReplay/0.5',cases:cases.length,passed,
   failed:mismatches.length,mismatches:mismatches.slice(0,16),trace_events:trace.replay('JM_REA_STATE_REPLAY').length,
   jm_bodies:['RouteScript','RouteVM','RouteOS','TraceBoxRuntime','JM32'],
   scenario_families:[...new Set(cases.map(c=>c.name.replace(/-[0-9]+$/,'')))],
   state_digest_examples:summary.filter((_,i)=>[0,1,32,33,56,75,90,99].includes(i)),
   gate:verdict,claims:{native_state_transitions:true,independent_graph_runner:true,
     full_jm32_1da_2_2_1_compiler:false,apk_reverse_engineering:false,
     rea_function_authentication:false,owner_device:false}};
}
export function invalidBytecodeProof(){
 const graph=RouteScript.lower(RouteScript.parse(ROUTESCRIPT_SOURCE)).graphs[0];
 const compiled=RouteVM.compile(graph),modified=structuredClone(compiled);
 modified.instructions[0].operands[0]='changed:start';
 try{RouteVM.verify(modified);return {rejected:false};}
 catch(e){return {rejected:e.code==='RVM_BAD_CHECKSUM',code:e.code};}
}
export function loopProtection(){
 const graph=RouteScript.lower(RouteScript.parse(d('Forever',['start:','  goto start']))).graphs[0];
 const original=(()=>{try{RouteScript.run(graph,{})}catch(e){return e.code}})();
 const independent=(()=>{try{independentRouteRun(graph,{})}catch(e){return e.code}})();
 return {original,independent,both_protected:original==='RS_ROUTE_LOOP'&&independent===original};
}
