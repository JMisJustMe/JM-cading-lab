// JM Six Rails v0.5 · onebody syntax, public GLB interchange and bounded claims.
// Run: node tests/jm-six-rails-v0-5-contract.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'estate-integration/six-rails/index.html'),'utf8');
assert.match(source,/SIX RAILS CONTACT v0\.5/);
for(const rail of ['mesh','compare','release','audio','estate','testers']){
 assert.ok(source.includes('id="rail-'+rail+'"'));
 assert.ok(source.includes('data-rail="'+rail+'"'));
}
for(const id of ['exportGLB','importPacket','sendForge','captureForgeBefore','captureForgeAfter','runDiff','driveForge','stopForgePulse','loadEstate','testerForm','hashRelease','inspectLoop','exportDossier']){
 assert.ok(source.includes('id="'+id+'"'),'missing control '+id);
 assert.ok(source.includes("$('"+id+"')"),'missing handler '+id);
}
assert.match(source,/CrossBodyDossier\/0\.5/);
assert.match(source,/GLBRoundTrip\/0\.5/);
assert.match(source,/private_forge_v024_glb_verified:false/);
assert.match(source,/PUBLIC_REGISTRY_DISCOVERY_ONLY/);
assert.match(source,/NOT_DEPLOYED/);
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
assert.ok(start>=0&&end>start,'bounded native GLB exporter');
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
console.log('JM SIX RAILS v0.5 CONTRACT PASS | 6 rails | 13 controls | SHA vectors | generated GLB | bounded claims');
