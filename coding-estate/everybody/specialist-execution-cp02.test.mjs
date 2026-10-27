import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {specialistPrograms,executeSpecialistLine,SPECIALIST_LINE} from './specialist-execution-cp02.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const read=p=>JSON.parse(readFileSync(join(dir,p),'utf8'));
function fixture(){
 const f={schema:'jm.everybody.registry-federation/1.1',bodies:[
  ...read('body-registry.json').bodies,
  ...read('body-registry-extension-01.json').bodies,
  ...read('body-registry-extension-02.json').bodies
 ]};
 return {f,c:read('../JM_CODING_ESTATE_CURRENT_64.json')};
}
const run=(f,c,opts)=>executeSpecialistLine(specialistPrograms(f,opts),f,c);
const mod=(programs,id,cb)=>{const p=programs.find(x=>x.bodyId===id);p.source=cb(p.source);return programs;};
test('actual repo: native source 100 unique IDs and real four Current64 seats',()=>{
 const {f,c}=fixture();
 assert.equal(f.bodies.length,100);
 assert.equal(new Set(f.bodies.map(x=>x.id)).size,100);
 assert.deepEqual(SPECIALIST_LINE.map(s=>c.identities.find(x=>x.slug===s).code_id),[26,29,21,39]);
});
test('four real canonical-native compiles drive route → state → formula → game scoring',()=>{
 const {f,c}=fixture(),out=run(f,c);
 assert.equal(out.ok,true,JSON.stringify(out.diagnostic));
 assert.equal(out.committed,true);
 assert.deepEqual(out.state,{route:{from:'route-code',to:'statefield',source:'jm-specialist-demo'},energy:3,
   pressure:8,game:{team:'bird',turn:1,awarded:2,score:2,thresholdMet:true}});
 assert.deepEqual(out.receipts.map(x=>x.effect),['route_opened','state_written','formula_add','game_threshold_score']);
});
test('score below threshold is 0, not cosmetic success',()=>{
 const {f,c}=fixture(),out=run(f,c,{energy:1,by:2,threshold:6,points:4});
 assert.equal(out.ok,true);assert.equal(out.state.pressure,3);assert.equal(out.state.game.score,0);
 assert.equal(out.state.game.thresholdMet,false);
});
test('other team and threshold pressure alter actual recipient state',()=>{
 const {f,c}=fixture(),out=run(f,c,{energy:10,by:-3,threshold:7,points:9,team:'worm'});
 assert.equal(out.ok,true);assert.equal(out.state.game.team,'worm');
 assert.equal(out.state.pressure,7);assert.equal(out.state.game.score,9);
});
test('native source formatting and effects remain deterministic on replay',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 assert.deepEqual(executeSpecialistLine(p,f,c),executeSpecialistLine(p,f,c));
});
test('each of 4 identities has its own noninterchangeable source and trace',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f),out=executeSpecialistLine(p,f,c);
 assert.equal(new Set(p.map(x=>x.source)).size,4);
 assert.deepEqual(out.receipts.map(x=>x.bodyId),SPECIALIST_LINE);
 assert.deepEqual(out.receipts.map(x=>x.codeId),[26,29,21,39]);
 assert(out.receipts.every(x=>x.sourceValidated && x.sourceLines.length>=1));
 assert.match(out.executionBoundary,/no separate OS process/);
});
test('original registries never mutated by execution',()=>{
 const {f,c}=fixture(),before=JSON.stringify({f,c});run(f,c,{energy:9,by:5});
 assert.equal(JSON.stringify({f,c}),before);
});
test('invalid native federation stays HOLD',()=>{
 const {f,c}=fixture();f.schema='fake';
 const out=run(f,c);assert.equal(out.diagnostic.code,'NATIVE_REGISTRY_REQUIRED');assert.equal(out.committed,false);
});
test('invalid Current-64 authority stays HOLD',()=>{
 const {f,c}=fixture();c.schema='wrong';assert.equal(run(f,c).diagnostic.code,'CURRENT_64_REQUIRED');
});
test('spoofed current identity seat fails before effect',()=>{
 const {f,c}=fixture();c.identities.find(x=>x.slug==='statefield').code_id=66;
 const out=run(f,c);assert.equal(out.diagnostic.code,'SOVEREIGN_SEAT_MISMATCH');
 assert.equal(out.state,null);assert.equal(out.receipts.length,0);
});
test('reordered specialist stages cannot masquerade as route',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);p.reverse();
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'BODY_ORDER_OR_SOURCE_BOUNDARY');
});
test('missing stages fail closed',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);p.pop();
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'FOUR_SPECIALIST_STEPS_REQUIRED');
});
test('foreign native source cannot run under a different body',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);p[1].source=p[0].source;
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'CANONICAL_NATIVE_SOURCE_HOLD');
});
test('wrong body governing LAW cannot bypass canonical compiler',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 p[2].source=p[2].source.replace(/^LAW .+$/m,'LAW "forged-law"');
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'CANONICAL_NATIVE_SOURCE_HOLD');
});
test('unsupported body-family command is rejected by original native grammar',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'statefield',s=>s.replace(/^STATE /m,'SCORE '));
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'CANONICAL_NATIVE_SOURCE_HOLD');
});
test('missing native Ding cannot be mistaken for effect proof',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'formula-born-code',s=>s.replace(/^DING .+$/m,''));
 const out=executeSpecialistLine(p,f,c);
 assert.equal(out.diagnostic.code,'CANONICAL_NATIVE_SOURCE_HOLD');assert.equal(out.committed,false);
});
test('new command inserted after END fails native parser',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 p[3].source+='\nSCORE {"team":"bird"}';
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'CANONICAL_NATIVE_SOURCE_HOLD');
});
test('wrong route destination cannot apply changes',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'route-code',s=>s.replace('"to":"statefield"','"to":"game-coding"'));
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'ROUTE_BOUNDARY');
});
test('unauthorised state field cannot be written',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'statefield',s=>s.replace('"key":"energy"','"key":"secret"'));
 const out=executeSpecialistLine(p,f,c);
 assert.equal(out.diagnostic.code,'STATE_FIELD_NOT_ALLOWED');assert.equal(out.state,null);
});
test('additional semantically valid but unapproved STATE is held and rolled back',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'statefield',s=>s.replace(/^STATE .+$/m,m=>m+'\n'+m));
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'SPECIALIST_OPERATION_COUNT');
});
test('different formula operation cannot silently inherit add semantics',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'formula-born-code',s=>s.replace('"operator":"add"','"operator":"multiply"'));
 const out=executeSpecialistLine(p,f,c);
 assert.equal(out.diagnostic.code,'FORMULA_BOUNDARY');
 assert.equal(out.state,null);assert.equal(out.receipts.length,0);
 assert.deepEqual(out.attempted.map(x=>x.effect),['route_opened','state_written']);
});
test('negative points never slip into game rule',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'game-coding',s=>s.replace('"points":2','"points":-2'));
 const out=executeSpecialistLine(p,f,c);
 assert.equal(out.diagnostic.code,'UNSAFE_NUMBER');assert.equal(out.committed,false);
});
test('game score must target rule team',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'game-coding',s=>s.replace(/^SCORE .+$/m,'SCORE {"team":"other"}'));
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'GAME_RULE_BOUNDARY');
});
test('game action cannot add a second unapproved reward',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'game-coding',s=>s.replace(/^SCORE .+$/m,m=>m+'\n'+m));
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'SPECIALIST_OPERATION_COUNT');
});
test('builder refuses NaN and unsafe team names before compiling',()=>{
 const {f}=fixture();assert.throws(()=>specialistPrograms(f,{energy:NaN}),/UNSAFE_NUMBER/);
 assert.throws(()=>specialistPrograms(f,{team:'__proto__'}),/UNSAFE_LABEL/);
 assert.throws(()=>specialistPrograms(f,{points:1.5}),/UNSAFE_NUMBER/);
});
test('strict payload keys block pollution/cross-body hidden fields',()=>{
 const {f,c}=fixture(),p=specialistPrograms(f);
 mod(p,'statefield',s=>s.replace('"key":"energy"','"__proto__":"evil","key":"energy"'));
 assert.equal(executeSpecialistLine(p,f,c).diagnostic.code,'BAD_PAYLOAD_FIELDS');
});
test('successful native fixture does not elevate to historical or physical proof',()=>{
 const {f,c}=fixture(),out=run(f,c);
 assert.equal(out.status,'BOUNDED_SPECIALIST_HOST_PASS');
 assert.equal(out.receipts[3].canonicalDingScope,'SOURCE_AND_PORTABLE_RUNTIME_ONLY');
 assert(!JSON.stringify(out).includes('PHYSICAL_FOLD_PASS'));
});
