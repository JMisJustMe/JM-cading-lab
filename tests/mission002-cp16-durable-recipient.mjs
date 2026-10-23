import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {sealCP16,readCP16,resumeCP16,CP16_NATIVE_SCOPE}
 from '../coding-estate/integration/m002-cp16-durable-recipient.mjs';
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(x,m)=>{assert.ok(x,m);checks++};
const hold=(f,re)=>{assert.throws(f,re);checks++};
const sha=s=>createHash('sha256').update(s).digest('hex');
const names=['RUSH','BRICK','ARC','JINX','LINK','BLAZE','AXE','VOLT','SHADE','NOVA'];
const game={schema:'jm.m002.cp16.whole-match/1',version:'cp15-fiveflip-donor',phase:'PAUSED',
 mode:'SEMI',selected:2,remaining:233.5,elapsed:66.5,
 safe:{rx:480,ry:250},matchSerial:2,
 bodies:names.map((name,id)=>({id,name,maxHp:200,hp:150-id*7,x:200+id*50,y:350,
 team:Number(id>=5),alive:true,vx:5,vy:0,guard:0,order:'ATTACK'})),
 projectiles:[{x:340,y:360,vx:100,vy:0,life:1.2}],particles:[],
 cp8:{receipts:[],earned:[],shocks:0},cp11:{activations:[],choice:'explore'},
 cp15Ledger:{events:[]},source:{originalFIVEFLIP:'cd3136641cf5c3569a24adc07d7a59070fe280ef9e62290b2a20b890cc948e9e',sourceMechanic:'63794bab0bdf612d1af5c6c3c0e2141bbf80a8ff33dbe64f4a416bb4290f85d3'}};
const comicEdition=(number,caption)=>({schema:'jm.m002.cp11.comic-edition/1',
 revision:1,edition:number,source:{subject:'JM Krix',choice:'amplify',contactGate:true},
 panels:[{source:'Contact A',caption},{source:'Reentry',caption:'Survived'}],
 captions:[caption,'Survived'],palette:'deep'});
let prior='ROOT';const history={schema:'jm.m002.cp16.editable-edition-archive/1',entries:[]};
for(let i=1;i<=3;i++){
 const body=JSON.stringify(comicEdition(i,'Scene '+i));const digest=sha(body);
 history.entries.push({sequence:i,originalEdition:i,actor:'JM Krix',choice:'amplify',
 prev:prior,body,sha256:digest});prior=digest;
}
const result={schema:'jm.m002.cp16.native-durable-custody-proof/1',status:'HOLD',checks:0,scopes:CP16_NATIVE_SCOPE,
 returns:[]};
for(const [kind,object] of [['game',game],['comic',history]]){
 const source=JSON.stringify(object),sealed=sealCP16(kind,object);
 eq(sealed.sha256,sha(sealed.body),'EXACT_BYTE_HASH');
 eq(readCP16(sealed),object,'SOURCE_CANNOT_RETURN');
 eq(JSON.stringify(object),source,'SEALED_ORIGINAL_MUTATION');
 fs.mkdirSync('qa/m002-foundations',{recursive:true});
 const file='qa/m002-foundations/CP16_'+kind.toUpperCase()+'_DURABLE.json';
 fs.writeFileSync(file,JSON.stringify(sealed,null,2)+'\n');
 const received=JSON.parse(fs.readFileSync(file,'utf8'));
 eq(readCP16(received),object,'DISK_LOST_WHOLE_STATE');
 hold(()=>resumeCP16(null,sealed),/CP16_NATIVE_OWNER_APPROVAL_HOLD/);
 const applied=resumeCP16(null,sealed,{approve:true});
 eq(applied.recovered,object,'SCOPED_RECOVERY_NOT_EXACT');
 eq(applied.receipt.stateChanged,true,'FALSE_UNCHANGED_DING');
 hold(()=>resumeCP16(null,sealed,{approve:true,seen:applied.seen}),/CP16_NATIVE_REPLAY_HOLD/);
 const drift=structuredClone(object);
 if(kind==='game')drift.bodies[2].hp=7;
 else drift.entries.pop();
 hold(()=>resumeCP16(drift,sealed,{approve:true}),/CP16_NATIVE_CONFLICT_HOLD/);
 const expected=sealCP16(kind,drift).sha256;
 eq(resumeCP16(drift,sealed,{approve:true,expectedCurrentSha256:expected}).recovered,
   object,'REVIEWED_CONFLICT_NOT_APPLIED');
 const tamper=structuredClone(sealed);tamper.body=tamper.body.replace('JM Krix','Impostor')
  .replace('RUSH','FORGED');
 hold(()=>readCP16(tamper),/CP16_NATIVE_HASH_HOLD/);
 result.returns.push({kind,sha256:sealed.sha256,
  sourcePreserved:JSON.stringify(object)===source,conflictHeld:true,replayHeld:true});
}
const wrong=structuredClone(game);wrong.phase='PLAYING';
hold(()=>sealCP16('game',wrong),/CP16_NATIVE_MATCH_AUTHORITY_HOLD/);
const wrongFighter=structuredClone(game);wrongFighter.bodies[0].name='WRAITH';
hold(()=>sealCP16('game',wrongFighter),/CP16_NATIVE_MATCH_AUTHORITY_HOLD/);
const wrongComic=structuredClone(history);wrongComic.entries[1].prev='0'.repeat(64);
hold(()=>sealCP16('comic',wrongComic),/CP16_NATIVE_COMIC_CHAIN_HOLD/);
hold(()=>sealCP16('music',history),/CP16_NATIVE_UNDECLARED_MEDIUM_HOLD/);
result.checks=checks;result.status='PASS_TWO_DIFFERENT_NATIVE_DURABLE_RECIPIENTS';
fs.writeFileSync('qa/m002-foundations/CP16_NATIVE_DURABLE_RECEIPT.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({schema:result.schema,status:result.status,checks,gameFighters:10,
 editableComicEditions:history.entries.length,sourceOriginalsUntouched:true}));

// CP17: three independently editable, source-bound native creative media outputs.
await import('./mission002-cp17-three-media.mjs');
