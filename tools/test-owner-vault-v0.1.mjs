import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const fixtureEtag = value => createHash('sha256').update(value instanceof Uint8Array ? value : String(value)).digest('hex');

class FakeR2Object {
  constructor(record) {
    this.record = record;
    this.body = record.body;
    this.etag = record.etag || fixtureEtag(record.body);
    this.customMetadata = record.options?.customMetadata || null;
  }
  async text() { return String(this.record.body); }
  async arrayBuffer() {
    const bytes = this.record.body instanceof Uint8Array
      ? Buffer.from(this.record.body) : Buffer.from(String(this.record.body));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  writeHttpMetadata(headers) {
    if (this.record.options?.httpMetadata?.contentType) headers.set('content-type', this.record.options.httpMetadata.contentType);
  }
}

class FakeR2 {
  constructor() { this.map = new Map(); this.version = 0; }
  async get(key) { const item = this.map.get(key); return item ? new FakeR2Object(item) : null; }
  async put(key, body, options = {}) {
    const existing = this.map.get(key);
    if (options.onlyIf instanceof Headers) {
      if (options.onlyIf.get('if-none-match') === '*' && existing) return null;
    } else if (options.onlyIf?.etagMatches !== undefined) {
      if (!existing || new FakeR2Object(existing).etag !== options.onlyIf.etagMatches) return null;
    }
    if (this.dropNextIndexWrite && key.endsWith('/bodies/index.json')) {
      this.dropNextIndexWrite = false;
      return;
    }
    if (this.dropNextStateWrite && key.endsWith('/state.json')) {
      this.dropNextStateWrite = false;
      return;
    }
    if (this.dropNextSnapshotWrite && key.includes('/snapshots/')) {
      this.dropNextSnapshotWrite = false;
      return;
    }
    let stored = body instanceof Uint8Array ? Buffer.from(body) : String(body);
    if (this.tamperNextStateWrite && key.endsWith('/state.json')) {
      this.tamperNextStateWrite = false;
      stored = stored.replace('saved note', 'tampered note');
    }
    if (this.tamperNextBodyWrite && key.endsWith('.html')) {
      this.tamperNextBodyWrite = false;
      stored += '<!-- injected R2 corruption -->';
    }
    if (this.tamperNextIndexWrite && key.endsWith('/bodies/index.json')) {
      this.tamperNextIndexWrite = false;
      stored = stored.replace('PRIVATE_DURABLE_COPY_NOT_PUBLICATION', 'CORRUPTED_INDEX_ENTRY');
    }
    if (this.tamperNextSnapshotWrite && key.includes('/snapshots/')) {
      this.tamperNextSnapshotWrite = false;
      stored += '\n';
    }
    const record = { body: stored, options, etag: String(++this.version) + '-' + fixtureEtag(stored) };
    this.map.set(key, record);
    return new FakeR2Object(record);
  }
  async delete(key) {
    if (this.dropNextBodyDelete && key.endsWith('.html')) {
      this.dropNextBodyDelete = false;
      return;
    }
    this.map.delete(key);
  }
}

// CP31 native Windows re-entry: retain full-precision file identity. Some
// ordinary owner NTFS file IDs exceed JS's MAX_SAFE_INTEGER; still reject
// symlinks, absent IDs and identity switches in the original recovery helper.
{
  const {readBoundedRegularFile}=await import('./owner-vault-lineage-recover.mjs');
  const dir=await fs.mkdtemp(path.join(tmpdir(),'jm-vault-win-id-'));
  const file=path.join(dir,'native-original-proof.dat');
  try {
    const original=Buffer.from('JM_CP31_NATIVE_OWNER_FILE');
    await fs.writeFile(file,original,{flag:'wx'});
    const before=await fs.lstat(file,{bigint:true});
    assert.equal(typeof before.ino,'bigint');
    assert.ok(before.ino>0n);
    assert.deepEqual(await readBoundedRegularFile(file,original.length),original);
    console.log('PASS: CP31 true native file ID readback, including Windows BigInt NTFS IDs; symlink and identity guards retained.');
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
}

const source = await fs.readFile(new URL('../functions/api/owner/vault.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { onRequest } = await import(moduleUrl);

const call = async ({ method = 'GET', query = '', key = '', env = {}, body } = {}) => {
  const headers = new Headers();
  if (key) headers.set('x-jm-owner-key', key);
  if (body !== undefined) headers.set('content-type', 'application/json');
  const request = new Request(`https://estate.example/api/owner/vault${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return onRequest({ request, env });
};

const bucket = new FakeR2();
const env = { JM_OWNER_VAULT: bucket, JM_OWNER_VAULT_KEY: 'correct-horse-estate-battery' };

{
  const response = await call({ query: '?mode=status', env: {} });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ready, false);
  assert.equal(payload.public_claim, false);
}

{
  const response = await call({ env });
  assert.equal(response.status, 401);
}

{
  const response = await call({ env, key: 'wrong' });
  assert.equal(response.status, 401);
}

{
  const response = await call({
    method: 'PUT', env, key: env.JM_OWNER_VAULT_KEY,
    body: { state: { notes: 'keeper', favourites: ['games-house'], recent: [{ id: 'x', name: 'Room', path: './room/', at: new Date().toISOString() }] } }
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.outcome, 'STATE_SAVED');
  assert.equal(payload.state.notes, 'keeper');
}

let firstBodyId, secondUseId, changedRevisionId, legacyId;
{
  const html = '<!doctype html><html><body><h1>JM Test Body</h1></body></html>';
  const response = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: { name: 'JM Test Body', fileName: 'jm-test.html', sourceInstanceId: 'local-jm-first-purpose', content: html } }
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.outcome, 'BODY_STORED');
  firstBodyId = payload.body.id;
  assert.ok(firstBodyId);

  const duplicate = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: { name: 'JM Test Body', fileName: 'jm-test.html', sourceInstanceId: 'local-jm-first-purpose', content: html } }
  });
  assert.equal(duplicate.status, 200);
  const dupPayload = await duplicate.json();
  assert.equal(dupPayload.outcome, 'DUPLICATE_ALREADY_HELD');
  assert.equal(dupPayload.body.id, firstBodyId);
  assert.equal(dupPayload.same_instance, true);

  // Identical bytes, identical title and filename, but a separately mounted
  // intended use: its identity must not collapse into the first use.
  const distinct = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: { name: 'JM Test Body', fileName: 'jm-test.html', sourceInstanceId: 'local-jm-second-purpose', content: html } }
  });
  assert.equal(distinct.status, 201);
  const d = await distinct.json();
  assert.equal(d.outcome, 'BODY_STORED');
  secondUseId = d.body.id;
  assert.notEqual(secondUseId, firstBodyId);
  assert.equal(d.body.sha256, payload.body.sha256);

  // Same source identity, changed content: append a new version; keep ancestor.
  const changed = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: { name: 'JM Test Body', fileName: 'jm-test.html', sourceInstanceId: 'local-jm-first-purpose', content: html.replace('JM Test Body', 'JM Revised Body') } }
  });
  assert.equal(changed.status, 201);
  const c = await changed.json();
  changedRevisionId = c.body.id;
  assert.equal(c.body.previousVersionId, firstBodyId);
  assert.notEqual(changedRevisionId, firstBodyId);

  // A legacy client without stable identity cannot safely deduplicate by bytes.
  const legacy = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: { name: 'JM Test Body', fileName: 'jm-test.html', content: html } }
  });
  assert.equal(legacy.status, 201);
  legacyId = (await legacy.json()).body.id;

  const invalid = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: { sourceInstanceId: '../unsafe', content: html } }
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, 'INVALID_SOURCE_INSTANCE_ID');
}

{
  const response = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.state.notes, 'keeper');
  assert.equal(payload.bodies.length, 4);
  assert.equal(new Set(payload.bodies.map(x => x.id)).size, 4);
  assert.equal(payload.bodies[0].status, 'PRIVATE_DURABLE_COPY_NOT_PUBLICATION');
}

{
  const response = await call({ env, key: env.JM_OWNER_VAULT_KEY, query: `?body=${encodeURIComponent(firstBodyId)}` });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /JM Test Body/);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
}

{
  const response = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'snapshot' }
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.outcome, 'SNAPSHOT_STORED');
  assert.equal(payload.snapshot.body_count, 4);
}

{
  // CP13 inherited behaviour: original cannot be removed while a revision
  // retains a previousVersionId reference to it.
  const blocked = await call({ method: 'DELETE', env, key: env.JM_OWNER_VAULT_KEY, query: `?body=${encodeURIComponent(firstBodyId)}` });
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error, 'BODY_ANCESTOR_STILL_REFERENCED');
  const before = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  assert.equal((await before.json()).bodies.length, 4);
  const stillAvailable = await call({ env, key: env.JM_OWNER_VAULT_KEY, query: `?body=${encodeURIComponent(secondUseId)}` });
  assert.equal(stillAvailable.status, 200);
  assert.match(await stillAvailable.text(), /JM Test Body/);
  // Explicit leaf-first cleanup retains both distinct purpose and ancestry.
  for(const id of [changedRevisionId, firstBodyId, secondUseId, legacyId]){
    assert.equal((await call({ method:'DELETE', env, key:env.JM_OWNER_VAULT_KEY, query:`?body=${encodeURIComponent(id)}` })).status, 200);
  }
  assert.equal((await (await call({env,key:env.JM_OWNER_VAULT_KEY})).json()).bodies.length, 0);
}

// CP05: authenticated revision edit, immutable ancestry, stale-edit rejection,
// exact readback and same-identity return-to-ancestor semantics.
{
  const key = env.JM_OWNER_VAULT_KEY;
  const first = '<!doctype html><html><body><h1>Owned private A</h1></body></html>';
  const changed = first.replace('private A','private B');
  const create = body => call({ method:'POST', env, key, body:{action:'upload-body',body} });
  const a = await (await create({name:'Private A',fileName:'private.html',sourceInstanceId:'local-private-owner-use-A',content:first})).json();
  const b = await (await create({name:'Private B',fileName:'private.html',sourceInstanceId:'local-private-owner-use-B',content:first})).json();
  assert.notEqual(a.body.id,b.body.id);
  const revisionRequest={action:'revise-body',baseId:a.body.id,expectedSha256:a.body.sha256,content:changed};

  assert.equal((await call({method:'POST',env,body:revisionRequest})).status,401);
  const invalidHash = await call({method:'POST',env,key,body:{...revisionRequest,expectedSha256:'a'.repeat(64)}});
  assert.equal(invalidHash.status,409);
  assert.equal((await invalidHash.json()).error,'BODY_EXPECTED_HASH_MISMATCH');
  const invalidHTML = await call({method:'POST',env,key,body:{...revisionRequest,content:'just text'}});
  assert.equal(invalidHTML.status,400);
  const changedResponse=await call({method:'POST',env,key,body:revisionRequest});
  assert.equal(changedResponse.status,201);
  const revision=await changedResponse.json();
  assert.equal(revision.outcome,'BODY_REVISION_STORED');
  assert.equal(revision.body.previousVersionId,a.body.id);
  assert.equal(revision.body.sourceInstanceId,'local-private-owner-use-A');
  assert.notEqual(revision.body.id,a.body.id);

  const originalBack=await call({env,key,query:`?body=${a.body.id}`});
  assert.equal(await originalBack.text(),first);
  const revisionBack=await call({env,key,query:`?body=${revision.body.id}`});
  assert.equal(await revisionBack.text(),changed);
  const separateBack=await call({env,key,query:`?body=${b.body.id}`});
  assert.equal(await separateBack.text(),first);

  const stale=await call({method:'POST',env,key,body:revisionRequest});
  assert.equal(stale.status,409);
  assert.equal((await stale.json()).error,'REVISION_HEAD_CHANGED');
  const retry=await call({method:'POST',env,key,body:{...revisionRequest,baseId:revision.body.id,expectedSha256:revision.body.sha256}});
  assert.equal(retry.status,200);
  assert.equal((await retry.json()).outcome,'REVISION_UNCHANGED');

  // Returning to an ancestor's bytes remains a NEW version, not a stale body.
  const rollback=await call({method:'POST',env,key,body:{...revisionRequest,baseId:revision.body.id,expectedSha256:revision.body.sha256,content:first}});
  assert.equal(rollback.status,201);
  const reverted=(await rollback.json()).body;
  assert.equal(reverted.previousVersionId,revision.body.id);
  assert.notEqual(reverted.id,a.body.id);
  const exactHeadRetry=await create({name:'Private A',fileName:'private.html',sourceInstanceId:'local-private-owner-use-A',content:first});
  assert.equal((await exactHeadRetry.json()).body.id,reverted.id);

  // A legacy body with no mount ID can be edited independently of another use.
  const legacy=(await (await create({name:'Legacy',fileName:'legacy.html',content:first})).json()).body;
  const legacyRev=await call({method:'POST',env,key,body:{action:'revise-body',baseId:legacy.id,expectedSha256:legacy.sha256,content:changed}});
  assert.equal(legacyRev.status,201);
  const legacyNew=(await legacyRev.json()).body;
  assert.equal(legacyNew.sourceInstanceId,'vault-'+legacy.id);
  assert.equal(legacyNew.previousVersionId,legacy.id);

  const manifest=(await (await call({env,key})).json()).bodies;
  assert.equal(manifest.length,6);
  assert.equal(new Set(manifest.map(x=>x.id)).size,6);
  // CP13: explicitly delete descendant leaves before their referenced originals.
  for(const id of [reverted.id,revision.body.id,a.body.id,b.body.id,legacyNew.id,legacy.id]) {
    assert.equal((await call({method:'DELETE',env,key,query:`?body=${id}`})).status,200);
  }
  assert.equal((await (await call({env,key})).json()).bodies.length,0);
}

// Full index is a HOLD, never a reason to evict an older purposeful use.
{
  const protectedBodies=Array.from({length:2000},(_,i)=>({id:'protected-'+i,sourceInstanceId:'preserved-'+i,sha256:String(i).padStart(64,'0')}));
  const indexKey='jm-owner-vault/v0.1/bodies/index.json';
  bucket.map.set(indexKey,{body:JSON.stringify({schema:'JM.OwnerVault/0.1.BodyIndex',bodies:protectedBodies})});
  const before=bucket.map.size;
  const response=await call({
    method:'POST',env,key:env.JM_OWNER_VAULT_KEY,
    body:{action:'upload-body',body:{sourceInstanceId:'local-overflow-purpose',content:'<!doctype html><html><body>next</body></html>'}}
  });
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'BODY_INDEX_CAPACITY_REACHED');
  assert.equal(bucket.map.size,before);
  assert.equal(JSON.parse(bucket.map.get(indexKey).body).bodies.length,2000);
}

console.log('PASS: JM Owner Vault CP05 private edit/revise/readback, ancestor preservation, stale rejection, purpose isolation, exact-instance retries, legacy continuity and capacity fail-closed.');

// CP10 custody negative probe, using the ORIGINAL handler and disposable FakeR2.
// An existing unreadable record must not be mistaken for an absent first-run object.
// The strict flag deliberately exits RED on the current defect; no live Vault is touched.
{
  const indexKey='jm-owner-vault/v0.1/bodies/index.json';
  const stateKey='jm-owner-vault/v0.1/state.json';
  const fakeKey='CP10_SYNTHETIC_NONPRODUCTION';
  const exercise=async (fake,method='GET',body,query='')=>{
    const response=await call({env:{JM_OWNER_VAULT:fake,JM_OWNER_VAULT_KEY:fakeKey},key:fakeKey,method,body,query});
    return {status:response.status,payload:await response.json()};
  };
  const indexFake=new FakeR2();
  const oldIndex='{"schema":"SYNTHETIC","bodies":[{"id":"old-evidence"';
  indexFake.map.set(indexKey,{body:oldIndex});
  const readIndex=await exercise(indexFake);
  const writeIndex=await exercise(indexFake,'POST',{action:'upload-body',body:{
    name:'Synthetic Probe',sourceInstanceId:'cp10-unique-source',fileName:'probe.html',
    content:'<!doctype html><html><body>synthetic only</body></html>'
  }});
  const indexPreserved=indexFake.map.get(indexKey)?.body===oldIndex;
  // Refuse every custody-dependent operation; neither orphan new bytes nor
  // discard older intended bodies when the sole index is unreadable.
  const indexKeysBefore=[...indexFake.map.keys()].sort();
  const head='00000000-0000-4000-8000-000000000001';
  const badIndexDownload=await exercise(indexFake,'GET',undefined,'?body='+head);
  const badIndexRevision=await exercise(indexFake,'POST',{action:'revise-body',
    baseId:head,expectedSha256:'a'.repeat(64),
    content:'<!doctype html><html><body>no change</body></html>'});
  const badIndexDelete=await exercise(indexFake,'DELETE',undefined,'?body='+head);
  const badIndexSnapshot=await exercise(indexFake,'POST',{action:'snapshot'});
  assert.deepEqual([...indexFake.map.keys()].sort(),indexKeysBefore,'No new R2 objects on corrupt index');
  for(const result of [badIndexDownload,badIndexRevision,badIndexDelete,badIndexSnapshot]){
    assert.equal(result.status,503,'Corrupt index operations must fail closed');
    assert.equal(result.payload.error,'PRIVATE_CUSTODY_HOLD');
  }
  assert.equal(indexFake.map.get(indexKey)?.body,oldIndex);
  // Valid JSON with an unusable nested shape must be held too.
  const invalidShape='{"schema":"JM.OwnerVault/0.1.BodyIndex","bodies":{}}';
  indexFake.map.set(indexKey,{body:invalidShape});
  assert.equal((await exercise(indexFake)).status,503);
  assert.equal(indexFake.map.get(indexKey)?.body,invalidShape);
  const invalidEntry='{"schema":"JM.OwnerVault/0.1.BodyIndex","bodies":[null]}';
  indexFake.map.set(indexKey,{body:invalidEntry});
  assert.equal((await exercise(indexFake)).status,503);
  assert.equal(indexFake.map.get(indexKey)?.body,invalidEntry);
  const stateFake=new FakeR2();
  const oldState='{"schema":"SYNTHETIC","state":';
  stateFake.map.set(stateKey,{body:oldState});
  const readState=await exercise(stateFake);
  const writeState=await exercise(stateFake,'PUT',{state:{notes:'synthetic only'}});
  const statePreserved=stateFake.map.get(stateKey)?.body===oldState;
  const stateSnapshot=await exercise(stateFake,'POST',{action:'snapshot'});
  assert.equal(stateSnapshot.status,503);
  const badStateShape='{"schema":"JM.OwnerVault/0.1.State","state":[]}';
  stateFake.map.set(stateKey,{body:badStateShape});
  assert.equal((await exercise(stateFake)).status,503);
  assert.equal((await exercise(stateFake,'PUT',{state:{notes:'unsafe'}})).status,503);
  assert.equal(stateFake.map.get(stateKey)?.body,badStateShape);
  stateFake.map.set(stateKey,{body:oldState});
  const newFake=new FakeR2();
  const newRead=await exercise(newFake);
  assert.equal(newRead.status,200,'A genuinely missing first-run private record must work');
  assert.deepEqual(newRead.payload.bodies,[],'A first-run empty shelf is valid');
  assert.equal((await exercise(newFake,'PUT',{state:{notes:'first run'}})).status,200);
  assert.equal((await exercise(newFake,'POST',{action:'upload-body',body:{
    sourceInstanceId:'cp10-first-run-synthetic',content:'<!doctype html><html>new</html>'
  }})).status,201);
  // A failing metadata GET must not be treated as absence.
  const failedGet=new FakeR2();
  failedGet.get=async()=>{throw Error('synthetic transient storage fault');};
  assert.equal((await exercise(failedGet,'PUT',{state:{notes:'no write'}})).status,503);
  assert.equal(failedGet.map.size,0);

  const custodySafe=indexPreserved&&statePreserved&&readIndex.status===503&&readState.status===503
    &&writeIndex.status===503&&writeState.status===503;
  const diagnosis={scope:'DISPOSABLE_IN_MEMORY_R2_ONLY',custody: custodySafe?'PASS_FAIL_CLOSED':'HOLD_UNREADABLE_EXISTING_RECORD',
    index:{read_http:readIndex.status,upload_http:writeIndex.status,preserved:indexPreserved},
    state:{read_http:readState.status,put_http:writeState.status,preserved:statePreserved},
    valid_first_run:true,owner_private_storage:'NOT_ACCESSED'};
  console.log('JM_CP10_CUSTODY_DIAGNOSTIC '+JSON.stringify(diagnosis));
  assert.equal(custodySafe,true,'Corrupt existing metadata must return 503 and preserve all old bytes');
  console.log('PASS: CP09/CP10 fail-closed private custody, no data overwrite, missing-first-run distinction.');
}


// Current-main integrity regression: uploads, private revisions, downloads and
// the complete index must be independently read back before success is reported.
{
  const isolated = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: isolated };
  const ownerKey = isolatedEnv.JM_OWNER_VAULT_KEY;
  const html = '<!doctype html><html><body>Source A</body></html>';
  const upload = (instance, content) => call({
    method: 'POST', env: isolatedEnv, key: ownerKey,
    body: { action: 'upload-body', body: { sourceInstanceId: instance, content } }
  });
  const revise = (baseId, expectedSha256, content) => call({
    method: 'POST', env: isolatedEnv, key: ownerKey,
    body: { action: 'revise-body', baseId, expectedSha256, content }
  });
  const first = await upload('cp09-source-0001', html);
  assert.equal(first.status, 201);
  const ancestor = (await first.json()).body;
  const bodyKey = `jm-owner-vault/v0.1/bodies/${ancestor.id}.html`;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const original = isolated.map.get(bodyKey);
  const read = id => call({ env: isolatedEnv, key: ownerKey, query: `?body=${id}` });
  const good = await read(ancestor.id);
  assert.equal(good.status, 200);
  assert.equal(good.headers.get('x-jm-body-integrity'), 'sha256-verified');
  assert.equal(await good.text(), html);
  assert.equal((await read(ancestor.id)).status, 200);

  isolated.map.set(bodyKey, { ...original, body: html.replace('Source A', 'Source B') });
  const sameLengthTamper = await read(ancestor.id);
  assert.equal(sameLengthTamper.status, 409);
  assert.equal((await sameLengthTamper.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.equal(isolated.map.get(bodyKey).body.includes('Source B'), true);
  isolated.map.set(bodyKey, original);

  const beforeIndex = isolated.map.get(indexKey).body;
  isolated.tamperNextBodyWrite = true;
  const badUpload = await upload('cp09-source-0002', html.replace('Source A', 'Source C'));
  assert.equal(badUpload.status, 409);
  assert.equal((await badUpload.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, beforeIndex);

  isolated.dropNextIndexWrite = true;
  const lostIndex = await upload('cp09-source-0003', html.replace('Source A', 'Source D'));
  assert.equal(lostIndex.status, 409);
  assert.equal((await lostIndex.json()).error, 'BODY_INDEX_READBACK_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, beforeIndex);

  isolated.tamperNextIndexWrite = true;
  const changedIndex = await upload('cp09-source-0004', html.replace('Source A', 'Source E'));
  assert.equal(changedIndex.status, 409);
  assert.equal((await changedIndex.json()).error, 'BODY_INDEX_READBACK_MISMATCH');
  isolated.map.set(indexKey, { body: beforeIndex, options: isolated.map.get(indexKey).options });

  const revisedHtml = html.replace('Source A', 'Source F');
  const revised = await revise(ancestor.id, ancestor.sha256, revisedHtml);
  assert.equal(revised.status, 201);
  const descendant = (await revised.json()).body;
  assert.equal(descendant.previousVersionId, ancestor.id);
  assert.equal((await (await read(descendant.id)).text()), revisedHtml);
  assert.equal((await (await read(ancestor.id)).text()), html);

  const revisionIndex = isolated.map.get(indexKey).body;
  isolated.tamperNextBodyWrite = true;
  const badRevision = await revise(descendant.id, descendant.sha256, html.replace('Source A', 'Source G'));
  assert.equal(badRevision.status, 409);
  assert.equal((await badRevision.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, revisionIndex);

  isolated.dropNextIndexWrite = true;
  const lostRevision = await revise(descendant.id, descendant.sha256, html.replace('Source A', 'Source H'));
  assert.equal(lostRevision.status, 409);
  assert.equal((await lostRevision.json()).error, 'BODY_INDEX_READBACK_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, revisionIndex);
  assert.equal((await read(descendant.id)).status, 200);
  assert.equal((await read(ancestor.id)).status, 200);
  // CP11: exact-byte retry and unchanged-revision must not falsely confirm
  // custody when the already-indexed current source has been corrupted.
  const descendantKey = `jm-owner-vault/v0.1/bodies/${descendant.id}.html`;
  const intactDescendant = isolated.map.get(descendantKey);
  isolated.map.set(descendantKey, { ...intactDescendant, body: revisedHtml.replace('Source F', 'Source Z') });
  const badRetry = await upload('cp09-source-0001', revisedHtml);
  assert.equal(badRetry.status, 409);
  assert.equal((await badRetry.json()).error, 'BODY_INTEGRITY_MISMATCH');
  const badUnchanged = await revise(descendant.id, descendant.sha256, revisedHtml);
  assert.equal(badUnchanged.status, 409);
  assert.equal((await badUnchanged.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, revisionIndex);
  isolated.map.set(descendantKey, intactDescendant);
  assert.equal((await upload('cp09-source-0001', revisedHtml)).status, 200);
  assert.equal((await revise(descendant.id, descendant.sha256, revisedHtml)).status, 200);
  assert.equal((await call({ env: isolatedEnv, key: 'wrong', query: `?body=${ancestor.id}` })).status, 401);
}

// CP11: owner state acknowledgements require an independent persisted readback.
{
  const stateStore = new FakeR2();
  const stateEnv = { ...env, JM_OWNER_VAULT: stateStore };
  const save = notes => call({method:'PUT',env:stateEnv,key:stateEnv.JM_OWNER_VAULT_KEY,body:{state:{notes}}});
  const first = await save('saved note');
  assert.equal(first.status, 200);
  const stateKey = 'jm-owner-vault/v0.1/state.json';
  const saved = stateStore.map.get(stateKey).body;
  stateStore.dropNextStateWrite = true;
  const dropped = await save('second note');
  assert.equal(dropped.status, 409);
  assert.equal((await dropped.json()).error, 'OWNER_STATE_READBACK_MISMATCH');
  assert.equal(stateStore.map.get(stateKey).body, saved);
  stateStore.tamperNextStateWrite = true;
  const tampered = await save('saved note');
  assert.equal(tampered.status, 409);
  assert.equal((await tampered.json()).error, 'OWNER_STATE_READBACK_MISMATCH');
  assert.match(stateStore.map.get(stateKey).body, /tampered note/);
  const restored = await save('restored note');
  assert.equal(restored.status, 200);
  assert.equal((await (await call({env:stateEnv,key:stateEnv.JM_OWNER_VAULT_KEY})).json()).state.notes, 'restored note');
}
// CP12: deletion must never remove the only held source before a verified index
// update. Snapshot acknowledgement must prove uniquely named, persisted bytes.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const html = '<!doctype html><html><body>CP12 synthetic source</body></html>';
  const created = await call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'upload-body', body: { name: 'CP12 source', sourceInstanceId: 'cp12-source-0001', content: html }
  } });
  assert.equal(created.status, 201);
  const id = (await created.json()).body.id;
  const bodyKey = `jm-owner-vault/v0.1/bodies/${id}.html`;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const originalIndex = storage.map.get(indexKey).body;
  storage.dropNextIndexWrite = true;
  const refused = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${id}` });
  assert.equal(refused.status, 409);
  assert.equal((await refused.json()).error, 'BODY_INDEX_READBACK_MISMATCH');
  assert.equal(storage.map.get(indexKey).body, originalIndex);
  assert.equal(storage.map.get(bodyKey).body, html, 'Index failure must not delete the only source');
  const damagedSource = storage.map.get(bodyKey);
  storage.map.set(bodyKey, { ...damagedSource, body: html + '<!-- corrupted -->' });
  const badSource = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${id}` });
  assert.equal(badSource.status, 409);
  assert.equal((await badSource.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.equal(storage.map.get(indexKey).body, originalIndex);
  storage.map.set(bodyKey, damagedSource);
  const removed = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${id}` });
  assert.equal(removed.status, 200);
  assert.equal(storage.map.has(bodyKey), false);
  assert.equal((await (await call({ env: isolatedEnv, key })).json()).bodies.length, 0);
}
// CP13: A retained descendant must never be left pointing at a deleted
// original ancestor. Test real API calls against disposable fake R2 only.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const html = '<!doctype html><html><body>CP13 protected original</body></html>';
  const uploaded = await call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'upload-body', body: { name: 'CP13 original', sourceInstanceId: 'cp13-ancestor-0001', content: html }
  } });
  assert.equal(uploaded.status, 201);
  const original = (await uploaded.json()).body;
  const revised = await call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'revise-body', baseId: original.id, expectedSha256: original.sha256,
    content: html.replace('original', 'revision')
  } });
  assert.equal(revised.status, 201);
  const child = (await revised.json()).body;
  assert.equal(child.previousVersionId, original.id);
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const originalKey = `jm-owner-vault/v0.1/bodies/${original.id}.html`;
  const childKey = `jm-owner-vault/v0.1/bodies/${child.id}.html`;
  const beforeIndex = storage.map.get(indexKey).body;
  const blocked = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${original.id}` });
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error, 'BODY_ANCESTOR_STILL_REFERENCED');
  assert.equal(storage.map.get(indexKey).body, beforeIndex, 'Refused deletion must preserve original index');
  assert.equal(storage.map.get(originalKey).body, html, 'Original source bytes must remain held');
  assert.equal(storage.map.has(childKey), true, 'Descendant source must remain held');
  assert.equal((await call({ env: isolatedEnv, key, query: `?body=${original.id}` })).status, 200);
  assert.equal((await call({ env: isolatedEnv, key, query: `?body=${child.id}` })).status, 200);
  const deleteChild = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${child.id}` });
  assert.equal(deleteChild.status, 200, 'Leaf revision may be explicitly removed');
  const deleteOriginal = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${original.id}` });
  assert.equal(deleteOriginal.status, 200, 'Unreferenced original may then be explicitly removed');
  assert.equal(storage.map.has(originalKey) || storage.map.has(childKey), false);
  assert.equal((await (await call({ env: isolatedEnv, key })).json()).bodies.length, 0);
}
console.log('PASS: CP13 referenced original retained, both revisions downloadable, leaf-first deletion explicit.');
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const created = await call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'upload-body', body: { name: 'CP12 orphan test', sourceInstanceId: 'cp12-source-0002',
      content: '<html><body>synthetic orphan</body></html>' }
  } });
  const id = (await created.json()).body.id;
  const objectKey = `jm-owner-vault/v0.1/bodies/${id}.html`;
  storage.dropNextBodyDelete = true;
  const blocked = await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${id}` });
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error, 'BODY_DELETE_READBACK_MISMATCH');
  assert.equal(storage.map.has(objectKey), true, 'Interrupted delete retains orphan for manual recovery');
  assert.equal((await (await call({ env: isolatedEnv, key })).json()).bodies.length, 0);
}
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const snapshot = () => call({ method: 'POST', env: isolatedEnv, key, body: { action: 'snapshot' } });
  const a = await snapshot(), b = await snapshot();
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const firstKey = (await a.json()).snapshot.key, secondKey = (await b.json()).snapshot.key;
  assert.notEqual(firstKey, secondKey, 'Rapid snapshots must not overwrite one another');
  assert.equal(storage.map.has(firstKey) && storage.map.has(secondKey), true);
  storage.dropNextSnapshotWrite = true;
  const dropped = await snapshot();
  assert.equal(dropped.status, 409);
  assert.equal((await dropped.json()).error, 'SNAPSHOT_READBACK_MISMATCH');
  storage.tamperNextSnapshotWrite = true;
  const tampered = await snapshot();
  assert.equal(tampered.status, 409);
  assert.equal((await tampered.json()).error, 'SNAPSHOT_READBACK_MISMATCH');
  assert.equal([...storage.map.keys()].filter(k => k.includes('/snapshots/')).length, 3,
    'Tampered snapshot retained for investigation, never acknowledged as intact');
}
// CP14: An index with duplicate body IDs is corrupt even when JSON parses.
// Never allow ambiguous GET, upload, snapshot or DELETE to mutate custody.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const html = '<!doctype html><html><body>CP14 unique custody</body></html>';
  const created = await call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'upload-body', body: { name: 'CP14 source', sourceInstanceId: 'cp14-source-0001', content: html }
  } });
  assert.equal(created.status, 201);
  const original = (await created.json()).body;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const bodyKey = `jm-owner-vault/v0.1/bodies/${original.id}.html`;
  const indexObject = storage.map.get(indexKey);
  const validIndex = indexObject.body;
  const parsed = JSON.parse(validIndex);
  parsed.bodies.push({ ...parsed.bodies[0], name: 'Ambiguous duplicate identity' });
  const corruptIndex = JSON.stringify(parsed, null, 2);
  storage.map.set(indexKey, { ...indexObject, body: corruptIndex });
  const attempts = [
    () => call({ env: isolatedEnv, key }),
    () => call({ env: isolatedEnv, key, query: `?body=${original.id}` }),
    () => call({ method: 'POST', env: isolatedEnv, key, body: {
      action: 'upload-body', body: { name: 'new', sourceInstanceId: 'cp14-source-0002', content: html }
    } }),
    () => call({ method: 'POST', env: isolatedEnv, key, body: { action: 'snapshot' } }),
    () => call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${original.id}` })
  ];
  for (const attempt of attempts) {
    const response = await attempt();
    assert.equal(response.status, 503, 'Ambiguous custody must fail closed');
    assert.equal((await response.json()).error, 'PRIVATE_CUSTODY_HOLD');
    assert.equal(storage.map.get(indexKey).body, corruptIndex, 'Corrupt index must remain intact');
    assert.equal(storage.map.get(bodyKey).body, html, 'Original source must remain intact');
  }
  assert.equal([...storage.map.keys()].filter(k => k.includes('/snapshots/')).length, 0);
  storage.map.set(indexKey, { ...indexObject, body: validIndex });
  assert.equal((await call({ env: isolatedEnv, key, query: `?body=${original.id}` })).status, 200,
    'Owner-controlled exact index recovery must restore source access');
  assert.equal((await call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${original.id}` })).status, 200,
    'Normal explicit deletion must remain possible after recovery');
}
console.log('PASS: CP14 duplicate-ID custody corruption holds every index route without data loss.');

console.log('PASS: JM Owner Vault CP12 index-before-delete, orphan HOLD, unique exact snapshot readback.');
console.log('PASS: JM Owner Vault CP11 persisted-state, dedupe and unchanged-revision integrity gates.');
console.log('PASS: JM Owner Vault current-main private editor, immutable ancestry, capacity gate, exact R2 body/index integrity on uploads/revisions/downloads.');


// CP15: concurrent editors must never both receive success when they read
// the same old R2 index or state. No real owner key, bucket or device is used.
function pauseMatchingGets(storage, key, required = 2) {
  const get = storage.get.bind(storage);
  let entered = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  storage.get = async function(candidate) {
    const snapshot = await get(candidate); // Snapshot BEFORE either writer commits.
    if (candidate === key && entered < required) {
      entered += 1;
      if (entered === required) release();
      await gate;
    }
    return snapshot;
  };
}
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  await storage.put(indexKey, JSON.stringify({
    schema: 'JM.OwnerVault/0.1.BodyIndex', updated_at: null, bodies: []
  }));
  pauseMatchingGets(storage, indexKey);
  const upload = suffix => call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'upload-body', body: {
      name: 'CP15 independent ' + suffix, sourceInstanceId: 'cp15-source-' + suffix,
      content: '<!doctype html><html><body>CP15 ' + suffix + '</body></html>'
    }
  } });
  const outcomes = await Promise.all([upload('alpha'), upload('bravo')]);
  assert.deepEqual(outcomes.map(x => x.status).sort(), [201, 409],
    'Only one competing R2 index compare-and-swap may succeed');
  const conflict = outcomes.find(x => x.status === 409);
  assert.equal((await conflict.json()).error, 'PRIVATE_CONCURRENT_WRITE_CONFLICT');
  const manifest = await (await call({ env: isolatedEnv, key })).json();
  assert.equal(manifest.bodies.length, 1, 'The winning committed index remains intact');
  assert.match(manifest.bodies[0].name, /CP15 independent/);
  assert.equal(storage.map.has(indexKey), true);
  // The refused writer may leave UUID-keyed orphan bytes for owner recovery,
  // but MUST NOT advertise lost-update success or delete any source bytes.
}
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const stateKey = 'jm-owner-vault/v0.1/state.json';
  await storage.put(stateKey, JSON.stringify({
    schema: 'JM.OwnerVault/0.1.State', updated_at: null,
    state: { notes: 'original', favourites: [], recent: [] }
  }));
  pauseMatchingGets(storage, stateKey);
  const save = notes => call({ method: 'PUT', env: isolatedEnv, key, body: { state: { notes } } });
  const outcomes = await Promise.all([save('first-editor'), save('second-editor')]);
  assert.deepEqual(outcomes.map(x => x.status).sort(), [200, 409],
    'Only one simultaneous state write is permitted to replace the old version');
  assert.equal((await outcomes.find(x => x.status === 409).json()).error,
    'PRIVATE_CONCURRENT_WRITE_CONFLICT');
  const state = await (await call({ env: isolatedEnv, key })).json();
  assert.ok(['first-editor','second-editor'].includes(state.state.notes));
}
console.log('PASS: CP15 atomic R2 version-CAS prevents silent concurrent index/state lost updates; single-writer custody remains intact.');


// CP16: independent owner sessions cannot overwrite an observed state head
// after another editor's sequential (rather than simultaneous) commit.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const baseline = await (await call({ env: isolatedEnv, key })).json();
  assert.match(baseline.state_revision, /^[a-f0-9]{64}$/);
  const first = await call({ method: 'PUT', env: isolatedEnv, key, body: {
    state: { notes: 'first-device-preserved' }, expectedStateRevision: baseline.state_revision
  } });
  assert.equal(first.status, 200);
  const firstResult = await first.json();
  assert.notEqual(firstResult.state_revision, baseline.state_revision);
  const stale = await call({ method: 'PUT', env: isolatedEnv, key, body: {
    state: { notes: 'stale-device-clobber' }, expectedStateRevision: baseline.state_revision
  } });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error, 'OWNER_STATE_HEAD_CHANGED');
  const recovered = await (await call({ env: isolatedEnv, key })).json();
  assert.equal(recovered.state.notes, 'first-device-preserved');
  assert.equal(recovered.state_revision, firstResult.state_revision);
  const fresh = await call({ method: 'PUT', env: isolatedEnv, key, body: {
    state: { notes: 'second-device-after-reload' }, expectedStateRevision: recovered.state_revision
  } });
  assert.equal(fresh.status, 200);
  assert.equal((await (await call({ env: isolatedEnv, key })).json()).state.notes,
    'second-device-after-reload');
  const invalid = await call({ method: 'PUT', env: isolatedEnv, key, body: {
    state: { notes: 'invalid-precondition' }, expectedStateRevision: 'invalid'
  } });
  assert.equal(invalid.status, 409);
  assert.equal((await (await call({ env: isolatedEnv, key })).json()).state.notes,
    'second-device-after-reload');
}
console.log('PASS: CP16 last-observed state revision rejects stale owner-device writes and permits verified reload.');


// CP17: explicitly corrupted integrity metadata must not silently downgrade
// verified source custody. Keep the corrupt original index and HTML unchanged.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const html = '<!doctype html><html><body>CP17 protected original</body></html>';
  const created = await call({ method: 'POST', env: isolatedEnv, key, body: {
    action: 'upload-body', body: { name: 'CP17 source', sourceInstanceId: 'cp17-source-0001', content: html }
  } });
  assert.equal(created.status, 201);
  const original = (await created.json()).body;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const bodyKey = `jm-owner-vault/v0.1/bodies/${original.id}.html`;
  const healthyRecord = storage.map.get(indexKey);
  const healthyIndex = healthyRecord.body;
  const damagedCases = [
    ['invalid-present-digest', { sha256: 'not-a-valid-sha256' }],
    ['invalid-byte-count', { bytes: '0' }],
    ['invalid-ancestry-type', { previousVersionId: 42 }],
    ['invalid-instance-type', { sourceInstanceId: { unexpected: true } }]
  ];
  for (const [label, fields] of damagedCases) {
    const damaged = JSON.parse(healthyIndex);
    Object.assign(damaged.bodies[0], fields);
    const corruptIndex = JSON.stringify(damaged, null, 2);
    storage.map.set(indexKey, { ...healthyRecord, body: corruptIndex });
    const routes = [
      () => call({ env: isolatedEnv, key }),
      () => call({ env: isolatedEnv, key, query: `?body=${original.id}` }),
      () => call({ method: 'POST', env: isolatedEnv, key, body: {
        action: 'upload-body', body: { name: 'blocked', sourceInstanceId: 'cp17-source-0002', content: html }
      } }),
      () => call({ method: 'POST', env: isolatedEnv, key, body: { action: 'snapshot' } }),
      () => call({ method: 'DELETE', env: isolatedEnv, key, query: `?body=${original.id}` })
    ];
    for (const route of routes) {
      const response = await route();
      assert.equal(response.status, 503, label + ': corrupt custody must fail closed');
      assert.equal((await response.json()).error, 'PRIVATE_CUSTODY_HOLD');
      assert.equal(storage.map.get(indexKey).body, corruptIndex);
      assert.equal(storage.map.get(bodyKey).body, html);
    }
  }
  storage.map.set(indexKey, healthyRecord);
  const restored = await call({ env: isolatedEnv, key, query: `?body=${original.id}` });
  assert.equal(restored.status, 200);
  assert.equal(await restored.text(), html);
  assert.equal(restored.headers.get('x-jm-body-integrity'), 'sha256-verified');
}
console.log('PASS: CP17 malformed integrity/index metadata cannot downgrade source verification or destroy originals; exact recovery works.');


// CP18: a present but broken ancestor link must not be mistaken for a healthy
// version history. Preserve the original metadata and every purposeful source.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const create = (sourceInstanceId, content) => call({
    method: 'POST', env: isolatedEnv, key, body: { action: 'upload-body',
      body: { name: 'CP18 source', sourceInstanceId, content } }
  });
  const originalHTML = '<!doctype html><html><body>CP18 first source</body></html>';
  const revisionHTML = '<!doctype html><html><body>CP18 retained revision</body></html>';
  const original = (await (await create('cp18-lineage-source-a', originalHTML)).json()).body;
  const revised = (await (await create('cp18-lineage-source-a', revisionHTML)).json()).body;
  const other = (await (await create('cp18-purpose-source-b', originalHTML)).json()).body;
  assert.equal(revised.previousVersionId, original.id);
  assert.notEqual(other.id, original.id, 'Separate purpose must retain its own identity');
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const originalKey = `jm-owner-vault/v0.1/bodies/${original.id}.html`;
  const revisionKey = `jm-owner-vault/v0.1/bodies/${revised.id}.html`;
  const otherKey = `jm-owner-vault/v0.1/bodies/${other.id}.html`;
  const held = storage.map.get(indexKey);
  const healthy = held.body;
  const damagedCases = [
    ['dangling-parent', body => { body.previousVersionId = '00000000-0000-4000-8000-000000000999'; }],
    ['self-reference', body => { body.previousVersionId = revised.id; }],
    ['cross-purpose-ancestor', body => { body.previousVersionId = other.id; }],
    ['broken-newest-first-order', (body, index) => {
      index.bodies = [index.bodies.find(x => x.id === original.id),
        ...index.bodies.filter(x => x.id !== original.id)];
    }]
  ];
  for (const [label, change] of damagedCases) {
    const data = JSON.parse(healthy);
    change(data.bodies.find(x => x.id === revised.id), data);
    const corrupt = JSON.stringify(data, null, 2);
    storage.map.set(indexKey, { ...held, body: corrupt });
    const attempts = [
      () => call({ env: isolatedEnv, key }),
      () => call({ env: isolatedEnv, key, query: `?body=${revised.id}` }),
      () => call({ method: 'POST', env: isolatedEnv, key, body: { action: 'snapshot' } }),
      () => create('cp18-new-independent-purpose', originalHTML),
      () => call({ method: 'DELETE', env: isolatedEnv, key,
        query: `?body=${revised.id}` })
    ];
    for (const attempt of attempts) {
      const response = await attempt();
      assert.equal(response.status, 503, label + ': cannot trust ancestry');
      assert.equal((await response.json()).error, 'PRIVATE_CUSTODY_HOLD');
      assert.equal(storage.map.get(indexKey).body, corrupt);
      assert.equal(storage.map.get(originalKey).body, originalHTML);
      assert.equal(storage.map.get(revisionKey).body, revisionHTML);
      assert.equal(storage.map.get(otherKey).body, originalHTML);
    }
  }
  // Explicit original-index recovery must reinstate every original without
  // removing a legitimate revision or collapsing same-byte distinct uses.
  storage.map.set(indexKey, held);
  assert.equal((await call({ env: isolatedEnv, key })).status, 200);
  const restored = await call({ env: isolatedEnv, key, query: `?body=${revised.id}` });
  assert.equal(restored.status, 200);
  assert.equal(await restored.text(), revisionHTML);
  assert.equal(restored.headers.get('x-jm-body-integrity'), 'sha256-verified');
  const third = (await (await create('cp18-lineage-source-a',
    '<!doctype html><html><body>CP18 next valid revision</body></html>')).json()).body;
  assert.equal(third.previousVersionId, revised.id);
  const finalIndex = (await (await call({ env: isolatedEnv, key })).json()).bodies;
  assert.equal(finalIndex.length, 4);
  assert.equal(new Set(finalIndex.map(x => x.id)).size, 4);
}
console.log('PASS: CP18 dangling/self/cross-purpose/reordered ancestry holds all custody routes, restores exact originals and preserves revision inheritance.');


// CP19 portable exact-byte lineage export: a portable source packet needs
// all selected ancestry, verified source contents, bounded size, and no
// mutation, with a separate identity for each purposeful body.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const texts = [
    '<!doctype html><html><body>CP19 source alpha</body></html>',
    '<!doctype html><html><body>CP19 revision beta</body></html>',
    '<!doctype html><html><body>CP19 revision gamma</body></html>'
  ];
  const create = (sourceInstanceId, content) => call({ method: 'POST', env: isolatedEnv, key,
    body: { action: 'upload-body', body: { name: 'CP19', sourceInstanceId, content } } });
  const entries = [];
  for (const content of texts) {
    const response = await create('cp19-lineage-primary', content);
    assert.equal(response.status, 201);
    entries.push((await response.json()).body);
  }
  const other = (await (await create('cp19-different-purpose', texts[0])).json()).body;
  const url = `?mode=export-lineage&body=${entries[2].id}`;
  assert.equal((await call({ env: isolatedEnv, query: url })).status, 401,
    'Portable source packet must require the original private owner key');
  const before = [...storage.map.entries()].map(([k,v])=>[k, v.body]);
  const valid = await call({ env: isolatedEnv, key, query: url });
  assert.equal(valid.status, 200);
  assert.match(valid.headers.get('content-disposition'), /attachment/);
  assert.match(valid.headers.get('cache-control'), /no-store/);
  const exportPacket = await valid.json();
  assert.equal(exportPacket.schema, 'JM.OwnerVault/0.1.LineageExport');
  assert.equal(exportPacket.version_count, 3);
  assert.equal(exportPacket.selected_id, entries[2].id);
  assert.deepEqual(exportPacket.versions.map(x=>x.metadata.id),
    [entries[2].id, entries[1].id, entries[0].id]);
  assert.deepEqual(exportPacket.versions.map(x=>x.content), texts.slice().reverse());
  for (const { metadata, content } of exportPacket.versions) {
    assert.equal(fixtureEtag(content), metadata.sha256);
    assert.equal(new TextEncoder().encode(content).byteLength, metadata.bytes);
    assert.notEqual(metadata.id, other.id);
  }
  assert.deepEqual([...storage.map.entries()].map(([k,v])=>[k,v.body]), before,
    'Read-only exact export must leave the original index and body objects unchanged');
  const badId = await call({ env: isolatedEnv, key, query:'?mode=export-lineage&body=../../private' });
  assert.equal(badId.status, 400);
  const missing = await call({ env: isolatedEnv, key,
    query:'?mode=export-lineage&body=00000000-0000-4000-8000-000000009999' });
  assert.equal(missing.status, 404);
  const oldestKey = `jm-owner-vault/v0.1/bodies/${entries[0].id}.html`;
  const originalOldest = storage.map.get(oldestKey);
  storage.map.set(oldestKey, { ...originalOldest, body: texts[0] + '<!-- tampered -->' });
  const damaged = await call({ env: isolatedEnv, key, query:url });
  assert.equal(damaged.status, 409);
  assert.equal((await damaged.json()).error, 'BODY_INTEGRITY_MISMATCH');
  storage.map.set(oldestKey, originalOldest);
  const heldIndex = storage.map.get(indexKey);
  const index = JSON.parse(heldIndex.body);
  index.bodies.find(x=>x.id===entries[0].id).sha256 = null;
  storage.map.set(indexKey, { ...heldIndex, body: JSON.stringify(index,null,2) });
  const unverified = await call({ env: isolatedEnv, key, query:url });
  assert.equal(unverified.status, 409);
  assert.equal((await unverified.json()).error, 'LINEAGE_EXPORT_UNVERIFIED_LEGACY_SOURCE');
  storage.map.set(indexKey, heldIndex);
  // A valid 25 MiB single body is allowed as ordinary Vault source, but an
  // excessively large cumulative lineage packet is refused before copying.
  const huge = JSON.parse(heldIndex.body);
  huge.bodies.find(x=>x.id===entries[2].id).bytes = 25*1024*1024;
  huge.bodies.find(x=>x.id===entries[1].id).bytes = 25*1024*1024;
  storage.map.set(indexKey, { ...heldIndex, body: JSON.stringify(huge,null,2) });
  const tooLarge = await call({ env: isolatedEnv, key, query:url });
  assert.equal(tooLarge.status, 413);
  assert.equal((await tooLarge.json()).error, 'LINEAGE_EXPORT_BYTE_LIMIT');
  storage.map.set(indexKey, heldIndex);
  // Force a competing index commit while the export reads the original HTML.
  const get = storage.get.bind(storage);
  let changed = false;
  storage.get = async function(objectKey) {
    const snap = await get(objectKey);
    if (!changed && objectKey === oldestKey) {
      changed = true;
      const actual = this.map.get(indexKey);
      const altered = JSON.parse(actual.body);
      altered.updated_at = new Date(2030, 0, 1).toISOString();
      await this.put(indexKey, JSON.stringify(altered, null, 2));
    }
    return snap;
  };
  const racing = await call({ env: isolatedEnv, key, query:url });
  assert.equal(racing.status, 409);
  assert.equal((await racing.json()).error, 'PRIVATE_CONCURRENT_WRITE_CONFLICT');
  assert.equal(changed, true);
}
console.log('PASS: CP19 portable exact-byte lineage includes all protected ancestors, preserves distinct uses, rejects tamper/stale/unhashed/oversized exports and creates no new R2 records.');


// CP20 independently cold-recover the exact bytes from an owner-exportable
// CP19 packet. The child process receives ONLY a copied offline utility
// and saved packet: no R2, owner key, repo service, browser or Internet.
{
  const storage = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: storage };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const content = [
    '<!doctype html><html><body>CP20 sovereign beginning — 🥶</body></html>',
    '<!doctype html><html><body>CP20 edited descendant — ☀️</body></html>',
    '<!doctype html><html><body>CP20 final version — ✅</body></html>'
  ];
  const ids = [];
  for (const html of content) {
    const response = await call({ method: 'POST', env: isolatedEnv, key,
      body: { action:'upload-body', body: { name:'CP20', sourceInstanceId:'cp20-same-purpose', content:html } } });
    assert.equal(response.status, 201);
    ids.push((await response.json()).body.id);
  }
  const distinct = await call({ method:'POST', env:isolatedEnv, key,
    body: { action:'upload-body', body: {
      name:'Different purpose — same bytes', sourceInstanceId:'cp20-distinct-purpose',
      content:content[0] } } });
  assert.equal(distinct.status, 201);
  const otherId = (await distinct.json()).body.id;
  const delivered = await call({ env:isolatedEnv, key,
    query:`?mode=export-lineage&body=${ids[2]}` });
  assert.equal(delivered.status, 200);
  const packet = await delivered.json();
  const isolated = await fs.mkdtemp(path.join(tmpdir(),'jm-vault-cp20-'));
  const tool = new URL('./owner-vault-lineage-recover.mjs', import.meta.url);
  const copiedTool = path.join(isolated, 'owner-vault-lineage-recover.mjs');
  const packetFile = path.join(isolated, 'saved-lineage.json');
  const restoredDir = path.join(isolated, 'new-independent-restore');
  const run = (...arguments_) => spawnSync(process.execPath,
    [copiedTool, '--input', packetFile, ...arguments_],
    { cwd:isolated, encoding:'utf8', timeout:15000 });
  const assertHeld = (bad, expected, label) => {
    assert.notEqual(bad.status, 0, label);
    assert.match(bad.stderr, new RegExp(expected));
  };
  try {
    await fs.copyFile(tool, copiedTool);
    await fs.writeFile(packetFile, JSON.stringify(packet, null, 2));
    const verify = run('--verify-only');
    assert.equal(verify.status, 0, verify.stderr);
    assert.equal(JSON.parse(verify.stdout).version_count, 3);
    assert.equal(JSON.parse(verify.stdout).remote_vault_modified, false);
    const cold = run('--output-dir', restoredDir);
    assert.equal(cold.status, 0, cold.stderr);
    const receipt = JSON.parse(cold.stdout);
    assert.equal(receipt.outcome, 'OFFLINE_SOURCE_RECOVERED');
    assert.equal(receipt.version_count, 3);
    assert.equal(receipt.owner_offsite_custody_claimed, false);
    const local = JSON.parse(await fs.readFile(path.join(restoredDir,'recovery-manifest.json'),'utf8'));
    assert.equal(local.selected_id, ids[2]);
    assert.equal(local.original_versions.length, 3);
    assert.equal(local.original_versions.some(x=>x.id===otherId), false);
    for (let i=0;i<ids.length;i++) {
      const onDisk = await fs.readFile(path.join(restoredDir,ids[i]+'.html'),'utf8');
      assert.equal(onDisk,content[i]);
      assert.equal(fixtureEtag(onDisk),local.original_versions.find(x=>x.id===ids[i]).sha256);
    }
    // CP21: audit the persisted recovery using a NEW CLI process.
    // This is independent of the in-memory R2 fixture and is read-only.
    const audited = run('--audit-dir',restoredDir);
    assert.equal(audited.status,0,audited.stderr);
    assert.equal(JSON.parse(audited.stdout).outcome,'OFFLINE_RESTORED_FILES_AUDITED');
    assert.equal(JSON.parse(audited.stdout).version_count,3);
    const recoveredFirst = path.join(restoredDir,ids[0]+'.html');
    await fs.appendFile(recoveredFirst,'<!-- offline tamper -->');
    const alteredSource = run('--audit-dir',restoredDir);
    assertHeld(alteredSource,'LINEAGE_AUDIT_SOURCE_MISMATCH','CP21 altered recovered HTML');
    await fs.writeFile(recoveredFirst,content[0]);
    assert.equal(run('--audit-dir',restoredDir).status,0);
    const manifestPath = path.join(restoredDir,'recovery-manifest.json');
    const manifestOriginal = await fs.readFile(manifestPath,'utf8');
    const wrongManifest = JSON.parse(manifestOriginal);
    wrongManifest.packet_sha256='0'.repeat(64);
    await fs.writeFile(manifestPath,JSON.stringify(wrongManifest));
    assertHeld(run('--audit-dir',restoredDir),'LINEAGE_AUDIT_MANIFEST_MISMATCH',
      'CP21 altered recovery manifest');
    await fs.writeFile(manifestPath,manifestOriginal);
    // CP24: prior audit checked only selected fields and accepted forged
    // offsite/deployment claims or extra unverified success fields.
    const forgedBoundary = JSON.parse(manifestOriginal);
    forgedBoundary.boundary = 'FALSE_CLAIM: OFFSITE_CUSTODY_AND_DEPLOYMENT_PROVED';
    await fs.writeFile(manifestPath,JSON.stringify(forgedBoundary,null,2)+'\n');
    assertHeld(run('--audit-dir',restoredDir),'LINEAGE_AUDIT_MANIFEST_MISMATCH',
      'CP24 altered custody boundary must fail cold audit');
    await fs.writeFile(manifestPath,manifestOriginal);
    const injectedClaim = JSON.parse(manifestOriginal);
    injectedClaim.owner_device_restore_verified = true;
    await fs.writeFile(manifestPath,JSON.stringify(injectedClaim,null,2)+'\n');
    assertHeld(run('--audit-dir',restoredDir),'LINEAGE_AUDIT_MANIFEST_MISMATCH',
      'CP24 injected external-access success claim must fail cold audit');
    await fs.writeFile(manifestPath,manifestOriginal);
    assert.equal(run('--audit-dir',restoredDir).status,0,
      'CP24 exact manifest restored without altering any original source');
    console.log('PASS: CP24 exact offline manifest rejects forged custody boundary and injected owner-device success claim; authentic original cold audit restored.');
    const unexpectedFile = path.join(restoredDir,'extra-unverified.html');
    await fs.writeFile(unexpectedFile,'unrelated');
    assertHeld(run('--audit-dir',restoredDir),'LINEAGE_AUDIT_INVENTORY_MISMATCH',
      'CP21 extra unverified source');
    await fs.rm(unexpectedFile);
    const linkedDirectory = path.join(isolated,'linked-restored');
    await fs.symlink(restoredDir,linkedDirectory,'dir');
    assertHeld(run('--audit-dir',linkedDirectory),'LINEAGE_AUDIT_DIRECTORY_UNSAFE',
      'CP21 symlinked recovery directory');
    // CP23: a NORMAL final parent/directory can still sit behind a symlink
    // ancestor. Neither a restore nor a read-only audit may follow it.
    const linkedAncestor = path.join(isolated, 'linked-ancestor');
    const normalParent = path.join(isolated, 'normal-parent');
    await fs.mkdir(normalParent);
    await fs.symlink(isolated, linkedAncestor, 'dir');
    // Immediate parent is a normal directory: only the ANCESTOR is linked.
    const redirectedNew = path.join(linkedAncestor, 'normal-parent', 'must-not-create');
    assertHeld(run('--output-dir', redirectedNew), 'LINEAGE_PATH_COMPONENT_UNSAFE',
      'CP23 symlink ancestor must block source materialization');
    await assert.rejects(fs.lstat(path.join(normalParent, 'must-not-create')), /ENOENT/,
      'CP23 must not create bytes through a redirected ancestor');
    assertHeld(run('--audit-dir', path.join(linkedAncestor, path.basename(restoredDir))),
      'LINEAGE_PATH_COMPONENT_UNSAFE',
      'CP23 symlink ancestor must block false cold-audit success');
    // CP27: CP26 O_NOFOLLOW protects only the final input component. A
    // symlinked parent must never redirect packet reads in ANY CLI mode.
    const redirectedPacket = path.join(linkedAncestor, 'saved-lineage.json');
    const runWithInput = (source, ...arguments_) => spawnSync(process.execPath,
      [copiedTool, '--input', source, ...arguments_],
      { cwd:isolated, encoding:'utf8', timeout:15000 });
    const rejectedOutput = path.join(isolated, 'cp27-must-not-create');
    assertHeld(runWithInput(redirectedPacket, '--verify-only'),
      'LINEAGE_PATH_COMPONENT_UNSAFE', 'CP27 verify-only redirected packet');
    assertHeld(runWithInput(redirectedPacket, '--output-dir', rejectedOutput),
      'LINEAGE_PATH_COMPONENT_UNSAFE', 'CP27 restore redirected packet');
    assertHeld(runWithInput(redirectedPacket, '--audit-dir', restoredDir),
      'LINEAGE_PATH_COMPONENT_UNSAFE', 'CP27 audit redirected packet');
    await assert.rejects(fs.lstat(rejectedOutput), /ENOENT/,
      'CP27 refused input must not create any recovered source');
    assert.equal(run('--verify-only').status, 0,
      'CP27 normal packet still verifies');
    assert.equal(run('--audit-dir',restoredDir).status,0);
    console.log('PASS: CP27 packet input symlink ancestors refuse verify, restore and audit without creating files; normal cold audit survives.');
    const snapshots = [...storage.map.entries()].map(([k,v])=>[k,v.body]);
    const again = run('--output-dir',restoredDir);
    assertHeld(again,'EEXIST','Cannot replace owner-existing recovery directory');
    assert.equal(await fs.readFile(path.join(restoredDir,ids[0]+'.html'),'utf8'),content[0]);
    const corruption = [
      ['damaged-original-source', p=>{p.versions[2].content+='<!-- adversarial -->';},
        'LINEAGE_EXACT_SOURCE_INTEGRITY_FAILED'],
      ['unverified-source', p=>{p.versions[1].metadata.sha256=null;},
        'LINEAGE_IDENTITY_OR_METADATA_INVALID'],
      ['incomplete-ancestry', p=>{p.versions.pop();p.version_count--;},
        'LINEAGE_CHAIN_OR_TOTAL_INCOMPLETE'],
      ['cross-purpose-ancestry', p=>{p.versions[1].metadata.sourceInstanceId='another-purpose';},
        'LINEAGE_CROSS_PURPOSE_ANCESTOR_REFUSED'],
      ['malicious-native-id', p=>{p.versions[0].metadata.id='../../outside';p.selected_id='../../outside';},
        'LINEAGE_PACKET_SCHEMA_OR_SIZE_INVALID'],
      ['overbroad-versions', p=>{p.versions=Array.from({length:17},()=>p.versions[0]);p.version_count=17;},
        'LINEAGE_PACKET_SCHEMA_OR_SIZE_INVALID'],
      ['wrong-source-byte-count', p=>{p.versions[0].metadata.bytes+=1;},
        'LINEAGE_EXACT_SOURCE_INTEGRITY_FAILED'],
      ['wrong-total', p=>{p.source_bytes+=1;},
        'LINEAGE_CHAIN_OR_TOTAL_INCOMPLETE'],
      ['wrong-original-order', p=>{p.versions.reverse();},
        'LINEAGE_IDENTITY_OR_METADATA_INVALID']
    ];
    for (const [label,alter,reason] of corruption) {
      const candidate=structuredClone(packet);
      alter(candidate);
      await fs.writeFile(packetFile, JSON.stringify(candidate));
      const dest=path.join(isolated, 'no-output-'+label);
      const denied=run('--output-dir',dest);
      assertHeld(denied,reason,label);
      await assert.rejects(fs.lstat(dest),/ENOENT/,
        label+': rejected packet must not create an output directory');
    }
    await fs.writeFile(packetFile, JSON.stringify(packet));
    await fs.symlink(packetFile,path.join(isolated,'symlinked-input.json'));
    const deniedLink = spawnSync(process.execPath,
      [copiedTool,'--input',path.join(isolated,'symlinked-input.json'),'--verify-only'],
      {cwd:isolated,encoding:'utf8',timeout:15000});
    assertHeld(deniedLink,'LINEAGE_INPUT_NOT_REGULAR_OR_OVERBOUNDED',
      'Symlinked incoming source cannot be accepted as a direct owner packet');
    assert.deepEqual([...storage.map.entries()].map(([k,v])=>[k,v.body]),snapshots,
      'Offline recovery must not contact or change original Vault R2');
    assert.equal((await fs.readdir(restoredDir)).length,4,
      'Three original source files plus one metadata receipt, no duplicated works');
  } finally {
    await fs.rm(isolated,{recursive:true,force:true});
  }
}
console.log('PASS: CP20 independently cold-recover three exact HTML ancestors using a copied no-network CLI, refuse nine hostile packets and pre-existing destination, preserve distinct source uses.');


// CP22 partial-recovery safety: failed writes must never recursively erase
// exact original source bytes, unrelated files, or a replaced destination.
// Test the same cleanup routine used by the offline recovery CLI.
{
  const { cleanupEmptyFailedRecovery } = await import('./owner-vault-lineage-recover.mjs');
  const root = await fs.mkdtemp(path.join(tmpdir(), 'jm-vault-cp22-'));
  try {
    const partial = path.join(root, 'partial-recovery');
    await fs.mkdir(partial);
    const originalIdentity = await fs.lstat(partial);
    const sentinel = path.join(partial, 'owner-original.html');
    const sourceBytes = '<!doctype html><html><body>Protected original</body></html>';
    await fs.writeFile(sentinel, sourceBytes);
    assert.equal(await cleanupEmptyFailedRecovery(partial, originalIdentity),
      'PARTIAL_RECOVERY_PRESERVED_FOR_OWNER');
    assert.equal(await fs.readFile(sentinel, 'utf8'), sourceBytes);
    assert.equal((await fs.lstat(partial)).ino, originalIdentity.ino);

    const empty = path.join(root, 'empty-failed-recovery');
    await fs.mkdir(empty);
    const emptyIdentity = await fs.lstat(empty);
    assert.equal(await cleanupEmptyFailedRecovery(empty, emptyIdentity),
      'EMPTY_FAILED_RECOVERY_REMOVED');
    await assert.rejects(fs.lstat(empty), /ENOENT/);

    const replaced = path.join(root, 'replaced-destination');
    await fs.mkdir(replaced);
    const oldIdentity = await fs.lstat(replaced);
    await fs.rename(replaced, path.join(root, 'original-destination-moved'));
    const replacement = path.join(root, 'real-owner-directory');
    await fs.mkdir(replacement);
    const unrelated = path.join(replacement, 'unrelated-owner-data.txt');
    await fs.writeFile(unrelated, 'never remove unrelated bytes');
    await fs.symlink(replacement, replaced, 'dir');
    assert.equal(await cleanupEmptyFailedRecovery(replaced, oldIdentity),
      'DESTINATION_IDENTITY_CHANGED_PRESERVED');
    assert.equal(await fs.readFile(unrelated, 'utf8'), 'never remove unrelated bytes');

    const different = path.join(root, 'different-real-directory');
    await fs.mkdir(different);
    const firstIdentity = await fs.lstat(different);
    await fs.rename(different, path.join(root, 'moved-original-directory'));
    await fs.mkdir(different);
    assert.equal(await cleanupEmptyFailedRecovery(different, firstIdentity),
      'DESTINATION_IDENTITY_CHANGED_PRESERVED');
    assert.equal((await fs.lstat(different)).isDirectory(), true);
  } finally {
    await fs.rm(root, { recursive: true, force: true }); // Disposable synthetic test fixture ONLY.
  }
}
console.log('PASS: CP22 interrupted offline recovery preserves partial source, unrelated files and redirected destinations; only its own empty directory is retired.');
// CP25 durability gate: exact readback does not prove that new source bytes,
// manifest and directory entries survived a crash. Exercise the same file and
// directory fsync helpers used by the real offline recovery path. Synthetic
// opener is restricted to this test; no owner files or credentials involved.
{
  const { writeDurableNewFile, syncRecoveryDirectory } =
    await import('./owner-vault-lineage-recover.mjs');
  const calls = [];
  const opener = async (name, flag, mode) => {
    calls.push(['open', name, flag, mode]);
    return {
      writeFile: async data => calls.push(['write', Buffer.from(data).toString()]),
      sync: async () => calls.push(['sync']),
      close: async () => calls.push(['close'])
    };
  };
  await writeDurableNewFile('synthetic-source.html', Buffer.from('original'), opener);
  assert.deepEqual(calls, [
    ['open', 'synthetic-source.html', 'wx', 0o600],
    ['write', 'original'], ['sync'], ['close']
  ], 'CP25 source creation must be exclusive/private, flushed and closed');
  const failedCalls = [];
  await assert.rejects(
    writeDurableNewFile('synthetic-receipt.json', Buffer.from('{}'),
      async () => ({
        writeFile: async () => failedCalls.push('write'),
        sync: async () => { failedCalls.push('sync'); throw Error('SYNTHETIC_FILE_FSYNC_FAILURE'); },
        close: async () => failedCalls.push('close')
      })),
    /SYNTHETIC_FILE_FSYNC_FAILURE/,
    'CP25 failed file fsync must never return a success acknowledgement');
  assert.deepEqual(failedCalls, ['write', 'sync', 'close']);
  const dirFlags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_DIRECTORY;
  const dirCalls = [];
  const dirOpen = async (name, flag) => {
    dirCalls.push(['open', name, flag]);
    return {
      stat: async () => ({ isDirectory: () => true }),
      sync: async () => dirCalls.push(['sync']),
      close: async () => dirCalls.push(['close'])
    };
  };
  await syncRecoveryDirectory('synthetic-directory', dirOpen);
  assert.deepEqual(dirCalls, [
    ['open', 'synthetic-directory', dirFlags], ['sync'], ['close']
  ]);
  const refused = [];
  await assert.rejects(syncRecoveryDirectory('synthetic-directory',
    async () => ({
      stat: async () => ({ isDirectory: () => true }),
      sync: async () => { throw Error('SYNTHETIC_DIRECTORY_FSYNC_FAILURE'); },
      close: async () => refused.push('close')
    })), /SYNTHETIC_DIRECTORY_FSYNC_FAILURE/);
  assert.deepEqual(refused, ['close'], 'CP25 must close failed directory sync handle');
  await assert.rejects(syncRecoveryDirectory('synthetic-not-a-directory',
    async () => ({
      stat: async () => ({ isDirectory: () => false }),
      sync: async () => { throw Error('MUST_NOT_SYNC_NON_DIRECTORY'); },
      close: async () => {}
    })), /LINEAGE_DIRECTORY_SYNC_UNSAFE/);
  // CP29: refuse an actual symlinked directory, even when the earlier
  // lstat preflight saw a genuine directory. No owner files are involved.
  const root = await fs.mkdtemp(path.join(tmpdir(), 'jm-vault-cp29-'));
  try {
    const real = path.join(root, 'original-directory');
    const moved = path.join(root, 'moved-original-directory');
    const link = path.join(root, 'redirected-directory');
    await fs.mkdir(real);
    const original = await fs.lstat(real);
    await fs.symlink(real, link, 'dir');
    await assert.rejects(syncRecoveryDirectory(link, fs.open, original),
      /ELOOP|ENOTDIR|LINEAGE_DIRECTORY_SYNC_UNSAFE/,
      'CP29 cannot sync a substituted final-component directory symlink');
    await fs.rename(real, moved);
    await fs.mkdir(real);
    await assert.rejects(syncRecoveryDirectory(real, fs.open, original),
      /LINEAGE_DIRECTORY_SYNC_UNSAFE/,
      'CP29 cannot accept a newly substituted directory inode');
    await syncRecoveryDirectory(moved, fs.open, original);
  } finally {
    await fs.rm(root, { recursive: true, force: true }); // Synthetic test only.
  }
  let wrongIdentitySynced = false, wrongIdentityClosed = false;
  await assert.rejects(syncRecoveryDirectory('synthetic-directory',
    async (_name, flags) => {
      assert.equal(flags, dirFlags, 'CP29 requires no-follow opened directory flags');
      return {
        stat: async () => ({ isDirectory: () => true, dev: 9, ino: 9 }),
        sync: async () => { wrongIdentitySynced = true; },
        close: async () => { wrongIdentityClosed = true; }
      };
    }, { dev: 8, ino: 9 }), /LINEAGE_DIRECTORY_SYNC_UNSAFE/);
  assert.equal(wrongIdentitySynced, false, 'CP29 must refuse before fsync');
  assert.equal(wrongIdentityClosed, true, 'CP29 must close substituted handle');
}
console.log('PASS: CP25/CP29 durable source/receipt writes, no-follow directory fsync and identity-bound refusal.');


// CP26: opening by path AFTER lstat/readdir could follow a substituted final
// symlink into unrelated owner data. The opened handle must be regular,
// bounded and O_NOFOLLOW; all failures must close the handle.
{
  const { readBoundedRegularFile } = await import('./owner-vault-lineage-recover.mjs');
  const root = await fs.mkdtemp(path.join(tmpdir(), 'jm-vault-cp26-'));
  try {
    const original = path.join(root, 'original.html');
    const link = path.join(root, 'substituted.html');
    await fs.writeFile(original, 'abc');
    await fs.symlink(original, link);
    assert.equal((await readBoundedRegularFile(original, 3)).toString(), 'abc');
    await assert.rejects(readBoundedRegularFile(link, 3), /ELOOP|LINEAGE_OPENED_FILE_UNSAFE/,
      'CP26 final-component symlink must not be followed to another source');
    await assert.rejects(readBoundedRegularFile(original, 2),
      /LINEAGE_OPENED_FILE_UNSAFE_OR_OVERBOUNDED/,
      'CP26 oversized opened file cannot bypass packet/source limit');
    await assert.rejects(readBoundedRegularFile(root, 100),
      /LINEAGE_OPENED_FILE_UNSAFE_OR_OVERBOUNDED/,
      'CP26 opened directory must not be mistaken for source');
    let flagsSeen = 0, closed = false, injectedReadDone = false;
    const injected = await readBoundedRegularFile('synthetic', 3, async (_name, flags) => {
      flagsSeen = flags;
      return {
        stat: async () => ({ isFile: () => true, size: 3 }),
        read: async (buffer, _offset, _length) => {
          if (injectedReadDone) return { bytesRead: 0 };
          Buffer.from('abc').copy(buffer);
          injectedReadDone = true;
          return { bytesRead: 3 };
        },
        close: async () => { closed = true; }
      };
    });
    assert.equal(injected.toString(), 'abc');
    assert.ok((flagsSeen & fsConstants.O_NOFOLLOW) !== 0,
      'CP26 final symlink refusal must be enforced by the actual open');
    assert.ok((flagsSeen & fsConstants.O_NONBLOCK) !== 0,
      'CP26 changed-to-FIFO source must not hang the offline reader');
    assert.equal(closed, true);
    let closedOnFailure = false;
    await assert.rejects(readBoundedRegularFile('synthetic', 3, async () => ({
      stat: async () => ({ isFile: () => false, size: 0 }),
      readFile: async () => { throw Error('MUST_NOT_READ_NONFILE'); },
      close: async () => { closedOnFailure = true; }
    })), /LINEAGE_OPENED_FILE_UNSAFE_OR_OVERBOUNDED/);
    assert.equal(closedOnFailure, true, 'CP26 must close unsafe opened handles');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
console.log('PASS: CP26 bounded O_NOFOLLOW/O_NONBLOCK opened-file custody rejects final symlinks, directories, oversize and closes failed handles.');


// CP28: a source may grow after opened-handle stat. Never use readFile()
// (unbounded allocation) or request more than maxBytes + 1 in total.
{
  const { readBoundedRegularFile } = await import('./owner-vault-lineage-recover.mjs');
  let calls = 0, closed = false;
  const capped = await readBoundedRegularFile('synthetic', 3, async () => ({
    stat: async () => ({ isFile: () => true, size: 3 }),
    readFile: async () => { throw Error('CP28_UNBOUNDED_READ_FORBIDDEN'); },
    read: async (buffer, offset, length) => {
      assert.ok(length <= 4, 'CP28 cannot request more than maxBytes + 1');
      if (calls++ === 0) {
        Buffer.from('abc').copy(buffer, offset);
        return { bytesRead: 3 };
      }
      return { bytesRead: 0 };
    },
    close: async () => { closed = true; }
  }));
  assert.equal(capped.toString(), 'abc');
  assert.equal(closed, true, 'CP28 must close successful source handles');
  let growingReads = 0, growingClosed = false;
  await assert.rejects(readBoundedRegularFile('growing', 3, async () => ({
    stat: async () => ({ isFile: () => true, size: 3 }),
    readFile: async () => { throw Error('CP28_UNBOUNDED_READ_FORBIDDEN'); },
    read: async (buffer, offset, length) => {
      assert.ok(length <= 4, 'CP28 read request must be bounded');
      const data = growingReads++ === 0 ? 'abc' : 'x';
      Buffer.from(data).copy(buffer, offset);
      return { bytesRead: data.length };
    },
    close: async () => { growingClosed = true; }
  })), /LINEAGE_OPENED_FILE_OVERBOUNDED/);
  assert.equal(growingClosed, true, 'CP28 must close growing-file handles');
  let zeroReads = 0;
  const empty = await readBoundedRegularFile('empty', 0, async () => ({
    stat: async () => ({ isFile: () => true, size: 0 }),
    read: async (_buffer, _offset, length) => {
      assert.equal(length, 1);
      zeroReads++;
      return { bytesRead: 0 };
    },
    close: async () => {}
  }));
  assert.equal(empty.length, 0);
  assert.equal(zeroReads, 1);
}
console.log('PASS: CP28 opened-file bounded incremental read refuses post-stat growth without unbounded readFile allocation and closes handles.');


// CP21: the original Owner Vault must carry real file bytes, never HTML
// wrappers, without merging separately intended files or erasing ancestors.
{
  const original = Buffer.from([0, 255, 128, 0, 13, 10, 226, 130, 172]);
  const changed = Buffer.from([0, 255, 128, 0, 13, 10, 226, 130, 173]);
  const assetKey = 'asset-00000000-0000-4000-8000-000000000101';
  const otherKey = 'asset-00000000-0000-4000-8000-000000000102';
  const digest = b => createHash('sha256').update(b).digest('hex');
  const assetEnv = { JM_OWNER_VAULT: new FakeR2(), JM_OWNER_VAULT_KEY: 'cp21-local-key' };
  const invoke = (method, query, body, key=assetEnv.JM_OWNER_VAULT_KEY) =>
    call({ method, query, body, key, env: assetEnv });
  const write = async (data, sourceInstanceId=assetKey, opts={}) => {
    const r = await invoke('POST', '', { action: 'upload-asset',
      file: { name: 'Original JM Audio', fileName: 'recording.wav', mediaType: 'audio/wav',
        sourceInstanceId, sha256: digest(data), base64: data.toString('base64'), ...opts } });
    return r;
  };
  const denied = await invoke('GET', '?mode=assets', undefined, 'wrong');
  assert.equal(denied.status, 401, 'asset index remains owner-authenticated');
  const first = await write(original);
  assert.equal(first.status, 201);
  const firstReceipt = (await first.json()).asset;
  assert.equal(firstReceipt.previousVersionId, null);
  assert.equal(firstReceipt.bytes, original.length);
  const object = assetEnv.JM_OWNER_VAULT.map.get('jm-owner-vault/v0.1/assets/' + firstReceipt.id + '.bin');
  assert.ok(Buffer.isBuffer(object.body), 'actual R2 object stores binary bytes, not base64/HTML text');
  assert.deepEqual(object.body, original);
  const download = await invoke('GET', '?asset=' + firstReceipt.id);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('x-jm-asset-sha256'), digest(original));
  assert.match(download.headers.get('content-disposition') || '', /attachment/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), original);

  const same = await write(original);
  assert.equal(same.status, 200);
  assert.equal((await same.json()).asset.id, firstReceipt.id);
  const distinct = await write(original, otherKey);
  assert.equal(distinct.status, 201);
  assert.notEqual((await distinct.json()).asset.id, firstReceipt.id,
    'same bytes for a different purpose cannot collapse');

  const wrongHead = await write(changed, assetKey, {
    expectedBaseId: '00000000-0000-4000-8000-000000000999', expectedBaseSha256: digest(original)
  });
  assert.equal(wrongHead.status, 409);
  const noPrecondition = await write(changed);
  assert.equal(noPrecondition.status, 409, 'revisions require expected current head');
  const badHash = await invoke('POST', '', { action: 'upload-asset',
    file: { sourceInstanceId: assetKey, base64: original.toString('base64'),
      sha256: '0'.repeat(64), fileName: 'fake.wav' } });
  assert.equal(badHash.status, 409);

  const revision = await write(changed, assetKey,
    { expectedBaseId: firstReceipt.id, expectedBaseSha256: digest(original) });
  assert.equal(revision.status, 201);
  const latest = (await revision.json()).asset;
  assert.equal(latest.previousVersionId, firstReceipt.id);
  assert.deepEqual(Buffer.from(await (await invoke('GET', '?asset=' + firstReceipt.id)).arrayBuffer()), original);
  assert.deepEqual(Buffer.from(await (await invoke('GET', '?asset=' + latest.id)).arrayBuffer()), changed);
  const index = await (await invoke('GET', '?mode=assets')).json();
  assert.equal(index.assets.length, 3);
  assert.equal(index.max_asset_bytes, 12 * 1024 * 1024);
  assert.equal((await invoke('DELETE', '?asset=' + firstReceipt.id)).status, 409,
    'protected ancestor must not be deleted before descendants');
  const remove = await invoke('DELETE', '?asset=' + latest.id);
  assert.equal(remove.status, 200);
  assert.equal((await remove.json()).outcome, 'ASSET_REMOVED');
  assert.deepEqual(Buffer.from(await (await invoke('GET', '?asset=' + firstReceipt.id)).arrayBuffer()), original);
  assert.equal((await (await invoke('GET', '?mode=assets')).json()).assets.length, 2);

  const damaged = assetEnv.JM_OWNER_VAULT.map.get('jm-owner-vault/v0.1/assets/' + firstReceipt.id + '.bin');
  damaged.body[0] ^= 1;
  const corruptDownload = await invoke('GET', '?asset=' + firstReceipt.id);
  assert.equal(corruptDownload.status, 409, 'tampered binary is not returned');
  assert.equal((await corruptDownload.json()).error, 'ASSET_INTEGRITY_MISMATCH');
  damaged.body[0] ^= 1;

  const indexKey = 'jm-owner-vault/v0.1/assets/index.json';
  const prior = assetEnv.JM_OWNER_VAULT.map.get(indexKey);
  const originalMetadata = prior.body;
  assetEnv.JM_OWNER_VAULT.map.set(indexKey, { ...prior, body: '{broken-json' });
  assert.equal((await invoke('GET', '?mode=assets')).status, 503);
  assert.equal((await write(Buffer.from([33]), 'asset-00000000-0000-4000-8000-000000000103')).status, 503,
    'corrupt custody index must block new writes without replacing private originals');
  assert.equal(assetEnv.JM_OWNER_VAULT.map.get(indexKey).body, '{broken-json');
  assetEnv.JM_OWNER_VAULT.map.set(indexKey, { ...prior, body: originalMetadata });
  assert.deepEqual(Buffer.from(await (await invoke('GET', '?asset=' + firstReceipt.id)).arrayBuffer()), original);
  // Old HTML/body registry, notes and state remain independent of asset index.
  const htmlIndex = await invoke('GET', '');
  assert.equal(htmlIndex.status, 200);
  assert.equal((await htmlIndex.json()).bodies.length, 0);
  console.log('PASS: CP21 original multi-format binary bytes, auth, distinct identity, guarded revision, exact device recovery, tamper HOLD, ancestor custody and HTML non-regression.');
}



// CP22: original binary lineage must be cold-recoverable with the EXISTING
// CP20 offline utility, after an explicit owner-only read-only export.
// Test starts the offline utility in a separate isolated process without R2,
// owner credentials, an app, cloud account, or a public source repository.
{
  const storage = new FakeR2();
  const privateEnv = { JM_OWNER_VAULT: storage, JM_OWNER_VAULT_KEY: 'synthetic-local-cp22' };
  const invoke = ({method='GET', query='', body, key=privateEnv.JM_OWNER_VAULT_KEY}={}) =>
    call({method,query,body,key,env:privateEnv});
  const sourceId = 'asset-00000000-0000-4000-8000-000000000221';
  const otherId = 'asset-00000000-0000-4000-8000-000000000222';
  const byteSets = [
    Buffer.from([0,255,128,13,10,226,130,172]),
    Buffer.from([0,255,128,13,10,226,130,173]),
    Buffer.from([0,255,128,13,10,226,130,174])
  ];
  const hashes = byteSets.map(b=>createHash('sha256').update(b).digest('hex'));
  const ids = [];
  for (let i=0;i<byteSets.length;i++) {
    const r=await invoke({method:'POST',body:{action:'upload-asset',file:{
      name:'CP22 original composition',fileName:'original-project.wav',mediaType:'audio/wav',
      sourceInstanceId:sourceId,sha256:hashes[i],base64:byteSets[i].toString('base64'),
      ...(i?{expectedBaseId:ids[i-1],expectedBaseSha256:hashes[i-1]}:{})
    }}});
    assert.equal(r.status,201);
    ids.push((await r.json()).asset.id);
  }
  const distinct=await invoke({method:'POST',body:{action:'upload-asset',file:{
    name:'same file; distinct original use',fileName:'other.wav',mediaType:'audio/wav',
    sourceInstanceId:otherId,sha256:hashes[0],base64:byteSets[0].toString('base64')
  }}});
  assert.equal(distinct.status,201);
  const distinctId=(await distinct.json()).asset.id;
  const query='?mode=export-asset-lineage&asset='+ids[2];
  assert.equal((await invoke({query,key:'wrong-owner-key'})).status,401);
  const before=[...storage.map.entries()].map(([k,v])=>[k,Buffer.isBuffer(v.body)?v.body.toString('hex'):v.body]);
  const delivered=await invoke({query});
  assert.equal(delivered.status,200);
  assert.match(delivered.headers.get('content-disposition')||'',/attachment/);
  const packet=await delivered.json();
  assert.equal(packet.schema,'JM.OwnerVault/0.1.AssetLineageExport');
  assert.equal(packet.version_count,3);
  assert.equal(packet.source_bytes,byteSets.reduce((a,b)=>a+b.length,0));
  assert.deepEqual(packet.versions.map(v=>v.metadata.id),[...ids].reverse());
  assert.equal(packet.versions.some(v=>v.metadata.id===distinctId),false);
  assert.deepEqual(
    [...storage.map.entries()].map(([k,v])=>[k,Buffer.isBuffer(v.body)?v.body.toString('hex'):v.body]),before,
    'read-only recovery export may not mutate the original R2 custody');
  const isolated=await fs.mkdtemp(path.join(tmpdir(),'jm-vault-asset-cp22-'));
  const tool=path.join(isolated,'owner-vault-lineage-recover.mjs');
  const saved=path.join(isolated,'owner-export.json');
  const destination=path.join(isolated,'cold-originals');
  const run=(...args)=>spawnSync(process.execPath,[tool,'--input',saved,...args],
    {cwd:isolated,encoding:'utf8',timeout:20000});
  const rejects=(changed, expected) => {
    assert.notEqual(changed.status,0,'invalid source must be rejected');
    assert.match(changed.stderr,new RegExp(expected));
  };
  try {
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),tool);
    await fs.writeFile(saved,JSON.stringify(packet,null,2));
    const verified=run('--verify-only');
    assert.equal(verified.status,0,verified.stderr);
    assert.equal(JSON.parse(verified.stdout).kind,'ORIGINAL_BINARY_ASSET');
    const restored=run('--output-dir',destination);
    assert.equal(restored.status,0,restored.stderr);
    assert.equal(JSON.parse(restored.stdout).kind,'ORIGINAL_BINARY_ASSET');
    for(let i=0;i<ids.length;i++){
      assert.deepEqual(await fs.readFile(path.join(destination,ids[i]+'__original-project.wav')),byteSets[i]);
    }
    const diskReceipt=JSON.parse(await fs.readFile(path.join(destination,'recovery-manifest.json'),'utf8'));
    assert.equal(diskReceipt.original_schema,'JM.OwnerVault/0.1.AssetLineageExport');
    assert.equal(diskReceipt.original_versions.length,3);
    assert.equal(diskReceipt.original_versions.some(v=>v.id===distinctId),false);
    const audit=run('--audit-dir',destination);
    assert.equal(audit.status,0,audit.stderr);
    assert.equal(JSON.parse(audit.stdout).outcome,'OFFLINE_RESTORED_FILES_AUDITED');
    assert.equal(JSON.parse(audit.stdout).kind,'ORIGINAL_BINARY_ASSET');
    rejects(run('--output-dir',destination),'EEXIST');
    const binary=path.join(destination,ids[0]+'__original-project.wav');
    await fs.writeFile(binary,Buffer.from([0,0,0,0,0,0,0,0]));
    rejects(run('--audit-dir',destination),'LINEAGE_AUDIT_SOURCE_MISMATCH');
    await fs.writeFile(binary,byteSets[0]);
    assert.equal(run('--audit-dir',destination).status,0);

    const adversarial=[
      ['tampered-binary',p=>{p.versions[1].base64=Buffer.from('false-content').toString('base64');},'ASSET_LINEAGE_EXACT_BINARY_INTEGRITY_FAILED'],
      ['missing-ancestor',p=>{p.versions.pop();p.version_count=2;},'ASSET_LINEAGE_INCOMPLETE_OR_TOTAL_WRONG'],
      ['false-use',p=>{p.versions[1].metadata.sourceInstanceId=otherId;},'ASSET_LINEAGE_CROSS_PURPOSE_REFUSED'],
      ['bad-id',p=>{p.versions[0].metadata.id='not-a-uuid';},'ASSET_LINEAGE_IDENTITY_OR_ENCODING_INVALID'],
      ['bad-padding',p=>{p.versions[0].base64+='!';},'ASSET_LINEAGE_IDENTITY_OR_ENCODING_INVALID'],
      ['wrong-total',p=>{p.source_bytes+=1;},'ASSET_LINEAGE_INCOMPLETE_OR_TOTAL_WRONG'],
      ['extra-version',p=>{p.versions.push(p.versions[2]);p.version_count=4;},'ASSET_LINEAGE_IDENTITY_OR_ENCODING_INVALID']
    ];
    for (const [name,mutate,expected] of adversarial) {
      const corrupted=structuredClone(packet);mutate(corrupted);
      await fs.writeFile(saved,JSON.stringify(corrupted));
      rejects(run('--verify-only'),expected);
      const shouldNotExist=path.join(isolated,'reject-'+name);
      rejects(run('--output-dir',shouldNotExist),expected);
      await assert.rejects(fs.lstat(shouldNotExist),/ENOENT/);
    }
    await fs.writeFile(saved,JSON.stringify(packet,null,2));
    assert.equal(run('--audit-dir',destination).status,0);
    const damaged=storage.map.get('jm-owner-vault/v0.1/assets/'+ids[0]+'.bin');
    damaged.body[0]^=1;
    const refused=await invoke({query});
    assert.equal(refused.status,409,'tampered R2 ancestor must refuse portable backup');
    assert.equal((await refused.json()).error,'ASSET_INTEGRITY_MISMATCH');
    damaged.body[0]^=1;
    console.log('PASS: CP22 exact offline original binary chain cold-recovered, independently audited, read-only export, cross-purpose and tamper refused without credentials or web host.');
  } finally {
    // Temporary synthetic test fixtures only; no owner vault/source deletion.
    await fs.rm(isolated,{recursive:true,force:true});
  }
}


// CP24: The cold-extracted original retains a directly usable native
// extension; malicious path notation never escapes the UUID-named source seat.
{
  const { nativeRecoveryName } = await import('./owner-vault-lineage-recover.mjs');
  const id = '00000000-0000-4000-8000-000000000241';
  assert.equal(nativeRecoveryName({id,fileName:'original-project.wav'}),
    id+'__original-project.wav');
  assert.equal(nativeRecoveryName({id,fileName:'../../evil/../../../scan.exe'}),
    id+'__..-..-evil-..-..-..-scan.exe');
  assert.equal(nativeRecoveryName({id,fileName:'\\foo\\bar\\music.flac'}),
    id+'__-foo-bar-music.flac');
  assert.equal(nativeRecoveryName({id,fileName:'CON.wav'}),
    id+'__CON.wav', 'UUID-prefix avoids reserved Windows basename');
  const longNative = nativeRecoveryName({id,fileName:'something'.repeat(100)+'.mp3'});
  assert.ok(!longNative.includes('/'));
  assert.ok(longNative.endsWith('.mp3'), 'CP24 a long filename may not silently lose the native extension');
  assert.ok(longNative.length <= id.length + 2 + 120);
}


// CP25: multiple independent real Owner Vault original sources can be
// reconstructed by the unchanged original CP20 CLI in one new cold destination.
// No duplicate purpose, no source bytes silently missing, no overwrite.
{
  const bucket=new FakeR2(), isolatedEnv={
    JM_OWNER_VAULT:bucket, JM_OWNER_VAULT_KEY:'cp25-synthetic-private-only'
  };
  const invoke=({method='GET',query='',body}={})=>
    call({method,query,body,env:isolatedEnv,key:isolatedEnv.JM_OWNER_VAULT_KEY});
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const html=[
    '<!doctype html><html><body>JM sovereign first source</body></html>',
    '<!doctype html><html><body>JM sovereign revised source</body></html>'
  ];
  let htmlHead;
  for (const content of html) {
    const r=await invoke({method:'POST',body:{action:'upload-body',
      body:{sourceInstanceId:'cp25-original-html-purpose',name:'JM CP25 game',fileName:'game.html',content}}});
    assert.equal(r.status,201);
    htmlHead=(await r.json()).body.id;
  }
  const sources=[
    {bytes:[Buffer.from([0,255,128,4,3]),Buffer.from([0,255,128,4,2])],
      name:'JM_Music.wav',id:'asset-00000000-0000-4000-8000-000000000251'},
    {bytes:[Buffer.from([0,255,128,4,3])],
      name:'JM_Art.psd',id:'asset-00000000-0000-4000-8000-000000000252'}
  ];
  for (const source of sources) {
    let previous=null;
    source.ids=[];
    for (const bytes of source.bytes) {
      const r=await invoke({method:'POST',body:{action:'upload-asset',file:{
        name:source.name,fileName:source.name,mediaType:'application/octet-stream',
        sha256:hash(bytes),base64:bytes.toString('base64'),sourceInstanceId:source.id,
        ...(previous?{expectedBaseId:previous.id,expectedBaseSha256:previous.sha256}:{})
      }}});
      assert.equal(r.status,201);
      previous=(await r.json()).asset;
      source.ids.push(previous.id);
    }
  }
  const responseHtml=await invoke({query:'?mode=export-lineage&body='+htmlHead});
  assert.equal(responseHtml.status,200);
  const packetHtml=await responseHtml.json();
  const packets=[packetHtml];
  for (const source of sources) {
    const response=await invoke({query:'?mode=export-asset-lineage&asset='+source.ids.at(-1)});
    assert.equal(response.status,200);
    packets.push(await response.json());
  }
  const before=[...bucket.map.entries()].map(([k,v])=>[k,Buffer.isBuffer(v.body)?v.body.toString('hex'):v.body]);
  const sandbox=await fs.mkdtemp(path.join(tmpdir(),'jm-vault-cp25-'));
  const tool=path.join(sandbox,'owner-vault-lineage-recover.mjs');
  const destination=path.join(sandbox,'all-originals');
  const packetPaths=packets.map((_,i)=>path.join(sandbox,'source-'+i+'.json'));
  const args=packetPaths.flatMap(f=>['--input',f]);
  const run=(...tail)=>spawnSync(process.execPath,[tool,...args,...tail],
    {cwd:sandbox,encoding:'utf8',timeout:20000});
  try {
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),tool);
    for(let i=0;i<packets.length;i++)
      await fs.writeFile(packetPaths[i],JSON.stringify(packets[i],null,2));
    const checked=run('--verify-only');
    assert.equal(checked.status,0,checked.stderr);
    assert.equal(JSON.parse(checked.stdout).outcome,'OFFLINE_MULTI_PACKET_VERIFIED');
    assert.equal(JSON.parse(checked.stdout).packet_count,3);
    assert.equal(JSON.parse(checked.stdout).version_count,5);
    const recovered=run('--output-dir',destination);
    assert.equal(recovered.status,0,recovered.stderr);
    assert.equal(JSON.parse(recovered.stdout).outcome,'OFFLINE_MULTI_SOURCE_RECOVERED');
    for(const v of packetHtml.versions)
      assert.equal(await fs.readFile(path.join(destination,v.metadata.id+'.html'),'utf8'),v.content);
    for(const source of sources) for(let i=0;i<source.ids.length;i++)
      assert.deepEqual(
        await fs.readFile(path.join(destination,source.ids[i]+'__'+source.name)),
        source.bytes[i]);
    const names=await fs.readdir(destination);
    assert.equal(names.length,6);
    assert.equal(new Set(names).size,6);
    const receipt=JSON.parse(await fs.readFile(path.join(destination,'recovery-manifest.json'),'utf8'));
    assert.equal(receipt.original_lineages.length,3);
    assert.equal(receipt.schema,'JM.OwnerVault/0.1.OfflineBatchRecovered');
    assert.equal(receipt.total_versions,5);
    assert.equal(run('--audit-dir',destination).status,0);
    assert.notEqual(run('--output-dir',destination).status,0,'a second run must refuse the existing original files');
    const original=path.join(destination,sources[1].ids[0]+'__'+sources[1].name);
    await fs.writeFile(original,Buffer.from([99,99,99]));
    assert.notEqual(run('--audit-dir',destination).status,0,'cold audit must detect changed original');
    await fs.writeFile(original,sources[1].bytes[0]);
    assert.equal(run('--audit-dir',destination).status,0);
    const extra=path.join(destination,'unverified-creature.js');
    await fs.writeFile(extra,'not previously proven');
    assert.notEqual(run('--audit-dir',destination).status,0,'unrelated extra sources cannot be crowned');
    await fs.unlink(extra);
    assert.equal(run('--audit-dir',destination).status,0);

    // A different packet path pointing to the same original source identity
    // must be refused rather than counted as another sovereign creation.
    const repeated=spawnSync(process.execPath,[tool,'--input',packetPaths[1],
      '--input',packetPaths[1],'--verify-only'],{cwd:sandbox,encoding:'utf8',timeout:20000});
    assert.notEqual(repeated.status,0);
    assert.match(repeated.stderr,/BATCH_OVERLAPPING_SOURCE_USE_HOLD/);
    const corrupted=structuredClone(packets[1]);
    corrupted.versions[0].base64=Buffer.from('wrong').toString('base64');
    await fs.writeFile(packetPaths[1],JSON.stringify(corrupted));
    const refused=run('--verify-only');
    assert.notEqual(refused.status,0);
    assert.match(refused.stderr,/ASSET_LINEAGE_EXACT_BINARY_INTEGRITY_FAILED/);
    const noNew=path.join(sandbox,'do-not-create-on-corruption');
    assert.notEqual(run('--output-dir',noNew).status,0);
    await assert.rejects(fs.lstat(noNew),/ENOENT/);
    assert.deepEqual([...bucket.map.entries()].map(([k,v])=>
      [k,Buffer.isBuffer(v.body)?v.body.toString('hex'):v.body]),before,
      'cold extraction must not mutate a byte of the original private R2 source');
    console.log('PASS: CP25 original batch cold recovery — mixed HTML game, WAV/audio and PSD/art originals; exact 5 source versions, identity separation, fsync/audit, tamper and overwrite refusal.');
  } finally {
    await fs.rm(sandbox,{recursive:true,force:true}); // synthetic test files only
  }
}


// CP26: bounded larger original 13 MiB (7 R2 source parts); exact original
// custody, safe retry, refused premature index, corruption detection and
// portable off-host source recovery through the EXISTING JM offline tool.
{
  const bucket = new FakeR2();
  const privateEnv={JM_OWNER_VAULT:bucket,JM_OWNER_VAULT_KEY:'cp26-private-fixture'};
  const invoke=({method='GET',query='',body}={})=>
    call({method,query,body,key:privateEnv.JM_OWNER_VAULT_KEY,env:privateEnv});
  const chunkSize=2*1024*1024;
  const bytes=Buffer.alloc(13*1024*1024+5);
  for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
  const sha=b=>createHash('sha256').update(b).digest('hex');
  const file={
    uploadId:'00000000-0000-4000-8000-000000000261',
    sourceInstanceId:'asset-00000000-0000-4000-8000-000000000262',
    bytes:bytes.length,sha256:sha(bytes),partCount:Math.ceil(bytes.length/chunkSize),
    name:'JM Original Large Music Project',fileName:'large-original.jmmusic',
    mediaType:'application/octet-stream'
  };
  assert.equal(file.partCount,7);
  const makePart = i => {
    const chunk=bytes.subarray(i*chunkSize,Math.min((i+1)*chunkSize,bytes.length));
    return {action:'upload-asset-part',file,partIndex:i,partSha256:sha(chunk),base64:chunk.toString('base64')};
  };
  const preflight=await invoke({method:'POST',body:{action:'finalize-chunked-asset',file}});
  assert.equal(preflight.status,409,'finalization must hold when any source part is missing');
  assert.equal((await preflight.json()).error,'ASSET_PART_MISSING');
  assert.equal((await (await invoke({query:'?mode=assets'})).json()).assets.length,0);
  // CP27 read-only reconciliation must never invent a source, mutation,
  // index entry or apparent completed custody, even with no parts present.
  const inspect=()=>invoke({method:'POST',body:{action:'inspect-asset-parts',file}});
  const anonymous=await call({method:'POST',body:{action:'inspect-asset-parts',file},env:privateEnv});
  assert.equal(anonymous.status,401,'inspection is owner-authenticated');
  const empty=await inspect();
  assert.equal(empty.status,200);
  const emptyResult=await empty.json();
  assert.equal(emptyResult.outcome,'ASSET_PART_INSPECTION');
  assert.equal(emptyResult.already_indexed,false);
  assert.deepEqual(emptyResult.present,[]);
  assert.deepEqual(emptyResult.missing,[0,1,2,3,4,5,6]);
  assert.equal(bucket.map.size,0,'read-only empty inspection must not create R2 objects');
  const wrongBase=await invoke({method:'POST',body:{action:'inspect-asset-parts',
    file:{...file,expectedBaseId:'00000000-0000-4000-8000-000000000999',
      expectedBaseSha256:'f'.repeat(64)}}});
  assert.equal(wrongBase.status,409);
  assert.equal((await wrongBase.json()).error,'ASSET_PART_INSPECTION_BASE_MISSING');
  assert.equal(bucket.map.size,0);
  const bad=makePart(0);bad.partSha256='0'.repeat(64);
  const refused=await invoke({method:'POST',body:bad});
  assert.equal(refused.status,409);
  assert.equal((await refused.json()).error,'ASSET_PART_CLIENT_HASH_MISMATCH');
  for(let i=0;i<file.partCount;i++) {
    const result=await invoke({method:'POST',body:makePart(i)});
    assert.equal(result.status,201);
    assert.equal((await result.json()).outcome,'ASSET_PART_STORED');
    if(i===2){
      const snapshot=Array.from(bucket.map,([k,v])=>[k,v.etag]);
      const held=(await (await inspect()).json());
      assert.equal(held.already_indexed,false);
      assert.equal(held.partCount,7);
      assert.deepEqual(held.present.map(x=>x.partIndex),[0,1,2]);
      assert.deepEqual(held.present.map(x=>x.sha256),
        [0,1,2].map(j=>sha(bytes.subarray(j*chunkSize,(j+1)*chunkSize))));
      assert.deepEqual(held.missing,[3,4,5,6]);
      assert.deepEqual(Array.from(bucket.map,([k,v])=>[k,v.etag]),snapshot,
        'part inspection must not write anything');
      const badKey='jm-owner-vault/v0.1/assets/parts/'+file.uploadId+'/1.bin';
      const originalRecord=bucket.map.get(badKey);
      bucket.map.set(badKey,{...originalRecord,
        options:{...originalRecord.options,
          customMetadata:{...originalRecord.options.customMetadata,sourceInstanceId:'asset-alien'}}});
      const fail=await inspect();
      assert.equal(fail.status,409);
      assert.equal((await fail.json()).error,'ASSET_PART_SOURCE_IDENTITY_MISMATCH');
      bucket.map.set(badKey,originalRecord);
      assert.equal((await (await inspect()).json()).present.length,3,
        'correct original parts can be inspected again without changing bytes');
    }
  }
  const replay=await invoke({method:'POST',body:makePart(0)});
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).outcome,'ASSET_PART_UNCHANGED');
  const tamperedPart=makePart(0);tamperedPart.base64=Buffer.alloc(chunkSize,42).toString('base64');
  tamperedPart.partSha256=sha(Buffer.alloc(chunkSize,42));
  const different=await invoke({method:'POST',body:tamperedPart});
  assert.equal(different.status,409,'one part key cannot mutate its already verified original purpose');
  assert.equal((await different.json()).error,'ASSET_PART_INTEGRITY_MISMATCH');
  const finished=await invoke({method:'POST',body:{action:'finalize-chunked-asset',file}});
  assert.equal(finished.status,201);
  const asset=(await finished.json()).asset;
  assert.equal(asset.id,file.uploadId);
  assert.equal(asset.storageKind,'chunked-v1');
  assert.equal(asset.partCount,7);
  assert.equal(asset.partHashes.length,7);
  assert.equal(asset.previousVersionId,null);
  const index=(await (await invoke({query:'?mode=assets'})).json()).assets;
  assert.equal(index.length,1);
  assert.equal(index[0].sourceInstanceId,file.sourceInstanceId);
  const held=await invoke({query:'?asset='+asset.id});
  assert.equal(held.status,200);
  assert.deepEqual(Buffer.from(await held.arrayBuffer()),bytes);
  const indexedInspection=await (await inspect()).json();
  assert.equal(indexedInspection.already_indexed,true);
  assert.equal(indexedInspection.asset_id,asset.id);
  assert.deepEqual(indexedInspection.present,[]);
  assert.deepEqual(indexedInspection.missing,[]);
  assert.equal((await (await invoke({query:'?mode=assets'})).json()).assets.length,1);
  const again=await invoke({method:'POST',body:{action:'finalize-chunked-asset',file}});
  assert.equal(again.status,200);
  assert.equal((await again.json()).asset.id,asset.id);
  assert.equal((await (await invoke({query:'?mode=assets'})).json()).assets.length,1);

  // This source fits the existing 24 MiB complete-lineage on-demand export.
  const lineage=await invoke({query:'?mode=export-asset-lineage&asset='+asset.id});
  assert.equal(lineage.status,200);
  const packet=await lineage.json();
  assert.equal(packet.version_count,1);
  assert.equal(packet.source_bytes,bytes.length);
  const dir=await fs.mkdtemp(path.join(tmpdir(),'jm-vault-cp26-'));
  const tool=path.join(dir,'owner-vault-lineage-recover.mjs');
  const saved=path.join(dir,'original-source-packet.json');
  const restored=path.join(dir,'restored-native');
  const run=(...args)=>spawnSync(process.execPath,[tool,'--input',saved,...args],
    {cwd:dir,encoding:'utf8',timeout:25000});
  try {
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),tool);
    await fs.writeFile(saved,JSON.stringify(packet));
    const independentVerify=run('--verify-only');
    assert.equal(independentVerify.status,0,independentVerify.stderr);
    const cold=run('--output-dir',restored);
    assert.equal(cold.status,0,cold.stderr);
    assert.equal(JSON.parse(cold.stdout).kind,'ORIGINAL_BINARY_ASSET');
    assert.deepEqual(await fs.readFile(path.join(restored,asset.id+'__large-original.jmmusic')),bytes);
    const audit=run('--audit-dir',restored);
    assert.equal(audit.status,0,audit.stderr);
  }finally{
    await fs.rm(dir,{recursive:true,force:true});
  }
  const partKey='jm-owner-vault/v0.1/assets/parts/'+asset.id+'/0.bin';
  const originalPart=bucket.map.get(partKey).body;
  const altered=Buffer.from(originalPart);
  altered[0]^=1;bucket.map.get(partKey).body=altered;
  const corrupted=await invoke({query:'?asset='+asset.id});
  assert.equal(corrupted.status,409);
  assert.equal((await corrupted.json()).error,'ASSET_PART_INTEGRITY_MISMATCH');
  assert.equal((await (await invoke({query:'?mode=assets'})).json()).assets.length,1);
  bucket.map.get(partKey).body=originalPart;
  assert.deepEqual(Buffer.from(await (await invoke({query:'?asset='+asset.id})).arrayBuffer()),bytes);
  console.log('PASS: CP26 13 MiB original native source in seven immutable 2 MiB pieces, exact R2 and offline cold recovery, concurrent-idempotent retries, corruption and incomplete transfer HOLD.');
}


// CP28: the existing private Owner Vault can export a COMPLETE original
// revision history larger than the legacy 24 MiB packet, using bounded
// read-only 8 MiB shards. The original offline CLI reassembles exact native
// originals without network, Vault keys, login or repo root.
{
  const store=new FakeR2(), ownerKey='cp28-synthetic-owner-key';
  const env={JM_OWNER_VAULT:store,JM_OWNER_VAULT_KEY:ownerKey};
  const api=({method='GET',query='',body,key=ownerKey}={})=>call({method,query,body,key,env});
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const sz=2*1024*1024, shardBytes=8*1024*1024;
  const original=Buffer.alloc(13*1024*1024+3), changed=Buffer.alloc(13*1024*1024+17);
  for(let i=0;i<original.length;i++)original[i]=i%251;
  for(let i=0;i<changed.length;i++)changed[i]=(i+17)%251;
  const source='asset-00000000-0000-4000-8000-000000000281';
  const ids=[], buffers=[original,changed], metas=[];
  const storageKeys=()=>[...store.map.entries()].map(([k,v])=>
    [k,Buffer.isBuffer(v.body)?hash(v.body):hash(Buffer.from(v.body))]);
  for(let version=0;version<2;version++){
    const bytes=buffers[version];
    const desc={uploadId:'00000000-0000-4000-8000-00000000028'+version,
      sourceInstanceId:source,sha256:hash(bytes),bytes:bytes.length,
      partCount:Math.ceil(bytes.length/sz),name:'JM Extended Original',
      fileName:'original-lineage.jmproject',mediaType:'application/octet-stream',
      ...(version?{expectedBaseId:ids[0],expectedBaseSha256:hash(original)}:{})};
    for(let i=0;i<desc.partCount;i++){
      const part=bytes.subarray(i*sz,Math.min((i+1)*sz,bytes.length));
      const reply=await api({method:'POST',body:{action:'upload-asset-part',file:desc,
        partIndex:i,partSha256:hash(part),base64:part.toString('base64')}});
      assert.equal(reply.status,201,'piece must be stored in original R2');
    }
    const done=await api({method:'POST',body:{action:'finalize-chunked-asset',file:desc}});
    assert.equal(done.status,201);
    const m=(await done.json()).asset;
    ids.push(m.id);metas.push(m);
  }
  assert.equal(metas[1].previousVersionId,metas[0].id);
  assert.equal((await api({query:'?mode=export-asset-lineage&asset='+ids[1]})).status,413,
    'CP22 legacy 24 MiB bound remains protected');
  const planQuery='?mode=export-asset-extended-plan&asset='+ids[1];
  assert.equal((await api({query:planQuery,key:'unauthorized'})).status,401);
  const before=storageKeys();
  const pResponse=await api({query:planQuery});
  assert.equal(pResponse.status,200);
  const plan=await pResponse.json();
  assert.equal(plan.schema,'JM.OwnerVault/0.1.AssetExtendedPlan');
  assert.deepEqual(plan.versions.map(m=>m.id),[ids[1],ids[0]]);
  assert.equal(plan.source_bytes,original.length+changed.length);
  assert.ok(plan.source_bytes>24*1024*1024);
  assert.equal(plan.shard_bytes,shardBytes);
  assert.match(plan.index_pin_sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(storageKeys(),before,'plan cannot mutate private custody');
  assert.equal((await api({query:'?mode=export-asset-extended-shard&asset='
    +ids[1]+'&version='+ids[1]+'&part=0&pin='+'f'.repeat(64)})).status,409);
  const versions=[];
  for(const m of plan.versions){
    const shards=[];
    const raw=buffers[m.id===ids[1]?1:0];
    for(let i=0;i<Math.ceil(m.bytes/shardBytes);i++){
      const query='?mode=export-asset-extended-shard&asset='+ids[1]
        +'&version='+m.id+'&part='+i+'&pin='+plan.index_pin_sha256;
      const reply=await api({query});
      assert.equal(reply.status,200);
      const part=await reply.json();
      assert.equal(part.schema,'JM.OwnerVault/0.1.AssetExtendedShard');
      const expected=raw.subarray(i*shardBytes,Math.min((i+1)*shardBytes,raw.length));
      assert.deepEqual(Buffer.from(part.base64,'base64'),expected);
      assert.equal(part.sha256,hash(expected));
      assert.equal(part.index_pin_sha256,plan.index_pin_sha256);
      shards.push({shard_index:part.shard_index,offset:part.offset,
        bytes:part.bytes,sha256:part.sha256,base64:part.base64});
    }
    versions.push({metadata:m,shards});
  }
  assert.deepEqual(storageKeys(),before,'complete shard reads may never mutate R2');
  const packet={schema:'JM.OwnerVault/0.1.AssetExtendedExport',
    selected_id:plan.selected_id,index_pin_sha256:plan.index_pin_sha256,
    shard_bytes:plan.shard_bytes,version_count:plan.version_count,
    source_bytes:plan.source_bytes,order:plan.order,versions};
  const root=await fs.mkdtemp(path.join(tmpdir(),'jm-vault-cp28-'));
  const tool=path.join(root,'owner-vault-lineage-recover.mjs'),
    exported=path.join(root,'extended.json'), destination=path.join(root,'restored');
  const cli=(...args)=>spawnSync(process.execPath,[tool,'--input',exported,...args],
    {cwd:root,encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
  try {
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),tool);
    await fs.writeFile(exported,JSON.stringify(packet));
    let result=cli('--verify-only');
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).source_bytes,plan.source_bytes);
    result=cli('--output-dir',destination);
    assert.equal(result.status,0,result.stderr);
    for(let i=0;i<2;i++)assert.deepEqual(
      await fs.readFile(path.join(destination,ids[i]+'__original-lineage.jmproject')),
      buffers[i]);
    result=cli('--audit-dir',destination);
    assert.equal(result.status,0,result.stderr);
    assert.notEqual(cli('--output-dir',destination).status,0,'never overwrite recovered originals');
    const corrupted=structuredClone(packet);
    corrupted.versions[1].shards[0].base64=(corrupted.versions[1].shards[0].base64[0]==='A'?'B':'A')+corrupted.versions[1].shards[0].base64.slice(1);
    await fs.writeFile(exported,JSON.stringify(corrupted));
    result=cli('--verify-only');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/ASSET_EXTENDED_SHARD_INTEGRITY_FAILED/);
    const refused=path.join(root,'refused');
    assert.notEqual(cli('--output-dir',refused).status,0);
    await assert.rejects(fs.lstat(refused),/ENOENT/);
    const incomplete=structuredClone(packet);
    incomplete.versions[0].shards.pop();
    await fs.writeFile(exported,JSON.stringify(incomplete));
    assert.match(cli('--verify-only').stderr,/ASSET_EXTENDED_IDENTITY_OR_SHARD_COUNT_INVALID/);
    const alien=structuredClone(packet);
    alien.versions[1].metadata.sourceInstanceId='asset-00000000-0000-4000-8000-000000009999';
    await fs.writeFile(exported,JSON.stringify(alien));
    assert.match(cli('--verify-only').stderr,/ASSET_EXTENDED_CROSS_PURPOSE_REFUSED/);
    await fs.writeFile(exported,JSON.stringify(packet));
    assert.equal(cli('--audit-dir',destination).status,0,'original manifest remains exact');
    const nativeFile=path.join(destination,ids[1]+'__original-lineage.jmproject');
    const originalByte=(await fs.readFile(nativeFile))[0];
    const handle=await fs.open(nativeFile,'r+');
    try{await handle.write(Buffer.from([originalByte^1]),0,1,0);}finally{await handle.close();}
    assert.match(cli('--audit-dir',destination).stderr,/LINEAGE_AUDIT_SOURCE_MISMATCH/);
  }finally{
    await fs.rm(root,{recursive:true,force:true}); // synthetic test-created files only
  }
  assert.deepEqual(storageKeys(),before,'all offline work must leave original R2 unchanged');
  console.log('PASS: CP28 >24 MiB complete two-version original lineage via bounded 8 MiB private shards, exact standalone native cold reconstruction, audit, corruption, cross-purpose and nonoverwriting HOLD.');
}


// CP28: previously blocked >24 MiB original binary history. Same original
// R2/auth/CI, same offline executable. Two native JM revisions, no wrapped
// duplicate, catalog-only is never considered independent cold custody.
{
  const bucket=new FakeR2(),env={
    JM_OWNER_VAULT:bucket,JM_OWNER_VAULT_KEY:'cp28-synthetic-private'
  };
  const invoke=({method='GET',query='',body,key=env.JM_OWNER_VAULT_KEY}={})=>
    call({method,query,body,key,env});
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const size=2*1024*1024;
  const purpose='asset-00000000-0000-4000-8000-000000002801';
  const files=[
    {id:'00000000-0000-4000-8000-000000002802',name:'JM_Original_Track.jmmusic',
      bytes:Buffer.alloc(13*1024*1024+5)},
    {id:'00000000-0000-4000-8000-000000002803',name:'JM_Original_Track.jmmusic',
      bytes:Buffer.alloc(14*1024*1024+7)}
  ];
  files.forEach((f,n)=>{for(let i=0;i<f.bytes.length;i++)f.bytes[i]=(i+n*73)%251;});
  let parent=null;
  for(const f of files){
    const desc={uploadId:f.id,sourceInstanceId:purpose,sha256:hash(f.bytes),
      bytes:f.bytes.length,partCount:Math.ceil(f.bytes.length/size),
      fileName:f.name,name:'JM original music',
      ...(parent?{expectedBaseId:parent.id,expectedBaseSha256:parent.sha256}:{})};
    f.desc=desc;
    for(let i=0;i<desc.partCount;i++){
      const bytes=f.bytes.subarray(i*size,Math.min((i+1)*size,f.bytes.length));
      const r=await invoke({method:'POST',body:{action:'upload-asset-part',
        file:desc,partIndex:i,partSha256:hash(bytes),base64:bytes.toString('base64')}});
      assert.equal(r.status,201, 'each independent 2 MiB original source part must be stored');
    }
    const result=await invoke({method:'POST',body:{action:'finalize-chunked-asset',file:desc}});
    assert.equal(result.status,201);
    parent=(await result.json()).asset;
    assert.equal(parent.sha256,hash(f.bytes));
  }
  const old=await invoke({query:'?mode=export-asset-lineage&asset='+parent.id});
  assert.equal(old.status,413,'CP22 small packet must keep the historical safe total limit');
  assert.equal((await old.json()).error,'ASSET_LINEAGE_BYTE_LIMIT');
  const unauth=await invoke({query:'?mode=export-asset-catalog&asset='+parent.id,key:''});
  assert.equal(unauth.status,401,'cold original catalog is owner-authenticated');
  const before=Array.from(bucket.map,([k,v])=>[k,v.etag]);
  const listed=await invoke({query:'?mode=export-asset-catalog&asset='+parent.id});
  assert.equal(listed.status,200);
  const catalog=await listed.json();
  assert.equal(catalog.schema,'JM.OwnerVault/0.1.AssetPartsCatalog');
  assert.equal(catalog.version_count,2);
  assert.equal(catalog.versions[0].metadata.id,files[1].id);
  assert.equal(catalog.versions[1].metadata.id,files[0].id);
  assert.equal(catalog.source_bytes,files[0].bytes.length+files[1].bytes.length);
  assert.ok(catalog.source_bytes>24*1024*1024);
  assert.equal(catalog.versions.reduce((sum,v)=>sum+v.parts.length,0),15);
  assert.deepEqual(Array.from(bucket.map,([k,v])=>[k,v.etag]),before,
    'the owner catalog cannot write or copy R2 original source bytes');
  const base=await fs.mkdtemp(path.join(tmpdir(),'jm-cp28-cold-'));
  const tool=path.join(base,'owner-vault-lineage-recover.mjs');
  const sources=path.join(base,'owner-saved-original-parts');
  const restored=path.join(base,'native-recovery');
  await fs.mkdir(sources);
  const catalogPath=path.join(sources,'JM_Vault_Cold_Catalog_'+parent.id+'.json');
  const run=(...argv)=>spawnSync(process.execPath,[tool,'--parts-catalog',catalogPath,...argv],
    {cwd:base,encoding:'utf8',timeout:90000});
  try{
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),tool);
    await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2));
    // Deliberately incomplete collection must be refused before allocating
    // any recovery directory or claiming cold backup possession.
    const missing=run('--verify-only');
    assert.notEqual(missing.status,0);
    assert.notEqual(run('--output-dir',restored).status,0);
    await assert.rejects(fs.lstat(restored),/ENOENT/);
    for(const version of catalog.versions){
      for(const p of version.parts){
        const wrong=await invoke({query:'?mode=export-asset-part&asset='+version.metadata.id+'&part='+p.index,key:''});
        assert.equal(wrong.status,401);
        const piece=await invoke({query:'?mode=export-asset-part&asset='+version.metadata.id+'&part='+p.index});
        assert.equal(piece.status,200);
        assert.equal(piece.headers.get('x-jm-asset-id'),version.metadata.id);
        assert.equal(piece.headers.get('x-jm-part-index'),String(p.index));
        assert.equal(piece.headers.get('x-jm-part-sha256'),p.sha256);
        const bytes=Buffer.from(await piece.arrayBuffer());
        assert.equal(bytes.length,p.bytes);
        assert.equal(hash(bytes),p.sha256);
        await fs.writeFile(path.join(sources,p.fileName),bytes);
      }
    }
    assert.deepEqual(Array.from(bucket.map,([k,v])=>[k,v.etag]),before,
      'all owner reads must be read-only, no new remote copies');
    const verified=run('--verify-only');
    assert.equal(verified.status,0,verified.stderr);
    assert.equal(JSON.parse(verified.stdout).source_bytes,catalog.source_bytes);
    const result=run('--output-dir',restored);
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).outcome,'OFFLINE_SEGMENTED_SOURCE_RECOVERED');
    for(const f of files){
      const restoredBytes=await fs.readFile(path.join(restored,f.id+'__'+f.name));
      assert.deepEqual(restoredBytes,f.bytes,'native original exact bytes recovered');
    }
    const audit=run('--audit-dir',restored);
    assert.equal(audit.status,0,audit.stderr);
    assert.equal(JSON.parse(audit.stdout).outcome,'OFFLINE_SEGMENTED_SOURCE_AUDITED');
    assert.notEqual(run('--output-dir',restored).status,0,
      'never overwrite an existing native working tree');
    const p=catalog.versions[0].parts[0];
    const piecePath=path.join(sources,p.fileName),unmodified=await fs.readFile(piecePath);
    const tampered=Buffer.from(unmodified);tampered[0]^=1;
    await fs.writeFile(piecePath,tampered);
    const refused=run('--verify-only');
    assert.notEqual(refused.status,0);
    assert.match(refused.stderr,/COLD_PART_EXACT_HASH_HOLD/);
    assert.notEqual(run('--audit-dir',restored).status,0);
    assert.deepEqual(await fs.readFile(path.join(restored,files[1].id+'__'+files[1].name)),
      files[1].bytes,'source read-only audit must not overwrite or delete working originals');
    await fs.writeFile(piecePath,unmodified);
    assert.equal(run('--audit-dir',restored).status,0);
    // A valid-hash piece assigned to another creative source is not allowed
    // to slip in as another sovereign ancestor.
    const cross=structuredClone(catalog);
    cross.versions[1].metadata.sourceInstanceId='asset-00000000-0000-4000-8000-000000009999';
    await fs.writeFile(catalogPath,JSON.stringify(cross));
    const denied=run('--verify-only');
    assert.notEqual(denied.status,0);
    assert.match(denied.stderr,/COLD_CATALOG_IDENTITY_OR_SIZE_HOLD/);
  }finally{
    await fs.rm(base,{recursive:true,force:true}); // disposable synthetic test files only
  }
  console.log('PASS CP28: >24 MiB original two-revision source split into 15 genuine R2 source pieces, read-only auth, offline no-host cold native reconstruction, separate-process audit, missing/tamper/cross-purpose and overwrite HOLD.');
}


// CP29: prove the existing segmented CP28 importer can cold-recover a real
// >64 MiB complete multi-revision history with memory bounded by 2 MiB.
// No server, credential, real owner file or new permanent carrier is used.
{
  const root=await fs.mkdtemp(path.join(tmpdir(),'jm-owner-cp29-'));
  const tool=path.join(root,'owner-vault-lineage-recover.mjs');
  const sources=path.join(root,'synthetic-pieces');
  const restored=path.join(root,'native-restored');
  const idA='00000000-0000-4000-8000-000000002901';
  const idB='00000000-0000-4000-8000-000000002902';
  const sourceId='asset-00000000-0000-4000-8000-000000002903';
  const partBytes=2*1024*1024;
  const catalogPath=path.join(sources,'JM_Vault_Cold_Catalog_'+idB+'.json');
  const sha=b=>createHash('sha256').update(b).digest('hex');
  const cli=(...args)=>spawnSync(process.execPath,[tool,'--parts-catalog',catalogPath,...args],
    {cwd:root,encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
  try{
    await fs.mkdir(sources);
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),tool);
    const versions=[];
    let total=0;
    for(const [id,count,previous,seed] of [
      [idA,34,null,17],[idB,35,idA,91]
    ]){
      const whole=createHash('sha256');
      const parts=[];
      for(let i=0;i<Math.ceil(count/2);i++){
        const bytes=Buffer.alloc(Math.min(partBytes,count*1024*1024-i*partBytes));
        for(let j=0;j<bytes.length;j++)bytes[j]=(seed+i+j)%251;
        whole.update(bytes);
        const fileName='JM_Vault_Part_'+id+'_'+String(i).padStart(2,'0')+'.bin';
        parts.push({index:i,bytes:bytes.length,sha256:sha(bytes),fileName});
        await fs.writeFile(path.join(sources,fileName),bytes);
      }
      const bytes=count*1024*1024;total+=bytes;
      versions.push({metadata:{
        id,name:'JM large original',fileName:'JM-native-large.jmproject',
        sourceInstanceId:sourceId,mediaType:'application/octet-stream',bytes,
        sha256:whole.digest('hex'),previousVersionId:previous
      },parts});
    }
    const packet={schema:'JM.OwnerVault/0.1.AssetPartsCatalog',selected_id:idB,
      version_count:2,source_bytes:total,order:'SELECTED_HEAD_TO_OLDEST_ANCESTOR',
      part_bytes:partBytes,versions:versions.reverse()};
    await fs.writeFile(catalogPath,JSON.stringify(packet));
    assert.equal(total,69*1024*1024,'history must exceed CP28 64 MiB JSON cap');
    let result=cli('--verify-only');
    assert.equal(result.status,0,result.stderr);
    result=cli('--output-dir',restored);
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).source_bytes,total);
    for(const version of packet.versions){
      const restoredFile=path.join(restored,version.metadata.id+'__JM-native-large.jmproject');
      const stat=await fs.stat(restoredFile);
      assert.equal(stat.size,version.metadata.bytes);
    }
    result=cli('--audit-dir',restored);
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).outcome,'OFFLINE_SEGMENTED_SOURCE_AUDITED');
    // Recovered bytes, not only the piece packet, are independently audited.
    const changed=path.join(restored,idB+'__JM-native-large.jmproject');
    const handle=await fs.open(changed,'r+');
    try{const first=Buffer.alloc(1);await handle.read(first,0,1,0);
      await handle.write(Buffer.from([first[0]^1]),0,1,0);
    }finally{await handle.close();}
    const refused=cli('--audit-dir',restored);
    assert.notEqual(refused.status,0);
    assert.match(refused.stderr,/COLD_NATIVE_PART_READBACK_HOLD/);
    // Failed audit must never mutate original persisted cold pieces.
    result=cli('--verify-only');
    assert.equal(result.status,0,result.stderr);
    assert.notEqual(cli('--output-dir',restored).status,0,
      'no second recovery may overwrite owner-editable originals');
    // Missing source part refuses even the creation of a destination folder.
    await fs.unlink(path.join(sources,packet.versions[0].parts[0].fileName));
    const missing=path.join(root,'incomplete-restoration');
    result=cli('--output-dir',missing);
    assert.notEqual(result.status,0);
    await assert.rejects(fs.lstat(missing),/ENOENT/);
    console.log('PASS: CP29 exact 69 MiB two-revision native cold recovery, <=2 MiB bounded opened-file verification, separate-process audit, tamper/incomplete and overwrite HOLD.');
  }finally{
    await fs.rm(root,{recursive:true,force:true}); // strictly synthetic local tests
  }
}


// CP31: full source-bound 512 MiB original history: eight exact 64 MiB
// native revisions and all 256 binary parts, cold-recovered by the ORIGINAL
// independent offline CLI. This is synthetic actual-disk proof, not a
// physical owner-device/real-provider deployment or offsite receipt.
{
  const root=await fs.mkdtemp(path.join(tmpdir(),'jm-owner-cp31-fullbound-'));
  const folder=path.join(root,'owner-cold-pieces');
  const output=path.join(root,'native-original-recovery');
  const cliCopy=path.join(root,'owner-vault-lineage-recover.mjs');
  const bytesPerPart=2*1024*1024,partsPerVersion=32;
  const ids=Array.from({length:8},(_,i)=>
    '00000000-0000-4000-8000-'+String(310000+i).padStart(12,'0'));
  const source='asset-00000000-0000-4000-8000-000000003199';
  const expectedTotal=8*64*1024*1024;
  const hash=b=>createHash('sha256').update(b).digest('hex');
  let pathToCatalog=null;
  const cli=(...args)=>spawnSync(process.execPath,[cliCopy,'--parts-catalog',pathToCatalog,...args],
    {cwd:root,encoding:'utf8',timeout:240000,maxBuffer:1024*1024});
  try{
    await fs.mkdir(folder);
    await fs.copyFile(new URL('./owner-vault-lineage-recover.mjs',import.meta.url),cliCopy);
    const versions=[];
    for(let v=0;v<8;v++){
      const originalHash=createHash('sha256'),parts=[];
      for(let i=0;i<partsPerVersion;i++){
        const b=Buffer.alloc(bytesPerPart,(v*32+i)%251);
        const name='JM_Vault_Part_'+ids[v]+'_'+String(i).padStart(2,'0')+'.bin';
        originalHash.update(b);
        parts.push({index:i,bytes:b.length,sha256:hash(b),fileName:name});
        await fs.writeFile(path.join(folder,name),b,{flag:'wx'});
      }
      versions.push({metadata:{id:ids[v],sourceInstanceId:source,
        name:'JM native original sovereign source',fileName:'JM-Full-Bound.jmproject',
        mediaType:'application/octet-stream',bytes:64*1024*1024,
        sha256:originalHash.digest('hex'),previousVersionId:v?ids[v-1]:null
      },parts});
    }
    const catalog={schema:'JM.OwnerVault/0.1.AssetPartsCatalog',
      selected_id:ids[7],version_count:8,source_bytes:expectedTotal,
      order:'SELECTED_HEAD_TO_OLDEST_ANCESTOR',part_bytes:bytesPerPart,
      versions:versions.reverse()};
    pathToCatalog=path.join(folder,'JM_Vault_Cold_Catalog_'+ids[7]+'.json');
    await fs.writeFile(pathToCatalog,JSON.stringify(catalog)+'\n',{flag:'wx'});
    let result=cli('--verify-only');
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).source_bytes,expectedTotal);
    result=cli('--output-dir',output);
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).source_bytes,expectedTotal);
    for(let v=0;v<8;v++){
      const file=path.join(output,ids[v]+'__JM-Full-Bound.jmproject');
      const stat=await fs.stat(file);
      assert.equal(stat.size,64*1024*1024);
    }
    result=cli('--audit-dir',output);
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).source_bytes,expectedTotal);
    // Fail closed for a ninth revision. This is a rule, not auto-retirement.
    const bad={...catalog,version_count:9,versions:[
      ...catalog.versions,{...catalog.versions[7],metadata:{
        ...catalog.versions[7].metadata,id:'00000000-0000-4000-8000-000000003199'}}]};
    await fs.writeFile(pathToCatalog,JSON.stringify(bad));
    result=cli('--verify-only');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/COLD_CATALOG_SCHEMA_HOLD/);
    await fs.writeFile(pathToCatalog,JSON.stringify(catalog)+'\n');
    // Corrupt the actual last piece in the HEAD's original, not a forged receipt.
    const last=catalog.versions[0].parts[31];
    const piece=path.join(folder,last.fileName);
    const handle=await fs.open(piece,'r+');
    try{const b=Buffer.alloc(1);await handle.read(b,0,1,0);
      await handle.write(Buffer.from([b[0]^1]),0,1,0);
    }finally{await handle.close();}
    result=cli('--verify-only');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/COLD_PART_EXACT_HASH_HOLD/);
    // Existing owner recovery remains untouched by failed source verification.
    const file=await fs.stat(path.join(output,ids[7]+'__JM-Full-Bound.jmproject'));
    assert.equal(file.size,64*1024*1024);
    console.log('PASS: CP31 exact 512 MiB source-bound eight-native-revision 256-part offline cold verification, durable reconstruction and separate audit; ninth revision and corrupted original piece HOLD; no owner provider contact.');
  }finally{
    await fs.rm(root,{recursive:true,force:true}); // only disposable synthetic fixture and its own descendants
  }
}
