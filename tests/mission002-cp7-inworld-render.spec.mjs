// M002 CP7 — real local browser contact. Tests real player movement, touch,
 // opt-in gate, inherited world state/custody, re-entry, and negative source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {GameForgeSpaces} from '../coding-estate/integration/gameforge-spaces.mjs';
const out='qa/m002-foundations';fs.mkdirSync(out,{recursive:true});
const specs=[{kind:'bridge',body:'humanimals',hazards:5,targetX:640},
 {kind:'arena',body:'tboys',hazards:6,targetX:600}];
let checks=0;const yes=(v,m)=>{assert.ok(v,m);checks++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const reject=(fn,re)=>{assert.throws(fn,re);checks++};
const record={schema:'jm.m002.cp7.in-world-contact-proof/1',status:'PENDING',checks:0,scenes:[],
 boundary:'Existing GameForge 2D/3D browser + native physics real user input, NOT owner physical Samsung, original THEOGRAPHY runtime, or merged product.'};
// Bounded core fixture, unlike browser flow these direct calls do not count as
// proof of player movement. They prove authority, tamper and non-regression.
for(const spec of specs){
 const world={spaces:3,body:spec.body,hazards:spec.hazards,targetX:spec.targetX,entered:true};
 const boot={schema:'jm.m002.cp7.inworld-contact/1',kind:spec.kind,sourceDigest:'from-original-cp6'};
 const model=GameForgeSpaces(world,null,boot),state=model.create();
 eq(state.contactLaw.routeOpen,false,'GATE_INIT_DENIED');
 const gate=model.nearby(state,{x:850,y:285});
 yes(gate?.locked===true&&gate.label.includes('Two currents'),'GATE_IS_NOT_BLOCKED');
 const a=model.interact(state,{x:255,y:480});
 eq(a.kind,'current','FIRST_NOT_ACTUALLY_APPLIED');eq(state.contactLaw.earned,['A'],'FIRST_RECEIPT_NOT_SAVED');
 const p={x:510,y:480,vx:10,vy:7};const recovery=model.contactShock(state,p);
 eq(recovery.kind,'contact-reentry','SHOCK_WAS_NOT_REAL');
 eq(state.contactLaw.earned,['A'],'RECOVERY_LOST_FIRST_EARNING');
 eq({x:p.x,y:p.y},{x:120,y:285},'RECOVERY_SPAWN');
 eq(model.contactShock(state,p),null,'SHOCK_REPEATED');
 const b=model.interact(state,{x:765,y:480});
 yes(b.routeOpen&&state.contactLaw.routeOpen,'SECOND_CURRENT_DID_NOT_UNLOCK');
 const key=model.interact(state,{x:210,y:130});eq(key.kind,'collect','INHERITED_GAMECORE_KEY_REGRESSION');
 const unlockedGate=model.nearby(state,{x:850,y:285});
 eq(unlockedGate.locked,false,'GATE_STILL_LOCKED_AFTER_TWO');
 const walk=model.interact(state,{x:850,y:285});
 eq(walk.kind,'transition','INHERITED_DOOR_ROUTE_DID_NOT_CHANGE');
 eq(state.active,1,'NATIVE_WORLD_DID_NOT_TRANSITION');
 model.validate(state,false);checks++;
 const forged=structuredClone(state);forged.contactLaw.earned=['A'];forged.contactLaw.routeOpen=true;
 reject(()=>model.validate(forged,false),/CP7_EARNED_STATE_AUTHORITY_HOLD/);
 const forgedReceipt=structuredClone(state);forgedReceipt.contactLaw.receipts[0].x=300;
 reject(()=>model.validate(forgedReceipt,false),/CP7_EARNED_STATE_AUTHORITY_HOLD/);
 const legacy=GameForgeSpaces(world,null).create();
 yes(!('contactLaw' in legacy),'LEGACY_WORLDS_CHANGED');
 eq(GameForgeSpaces(world,null).validate(legacy,false).spec,
    JSON.stringify({body:spec.body,hazards:spec.hazards,targetX:spec.targetX,spaces:3}),
    'LEGACY_SAVE_SPEC_CHANGED');
}
execFileSync('node',['scripts/build_m002_cp7_inworld.mjs',out],{stdio:'pipe',timeout:45000});
const browser=await chromium.launch({headless:true});
try{
 for(const spec of specs){
  const f=out+'/CP7_'+spec.kind.toUpperCase()+'_TWO_CURRENTS_OPEN_FIRST.html';
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(fs.realpathSync(f)).href);
  await page.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()?.session?.contactLaw),null,{timeout:40000});
  const read=()=>page.evaluate(()=>window.JMConnectedWorldReadback());
  const player=async()=>{const r=await read();return r.session.rooms[r.session.active].snapshot.player};
  async function move(axis,target){
   for(let attempt=0;attempt<6;attempt++){
    let p=await player();const delta=target-p[axis];
    if(Math.abs(delta)<=13)return;
    const positive=delta>0,key=axis==='x'?(positive?'ArrowRight':'ArrowLeft'):(positive?'ArrowDown':'ArrowUp');
    await page.locator('#cv').focus();
    await page.keyboard.down(key);
    try{
     await page.waitForFunction(({axis,target,positive})=>{
      const r=window.JMConnectedWorldReadback(),p=r.session.rooms[r.session.active].snapshot.player;
      return positive?p[axis]>=target-10:p[axis]<=target+10;
     },{axis,target,positive},{timeout:11000});
    }finally{await page.keyboard.up(key);}
   }
   throw Error('CP7_MOVEMENT_NOT_CONVERGED:'+axis+':'+target+':'+JSON.stringify(await player()));
  }
  const tap=async()=>{const button=page.locator('#jm-space-use');yes(await button.isEnabled(),'TOUCH_NOT_AT_CONTACT');await button.tap()};
  eq((await read()).session.contactLaw.earned,[],'BROWSER_INITIAL_EARNED_IS_FAKE');
  yes((await page.locator('#jm-cp7-state').innerText()).includes('DENIED'),'VISUAL_GATE_INITIAL_PASS');
  await move('x',255);await move('y',480);await tap();
  eq((await read()).session.contactLaw.earned,['A'],'IN_GAME_FIRST_TOUCH_DID_NOT_EARN');
  await page.locator('#cv').focus();await page.keyboard.down('ArrowRight');
  try{await page.waitForFunction(()=>window.JMConnectedWorldReadback().session.contactLaw.shocks===1,null,{timeout:11000});}
  finally{await page.keyboard.up('ArrowRight')}
  eq((await read()).session.contactLaw.earned,['A'],'SHOCK_LOST_EARNED_CONTACT');
  const returned=await player();yes(Math.hypot(returned.x-120,returned.y-285)<55,'SHOCK_DID_NOT_RETURN_PLAYER');
  await move('y',480);await move('x',765);await tap();
  eq((await read()).session.contactLaw.earned,['A','B'],'SECOND_ACTUAL_TOUCH_DID_NOT_EARN');
  yes((await page.locator('#jm-cp7-state').innerText()).includes('WORLD LAW: PASS'),'GATE_NOT_VISUALLY_UNLOCKED');
  await page.screenshot({path:out+'/CP7_'+spec.kind.toUpperCase()+'_UNLOCKED_PHONE.png',fullPage:true});
  const beforeSuspend=await read();
  await page.evaluate(()=>window.JMWorldSuspend());
  const saved=(await read()).session;
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()?.session?.contactLaw),null,{timeout:20000});
  const reloaded=await read();
  eq(reloaded.session.contactLaw,saved.contactLaw,'PERSISTENCE_LOST_EARNED_CONTACT');
  eq(reloaded.session.rooms[0].snapshot.player,saved.rooms[0].snapshot.player,'RECOVERED_PLAYER_MISMATCH');
  await move('x',210);await move('y',130);await tap();
  eq((await read()).session.collected,['key-0'],'ORIGINAL_KEY_ROUTE_BROKEN');
  await move('x',820);await move('y',285);await tap();
  const crossed=await read();
  eq(crossed.session.active,1,'UNLOCKED_NATIVE_DOOR_DID_NOT_ENTER');
  eq(crossed.session.contactLaw.earned,['A','B'],'ROOM_TRANSITION_LOST_CURRENTS');
  await page.locator('#jm-space-dimension').tap();
  await page.waitForFunction(()=>window.JMConnectedWorldReadback()?.spatial?.active===true);
  const visual=await read();
  yes(visual.spatial.webgl===true&&visual.spatial.drawCalls>2,'INHERITED_3D_VIEW_BROKEN');
  await page.screenshot({path:out+'/CP7_'+spec.kind.toUpperCase()+'_THREED_PHONE.png',fullPage:true});
  await page.evaluate(()=>window.JMWorldSuspend());
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.JMConnectedWorldReadback?.()?.session?.contactLaw),null,{timeout:20000});
  eq((await read()).session.active,1,'ROOM_RESTART_RECOVERY_DID_NOT_SURVIVE');
  eq((await read()).session.contactLaw.routeOpen,true,'GATE_UNLOCK_RECOVERY_DID_NOT_SURVIVE');
  eq(errors,[],'BROWSER_RUNTIME_ERRORS');
  const storageKey='JM_GAMEFORGE_CONNECTED_WORLD_v1_'+spec.body+'_'+spec.hazards+'_'+spec.targetX+'_CP7_EARNED_CONTACT';
  await page.evaluate(key=>{const v=JSON.parse(window.JMWorldStorage.getItem(key));v.body=v.body.replace('"routeOpen":true','"routeOpen":false');window.JMWorldStorage.setItem(key,JSON.stringify(v));},storageKey);
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('jm-world-title')?.textContent.startsWith('WORLD HOLD'),null,{timeout:20000});
  yes((await page.locator('#jm-world-title').innerText()).includes('SPACES_STORAGE_HASH_HOLD'),'TAMPERED_LOCK_REOPEN_WAS_ACCEPTED');
  record.scenes.push({kind:spec.kind,body:spec.body,inWorldClaims:['A','B'],shockRecovery:true,doorTraversal:true,
    returnAfterReload:true,touchContact:true,threeDWebGL:true,hashTamperHeld:true,errors});
  await page.close();
 }
 record.status='BROWSER_REAL_PLAYER_CONTACT_PASS';record.checks=checks;
 fs.writeFileSync(out+'/CP7_CONTACT_RUNTIME_PROOF.json',JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify(record));
}finally{await browser.close();}

// CP9 exact shared multi-recipient kernel regression, after inherited CP7 playable proof.
await import('./mission002-cp9-multi-recipient.mjs');
