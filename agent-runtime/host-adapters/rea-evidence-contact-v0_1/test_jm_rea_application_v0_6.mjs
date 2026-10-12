import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {RouteScript} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
import {GameCoding,JMGameCore,GameCodingRuntime} from '../../../coding-estate/sovereign-ten/direct/game-native.mjs';
import {ROUTESCRIPT_SOURCE,GAME_CODING_SOURCE,JM_GAMECORE_SOURCE} from '../../../coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {independentRouteParse,independentRouteLower,independentGameParse,independentGameLower,
 independentCoreParse,independentCoreLower} from './jm_rea_source_parser_v0_6.mjs';
import {verifyFullSourceAndApplication} from './jm_rea_application_verify_v0_6.mjs';
import {IndependentGameRuntime} from './jm_rea_game_application_v0_6.mjs';

test('independent RouteScript parser and lowerer match original JM full grammar contact',()=>{
 const before=RouteScript.parse(ROUTESCRIPT_SOURCE),after=independentRouteParse(ROUTESCRIPT_SOURCE);
 assert.deepEqual(after,before);
 assert.deepEqual(independentRouteLower(after),RouteScript.lower(before));
});
test('independent Game-CODING parse and lower match original source and mechanic references',()=>{
 const one=GameCoding.parse(GAME_CODING_SOURCE),two=independentGameParse(GAME_CODING_SOURCE);
 assert.deepEqual(two,one);
 assert.deepEqual(independentGameLower(two),GameCoding.lower(one));
});
test('independent GameCore parse and graph lower preserve original organ identity',()=>{
 const one=JMGameCore.parse(JM_GAMECORE_SOURCE),two=independentCoreParse(JM_GAMECORE_SOURCE);
 assert.deepEqual(two,one);
 assert.deepEqual(independentCoreLower(two),JMGameCore.lower(one));
});
test('v0.6 independent parsing and 96 original JM microgame application sessions',()=>{
 const r=verifyFullSourceAndApplication();
 assert.equal(r.route_source.cases,120);
 assert.equal(r.route_source.ast_and_ir_matches,120);
 assert.equal(r.route_source.consequence_matches,120);
 assert.equal(r.game_sessions.count,96);
 assert.equal(r.game_sessions.matched,96);
 assert.equal(r.game_sessions.steps,672);
 assert.equal(r.game_sessions.matching_steps,672);
 assert.ok(r.game_sessions.total_frame_updates>1000);
 assert.equal(r.game_sessions.gamecore_dispatches,96);
 assert.equal(r.game_sessions.combos,96);
 assert.equal(r.application_source.filter(s=>s.ast&&s.lower).length,2);
 assert.equal(r.mismatches.length,0,JSON.stringify(r.mismatches.slice(0,5)));
 assert.equal(r.proof.promotable,false);
});
test('independent grammar rejects unknown route step targets',()=>{
 const bad=['route One {','start:','  goto missing','}'].join('\n');
 assert.throws(()=>independentRouteParse(bad),/V06_UNRESOLVED_TARGET/);
});
test('independent parser rejects missing collision mechanic recipient',()=>{
 const bad=GAME_CODING_SOURCE.replace('trigger OpenDoor','trigger NotExisting');
 assert.throws(()=>independentGameParse(bad),/V06_BAD_COLLISION_REF/);
});
test('reconstruction alteration is detected as application state divergence',()=>{
 class FaultyGame extends IndependentGameRuntime {
  trigger(name){const result=super.trigger(name);this.state.drift='deliberate';return result;}
 }
 const r=verifyFullSourceAndApplication({gameReplica:FaultyGame});
 assert.equal(r.game_sessions.matched,0);
 assert.ok(r.game_sessions.matching_steps<r.game_sessions.steps);
 assert.ok(r.mismatches.some(m=>m.case.startsWith('session-')));
 assert.equal(r.proof.promotable,false);
});
test('original and reconstructed games reject an unknown mechanic',()=>{
 const o=new GameCodingRuntime(GameCoding.parse(GAME_CODING_SOURCE),{});
 const n=new IndependentGameRuntime(independentGameParse(GAME_CODING_SOURCE),{});
 assert.throws(()=>o.trigger('Unknown'),e=>e.code==='GC_UNKNOWN_MECHANIC');
 assert.throws(()=>n.trigger('Unknown'),e=>e.code==='GC_UNKNOWN_MECHANIC');
});

test('v0.6 standalone source-digested receipt is repeatable and write-once',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-rea-v06-'));
 try{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const script=path.join(here,'jm_rea_application_cli_v0_6.mjs');
  const original=path.resolve(here,'../../../coding-estate/sovereign-ten/direct/game-native.mjs');
  const digest=crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex');
  const output=path.join(dir,'receipt.json');
  const argv=[script,'--output',output,'--expect-game-sha256',digest];
  const first=spawnSync(process.execPath,argv,{encoding:'utf8',timeout:45000});
  assert.equal(first.status,0,first.stderr);
  const receipt=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(receipt.result,'SCOPED_MICRO_APPLICATION_PARITY_PASS');
  assert.equal(receipt.comparison.game_sessions.matching_steps,672);
  assert.equal(receipt.comparison.route_source.ast_and_ir_matches,120);
  assert.equal(receipt.external_rea_evidence_validated_in_this_process,false);
  assert.equal(receipt.source_digests['coding-estate/sovereign-ten/direct/game-native.mjs'],digest);
  const before=fs.readFileSync(output,'utf8');
  const second=spawnSync(process.execPath,argv,{encoding:'utf8',timeout:45000});
  assert.notEqual(second.status,0);
  assert.equal(fs.readFileSync(output,'utf8'),before);
 } finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('v0.6 standalone receipt rejects wrong original JM game hash',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-rea-v06-'));
 try{
  const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'jm_rea_application_cli_v0_6.mjs');
  const output=path.join(dir,'hold.json');
  const result=spawnSync(process.execPath,[script,'--output',output,'--expect-game-sha256','0'.repeat(64)],
   {encoding:'utf8',timeout:45000});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/ORIGINAL_GAME_SOURCE_HASH_HOLD/);
  assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
