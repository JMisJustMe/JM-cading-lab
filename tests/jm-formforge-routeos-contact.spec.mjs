import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.JM_CONTACT_BASE||'http://127.0.0.1:4177';
const sha='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const receiver=fs.readFileSync('target-bridge/form-forge-routeos-v0-1/index.html','utf8');
const host=fs.readFileSync('target-bridge/form-forge-routeos-v0-1/JM_FORM_FORGE_ROUTEOS_HOST_v0_1.js','utf8');
const os=fs.readFileSync('games-beyond/routeos/runtime/index.html','utf8');
assert.ok(!receiver.includes('de2a5095bae7cc1e130d09a8a54ed5312c8139eefe31c2d5a6768be36fd745e7'),'Private source geometry must not leak into public recipient');
assert.ok(receiver.includes('sourceSnapshotHash'),'Forge source snapshot hash check');
assert.ok(host.includes('window.addEventListener'));
assert.ok(os.includes('window.JMRouteOSFormForgePort')&&os.includes('JM_FORGE_ROUTEOS_DUAL_ACTOR_HOST_v0_5.js'));

const f=Math.sqrt(5);
const pos=[-1,f,0,1,f,0,-1,-f,0,1,-f,0,0,-1,f,0,1,f,0,-1,-f,0,1,-f,f,0,-1,f,0,1,-f,0,-1,-f,0,1];
const indices=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];
function fixture(){
 const p=Buffer.alloc(pos.length*4);pos.forEach((v,i)=>p.writeFloatLE(v,i*4));
 const idx=Buffer.alloc(indices.length*4);indices.forEach((v,i)=>idx.writeUInt32LE(v,i*4));
 const bin=Buffer.concat([p,idx]);
 const j={asset:{version:'2.0',generator:'QA-SYNTHETIC-NOT-FORGE-SOURCE'},buffers:[{byteLength:bin.length}],
 bufferViews:[{buffer:0,byteOffset:0,byteLength:p.length},{buffer:0,byteOffset:p.length,byteLength:idx.length}],
 accessors:[{bufferView:0,componentType:5126,count:pos.length/3,type:'VEC3'},{bufferView:1,componentType:5125,count:indices.length,type:'SCALAR'}],
 meshes:[{primitives:[{attributes:{POSITION:0},indices:1,mode:4}]}],
 extras:{jm:{routegraph_signature:'FIXTURE'}}};
 const json=Buffer.from(JSON.stringify(j),'utf8'),pad=Buffer.alloc((4-json.length%4)%4,32),header=Buffer.alloc(20),bhead=Buffer.alloc(8),total=20+json.length+pad.length+8+bin.length;
 header.write('glTF',0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);header.writeUInt32LE(json.length+pad.length,12);header.write('JSON',16);bhead.writeUInt32LE(bin.length,0);bhead.write('BIN\0',4);
 const glb=Buffer.concat([header,json,pad,bhead,bin]);
 const snap={schema:'jm.fieldform.snapshot/0.22',label:'PUBLIC_CI_FIXTURE_ONLY',signatures:{graph:'FIXTURE',fabric:'NA',population:'NA',evolution:'NA',history:'NA'},state:{fixture:true}};
 const h=crypto.createHash('sha256').update(glb).digest('hex');
 const content={...snap},str=JSON.stringify(content);let hash=2166136261>>>0;for(let i=0;i<str.length;i++){hash^=str.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0}
 snap.hash=hash.toString(16).padStart(8,'0');
 return {schema:'jm.fieldform.game-mesh/0.1',source:{sha256:sha},snapshot:snap,geometry:{mime:'model/gltf-binary',encoding:'base64',sha256:h,bytes:glb.length,data:glb.toString('base64')}};
}
const packet=fixture();
const browser=await chromium.launch({headless:true});
try{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2,hasTouch:true});
 const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/games-beyond/routeos/runtime/',{waitUntil:'networkidle'});
 await page.locator('[data-screen="bay"]').click();
 assert.equal(await page.locator('#jmForgeGameCart').count(),1);
 await page.locator('#jmForgeGameLaunch').click();
 const f=page.frameLocator('#jmForgeRouteOSHost iframe');
 await f.locator('#import').setInputFiles({name:'JM_TEST_SOURCE_PACKET.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
 await page.waitForFunction(()=>window.JMFormForgeRouteOS?.hasMesh(),{timeout:12000});
 const source=await f.locator('#meshCount').innerText();
 assert.match(source,/12 V \/ 20 T/);
 assert.equal(await page.evaluate(()=>window.JMFormForgeRouteOS.contactCount()),0);
 for(let k=0;k<5;k++){
   const hit=await f.locator('#stage').evaluate(el=>{
    const r=el.getBoundingClientRect(),m=window.JMForgeContact;
    for(let y=55;y<r.height-45;y+=6)for(let x=28;x<r.width-28;x+=6){
       const id=m.hit(x,y);if(id>=0&&!m.scene.contacts.has(id))return{x,y,id};
    }
    return null;
   });
   if(!hit)throw Error('Not enough visible distinct source mesh faces');
   await f.locator('#stage').click({position:{x:hit.x,y:hit.y}});
   await page.waitForFunction(expected=>window.JMFormForgeRouteOS?.contactCount()===expected,k+1);
 }
 assert.equal(await f.locator('#hits').innerText(),'5/5');
 const native=await page.evaluate(()=>{
  const record=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'));
  return record.receipts.filter(x=>x.type==='HOST_FORGE').map(x=>({event:x.text,details:x.extra}));
 });
 assert.ok(native.some(x=>x.event==='FORGE_MESH_ACCEPTED'));
 assert.equal(native.filter(x=>x.event==='FORGE_FACE_CONTACT').length,5);
 assert.ok(native.some(x=>x.event==='FORGE_CONTACT_DING'));
 const busPacket=await page.evaluate(()=>window.JMAppsToolsSpine.read().filter(x=>x.kind==='jm.fieldform.game-contact.receipt'));
 assert.equal(busPacket.length,1,'A single earned Forge completion must join the EXISTING JM packet bus');
 assert.equal(busPacket[0].payload.face_ids.length,5);
 assert.equal(busPacket[0].payload.contacts,5);
 assert.equal(busPacket[0].payload.mesh_sha256,packet.geometry.sha256);
 assert.equal(busPacket[0].payload.score,await f.locator('#score').innerText().then(Number));
 assert.equal(JSON.stringify(busPacket).includes(packet.geometry.data),false,'Source mesh binary must not leak into bus receipt');
 assert.equal(JSON.stringify(busPacket).includes('source code'),false);
 // v0.2 additive motion physics: witness a real moving probe strike geometry in 3D.
 await f.locator('#jmFire').waitFor();
 const geometry=await f.locator('#stage').evaluate(()=>{
  const k=window.JMForgeKinetics;
  return {hit:k.collision([0,0,4],[0,0,-8]),miss:k.collision([90,90,4],[0,0,-8])};
 });
 assert.ok(geometry.hit&&Number.isInteger(geometry.hit.face),'3D ray must intersect a decoded face');
 assert.equal(geometry.miss,null,'miss cannot fabricate a face hit');
 await f.locator('#jmRestoreForm').waitFor();
 await f.locator('#jmPoseRest').waitFor();
 const originalPoints=await f.locator('#stage').evaluate(()=>window.JMForgeContact.scene.points.map(v=>v.slice()));
 await f.locator('#jmBodyRight').click();
 await f.locator('#jmCrownForward').click();
 await page.waitForFunction(()=>{
  const f=document.querySelector('#jmForgeRouteOSHost iframe')?.contentWindow;
  return f?.JMForgeArticulation?.state().joints?.[0]?.angle>.07&&f?.JMForgeArticulation?.state().joints?.[1]?.angle>.07;
 });
 const articulated=await f.locator('#stage').evaluate(()=>({
  pose:window.JMForgeArticulation.state(),
  mesh:window.JMForgeContact.scene.points.map(v=>v.slice())
 }));
 assert.equal(articulated.pose.joints.length,2);
 assert.ok(articulated.mesh.some((v,i)=>v.some((x,j)=>x!==originalPoints[i][j])),'manual v0.4 articulation must change actual source mesh');
 await f.locator('#jmRestoreForm').click();
 const recoveredManual=await f.locator('#stage').evaluate(()=>window.JMForgeContact.scene.points.map(v=>v.slice()));
 assert.deepEqual(recoveredManual,originalPoints,'manual articulation must restore exact source');

 await f.locator('#jmFire').click();
 await page.waitForFunction(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')||'{}');
  return os.receipts?.some(r=>r.type==='HOST_FORGE'&&r.text==='FORGE_SURFACE_IMPACT');
 },{timeout:12000});
 const kineticReceipts=await page.evaluate(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'));
  const b=window.JMAppsToolsSpine.read().filter(r=>r.kind==='jm.fieldform.kinetic-surface-impact');
  return {native:os.receipts.filter(r=>r.type==='HOST_FORGE'),bus:b};
 });
 assert.ok(kineticReceipts.native.some(r=>r.text==='FORGE_PROBE_LAUNCH'));
 assert.ok(kineticReceipts.native.some(r=>r.text==='FORGE_SURFACE_IMPACT'));
 assert.ok(kineticReceipts.bus.length>=1,'real moving probe impact must enter EXISTING JM bus');
 assert.equal(kineticReceipts.bus[0].payload.mesh_sha256,packet.geometry.sha256);
 assert.equal(JSON.stringify(kineticReceipts.bus).includes(packet.geometry.data),false);
 await page.waitForFunction(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')||'{}');
  return os.receipts?.some(x=>x.type==='HOST_FORGE'&&x.text==='FORGE_SURFACE_RESPONSE');
 });
 const response=await f.locator('#stage').evaluate(()=>{
  const g=window.JMForgeContact,k=window.JMForgeEmbodiment;
  return {status:k.status(),points:g.scene.points.map(v=>v.slice())};
 });
 assert.equal(response.status.schema,'JM.FormForge.Embodiment/0.3');
 assert.equal(response.status.sourceVertices,originalPoints.length);
 assert.ok(response.status.affectedVertices>0);
 assert.ok(response.status.maxEver>0,'real source vertices must move after a 3D hit');
 assert.ok(response.points.some((v,i)=>v.some((x,j)=>x!==originalPoints[i][j])),'game renderer must receive changed mesh coordinates');
 const nativeResponse=await page.evaluate(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'));
  return os.receipts.filter(x=>x.type==='HOST_FORGE'&&x.text==='FORGE_SURFACE_RESPONSE');
 });
 assert.equal(nativeResponse.length,1);
 assert.ok(nativeResponse[0].extra.affected_vertices>0);
 assert.ok(nativeResponse[0].extra.max_offset>0);
 const sharedResponse=await page.evaluate(()=>window.JMAppsToolsSpine.read().filter(x=>x.kind==='jm.fieldform.embodied-surface-response'));
 assert.equal(sharedResponse.length,1);
 assert.equal(sharedResponse[0].payload.mesh_sha256,packet.geometry.sha256);
 assert.equal(sharedResponse[0].payload.affected_vertices,response.status.affectedVertices);
 assert.equal(JSON.stringify(sharedResponse).includes(packet.geometry.data),false);
 // v0.5 second independently moving copy of the same verified GLB mesh; real body contact.
 await f.locator('#jmActorApproach').waitFor();
 const actorsBefore=await f.locator('#stage').evaluate(()=>window.JMForgeDualActor.state());
 assert.equal(actorsBefore.actors,2);
 assert.equal(actorsBefore.echo.contacts,0);
 await f.locator('#jmActorApproach').click();
 await page.waitForFunction(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')||'{}');
  return os.receipts?.some(r=>r.type==='HOST_FORGE'&&r.text==='FORGE_ACTOR_CONTACT');
 });
 const contact=await f.locator('#stage').evaluate(()=>window.JMForgeDualActor.state());
 assert.equal(contact.echo.contacts,1);
 assert.ok(contact.echo.x<actorsBefore.echo.x);
 const nativeDual=await page.evaluate(()=>JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')).receipts.filter(r=>r.type==='HOST_FORGE'&&r.text==='FORGE_ACTOR_CONTACT'));
 assert.equal(nativeDual.length,1);
 assert.equal(nativeDual[0].extra.actor_contacts,1);
 const contactPackets=await page.evaluate(()=>window.JMAppsToolsSpine.read().filter(x=>x.kind==='jm.fieldform.dual-actor-contact'));
 assert.equal(contactPackets.length,1);
 assert.equal(contactPackets[0].payload.mesh_sha256,packet.geometry.sha256);
 assert.equal(contactPackets[0].payload.collider,'SOURCE_BOUNDS_PROXY');
 assert.equal(JSON.stringify(contactPackets).includes(packet.geometry.data),false);
 await f.locator('#jmActorSave').click();
 await page.waitForFunction(()=>window.JMAppsToolsSpine.read().some(x=>x.kind==='jm.fieldform.dual-actor-checkpoint'));
 const cp=await page.evaluate(()=>window.JMAppsToolsSpine.read().find(x=>x.kind==='jm.fieldform.dual-actor-checkpoint'));
 assert.equal(cp.payload.checkpoint.echo.contacts,1);
 assert.equal(JSON.stringify(cp).includes(packet.geometry.data),false,'private mesh must not enter encounter-state carrier');
 // The recipient's real native RouteOS browser on a different device-sized viewport.
 const other=await browser.newContext({viewport:{width:1260,height:880}});
 const desk=await other.newPage();
 await desk.goto(base+'/games-beyond/routeos/runtime/',{waitUntil:'networkidle'});
 await desk.locator('[data-screen="bay"]').click();
 await desk.locator('#jmForgeGameLaunch').click();
 const recipient=desk.frameLocator('#jmForgeRouteOSHost iframe');
 await recipient.locator('#import').setInputFiles({name:'SOURCE_SAFE_PUBLIC_FIXTURE.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
 await recipient.locator('#jmActorApproach').waitFor();
 await desk.evaluate(statePacket=>window.JMAppsToolsSpine.send(statePacket),cp);
 await desk.locator('#jmRestoreDualState').click();
 await desk.waitForFunction(()=>{
  const a=document.querySelector('#jmForgeRouteOSHost iframe')?.contentWindow?.JMForgeDualActor;
  return a?.state().echo.contacts===1;
 });
 const returned=await recipient.locator('#stage').evaluate(()=>window.JMForgeDualActor.state());
 assert.equal(returned.echo.x,cp.payload.checkpoint.echo.x);
 assert.equal(returned.echo.contacts,1);
 const returnReceipts=await desk.evaluate(()=>JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')).receipts.filter(r=>r.type==='HOST_FORGE'&&r.text==='FORGE_ACTOR_STATE_RESTORED'));
 assert.equal(returnReceipts.length,1);
 await other.close();

 await page.waitForFunction(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')||'{}');
  return os.receipts?.some(x=>x.type==='HOST_FORGE'&&x.text==='FORGE_ARTICULATED_RECOIL');
 });
 const jointReceipt=await page.evaluate(()=>{
  const os=JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'));
  return os.receipts.find(x=>x.type==='HOST_FORGE'&&x.text==='FORGE_ARTICULATED_RECOIL');
 });
 assert.equal(jointReceipt.extra.joints.length,2);
 assert.ok(jointReceipt.extra.articulated_vertices>0);
 assert.ok(jointReceipt.extra.pose_offset>0);
 const jointPackets=await page.evaluate(()=>window.JMAppsToolsSpine.read().filter(x=>x.kind==='jm.fieldform.articulated-recoil'));
 assert.equal(jointPackets.length,1);
 assert.equal(jointPackets[0].payload.mesh_sha256,packet.geometry.sha256);
 assert.equal(jointPackets[0].payload.joints.length,2);
 assert.equal(JSON.stringify(jointPackets).includes(packet.geometry.data),false);
 assert.ok(await f.locator('#stage').evaluate(()=>window.JMForgeArticulation.state().impactCount)>=1);

 await f.locator('#jmRestoreForm').click();
 const restoredBody=await f.locator('#stage').evaluate(()=>({points:window.JMForgeContact.scene.points.map(v=>v.slice()),state:window.JMForgeEmbodiment.status()}));
 assert.deepEqual(restoredBody.points,originalPoints,'restore original geometry exactly, no source mutation');
 assert.equal(restoredBody.state.maxOffset,0);


 const bad=structuredClone(packet);bad.snapshot.state.fixture=false;
 await assert.rejects(f.locator('#stage').evaluate(async(el,invalid)=>window.JMForgeContact.take(invalid),bad),/snapshot integrity failed/);
 assert.equal(await page.evaluate(()=>window.JMFormForgeRouteOS.contactCount()),5);
 // Re-import the SAME real-geometry fixture: no stale shot ID or orphaned Ding may survive.
 const beforeReentry=kineticReceipts.native.filter(r=>r.text==='FORGE_SURFACE_IMPACT').length;
 await f.locator('#import').setInputFiles({name:'reenter-same-geometry.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')||'{}').receipts?.filter(r=>r.type==='HOST_FORGE'&&r.text==='FORGE_MESH_ACCEPTED').length>=2);
 const reset=await f.locator('#stage').evaluate(()=>window.JMForgeKinetics.state);
 assert.equal(reset.impacts.length,0);assert.equal(reset.shot,0);
 const embodimentReset=await f.locator('#stage').evaluate(()=>window.JMForgeEmbodiment.status());
 assert.equal(embodimentReset.impactCount,0);
 assert.equal(embodimentReset.maxOffset,0);
 assert.equal(embodimentReset.sourceVertices,12);
 const jointReset=await f.locator('#stage').evaluate(()=>window.JMForgeArticulation.state());
 assert.equal(jointReset.impactCount,0);
 assert.ok(jointReset.joints.every(j=>j.angle===0&&j.target===0));


 await f.locator('#jmFire').click();
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')||'{}').receipts?.filter(r=>r.type==='HOST_FORGE'&&r.text==='FORGE_SURFACE_IMPACT').length>n,beforeReentry);

 await page.locator('#jmForgeRouteOSHost button').filter({hasText:'RETURN TO ROUTOS'}).count().catch(()=>0);
 await page.locator('#jmForgeRouteOSHost button').filter({hasText:'RETURN TO ROUTEOS'}).click();
 await page.locator('[data-screen="bay"]').click();
 await page.locator('[data-launch="seed-runner"]').click();
 await page.locator('#saveBtn').click();
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8')).saves['seed-runner']);
 assert.equal(original.recordType,'JMConsoleCartridgeSave','original RouteOS game saves not replaced');
 assert.equal(errors.length,0,'browser runtime errors');
 console.log('PASS · JM RouteOS Forge host: owner-import interface, software-rendered geometry contact, five distinct real triangle IDs, original RouteOS host receipt types, source-hash tamper refusal, protected native game save; fixture geometry ONLY, not protected private Forge mesh.');
} finally {await browser.close()}

export {fixture};
