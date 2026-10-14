// JM Six Rails · current-source contact contract.
// Run: node tests/jm-six-rails-current-contract.mjs
// Static validity is not a substitute for owner-device contact or exact FTR GripRoute source.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'estate-integration/six-rails/index.html'),'utf8');
assert.match(source,/SIX RAILS CONTACT v0\.6/);
for(const rail of ['mesh','compare','release','audio','estate','testers']){
 assert.ok(source.includes('id="rail-'+rail+'"'));
 assert.ok(source.includes('data-rail="'+rail+'"'));
}
for(const id of ['exportGLB','importPacket','sendForge','captureForgeBefore','captureForgeAfter','runDiff','driveForge','stopForgePulse','loadEstate','testerForm','hashRelease','inspectLoop','exportDossier','routePrev','routeNext','routeLens','routePad','routeMode']){
 assert.ok(source.includes('id="'+id+'"'),'missing control '+id);
}
for(const mode of ['flow','flick','manual','anchor','table'])assert.ok(source.includes('<option value="'+mode+'">'));
for(const fn of ['function routeCommit(','function routeContact(','function routeRelease(','function routeMode(','function routeRemember('])assert.ok(source.includes(fn),'missing live routing '+fn);
assert.match(source,/CrossBodyDossier\/0\.6/);
assert.match(source,/GLBRoundTrip\/0\.5/);
assert.match(source,/JM\.GripRouteAdapter\.Proof\/0\.6/);
assert.match(source,/input_route:window\.JMGripRouteAdapter\?\.proof\(\)/);
assert.match(source,/exact_FTR_palm_route_source_used:false/);
assert.match(source,/private_forge_v024_glb_verified:false/);
assert.match(source,/PUBLIC_REGISTRY_DISCOVERY_ONLY/);
assert.match(source,/NOT_DEPLOYED/);
assert.match(source,/\.shell\{height:100dvh/);
const scripts=[...source.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1);
const js=scripts[0];new vm.Script(js);
const shaStart=js.indexOf('function jmPortableSha256(data)'),shaEnd=js.indexOf('const sha256=async input=>',shaStart);
const portable=vm.runInNewContext(js.slice(shaStart,shaEnd)+'\njmPortableSha256;');
for(const s of ['','abc','JM Estate — portable ❤️']){
 const bytes=new TextEncoder().encode(s);
 assert.equal(portable(bytes),crypto.createHash('sha256').update(bytes).digest('hex'));
}
const start=js.indexOf('function createGLB(geometry)'),end=js.indexOf("$('exportGLB').addEventListener",start);
assert.ok(start>=0&&end>start,'existing native GLB exporter retained');
const generate=vm.runInNewContext(js.slice(start,end)+'\ncreateGLB;',{checkedMesh:x=>x,TextEncoder});
const sample={vertices:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],triangles:[[0,1,2],[0,2,3]]};
const glb=generate(sample),d=new DataView(glb.buffer);
assert.equal(d.getUint32(0,true),0x46546c67);
assert.equal(d.getUint32(4,true),2);
assert.equal(d.getUint32(8,true),glb.length);
assert.equal(d.getUint32(16,true),0x4e4f534a);
const n=d.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(glb.subarray(20,20+n)).trim());
assert.equal(j.asset.version,'2.0');assert.equal(j.accessors[0].count,4);assert.equal(j.accessors[2].count,6);
assert.equal(j.extras.jm.private_forge_v024_source,false);
console.log('JM SIX RAILS v0.6 CONTRACT PASS | 6 rails | GLB | SHA | 5 route stances | explicit source HOLD');
