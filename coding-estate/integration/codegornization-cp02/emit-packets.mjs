import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Journal} from './transactions.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const seal=sha(await readFile(new URL('./source-seal.json',import.meta.url)));
const requests=[['skyray',['~','!']],['rootwarden',['*','~']],['prismwisp',['!','*']]];
await mkdir(new URL('./godot/packets/',import.meta.url),{recursive:true});
for(const [name,glyphs] of requests){
 const j=new Journal({sourceSeal:seal});const q={id:name,sourceSeal:seal,expectedRevision:0,context:{energy:100,world:0},inputs:glyphs.map((glyph,i)=>({id:name+'_'+i,glyph,pressure:5+i,hold:1}))};
 j.commit(j.prepare(q),q.context);Journal.recover(j.snapshot(),seal);
 const payload=JSON.stringify({schema:'jm.targetbridge.conduct/2',sourceSeal:seal,expectedRecipientRevision:0,transaction:j.snapshot().entries[0],journal:j.snapshot()});
 await writeFile(new URL('./godot/packets/'+name+'.json',import.meta.url),JSON.stringify({schema:'jm.targetbridge.transport/2',payload,payloadSHA256:sha(payload)},null,2));
}
await writeFile(new URL('./godot/SourceSeal.gd',import.meta.url),'extends RefCounted\nconst SHA256 = "'+seal+'"\n');
console.log('original six-body journals replayed; three typed Godot packets emitted',seal);
