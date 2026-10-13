// JM Six Rails v0.3 · cross-body static conformance gate.
// Run: node tests/jm-six-rails-v0-3-contract.mjs
// Syntax/contract only; not recipient runtime, hosted registry or owner-device proof.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'estate-integration','six-rails','index.html');
const html=fs.readFileSync(source,'utf8');
assert.match(html,/JM ECOSTATE \| SIX RAILS CONTACT v0\.3/);
for(const rail of ['mesh','compare','release','audio','estate','testers']){
  assert.ok(html.includes(`id="rail-${rail}"`),`missing rail ${rail}`);
  assert.ok(html.includes(`data-rail="${rail}"`),`missing tab ${rail}`);
}
for(const control of ['importPacket','sendForge','captureForgeBefore','captureForgeAfter','runDiff','driveForge','stopForgePulse','loadEstate','testerForm','hashRelease','inspectLoop','exportDossier']){
  assert.ok(html.includes(`id="${control}"`),`missing operational control ${control}`);
  assert.ok(html.includes(`$('${control}')`),`missing control listener ${control}`);
}
assert.match(html,/jm\.sixrails\.formmesh\/0\.2/);
assert.match(html,/JM\.SixRails\.CrossBodyDossier\/0\.3/);
assert.match(html,/PUBLIC_REGISTRY_DISCOVERY_ONLY/);
assert.match(html,/SOFTWARE_RECIPIENT_MOTION_ONLY/);
assert.match(html,/NOT_DEPLOYED/);
assert.match(html,/private_forge_v024_glb_verified:false/);
assert.ok(!html.includes('id="productionDeploy"'),'no anonymous deploy button');
const scripts=[...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim());
assert.equal(scripts.length,1,'exactly one executable script in OneBody');
new vm.Script(scripts[0],{filename:source});
console.log('SIX RAILS v0.3 STATIC CONTRACT: PASS | 6 rails | 12 controls | valid JS | bounded claims');
