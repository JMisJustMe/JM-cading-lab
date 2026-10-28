import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRecipientKeys,sealWholeForRecipient,inspectRecipientEnvelope,restoreWholeForRecipient} from './recipient-custody.mjs';

const files={
 'state.json':{schema:'jm.cloud-contact.server/0.5',spaces:{space_01:{events:[],members:{}}}},
 'game-state.json':{schema:'JM.GameLiveProfile/0.3',players:{a:{handle:'sparrow'}},handles:{sparrow:'a'}},
 'mesh-state.json':{schema:'JM.ServiceMesh/0.2',authusers:{a:{handle:'kestrel'}},workspaces:{}},
 'market-state.json':{schema:'JM.MarketEcosystemLab.State/0.28',snapshots:[{symbol:'BTC/GBP',price:1}],persistence:{mode:'runtime-file-fallback',durable:false}},
 'zezu-state.json':{schema:'zezu.nwona.server-history-store/0.2',records:{one:{receiptHash:'one'}}},
};
async function fixture(run){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp08-test-'));
 try{
  const state=path.join(root,'machine-A','state'),vault=path.join(root,'remote-store','opaque-envelope.json');
  const privateFile=path.join(root,'machine-B','keys','owner-secret.pem'),publicFile=path.join(root,'machine-A','keys','owner-public.pem'),restored=path.join(root,'machine-B','restored-state');
  fs.mkdirSync(state,{recursive:true});
  for(const [name,body] of Object.entries(files))fs.writeFileSync(path.join(state,name),JSON.stringify(body));
  const ec=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  fs.writeFileSync(path.join(state,'receipt-signing-key.pem'),ec.privateKey.export({type:'pkcs8',format:'pem'}));
  const publicInfo=createRecipientKeys({privateFile,publicFile});
  await run({root,state,vault,privateFile,publicFile,restored,publicInfo});
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
const seal=x=>sealWholeForRecipient({stateDir:x.state,publicFile:x.publicFile,sealedFile:x.vault,expectedRecipientId:x.publicInfo.recipientId,quiesced:true,externalDatabaseConfigured:false});

test('recipient public key alone seals all original sovereign state organs; private key alone restores exact bytes',()=>fixture(async x=>{
 const receipt=seal(x);assert.equal(receipt.fileCount,6);assert.equal(receipt.publicKeyOnly,true);
 assert.equal(receipt.privateKeyOnProducer,false);assert.equal(receipt.recipientId,x.publicInfo.recipientId);
 const inspect=inspectRecipientEnvelope({sealedFile:x.vault});assert.equal(inspect.innerSha256,receipt.innerSha256);
 const raw=fs.readFileSync(x.vault,'utf8');
 assert.ok(!raw.includes('sparrow')&&!raw.includes('kestrel')&&!raw.includes('BEGIN PRIVATE KEY'));
 const restored=restoreWholeForRecipient({sealedFile:x.vault,privateFile:x.privateFile,restoreDir:x.restored});
 assert.deepEqual(restored.files.sort(),Object.keys(files).concat('receipt-signing-key.pem').sort());
 for(const name of restored.files)assert.deepEqual(fs.readFileSync(path.join(x.state,name)),fs.readFileSync(path.join(x.restored,name)));
 assert.equal(crypto.createPublicKey(crypto.createPrivateKey(fs.readFileSync(path.join(x.restored,'receipt-signing-key.pem')))).asymmetricKeyType,'ec');
 if(process.platform!=='win32')assert.equal(fs.statSync(x.privateFile).mode&0o777,0o600);
}));

test('wrong independent recipient private key cannot unwrap; no partial restored state',()=>fixture(async x=>{
 seal(x);const privateOther=path.join(x.root,'machine-C','another.pem'),publicOther=path.join(x.root,'machine-C','another.pub.pem');
 createRecipientKeys({privateFile:privateOther,publicFile:publicOther});
 assert.throws(()=>restoreWholeForRecipient({sealedFile:x.vault,privateFile:privateOther,restoreDir:x.restored}),/CP08_RECIPIENT_MISMATCH/);
 assert.equal(fs.existsSync(x.restored),false);
 fs.chmodSync(x.publicFile,0o600);
 assert.throws(()=>restoreWholeForRecipient({sealedFile:x.vault,privateFile:x.publicFile,restoreDir:x.restored}),/CP08_INVALID_RECIPIENT_PRIVATE_KEY/);
 assert.equal(fs.existsSync(x.restored),false);
}));

test('modified wrapped key, ciphertext, recipient fingerprint and metadata fail closed',()=>fixture(async x=>{
 seal(x);const original=JSON.parse(fs.readFileSync(x.vault,'utf8'));
 for(const [field,value,error] of [
  ['wrappedKey',Buffer.alloc(32,3).toString('base64'),/CP08_RECIPIENT_AUTHENTICATION_FAILED/],
  ['innerBase64',Buffer.from('forged').toString('base64'),/CP08_INNER_HASH_HOLD/],
  ['recipientId','a'.repeat(64),/CP08_RECIPIENT_MISMATCH/],
  ['createdAt','2020-01-01T00:00:00.000Z',/CP08_RECIPIENT_AUTHENTICATION_FAILED/],
 ]){
  const forged={...original,[field]:value};const bad=path.join(x.root,'remote-store','forged-'+field+'.json');
  fs.writeFileSync(bad,JSON.stringify(forged));
  assert.throws(()=>restoreWholeForRecipient({sealedFile:bad,privateFile:x.privateFile,restoreDir:x.restored}),error,field);
  assert.equal(fs.existsSync(x.restored),false);
 }
}));

test('stopped writer & external database gates, missing organ, symlinks and occupied destinations refused',()=>fixture(async x=>{
 assert.throws(()=>sealWholeForRecipient({stateDir:x.state,publicFile:x.publicFile,sealedFile:x.vault}),/CP08_STOPPED_SERVICE_REQUIRED/);
 assert.throws(()=>sealWholeForRecipient({stateDir:x.state,publicFile:x.publicFile,sealedFile:x.vault,expectedRecipientId:x.publicInfo.recipientId,quiesced:true,externalDatabaseConfigured:true}),/CP08_EXTERNAL_DATABASE_HOLD/);
 const missing=path.join(x.state,'mesh-state.json');fs.renameSync(missing,missing+'.bak');
 assert.throws(()=>seal(x),/CP06_UNINVENTORIED_CARRIER/);
 fs.renameSync(missing+'.bak',missing);
 const real=path.join(x.root,'real-state.json');fs.renameSync(path.join(x.state,'state.json'),real);fs.symlinkSync(real,path.join(x.state,'state.json'));
 assert.throws(()=>seal(x),/CP06_SYMLINK_REFUSED/);
 fs.unlinkSync(path.join(x.state,'state.json'));fs.renameSync(real,path.join(x.state,'state.json'));
 seal(x);assert.throws(()=>seal(x),/CP08_DESTINATION_EXISTS/);
 assert.throws(()=>restoreWholeForRecipient({sealedFile:x.vault,privateFile:x.privateFile,restoreDir:x.state}),/CP08_DESTINATION_EXISTS/);
}));

test('insecure key permissions and unsupported key types refused; existing key files not overwritten',()=>fixture(async x=>{
 assert.throws(()=>createRecipientKeys({privateFile:x.privateFile,publicFile:x.publicFile}),/CP08_KEY_DESTINATION_EXISTS/);
 const forgedPublic=path.join(x.root,'not-x25519.pem');const ec=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 fs.writeFileSync(forgedPublic,ec.publicKey.export({type:'spki',format:'pem'}));
 assert.throws(()=>sealWholeForRecipient({stateDir:x.state,publicFile:forgedPublic,sealedFile:x.vault,expectedRecipientId:x.publicInfo.recipientId,quiesced:true,externalDatabaseConfigured:false}),/CP08_X25519_RECIPIENT_REQUIRED/);
 seal(x);if(process.platform!=='win32'){
  fs.chmodSync(x.privateFile,0o644);
  assert.throws(()=>restoreWholeForRecipient({sealedFile:x.vault,privateFile:x.privateFile,restoreDir:x.restored}),/CP08_UNSAFE_PRIVATE_KEY_PERMISSIONS/);
  assert.equal(fs.existsSync(x.restored),false);
 }
}));

test('trusted recipient fingerprint is mandatory: substituted public key cannot become backup recipient',()=>fixture(async x=>{
 assert.throws(()=>sealWholeForRecipient({stateDir:x.state,publicFile:x.publicFile,sealedFile:x.vault,quiesced:true,externalDatabaseConfigured:false}),/CP08_TRUSTED_RECIPIENT_PIN_REQUIRED/);
 assert.throws(()=>sealWholeForRecipient({stateDir:x.state,publicFile:x.publicFile,sealedFile:x.vault,expectedRecipientId:'a'.repeat(64),quiesced:true,externalDatabaseConfigured:false}),/CP08_TRUSTED_RECIPIENT_PIN_REQUIRED/);
 assert.equal(fs.existsSync(x.vault),false);
}));
