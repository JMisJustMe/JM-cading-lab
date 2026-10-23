import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareCP12Exchange,returnCP12Exchange}
 from '../coding-estate/integration/m002-cp12-cross-receiver-production.mjs';
import {inspectCP15Export,applyCP15Game,applyCP15Comic}
 from '../coding-estate/integration/m002-cp15-full-recipient-activation.mjs';
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(x,m)=>{assert.ok(x,m);checks++};
const hold=(fn,re)=>{assert.throws(fn,re);checks++};
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const initialGame={schema:'jm.m002.cp11.game-host/1',identity:'JM',
 selected:'Krix',allies:[{id:'Krix',x:200,y:300,hp:100,guardTicks:0}],
 enemies:[{id:'Nox',x:700,hp:100}],events:[]};
const initialComic={schema:'jm.m002.cp11.comic-host/1',owner:'JM Studio',edition:0,pages:[]};
const originalLive={schema:'jm.m002.cp15.live-game-scope/1',phase:'PLAYING',
 allies:['RUSH','BRICK','ARC','JINX','LINK'].map((name,i)=>({
  name,alive:true,x:200+i*55,face:1,hp:100+i*20,guard:0})),
 enemies:[{name:'Nox',x:660,hp:100,alive:true},{name:'Shade',x:780,hp:100,alive:true}],
 events:[]};
const originalComic={schema:'jm.m002.cp11.comic-edition/1',revision:1,panels:[],captions:[],
 palette:'deep',edition:0,source:null};
const steps=[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}];
const evidence={schema:'jm.m002.cp15.full-recipient-native-proof/1',status:'HOLD',
 checks:0,scenarios:[],denials:[],
 scope:'SOURCE_GUARDED_NATIVE_RECIPIENT_SEMANTICS; separate Chromium tests prove actual full private game/editor HTML'};
for(const choice of ['protect','explore','amplify']){
 const produced=prepareCP12Exchange({choice,subject:'JM Krix',stations:3,
  actions:steps,game:initialGame,comic:initialComic});
 eq(produced.status,'EXECUTED_TWO_REAL_RECIPIENTS','CP12_EXCHANGE_MISSING');
 const returned=returnCP12Exchange(produced.envelope,{game:initialGame,comic:initialComic});
 const gx={schema:'jm.m002.cp14.recipient-export/1',kind:'game',value:returned.game,
  sha256:sha(returned.game),revision:1};
 const cx={schema:'jm.m002.cp14.recipient-export/1',kind:'comic',value:returned.comic,
  sha256:sha(returned.comic),revision:1};
 eq(inspectCP15Export(gx,'game').subject,'Krix','SOURCE_ACTOR_IDENTITY_LOST');
 eq(inspectCP15Export(cx,'comic').subject,'JM Krix','COMIC_SOURCE_ACTOR_LOST');
 const start=JSON.stringify({g:originalLive,c:originalComic});
 hold(()=>applyCP15Game(gx,originalLive,{recipientHero:'ARC'}),/CP15_OWNER_APPROVAL_HOLD/);
 hold(()=>applyCP15Game(gx,originalLive,{recipientHero:'Krix',approve:true}),
  /CP15_EXPLICIT_FIGHTER_MAPPING_HOLD/);
 const transformed=applyCP15Game(gx,originalLive,{recipientHero:'ARC',approve:true});
 eq(transformed.status,'ACTUAL_LIVE_RECIPIENT_MUTATION','NO_GAME_RUNTIME_APPLICATION');
 yes(transformed.identityMappedExplicitly,'ACTOR_IDENTITIES_SILENTLY_MERGED');
 eq(transformed.sourceActor,'Krix','WRONG_SOURCE_ACTOR');
 eq(transformed.receivingHero,'ARC','WRONG_RECEIVER_SUIt');
 yes(transformed.beforeSha256!==transformed.afterSha256,'GAME_UNCHANGED');
 if(choice==='protect')yes(transformed.recipient.allies.every(x=>x.guard>=4.5),
   'PROTECT_NOT_SHIELDED_ALLIES');
 if(choice==='explore')eq(transformed.recipient.allies[2].x,originalLive.allies[2].x+175,
   'EXPLORE_NOT_REAL_MOVEMENT');
 if(choice==='amplify')yes(transformed.recipient.enemies.some(x=>x.hp===78),
   'AMPLIFY_NOT_REAL_DAMAGE');
 hold(()=>applyCP15Game(gx,originalLive,{recipientHero:'ARC',approve:true,
  seen:transformed.seen}),/CP15_REPLAY_HOLD/);
 const wrong=structuredClone(gx);wrong.value.allies[0].hp=1;
 hold(()=>inspectCP15Export(wrong,'game'),/CP15_EXPORT_HASH_OR_SCHEMA_HOLD/);
 hold(()=>applyCP15Comic(cx,originalComic),/CP15_OWNER_APPROVAL_HOLD/);
 const illustrated=applyCP15Comic(cx,originalComic,{approve:true});
 eq(illustrated.status,'EDITABLE_ILLUSTRATION_EDITION_CREATED','NO_COMIC_AUTHORING');
 eq(illustrated.panels,4,'NOT_FOUR_REAL_CONTACT_PANELS');
 eq(illustrated.recipient.source.subject,'JM Krix','COMIC_ACTOR_NOT_RETAINED');
 eq(illustrated.recipient.edition,1,'NO_EDITION_INCREMENT');
 yes(illustrated.recipient.panels.every(x=>x.source.originalLayerCommands.length===3),
  'ORIGINAL_DRAWING_LAYERS_DROPPED');
 eq(illustrated.originalBackup,originalComic,'PRIOR_COMIC_NOT_BACKED_UP');
 hold(()=>applyCP15Comic(cx,originalComic,{approve:true,seen:illustrated.seen}),
  /CP15_REPLAY_HOLD/);
 const corrupted=structuredClone(cx);corrupted.value.pages[0].caption='forged';
 hold(()=>inspectCP15Export(corrupted,'comic'),/CP15_EXPORT_HASH_OR_SCHEMA_HOLD/);
 eq(JSON.stringify({g:originalLive,c:originalComic}),start,'PRIVATE_ANCESTOR_MUTATED');
 evidence.scenarios.push({choice,actorMapped:'Krix→ARC',
  gameDigest:transformed.afterSha256,comicDigest:illustrated.afterSha256,
  nativeGameMutation:transformed.evidence.kind,comicPanels:illustrated.panels});
 evidence.denials.push({choice,implicitMappingHeld:true,replayHeld:true,
  gameCorruptionHeld:true,comicCorruptionHeld:true,originalIntact:true});
}
hold(()=>inspectCP15Export({schema:'fake'},'game'),/CP15_EXPORT_HASH_OR_SCHEMA_HOLD/);
hold(()=>inspectCP15Export({schema:'fake'},'comic'),/CP15_EXPORT_HASH_OR_SCHEMA_HOLD/);
evidence.checks=checks;evidence.status='PASS_TRUE_NATIVE_RECIPIENT_ACTIVATION';
fs.mkdirSync('qa/m002-foundations',{recursive:true});
fs.writeFileSync('qa/m002-foundations/CP15_NATIVE_RECIPIENT_ACTIVATION.json',
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({schema:evidence.schema,status:evidence.status,checks,
 appliedGameChoices:3,illustratedEditions:3,actorMapping:'EXPLICIT',ownerDevice:'HOLD'}));

// CP16: distinct durable 5v5 match and editable comic revision custody.
await import('./mission002-cp16-durable-recipient.mjs');
