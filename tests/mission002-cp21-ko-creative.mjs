import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {conductKOToCreative,inspectKO,CP21_SCOPE} from '../coding-estate/integration/m002-cp21-ko-creative-return.mjs';
import {returnCP17Edition} from '../coding-estate/integration/m002-cp17-multi-media-producer.mjs';
const file=process.argv[2];assert.ok(file,'exact CP10 packet path required');
const packet=JSON.parse(readFileSync(file,'utf8'));
const original=JSON.stringify(packet);
const sha=x=>createHash('sha256').update(x).digest('hex');
const expectedSHA256=sha(packet.payload);
let count=0;
const eq=(a,b)=>{assert.deepEqual(a,b);count++};
const yes=a=>{assert.ok(a);count++};
const deny=(fn,re)=>{assert.throws(fn,re);count++};
const inspected=inspectKO(packet,expectedSHA256);
eq(inspected.packet.contact.effect,'ALLY_SHIELD');
eq(inspected.packet.binding.status,'synced');
eq(inspected.packet.execution.JMLogic,true);
yes(inspected.traceSHA256.length===64);
const preview=conductKOToCreative(packet,{expectedSHA256});
eq(preview.status,'PREVIEW_ONLY');
eq(preview.store,{});
eq(preview.media.map(p=>p.medium),['book','music','cartoon']);
eq(preview.choice,'protect');
yes(preview.media[0].bytes.toString().startsWith('<!doctype html>'));
eq(preview.media[1].bytes.toString('ascii',0,4),'RIFF');
yes(preview.media[1].bytes.length>44);
yes(preview.media[2].bytes.toString().includes('<animate '));
for(const item of preview.media){
 yes(item.bytes.length>100);
 eq(sha(item.bytes),item.sha256);
 eq(item.editable.choice,'protect');
}
const before={identity:'PRESERVED',unrelated:{v:19}};
const frozen=JSON.stringify(before);
const completed=conductKOToCreative(packet,{expectedSHA256,approve:true,existing:before});
eq(completed.status,'LOCAL_APPROVED_RETURN');
eq(JSON.stringify(before),frozen);
eq(completed.store.unrelated.v,19);
eq(completed.store.__koApplied,[expectedSHA256]);
for(const p of completed.media){
 eq(completed.store[p.medium].revision,1);
 eq(completed.store[p.medium].sha256,p.sha256);
}
deny(()=>conductKOToCreative(packet,{expectedSHA256,approve:true,existing:completed.store}),/CP21_DUPLICATE_HOLD/);
const shifted=structuredClone(completed.store);delete shifted.__koApplied;
deny(()=>conductKOToCreative(packet,{expectedSHA256,approve:true,existing:shifted}),/CP21_REVISION_HOLD/);
const tampered=structuredClone(packet);
tampered.payload=tampered.payload.replace('ALLY_SHIELD','ALLY_DAMAGE');
tampered.payloadSHA256=sha(tampered.payload);
deny(()=>inspectKO(tampered,expectedSHA256),/CP21_BYTES_HOLD/);
const denyLogic=structuredClone(packet);
const body=JSON.parse(denyLogic.payload);body.execution.allowed=false;
denyLogic.payload=JSON.stringify(body);denyLogic.payloadSHA256=sha(denyLogic.payload);
deny(()=>inspectKO(denyLogic,denyLogic.payloadSHA256),/CP21_DONOR_EXECUTION_HOLD/);
deny(()=>inspectKO(packet),/CP21_TRANSPORT_HOLD/);
const altered=structuredClone(preview.media[0]);altered.bytes=Buffer.from('wrong');
deny(()=>returnCP17Edition({},'book',altered,{approve:true}),/CP17_RESTORED_MEDIA_DIGEST_HOLD/);
eq(JSON.stringify(packet),original);
if(process.env.CP21_EXPORT==='1'){
 mkdirSync('cp21-output',{recursive:true});
 const names={book:'JM_KO_AEGIS_BOOK.html',music:'JM_KO_AEGIS_MUSIC.wav',cartoon:'JM_KO_AEGIS_CARTOON.svg'};
 for(const p of completed.media)writeFileSync('cp21-output/'+names[p.medium],p.bytes);
 writeFileSync('cp21-output/RECEIPT.json',JSON.stringify({
 schema:CP21_SCOPE.schema,checks:count,pinnedCP10:'06c008bf0fb7eb8c1c0f1492db6e63808a95cafd',
 koSHA256:expectedSHA256,media:completed.media.map(x=>({
 name:names[x.medium],sha256:x.sha256,bytes:x.bytes.length,revision:completed.store[x.medium].revision
 })),syntheticLocalApprovalOnly:true,hold:CP21_SCOPE.hold},null,2)+'\n');
}
console.log(JSON.stringify({state:'PASS',checks:count,actualMedia:3,
 ownerDevice:'NOT_TESTED',originalPrivateApps:'UNCHANGED',main:'UNCHANGED'}));
