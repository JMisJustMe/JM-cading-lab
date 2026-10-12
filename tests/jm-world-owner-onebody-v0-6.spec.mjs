import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const file=path.resolve('release/jm-world-v0-6/JM_GUARDIAN_COURIER_OWNER_CONTACT_ONEBODY_v0_6.html');
const html=fs.readFileSync(file,'utf8');
assert.ok(html.length>50000);
assert.equal((html.match(/<script\\b[^>]*\\bsrc=/gi)||[]).length,0,'onebody may not require external script assets');
assert.equal(html.includes('de2a5095bae7cc1e130d09a8a54ed5312c8139eefe31c2d5a6768be36fd745e7'),false,'exact private mesh binary must not be bundled');
const uri='file://'+file;
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

const sha='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const packet=fixture();
const browser=await chromium.launch({headless:true});
try{
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const page=await phone.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(uri,{waitUntil:'load'});
 assert.equal(await page.locator('#jmOwnerDock').count(),1);
 assert.equal(await page.locator('#jmOwnerAdvanced').count(),1);
 const s=await page.locator('.stage').boundingBox();assert.ok(s.height>=310&&s.width>=290,'phone arena must not collapse behind controls');
 const initial=await page.locator('#jmOwnerStage').innerText();assert.match(initial,/LOAD YOUR FORGE PACKET/);
 await page.locator('#import').setInputFiles({name:'PUBLIC_SYNTHETIC_GAME_MESH.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
 await page.waitForFunction(()=>window.JMForgeDualActor?.ready===true&&window.JMForgeWorld?.ready===true,{timeout:12000});
 assert.match(await page.locator('#jmOwnerStage').innerText(),/GUARDIAN CONTACT/);
 assert.equal(await page.locator('#meshCount').textContent(),'12 V / 20 T'); // original evidence panel is intentionally collapsed on phones
 await page.locator('#ownerApproach').click();
 await page.waitForFunction(()=>window.JMForgeWorld?.state()?.clearance===true,{timeout:12000});
 assert.equal(await page.locator('#ownerDeliver').isEnabled(),true);
 const coreAtClearance=await page.evaluate(()=>window.JMForgeWorld.state().core.x);assert.equal(coreAtClearance,1.34);
 await page.locator('#ownerDeliver').click();
 await page.waitForFunction(()=>window.JMForgeWorld?.state()?.beacon?.open===true,{timeout:12000});
 const ended=await page.evaluate(()=>({world:window.JMForgeWorld.state(),actor:window.JMForgeDualActor.state()}));
 assert.equal(ended.world.core.x,2.12);assert.ok(ended.world.core.pushes>0);assert.equal(ended.world.consequence,'BEACON_LIT_AND_GATE_OPEN');
 assert.match(await page.locator('#jmOwnerStage').innerText(),/WORLD COMPLETE/);
 const dlPromise=page.waitForEvent('download');
 await page.locator('#ownerSave').click();
 const dl=await dlPromise;assert.match(dl.suggestedFilename(),/JM_WORLD_v0_6_OWNER_CHECKPOINT.json/);
 const cp=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
 assert.equal(cp.private_mesh_included,false);
 assert.equal(cp.encounter.world.beacon.open,true);
 assert.equal(cp.encounter.world.core.x,2.12);
 assert.equal(JSON.stringify(cp).includes(packet.geometry.data),false);
 const destCtx=await browser.newContext({viewport:{width:1200,height:820},acceptDownloads:true});
 const dest=await destCtx.newPage();dest.on('pageerror',e=>errors.push(String(e)));
 await dest.goto(uri,{waitUntil:'load'});
 await dest.locator('#import').setInputFiles({name:'SAME_INDEPENDENT_SOURCE.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
 await dest.waitForFunction(()=>window.JMForgeDualActor?.ready===true&&window.JMForgeWorld?.ready===true);
 await dest.locator('#jmOwnerImportState').setInputFiles({name:'owner-checkpoint.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});
 await dest.waitForFunction(()=>window.JMForgeWorld?.state()?.beacon?.open===true);
 assert.equal(await dest.evaluate(()=>window.JMForgeDualActor.state().echo.contacts),1);
 assert.equal(await dest.evaluate(()=>window.JMForgeWorld.state().core.x),2.12);
 assert.equal(await dest.evaluate(()=>window.JMForgeWorld.state().deliveries),1);
 const bad={...cp,mesh_sha256:'f'.repeat(64)};
 await dest.locator('#jmOwnerImportState').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
 await dest.waitForFunction(()=>document.querySelector('#jmOwnerStatus')?.textContent.includes('HOLD'));
 assert.equal(await dest.evaluate(()=>window.JMForgeWorld.state().beacon.open),true,'bad packet cannot erase earned consequence');
 await page.screenshot({path:'/tmp/jm_owner_phone_world_v06.png',fullPage:true});
 await dest.screenshot({path:'/tmp/jm_owner_desktop_world_v06.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: actual standalone file:// OneBody, no dependencies, mobile arena, real Guardian→Courier world loop, 2.12 relay delivery, source-safe downloaded checkpoint, fresh desktop file:// restore, invalid checkpoint HOLD.');
}finally{await browser.close()}
