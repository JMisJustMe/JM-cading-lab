/* v0.5 JM Route Consequence Replay — independent graph interpreter.
 * Original JM RouteScript lowers grammar; independent evaluator executes resulting graph.
 * No eval, no remote code, no device side effects. */
const fail=(code)=>{const e=new Error(code);e.code=code;throw e;};
const get=(root,p)=>String(p).split('.').reduce((v,k)=>v==null?undefined:v[k],root);
function set(root,p,value){
 const parts=String(p).split('.'); let node=root;
 for(const k of parts.slice(0,-1)){if(!node[k]||typeof node[k]!=='object')node[k]={};node=node[k];}
 node[parts.at(-1)]=value;return root;
}
export function evaluateReplica(expr,facts,services={}){
 switch(expr.type){
 case 'or':return !!(evaluateReplica(expr.left,facts,services)||evaluateReplica(expr.right,facts,services));
 case 'and':return !!(evaluateReplica(expr.left,facts,services)&&evaluateReplica(expr.right,facts,services));
 case 'not':return !evaluateReplica(expr.value,facts,services);
 case 'truthy':return !!get(facts,expr.path);
 case 'call':return services[expr.name]?!!services[expr.name](...expr.args):get(facts,expr.name)===expr.args[0];
 case 'compare':{
  const left=get(facts,expr.path);
  const right=expr.right?.kind==='path'?get(facts,expr.right.value):expr.right?.value;
  switch(expr.op){case '==':return left===right;case '!=':return left!==right;
    case '>':return left>right;case '<':return left<right;case '>=':return left>=right;case '<=':return left<=right;}
  return fail('UNKNOWN_COMPARE');
 }
 default:return fail('UNKNOWN_EXPRESSION');
 }
}
function applyReplica(action,state,services,trace){
 trace.push({type:'action.begin',action:action.type});
 let value;
 switch(action.type){
 case 'assign':value=set(state,action.path,action.value);break;
 case 'permit':case 'deny':value=state.permission=action.type;break;
 case 'show':value=(state.messages??=[]).push(action.value);break;
 case 'say':value=(state.responses??=[]).push(action.value);break;
 case 'emit':value=(state.events??=[]).push(action.value);break;
 case 'route':value=state.nextRoute=action.value;break;
 case 'recover':value=state.recovery=action.value;break;
 case 'goto':value=state.nextStep=action.value;break;
 case 'end':value=state.ended=true;break;
 case 'fail':return fail('EXPLICIT_FAILURE');
 case 'call':
  if(typeof services[action.name]!=='function')return fail('UNKNOWN_SERVICE');
  value=services[action.name](...(action.positional??[]),action.named??{},state);break;
 default:return fail('UNKNOWN_ACTION');
 }
 trace.push({type:'action.end',action:action.type});
 return value;
}
export function independentRouteRun(graph,initialState={},services={}){
 if(graph?.type!=='RSRouteGraph')fail('RS_INVALID_GRAPH');
 const state=structuredClone(initialState),nodes=new Map(graph.nodes.map(n=>[n.id,n]));
 const events=[];let current=graph.entry,transitions=0;
 while(current&&!state.ended){
  if(transitions++>=256)fail('RS_ROUTE_LOOP');
  const node=nodes.get(current);if(!node)fail('RS_MISSING_NODE');
  events.push({type:'step.enter',id:node.id,label:node.label});
  let error=null;
  try{for(const action of node.actions)applyReplica(action,state,services,events);}
  catch(e){error=e;}
  const outgoing=graph.edges.filter(e=>e.from===current);
  if(error){
    const recovery=outgoing.find(e=>e.kind==='recovery');
    if(!recovery)throw error;
    events.push({type:'recovery.followed',from:current,to:recovery.to,code:error.code??error.name});
    current=recovery.to;continue;
  }
  const branch=outgoing.find(e=>e.kind==='branch'&&evaluateReplica(e.condition,state,services));
  const normal=outgoing.find(e=>e.kind==='normal');
  const next=branch??normal;
  events.push({type:'step.exit',id:node.id,next:next?.to??null});
  current=state.ended?null:next?.to??null;
 }
 return {state,transitions,events};
}
export function normaliseOriginalTrace(trace){
 return trace.map(e=>{
   if(e.type==='step.enter')return {type:e.type,id:e.payload.id,label:e.payload.label};
   if(e.type==='step.exit')return {type:e.type,id:e.payload.id,next:e.payload.next};
   if(e.type==='recovery.followed')return {type:e.type,from:e.payload.from,to:e.payload.to,code:e.payload.code};
   if(e.type==='action.begin')return {type:e.type,action:e.payload.type};
   if(e.type==='action.end')return {type:e.type,action:e.payload.action.type};
   return {type:e.type};
 });
}
