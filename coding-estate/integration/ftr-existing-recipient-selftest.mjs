import assert from 'node:assert/strict';
import {contactEvent} from './ftr-eight-contact.mjs';
import {wakeMEETPOINTFromFTR,sharedReentry} from './theogamy-contact.mjs';
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
const refuses=(fn,message)=>assert.throws(fn,e=>e.message===message);
const world={
  schema:'jm.meetpoint.world/0.1',mode:'ai',age:27,
  players:[{id:'P1',island:'B',x:550,y:83,goal:{x:11,y:3}}],
  islands:{A:{built:['shelter'],stock:{wood:7}},B:{built:['workshop','dock'],stock:{ore:6}},C:{built:[],stock:{}}},
  events:[]
};
const before=structuredClone(world);
const wake=contactEvent({source:'Ama-Pro',gesture:'wake',pressure:0.5,sequence:3});
const result=wakeMEETPOINTFromFTR({world,contact:wake});
check('Existing MEETPOINT source re-entry actually changes position',()=>assert.equal(result.result.state.players[0].x,495));
check('Existing MEETPOINT original still immutable',()=>assert.deepEqual(world,before));
check('Existing earned stock and structures preserved',()=>assert.deepEqual(result.result.state.islands,world.islands));
check('Existing world mode is retained',()=>assert.equal(result.result.state.mode,'ai'));
check('Original game reentry event actually emitted',()=>assert.equal(result.result.state.events[0].event,'THEOGAMY_REENTRY'));
check('Ama-Pro origin stays Ama-Pro, not a new invented controller',()=>assert.equal(result.inputSource,'Ama-Pro'));
check('GripRoute stays a distinct compatible origin',()=>{
 const other=wakeMEETPOINTFromFTR({world,contact:contactEvent({source:'GripRoute',gesture:'wake',sequence:4})});
 assert.equal(other.inputSource,'GripRoute'); assert.equal(other.result.state.players[0].x,495);
});
check('Only Wake is accepted by the existing source reentry',()=>refuses(()=>wakeMEETPOINTFromFTR({world,contact:contactEvent({source:'Ama-Pro',gesture:'press'})}),'FTR_CONTACT_NOT_WAKE'));
check('Forged KicPlay label cannot be transferred as source',()=>refuses(()=>wakeMEETPOINTFromFTR({world,contact:{...wake,kicPlay:'Pulse'}}),'FTR_INPUT_NOT_CANONICAL'));
check('Wrong world schema refused by old donor',()=>refuses(()=>wakeMEETPOINTFromFTR({world:{...world,schema:'fake'},contact:wake}),'WORLD_SCHEMA'));
check('Out-of-bounds player refused',()=>refuses(()=>wakeMEETPOINTFromFTR({world,contact:wake,playerIndex:12}),'PLAYER_MISSING'));
check('Physical hardware or Gardles is not falsely claimed',()=>{
 assert.equal(result.physicalDevice,'NOT_TESTED');
 assert.equal(result.gardles,'HOLD_NATIVE_SOURCE_NOT_MOUNTED');
 assert.equal(result.proof,'NODE_HOST_EXISTING_MEETPOINT_RULES_ONLY');
});
check('Preexisting direct sharedReentry still works untouched',()=>assert.deepEqual(result.result.state,sharedReentry(world).state));
console.log(JSON.stringify({schema:'jm.ftr.existing-recipient-contact/0.1',passed,failed:0,
  modifiedExistingRecipient:'theogamy-contact.mjs',source:'original MEETPOINT sharedReentry',
  claimBoundary:'Node host on authentic existing game rule, not physical Ama-Pro, live game renderer, or Gardles-native'}));
