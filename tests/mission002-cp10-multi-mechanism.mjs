import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executePortable} from '../coding-estate/everybody/compiler-core.mjs';
import {executeCP10Composition,CP10_AUTHORITIES} from '../coding-estate/integration/m002-cp10-multi-mechanism.mjs';
let checks=0;
const yes=(ok,label)=>{assert.ok(ok,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const throws=(f,label)=>{assert.throws(f,/CP10_|JM_CONTACT_/,label);checks++;};
const media=['game','comic','book','music','cartoon'];
const choices=['protect','explore','amplify'];
const stations=['A','B','C','D'];
const complete=(n)=>[{kind:'claim',id:'A'},{kind:'shock'},...stations.slice(1,n).map(id=>({kind:'claim',id}))];
const receipt={schema:'jm.m002.cp10.real-multi-mechanism/1',status:'PENDING',
 currentNativeAuthorities:CP10_AUTHORITIES.bodies,complete:[],holds:[],checks:0,
 proof:'ACTUAL_EXISTING_CHOICES_BIND_LOGIC_IR_EXECUTION_AND_FIVE_DISTINCT_RECIPIENTS',
 limits:'No finished external recipient production, physical Samsung or recovered original THEOGRAPHY runtime.'};
let variety={};
for(const medium of media){
 const signatures=[];
 for(const choice of choices){
  const i={medium,choice,stations:4,subject:'JM Krix',actions:complete(4)};
  const original=JSON.stringify(i);
  const got=executeCP10Composition(i);
  same(JSON.stringify(i),original,'NO_INPUT_MUTATION');
  same(got.status,'NATIVE_COMPOSITION_EXECUTED','NO_FALSE_PERMISSION');
  same(got.contact.state.earned,stations,'FOUR_INDEPENDENT_CONTACTS');
  same(got.contact.state.shocks,1,'ACTUAL_PRESERVED_RECOVERY');
  yes(got.logic.allowed,'NATIVE_WORLD_LOGIC_FALSE');
  yes(got.combibind.state.shared.includes('continuity'),'ACTUAL_COMPATIBILITY_MISSING');
  yes(got.combibind.state.collapsed===false,'SOURCE_IDENTITIES_COLLAPSED');
  same(got.choice.state.creative.response,choice,'NATIVE_CHOICE_NOT_COMMITTED');
  yes(got.oneBody.receipt.ok,'ONEBODY_RECEIPT_FAILED');
  same(got.oneBody.receipt.state.units,5,'OUTPUT_UNITS_NOT_ACTUAL_CONTACT_TRACE');
  same(executePortable(structuredClone(got.oneBody.portable)).state.permitted,true,
    'PORTABLE_CANNOT_REEXECUTE');
  yes(got.artifact.schema.includes(medium),'RECIPIENT_NOT_DISTINCT');
  signatures.push(JSON.stringify(got.artifact));
  receipt.complete.push({medium,choice,artifactSchema:got.artifact.schema,
    earned:got.contact.state.earned.length,shock:got.contact.state.shocks,
    nativeDecision:got.logic.decisions.map(x=>x.matched)});
 }
 same(new Set(signatures).size,3,'CHOICE_DOES_NOT_AFFECT_ACTUAL_'+medium);
 variety[medium]=signatures.map(x=>JSON.parse(x).schema);
}
same(new Set(Object.values(variety).map(a=>a[0])).size,5,'FIVE_OUTPUTS_ALL_SAME_SCHEMA');
for(const n of [2,3,4]){
 for(const medium of media){
  const a=executeCP10Composition({medium,choice:'protect',stations:n,
    subject:'JM Krix',actions:complete(n).slice(0,-1)});
  same(a.status,'NATIVE_COMPOSITION_HELD','UNFINISHED_PROGRESSED_'+medium);
  same(a.artifact,null,'UNAUTHORIZED_OUTPUT_GENERATED');
  same(a.oneBody.receipt.state.permitted,false,'DENIAL_DING_NOT_SCOPED');
  yes(a.contact.state.earned.length<n,'CONTACT_NOT_ACTUALLY_MISSING');
  receipt.holds.push({medium,required:n,earned:a.contact.state.earned.length});
 }
}
const three=executeCP10Composition({medium:'game',choice:'explore',stations:3,
 subject:'JM Vexa',actions:complete(3)});
same(three.artifact.ability.type,'ROUTE_LEAP','EXPLORE_HAS_NO_DISTINCT_MECHANIC');
const guard=executeCP10Composition({medium:'game',choice:'protect',stations:3,
 subject:'JM Vexa',actions:complete(3)});
same(guard.artifact.ability.type,'GUARD_FIELD','PROTECT_HAS_NO_DISTINCT_MECHANIC');
const blast=executeCP10Composition({medium:'game',choice:'amplify',stations:3,
 subject:'JM Vexa',actions:complete(3)});
same(blast.artifact.ability.type,'RESONANCE_BLAST','AMPLIFY_HAS_NO_DISTINCT_MECHANIC');
same(new Set([guard.artifact.ability.type,three.artifact.ability.type,blast.artifact.ability.type]).size,
 3,'COMBAT_IDENTITY_COLLAPSE');
const input={medium:'comic',choice:'explore',stations:4,subject:'JM Krix'};
throws(()=>executeCP10Composition({...input,actions:[{kind:'claim',id:'X'}]}),'FORGED_CONTACT_ALLOWED');
throws(()=>executeCP10Composition({...input,actions:[{kind:'teleport'}]}),'UNDECLARED_ACTION');
throws(()=>executeCP10Composition({...input,actions:[],choice:'absent'}),'UNKNOWN_CHOICE');
throws(()=>executeCP10Composition({...input,actions:[],medium:'podcast'}),'UNKNOWN_MEDIUM');
throws(()=>executeCP10Composition({...input,actions:[],stations:1}),'UNSAFE_SMALL_SET');
throws(()=>executeCP10Composition({...input,actions:[],subject:'__bad__'}),'INVALID_SUBJECT');
receipt.checks=checks;receipt.status='PASS_NATIVE_MULTI_MECHANISM';
fs.mkdirSync('qa/m002-foundations',{recursive:true});
fs.writeFileSync('qa/m002-foundations/CP10_MULTI_MECHANISM_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/CP10_GAME_ABILITIES.json',JSON.stringify(
 {guard:guard.artifact,route:three.artifact,blast:blast.artifact},null,2)+'\n');
console.log(JSON.stringify({schema:receipt.schema,status:receipt.status,checks,
 media,choices,provenCompositions:receipt.complete.length,
 incompleteHolds:receipt.holds.length,uniqueAbilities:3,
 originalTheography:'HOLD',device:'HOLD'}));

// CP11: actual CP10-composed state changes in two separately typed recipients.
await import('./mission002-cp11-real-recipients.mjs');
