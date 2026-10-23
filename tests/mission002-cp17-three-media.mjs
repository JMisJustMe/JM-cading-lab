import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {executeCP17Media,returnCP17Edition,CP17_MEDIA_AUTHORITY}
 from '../coding-estate/integration/m002-cp17-multi-media-producer.mjs';
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(x,m)=>{assert.ok(x,m);checks++};
const hold=(f,re)=>{assert.throws(f,re);checks++};
const hash=b=>createHash('sha256').update(b).digest('hex');
const actions=[{kind:'claim',id:'A'},{kind:'shock'},{kind:'claim',id:'B'},{kind:'claim',id:'C'}];
const receipt={schema:'jm.m002.cp17.real-independent-creative-media/1',status:'HOLD',
 sources:CP17_MEDIA_AUTHORITY,checks:0,exported:[],denied:[],proofScope:'CURRENT_NATIVE_CP10 + SOURCE_SCOPED_BYTES; separate private Chromium production studio QA'};
const store={},types=new Map(),sources=[];
fs.mkdirSync('qa/m002-foundations',{recursive:true});
for(const choice of ['protect','explore','amplify']){
 for(const medium of ['book','music','cartoon']){
  const spec={medium,choice,subject:'JM Vexa',stations:3,actions};
  const artifact=executeCP17Media(spec);
  eq(artifact.status,'REAL_MEDIA_MATERIALIZED','NO_ACTUAL_AUTHORING');
  eq(artifact.source.subject,'JM Vexa','AUTHORIAL_SUBJECT_ERASED');
  eq(artifact.source.choice,choice,'CHOICE_ERASED');
  eq(artifact.source.kernel,3,'SOURCES_NOT_EARNED');
  eq(artifact.source.oneBody,true,'NATIVE_ONEBODY_MISSING');
  eq(hash(artifact.bytes),artifact.sha256,'BINARY_DIGEST_MISMATCH');
  eq(artifact.bytes.length,artifact.length,'DECLARED_BYTES_FAKED');
  if(medium==='book'){
   yes(artifact.bytes.toString().includes('<html')&&artifact.bytes.toString().includes('<h2>'),
    'PRINTABLE_HTML_NOT_MATERIALIZED');
   const revised=executeCP17Media(spec,{title:'JM Vexa Edited Book',
    chapters:[{heading:'Independent Chapter',paragraph:'A genuinely authored separate chapter.'}]});
   yes(revised.bytes.toString().includes('Independent Chapter'),'BOOK_NOT_EDITABLE');
   yes(revised.sha256!==artifact.sha256,'BOOK_REWRITE_NOT_REAL');
  }else if(medium==='music'){
   eq(artifact.bytes.toString('utf8',0,4),'RIFF','NOT_RIFF_WAV');
   eq(artifact.bytes.toString('utf8',8,12),'WAVE','WAV_HEADER_MISSING');
   eq(artifact.bytes.readUInt32LE(4)+8,artifact.bytes.length,'INCONSISTENT_PCM');
   yes(artifact.bytes.length>120000,'WAV_NOT_A_REAL_RECORDING');
   const revised=executeCP17Media(spec,{tempo:100,pattern:Array(16).fill(true)});
   yes(revised.sha256!==artifact.sha256,'BEAT_SEQUENCE_NOT_EDITABLE');
  }else{
   yes(artifact.bytes.toString().includes('<svg')&&artifact.bytes.toString().includes('<animate'),
    'CARTOON_HAS_NO_ACTUAL_MOTION');
   const revision=executeCP17Media(spec,{frames:[{x:60,y:240,caption:'Reach'},
    {x:400,y:180,caption:'Response'},{x:650,y:125,caption:'Continuity'}]});
   yes(revision.bytes.toString().includes('650'),'CARTOON_POSE_NOT_EDITABLE');
   yes(revision.sha256!==artifact.sha256,'ANIMATED_EXPORT_NOT_CHANGEABLE');
  }
  types.set(medium,artifact.mime);sources.push({medium,choice,hash:artifact.sha256});
  const name='qa/m002-foundations/CP17_'+choice.toUpperCase()+'_'+medium.toUpperCase()+
    (medium==='book'?'.html':medium==='music'?'.wav':'.svg');
  fs.writeFileSync(name,artifact.bytes);
  eq(hash(fs.readFileSync(name)),artifact.sha256,'DURABLE_MEDIUM_DISK_LOST');
  const snapshot={...store};
  if(!store[medium]){
   hold(()=>returnCP17Edition(store,medium,artifact),/CP17_OWNER_APPROVAL_HOLD/);
   const applied=returnCP17Edition(store,medium,artifact,{approve:true});
   eq(applied.status,'SCOPED_CREATIVE_RETURN','NO_ACTUAL_CREATIVE_RETURN');
   eq(Object.fromEntries(Object.entries(store).filter(([k])=>k!==medium)),
     Object.fromEntries(Object.entries(snapshot).filter(([k])=>k!==medium)),
     'MEDIA_SOURCE_CROSSOVER');
  }else{
   hold(()=>returnCP17Edition(store,medium,artifact,{approve:true}),
    /CP17_EXISTING_EDITION_CONFLICT_HOLD/);
   eq(store[medium],snapshot[medium],'CONFLICT_MUTATED_EXISTING_MEDIUM');
   returnCP17Edition(store,medium,artifact,{approve:true,
    expectedSha256:snapshot[medium].sha256});
  }
  receipt.exported.push({medium,choice,sha256:artifact.sha256,bytes:artifact.length});
 }
 const held=executeCP17Media({medium:'book',choice,subject:'JM Vexa',stations:3,
  actions:actions.slice(0,-1)});
 eq(held.status,'WORLD_LAW_HELD','UNAUTHORIZED_BOOK_GENERATED');
 eq(held.artifact,null,'PRODUCED_UNEARNED_ARTIFACT');
 receipt.denied.push({choice,earned:2,required:3});
}
eq(types.size,3,'NOT_THREE_INDEPENDENT_MEDIA');
eq(store.book.revision,3,'BOOK_REVISIONS_UNTRACKED');
eq(store.music.revision,3,'MUSIC_REVISIONS_UNTRACKED');
eq(store.cartoon.revision,3,'CARTOON_REVISIONS_UNTRACKED');
eq(new Set(sources.map(x=>x.hash)).size,9,'CHOICES_DID_NOT_AFFECT_MEDIA');
hold(()=>executeCP17Media({medium:'podcast',choice:'protect',subject:'JM Vexa',
 stations:3,actions}),/CP17_UNDECLARED_MEDIUM_HOLD/);
hold(()=>executeCP17Media({medium:'book',choice:'protect',subject:'JM Vexa',
 stations:3,actions},{title:'x'.repeat(200)}),/CP17_BOOK_TITLE_HOLD/);
hold(()=>executeCP17Media({medium:'music',choice:'protect',subject:'JM Vexa',
 stations:3,actions},{tempo:400}),/CP17_TEMPO_HOLD/);
hold(()=>executeCP17Media({medium:'cartoon',choice:'protect',subject:'JM Vexa',
 stations:3,actions},{frames:[{x:999,y:99,caption:'impossible'},{x:50,y:80,caption:'B'}]}),
 /CP17_CARTOON_FRAMES_HOLD/);
receipt.status='PASS_THREE_INDEPENDENT_NATIVE_MEDIA';receipt.checks=checks;
fs.writeFileSync('qa/m002-foundations/CP17_NATIVE_MEDIA_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({schema:receipt.schema,status:receipt.status,checks,
 kinds:[...types],outputs:receipt.exported.length,denials:receipt.denied.length,
 independentRevisionCounts:[store.book.revision,store.music.revision,store.cartoon.revision]}));
