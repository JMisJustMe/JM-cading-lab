// JM CP09: exact hosted Market PostgreSQL tables on disposable CI databases.
// Never points at production; proof requires explicit TEST DBs and a local Postgres service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRecipientKeys} from './recipient-custody.mjs';
import {createMarketPgBackup,restoreMarketPgBackup,inspectMarketPgEnvelope} from './market-postgres-cold.mjs';
const DB='postgresql://postgres:cp09_test_only@127.0.0.1:5432/';
const src=DB+'jm_cp09_source',dst=DB+'jm_cp09_restored',dirty=DB+'jm_cp09_dirty';
const envFor=name=>({PATH:process.env.PATH||'/usr/bin:/bin',PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres',PGPASSWORD:'cp09_test_only',PGDATABASE:name,PGSSLMODE:'disable'});
function sql(db,stmt){const r=spawnSync('psql',['-X','--set=ON_ERROR_STOP=1','--no-align','--tuples-only','--command',stmt],{env:envFor(db),encoding:'utf8',timeout:10000,maxBuffer:1e6,shell:false});if(r.error||r.status!==0)throw Error('CI_POSTGRES_TEST_SETUP_FAILED');return r.stdout.trim()}
function setup(){
 for(const db of ['jm_cp09_source','jm_cp09_restored','jm_cp09_dirty']){
  const exists=sql('postgres',`SELECT 1 FROM pg_database WHERE datname='${db}'`);assert.equal(exists,'','TEST_DATABASE_ALREADY_EXISTS');
  sql('postgres',`CREATE DATABASE ${db}`);
 }
 sql('jm_cp09_source',`CREATE TABLE public.jm_market_pulse_snapshots (id BIGSERIAL PRIMARY KEY, fetched_at TIMESTAMPTZ NOT NULL, symbol TEXT NOT NULL, payload JSONB NOT NULL);
 CREATE TABLE public.jm_quick_flip_proof_outcomes (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, symbol TEXT, receipt_hash TEXT NOT NULL UNIQUE, payload JSONB NOT NULL);
 CREATE TABLE public.jm_quick_flip_durability_witnesses (id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, previous_id UUID, payload JSONB NOT NULL);
 INSERT INTO public.jm_market_pulse_snapshots (fetched_at,symbol,payload) VALUES ('2026-10-20T10:00:00Z','BTC/GBP','{"schema":"JM.MarketExecutableQuote/0.5","bid":50001,"symbol":"BTC/GBP"}'),('2026-10-20T11:00:00Z','ETH/GBP','{"schema":"JM.MarketExecutableQuote/0.5","bid":3011,"symbol":"ETH/GBP"}');
 INSERT INTO public.jm_quick_flip_proof_outcomes(created_at,symbol,receipt_hash,payload) VALUES ('2026-10-20T12:00:00Z','BTC/GBP','cp09_disposable_proof_001','{"schema":"JM.QuickFlipProofOutcome/1.0","outcome":"FULL_DEPTH_INCOMPLETE"}');
 INSERT INTO public.jm_quick_flip_durability_witnesses(id,created_at,previous_id,payload) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-10-20T13:00:00Z',NULL,'{"schema":"JM.QuickFlipDurabilityWitness/1.0","bootId":"cp09A"}'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-10-20T14:00:00Z','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"schema":"JM.QuickFlipDurabilityWitness/1.0","bootId":"cp09B"}');`);
 sql('jm_cp09_dirty',`CREATE TABLE public.refuse_overwrite (n INTEGER)`);
}
export function integration(){
 assert.equal(process.env.JM_CP09_CI_TEST_DATABASES,'YES_ONLY_DISPOSABLE','TEST_DATABASE_BOUNDARY_REQUIRED');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp09-true-postgres-')),checks=[];
 const record=(name,extra={})=>checks.push({name,pass:true,...extra});
 try{
  setup();record('disposable_source_and_restore_databases_created');
  const priv=path.join(tmp,'recipient.private.pem'),pub=path.join(tmp,'recipient.public.pem');
  const key=createRecipientKeys({privateFile:priv,publicFile:pub});record('recipient_key_pair_generated_ephemerally');
  const sealed=path.join(tmp,'sealed-postgres-market.json');
  const backup=createMarketPgBackup({sourceUrl:src,recipientPublicFile:pub,expectedRecipientId:key.recipientId,sealedFile:sealed,quiesced:true});
  assert.equal(backup.ok,true);assert.equal(backup.scope,'MARKET_THREE_POSTGRES_TABLES_ENCRYPTED');
  assert.deepEqual(Object.values(backup.tables).map(x=>x.rows).sort((a,b)=>a-b),[1,2,2]);
  assert.equal(inspectMarketPgEnvelope({sealedFile:sealed}).sealedSha256,backup.sealedSha256);
  record('real_pg_dump_three_hosted_tables_encrypted_and_pinned',{rows:5,dumpSha256:backup.pgDumpSha256});
  assert.throws(()=>restoreMarketPgBackup({targetUrl:dst,sealedFile:sealed,privateFile:priv,expectedSealedSha256:'0'.repeat(64)}),/CP09_OUT_OF_BAND_ARCHIVE_PIN_REQUIRED/);
  record('independently_pinned_ciphertext_required');
  assert.throws(()=>restoreMarketPgBackup({targetUrl:dirty,sealedFile:sealed,privateFile:priv,expectedSealedSha256:backup.sealedSha256}),/CP09_RESTORE_TARGET_NOT_EMPTY/);
  record('preexisting_database_table_never_overwritten');
  const wrong=path.join(tmp,'wrong.private.pem'),wrongPub=path.join(tmp,'wrong.public.pem');createRecipientKeys({privateFile:wrong,publicFile:wrongPub});
  assert.throws(()=>restoreMarketPgBackup({targetUrl:dst,sealedFile:sealed,privateFile:wrong,expectedSealedSha256:backup.sealedSha256}),/CP09_WRONG_RECIPIENT/);
  record('incorrect_recipient_private_key_refused');
  const tampered=path.join(tmp,'tampered.json'),envelope=JSON.parse(fs.readFileSync(sealed));envelope.tag=Buffer.alloc(16,5).toString('base64');fs.writeFileSync(tampered,JSON.stringify(envelope));
  const th=crypto.createHash('sha256').update(fs.readFileSync(tampered)).digest('hex');
  assert.throws(()=>restoreMarketPgBackup({targetUrl:dst,sealedFile:tampered,privateFile:priv,expectedSealedSha256:th}),/CP09_AUTHENTICATION_FAILED/);
  record('authenticated_ciphertext_tamper_refused');
  const restored=restoreMarketPgBackup({targetUrl:dst,sealedFile:sealed,privateFile:priv,expectedSealedSha256:backup.sealedSha256});
  assert.equal(restored.ok,true);assert.deepEqual(restored.tables,backup.tables);
  record('real_pg_restore_to_empty_disposable_database_and_three_table_byte_canonical_match');
  assert.equal(sql('jm_cp09_restored',"SELECT payload->>'schema' FROM public.jm_market_pulse_snapshots WHERE symbol='BTC/GBP'"),'JM.MarketExecutableQuote/0.5');
  assert.equal(sql('jm_cp09_restored',"SELECT payload->>'outcome' FROM public.jm_quick_flip_proof_outcomes WHERE receipt_hash='cp09_disposable_proof_001'"),'FULL_DEPTH_INCOMPLETE');
  assert.equal(sql('jm_cp09_restored',"SELECT previous_id::text FROM public.jm_quick_flip_durability_witnesses WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'"),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  sql('jm_cp09_restored',"INSERT INTO public.jm_market_pulse_snapshots(fetched_at,symbol,payload) VALUES (now(),'BTC/GBP','{}'::jsonb)");
  assert.equal(sql('jm_cp09_restored','SELECT MAX(id) FROM public.jm_market_pulse_snapshots'),'3');
  record('restored_market_payload_proof_outcome_witness_chain_and_sequence_function');
  assert.throws(()=>restoreMarketPgBackup({targetUrl:dst,sealedFile:sealed,privateFile:priv,expectedSealedSha256:backup.sealedSha256}),/CP09_RESTORE_TARGET_NOT_EMPTY/);
  record('second_restore_refused_without_destructive_overwrite');
  return{ok:true,schema:'JM.CloudContact.CP09.PostgresIntegrationProof/1',scope:'DISPOSABLE_LOCAL_POSTGRES_REAL_PG_DUMP_RESTORE',at:new Date().toISOString(),donorCommit:'0921217d95285bcb21cda7a995d02f7ec0725810',checks,passed:checks.length,failed:0,notes:['NOT_LIVE_HOST','NOT_OWNER_DATABASE','NOT_REMOTE_OFFSITE','TEST_KEYS_NOT_OWNER_CUSTODY','STOPPED_WRITES_ATTESTED_NOT_FENCED','NO_CROSS_FILE_POSTGRES_ATOMIC_BUNDLE']};
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{
 const proof=integration();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({ok:proof.ok,scope:proof.scope,passed:proof.passed,failed:proof.failed}));
}catch(e){console.error(e.message);process.exitCode=1}
