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
    let stored = String(body);
    if (this.tamperNextBodyWrite && key.endsWith('.html')) {
      this.tamperNextBodyWrite = false;
      stored += '<!-- injected R2 corruption -->';
    }
    this.map.set(key, { body: stored, options });
  }
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


/* CP05: damaged persistent records must never masquerade as empty vaults. */
{
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const stateKey = 'jm-owner-vault/v0.1/state.json';
  const originalIndex = bucket.map.get(indexKey);
  const originalState = bucket.map.get(stateKey);
  const badIndex = '{"schema":"JM.OwnerVault/0.1.BodyIndex","bodies":[';
  bucket.map.set(indexKey, { body: badIndex });
  const beforeKeys = [...bucket.map.keys()].sort();
  const upload = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY,
    body: { action: 'upload-body', body: {
      sourceInstanceId: 'local-cp05-corruption-guard',
      content: '<!doctype html><html><body>keep older uses</body></html>'
    } }
  });
  assert.equal(upload.status, 409);
  const uploadError = await upload.json();
  assert.equal(uploadError.error, 'VAULT_RECORD_UNREADABLE');
  assert.equal(uploadError.record, 'body-index');
  assert.equal(bucket.map.get(indexKey).body, badIndex);
  assert.deepEqual([...bucket.map.keys()].sort(), beforeKeys);
  const manifest = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  assert.equal(manifest.status, 409);
  assert.equal((await manifest.json()).record, 'body-index');
  const snapshot = await call({
    method: 'POST', env, key: env.JM_OWNER_VAULT_KEY, body: { action: 'snapshot' }
  });
  assert.equal(snapshot.status, 409);
  assert.deepEqual([...bucket.map.keys()].sort(), beforeKeys);

  // Syntactically valid JSON with an unusable index is also a HOLD.
  const badShape = '{"schema":"JM.OwnerVault/0.1.BodyIndex","bodies":{}}';
  bucket.map.set(indexKey, { body: badShape });
  const shapeResponse = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  assert.equal(shapeResponse.status, 409);
  assert.equal((await shapeResponse.json()).record, 'body-index');
  assert.equal(bucket.map.get(indexKey).body, badShape);
  bucket.map.set(indexKey, originalIndex);

  // Damaged owner state must not be served as empty or overwritten by PUT.
  const badState = '{"schema":"JM.OwnerVault/0.1.State","state":';
  bucket.map.set(stateKey, { body: badState });
  const stateGet = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  assert.equal(stateGet.status, 409);
  assert.equal((await stateGet.json()).record, 'owner-state');
  const statePut = await call({
    method: 'PUT', env, key: env.JM_OWNER_VAULT_KEY,
    body: { state: { notes: 'would overwrite unreadable original' } }
  });
  assert.equal(statePut.status, 409);
  assert.equal((await statePut.json()).record, 'owner-state');
  assert.equal(bucket.map.get(stateKey).body, badState);
  const invalidShape = '{"schema":"JM.OwnerVault/0.1.State","state":[]}';
  bucket.map.set(stateKey, { body: invalidShape });
  assert.equal((await call({ env, key: env.JM_OWNER_VAULT_KEY })).status, 409);
  bucket.map.set(stateKey, originalState);

  // A healthy existing vault remains readable; no changed behaviour on clean data.
  const clean = await call({ env, key: env.JM_OWNER_VAULT_KEY });
  assert.equal(clean.status, 200);
  assert.equal((await clean.json()).bodies.length, 2000);
  assert.equal((await call({ query: '?mode=status', env: {} })).status, 200);
}

/* CP06: independent R2 readback and source integrity, without collapsing uses. */
{
  const isolated = new FakeR2();
  const isolatedEnv = { ...env, JM_OWNER_VAULT: isolated };
  const key = isolatedEnv.JM_OWNER_VAULT_KEY;
  const html = '<!doctype html><html><body>CP06 verified source</body></html>';
  const make = (sourceInstanceId, content = html) => call({
    method: 'POST', env: isolatedEnv, key,
    body: { action: 'upload-body', body: { sourceInstanceId, content } }
  });
  const create = await make('cp06-purpose-one');
  assert.equal(create.status, 201);
  const metadata = (await create.json()).body;
  const objectKey = `jm-owner-vault/v0.1/bodies/${metadata.id}.html`;
  const indexKey = 'jm-owner-vault/v0.1/bodies/index.json';
  const original = isolated.map.get(objectKey);
  assert.equal(original.body, html);
  const good = await call({ env: isolatedEnv, key, query: `?body=${metadata.id}` });
  assert.equal(good.status, 200);
  assert.equal(good.headers.get('x-jm-body-integrity'), 'sha256-verified');
  assert.equal(await good.text(), html);

  // Damaged source bytes must never be served as an authoritative download.
  isolated.map.set(objectKey, { ...original, body: html + '<!-- tampered -->' });
  const damaged = await call({ env: isolatedEnv, key, query: `?body=${metadata.id}` });
  assert.equal(damaged.status, 409);
  assert.equal((await damaged.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.match(isolated.map.get(objectKey).body, /tampered/);
  // Same-byte-length mutation reaches the SHA-256 check, not just size guard.
  isolated.map.set(objectKey, { ...original, body: html.replace('verified', 'tampered') });
  const sameSizeTamper = await call({ env: isolatedEnv, key, query: `?body=${metadata.id}` });
  assert.equal(sameSizeTamper.status, 409);
  assert.equal((await sameSizeTamper.json()).error, 'BODY_INTEGRITY_MISMATCH');
  isolated.map.set(objectKey, original);
  assert.equal((await call({ env: isolatedEnv, key, query: `?body=${metadata.id}` })).status, 200);

  // A provider can acknowledge PUT yet persist changed bytes: do not index them.
  const beforeIndex = isolated.map.get(indexKey).body;
  isolated.tamperNextBodyWrite = true;
  const failed = await make('cp06-purpose-two', html.replace('verified', 'changed'));
  assert.equal(failed.status, 409);
  assert.equal((await failed.json()).error, 'BODY_INTEGRITY_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, beforeIndex);
  assert.equal([...isolated.map.keys()].filter(k => k.endsWith('.html')).length, 2);

  // An acknowledged index PUT that fails to persist must not return success.
  isolated.dropNextIndexWrite = true;
  const dropped = await make('cp06-purpose-three', html.replace('verified', 'third'));
  assert.equal(dropped.status, 409);
  assert.equal((await dropped.json()).error, 'BODY_INDEX_READBACK_MISMATCH');
  assert.equal(isolated.map.get(indexKey).body, beforeIndex);
  assert.equal((await make('cp06-purpose-one')).status, 200);
  assert.equal((await make('cp06-different-purpose')).status, 201);
  isolated.map.delete(objectKey);
  const missing = await call({ env: isolatedEnv, key, query: `?body=${metadata.id}` });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'BODY_BYTES_MISSING');
}

console.log('PASS: JM Owner Vault CP04 use identity · CP05 corrupted-record HOLD · CP06 exact R2 body/index readback and tamper refusal.');
