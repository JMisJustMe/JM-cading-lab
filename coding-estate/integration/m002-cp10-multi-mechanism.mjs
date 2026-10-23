/*
 JM M002 CP10 - actual native multi-mechanism contact.
 Source identities survive: Contact Kernel, ChoiceBox, CombiBind, JMLogic,
 OneBody each execute their OWN grammar and return their OWN receipts.
 This is not original unrecovered THEOGRAPHY engine authority.
*/
import {JMSharedContactKernel} from './shared-contact-kernel-v1.mjs';
import {ChoiceBox,CombiBind} from '../sovereign-batch-six/direct/runtime-composition-native.mjs';
import {JMLogic} from '../sovereign-ten/direct/language-native.mjs';
import {createOneBodyIR,executeOneBodyIR} from '../everybody/role-qualified-61/native/onebody-ir.mjs';

const CHOICES=['protect','explore','amplify'];
const MEDIA=['game','comic','book','music','cartoon'];
const choicesSource='choicebox CreativeFork {\n prompt = "How does the connection change the world?"\n choices = [protect,explore,amplify]\n default = explore\n state_path = creative.response\n}';
const bindingSource='combine DistinctMechanisms {\n left = ContactRuntime\n right = ChoiceRuntime\n compatible = [continuity,source_proof]\n output = MultiRecipientCreation\n rollback = original_recipient_preserved\n}';
const lawSource='rule VerifiedComposition {\n when evidence.ready == true\n then creation.allowed = true\n recover {\n creation.allowed = false\n }\n}';
const style={
 protect:{verb:'shelters',effect:'ward',tone:'steady',shape:'ring',note:196},
 explore:{verb:'opens',effect:'route',tone:'rising',shape:'path',note:261.63},
 amplify:{verb:'transforms',effect:'surge',tone:'urgent',shape:'burst',note:329.63}
};
const makeConfig=count=>({
 stations:Array.from({length:count},(_,i)=>({id:String.fromCharCode(65+i),x:100+i*90,y:100})),
 receiptKind:'JM_CP10_SOURCE_EARNED',radius:35,
 shock:{x:50,y:50,radius:30,requires:'A'}
});
function makeRecipient(medium,trace,mode,subject){
 const s=style[mode];
 const items=trace.map((e,i)=>({step:i+1,actor:subject,choice:mode,
  input:e.request,source:e.event,earned:[...e.earned],
  recovered:e.reentries,gate:e.gate,
  consequence:e.gate?s.effect:e.event==='REENTER_PRESERVE'?'retained':'gated'}));
 if(medium==='game'){
  const abilities={
   protect:{type:'GUARD_FIELD',shieldTicks:4,damage:0,travel:0},
   explore:{type:'ROUTE_LEAP',shieldTicks:0,damage:0,travel:3},
   amplify:{type:'RESONANCE_BLAST',shieldTicks:0,damage:3,travel:0}
  };
  return {schema:'jm.cp10.game-ability/1',actor:subject,
   ability:abilities[mode],actions:items,
   requirement:'Earn every contact before this ability may execute'};
 }
 if(medium==='comic')return {schema:'jm.cp10.comic-panels/1',
  panels:items.map(x=>({...x,frame:x.source==='REENTER_PRESERVE'?'wide-reentry':
   x.gate?'reveal':'contact-closeup',symbol:s.shape,
   dialogue:x.gate?subject+' '+s.verb+' the path!':
    x.source==='REENTER_PRESERVE'?'We still have what we earned.':'Another connection remains.'})),
  boundary:'Drawn panel production NOT PROVED'};
 if(medium==='book')return {schema:'jm.cp10.book-scenes/1',
  scenes:items.map(x=>({...x,mood:s.tone,paragraph:x.source==='REENTER_PRESERVE'?
   subject+' was sent back, but the connection survived.':x.gate?
   'With every contact earned, '+subject+' '+s.verb+' the world.':
   subject+' approached the next living point, but the passage remained held.'})),
  boundary:'Editable prose draft, not published book'};
 if(medium==='music')return {schema:'jm.cp10.music-cues/1',
  tempo:mode==='amplify'?136:mode==='protect'?84:112,
  measures:items.map(x=>({...x,hz:x.source==='REENTER_PRESERVE'?130.81:s.note,
   beats:x.source==='REENTER_PRESERVE'?2:x.gate?4:1,accent:x.gate?'resolution':s.tone})),
  boundary:'Event score; not rendered recording'};
 return {schema:'jm.cp10.cartoon-beats/1',
  beats:items.map(x=>({...x,motion:x.source==='REENTER_PRESERVE'?'stumble-recover':
   x.gate?s.shape+'-resolve':'approach-contact',frames:x.gate?32:x.source==='REENTER_PRESERVE'?24:14,
   expression:s.tone})),
  boundary:'Animation plan; not rendered film'};
}
export const CP10_AUTHORITIES=Object.freeze({
 schema:'jm.m002.cp10.independent-authorities/1',
 bodies:['JM Shared Contact Kernel v1','ChoiceBox','CombiBind','JMLogic','OneBody IR'],
 scope:'Current-native executed composition, separately versioned donor and host contracts',
 hold:'Independent original THEOGRAPHY runtime, recipient device and final media production'
});
export function executeCP10Composition(input){
 if(!input||!MEDIA.includes(input.medium)||!CHOICES.includes(input.choice)||
  !Number.isInteger(input.stations)||input.stations<2||input.stations>4||
  !Array.isArray(input.actions)||input.actions.length>80||
  typeof input.subject!=='string'||!/^[A-Za-z][A-Za-z0-9 -]{1,27}$/.test(input.subject))
  throw Error('CP10_INPUT_HOLD');
 const original=structuredClone(input),kernel=JMSharedContactKernel(makeConfig(input.stations));
 const actionData=input.actions.map(a=>{
  if(a?.kind==='claim'){
   const target=kernel.stations.find(p=>p.id===a.id);
   if(!target)throw Error('CP10_CONTACT_ID_HOLD');
   return {kind:'claim',x:target.x,y:target.y};
  }
  if(a?.kind==='shock')return {kind:'shock',x:50,y:50};
  throw Error('CP10_ACTION_HOLD');
 });
 const contact=kernel.replay(actionData,'game');
 const decision=ChoiceBox.execute(choicesSource,input.choice);
 const link=CombiBind.execute(bindingSource,
  {identity:'ContactRuntime',caps:{continuity:true,source_proof:true}},
  {identity:'ChoiceRuntime',caps:{continuity:true,source_proof:true}});
 if(link.state.collapsed!==false||link.state.shared.length!==2)
  throw Error('CP10_COMPATIBILITY_HOLD');
 const logic=JMLogic.execute(lawSource,
  {evidence:{ready:contact.gate&&link.state.shared.includes('continuity')&&
   decision.choice.selected===input.choice},creation:{allowed:false}});
 const allowed=logic.runtime.state.creation.allowed===true;
 if(allowed!==contact.gate)throw Error('CP10_RULE_CONTRADICTION_HOLD');
 const artifact=allowed?makeRecipient(input.medium,contact.trace,input.choice,input.subject):null;
 const ir=createOneBodyIR({bodyId:'jm-cp10-'+input.medium,bodyName:'JM CP10 '+input.medium,
  sourceAuthority:'CP9 Kernel + native ChoiceBox, CombiBind and JMLogic',
  nodes:[{id:'contact'},{id:'choice'},{id:'join'},{id:'logic'},{id:'recipient'}],
  links:[{from:'contact',to:'join',kind:'earned'},
    {from:'choice',to:'join',kind:'chosen'},
    {from:'join',to:'logic',kind:'compatible'},
    {from:'logic',to:'recipient',kind:'allowed'}],
  operations:[{op:'SET',name:'earned',value:contact.state.earned.length},
   {op:'SET',name:'required',value:input.stations},
   {op:'SET',name:'permitted',value:allowed},
   {op:'SET',name:'units',value:artifact?contact.trace.length:0},
   {op:'ASSERT',name:'permitted',value:allowed},
   {op:'TRACE',value:{medium:input.medium,choice:input.choice,identity:input.subject}},
   {op:'DING',value:allowed?'CP10_EXECUTED':'CP10_DENIED'}]});
 const portable=executeOneBodyIR(ir);
 if(!portable.receipt.ok||portable.receipt.state.permitted!==allowed)
  throw Error('CP10_ONEBODY_HOLD');
 if(JSON.stringify(original)!==JSON.stringify(input))throw Error('CP10_INPUT_MUTATED');
 return {schema:'jm.m002.cp10.multi-mechanism/1',
  status:allowed?'NATIVE_COMPOSITION_EXECUTED':'NATIVE_COMPOSITION_HELD',
  authorities:CP10_AUTHORITIES,medium:input.medium,subject:input.subject,
  chosen:input.choice,contact:{gate:contact.gate,state:contact.state,trace:contact.trace},
  choice:{state:decision.state,receipt:decision.receipt},
  combibind:{state:link.state,receipt:link.receipt},
  logic:{allowed,decisions:logic.runtime.decisions,receipt:logic.runtime.receipt},
  oneBody:{portable:portable.portable,receipt:portable.receipt},
  artifact,
  scope:'Actual current-native composition in Node host, structured medium outputs; rendered products/device remain separately untested.'};
}
