import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildCP22OwnerPackets,writeCP22OwnerPackets,CP22_SCHEMA} from '../coding-estate/integration/m002-cp22-owner-original-studio-return.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const yes=a=>{assert.ok(a);checks++};
const deny=(fn,re)=>{assert.throws(fn,re);checks++};
const file=process.argv[2];yes(file);
const transport=JSON.parse(readFileSync(file,'utf8'));
const before=JSON.stringify(transport),digest=sha(transport.payload);
const result=buildCP22OwnerPackets(transport,{expectedSHA256:digest});
eq(result.packets.length,3);
eq(result.packets.map(x=>x.medium),['book','music','cartoon']);
eq(result.result,'ACTUAL_CP17_MEDIA_BUNDLES_FOR_REVIEW_NOT_APPLIED');
for(const p of result.packets){
 eq(p.schema,CP22_SCHEMA);
 eq(p.originalCP10,'06c008bf0fb7eb8c1c0f1492db6e63808a95cafd');
 eq(p.koSHA256,digest);eq(p.koTransport.payload,transport.payload);
 eq(p.sourceHashes.codifier,JSON.parse(transport.payload).source.codifier);
 eq(p.sourceHashes.logic,JSON.parse(transport.payload).source.logic);
 const bytes=Buffer.from(p.mediaBase64,'base64');
 eq(bytes.length,p.mediaLength);eq(sha(bytes),p.mediaSHA256);
 eq(p.editable.choice,'protect');eq(p.editable.subject,'JM Guardian');
 yes(p.mediaLength>100);yes(JSON.stringify(p).length>p.mediaLength);
 if(p.medium==='book')yes(bytes.toString().startsWith('<!doctype html>'));
 if(p.medium==='music')eq(bytes.toString('ascii',0,4),'RIFF');
 if(p.medium==='cartoon')yes(bytes.toString().includes('<animate '));
}
const dir=join(mkdtempSync(join(tmpdir(),'jmcp22-')),'native');
const receipt=writeCP22OwnerPackets(transport,{expectedSHA256:digest,outdir:dir});
eq(receipt.files.length,3);
for(const f of receipt.files){
 const bytes=readFileSync(join(dir,f.name));
 eq(sha(bytes),f.packetSha256);eq(JSON.parse(bytes).mediaSHA256,f.mediaSha256);
}
yes(readdirSync(dir).length===4);
yes(readFileSync(join(dir,'OPEN_FIRST_RECEIPT.json')).length>200);
deny(()=>writeCP22OwnerPackets(transport,{expectedSHA256:digest,outdir:dir}),/EEXIST/);
deny(()=>writeCP22OwnerPackets(transport,{expectedSHA256:digest,outdir:'../escape'}),/CP22_PATH_HOLD/);
deny(()=>buildCP22OwnerPackets(transport,{expectedSHA256:digest,subject:'Unknown'}),/CP22_SUBJECT_SCOPE_HOLD/);
deny(()=>buildCP22OwnerPackets(transport,{expectedSHA256:'0'.repeat(64)}),/CP21_BYTES_HOLD/);
const altered=structuredClone(transport);altered.payload=altered.payload.replace('ALLY_SHIELD','ALLY_DAMAGE');
deny(()=>buildCP22OwnerPackets(altered,{expectedSHA256:digest}),/CP21_BYTES_HOLD/);
eq(JSON.stringify(transport),before);
if(process.env.CP22_EXPORT_DIR)
 writeCP22OwnerPackets(transport,{expectedSHA256:digest,outdir:process.env.CP22_EXPORT_DIR});
console.log(JSON.stringify({status:'PASS',checks,actualNativeMedia:3,
 originalOwnerStudio:'PRIVATELY_PRESERVED',browserDevice:'HOLD',main:'UNCHANGED'}));
