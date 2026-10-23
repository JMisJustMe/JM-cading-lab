import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareCP12Exchange,returnCP12Exchange,CP12_AUTHORITY} from '../coding-estate/integration/m002-cp12-cross-receiver-production.mjs';
const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(a,m)=>{assert.ok(a,m);checks++};
const hold=(fn,re)=>{assert.throws(fn,re);checks++};
let checks=0;
const game={schema:'jm.m002.cp11.game-host/1',identity:'JM-CP12-SECOND-RECIPIENT',
 selected:'Krix',allies:['Krix','Vexa','Link'].map((id,i)=>({id,x:200+i*75,y:340,hp:100,guardTicks:0})),
 enemies:['Nox','Rift','Burn'].map((id,i)=>({id,x:700+i*50,hp:100})),events:[]};
const comic={schema:'jm.m002.cp11.comic-host/1',owner:'JM Author House',edition:0,pages:[]};
const input=(choice,actions)=>({choice,subject:'JM Krix',stations:3,actions,game,comic});
const full=[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}];
const report={schema:'jm.m002.cp12.actual-handoff-native-proof/1',status:'HOLD',checks:0,
 scenarios:[],holds:[],sources:CP12_AUTHORITY};
for(const choice of ['protect','explore','amplify']){
 const originals=JSON.stringify({game,comic});
 const produced=prepareCP12Exchange(input(choice,full));
 same(produced.status,'EXECUTED_TWO_REAL_RECIPIENTS','SPLIT_EXECUTION');
 yes(produced.mutationCount>=2,'NO_MUTATION_RECEIPT');
 yes(produced.envelope.body.length>250&&produced.envelope.sha256.length===64,'ABSENT_EXCHANGE');
 same(JSON.stringify({game,comic}),originals,'SOURCE_BODY_MUTATED');
 const recovered=returnCP12Exchange(produced.envelope,{game,comic});
 same(recovered.status,'RECOVERED_BOTH_RECIPIENTS','NO_REAL_RETURN');
 same(recovered.comic.edition,1,'NO_COMIC_PRODUCTION');
 yes(recovered.comic.pages.every(x=>x.actor==='JM Krix'&&x.layerCommands.length===3),'COMIC_ILLUSTRATION_INSTRUCTIONS_MISSING');
 const actor=recovered.game.allies[0];
 if(choice==='protect')yes(recovered.game.allies.every(x=>x.guardTicks>=4),'NO_GUARD_FIELD');
 if(choice==='explore')same(actor.x,375,'NO_REAL_LEAP');
 if(choice==='amplify')yes(recovered.game.enemies.some(x=>x.hp===78),'NO_REAL_DAMAGE');
 const dir='qa/m002-foundations';
 fs.mkdirSync(dir,{recursive:true});
 const path=dir+'/CP12_'+choice.toUpperCase()+'_EXCHANGE.json';
 fs.writeFileSync(path,JSON.stringify(produced.envelope,null,2)+'\n');
 const reloaded=JSON.parse(fs.readFileSync(path,'utf8'));
 same(returnCP12Exchange(reloaded,{game,comic}),recovered,'DURABLE_BYTES_DIFFERENCE');
 hold(()=>returnCP12Exchange(reloaded,{game,comic,seen:recovered.seen}),/CP12_REPLAY_ALREADY_APPLIED_HOLD/);
 const corrupted=structuredClone(reloaded);corrupted.body=corrupted.body.replace('JM Krix','JM Ghost');
 hold(()=>returnCP12Exchange(corrupted,{game,comic}),/CP12_EXCHANGE_HASH_HOLD/);
 const stale=structuredClone(game);stale.allies[0].hp=25;
 hold(()=>returnCP12Exchange(reloaded,{game:stale,comic}),/CP12_STALE_RECIPIENT_CONFLICT_HOLD/);
 const held=prepareCP12Exchange(input(choice,full.slice(0,-1)));
 same(held.status,'HELD_NO_EXPORT','PARTIAL_CONSEQUENCE');
 same(held.envelope,null,'PHANTOM_EXCHANGE');
 same(held.recipients.game,game,'DENIAL_MUTATED_GAME');
 same(held.recipients.comic,comic,'DENIAL_MUTATED_COMIC');
 same(held.mutationCount,0,'DENIAL_RECEIPT_INFLATION');
 report.scenarios.push({choice,sha256:produced.envelope.sha256,
  mutations:produced.mutationCount,gameEffect:recovered.game.events.at(-1)?.action,
  comicPages:recovered.comic.pages.length});
 report.holds.push({choice,noPrematureExport:true,corruptedRejected:true,staleRejected:true,replayRejected:true});
}
const duplicate=prepareCP12Exchange(input('protect',full));
hold(()=>returnCP12Exchange(duplicate.envelope,{game,comic:{...comic,owner:'Intruder'}}),/CP12_STALE_RECIPIENT_CONFLICT_HOLD/);
hold(()=>prepareCP12Exchange(input('invalid',full)),/CP12_ROUTE_INPUT_HOLD/);
hold(()=>prepareCP12Exchange(input('explore',[{kind:'fabricate'}])),/CP10_ACTION_HOLD/);
report.checks=checks;report.status='NATIVE_TWO_RECIPIENT_HANDOFF_PASS';
fs.mkdirSync('qa/m002-foundations',{recursive:true});
fs.writeFileSync('qa/m002-foundations/CP12_NATIVE_HANDOFF_RECEIPT.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({schema:report.schema,status:report.status,checks,choices:report.scenarios.length,mutationReceipts:report.scenarios.map(x=>x.mutations),
 holds:report.holds.length,boundary:'Actual disk readback; no cloud/device/browser-original integration assumed'}));

await import('./mission002-cp13-portable-return.mjs');
