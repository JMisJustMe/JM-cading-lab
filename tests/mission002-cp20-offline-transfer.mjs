import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {sealCP20,openCP20,CP20_SCHEMA} from '../coding-estate/integration/m002-cp20-portable-vault.mjs';
let checks=0;const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++};
const yes=(a,msg)=>{assert.ok(a,msg);checks++};
const deny=async(f,re)=>{await assert.rejects(f,re);checks++};
const types=['BOOK','MUSIC','CARTOON','GAME','COMIC'];
const src='qa/m002-foundations/CP19_PACKETS/';
const dir=mkdtempSync(join(tmpdir(),'jm-cp20-custody-'));
try{
 for(const kind of types){
  const raw=readFileSync(src+'CP19_'+kind+'_ORIGINAL_LOCAL_TEST_FIXTURE.json','utf8');
  const pass='local-original-passphrase-2048+'+kind;
  const first=await sealCP20(raw,pass),second=await sealCP20(raw,pass);
  eq(first.header.schema,CP20_SCHEMA,'SCHEMA');
  yes(!JSON.stringify(first).includes('JM Krix'),'NO_PLAINTEXT_LEAK');
  yes(first.salt!==second.salt&&first.iv!==second.iv,'FRESH_NONCE_SALT');
  eq((await openCP20(first,pass)).packetRaw,raw,'ROUNDTRIP');
  eq((await openCP20(second,pass)).kind,kind.toLowerCase(),'TYPED_RETURN');
  await deny(()=>openCP20(first,'unrelated-passphrase-everywhere'),/CP20_AUTHENTICATION_HOLD/);
  const tainted=structuredClone(first);tainted.iv='AAAAAAAAAAAAAAAA';
  await deny(()=>openCP20(tainted,pass),/CP20_AUTHENTICATION_HOLD/);
  const altered=structuredClone(first);altered.header.context='WRONG_ESTATE';
  await deny(()=>openCP20(altered,pass),/CP20_HEADER_HOLD/);
  const path=join(dir,kind+'.jmvault.json');writeFileSync(path,JSON.stringify(first));
  eq((await openCP20(JSON.parse(readFileSync(path,'utf8')),pass)).packetRaw,raw,'DISK_READBACK');
  const script=`import {readFileSync} from 'node:fs';
import {openCP20} from './coding-estate/integration/m002-cp20-portable-vault.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));
const recovered=await openCP20(input.ciphertext,input.password);
console.log(JSON.stringify({kind:recovered.kind,packetRaw:recovered.packetRaw}));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{
   input:JSON.stringify({ciphertext:first,password:pass}),encoding:'utf8',cwd:process.cwd(),timeout:20000,maxBuffer:300000});
  eq(child.status,0,'INDEPENDENT_PROCESS_RESTART');
  const replay=JSON.parse(child.stdout);
  eq(replay.packetRaw,raw,'INDEPENDENT_RUNTIME_EXACT_TRANSFER');
  eq(replay.kind,kind.toLowerCase(),'IDENTITY_RETAINED');
 }
 console.log(JSON.stringify({schema:'jm.m002.cp20.encrypted-cross-process-proof/1',
  state:'PASS',checks,types,cryptography:'AES-256-GCM_PBKDF2-SHA256_210000',
  senderAttestation:'SHARED_PASSPHRASE_ONLY',offlineTransfer:'EXACT_BYTES_RECOVERED',
  realPhone:'NOT_TESTED',productionCloud:'NOT_TESTED',ownerOriginalApps:'UNMODIFIED'}));
}finally{rmSync(dir,{recursive:true,force:true})}