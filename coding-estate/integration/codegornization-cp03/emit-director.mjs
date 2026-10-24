import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {direct,envelope,storyboard,cueWav,BODY_SHA256,PROGRAM_SEAL} from './director.mjs';
import {Journal} from '../codegornization-cp02/transactions.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(await readFile(new URL('../codegornization-cp02/donors/embodied-native.mjs',import.meta.url)))!==BODY_SHA256)throw Error('ORIGINAL_BODY_DRIFT');
const dir=new URL('./godot/packets/',import.meta.url);await mkdir(dir,{recursive:true});await mkdir(new URL('./evidence/',import.meta.url),{recursive:true});
const sourceSeal=sha(await readFile(new URL('../codegornization-cp02/source-seal.json',import.meta.url)));
for(const [revision,name,glyphs] of [[0,'pair_root',['*','~']],[1,'pair_sky',['~','!']]]){
 const j=new Journal({sourceSeal});const q={id:name,sourceSeal,expectedRevision:0,context:{energy:100,world:0},inputs:glyphs.map((glyph,i)=>({id:name+'_'+i,glyph,pressure:5+i,hold:1}))};j.commit(j.prepare(q),q.context);
 const payload=JSON.stringify({schema:'jm.targetbridge.conduct/2',sourceSeal,expectedRecipientRevision:revision,transaction:j.snapshot().entries[0],journal:j.snapshot()});await writeFile(new URL(name+'.json',dir),JSON.stringify({schema:'jm.targetbridge.transport/2',payload,payloadSHA256:sha(payload)},null,2));
}
const cue=direct({id:'guard_braid',recipientRevision:2,actors:['SKYRAY','ROOTWARDEN'],shape:'braid',hold:.6,mood:'guard',intensity:2});
await writeFile(new URL('guard_braid.json',dir),JSON.stringify(envelope(cue),null,2));
await writeFile(new URL('./godot/DirectorSeal.gd',import.meta.url),'extends RefCounted\nconst BODY="'+BODY_SHA256+'"\nconst PROGRAM="'+PROGRAM_SEAL+'"\n');
await writeFile(new URL('./evidence/GUARD_BRAID_STORYBOARD.svg',import.meta.url),storyboard(cue));await writeFile(new URL('./evidence/GUARD_BRAID_CUES.wav',import.meta.url),cueWav(cue));await writeFile(new URL('./evidence/GUARD_BRAID_CUES.json',import.meta.url),JSON.stringify(cue,null,2));
console.log('Original MudraCode and MoodDrills executed; six-body pair packets plus replayed motion/audio/storyboard cues emitted');
