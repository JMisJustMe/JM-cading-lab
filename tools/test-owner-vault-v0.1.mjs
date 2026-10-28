import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

class FakeR2Object {
  constructor(record) {
    this.record = record;
    this.body = record.body;
  }
  async text() { return String(this.record.body); }
  writeHttpMetadata(headers) {
    if (this.record.options?.httpMetadata?.contentType) headers.set('content-type', this.record.options.httpMetadata.contentType);
  }
}

class FakeR2 {
  constructor() { this.map = new Map(); }
  async get(key) { const item = this.map.get(key); return item ? new FakeR2Object(item) : null; }
  async put(key, body, options = {}) {
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
    let stored = String(body);
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
    this.map.set(key, { body: stored, options });
  }
  async delete(key) {
    if (this.dropNextBodyDelete && key.endsWith('.html')) {
      this.dropNextBodyDelete = false;
      return;
    }
    this.map.delete(key);
  }
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
  const response = await call({ method: 'DELETE', env, key: env.JM_OWNER_VAULT_KEY, query: `?body=${encodeURIComponent(firstBodyId)}` });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.outcome, 'PRIVATE_COPY_REMOVED');
  const after = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  const afterBodies = (await after.json()).bodies;
  assert.equal(afterBodies.length, 3);
  assert.ok(afterBodies.some(x => x.id === secondUseId));
  assert.ok(afterBodies.some(x => x.id === changedRevisionId));
  const stillAvailable = await call({ env, key: env.JM_OWNER_VAULT_KEY, query: `?body=${encodeURIComponent(secondUseId)}` });
  assert.equal(stillAvailable.status, 200);
  assert.match(await stillAvailable.text(), /JM Test Body/);
  // Cleanup only targeted copies, never metadata siblings implicitly.
  for(const id of [secondUseId, changedRevisionId, legacyId]){
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
  for(const id of [a.body.id,b.body.id,revision.body.id,reverted.id,legacy.id,legacyNew.id]) {
    assert.equal((await call({method:'DELETE',env,key,query:`?body=${id}`})).status,200);
  }
  assert.equal((await (await call({env,key})).json()).bodies.length,0);
}

// Full index is a HOLD, never a reason to evict an older purposeful use.
{
  const protectedBodies=Array.from({length:2000},(_,i)=>({id:'protected-'+i,sourceInstanceId:'preserved-'+i,sha256:'old-'+i}));
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
console.log('PASS: JM Owner Vault CP12 index-before-delete, orphan HOLD, unique exact snapshot readback.');
console.log('PASS: JM Owner Vault CP11 persisted-state, dedupe and unchanged-revision integrity gates.');
console.log('PASS: JM Owner Vault current-main private editor, immutable ancestry, capacity gate, exact R2 body/index integrity on uploads/revisions/downloads.');
