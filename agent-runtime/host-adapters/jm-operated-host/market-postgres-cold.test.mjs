import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRecipientKeys} from './recipient-custody.mjs';
import {validateDbConnection,validateMarketSchema,createMarketPgBackup,inspectMarketPgEnvelope,restoreMarketPgBackup} from './market-postgres-cold.mjs';
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp09-test-'));
const use=(fn)=>{const root=dir();try{return fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}};
const originalRows=[
 ['jm_market_pulse_snapshots','id','bigint'],['jm_market_pulse_snapshots','fetched_at','timestamp with time zone'],['jm_market_pulse_snapshots','symbol','text'],['jm_market_pulse_snapshots','payload','jsonb'],
 ['jm_quick_flip_durability_witnesses','id','uuid'],['jm_quick_flip_durability_witnesses','created_at','timestamp with time zone'],['jm_quick_flip_durability_witnesses','previous_id','uuid'],['jm_quick_flip_durability_witnesses','payload','jsonb'],
 ['jm_quick_flip_proof_outcomes','id','bigint'],['jm_quick_flip_proof_outcomes','created_at','timestamp with time zone'],['jm_quick_flip_proof_outcomes','symbol','text'],['jm_quick_flip_proof_outcomes','receipt_hash','text'],['jm_quick_flip_proof_outcomes','payload','jsonb']
];
test('CP09 accepts exactly actual hosted market schema and rejects mixed or missing bodies',()=>{
 assert.equal(validateMarketSchema(originalRows),true);
 assert.throws(()=>validateMarketSchema(originalRows.slice(1)),/CP09_MARKET_SCHEMA_MISMATCH/);
 assert.throws(()=>validateMarketSchema([...originalRows,['market_other','id','bigint']]),/CP09_MARKET_SCHEMA_MISMATCH/);
 assert.throws(()=>validateMarketSchema(originalRows.map(x=>x[0]==='jm_quick_flip_proof_outcomes'&&x[1]==='payload'?[x[0],x[1],'text']:x)),/CP09_MARKET_SCHEMA_MISMATCH/);
});
test('CP09 database identity is explicit, never implicit protected database',()=>{
 for(const bad of ['', 'https://localhost/database','postgresql://postgres:pass@localhost/postgres','postgresql://x:pass@localhost/template1','postgresql://x:pass@localhost/a','postgresql://x:pass@localhost/db?sslmode=disable'])assert.throws(()=>validateDbConnection(bad),/CP09_/);
 const p=validateDbConnection('postgresql://owner:secret@127.0.0.1:5432/jm_cp09_source');assert.equal(p.name,'jm_cp09_source');assert.equal(p.env.PGSSLMODE,'disable');
 const remote=validateDbConnection('postgresql://owner:secret@db.example.com:5432/jm_market');assert.equal(remote.env.PGSSLMODE,'verify-full');
});
test('CP09 fails closed on live/unquiesced source and untrusted recipient public key',()=>use(root=>{
 const pub=path.join(root,'recipient.pub.pem'),priv=path.join(root,'recipient.priv.pem'),out=path.join(root,'backup.sealed');const key=createRecipientKeys({publicFile:pub,privateFile:priv});
 const src='postgresql://user:password@localhost/jm_cp09_source';
 assert.throws(()=>createMarketPgBackup({sourceUrl:src,recipientPublicFile:pub,expectedRecipientId:key.recipientId,sealedFile:out}),/CP09_STOPPED_WRITES_REQUIRED/);
 assert.throws(()=>createMarketPgBackup({sourceUrl:src,recipientPublicFile:pub,expectedRecipientId:'0'.repeat(64),sealedFile:out,quiesced:true}),/CP09_TRUSTED_RECIPIENT_PIN_REQUIRED/);
 assert.equal(fs.existsSync(out),false);
}));
test('CP09 refuses unpinned encrypted archive before contacting target database',()=>use(root=>{
 const file=path.join(root,'fake.json');fs.writeFileSync(file,'{}');
 assert.throws(()=>restoreMarketPgBackup({targetUrl:'postgresql://user:password@localhost/jm_cp09_restored',sealedFile:file,privateFile:'/does/not/exist',expectedSealedSha256:'0'.repeat(64)}),/CP09_OUT_OF_BAND_ARCHIVE_PIN_REQUIRED/);
 assert.throws(()=>restoreMarketPgBackup({targetUrl:'postgresql://user:password@localhost/jm_cp09_restored',sealedFile:file,privateFile:'/does/not/exist',expectedSealedSha256:'0'.repeat(64),expectEmpty:false}),/CP09_EMPTY_TARGET_REQUIRED/);
}));
test('CP09 rejects symlink envelopes and malformed unauthenticated headers',()=>use(root=>{
 const raw=path.join(root,'malformed'),alias=path.join(root,'alias');fs.writeFileSync(raw,'{}');fs.symlinkSync(raw,alias);
 assert.throws(()=>inspectMarketPgEnvelope({sealedFile:alias}),/CP09_SYMLINK_REFUSED/);
 assert.throws(()=>inspectMarketPgEnvelope({sealedFile:raw}),/CP09_BAD_ENVELOPE/);
}));
