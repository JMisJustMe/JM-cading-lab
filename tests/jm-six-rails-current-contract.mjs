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
assert.match(source,/SIX RAILS CONTACT v0\.9/);
for(const rail of ['mesh','compare','release','audio','estate','testers']){
 assert.ok(source.includes('id="rail-'+rail+'"'));
 assert.ok(source.includes('data-rail="'+rail+'"'));
}
for(const id of ['exportGLB','importPacket','sendForge','captureForgeBefore','captureForgeAfter','runDiff','driveForge','stopForgePulse','loadEstate','testerForm','hashRelease','inspectLoop','exportDossier','routePrev','routeNext','routeLens','routePad','routeMode']){
 assert.ok(source.includes('id="'+id+'"'),'missing control '+id);
}
for(const mode of ['flow','flick','manual','anchor','table'])assert.ok(source.includes('<option value="'+mode+'">'));
for(const fn of ['function routeCommit(','function routeContact(','function routeRelease(','function routeMode(','function routeRemember('])assert.ok(source.includes(fn),'missing live routing '+fn);
assert.match(source,/CrossBodyDossier\/0\.9/);
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

// Real inherited asset contract. Hosted route reuses EXISTING JMGripRail v6; standalone keeps FTR semantic fallback.
const gripJs=fs.readFileSync(path.join(root,'ecostate-griprail-v6.js'),'utf8');
const gripCss=fs.readFileSync(path.join(root,'ecostate-griprail-v6.css'),'utf8');
assert.match(gripJs,/window\.JMGripRail/);
assert.match(gripJs,/rootGrid:"\.eco-gripcube \.gc-grid"/);
assert.match(gripCss,/\.griprail-track/);
assert.ok(source.includes('href="../../ecostate-griprail-v6.css"'),'hosted canonical CSS link absent');
assert.ok(source.includes('src="../../ecostate-griprail-v6.js"'),'hosted canonical source link absent');
assert.ok(source.includes('id="jmGripRailNativeSeat"'));
assert.ok(source.includes('id="routeTrack" class="gc-grid"'));
assert.match(source,/JM\.SixRails\.GripRailHostContact\/0\.7/);
assert.match(source,/window\.JMSixRailInheritance/);
assert.match(source,/native_module_loaded/);
assert.match(source,/public_root_seated/);
assert.match(source,/shared_griprail:window\.JMSixRailInheritance\?\.proof\(\)/);
assert.match(source,/exact_FTR_palm_route_source_used:false/);


// FTR GripRoute is a REAL Shell/U physical product; the trial must bind the same game/device and remain HOLD until tested.
for(const id of ['gripTwinPanel','gripVariant','gripGame','gripDevice','gripBegin','gripFinish','gripPhysical','gripMetrics','gripNotes','gripSave','gripExport','gripClear','gripComparison','gripPreference','gripDecide']){
 assert.ok(source.includes('id="'+id+'"'),'missing physical proof contact: '+id);
}
for(const mode of ['bare','shell','u'])assert.ok(source.includes('option value="'+mode+'"'),'missing GripRoute condition '+mode);
assert.match(source,/JM\.FTR\.GripRouteTwinBodyTrial\/0\.8/);
assert.match(source,/JM\.FTR\.GripRouteTwinBodyComparison\/0\.8/);
assert.match(source,/gripTrials\.filter\(r=>r\.game===targetGame&&r\.device===targetDevice\)/);
assert.match(source,/gripFinished\.duration_ms>=300000/);
assert.match(source,/PHYSICAL_5MIN__COMPLETE_RATINGS/);
assert.match(source,/GRIPROUTE_PHYSICAL_THREE_WAY_PROOF_OPEN/);
assert.match(source,/owner_product_preference_proven:false/);
assert.match(source,/griproute_physical:window\.JMGripRouteTwinBody\?\.proof\(\)/);
assert.match(source,/CrossBodyDossier\/0\.8/);


// v0.9 · strict portable packet format, negative hash and authority controls.
for(const id of ['continuityPanel','exportContinuity','importContinuity','adoptContinuityMesh','adoptContinuityBeat','continuityPreview','continuityState','gripcubeEvidence','evidenceLensReadout'])assert.ok(source.includes('id="'+id+'"'),'missing '+id);
for(const lens of ['TRACE','ROUTE','FORM','FIELD','PROOF','USE'])assert.ok(source.includes('data-evidence-lens="'+lens+'"'),'missing '+lens);
for(const pattern of [/JM\.SixRails\.RouteVaultHandoff\/0\.9/,/JM\.SixRails\.RouteVaultPayload\/0\.9/,/JM\.SixRails\.GripCubeEvidence\/0\.9/,/window\.JMRouteVaultHandoff/,/window\.JMGripCubeEvidence/,/MUST_BE_RE_EARNED_ON_IMPORT_DEVICE/,/device_transfer_proven:false/,/actual_gripcube_v5_source_loaded:false/])assert.match(source,pattern);
const rvStart=js.indexOf('function continuityMeshSafe('),rvEnd=js.indexOf("$('exportContinuity').addEventListener",js.indexOf('function continuityMeshSafe('));
assert.ok(rvStart>0&&rvEnd>rvStart,'pure verification section available');
const ctx={continuitySchema:'JM.SixRails.RouteVaultHandoff/0.9',checkedMesh:x=>x,sha256:async x=>crypto.createHash('sha256').update(x).digest('hex')};
const verify=vm.runInNewContext(js.slice(rvStart,rvEnd)+'\nverifyContinuityPack;',ctx);
const geometry={vertices:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],triangles:[[0,1,2],[0,2,3]]};
const beat={schema:'JM.SixRails.BeatGrid/0.1',bpm:120,bars:1,beats_per_bar:4,beats:Array.from({length:4},(_,i)=>({index:i+1,bar:1,beat:i+1,time_seconds:i/2}))};
const payload={schema:'JM.SixRails.RouteVaultPayload/0.9',geometry,geometry_sha256:await ctx.sha256(JSON.stringify(geometry)),beat_grid:beat,transport_proof:'ORIGINALLY_EXPORTED_LOCAL_BYTES__NOT_OWNER_IDENTITY',recipient_proof:'MUST_BE_RE_EARNED_ON_IMPORT_DEVICE'};
const packet={schema:'JM.SixRails.RouteVaultHandoff/0.9',digest_algorithm:'SHA-256',payload,payload_sha256:await ctx.sha256(JSON.stringify(payload))};
assert.equal((await verify(packet)).beat_count,4);
const bad=JSON.parse(JSON.stringify(packet));bad.payload.geometry.vertices[0][0]=999;
await assert.rejects(verify(bad),/SHA-256 mismatch/);
const internal=JSON.parse(JSON.stringify(packet));internal.payload.geometry_sha256='f'.repeat(64);internal.payload_sha256=await ctx.sha256(JSON.stringify(internal.payload));
await assert.rejects(verify(internal),/Geometry content SHA mismatch/);
const falseProof=JSON.parse(JSON.stringify(packet));falseProof.payload.recipient_proof='CLAIMED';falseProof.payload_sha256=await ctx.sha256(JSON.stringify(falseProof.payload));
await assert.rejects(verify(falseProof),/Unsupported trust boundary/);

console.log('JM SIX RAILS v0.9 CONTRACT PASS | 6 rails | GLB | SHA | 5 route stances | explicit source HOLD');
