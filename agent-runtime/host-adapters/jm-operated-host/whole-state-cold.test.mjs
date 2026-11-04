import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {WHOLE_STATE_CARRIERS,createWholeColdBackup,verifyWholeColdBackup,restoreWholeColdBackup} from './whole-state-cold.mjs';
const fixture=fn=>async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp06-')),stateDir=path.join(root,'active'),backupFile=path.join(root,'vault','bundle.enc'),restoreDir=path.join(root,'cold','state');
 fs.mkdirSync(stateDir);
 const key=crypto.randomBytes(32),privateKey=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({type:'pkcs8',format:'pem'});
 const data={
  'state.json':{schema:'jm.cloud-contact.server/0.5',spaces:{alpha:{events:[1]}}},
  'state.json.bak':{schema:'jm.cloud-contact.server/0.5',spaces:{alpha:{events:[]}}},
  'game-state.json':{schema:'JM.GameLiveProfile/0.3',players:{jay:{inventory:[{item:'one'}]}},matches:{},clans:{}},
  'mesh-state.json':{schema:'JM.ServiceMesh/0.2',authusers:{a:{workspaces:['x']}},workspaces:{},pipelines:{}},
  'market-state.json':{schema:'JM.MarketEcosystemLab.State/0.28',snapshots:[{symbol:'BTC/GBP',test:true}],proofOutcomes:[],persistence:{mode:'runtime-file-fallback',durable:false}},
  'zezu-state.json':{schema:'zezu.nwona.server-history-store/0.2',records:{admitted:{status:'accepted'}}}
 };
 for(const [n,v] of Object.entries(data))fs.writeFileSync(path.join(stateDir,n),JSON.stringify(v));fs.writeFileSync(path.join(stateDir,'receipt-signing-key.pem'),privateKey);
 const args={stateDir,backupFile,masterKey:key,quiesced:true,externalDatabaseConfigured:false};
 try{await fn({root,stateDir,backupFile,restoreDir,key,args})}finally{fs.rmSync(root,{recursive:true,force:true})}
};
test('all five sovereign file states + signing identity + optional fallback encrypted and restored exactly',fixture(async o=>{
 const expected=Object.fromEntries(fs.readdirSync(o.stateDir).map(n=>[n,fs.readFileSync(path.join(o.stateDir,n))]));
 const receipt=createWholeColdBackup(o.args);
 assert.deepEqual(receipt.files,Object.keys(WHOLE_STATE_CARRIERS).filter(n=>n!=='JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json').sort());
 const verified=verifyWholeColdBackup({backupFile:o.backupFile,masterKey:o.key});assert.deepEqual(verified.files,receipt.files);
 const raw=fs.readFileSync(o.backupFile,'utf8');assert.ok(!raw.includes('admitted')&&!raw.includes('PRIVATE KEY')&&!raw.includes('BTC/GBP'));
 restoreWholeColdBackup({backupFile:o.backupFile,restoreDir:o.restoreDir,masterKey:o.key});
 for(const [n,b] of Object.entries(expected))assert.deepEqual(fs.readFileSync(path.join(o.restoreDir,n)),b);
 assert.throws(()=>restoreWholeColdBackup({backupFile:o.backupFile,restoreDir:o.restoreDir,masterKey:o.key}),/CP06_RESTORE_DEST_EXISTS/);
}));
test('reject unquiesced, external database, missing organ, unknown file, malformed state',fixture(async o=>{
 assert.throws(()=>createWholeColdBackup({...o.args,quiesced:false}),/CP06_STOPPED_SERVICE_REQUIRED/);
 assert.throws(()=>createWholeColdBackup({...o.args,externalDatabaseConfigured:true}),/CP06_EXTERNAL_DATABASE_HOLD/);
 fs.unlinkSync(path.join(o.stateDir,'mesh-state.json'));
 assert.throws(()=>createWholeColdBackup(o.args),/CP06_MISSING_ORGAN_MESH/);
 fs.writeFileSync(path.join(o.stateDir,'mesh-state.json'),JSON.stringify({schema:'x',authusers:{}}));
 fs.writeFileSync(path.join(o.stateDir,'unregistered.json'),'{}');
 assert.throws(()=>createWholeColdBackup(o.args),/CP06_UNINVENTORIED_CARRIER/);
 fs.unlinkSync(path.join(o.stateDir,'unregistered.json'));
 fs.writeFileSync(path.join(o.stateDir,'game-state.json'),'bad json');
 assert.throws(()=>createWholeColdBackup(o.args),/CP06_INVALID_JSON_game/);
}));
test('PostgreSQL-backed market state never receives file-only whole-server claim',fixture(async o=>{
 const market=path.join(o.stateDir,'market-state.json');const x=JSON.parse(fs.readFileSync(market));x.persistence={mode:'postgres',durable:true};fs.writeFileSync(market,JSON.stringify(x));
 assert.throws(()=>createWholeColdBackup(o.args),/CP06_EXTERNAL_DATABASE_HOLD/);assert.equal(fs.existsSync(o.backupFile),false);
}));
test('wrong key, ciphertext tamper and header rewrite refuse restore without partial target',fixture(async o=>{
 createWholeColdBackup(o.args);
 assert.throws(()=>restoreWholeColdBackup({backupFile:o.backupFile,restoreDir:o.restoreDir,masterKey:crypto.randomBytes(32)}),/CP06_AUTHENTICATION_FAILED/);
 assert.equal(fs.existsSync(o.restoreDir),false);
 const raw=JSON.parse(fs.readFileSync(o.backupFile));raw.createdAt='2025-01-01T00:00:00.000Z';fs.writeFileSync(o.backupFile,JSON.stringify(raw));
 assert.throws(()=>restoreWholeColdBackup({backupFile:o.backupFile,restoreDir:o.restoreDir,masterKey:o.key}),/CP06_AUTHENTICATION_FAILED/);
 assert.equal(fs.existsSync(o.restoreDir),false);
}));
test('symlinks, overlapping archive and pre-existing archive refuse mutation',fixture(async o=>{
 const market=path.join(o.stateDir,'market-state.json'),moved=path.join(o.root,'original.json');fs.renameSync(market,moved);fs.symlinkSync(moved,market);
 assert.throws(()=>createWholeColdBackup(o.args),/CP06_SYMLINK_REFUSED/);
 fs.unlinkSync(market);fs.renameSync(moved,market);
 assert.throws(()=>createWholeColdBackup({...o.args,backupFile:path.join(o.stateDir,'inside.enc')}),/CP06_SOURCE_DEST_OVERLAP/);
 createWholeColdBackup(o.args);
 assert.throws(()=>createWholeColdBackup(o.args),/CP06_ARCHIVE_ALREADY_EXISTS/);
}));
