// JM Six Rails · bounded static contract and portable hash integrity verification.
// Run: node tests/jm-six-rails-v0-4-contract.mjs
// Passing this does not establish owner-device, hosted source, or production proof.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'estate-integration','six-rails','index.html');
const html=fs.readFileSync(source,'utf8');
assert.match(html,/JM ECOSTATE \| SIX RAILS CONTACT v0\.4/);
for(const rail of ['mesh','compare','release','audio','estate','testers']){
 assert.ok(html.includes(`id="rail-${rail}"`),`missing rail ${rail}`);
 assert.ok(html.includes(`data-rail="${rail}"`),`missing tab ${rail}`);
}
for(const id of ['importPacket','sendForge','captureForgeBefore','captureForgeAfter','runDiff','driveForge','stopForgePulse','loadEstate','testerForm','hashRelease','inspectLoop','exportDossier']){
 assert.ok(html.includes(`id="${id}"`),`missing control ${id}`);
 assert.ok(html.includes(`$('${id}')`),`missing handler ${id}`);
}
assert.match(html,/JM\.SixRails\.CrossBodyDossier\/0\.4/);
assert.match(html,/PUBLIC_REGISTRY_DISCOVERY_ONLY/);
assert.match(html,/NOT_DEPLOYED/);
assert.match(html,/private_forge_v024_glb_verified:false/);
const script=[...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(script.length,1,'one executable source');
new vm.Script(script[0],{filename:source});
const begin=script[0].indexOf('function jmPortableSha256(data)');
const end=script[0].indexOf('const sha256=async input=>',begin);
assert.ok(begin>=0&&end>begin,'inherited JM public renderer SHA-256 source exists');
const fn=vm.runInNewContext(script[0].slice(begin,end)+'\njmPortableSha256;');
for(const value of ['', 'abc','JM Estate — mobile first ❤️']){
 const data=new TextEncoder().encode(value);
 assert.equal(fn(data),crypto.createHash('sha256').update(data).digest('hex'),`SHA-256 for ${value}`);
}
console.log('SIX RAILS v0.4 CONTRACT PASS · six rails · 12 actions · valid JS · 3 portable SHA vectors · bounded claims');
