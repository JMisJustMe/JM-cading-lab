/**
 * JM M002 CP5 — Source-derived creative mechanism contact.
 * Exact private original: JM Shared Mechanisms v1.2 All-Game Exchange Lab,
 * Library SHA-256 63794bab0bdf612d1af5c6c3c0e2141bbf80a8ff33dbe64f4a416bb4290f85d3.
 * The private source stays in its own Estate house, unmounted in public CI.
 * A bounded adaptation of freshWorld/worldAction/safeReentry is executed here.
 * THEOGAMY is a working relationship label, NOT a formal engine rename.
 */
import {executeExternalMechanism} from './theogamy-private-donor-port.mjs';
import {createOneBodyIR,executeOneBodyIR} from '../everybody/role-qualified-61/native/onebody-ir.mjs';
export const ORIGINAL_SHARED_EXCHANGE=Object.freeze({
  id:'JM Shared Mechanisms v1.2 — All-Game Exchange Lab',
  file:'JM_SHARED_MECHANISMS_ALL_GAME_EXCHANGE_v1_2.html',
  sha256:'63794bab0bdf612d1af5c6c3c0e2141bbf80a8ff33dbe64f4a416bb4290f85d3',
  lineage:'v1.3 native-contact descendant distinct; legacy 21 rooms retained separately',
  proof:'SOURCE_DERIVED_ADAPTATION_NOT_EXACT_ORIGINAL_JS_EXECUTION_IN_CI'
});
const ACTIONS=new Set(['left','right','up','down','reach','free']);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const makeWorld=kind=>({kind,position:{x:0,y:kind==='bridge'?0:2},
  spawn:{x:0,y:kind==='bridge'?0:2},earned:[false,false],
  hazardEncountered:false,vx:0,vy:0,reentries:0,completed:false,actions:0,
  note:'Find both stations and keep them after a setback.'});
function safeReentry(w){w.position={...w.spawn};w.vx=0;w.vy=0;w.reentries++;
 w.note='Recovered safely; earned '+(w.kind==='bridge'?'links':'claims')+' preserved.';return w;}
/* Source-derived action rules; two original scenes remain distinct. */
function worldAction(w,action){
 w.actions++;if(w.completed)return w;
 if(action==='free'){safeReentry(w);return w;}
 if(action==='reach'){
  const sources=w.kind==='bridge'?[{x:1,y:0},{x:3,y:0}]:[{x:2,y:1},{x:4,y:3}];
  const idx=sources.findIndex(s=>s.x===w.position.x&&s.y===w.position.y);
  if(idx>=0&&!w.earned[idx]){w.earned[idx]=true;w.note='Connection '+(idx+1)+' retained across setbacks.';}
  else w.note='No unclaimed station here; move and try again.';
  return w;
 }
 const d={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[action];
 if(!d)return w;
 const x=clamp(w.position.x+d[0],0,w.kind==='bridge'?10:6);
 const y=clamp(w.position.y+d[1],0,w.kind==='bridge'?0:4);
 if(w.kind==='bridge'){
  if(x===5&&!(w.earned[0]&&w.earned[1])){
   w.note='The span is incomplete · two currents required.';return w;
  }
  w.position={x,y};
  if(x===8&&!w.hazardEncountered){w.hazardEncountered=true;safeReentry(w);
   w.note='Load broke your footing · links preserved. Continue!';return w;}
  if(x===10){w.completed=true;w.note='Bridge completed by actual movement · '+w.reentries+' recoveries.';return w;}
 }else{
  w.position={x,y};
  if(x===3&&y===2&&!w.hazardEncountered){w.hazardEncountered=true;safeReentry(w);
   w.note='Shock! Re-entry preserved claimed stations.';return w;}
  if(x===6&&y===2){
   w.note=w.earned.every(Boolean)?'Arena cleared · retained both claims.':'Gate requires both claimed stations.';
   if(w.earned.every(Boolean))w.completed=true;
   return w;
  }
 }
 w.note='Move / REACH to establish each separate station.';return w;
}
function phase(before,after,action){
 if(after.completed&&!before.completed)return 'COMPLETE';
 if(after.reentries>before.reentries)return 'REENTER';
 if(after.earned.filter(Boolean).length>before.earned.filter(Boolean).length)return 'EARN';
 if(action==='right'&&before.kind==='bridge'&&before.position.x===4&&after.position.x===4)return 'GATE_HOLD';
 return 'CONTACT';
}
function sourceDonor(){
 return {
  contract:'jm.theogamy.donor-port/1.0',name:ORIGINAL_SHARED_EXCHANGE.id,
  sourceSha256:ORIGINAL_SHARED_EXCHANGE.sha256,
  compose:({selection})=>{
   if(!selection||!['bridge','arena'].includes(selection.kind)||!Array.isArray(selection.actions)||
     selection.actions.length<1||selection.actions.length>80||
     selection.actions.some(a=>!ACTIONS.has(a)))
     throw Error('TWO_CURRENT_SELECTION_HOLD');
   return {kind:selection.kind,actions:[...selection.actions]};
  },
  apply:(recipient,{kind,actions})=>{
   if(!['jm.m002.game-contact/1','jm.m002.comic-sequence/1'].includes(recipient.schema))
    throw Error('TWO_CURRENT_RECIPIENT_HOLD');
   if(recipient.events?.length||recipient.panels?.length)throw Error('TWO_CURRENT_ALREADY_EXECUTED_HOLD');
   const w=makeWorld(kind),trace=[];
   for(const action of actions){
    const before=structuredClone(w);worldAction(w,action);
    trace.push({index:trace.length+1,action,phase:phase(before,w,action),
      position:{...w.position},earned:[...w.earned],reentries:w.reentries,complete:w.completed,note:w.note});
   }
   recipient.world=structuredClone(w);
   recipient.mechanism={id:'TWO_CURRENT_EARNED_CONTACT',sourceSha256:ORIGINAL_SHARED_EXCHANGE.sha256,
    rules:['TWO_LINKS_BEFORE_CROSSING','REENTRY_PRESERVES_EARNED','COMPLETION_REQUIRES_REAL_CONTACT']};
   if(recipient.schema==='jm.m002.game-contact/1'){
    recipient.events=trace.map(t=>({frame:t.index,input:t.action,state:t.phase,position:t.position,links:t.earned,
      reentries:t.reentries,completed:t.complete}));
   }else{
    recipient.panels=trace.map(t=>({panel:t.index,shot:t.phase==='EARN'?'close-up':t.phase==='REENTER'?'wide-return':
     t.phase==='GATE_HOLD'?'blocked-route':t.phase==='COMPLETE'?'resolution':'movement',
     caption:t.note,action:t.action,continuity:{earned:t.earned,reentries:t.reentries,completed:t.complete}}));
    recipient.readingOrder='left-to-right';recipient.productionState='STORYBOARD_JSON_NOT_ILLUSTRATED_PAGE';
   }
   return {state:recipient,trace,receipt:{status:'HOST_CONTACT_EXECUTED'}};
  }
 };
}
export function executeSharedTwoCurrentCreation({medium,kind,actions}){
 const schema=medium==='game'?'jm.m002.game-contact/1':medium==='comic'?'jm.m002.comic-sequence/1':null;
 if(!schema)throw Error('TWO_CURRENT_MEDIUM_HOLD');
 const initial={schema,identity:medium==='game'?'JM Field Contact Prototype':'JM Contact Panels Prototype',
  ...(medium==='game'?{events:[]}:{panels:[]})};
 const contact=executeExternalMechanism({donor:sourceDonor(),recipient:initial,selection:{kind,actions}});
 const world=contact.state.world;
 const ir=createOneBodyIR({bodyId:'jm-two-current-'+medium,bodyName:'JM Two-current '+medium+' forward authoring',
  sourceAuthority:ORIGINAL_SHARED_EXCHANGE.id+' / sha256:'+ORIGINAL_SHARED_EXCHANGE.sha256,
  nodes:[{id:'original',kind:'authority',value:ORIGINAL_SHARED_EXCHANGE.sha256},
         {id:'contact',kind:'mechanism',value:kind},
         {id:'recipient',kind:'output',value:medium}],
  links:[{from:'original',to:'contact',kind:'source-derived-mechanism'},
         {from:'contact',to:'recipient',kind:'actual-executed-recipient'}],
  operations:[
   {op:'SET',name:'earned_connections',value:world.earned.filter(Boolean).length},
   {op:'SET',name:'reentries',value:world.reentries},
   {op:'SET',name:'completed',value:world.completed},
   {op:'SET',name:'output_units',value:medium==='game'?contact.state.events.length:contact.state.panels.length},
   {op:'ASSERT',name:'output_units',value:actions.length},
   {op:'TRACE',value:{medium,kind,sourceSha256:ORIGINAL_SHARED_EXCHANGE.sha256,history:contact.trace.length}},
   {op:'DING',value:'TWO_CURRENT_'+medium.toUpperCase()+'_STATE_CHANGED'}
  ]});
 const portable=executeOneBodyIR(ir);
 if(!portable.receipt.ok||portable.receipt.state.output_units!==actions.length)
  throw Error('TWO_CURRENT_ONEBODY_EXECUTION_HOLD');
 return {schema:'jm.m002.two-current-creation-return/1',original:ORIGINAL_SHARED_EXCHANGE,
  state:contact.state,trace:contact.trace,oneBody:portable,
  boundary:'Exact-original-source-derived bounded host adaptation + actual THEOGAMY donor-port mutation + OneBody portable return. Game event state and comic storyboard output are not GPU play or drawn comic pages. TheoPlus/THEOGRAPHY originals and user Samsung acceptance remain unproved.'};
}
