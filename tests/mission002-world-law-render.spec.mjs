// CP6 — actual original-gated WORLD output, rendered by the EXISTING GameForge donor.
// Uses Playwright installed by the inherited PR395 browser workflow. No new engine.
// This is bounded browser/HTML proof, not owner Samsung native app acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {executeWorldLawContact} from '../coding-estate/integration/world-law-native-contact.mjs';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {loadGameForgeDonor,makeGameForgeWorld,readWorldBoot} from '../coding-estate/integration/gameforge-world-carrier.mjs';
const mkdir='qa/m002-foundations';fs.mkdirSync(mkdir,{recursive:true});
const m=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json','utf8'));
const reg=assembleRegistry(m,m.parts.map(x=>JSON.parse(fs.readFileSync('coding-estate/integration/'+x,'utf8'))));
const donor=await loadGameForgeDonor(async url=>({ok:true,text:async()=>fs.readFileSync(new URL(url),'utf8')}));
const specs=[
 {kind:'bridge',body:'humanimals',actions:['right','reach','right','right','reach','free',...Array(20).fill('right')],hazards:5,targetX:640},
 {kind:'arena',body:'tboys',actions:['right','right','up','reach','free','up',...Array(4).fill('right'),'down','down','reach','free',
 ...Array(3).fill('right'),'up',...Array(6).fill('right'),'down'],hazards:6,targetX:600}
];
const report={schema:'jm.m002.cp6.actual-rendered-recipient/1',status:'HOLD',viewport:'390x844',scenes:[],checks:0,
 boundary:'GameForge existing renderer actual Chromium pixel/touch evidence, NOT finished THEOGRAPHY, owner physical Android or installed game'};
const yes=(x,s)=>{assert.ok(x,s);report.checks++};
const eq=(x,y,s)=>{assert.deepEqual(x,y,s);report.checks++};
const browser=await chromium.launch({headless:true});
try{
 const results=[];
 for(const spec of specs){
  const output=await executeWorldLawContact({kind:spec.kind,actions:spec.actions,registry:reg});
  eq(output.status,'ALLOWED_NATIVE_WORLD_EXECUTED','LAW_SOURCE_RECIPIENT_NOT_EARNED');
  yes(output.worldLaw.allowed===true,'LAW_FALSE_PASS');
  eq(output.recipient.world,{spaces:3,body:spec.body,hazards:spec.hazards,targetX:spec.targetX,entered:true},'WORLD_WRONG');
  const scene=makeGameForgeWorld(donor,output.recipient.world,'jm-m002-cp6-render-'+spec.kind);
  eq(readWorldBoot(scene).world,output.recipient.world,'BOOT_DIFFERENCE');
  const file=mkdir+'/CP6_'+spec.kind.toUpperCase()+'_GATED_WORLD_OPEN_FIRST.html';
  fs.writeFileSync(file,scene,'utf8');
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(fs.realpathSync(file)).href);
  await page.waitForFunction(()=>typeof window.JMRenderedWorldReadback==='function'&&window.JMRenderedWorldReadback().pixels?.painted>3000,null,{timeout:35000});
  const before=await page.evaluate(()=>window.JMRenderedWorldReadback());
  eq(before.world.body,spec.body,'NATIVE_RENDERER_WRONG_BODY');
  const arena=readback=>readback.snapshot.rooms[readback.snapshot.active].snapshot;
  eq(arena(before).hazards.length,spec.hazards,'HAZARDS_NOT_APPLIED');
  eq(arena(before).core.x,spec.targetX,'TARGET_NOT_APPLIED');
  yes(before.pixels.painted>3000,'NO_CANVAS_PAINT');
  const loc=page.locator('#cv'),box=await loc.boundingBox();yes(Boolean(box),'NATIVE_GAME_CANVAS_MISSING');
  await page.mouse.move(box.x+box.width*.14,box.y+box.height*.78);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.06,box.y+box.height*.84,{steps:6});
  await page.mouse.up();await page.waitForTimeout(140);
  const moved=await page.evaluate(()=>window.JMRenderedWorldReadback());
  yes(Math.abs(arena(moved).player.x-arena(before).player.x)>2,'ACTUAL_INPUT_NO_MOVEMENT');
  await page.screenshot({path:mkdir+'/CP6_'+spec.kind.toUpperCase()+'_PHONE.png',fullPage:true});
  const touch=page.locator('#cCore');yes(await touch.count()===1,'TOUCH_ACTION_MISSING');
  const p2=arena(moved).p2;await touch.tap();await page.waitForTimeout(80);
  const acted=await page.evaluate(()=>window.JMRenderedWorldReadback());
  yes(arena(acted).p2<p2,'REAL_TOUCH_NO_GAME_CONSEQUENCE');
  eq(errors,[],'BROWSER_RUNTIME_ERRORS');
  results.push({kind:spec.kind,body:spec.body,painted:before.pixels.painted,pixelDigest:before.pixels.digest,initialX:arena(before).player.x,
    movedX:arena(moved).player.x,p2Before:p2,p2After:arena(acted).p2,sourceSha256:output.source.sha256,
    receiverReceipt:output.recipient.stateDigest,openFirstHtml:file});
  await page.close();
 }
 yes(results[0].pixelDigest!==results[1].pixelDigest,'TWO_DIFFERENT_RECIPIENT_VISUAL_IDENTITIES');
 yes(results[0].sourceSha256!==results[1].sourceSha256,'TWO_DIFFERENT_SOURCE_PROGRAMS');
 report.scenes=results;report.status='BROWSER_RENDERED_GAMEFORGE_CONTACT_PASS';
 fs.writeFileSync(mkdir+'/CP6_RENDERED_PROOF.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.close();}
