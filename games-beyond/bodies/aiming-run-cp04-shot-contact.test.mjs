import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyOriginalShotResponseCP04,restoreOriginalShotResponseCP04,verifyAimingRunReceiptChain} from './aiming-run-cp04-shot-contact.mjs';
import {AIMING_RUN_SOURCE_SHA} from './aiming-run-cp03-recipient.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),load=p=>JSON.parse(readFileSync(join(dir,p),'utf8'));
const native={schema:'jm.everybody.registry-federation/1.1',bodies:[
 ...load('../../coding-estate/everybody/body-registry.json').bodies,
 ...load('../../coding-estate/everybody/body-registry-extension-01.json').bodies,
 ...load('../../coding-estate/everybody/body-registry-extension-02.json').bodies]};
const current=load('../../coding-estate/JM_CODING_ESTATE_CURRENT_64.json');
const codeHash=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)}return('00000000'+(h>>>0).toString(16)).slice(-8)};
function game(power=80){
 const s={version:'0.1A-alpha',trackIndex:0,tracks:[{id:'moving-target',targetAmp:44,targetSpeed:1}],running:true,paused:false,
  score:90,hits:1,misses:0,shots:3,streak:1,projectiles:[{live:true,x:100,y:300}],events:[],receipts:[],previousHash:'00000000'};
 const g={state:s,startRun(){},projectBody(){return {schema:'JM.AimingRunBody/0.1',name:'Aiming Run',version:s.version,source:{sha256:AIMING_RUN_SOURCE_SHA},track:{id:s.tracks[s.trackIndex].id}}}};
 function receipt(reason,extra={}){
  const row={time:'2026-10-28T00:15:00.000Z',reason,previousHash:s.previousHash,track:s.tracks[s.trackIndex].id,extra};row.hash=codeHash(JSON.stringify(row));
  s.previousHash=row.hash;s.receipts.unshift(row);return row;
 }
 receipt('Aiming Run v0.1A genesis',{source:AIMING_RUN_SOURCE_SHA});
 receipt('Run started',{track:'moving-target'});
 const r=receipt('Shot released',{power});
 s.events.unshift({time:r.time,type:'shot_release',body:{power}});
 return g;
}
const apply=(g,options={})=>applyOriginalShotResponseCP04(g,native,current,options);
test('real-source identity and four native coding bodies are retained',()=>{
 assert.equal(native.bodies.length,100);assert.equal(current.identities.length,64);
 assert.deepEqual(['route-code','statefield','formula-born-code','game-coding'].map(x=>current.identities.find(s=>s.slug===x).code_id),[26,29,21,39]);
});
test('source-derived valid original-shot receipt chain passes',()=>assert.equal(verifyAimingRunReceiptChain(game().state),true));
test('witness shot 80 drives four native bodies and actual track amplitude delta',()=>{
 const g=game(80),before={...g.state},result=apply(g);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.event.power,80);
 assert.equal(result.producer.pressure,85);
 assert.equal(result.after.targetAmp,66.44);
 assert.equal(g.state.tracks[0].targetAmp,66.44);
 assert.deepEqual(result.producer.identity.map(x=>x.bodyId),['route-code','statefield','formula-born-code','game-coding']);
 for(const k of ['score','hits','shots','misses','streak']) assert.equal(g.state[k],before[k]);
});
test('low actual shot power triggers distinct slower-amplitude consequence',()=>{
 const g=game(15),x=apply(g);
 assert.equal(x.ok,true);assert.equal(x.producer.thresholdMet,false);
 assert.equal(x.after.targetAmp,36.08);assert.equal(g.state.score,90);
});
test('shots with different recorded powers produce different actual target amplitudes',()=>{
 const high=game(60),low=game(10);
 const a=apply(high),b=apply(low);
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.notEqual(a.after.targetAmp,b.after.targetAmp);
});
test('restore exactly matches original amplitude after paused game',()=>{
 const g=game(),x=apply(g);
 g.state.paused=true;
 const returned=restoreOriginalShotResponseCP04(g);
 assert.equal(returned.ok,true);
 assert.equal(returned.targetAmp,44);
 assert.equal(g.state.tracks[0].targetAmp,44);
});
test('cannot restore live motion before pause',()=>{
 const g=game();apply(g);
 const res=restoreOriginalShotResponseCP04(g);
 assert.equal(res.ok,false);assert.match(res.diagnostic,/PAUSE_BEFORE_RESTORE/);
 assert.equal(g.state.tracks[0].targetAmp,66.44);
});
test('no score or proof-only hit is generated from game event',()=>{
 const source=readFileSync(join(dir,'aiming-run-cp04-shot-contact.mjs'),'utf8');
 assert(!/simulateHit\s*\(/.test(source));assert(!/hitTarget\s*\(/.test(source));
 assert(!/\.score\s*=/.test(source));assert(!/\.hits\s*=/.test(source));
});
test('same receipt cannot be applied repeatedly',()=>{
 const g=game();assert.equal(apply(g).ok,true);
 assert.match(apply(g).diagnostic,/MUST_RESTORE_FIRST/);
 g.state.paused=true;assert.equal(restoreOriginalShotResponseCP04(g).ok,true);
 g.state.paused=false;
 assert.match(apply(g).diagnostic,/SHOT_ALREADY_CONSUMED/);
});
test('changing receiver while active refuses overwrite on restore',()=>{
 const g=game();apply(g);g.state.paused=true;g.state.tracks[0].targetAmp=91;
 assert.match(restoreOriginalShotResponseCP04(g).diagnostic,/GAME_STATE_DRIFT_HOLD/);
 assert.equal(g.state.tracks[0].targetAmp,91);
});
test('changing track identity refuses stale restore',()=>{
 const g=game();apply(g);g.state.paused=true;
 g.state.tracks.push({id:'vertical-drift',targetAmp:92,targetSpeed:1.4});g.state.trackIndex=1;
 assert.match(restoreOriginalShotResponseCP04(g).diagnostic,/GAME_STATE_DRIFT_HOLD/);
 assert.equal(g.state.tracks[1].targetAmp,92);
});
test('fabricated non-game event is rejected',()=>{
 const g=game();g.state.events[0].type='fake_hit';
 assert.match(apply(g).diagnostic,/NO_ORIGINAL_SHOT_EVENT/);
 assert.equal(g.state.tracks[0].targetAmp,44);
});
test('proof-only simulated hit is NOT a shot release',()=>{
 const g=game();g.state.events[0].type='proof_hit';g.state.receipts[0].reason='Proof-only simulated hit';
 assert.equal(apply(g).ok,false);
});
test('no actual live projectile means no contact',()=>{
 const g=game();g.state.projectiles[0].live=false;
 assert.match(apply(g).diagnostic,/NO_ACTUAL_PROJECTILE/);
});
test('paused game is not a live real shot',()=>{
 const g=game();g.state.paused=true;
 assert.match(apply(g).diagnostic,/SHOT_NOT_DURING_LIVE_GAME/);
});
test('tampered receipt chain fails before the game is changed',()=>{
 const g=game();g.state.receipts[0].extra.power=60;
 assert.match(apply(g).diagnostic,/RECEIPT_CHAIN_HOLD/);
 assert.equal(g.state.tracks[0].targetAmp,44);
});
test('tampered previous hash fails before any effect',()=>{
 const g=game();g.state.previousHash='ffffffff';
 assert.equal(verifyAimingRunReceiptChain(g.state),false);
 assert.equal(apply(g).ok,false);
});
test('event and receipt shot power must agree',()=>{
 const g=game();g.state.events[0].body.power=23;
 assert.match(apply(g).diagnostic,/SHOT_POWER_MISMATCH/);
});
test('original source identity spoof refuses',()=>{
 const g=game(),fn=g.projectBody;g.projectBody=()=>({...fn(),source:{sha256:'forged'}});
 assert.match(apply(g).diagnostic,/RECIPIENT_SOURCE_HOLD/);
});
test('invalid current-64 registry blocks producer before receiver effect',()=>{
 const g=game(),bad=structuredClone(current);bad.identities[20].code_id=90;
 const out=applyOriginalShotResponseCP04(g,native,bad);
 assert.equal(out.ok,false);assert.match(out.diagnostic,/CP02_PRODUCER_HOLD/);
 assert.equal(g.state.tracks[0].targetAmp,44);
});
test('invalid native registry blocks source-consequences',()=>{
 const g=game(),bad=structuredClone(native);bad.bodies[0].id=bad.bodies[1].id;
 assert.match(applyOriginalShotResponseCP04(g,bad,current).diagnostic,/CP02_PRODUCER_HOLD/);
});
test('unsafe formula value rejects before receiver change',()=>{
 const g=game();const out=apply(g,{by:Infinity});
 assert.equal(out.ok,false);assert.equal(g.state.tracks[0].targetAmp,44);
});
test('source donor contains actual pointer-triggered shot event and dynamic target amplitude',()=>{
 const donor=readFileSync(join(dir,'aiming-run-v0-1a.html'),'utf8');
 assert.match(donor,/logEvent\('shot_release',\{power:/);
 assert.match(donor,/receipt\('Shot released',\{power:/);
 assert.match(donor,/t\.targetAmp/);
 assert.match(donor,/window\.AimingRun=\{state,projectBody,runProof,simulateHit,simulateMiss,startRun,openTrack\}/);
});
test('CP04 companion preserves distinct CP03 and original game entry routes',()=>{
 const html=readFileSync(join(dir,'aiming-run-cp04.html'),'utf8');
 assert.match(html,/src="aiming-run-v0-1a\.html"/);
 assert.match(html,/aiming-run-cp04-shot-contact\.mjs/);
 assert.match(html,/applyOriginalShotResponseCP04/);
 assert.match(html,/restoreOriginalShotResponseCP04/);
 assert.match(html,/Aim.*original|original.*game/i);
});
