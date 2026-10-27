/* JM Coding Estate CP02: four bounded, body-specific consequences.
 * Inherits canonical-native v2 compiler; does NOT replace a VM or claim a native process.
 */
import { canonicalNativeSpec, compileCanonicalNative } from './canonical-native-v2.mjs';
export const SPECIALIST_LINE=Object.freeze(['route-code','statefield','formula-born-code','game-coding']);
const CODE_ID=Object.freeze({'route-code':26,statefield:29,'formula-born-code':21,'game-coding':39});
const ALLOWED=Object.freeze({'route-code':['SOURCE','ROUTE'],statefield:['STATE'],
 'formula-born-code':['FORM','APPLY','YIELD'],'game-coding':['RULE','STEP','SCORE']});
function fail(code){const e=new Error(code);e.code=code;throw e;}
const shape=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function fields(x,expected){if(!shape(x)||Object.keys(x).sort().join('|')!==[...expected].sort().join('|'))fail('BAD_PAYLOAD_FIELDS');}
function number(x,{integer=false,min=-1000,max=1000}={}){
 if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max||(integer&&!Number.isInteger(x)))fail('UNSAFE_NUMBER');
 return x;
}
function slug(x){if(typeof x!=='string'||!/^[a-z][a-z0-9_-]{0,23}$/.test(x))fail('UNSAFE_LABEL');return x;}
const copy=x=>JSON.parse(JSON.stringify(x));
function sourceFor(body,ops){
 const spec=canonicalNativeSpec(body),cap=Object.keys(spec.capabilityCommands)[0];
 if(!cap)fail('BODY_CAPABILITY_REQUIRED');
 return ['NATIVE '+body.id+' 2.0','LAW '+JSON.stringify(body.law),
   ...ops.map(([op,value])=>op+' '+JSON.stringify(value)),
   cap+' '+JSON.stringify({body:body.id,scope:'specialist-cp02'}),
   'TRACE '+JSON.stringify({body:body.id,proof:'specialist-cp02'}),
   'DING '+JSON.stringify({body:body.id,status:'CANONICAL_SOURCE_VALIDATED'}),'END'].join('\n');
}
export function specialistPrograms(registry,{energy=3,by=5,threshold=7,points=2,team='bird'}={}){
 const m=new Map((registry?.bodies??[]).map(x=>[x.id,x]));
 for(const id of SPECIALIST_LINE)if(!m.has(id))fail('MISSING_SOVEREIGN_BODY');
 number(energy,{min:0,max:100});number(by,{min:-100,max:100});
 number(threshold,{min:0,max:1000});number(points,{integer:true,min:0,max:100});slug(team);
 return [
  ['route-code',[['SOURCE',{source:'jm-specialist-demo'}],['ROUTE',{to:'statefield'}]]],
  ['statefield',[['STATE',{key:'energy',value:energy}]]],
  ['formula-born-code',[['FORM',{field:'energy'}],['APPLY',{operator:'add',by,output:'pressure'}],['YIELD',{field:'pressure'}]]],
  ['game-coding',[['RULE',{kind:'threshold-score',field:'pressure',gte:threshold,points,team}],['STEP',{turn:1}],['SCORE',{team}]]]
 ].map(([bodyId,ops])=>({bodyId,source:sourceFor(m.get(bodyId),ops)}));
}
function semanticEffects(bodyId,ops,ctx){
 const val=(index,op)=>{if(ops[index]?.op!==op)fail('SPECIALIST_COMMAND_ORDER');return ops[index].value;};
 const next=copy(ctx);
 switch(bodyId){
  case 'route-code':{
   if(ops.length!==2)fail('SPECIALIST_OPERATION_COUNT');
   const s=val(0,'SOURCE'),v=val(1,'ROUTE');fields(s,['source']);fields(v,['to']);
   if(s.source!=='jm-specialist-demo'||v.to!=='statefield')fail('ROUTE_BOUNDARY');
   next.route={from:bodyId,to:v.to,source:s.source};
   return {next,effect:'route_opened',delta:copy(next.route)};
  }
  case 'statefield':{
   if(ops.length!==1)fail('SPECIALIST_OPERATION_COUNT');
   if(ctx.route?.to!==bodyId)fail('STATE_ROUTE_REQUIRED');
   const v=val(0,'STATE');fields(v,['key','value']);
   if(v.key!=='energy')fail('STATE_FIELD_NOT_ALLOWED');
   next.energy=number(v.value,{min:0,max:100});
   return {next,effect:'state_written',delta:{energy:next.energy}};
  }
  case 'formula-born-code':{
   if(ops.length!==3||!Object.hasOwn(ctx,'energy'))fail('FORMULA_STATE_REQUIRED');
   const form=val(0,'FORM'),v=val(1,'APPLY'),yielded=val(2,'YIELD');
   fields(form,['field']);fields(v,['operator','by','output']);fields(yielded,['field']);
   if(form.field!=='energy'||v.operator!=='add'||v.output!=='pressure'||yielded.field!=='pressure')fail('FORMULA_BOUNDARY');
   const by=number(v.by,{min:-100,max:100});
   next.pressure=number(ctx.energy+by,{min:-1000,max:1000});
   return {next,effect:'formula_add',delta:{before:ctx.energy,by,pressure:next.pressure}};
  }
  case 'game-coding':{
   if(ops.length!==3)fail('SPECIALIST_OPERATION_COUNT');
   if(!Object.hasOwn(ctx,'pressure'))fail('GAME_STATE_REQUIRED');
   const rule=val(0,'RULE'),step=val(1,'STEP'),score=val(2,'SCORE');
   fields(rule,['kind','field','gte','points','team']);fields(step,['turn']);fields(score,['team']);
   const team=slug(rule.team);
   if(rule.kind!=='threshold-score'||rule.field!=='pressure'||score.team!==team||step.turn!==1)fail('GAME_RULE_BOUNDARY');
   const gte=number(rule.gte,{min:0,max:1000}),points=number(rule.points,{integer:true,min:0,max:100});
   next.game={team,turn:1,awarded:ctx.pressure>=gte?points:0,score:ctx.pressure>=gte?points:0,thresholdMet:ctx.pressure>=gte};
   return {next,effect:'game_threshold_score',delta:copy(next.game)};
  }
  default:fail('UNKNOWN_SPECIALIST');
 }
}
export function executeSpecialistLine(programs,registry,current64){
 const hold=(code,at,trace)=>({schema:'JM.CodingEstate.SpecialistExecution/0.1',ok:false,committed:false,
   status:'HOLD_ROLLED_BACK',heldAt:at,diagnostic:{code},state:null,receipts:[],attempted:trace,
   claimBoundary:'No committed recipient outcome or factory Ding; original sources unchanged.'});
 let at='preflight';const trace=[];
 try{
  if(!Array.isArray(programs)||programs.length!==SPECIALIST_LINE.length)fail('FOUR_SPECIALIST_STEPS_REQUIRED');
  if(registry?.schema!=='jm.everybody.registry-federation/1.1'||!Array.isArray(registry.bodies)||registry.bodies.length!==100)fail('NATIVE_REGISTRY_REQUIRED');
  if(current64?.schema!=='JM.CodingEstate.Current64/1.0'||current64.identities?.length!==64)fail('CURRENT_64_REQUIRED');
  const seats=new Map(current64.identities.map(x=>[x.slug,x]));
  let state={};const receipts=[];
  for(let i=0;i<SPECIALIST_LINE.length;i++){
   const id=SPECIALIST_LINE[i];at=id;
   const program=programs[i],seat=seats.get(id),body=registry.bodies.find(x=>x.id===id);
   if(program?.bodyId!==id||typeof program.source!=='string'||program.source.length>10000)fail('BODY_ORDER_OR_SOURCE_BOUNDARY');
   if(!body||seat?.code_id!==CODE_ID[id])fail('SOVEREIGN_SEAT_MISMATCH');
   const checked=compileCanonicalNative(id,program.source,registry);
   if(!checked.ok||!checked.roundTrip||!checked.compiled?.ok)fail('CANONICAL_NATIVE_SOURCE_HOLD');
   const statements=checked.parsed.ast.statements.filter(x=>!['LAW','TRACE','DING'].includes(x.op)&&!x.op.startsWith('CAP_'));
   if(statements.some(x=>!ALLOWED[id].includes(x.op)))fail('NON_SPECIALIST_OPERATION');
   const {next,effect,delta}=semanticEffects(id,statements,state);
   const receipt={codeId:seat.code_id,bodyId:id,name:seat.name,mode:'HOST_JS_BOUNDED_SPECIALIST',
    sourceValidated:true,canonicalDingScope:'SOURCE_AND_PORTABLE_RUNTIME_ONLY',
    effect,delta,sourceLines:statements.map(x=>x.line)};
   trace.push(receipt);receipts.push(receipt);state=next;
  }
  return {schema:'JM.CodingEstate.SpecialistExecution/0.1',ok:true,committed:true,
   status:'BOUNDED_SPECIALIST_HOST_PASS',state:copy(state),receipts,
   executionBoundary:'Four sovereign source bodies compiled through existing JM canonical-native v2. CP02 JS host applies four explicit effects; no separate OS process, production game, native backend or fresh owner-device proof.'};
 }catch(err){return hold(err.code??'UNEXPECTED_HOLD',at,trace);}
}
