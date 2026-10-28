import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyTransport} from './cross-runner-recovery-v051.mjs';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=['state.json','receipt-signing-key.pem','game-state.json','mesh-state.json','market-state.json','zezu-state.json'];
const fixture=fn=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp07-unit-'));
 try{const dir=path.join(root,'carrier'),bytes=Buffer.from('synthetic ciphertext fixture');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'state.aesgcm'),bytes);
 const ref={schema:'JM.CloudContact.CP07.SeparateRunnerHandoff/1',scope:'SYNTHETIC_CI_SEPARATE_RUNNERS',
 donorCommit:'0921217d95285bcb21cda7a995d02f7ec0725810',keyCustody:'PUBLIC_CI_FIXTURE_NOT_OWNER_SECRET',
 archiveSha256:digest(bytes),stateDigests:Object.fromEntries(files.map(n=>[n,'c'.repeat(64)])),
 expected:{cloudHash:'a'.repeat(64),cloudKeyId:'b'.repeat(24),playerId:'fixture-player',authId:'fixture-auth',workspaceId:'fixture-workspace',zezuCarrierSha:'c'.repeat(64)},
 origin:{job:'source'},boundaries:['SYNTHETIC_DATA_ONLY']};
 const filename=path.join(dir,'public-reference.json');const write=()=>fs.writeFileSync(filename,JSON.stringify(ref)+'\n');write();
 return fn({root,dir,ref,filename,write});
 }finally{fs.rmSync(root,{recursive:true,force:true})}};
test('public fixture envelope verifies byte exact and never advertises durable security',()=>fixture(o=>{
 const ok=verifyTransport(o.dir);assert.equal(ok.archiveSha256,o.ref.archiveSha256);assert.equal(ok.keyCustody,'PUBLIC_CI_FIXTURE_NOT_OWNER_SECRET');
 assert.equal(Object.keys(ok.stateDigests).length,6);
}));
test('transport corruption and mismatched hash fail before any restore',()=>fixture(o=>{
 fs.appendFileSync(path.join(o.dir,'state.aesgcm'),'tampered');assert.throws(()=>verifyTransport(o.dir),/CP07_TRANSFER_DIGEST_HOLD/);
}));
test('missing or unexpected carrier is refused rather than silently skipped',()=>fixture(o=>{
 fs.writeFileSync(path.join(o.dir,'private.pem'),'bad');assert.throws(()=>verifyTransport(o.dir),/CP07_TRANSFER_FILE_SET_MISMATCH/);
 fs.rmSync(path.join(o.dir,'private.pem'));fs.rmSync(path.join(o.dir,'state.aesgcm'));
 assert.throws(()=>verifyTransport(o.dir),/CP07_TRANSFER_FILE_SET_MISMATCH/);
}));
test('incorrect custody or missing sovereign organ cannot earn transfer claim',()=>fixture(o=>{
 o.ref.keyCustody='OWNER_KEY_SECURE';o.write();assert.throws(()=>verifyTransport(o.dir),/CP07_INVALID_CUSTODY_LABEL/);
 o.ref.keyCustody='PUBLIC_CI_FIXTURE_NOT_OWNER_SECRET';delete o.ref.stateDigests['mesh-state.json'];o.write();
 assert.throws(()=>verifyTransport(o.dir),/CP07_MISSING_REFERENCE_FILE/);
}));
test('plaintext token fields and malformed digests are rejected from public reference',()=>fixture(o=>{
 o.ref.adminToken='forbidden';o.write();assert.throws(()=>verifyTransport(o.dir),/CP07_REFERENCE_HAS_CREDENTIAL_FIELD/);
 delete o.ref.adminToken;o.ref.stateDigests['game-state.json']='not-sha256';o.write();
 assert.throws(()=>verifyTransport(o.dir),/CP07_INVALID_REFERENCE_DIGEST/);
}));
test('symlink carrier entries and symlink root are refused',()=>fixture(o=>{
 const f=path.join(o.dir,'state.aesgcm');fs.renameSync(f,path.join(o.root,'original'));
 fs.symlinkSync(path.join(o.root,'original'),f);assert.throws(()=>verifyTransport(o.dir),/CP07_TRANSFER_SYMLINK/);
 fs.unlinkSync(f);fs.copyFileSync(path.join(o.root,'original'),f);
 fs.symlinkSync(o.dir,path.join(o.root,'alias'));assert.throws(()=>verifyTransport(path.join(o.root,'alias')),/CP07_SYMLINK_FOLDER/);
}));
