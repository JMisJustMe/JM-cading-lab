/**
 * JM CP38 — direct original GitHub module execution with original Contact Lab source.
 * Usage: node contact-gamecore-bridge.test.mjs /path/to/protected-original.html
 * No fixture stand-in is accepted when the protected Lab is absent.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { GameCodingRuntime, GameCoding, JMGameCore, JMGameCoreRuntime } from '../sovereign-ten/direct/game-native.mjs';
import { createContactGameCoreSession, CONTACT_GAME_AST, CONTACT_CORE_AST,
         validateContactReceipt, CONTACT_KINDS } from './contact-gamecore-bridge.mjs';
import { createContactReceiptAuthority } from './contact-receipt-authority.node.mjs';

const file=process.argv[2];
if(!file || !fs.existsSync(file))throw Error('HOLD_ORIGINAL_CONTACT_LAB_REQUIRED');
const html=fs.readFileSync(file,'utf8');
const sha=crypto.createHash('sha256').update(html).digest('hex');
assert.equal(sha,'ed72ec0880af89925ab78fe0de125f47613217a3758d9a744dd08420e00c3310','PROTECTED_SOURCE_SHA_MISMATCH');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script,'ORIGINAL_SCRIPT_MISSING');
const split=script.indexOf('  let world=makeWorld()');
assert(split>=0,'ORIGINAL_SCRIPT_SEAM_MISSING');
const context=vm.createContext({structuredClone,JSON,Math,Set,Error,Array,String,Number,Boolean});
vm.runInContext(script.slice(0,split)+'globalThis.LAB={makeWorld,act,recover,replay};})();',context);
const {makeWorld,act,recover,replay}=context.LAB;

let pass=0;
const checks=[];
function check(label,fn){
 try { fn();pass++;checks.push({name:label,pass:true}); }
 catch(error){checks.push({name:label,pass:false,error:String(error)});throw Error(label+': '+error);}
}
function rejects(fn,code){assert.throws(fn,e=>e.code===code,'Expected '+code);}
const cases=[
 ['ice',w=>act(w,1,0,'step'),'low_shear_slide',true],
 ['floor',w=>act(w,-1,0,'step'),'displace',true],
 ['mud',w=>{w.body.y=2;return act(w,1,0,'step')},'traction_stop',false],
 ['boundary',w=>{act(w,-1,0,'step');return act(w,-1,0,'step')},'boundary_return',true],
 ['recovery',w=>{act(w,1,0,'step');return recover(w)},'state_recovered',true],
 ['emptyRecovery',w=>recover(w),'recovery_unavailable',true],
 ['glassRupture',w=>{w.body.x=4;return act(w,1,0,'impact')},'rupture_displace',false],
 ['strataPlastic',w=>{w.body.x=4;w.body.y=2;return act(w,1,0,'impact')},'plastic_deformation',false],
 ['strataElastic',w=>{w.body.x=4;w.body.y=2;return act(w,1,0,'step')},'elastic_return',false]
];
const results=[];
check('all nine genuine lab consequence kinds are routed',()=>assert.deepEqual([...CONTACT_KINDS].sort(),cases.map(x=>x[2]).sort()));
check('real native GameCoding AST and JM GameCore AST parsed',()=>{
 assert.equal(CONTACT_GAME_AST.mechanics.length,9);
 assert.equal(CONTACT_CORE_AST.systems.length,9);
 assert.equal(CONTACT_CORE_AST.organs.length,9);
});
for(const [label,run,kind,canReplay] of cases){
 const w=makeWorld(),r=run(w),ev='contact.'+kind;
 const authority=createContactReceiptAuthority(),session=createContactGameCoreSession({authenticate:authority.authenticate});
 check(label+' original consequence',()=>assert.equal(r.consequence,kind));
 check(label+' original coordinate hash',()=>assert.equal(validateContactReceipt(r,ev),r));
 let proof;
 check(label+' host capture',()=>{proof=authority.capture(w,r);assert.equal(proof.eventId,r.eventId)});
 let result;
 check(label+' true native dispatch',()=>{result=session.dispatch(r,proof,ev);assert.equal(result.consequence,kind);assert.equal(result.contact.outcome,kind)});
 check(label+' native original identity',()=>assert.equal(result.nativeReceipt&&result.nativeReceipt.resultDigest?true:false,true));
 check(label+' real mechanic and system trace',()=>{
  assert(result.mechanicTrace.some(x=>x.type==='mechanic.applied'));
  assert(result.nativeTrace.some(x=>x.type==='organ.dispatched'));
  assert(result.nativeTrace.some(x=>x.type==='system.completed'));
 });
 check(label+' lossless original pressure and coordinates retained',()=>{
  assert.equal(result.contact.pressure,r.pressure);
  assert.equal(result.contact.start,r.start);
  assert.equal(result.contact.end,r.end);
  assert.equal(result.contact.traceId,r.eventId);
 });
 check(label+' native result is independent object',()=>assert.notEqual(result.contact,r));
 check(label+' session replay rejected',()=>rejects(()=>session.dispatch(r,proof,ev),'CONTACT_REPLAY_REJECTED'));
 const tampered=structuredClone(r);tampered.pressure=999;
 check(label+' tampered pressure rejected',()=>assert.equal(authority.authenticate(tampered,proof),false));
 check(label+' event misroute rejected',()=>rejects(()=>session.dispatch(r,proof,'contact.other'),'CONTACT_WRONG_EVENT'));
 check(label+' forged signature rejected',()=>{
   const fake={...proof,tag:'0'.repeat(64)};
   assert.equal(authority.authenticate(r,fake),false);
 });
 check(label+' coordinate tampering rejected',()=>{
   const fake=structuredClone(r);fake.coordinates.source.row=129;
   rejects(()=>validateContactReceipt(fake,ev),'CONTACT_COORDINATE_MISMATCH');
 });
 if(canReplay)check(label+' deterministic original replay',()=>assert.equal(replay(w).pass,true));
 results.push({label,event:ev,eventId:r.eventId,labStart:r.start,labEnd:r.end,pressure:r.pressure,nativeOutcome:result.contact.outcome,sourceHash:sha,replay:canReplay?'PASS':'MANUAL_START_HOLD'});
}
check('mutable-ledger-plus-receipt forgery after host pin rejected',()=>{
 const w=makeWorld(),r=act(w,-1,0,'step');
 const authority=createContactReceiptAuthority(),proof=authority.capture(w,r);
 const altered=structuredClone(r);altered.pressure=777;
 w.ledger[w.ledger.length-1]=altered;
 assert.equal(authority.authenticate(altered,proof),false);
 const s=createContactGameCoreSession({authenticate:authority.authenticate});
 rejects(()=>s.dispatch(altered,proof),'CONTACT_COORDINATE_MISMATCH');
 const altered2=structuredClone(r);altered2.details='fabricated despite valid coordinates';
 w.ledger[w.ledger.length-1]=altered2;
 assert.equal(authority.authenticate(altered2,proof),false);
 rejects(()=>s.dispatch(altered2,proof),'CONTACT_AUTHENTICATION_FAILED');
 assert.equal(s.status().completed,0);
});
check('wrong-session receipt signature rejected',()=>{
 const w=makeWorld(),r=act(w,-1,0,'step'),authority=createContactReceiptAuthority();
 const other=createContactReceiptAuthority(),proof=authority.capture(w,r);
 assert.equal(other.authenticate(r,proof),false);
 rejects(()=>createContactGameCoreSession({authenticate:other.authenticate}).dispatch(r,proof),'CONTACT_AUTHENTICATION_FAILED');
});
check('missing authenticator rejected',()=>rejects(()=>createContactGameCoreSession(),'CONTACT_AUTHENTICATOR_REQUIRED'));
check('native runtime itself rejects undeclared event',()=>{
 const g=new GameCodingRuntime(CONTACT_GAME_AST,{contact:{route:'displace',outcome:'none'}});
 const c=new JMGameCoreRuntime(CONTACT_CORE_AST,g);
 assert.throws(()=>c.dispatch('Contact_displace','contact.invalid'),e=>e.code==='JMG_UNHANDLED_EVENT');
 assert.equal(g.state.contact.outcome,'none');
});
check('failed native invariant cannot commit a result or consume signed proof',()=>{
 const w=makeWorld(),r=act(w,-1,0,'step');
 const authority=createContactReceiptAuthority(),proof=authority.capture(w,r);
 const broken=JMGameCore.parse('organ ContactOrgan_displace {\n handles = [Contact]\n rules = [Apply_displace]\n invariants = {\n contact.outcome == "not-displace"\n }\n}\nsystem Contact_displace {\n organs = [ContactOrgan_displace]\n events = [contact.displace]\n identity = "JM.ContactLab.v0.1/displace"\n}');
 const brokenSession=createContactGameCoreSession({authenticate:authority.authenticate,coreProgram:broken});
 assert.throws(()=>brokenSession.dispatch(r,proof),e=>e.code==='JMG_INVARIANT_FAILED');
 assert.equal(brokenSession.status().completed,0);
 const correct=createContactGameCoreSession({authenticate:authority.authenticate});
 assert.equal(correct.dispatch(r,proof).consequence,'displace');
});
check('original records remain untouched on disk',()=>assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha));

const report={schema:'jm.cp38.direct-native/1.0',repoModule:'coding-estate/sovereign-ten/direct/game-native.mjs',sourceSha256:sha,passed:pass,failed:0,cases:results,checks,holds:['No external durable authentication: host session key and pinned records are in memory','No direct Fold8 physical gesture evidence','Native GameCore applies event-specific outcome, while original Contact Lab retains physics authority']};
if(process.env.CP38_REPORT_PATH)fs.writeFileSync(process.env.CP38_REPORT_PATH,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:pass,failed:0,cases:results.map(x=>({name:x.label,event:x.event,native:x.nativeOutcome})),holds:report.holds},null,2));
