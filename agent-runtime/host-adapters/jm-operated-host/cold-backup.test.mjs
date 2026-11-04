import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createColdBackup,verifyColdBackup,restoreColdBackup} from './cold-backup.mjs';
const fixture=async(fn)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp04-'));try{
 const source=path.join(root,'live-state'),archive=path.join(root,'offline','sealed.json'),target=path.join(root,'recovered-state');fs.mkdirSync(source);
 const signing=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({type:'pkcs8',format:'pem'});
 const state=Buffer.from(JSON.stringify({schema:'jm.cloud-contact.server/0.5',spaces:{space_001:{value:7}},nextId:10}));
 fs.writeFileSync(path.join(source,'state.json'),state,{mode:0o600});fs.writeFileSync(path.join(source,'receipt-signing-key.pem'),signing,{mode:0o600});
 const masterKey=crypto.randomBytes(32);await fn({root,source,archive,target,state,signing,masterKey});
}finally{fs.rmSync(root,{recursive:true,force:true})}};
test('cold bundle: authentic encrypted backup, readback and separate-dir restore exact bytes',()=>fixture(async o=>{
 const receipt=createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey});
 assert.equal(receipt.spaces,1);assert.equal(receipt.ok,true);assert.equal(verifyColdBackup({backupFile:o.archive,masterKey:o.masterKey}).signerFingerprint,receipt.signerFingerprint);
 const raw=fs.readFileSync(o.archive,'utf8');assert.ok(!raw.includes('space_001'));assert.ok(!raw.includes('BEGIN PRIVATE KEY'));
 const restored=restoreColdBackup({backupFile:o.archive,restoreDir:o.target,masterKey:o.masterKey});
 assert.equal(restored.stateSha256,receipt.stateSha256);assert.deepEqual(fs.readFileSync(path.join(o.target,'state.json')),o.state);
 assert.deepEqual(fs.readFileSync(path.join(o.target,'receipt-signing-key.pem')),Buffer.from(o.signing));
 if(process.platform!=='win32')assert.equal(fs.statSync(path.join(o.target,'receipt-signing-key.pem')).mode&0o777,0o600);
 assert.throws(()=>restoreColdBackup({backupFile:o.archive,restoreDir:o.target,masterKey:o.masterKey}),/RESTORE_DESTINATION_EXISTS/);
 assert.throws(()=>createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey}),/COLD_BACKUP_ALREADY_EXISTS/);
}));
test('cold bundle: wrong key, tampered ciphertext and authenticated header rejected',()=>fixture(async o=>{
 createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey});
 assert.throws(()=>verifyColdBackup({backupFile:o.archive,masterKey:crypto.randomBytes(32)}),/BACKUP_AUTHENTICATION_FAILED/);
 let j=JSON.parse(fs.readFileSync(o.archive));j.createdAt='2020-01-01T00:00:00.000Z';fs.writeFileSync(o.archive,JSON.stringify(j));
 assert.throws(()=>restoreColdBackup({backupFile:o.archive,restoreDir:o.target,masterKey:o.masterKey}),/BACKUP_AUTHENTICATION_FAILED/);
 assert.equal(fs.existsSync(o.target),false);
}));
test('cold bundle: invalid signing key or malformed state refuses sealing',()=>fixture(async o=>{
 fs.writeFileSync(path.join(o.source,'receipt-signing-key.pem'),'not a key');
 assert.throws(()=>createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey}),/INVALID_RECEIPT_SIGNING_KEY/);
 assert.equal(fs.existsSync(o.archive),false);
 fs.writeFileSync(path.join(o.source,'receipt-signing-key.pem'),o.signing);fs.writeFileSync(path.join(o.source,'state.json'),'{}');
 assert.throws(()=>createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey}),/INVALID_CLOUD_STATE_SCHEMA/);
}));
test('cold bundle: symlink state and backup parent refused',()=>fixture(async o=>{
 const real=path.join(o.root,'stolen.json');fs.renameSync(path.join(o.source,'state.json'),real);fs.symlinkSync(real,path.join(o.source,'state.json'));
 assert.throws(()=>createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey}),/UNSAFE_SYMLINK_PATH/);
 fs.unlinkSync(path.join(o.source,'state.json'));fs.renameSync(real,path.join(o.source,'state.json'));
 const parent=path.join(o.root,'real');fs.mkdirSync(parent);fs.symlinkSync(parent,path.dirname(o.archive));
 assert.throws(()=>createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey}),/UNSAFE_SYMLINK_PATH/);
}));
test('cold bundle: missing owner key, invalid key length and unsafe restore are refused',()=>fixture(async o=>{
 assert.throws(()=>createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:Buffer.alloc(4)}),/OWNER_256_BIT_BACKUP_KEY_REQUIRED/);
 createColdBackup({stateDir:o.source,backupFile:o.archive,masterKey:o.masterKey});
 assert.throws(()=>restoreColdBackup({backupFile:o.archive,restoreDir:path.dirname(o.archive),masterKey:o.masterKey}),/SOURCE_RESTORE_OVERLAP/);
}));
