import assert from 'node:assert/strict';
import {createCapsule,sha256,stableJSON,validateCapsule,MAX_CAPSULE_BYTES} from './core.mjs';
const encoded=s=>new TextEncoder().encode(s).length;
let neg=0,pos=0;
assert.equal(MAX_CAPSULE_BYTES,200000);pos++;
const giant='🌍'.repeat(5000);
const snaps=Array.from({length:12},(_,i)=>({text:giant,hash:sha256(giant),created:'2026-10-26T20:27:00Z',label:'sn '+i}));
assert.throws(()=>createCapsule({name:'JM Boundary',source:giant,snapshots:snaps}),/200,000 UTF-8/);neg++;
const smaller=createCapsule({name:'JM Boundary',source:giant,snapshots:snaps.slice(0,8)});
assert.ok(encoded(stableJSON(smaller))<=MAX_CAPSULE_BYTES);pos++;
assert.equal(validateCapsule(smaller).name,'JM Boundary');pos++;
// adversarial: use older CP02's oversize envelope, whose digest is internally valid
// but is not native-importable.
const legacyPayload={schema:'JM.AppCommons.Capsule/0.1',name:'JM Boundary',source:giant,sourceHash:sha256(giant),snapshots:snaps,origin:'JM APP//COMMONS · LOCAL ONLY',authority:'OWNER_REVIEW_REQUIRED',revision:1};
const old={payload:legacyPayload,checksum:sha256(stableJSON(legacyPayload))};
assert.ok(encoded(stableJSON(old))>MAX_CAPSULE_BYTES);pos++;
assert.throws(()=>validateCapsule(old),/200,000 UTF-8/);neg++;
console.log(JSON.stringify({status:'PASS',positive:pos,negative:neg,oversizeBytes:encoded(stableJSON(old))}));
