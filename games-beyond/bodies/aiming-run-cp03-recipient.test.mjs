import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyAimingRunCP03,restoreAimingRunCP03,AIMING_RUN_SOURCE_SHA} from './aiming-run-cp03-recipient.mjs';
import {specialistPrograms,executeSpecialistLine} from '../../coding-estate/everybody/specialist-execution-cp02.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const registry=()=>({schema:'jm.everybody.registry-federation/1.1',bodies:[
 ...read('../../coding-estate/everybody/body-registry.json').bodies,
 ...read('../../coding-estate/everybody/body-registry-extension-01.json').bodies,
 ...read('../../coding-estate/everybody/body-registry-extension-02.json').bodies]});
const current=()=>read('../../coding-estate/JM_CODING_ESTATE_CURRENT_64.json');
function produce(opts={}){const f=registry();return executeSpecialistLine(specialistPrograms(f,opts),f,current())}
function game(){
 const state={version:'0.1A-alpha',trackIndex:0,running:false,paused:false,score:57,hits:2,shots:4,
 tracks:[{id:'moving-target',targetSpeed:1,targetAmp:44},{id:'vertical-drift',targetSpeed:1.45,targetAmp:92}]};
 return {state,startRun(){state.running=true},projectBody(){return {
  schema:'JM.AimingRunBody/0.1',name:'Aiming Run',version:state.version,
  source:{sha256:AIMING_RUN_SOURCE_SHA},track:structuredClone(state.tracks[state.trackIndex])}}};
}
test('actual producer four canonical-native sources execute before recipient contact',()=>{
 const producer=produce();
 assert.equal(producer.committed,true);
 assert.deepEqual(producer.receipts.map(x=>x.bodyId),['route-code','statefield','formula-born-code','game-coding']);
});
test('live recipient game targetSpeed changes, but game score/hits/shots do not',()=>{
 const p=produce(),g=game(),before=structuredClone(g.state);
 const out=applyAimingRunCP03(p,g);
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.equal(out.status,'RECIPIENT_TARGET_MOTION_CHANGED');
 assert.equal(out.before.targetSpeed,1);
 assert.equal(out.after.targetSpeed,1.32);
 assert.equal(g.state.tracks[0].targetSpeed,1.32);
 assert.equal(g.state.score,before.score);assert.equal(g.state.hits,before.hits);assert.equal(g.state.shots,before.shots);
 assert.equal(g.state.tracks[1].targetSpeed,1.45);
 assert.deepEqual(out.producer.bodyIds,p.receipts.map(x=>x.bodyId));
});
test('genuine lower-pressure producer slows target motion, no fake Aiming Run score',()=>{
 const p=produce({energy:1,by:2,threshold:7,points:8}),g=game();
 assert.equal(p.state.game.thresholdMet,false);
 assert.equal(p.state.game.score,0);
 const out=applyAimingRunCP03(p,g);
 assert.equal(out.ok,true);assert.equal(out.after.targetSpeed,.85);
 assert.equal(out.after.gameScore,57);
});
test('actual restore returns precisely to original track speed',()=>{
 const g=game(),p=produce();
 assert.equal(applyAimingRunCP03(p,g).ok,true);
 const back=restoreAimingRunCP03(g);
 assert.equal(back.ok,true);
 assert.equal(back.targetSpeed,1);
 assert.equal(g.state.tracks[0].targetSpeed,1);
 assert.equal(restoreAimingRunCP03(g).ok,false);
});
test('cannot compound effect on same game without restoring first',()=>{
 const g=game(),p=produce();
 assert.equal(applyAimingRunCP03(p,g).ok,true);
 const hold=applyAimingRunCP03(p,g);
 assert.equal(hold.ok,false);
 assert.match(hold.diagnostic,/MUST_RESTORE_FIRST/);
 assert.equal(g.state.tracks[0].targetSpeed,1.32);
});
test('genuine running game denies hot mutation',()=>{
 const g=game(),p=produce();g.state.running=true;g.state.paused=false;
 const out=applyAimingRunCP03(p,g);
 assert.equal(out.ok,false);assert.match(out.diagnostic,/RUN_IN_MOTION_HOLD/);
 assert.equal(g.state.tracks[0].targetSpeed,1);
});
test('pausing existing game permits explicit mutation, preserving player scoring',()=>{
 const g=game(),p=produce();g.state.running=true;g.state.paused=true;
 assert.equal(applyAimingRunCP03(p,g).ok,true);assert.equal(g.state.score,57);
});
test('recipient source hash mismatch refuses mutation',()=>{
 const g=game(),original=g.projectBody;g.projectBody=()=>({...original(),source:{sha256:'fake'}});
 const out=applyAimingRunCP03(produce(),g);
 assert.equal(out.ok,false);assert.match(out.diagnostic,/SOURCE_MISMATCH/);
 assert.equal(g.state.tracks[0].targetSpeed,1);
});
test('recipient body version mismatch refuses mutation',()=>{
 const g=game();g.state.version='0.1B';
 assert.equal(applyAimingRunCP03(produce(),g).ok,false);assert.equal(g.state.tracks[0].targetSpeed,1);
});
test('invalid game object cannot masquerade as recipient',()=>{
 assert.match(applyAimingRunCP03(produce(),{}).diagnostic,/NO_REAL_AIMING_RUN/);
});
test('tampered producer receipt identity rejects game write',()=>{
 const g=game(),p=produce();p.receipts[3].bodyId='cading';
 assert.match(applyAimingRunCP03(p,g).diagnostic,/PROVENANCE_HOLD/);
 assert.equal(g.state.tracks[0].targetSpeed,1);
});
test('tampered producer effect/result score rejects game write',()=>{
 const g=game(),p=produce();p.state.game.score=99;
 assert.match(applyAimingRunCP03(p,g).diagnostic,/TRACE_MISMATCH/);
 assert.equal(g.state.tracks[0].targetSpeed,1);
});
test('producer host HOLD refuses recipient mutation',()=>{
 const g=game(),p=produce();p.committed=false;
 assert.match(applyAimingRunCP03(p,g).diagnostic,/PRODUCER_NOT_PROVEN/);
 assert.equal(g.state.tracks[0].targetSpeed,1);
});
test('restoration refuses to overwrite a changed recipient track',()=>{
 const g=game(),p=produce();applyAimingRunCP03(p,g);
 g.state.tracks[0].targetSpeed=1.62;
 const out=restoreAimingRunCP03(g);
 assert.equal(out.ok,false);assert.match(out.diagnostic,/RECEIVER_DRIFT_HOLD/);
 assert.equal(g.state.tracks[0].targetSpeed,1.62);
});
test('switching recipient track refuses unrelated restore',()=>{
 const g=game(),p=produce();applyAimingRunCP03(p,g);g.state.trackIndex=1;
 assert.match(restoreAimingRunCP03(g).diagnostic,/RECEIVER_DRIFT_HOLD/);
 assert.equal(g.state.tracks[1].targetSpeed,1.45);
});
test('no speculative game hit, shot or Aiming Run score override in adapter',()=>{
 const module=readFileSync(join(root,'aiming-run-cp03-recipient.mjs'),'utf8');
 assert(!module.includes('simulateHit('));
 assert(!module.includes('hitTarget('));
 assert(!/\.score\s*=/.test(module));
 assert(!/\.hits\s*=/.test(module));
});
test('original Aiming Run donor remains preserved with real targetSpeed physics and API',()=>{
 const html=readFileSync(join(root,'aiming-run-v0-1a.html'),'utf8');
 assert.match(html,/window\.AimingRun=\{state,projectBody,runProof,simulateHit,simulateMiss,startRun,openTrack\}/);
 assert.match(html,/Math\.sin\(state\.target\.age\*\.004\*t\.targetSpeed\*state\.tuning\.targetMotion/);
 assert.match(html,/const SOURCE_SHA='1d1fe40eb421bd4b9d7c2565e69af48b77041818ed48d8997aae2d112bc37aa7'/);
});
test('companion does not shadow donor by relabeling as original release',()=>{
 const html=readFileSync(join(root,'aiming-run-cp03.html'),'utf8');
 assert.match(html,/src="aiming-run-v0-1a\.html"/);
 assert.match(html,/href="aiming-run-v0-1a\.html"/);
 assert.match(html,/applyAimingRunCP03/);
 assert.match(html,/restoreAimingRunCP03/);
 assert.match(html,/No game score or simulated hit is manufactured/);
});
