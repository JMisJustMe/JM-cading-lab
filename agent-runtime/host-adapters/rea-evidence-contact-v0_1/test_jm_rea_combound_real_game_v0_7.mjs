import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {sourceContact,validateRealGameReceipt,ORIGINAL_SCOPE,CORRECT_SCOPE,
  COMBOUND_FLAZ_SHA256,COMBOUND_V23_VISUAL_DESCENDANT_SHA256} from './jm_rea_combound_real_game_v0_7.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const receipt=JSON.parse(fs.readFileSync(path.join(dir,'COMBOUND_REAL_GAME_CONTACT_v0_7_RECEIPT.json'),'utf8'));

test('actual protected v2.3 Chromium receipt routes through ORIGINAL JM32/TraceBox safely',()=>{
 const proof=validateRealGameReceipt(receipt);
 assert.equal(proof.source_hash,COMBOUND_FLAZ_SHA256);
 assert.equal(proof.descendant_hash,COMBOUND_V23_VISUAL_DESCENDANT_SHA256);
 assert.equal(proof.trace_events,2);
 assert.equal(proof.matched_modes,2);
 assert.equal(proof.judgement.sourceContacted,true);
 assert.equal(proof.judgement.promotable,false);
 assert.equal(proof.judgement.reaOriginalImportProven,false);
});
test('reversible scope correction has one insertion and preserves everything else',()=>{
 const example='<script>function drawUnit(){}; function creature21(){};'+ORIGINAL_SCOPE+
   'motionUnder23(u);motionTransform23(u,()=>creature23(u));};</script>';
 const corrected=sourceContact(example,{requireExact:false});
 assert.ok(corrected.candidate_in_memory.includes(CORRECT_SCOPE));
 assert.equal(corrected.candidate_in_memory.length-example.length,CORRECT_SCOPE.length-ORIGINAL_SCOPE.length);
 assert.ok(!example.includes(CORRECT_SCOPE));
 assert.equal(corrected.status.protected_source_was_modified,false);
});
test('multiple scope seams are refused instead of accidentally replacing the wrong body',()=>{
 assert.throws(()=>sourceContact(ORIGINAL_SCOPE+'\n'+ORIGINAL_SCOPE,{requireExact:false}),/ORIGINAL_SCOPE_NOT_UNIQUE/);
});
test('missing scope seam refuses guess or silent fallback',()=>{
 assert.throws(()=>sourceContact('creature21 somewhere',{requireExact:false}),/ORIGINAL_SCOPE_NOT_UNIQUE/);
});
test('arbitrary input cannot claim protected authority',()=>{
 assert.throws(()=>sourceContact(ORIGINAL_SCOPE),/PROTECTED_FLAZ_SHA256/);
});
test('degraded visual fidelity is not a pass',()=>{
 const bad=structuredClone(receipt);bad.modes[1].draw_calls=23;
 assert.throws(()=>validateRealGameReceipt(bad),/ROSTER_VISUAL_ARCADE/);
});
test('fake owner contact cannot be inherited from browser receipt',()=>{
 const bad=structuredClone(receipt);bad.claim_boundary='OWNER_DEVICE_PASS';
 assert.throws(()=>validateRealGameReceipt(bad),/RECEIPT_SCOPE/);
});
test('historical bug must be observed rather than accidentally ignored',()=>{
 const bad=structuredClone(receipt);bad.modes[0].source_error=[];
 assert.throws(()=>validateRealGameReceipt(bad),/ABSENT_ORIGINAL_REGRESSION_CLASSIC/);
});
