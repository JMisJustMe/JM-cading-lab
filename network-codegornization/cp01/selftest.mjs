import assert from 'node:assert/strict';
import { JMNetworkFederation, originalNativeBodies, validateEnvelope } from './jm-network-federation.mjs';

const tests=[];
function check(name,action){try{action();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}}
const fixture=(channel='mail',id='message_001',role='owner',validated=true,message='Offline JM test only')=>({channel,id,role,validated,message});
const names=['FlowTalk','JMLogic','JM32-1DA','RouteScript','RouteVM','RouteOS','TraceBox','Dings','CombiBind','Choice Box'];
check('01 all ten real source identities declared',()=>assert.deepEqual(originalNativeBodies,names));
check('02 canonical envelope accepted',()=>assert.equal(validateEnvelope(fixture()).id,'message_001'));
for(const [i,ch] of ['mail','device','storage'].entries()){
 check('0'+(i+3)+' '+ch+' native route queued',()=>{
   const f=new JMNetworkFederation(),r=f.process(fixture(ch,'ok_'+ch));
   assert.equal(r.result,'queued');assert.equal(r.queueLength,1);
   assert.equal(f.snapshot().outbox[0].channel,ch);
   assert.equal(r.deliveryScope,'SANDBOX_LOCAL_MEMORY_ONLY');
 });
}
let receipt,dispatcher;
check('06 ten donor executions surfaced through proof fields',()=>{
 dispatcher=new JMNetworkFederation();receipt=dispatcher.process(fixture());
 assert.deepEqual(Object.keys(receipt.bodyProof).sort(),[...names].sort());
 for(const name of ['FlowTalk','JMLogic','JM32-1DA','RouteVM','RouteOS','CombiBind','Choice Box','Dings'])assert.equal(typeof receipt.bodyProof[name],'string');
 assert.equal(receipt.bodyProof.RouteScript,'NetworkRoute:start');
 assert.ok(receipt.bodyProof.TraceBox>0);
});
check('07 duplicate ID denied',()=>{
 const r=dispatcher.process(fixture());assert.equal(r.result,'denied');assert.equal(r.bodyProof.Dings,null);
});
check('08 duplicate cannot increase queue',()=>assert.equal(dispatcher.snapshot().outbox.length,1));
check('09 guest refused',()=>{
 const f=new JMNetworkFederation(),r=f.process(fixture('mail','guest_001','guest'));
 assert.equal(r.result,'denied');assert.equal(f.snapshot().outbox.length,0);
});
check('10 unvalidated owner refused',()=>{
 const f=new JMNetworkFederation(),r=f.process(fixture('mail','unvalidated','owner',false));
 assert.equal(r.result,'denied');assert.equal(f.snapshot().outbox.length,0);
});
check('11 denial never earns Ding',()=>{
 const f=new JMNetworkFederation(),r=f.process(fixture('device','guest_002','guest'));
 assert.equal(r.bodyProof.Dings,null);
});
check('12 queues do not send externally',()=>{
 const f=new JMNetworkFederation(),r=f.process(fixture());
 assert.equal(f.snapshot().outbox[0].carrier,'local-memory-queue');
 assert.match(r.boundary,/No real remote or SMTP/);
});
check('13 snapshot deep clone isolation',()=>{
 const f=new JMNetworkFederation();f.process(fixture());
 const s=f.snapshot();s.outbox[0].payload='tampered';assert.notEqual(f.snapshot().outbox[0].payload,'tampered');
});
check('14 sequential unique messages accepted',()=>{
 const f=new JMNetworkFederation();f.process(fixture('mail','id_001'));
 assert.equal(f.process(fixture('device','id_002')).queueLength,2);
});
check('15 queue retains payload for local consumer',()=>{
 const f=new JMNetworkFederation(),content='Local test: punctuation!?';
 f.process(fixture('storage','storage_01','owner',true,content));
 assert.equal(f.snapshot().outbox[0].payload,content);
});
check('16 receipt omits raw payload',()=>{
 const f=new JMNetworkFederation(),secret='PRIVATE_FIXTURE_CANARY_123';
 const r=f.process(fixture('mail','private_01','owner',true,secret));
 assert.ok(!JSON.stringify(r).includes(secret));
});
check('17 replay with different channel still denied',()=>{
 const f=new JMNetworkFederation();f.process(fixture('mail','same_identity'));
 assert.equal(f.process(fixture('storage','same_identity')).result,'denied');
});
check('18 stable route schema',()=>assert.equal(new JMNetworkFederation().process(fixture()).schema,'JM.NetworkContact/0.1'));
check('19 route trace digest present',()=>assert.match(new JMNetworkFederation().process(fixture()).traceDigest,/^[0-9a-f]{16}$/));
check('20 no network owner contact claim',()=>assert.match(new JMNetworkFederation().process(fixture()).deliveryScope,/SANDBOX/));
const invalid=[
  null,[],{},1,'x',{...fixture(),channel:'fax'},
  {...fixture(),id:'x'},{...fixture(),id:'../../bad'},{...fixture(),id:123},
  {...fixture(),message:''},{...fixture(),message:'x'.repeat(2049)},
  {...fixture(),message:34},{...fixture(),role:'admin'},
  {...fixture(),validated:'true'},{...fixture(),validated:undefined}
];
invalid.forEach((variant,idx)=>check(String(idx+21).padStart(2,'0')+' rejects malformed envelope '+(idx+1),()=>assert.throws(()=>validateEnvelope(variant))));
check('36 separate instances have separate queues',()=>{
 const one=new JMNetworkFederation(),two=new JMNetworkFederation();one.process(fixture());
 assert.equal(two.snapshot().outbox.length,0);
});
check('37 same fixtures preserve deterministic route state',()=>{
 const a=new JMNetworkFederation().process(fixture()),b=new JMNetworkFederation().process(fixture());
 assert.equal(a.bodyProof.RouteVM,b.bodyProof.RouteVM);
 assert.equal(a.messageDigest,b.messageDigest);
});
check('38 role changes outcome on same payload',()=>{
 const allow=new JMNetworkFederation().process(fixture());
 const deny=new JMNetworkFederation().process(fixture('mail','message_001','guest'));
 assert.equal(allow.result,'queued');assert.equal(deny.result,'denied');
});
check('39 channel changes are observable',()=>{
 const a=new JMNetworkFederation().process(fixture('mail'));
 const b=new JMNetworkFederation().process(fixture('storage'));
 assert.equal(a.channel,'mail');assert.equal(b.channel,'storage');
});
check('40 queued Ding and denied non-Ding differentiated',()=>{
 const f=new JMNetworkFederation(),a=f.process(fixture()),b=f.process(fixture('mail','deny_001','guest'));
 assert.ok(a.bodyProof.Dings);assert.equal(b.bodyProof.Dings,null);
});
check('41 contract preserves local truth boundary',()=>assert.match(new JMNetworkFederation().process(fixture()).boundary,/not authentication/));
const failed=tests.filter(x=>!x.pass);
console.log(JSON.stringify({schema:'JM.NetworkFederation.CP01.Tests/1',total:tests.length,passed:tests.length-failed.length,failed:failed.length,tests},null,2));
if(failed.length)process.exitCode=1;
