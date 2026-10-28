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
  async put(key, body, options = {}) { this.map.set(key, { body: String(body), options }); }
  async delete(key) { this.map.delete(key); }
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
