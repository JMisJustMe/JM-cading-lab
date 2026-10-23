import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeCP13Portable,inspectCP13Portable,receiveCP13Portable,
 CP13_LEDGER_SLOT,CP13_CROSS_SLOT} from '../navigator/estate-integration/m002-cp13-device-return.mjs';
import {saveLocalReturn,recoverLocalReturn,RETURN_SLOT} from '../navigator/estate-integration/return-checkpoint.mjs';
import {prepareCP12Exchange} from '../coding-estate/integration/m002-cp12-cross-receiver-production.mjs';
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(x,m)=>{assert.ok(x,m);checks++};
const hold=async(fn,re)=>{await assert.rejects(fn,re);checks++};
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,
 setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),keys:()=>[...m.keys()]}};
const phone=store(),laptop=store();
const initial={schema:'jm.estate.operator.local-return/0.2',mode:'route',
 input:'Use the existing JM operator route',summary:'Native phone candidate: protected owner source'};
const updated={...initial,summary:'Laptop processed JM world and advanced checkpoint'};
const steps=[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}];
const game={schema:'jm.m002.cp11.game-host/1',selected:'Krix',
 allies:[{id:'Krix',x:200,y:300,hp:100,guardTicks:0},{id:'Vexa',x:230,y:310,hp:100,guardTicks:0}],
 enemies:[{id:'Nox',x:700,hp:100}],events:[]};
const comic={schema:'jm.m002.cp11.comic-host/1',owner:'JM Creative House',edition:0,pages:[]};
const cp12=prepareCP12Exchange({choice:'explore',subject:'JM Krix',
 actions:steps,stations:3,game,comic}).envelope;
const first=await saveLocalReturn(phone,initial);
eq(first.state,'LOCAL_RETURN_READBACK_VERIFIED','PHONE_BASELINE');
const packet=await makeCP13Portable({project:'JM CP12 Composition',
 origin:'Galaxy Fold',revision:1,returnValue:first.value,cp12});
const inspect=await inspectCP13Portable(packet);
eq(inspect.status,'STRUCTURE_AND_HASH_VERIFIED_NOT_APPLIED','INSPECTION_NOT_ACTUATION');
yes(inspect.containsOperator&&inspect.containsCP12,'MISSING_TWO_REAL_CARRIERS');
eq(laptop.keys(),[],'LAPTOP_MUST_START_INDEPENDENT');
fs.mkdirSync('qa/m002-foundations',{recursive:true});
const filename='qa/m002-foundations/CP13_PHONE_TO_LAPTOP_EXCHANGE.json';
fs.writeFileSync(filename,JSON.stringify(packet,null,2)+'\n');
const file=JSON.parse(fs.readFileSync(filename,'utf8'));
eq(file,packet,'ACTUAL_BYTES_FILE_RETURN');
const received=await receiveCP13Portable(laptop,file);
eq(received.status,'TRANSFER_RETURN_VERIFIED','LAPTOP_FAIL');
eq(received.localOverwrite,false,'NO_DEFAULT_OVERWRITE');
eq((await recoverLocalReturn(laptop)).value,initial,'LAPTOP_RECOVERY_OF_JM_RETURN');
eq(JSON.parse(laptop.getItem(CP13_CROSS_SLOT)).sha256,cp12.sha256,'CP12_CROSS_MEDIA_SOURCE_RETAINED');
eq(JSON.parse(laptop.getItem(CP13_LEDGER_SLOT)).seen,[packet.sha256],'ACTUAL_LEDGER_READBACK');
await hold(()=>receiveCP13Portable(laptop,file),/CP13_DUPLICATE_PACKET_HOLD/);
const tampered=structuredClone(file);tampered.body=tampered.body.replace('Galaxy Fold','Other Device');
const before=JSON.stringify(laptop.keys().map(x=>[x,laptop.getItem(x)]));
await hold(()=>receiveCP13Portable(laptop,tampered),/CP13_ENVELOPE_HASH_HOLD/);
eq(JSON.stringify(laptop.keys().map(x=>[x,laptop.getItem(x)])),before,'TAMPER_MUST_NOT_MUTATE');
const phoneSaved=(await recoverLocalReturn(phone));
await saveLocalReturn(laptop,updated);
const revised=(await recoverLocalReturn(laptop));
const back=await makeCP13Portable({project:'JM CP12 Composition',
 origin:'Laptop Workbench',revision:2,returnValue:revised.value,cp12});
const backFile='qa/m002-foundations/CP13_LAPTOP_TO_PHONE_EXCHANGE.json';
fs.writeFileSync(backFile,JSON.stringify(back,null,2)+'\n');
const backDisk=JSON.parse(fs.readFileSync(backFile,'utf8'));
await hold(()=>receiveCP13Portable(phone,backDisk),/CP13_CONFLICT_REVIEW_REQUIRED_HOLD/);
eq((await recoverLocalReturn(phone)).value,initial,'PHONE_OWNER_DATA_PRESERVED');
await hold(()=>receiveCP13Portable(phone,backDisk,{allowReplace:true,
 expectedCurrentSha256:'0'.repeat(64)}),/CP13_CONFLICT_REVIEW_REQUIRED_HOLD/);
const returned=await receiveCP13Portable(phone,backDisk,{allowReplace:true,
 expectedCurrentSha256:phoneSaved.sha256});
eq(returned.localOverwrite,true,'EXPLICIT_DIGEST_APPROVED_REPLACEMENT');
eq((await recoverLocalReturn(phone)).value,updated,'EXACT_LAPTOP_CHANGE_RETURNED_TO_PHONE');
eq(JSON.parse(phone.getItem(CP13_CROSS_SLOT)).sha256,cp12.sha256,'COMIC_RETAINED_AFTER_RETURN');
await hold(()=>receiveCP13Portable(phone,backDisk),/CP13_DUPLICATE_PACKET_HOLD/);
const independent=store(),cponly=await makeCP13Portable({project:'JM CP12 Composition',
 origin:'Comics Station',revision:1,cp12});
const isolated=await receiveCP13Portable(independent,cponly);
eq(isolated.operatorSha256,null,'CP12_ONLY_MUST_NOT_FAKE_OPERATOR');
eq(JSON.parse(independent.getItem(CP13_CROSS_SLOT)),cp12,'CP12_ONLY_TRANSPORT');
yes(!independent.getItem(RETURN_SLOT),'NO_GHOST_OPERATOR_RETURN');
await hold(()=>makeCP13Portable({project:'JM CP12 Composition',origin:'Phone',revision:0,
 returnValue:initial}),/CP13_EXPORT_INPUT_HOLD/);
await hold(()=>makeCP13Portable({project:'JM CP12 Composition',origin:'Phone',revision:1,
 cp12:{...cp12,sha256:'0'.repeat(64)}}),/CP13_CP12_SOURCE_HOLD/);
const hostile=store();hostile.setItem(CP13_LEDGER_SLOT,'not-json');
await hold(()=>receiveCP13Portable(hostile,file),/CP13_LEDGER_JSON_HOLD/);
yes(!hostile.getItem(RETURN_SLOT),'CORRUPTED_DESTINATION_NOT_MUTATED');
const receipt={schema:'jm.m002.cp13.portable-multi-host-proof/1',status:'PASS_DISTINCT_OFFLINE_HOSTS',
 checks,devices:['Galaxy Fold simulated storage','Laptop Workbench simulated storage','Comics Station simulated storage'],
 roundTrips:2,manualConflictReview:true,mutationsWithoutConsent:0,
 source:{cp11:'existing native operator route',cp12Sha256:cp12.sha256},
 files:[filename,backFile],boundaries:{
 genuineHardware:'NOT_TESTED',cloud:'NOT_USED',hostIdentity:'USER_DECLARED',
 integrity:'UNKEYED_SHA256_ONLY',recipientCP12:'TRANSPORTED_NOT_APPLIED',
 sameSession:'INDEPENDENT_MAP_STORES; FILESYSTEM_EXPORT_IMPORT',
 ownerSamsung:'DEFERRED_BATCH'}};
fs.writeFileSync('qa/m002-foundations/CP13_DEVICE_RETURN_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,checks,roundTrips:2,conflictsHeld:true,
 originalIntact:true,cp12Transported:true}));

// CP14: source-returned, separately approved CP11 game/comic application.
await import('./mission002-cp14-recipient-custody.mjs');
