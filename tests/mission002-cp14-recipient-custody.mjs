import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeCP13Portable,receiveCP13Portable,CP13_CROSS_SLOT}
 from '../navigator/estate-integration/m002-cp13-device-return.mjs';
import {prepareCP12Exchange,returnCP12Exchange}
 from '../coding-estate/integration/m002-cp12-cross-receiver-production.mjs';
import {registerCP14Original,inspectCP14RecipientReturn,applyCP14RecipientReturn,
 exportCP14Recipient,CP14_GAME_SLOT,CP14_COMIC_SLOT,CP14_APPLIED_SLOT}
 from '../navigator/estate-integration/m002-cp14-recipient-custody.mjs';
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(a,m)=>{assert.ok(a,m);checks++};
const hold=async(fn,regex)=>{await assert.rejects(fn,regex);checks++};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,
 setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
const game={schema:'jm.m002.cp11.game-host/1',identity:'JM-CUSTODY-GAME',
 selected:'Krix',allies:['Krix','Vexa'].map((id,i)=>({id,x:200+40*i,y:300,hp:100,guardTicks:0})),
 enemies:[{id:'Nox',x:700,hp:100}],events:[]};
const comic={schema:'jm.m002.cp11.comic-host/1',owner:'JM Comics Lab',edition:0,pages:[]};
const steps=[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}];
const report={schema:'jm.m002.cp14.governed-typed-application/1',status:'HOLD',
 checks:0,applications:[],conflicts:[],limits:'Typing and original-exchange application across isolated local stores. Not private 5v5 game runtime, physical hardware, cloud, or original THEOGRAPHY.'};
fs.mkdirSync('qa/m002-foundations',{recursive:true});
for(const choice of ['protect','explore','amplify']){
 const sending=storage(),receiving=storage();
 const exchange=prepareCP12Exchange({choice,subject:'JM Krix',actions:steps,stations:3,game,comic});
 eq(exchange.status,'EXECUTED_TWO_REAL_RECIPIENTS','NO_SOURCE_MUTATION');
 const packet=await makeCP13Portable({project:'JM Two Receiving Bodies',origin:'Owner Phone',
  revision:1,cp12:exchange.envelope});
 const fname='qa/m002-foundations/CP14_'+choice.toUpperCase()+'_PORTABLE.json';
 fs.writeFileSync(fname,JSON.stringify(packet,null,2)+'\n');
 await receiveCP13Portable(sending,packet);
 // Explicit transfer via independent file bytes into a completely separate store.
 await receiveCP13Portable(receiving,JSON.parse(fs.readFileSync(fname,'utf8')));
 eq(JSON.parse(sending.getItem(CP13_CROSS_SLOT)).sha256,exchange.envelope.sha256,'SOURCE_CUSTODY_CHANGED');
 const original=JSON.stringify({game,comic});
 const baseline=await registerCP14Original(receiving,{game,comic});
 yes(baseline.gameSha256!==baseline.comicSha256,'ORIGINALS_COLLAPSED');
 eq(JSON.stringify({game,comic}),original,'OWNER_SOURCE_MUTATED');
 const pGame=await inspectCP14RecipientReturn(receiving,'game');
 const pComic=await inspectCP14RecipientReturn(receiving,'comic');
 eq(pGame.status,'REVIEW_ONLY_NO_STATE_CHANGE','GAME_AUTO_APPLIED');
 eq(pComic.status,'REVIEW_ONLY_NO_STATE_CHANGE','COMIC_AUTO_APPLIED');
 eq((await exportCP14Recipient(receiving,'game')).value,game,'REVIEW_CHANGED_GAME');
 eq((await exportCP14Recipient(receiving,'comic')).value,comic,'REVIEW_CHANGED_COMIC');
 await hold(()=>applyCP14RecipientReturn(receiving,'game',pGame.reviewToken),
  /CP14_EXPLICIT_OWNER_APPROVAL_HOLD/);
 await hold(()=>applyCP14RecipientReturn(receiving,'comic','deadbeef',{approve:true}),
  /CP14_REVIEW_CHANGED_HOLD/);
 eq((await exportCP14Recipient(receiving,'comic')).value,comic,'INVALID_REVIEW_MUTATED_COMIC');
 const g=await applyCP14RecipientReturn(receiving,'game',pGame.reviewToken,{approve:true});
 eq(g.status,'RECIPIENT_APPLIED_READBACK_VERIFIED','GAME_ACTUAL_COMMIT');
 eq((await exportCP14Recipient(receiving,'comic')).value,comic,'GAME_COMMIT_CHANGED_COMIC');
 const c=await applyCP14RecipientReturn(receiving,'comic',pComic.reviewToken,{approve:true});
 eq(c.status,'RECIPIENT_APPLIED_READBACK_VERIFIED','COMIC_ACTUAL_COMMIT');
 const expected=returnCP12Exchange(exchange.envelope,{game,comic});
 eq((await exportCP14Recipient(receiving,'game')).value,expected.game,'GAME_NATIVE_STATE_NOT_APPLIED');
 eq((await exportCP14Recipient(receiving,'comic')).value,expected.comic,'COMIC_NATIVE_STATE_NOT_APPLIED');
 eq((await exportCP14Recipient(receiving,'game')).revision,1,'GAME_REVISION_NOT_INCREMENTED');
 eq((await exportCP14Recipient(receiving,'comic')).revision,1,'COMIC_REVISION_NOT_INCREMENTED');
 const saved=JSON.stringify([receiving.getItem(CP14_GAME_SLOT),receiving.getItem(CP14_COMIC_SLOT)]);
 await hold(()=>inspectCP14RecipientReturn(receiving,'game'),/CP14_RECIPIENT_ALREADY_APPLIED_HOLD/);
 await hold(()=>inspectCP14RecipientReturn(receiving,'comic'),/CP14_RECIPIENT_ALREADY_APPLIED_HOLD/);
 eq(JSON.stringify([receiving.getItem(CP14_GAME_SLOT),receiving.getItem(CP14_COMIC_SLOT)]),saved,'REPLAY_CHANGED_LOCAL_VALUES');
 const hostile=storage();
 await registerCP14Original(hostile,{game,comic});
 await receiveCP13Portable(hostile,packet);
 const changed=JSON.parse(hostile.getItem(CP14_GAME_SLOT));const value=JSON.parse(changed.body);
 value.allies[0].hp=25;
 const raw=JSON.stringify(value);changed.body=raw;
 changed.sha256=await (async()=>{const x=await import('node:crypto');return x.createHash('sha256').update(raw).digest('hex')})();
 hostile.setItem(CP14_GAME_SLOT,JSON.stringify(changed));
 await hold(()=>inspectCP14RecipientReturn(hostile,'game'),/CP14_STALE_RECIPIENT_CONFLICT_HOLD/);
 eq((await exportCP14Recipient(hostile,'comic')).value,comic,'CONFLICT_CHANGED_OTHER_BODY');
 const corrupted=storage();await registerCP14Original(corrupted,{game,comic});
 await receiveCP13Portable(corrupted,packet);
 const bad=JSON.parse(corrupted.getItem(CP13_CROSS_SLOT));bad.body=bad.body.replace('JM Krix','JM Ghost');
 corrupted.setItem(CP13_CROSS_SLOT,JSON.stringify(bad));
 await hold(()=>inspectCP14RecipientReturn(corrupted,'game'),/CP14_CARRIER_HASH_HOLD/);
 const rollback=storage();await registerCP14Original(rollback,{game,comic});
 await receiveCP13Portable(rollback,packet);
 const p=await inspectCP14RecipientReturn(rollback,'game');
 const originalSet=rollback.setItem;
 rollback.setItem=(k,v)=>{if(k===CP14_APPLIED_SLOT)throw Error('SIMULATED_DISK_FAILURE');return originalSet(k,v)};
 await hold(()=>applyCP14RecipientReturn(rollback,'game',p.reviewToken,{approve:true}),/SIMULATED_DISK_FAILURE/);
 rollback.setItem=originalSet;
 eq((await exportCP14Recipient(rollback,'game')).value,game,'ATOMIC_ROLLBACK_FAILED');
 eq(rollback.getItem(CP14_APPLIED_SLOT),null,'FALSE_LEDGER_AFTER_FAILED_COMMIT');
 report.applications.push({choice,source:exchange.envelope.sha256,game:g.recipientSha256,
  comic:c.recipientSha256,gameMutations:g.mutationCount,comicMutations:c.mutationCount});
 report.conflicts.push({choice,staleHeld:true,duplicateHeld:true,corruptHeld:true,rollbackPass:true});
}
await hold(()=>registerCP14Original(storage(),{game:{},comic}),/CP14_GAME_TYPE_HOLD/);
await hold(()=>inspectCP14RecipientReturn(storage(),'game'),/CP14_CP13_CARRIER_ABSENT_HOLD/);
report.status='PASS_INDEPENDENT_RECIPIENT_APPLICATION';report.checks=checks;
fs.writeFileSync('qa/m002-foundations/CP14_REAL_TYPED_RECIPIENT_RECEIPT.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({schema:report.schema,status:report.status,checks,
 choices:report.applications.length,applied:report.applications.length*2,
 conflicts:report.conflicts.length,partialAutoApply:false,actualDevice:false}));
