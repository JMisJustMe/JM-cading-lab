// CP9: public in-repository proof of one exact shared executable function.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {JMSharedContactKernel} from '../coding-estate/integration/shared-contact-kernel-v1.mjs';
let checks=0;
const ok=(x,m)=>{assert.ok(x,m);checks++};
const eq=(x,y,m)=>{assert.deepEqual(x,y,m);checks++};
const hold=(fn,m)=>{assert.throws(fn,new RegExp(m));checks++};
const digest=createHash('sha256').update(JMSharedContactKernel.toString()).digest('hex');
eq(digest,'7d18c7ff357c97b931b882f13fd3058ce4291108d59d78685db63a7bc5d17433','EXACT_RUNTIME_FUNCTION_HASH');
const config=(stations,receiptKind='CURRENT_EARNED')=>({stations,receiptKind,radius:58,
 shock:{x:510,y:480,radius:56,requires:'A'}});
const k=JMSharedContactKernel(config([{id:'A',x:255,y:480},{id:'B',x:765,y:480}]));
let s={schema:'jm.m002.cp7.contact-state/1',earned:[],receipts:[],shocks:0,routeOpen:false};
ok(!k.gate(s),'NO_PREAWARD');
ok(!k.claim(s,{x:20,y:20}).changed,'PROXIMITY_HOLD');
ok(!k.shock(s,{x:510,y:480}).changed,'EARLY_SHOCK_HOLD');
let earned=k.claim(s,{x:255,y:480});
ok(earned.changed,'A_RECEIPT');
eq(earned.state.earned,['A'],'A_EARNED');
eq(s.earned,[],'PURE_IMMUTABLE_TRANSITION');
ok(!k.gate(earned.state),'ONE_IS_NOT_TWO');
let back=k.shock(earned.state,{x:510,y:480});
ok(back.changed,'CONTACT_RECOVERY');
eq(back.state.earned,['A'],'RECOVER_PRESERVES_A');
ok(!k.shock(back.state,{x:510,y:480}).changed,'SHOCK_ONCE');
let full=k.claim(back.state,{x:765,y:480});
eq(full.state.earned,['A','B'],'TWO_EARNED');
ok(k.gate(full.state),'NATIVE_GATE_UNLOCK');
eq(full.state.routeOpen,true,'STATE_GATE_INVARIANT');
ok(k.validate(full.state),'VALIDATED_REAL_CONTACT');
const tamper=structuredClone(full.state);tamper.receipts[0].x=999;
hold(()=>k.validate(tamper),'JM_CONTACT_INVARIANT_HOLD');
const forge=structuredClone(full.state);forge.routeOpen=false;
hold(()=>k.validate(forge),'JM_CONTACT_INVARIANT_HOLD');
// The same kernel must accept Five//Flip's native receipt grammar, but must
// never rewrite its combat bodies/powers or force the same visual interface.
const five=JMSharedContactKernel({stations:[{id:'A',x:340,y:465},{id:'B',x:550,y:210}],
 receiptKind:'EARNED_BY_PLAYER_CONTACT',radius:73,shock:{x:440,y:350,radius:53,requires:'A'}});
let fiveState={schema:'jm.m002.cp8.fiveflip-contact/1',earned:[],receipts:[],shocks:0,
 spent:false,activations:[],generation:1};
fiveState=five.claim(fiveState,{x:340,y:465}).state;
fiveState=five.shock(fiveState,{x:440,y:350}).state;
fiveState=five.claim(fiveState,{x:550,y:210}).state;
ok(five.gate(fiveState),'INDEPENDENT_SECOND_GAME_GATE');
eq(fiveState.receipts[0].kind,'EARNED_BY_PLAYER_CONTACT','FIVEFLIP_RECEIPT_IDENTITY');
eq(fiveState.spent,false,'KEEP_ROLE_POWER_SEPARATE');
eq(fiveState.generation,1,'KEEP_RECIPIENT_PROFILE_SCHEMA');
eq(fiveState.shocks,1,'FIVEFLIP_REAL_REENTRY');
// Five distinct output contracts must be CAUSED by execution, not decorative labels.
const actions=[{kind:'claim',x:255,y:480},{kind:'shock',x:510,y:480},{kind:'claim',x:765,y:480}];
const output=[];
for(const medium of ['game','comic','book','music','cartoon']){
 const x=k.replay(actions,medium);
 ok(x.gate,'MEDIUM_MISSING_CAUSAL_GATE_'+medium);
 eq(x.trace.length,3,'MISSING_CONTACT_TRACE_'+medium);
 ok(x.artifact.schema.includes(medium),'NOT_SEPARATE_FORMAT_'+medium);
 const values=Object.values(x.artifact).find(v=>Array.isArray(v));
 eq(values.length,3,'UNEXECUTED_MEDIUM_UNITS_'+medium);
 output.push({medium,schema:x.artifact.schema});
}
eq(new Set(output.map(x=>x.schema)).size,5,'FIVE_REAL_ARTIFACT_CONTRACTS');
const four=JMSharedContactKernel(config([{id:'A',x:255,y:480},{id:'B',x:765,y:480},
 {id:'C',x:300,y:430},{id:'D',x:450,y:430}]));
const partial=four.replay([{kind:'claim',x:255,y:480},{kind:'claim',x:765,y:480},
 {kind:'claim',x:300,y:430}],'comic');
ok(!partial.gate,'THREE_OF_FOUR_MUST_NOT_UNLOCK');
const all=four.replay([{kind:'claim',x:255,y:480},{kind:'claim',x:765,y:480},
 {kind:'claim',x:300,y:430},{kind:'claim',x:450,y:430}],'cartoon');
ok(all.gate,'CONFIGURABLE_MULTI_CURRENT_GATE');
eq(all.artifact.beats.length,4,'MULTI_BEAT_OUTPUT');
hold(()=>k.replay([{kind:'fabricate',x:255,y:480}],'comic'),'JM_CONTACT_ACTION_HOLD');
hold(()=>k.replay([], 'undefined-medium'),'JM_CONTACT_MEDIUM_OR_SEQUENCE_HOLD');
hold(()=>JMSharedContactKernel(config([{id:'A',x:1,y:1},{id:'A',x:2,y:2}])),'JM_CONTACT_CONFIG_HOLD');
// Direct host eligibility must not accept an earned-ID list without its receipts.
const bare={...structuredClone(full.state),receipts:[]};
hold(()=>k.gate(bare),'JM_CONTACT_INVARIANT_HOLD');
hold(()=>k.gate(tamper),'JM_CONTACT_INVARIANT_HOLD');
hold(()=>k.gate(forge),'JM_CONTACT_INVARIANT_HOLD');
const fiveForged=structuredClone(fiveState);fiveForged.receipts[0].kind='CURRENT_EARNED';
hold(()=>five.gate(fiveForged),'JM_CONTACT_INVARIANT_HOLD');
eq(fiveState.receipts[0].kind,'EARNED_BY_PLAYER_CONTACT','FOREIGN_RECEIPT_REJECTION_PRESERVES_FIVEFLIP');
for(const medium of ['game','comic','book','music','cartoon']){
 const valid=k.replay(actions,medium),snapshot=structuredClone(valid.state);
 const bad=structuredClone(valid.state);bad.receipts[0].x+=1;
 hold(()=>k.gate(bad),'JM_CONTACT_INVARIANT_HOLD');
 ok(k.gate(valid.state),'VALID_RECIPIENT_STILL_OPENS_'+medium);
 eq(valid.state,snapshot,'ELIGIBILITY_DOES_NOT_MUTATE_'+medium);
}
const proof={schema:'jm.m002.cp9.multi-recipient-real-source/1',status:'PASS',checks,
 functionSha256:digest,realSource:'coding-estate/integration/shared-contact-kernel-v1.mjs',
 recipients:['GameForge opt-in source grammar','FIVE//FLIP opt-in source grammar',
 ...output.map(x=>x.medium)],output,
 boundary:'In-repo Node exercises exact source and host data contracts. Owner-private CP8 game and production HTML run separately in local browser proof. No owner device, release, finished media, or original THEOGRAPHY execution.'};
console.log(JSON.stringify(proof));
