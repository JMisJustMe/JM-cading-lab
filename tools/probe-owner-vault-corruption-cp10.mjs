#!/usr/bin/env node
// CP10: Non-destructive synthetic custody-recovery probe.
// Loads the real JM Owner Vault handler; fake R2 is entirely in memory.
// An observed risk is a HOLD, never a safety PASS.
import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Buffer } from 'node:buffer';

const INDEX='jm-owner-vault/v0.1/bodies/index.json';
const STATE='jm-owner-vault/v0.1/state.json';
const FAKE_KEY='TEST_FIXTURE_ONLY_NEVER_PRODUCTION';
class FakeObject {
  constructor(value){this.body=value;}
  async text(){return this.body;}
  writeHttpMetadata(){}
}
class FakeR2 {
  constructor(){this.items=new Map();}
  async get(k){return this.items.has(k)?new FakeObject(this.items.get(k)):null;}
  async put(k,v){this.items.set(k,String(v));}
  async delete(k){this.items.delete(k);}
}
const api=await readFile(new URL('../functions/api/owner/vault.js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(api).toString('base64'));
async function call(bucket,method='GET',body=null){
  const headers=new Headers({'X-JM-Owner-Key':FAKE_KEY});
  if(body!==null)headers.set('content-type','application/json');
  const request=new Request('https://synthetic.invalid/api/owner/vault',{method,headers,
    body:body===null?undefined:JSON.stringify(body)});
  const response=await onRequest({request,env:{JM_OWNER_VAULT:bucket,JM_OWNER_VAULT_KEY:FAKE_KEY}});
  return {status:response.status,payload:await response.json()};
}

// Fixture 1: private metadata already exists, but an interrupted write left malformed JSON.
// It must never be silently replaced by an empty first-run manifest.
const indexBucket=new FakeR2();
const indexOriginal='{"schema":"fixture","bodies":[{"id":"protected-prior-body"';
indexBucket.items.set(INDEX,indexOriginal);
const indexRead=await call(indexBucket);
const indexWrite=await call(indexBucket,'POST',{action:'upload-body',body:{
  name:'CP10 synthetic test only',fileName:'test.html',
  sourceInstanceId:'cp10_fixture_001',
  content:'<!doctype html><html><title>fixture only</title></html>'
}});
const indexRetained=indexBucket.items.get(INDEX)===indexOriginal;

// Fixture 2: private owner state already exists but is malformed.
// A PUT must refuse to replace that old record as though it never existed.
const stateBucket=new FakeR2();
const stateOriginal='{"schema":"fixture","state":';
stateBucket.items.set(STATE,stateOriginal);
const stateRead=await call(stateBucket);
const stateWrite=await call(stateBucket,'PUT',{state:{notes:'synthetic only'}});
const stateRetained=stateBucket.items.get(STATE)===stateOriginal;

// Baseline first-boot missing objects must still work; absence != corruption.
const newBucket=new FakeR2();
const fresh=await call(newBucket);
const validFirstRun=fresh.status===200&&Array.isArray(fresh.payload.bodies)&&fresh.payload.bodies.length===0;

const risk=!indexRetained||!stateRetained||indexRead.status===200||stateRead.status===200;
const receipt={
  schema:'JM.OwnerVaultCustodyDiagnostic/CP10',run_at:new Date().toISOString(),
  scope:'SYNTHETIC_FAKE_R2_ONLY_NO_PRIVATE_OWNER_DATA',
  status:risk?'HOLD_UNREADABLE_EXISTING_RECORD_NOT_FAIL_CLOSED':'PASS_CORRUPT_CUSTODY_REFUSED',
  corrupt_index:{get_http:indexRead.status,upload_http:indexWrite.status,index_bytes_retained:indexRetained},
  corrupt_state:{get_http:stateRead.status,put_http:stateWrite.status,state_bytes_retained:stateRetained},
  first_run_missing_objects:{pass:validFirstRun},
  private_owner_html_roundtrip:'NOT_TESTED',
  actual_owner_device:'NOT_TESTED',
  no_owner_data_read:true
};
if(!validFirstRun)throw new Error('Unexpected first-run regression in synthetic fixture');
console.log(JSON.stringify(receipt,null,2));
if(process.env.GITHUB_STEP_SUMMARY){
  await appendFile(process.env.GITHUB_STEP_SUMMARY,'## JM Owner Vault CP10 — synthetic custody check\n\n**'+receipt.status+'**. In-memory fixtures only; no user data or live private Vault accessed.\n\n');
}
if(process.argv.includes('--require-safe')&&risk)process.exitCode=1;
