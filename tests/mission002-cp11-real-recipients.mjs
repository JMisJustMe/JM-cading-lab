import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executeCP11Recipients} from '../coding-estate/integration/m002-cp11-real-recipient-effects.mjs';
import {executePortable} from '../coding-estate/everybody/compiler-core.mjs';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const fails=(fn)=>{assert.throws(fn,/CP11_|CP10_/);checks++};
const route=[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}];
const game={schema:'jm.m002.cp11.game-host/1',identity:'JM-SECOND-RECIPIENT',
 selected:'Krix',allies:['Krix','Vexa','Dart','Link','Brik'].map((id,i)=>({id,x:220+i*20,y:350,hp:100,guardTicks:0})),
 enemies:['Axe','Nox','Bastion','Volt','Warden'].map((id,i)=>({id,x:760+i*30,hp:100})),events:[]};
const comic={schema:'jm.m002.cp11.comic-host/1',owner:'JM Creator House',edition:0,pages:[]};
const receipt={schema:'jm.m002.cp11.actual-receivers/1',status:'HOLD',checks:0,proof:[],denials:[]};
const kinds=[];
for(const choice of ['protect','explore','amplify']){
 const spec={medium:'game',choice,stations:3,subject:'JM Krix',actions:route};
 const old=JSON.stringify(game),o=executeCP11Recipients(spec,game);
 eq(o.status,'ACTUAL_RECIPIENT_MUTATION','GAME_NOT_EXECUTED');
 eq(JSON.stringify(game),old,'DONOR_MUTATED');
 ok(o.changed&&o.beforeSha256!==o.afterSha256,'NOT_ACTUAL_GAME_STATE');
 ok(o.receipt.kind==='CP11_ACTUAL_RECIPIENT_DING'&&o.receipt.mutationCount>0,'NO_SCOPED_DING');
 ok(o.composition.combibind.state.collapsed===false,'COMBIBIND_IDENTITY_LOST');
 ok(o.composition.oneBody.receipt.ok,'NO_PORTABLE_RECEIPT');
 eq(executePortable(structuredClone(o.composition.oneBody.portable)).state.permitted,true,'REPLAY_HOLD');
 const actor=o.recipient.allies[0];
 if(choice==='protect')ok(o.recipient.allies.every(x=>x.guardTicks>=4),'NO_REAL_ALLIED_GUARD');
 if(choice==='explore')eq(actor.x,game.allies[0].x+175,'NO_REAL_LEAP');
 if(choice==='amplify')ok(o.recipient.enemies.some(x=>x.hp===78),'NO_REAL_COMBAT_DAMAGE');
 kinds.push(o.changes[0].type);
 receipt.proof.push({medium:'game',choice,changed:o.changed,sha:o.afterSha256});
 const held=executeCP11Recipients({...spec,actions:route.slice(0,-1)},game);
 eq(held.status,'DENIED_RECIPIENT_UNCHANGED','UNAUTHORIZED_GAME_ABILITY');
 eq(held.recipient,game,'UNAUTHORIZED_GAME_MUTATION');
 eq(held.receipt.mutationCount,0,'FALSE_DENIAL_RECEIPT');
 receipt.denials.push({medium:'game',choice});
}
eq(new Set(kinds).size,3,'INTERCHANGEABLE_ABILITIES');
for(const choice of ['protect','explore','amplify']){
 const spec={medium:'comic',choice,stations:3,subject:'JM Vexa',actions:route};
 const old=JSON.stringify(comic),o=executeCP11Recipients(spec,comic);
 eq(o.status,'ACTUAL_RECIPIENT_MUTATION','COMIC_NOT_EXECUTED');
 eq(JSON.stringify(comic),old,'DONOR_COMIC_MUTATED');
 ok(o.recipient.pages.length>=3,'NO_ILLUSTRATION_PLANS');
 eq(o.recipient.edition,1,'NO_EDITION_CHANGE');
 ok(o.recipient.pages.every(p=>p.actor==='JM Vexa'&&p.layerCommands.length===3),'SOURCE_IDENTITY_LOST');
 ok(o.beforeSha256!==o.afterSha256&&o.receipt.mutationCount>=3,'NO_COMIC_MUTATION_RECEIPTS');
 receipt.proof.push({medium:'comic',choice,pages:o.recipient.pages.length,sha:o.afterSha256});
 const held=executeCP11Recipients({...spec,actions:route.slice(0,1)},comic);
 eq(held.status,'DENIED_RECIPIENT_UNCHANGED','UNAUTHORIZED_COMIC');
 eq(held.recipient,comic,'DENIED_COMIC_MUTATED');
 receipt.denials.push({medium:'comic',choice});
}
const ids=['JM Krix','JM Vexa'].map(subject=>
 executeCP11Recipients({medium:'comic',choice:'explore',stations:2,subject,
 actions:[{kind:'claim',id:'A'},{kind:'claim',id:'B'}]},comic).recipient.pages[0].actor);
eq(ids,['JM Krix','JM Vexa'],'SUBJECT_IDENTITY_COLLAPSE');
fails(()=>executeCP11Recipients({medium:'song'},comic));
fails(()=>executeCP11Recipients({medium:'game',choice:'protect',stations:3,subject:'JM Krix',actions:route},comic));
fails(()=>executeCP11Recipients({medium:'comic',choice:'protect',stations:3,subject:'JM Krix',actions:route},game));
fails(()=>executeCP11Recipients({medium:'game',choice:'protect',stations:3,subject:'JM Krix',actions:[{kind:'teleport'}]},game));
receipt.checks=checks;receipt.status='PASS_NATIVE_REAL_MUTATIONS';
fs.mkdirSync('qa/m002-foundations',{recursive:true});
fs.writeFileSync('qa/m002-foundations/CP11_REAL_RECIPIENT_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({schema:receipt.schema,status:receipt.status,checks,permitted:receipt.proof.length,
 denied:receipt.denials.length,gameEffects:kinds,creativeOwnerIds:ids}));

// CP12: recoverable native game-to-comic handoff and negative custody gates.
await import('./mission002-cp12-cross-receiver.mjs');
