/* JM x REA v0.6 — Independent Game-CODING + GameCore application execution.
 * Takes ONLY independently parsed source ASTs. Never uses JM's native evaluate/applyAction. */
import {evaluateReplica} from './jm_rea_route_consequence_v0_5.mjs';

const requireTrue=(yes,code)=>{if(!yes){const error=new Error(code);error.code=code;throw error;}};
const keyOf=name=>name[0].toLowerCase()+name.slice(1);
function assign(obj,path,value){
 const keys=path.split('.');let v=obj;
 for(const k of keys.slice(0,-1)){if(!v[k]||typeof v[k]!=='object')v[k]={};v=v[k];}
 v[keys.at(-1)]=value;
}
function doAction(action,state){
 if(action.type==='assign'){assign(state,action.path,action.value);return;}
 if(action.type==='emit'){(state.events??=[]).push(action.value);return;}
 if(action.type==='show'){(state.messages??=[]).push(action.value);return;}
 if(action.type==='say'){(state.responses??=[]).push(action.value);return;}
 if(action.type==='end'){state.ended=true;return;}
 requireTrue(false,'V06_UNSUPPORTED_EFFECT');
}
export class IndependentGameRuntime {
 constructor(program,initialState={}){
  this.program=program;
  this.state=structuredClone(initialState);this.frame=0;this.trace=[];
  for(const entity of program.entities)
   this.state[keyOf(entity.name)]={...entity.fields,...(this.state[keyOf(entity.name)]??{})};
 }
 trigger(name){
  const mechanic=this.program.mechanics.find(x=>x.name===name);
  requireTrue(mechanic,'GC_UNKNOWN_MECHANIC');
  const permitted=evaluateReplica(mechanic.requires,this.state);
  this.trace.push({type:'mechanic.checked',name,permitted});
  if(!permitted)return {name,applied:false};
  this.trace.push({type:'action.begin'});
  doAction(mechanic.effect,this.state);
  this.trace.push({type:'action.end'});
  this.trace.push({type:'mechanic.applied',name});
  return {name,applied:true};
 }
 collide(){
  const outcomes=[];
  for(const item of this.program.collisions){
   const matched=evaluateReplica(item.condition,this.state);
   this.trace.push({type:'collision.checked',name:item.name,matched});
   if(matched)outcomes.push(this.trigger(item.trigger));
  }
  return outcomes;
 }
 combo(name){
  const combo=this.program.combos.find(x=>x.name===name);
  requireTrue(combo,'GC_UNKNOWN_COMBO');
  const outcomes=combo.steps.map(step=>this.trigger(step));
  this.trace.push({type:'combo.completed',name});
  return outcomes;
 }
 simulateFrame(){
  this.frame++;
  for(const update of this.program.updates)if(this.frame%update.intervalFrames===0){
   this.trace.push({type:'action.begin'});
   doAction(update.effect,this.state);
   this.trace.push({type:'action.end'});
   this.trace.push({type:'update.applied',name:update.name,frame:this.frame});
  }
  return structuredClone(this.state);
 }
}
export class IndependentGameCore {
 constructor(program,game){this.program=program;this.game=game;this.trace=[];}
 dispatch(name,event){
  const system=this.program.systems.find(x=>x.name===name);
  requireTrue(system,'JMG_UNKNOWN_SYSTEM');
  requireTrue(system.events.includes(event),'JMG_UNHANDLED_EVENT');
  const executions=[];
  for(const organName of system.organs){
   const organ=this.program.organs.find(x=>x.name===organName);
   this.trace.push({type:'organ.dispatched',name:organName});
   for(const rule of organ.rules)executions.push(this.game.trigger(rule));
   const checks=organ.invariants.map(e=>evaluateReplica(e,this.game.state));
   requireTrue(checks.every(Boolean),'JMG_INVARIANT_FAILED');
   this.trace.push({type:'invariants.checked',count:checks.length,passed:true});
  }
  this.trace.push({type:'system.completed',name});
  return {system:name,identity:system.identity,event,executions,state:structuredClone(this.game.state)};
 }
}
export function normaliseNativeGameTrace(events){
 return events.map(x=>{
  const p=x.payload??{};
  switch(x.type){
   case 'mechanic.checked':return {type:x.type,name:p.name,permitted:p.permitted};
   case 'collision.checked':return {type:x.type,name:p.name,matched:p.matched};
   case 'mechanic.applied':return {type:x.type,name:p.name};
   case 'combo.completed':return {type:x.type,name:p.name};
   case 'update.applied':return {type:x.type,name:p.name,frame:p.frame};
   case 'action.begin':case 'action.end':return {type:x.type};
   default:return {type:x.type};
  }
 });
}
export function normaliseNativeCoreTrace(events){
 return events.map(x=>{
  const p=x.payload??{};
  switch(x.type){
   case 'organ.dispatched':return {type:x.type,name:p.organ};
   case 'invariants.checked':return {type:x.type,count:p.checks.length,passed:p.checks.every(c=>c.passed)};
   case 'system.completed':return {type:x.type,name:p.system};
   default:return {type:x.type};
  }
 });
}
