const SCHEMA = 'JM.OwnerVault/0.1';
const PREFIX = 'jm-owner-vault/v0.1';
const STATE_KEY = `${PREFIX}/state.json`;
const INDEX_KEY = `${PREFIX}/bodies/index.json`;
const SNAPSHOT_PREFIX = `${PREFIX}/snapshots`;
const BODY_PREFIX = `${PREFIX}/bodies`;
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_NOTES_CHARS = 200000;

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};

function json(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: { ...jsonHeaders, ...extraHeaders }
  });
}

function boundedString(value, max = 1000) {
  return String(value ?? '').slice(0, max);
}

function safeFileName(value) {
  return boundedString(value || 'estate-body.html', 180)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'estate-body.html';
}

function safeState(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    notes: boundedString(input.notes, MAX_NOTES_CHARS),
    favourites: Array.isArray(input.favourites) ? input.favourites.slice(0, 200).map(v => boundedString(v, 300)) : [],
    recent: Array.isArray(input.recent) ? input.recent.slice(0, 100).map(item => ({
      id: boundedString(item?.id, 300),
      name: boundedString(item?.name, 500),
      path: item?.path == null ? null : boundedString(item.path, 1000),
      route: item?.route == null ? null : boundedString(item.route, 300),
      at: boundedString(item?.at, 80)
    })) : []
  };
}

async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sameSecret(provided, expected) {
  if (!provided || !expected) return false;
  const [a, b] = await Promise.all([sha256Text(provided), sha256Text(expected)]);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// Verify the bytes actually persisted by R2, not merely a successful PUT response.
class VaultBodyIntegrityError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

async function verifiedBody(bucket, key, expectedHash, expectedBytes) {
  const object = await bucket.get(key);
  if (!object) throw new VaultBodyIntegrityError('BODY_BYTES_MISSING');
  let content;
  try { content = await object.text(); }
  catch { throw new VaultBodyIntegrityError('BODY_BYTES_UNREADABLE'); }
  if (expectedBytes != null && new TextEncoder().encode(content).byteLength !== expectedBytes) {
    throw new VaultBodyIntegrityError('BODY_INTEGRITY_MISMATCH');
  }
  const hashVerified = typeof expectedHash === 'string' && /^[a-f0-9]{64}$/i.test(expectedHash);
  if (hashVerified && await sha256Text(content) !== expectedHash.toLowerCase()) {
    throw new VaultBodyIntegrityError('BODY_INTEGRITY_MISMATCH');
  }
  return { object, content, hashVerified };
}

async function readJson(bucket, key, fallback) {
  const object = await bucket.get(key);
  if (!object) return fallback;
  try {
    return JSON.parse(await object.text());
  } catch {
    return fallback;
  }
}

async function writeJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
}

// A successful index PUT must survive independent readback without losing
// any existing purposeful bodies. This is detection, not a multi-writer lock.
async function verifyIndexWrite(bucket, expected) {
  const actual = await readJson(bucket, INDEX_KEY, null);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new VaultBodyIntegrityError('BODY_INDEX_READBACK_MISMATCH');
  }
}

async function requireOwner(request, env) {
  if (!env.JM_OWNER_VAULT || !env.JM_OWNER_VAULT_KEY) {
    return { ok: false, response: json({
      schema: SCHEMA,
      error: 'OWNER_VAULT_NOT_CONFIGURED',
      message: 'The private durable vault is fail-closed until both the R2 binding and owner key are configured.'
    }, 503) };
  }

  const supplied = request.headers.get('x-jm-owner-key') || '';
  if (!(await sameSecret(supplied, env.JM_OWNER_VAULT_KEY))) {
    return { ok: false, response: json({ schema: SCHEMA, error: 'OWNER_AUTH_REQUIRED' }, 401, {
      'www-authenticate': 'JMOwnerKey realm="JM Owner Vault"'
    }) };
  }
  return { ok: true };
}

async function manifest(bucket) {
  const [stateRecord, bodyIndex] = await Promise.all([
    readJson(bucket, STATE_KEY, { schema: `${SCHEMA}.State`, updated_at: null, state: safeState({}) }),
    readJson(bucket, INDEX_KEY, { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] })
  ]);
  return {
    schema: SCHEMA,
    state: safeState(stateRecord.state),
    state_updated_at: stateRecord.updated_at || null,
    bodies: Array.isArray(bodyIndex.bodies) ? bodyIndex.bodies : [],
    bodies_updated_at: bodyIndex.updated_at || null,
    boundary: 'Private owner storage. Nothing in this response is a public-publication claim.'
  };
}

async function saveState(bucket, payload) {
  const now = new Date().toISOString();
  const record = {
    schema: `${SCHEMA}.State`,
    updated_at: now,
    state: safeState(payload?.state)
  };
  await writeJson(bucket, STATE_KEY, record);
  return record;
}

async function uploadBody(bucket, payload) {
  const body = payload?.body && typeof payload.body === 'object' ? payload.body : {};
  const content = String(body.content ?? '');
  if (!/<html|<!doctype/i.test(content)) {
    return { error: json({ schema: SCHEMA, error: 'NOT_STANDALONE_HTML' }, 400) };
  }

  const byteCount = new TextEncoder().encode(content).byteLength;
  if (byteCount > MAX_BODY_BYTES) {
    return { error: json({
      schema: SCHEMA,
      error: 'BODY_TOO_LARGE_FOR_V0_1',
      max_bytes: MAX_BODY_BYTES,
      actual_bytes: byteCount
    }, 413) };
  }

  // Identity is a mounted use, not the bytes. Two separately mounted uses of
  // the same HTML must never collapse merely because their hashes match.
  // Legacy clients without a stable source instance are kept as separate uses.
  const sourceInstanceId = body.sourceInstanceId == null ? null : String(body.sourceInstanceId);
  if (sourceInstanceId && !/^[A-Za-z0-9_-]{12,180}$/.test(sourceInstanceId)) {
    return { error: json({ schema: SCHEMA, error: 'INVALID_SOURCE_INSTANCE_ID' }, 400) };
  }
  const hash = await sha256Text(content);
  const index = await readJson(bucket, INDEX_KEY, { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  const bodies = Array.isArray(index.bodies) ? index.bodies : [];
  // Only the CURRENT head may be treated as an exact retry. Reverting to an
  // ancestor's bytes is a deliberate new revision, not an old-record lookup.
  const previous = sourceInstanceId ? bodies.find(item => item.sourceInstanceId === sourceInstanceId) : null;
  if (previous && previous.sha256 === hash) {
    return { duplicate: true, same_instance: true, body: previous };
  }
  // Never silently evict an older purposeful body merely to meet the index limit.
  if (bodies.length >= 2000) return { error: json({ schema: SCHEMA, error: 'BODY_INDEX_CAPACITY_REACHED', max_bodies: 2000 }, 409) };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const fileName = safeFileName(body.fileName || `${body.name || 'estate-body'}.html`);
  const name = boundedString(body.name || fileName.replace(/\.html?$/i, ''), 500);
  const objectKey = `${BODY_PREFIX}/${id}.html`;

  await bucket.put(objectKey, content, {
    httpMetadata: {
      contentType: 'text/html; charset=utf-8',
      contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`
    },
    customMetadata: { sha256: hash, bodyName: name.slice(0, 900) }
  });

  await verifiedBody(bucket, objectKey, hash, byteCount);

  const metadata = {
    id,
    name,
    fileName,
    bytes: byteCount,
    sha256: hash,
    sourceInstanceId,
    previousVersionId: previous?.id || null,
    uploaded_at: now,
    source: 'explicit-owner-sync',
    status: 'PRIVATE_DURABLE_COPY_NOT_PUBLICATION'
  };

  const next = {
    schema: `${SCHEMA}.BodyIndex`,
    updated_at: now,
    bodies: [metadata, ...bodies]
  };
  await writeJson(bucket, INDEX_KEY, next);
  await verifyIndexWrite(bucket, next);
  return { duplicate: false, body: metadata };
}


// Edit within the existing private Owner Vault. Preserve the selected ancestor
// and the separately intended bodies; never replace the old R2 bytes.
async function reviseBody(bucket, payload) {
  const baseId = typeof payload?.baseId === 'string' ? payload.baseId : '';
  const expected = typeof payload?.expectedSha256 === 'string' ? payload.expectedSha256 : '';
  if (!/^[0-9a-f-]{36}$/i.test(baseId) || !/^[a-f0-9]{64}$/i.test(expected)) {
    return { error: json({ schema: SCHEMA, error: 'REVISION_PRECONDITION_REQUIRED' }, 400) };
  }
  if (typeof payload?.content !== 'string' || !/<html|<!doctype/i.test(payload.content)) {
    return { error: json({ schema: SCHEMA, error: 'NOT_STANDALONE_HTML' }, 400) };
  }
  const content = payload.content;
  const byteCount = new TextEncoder().encode(content).byteLength;
  if (byteCount > MAX_BODY_BYTES) {
    return { error: json({ schema: SCHEMA, error: 'BODY_TOO_LARGE_FOR_V0_1', max_bytes: MAX_BODY_BYTES, actual_bytes: byteCount }, 413) };
  }
  const index = await readJson(bucket, INDEX_KEY, { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  const bodies = Array.isArray(index.bodies) ? index.bodies : [];
  const base = bodies.find(item => item.id === baseId);
  if (!base) return { error: json({ schema: SCHEMA, error: 'BODY_NOT_FOUND' }, 404) };
  if (base.sha256 !== expected) return { error: json({ schema: SCHEMA, error: 'BODY_EXPECTED_HASH_MISMATCH' }, 409) };
  const sourceInstanceId = base.sourceInstanceId || `vault-${base.id}`;
  const current = bodies.find(item => item.sourceInstanceId === sourceInstanceId || (!base.sourceInstanceId && item.id === base.id));
  if (!current || current.id !== baseId) {
    return { error: json({ schema: SCHEMA, error: 'REVISION_HEAD_CHANGED', current_id: current?.id || null }, 409) };
  }
  const hash = await sha256Text(content);
  if (hash === base.sha256) return { unchanged: true, body: base };
  if (bodies.length >= 2000) {
    return { error: json({ schema: SCHEMA, error: 'BODY_INDEX_CAPACITY_REACHED', max_bodies: 2000 }, 409) };
  }
  const id = crypto.randomUUID(), now = new Date().toISOString();
  const fileName = safeFileName(base.fileName);
  const name = boundedString(base.name, 500);
  await bucket.put(`${BODY_PREFIX}/${id}.html`, content, {
    httpMetadata: {
      contentType: 'text/html; charset=utf-8',
      contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`
    },
    customMetadata: { sha256: hash, bodyName: name.slice(0, 900) }
  });
  await verifiedBody(bucket, `${BODY_PREFIX}/${id}.html`, hash, byteCount);
  const record = {
    id, name, fileName, bytes: byteCount, sha256: hash, sourceInstanceId,
    previousVersionId: base.id, uploaded_at: now,
    source: 'explicit-owner-revision',
    status: 'PRIVATE_DURABLE_REVISION_NOT_PUBLICATION'
  };
  const nextIndex = {
    schema: `${SCHEMA}.BodyIndex`,
    updated_at: now,
    bodies: [record, ...bodies]
  };
  await writeJson(bucket, INDEX_KEY, nextIndex);
  await verifyIndexWrite(bucket, nextIndex);
  return { unchanged: false, body: record };
}

async function deleteBody(bucket, id) {
  const index = await readJson(bucket, INDEX_KEY, { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  const bodies = Array.isArray(index.bodies) ? index.bodies : [];
  const target = bodies.find(item => item.id === id);
  if (!target) return { found: false };

  await bucket.delete(`${BODY_PREFIX}/${target.id}.html`);
  const now = new Date().toISOString();
  await writeJson(bucket, INDEX_KEY, {
    schema: `${SCHEMA}.BodyIndex`,
    updated_at: now,
    bodies: bodies.filter(item => item.id !== id)
  });
  return { found: true, body: target };
}

async function createSnapshot(bucket) {
  const current = await manifest(bucket);
  const now = new Date().toISOString();
  const key = `${SNAPSHOT_PREFIX}/${now.replace(/[:.]/g, '-')}.json`;
  const snapshot = {
    schema: `${SCHEMA}.Snapshot`,
    created_at: now,
    state: current.state,
    bodies: current.bodies,
    note: 'Snapshot contains owner state and body metadata. HTML bytes remain single R2 body objects and are not duplicated by this snapshot.'
  };
  await writeJson(bucket, key, snapshot);
  return { key, created_at: now, body_count: current.bodies.length };
}

async function downloadBody(bucket, id) {
  const index = await readJson(bucket, INDEX_KEY, { bodies: [] });
  const target = (index.bodies || []).find(item => item.id === id);
  if (!target) return json({ schema: SCHEMA, error: 'BODY_NOT_FOUND' }, 404);
  const stored = await verifiedBody(bucket, `${BODY_PREFIX}/${id}.html`, target.sha256, target.bytes);

  const headers = new Headers();
  stored.object.writeHttpMetadata?.(headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-jm-body-integrity', stored.hashVerified ? 'sha256-verified' : 'unverified-legacy');
  headers.set('content-disposition', `attachment; filename="${safeFileName(target.fileName)}"`);
  return new Response(stored.content, { headers });
}

async function handleOwnerRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  if (request.method === 'GET' && mode === 'status') {
    return json({
      schema: SCHEMA,
      service: 'JM Owner Vault',
      storage_bound: Boolean(env.JM_OWNER_VAULT),
      owner_key_configured: Boolean(env.JM_OWNER_VAULT_KEY),
      ready: Boolean(env.JM_OWNER_VAULT && env.JM_OWNER_VAULT_KEY),
      auth: 'X-JM-Owner-Key (session-entered; never embedded in public source)',
      identity_policy: 'SAME_SOURCE_INSTANCE_AND_BYTES_ONLY',
      editor_policy: 'PRIVATE_VERSIONED_SOURCE_READBACK_WITH_ANCESTOR_CUSTODY',
      overflow_policy: 'FAIL_CLOSED_NO_IDENTITY_EVICTION',
      public_claim: false
    });
  }

  const auth = await requireOwner(request, env);
  if (!auth.ok) return auth.response;
  const bucket = env.JM_OWNER_VAULT;

  if (request.method === 'GET') {
    const bodyId = url.searchParams.get('body');
    if (bodyId) return downloadBody(bucket, bodyId);
    return json(await manifest(bucket));
  }

  if (request.method === 'PUT') {
    let payload;
    try { payload = await request.json(); }
    catch { return json({ schema: SCHEMA, error: 'INVALID_JSON' }, 400); }
    const record = await saveState(bucket, payload);
    return json({ schema: SCHEMA, outcome: 'STATE_SAVED', updated_at: record.updated_at, state: record.state });
  }

  if (request.method === 'POST') {
    let payload;
    try { payload = await request.json(); }
    catch { return json({ schema: SCHEMA, error: 'INVALID_JSON' }, 400); }

    if (payload?.action === 'revise-body') {
      const outcome = await reviseBody(bucket, payload);
      if (outcome.error) return outcome.error;
      return json({ schema: SCHEMA, outcome: outcome.unchanged ? 'REVISION_UNCHANGED' : 'BODY_REVISION_STORED', ...outcome }, outcome.unchanged ? 200 : 201);
    }
    if (payload?.action === 'upload-body') {
      const outcome = await uploadBody(bucket, payload);
      if (outcome.error) return outcome.error;
      return json({ schema: SCHEMA, outcome: outcome.duplicate ? 'DUPLICATE_ALREADY_HELD' : 'BODY_STORED', dedupe_scope: 'SAME_SOURCE_INSTANCE_AND_BYTES_ONLY', ...outcome }, outcome.duplicate ? 200 : 201);
    }
    if (payload?.action === 'snapshot') {
      return json({ schema: SCHEMA, outcome: 'SNAPSHOT_STORED', snapshot: await createSnapshot(bucket) }, 201);
    }
    return json({ schema: SCHEMA, error: 'UNKNOWN_ACTION' }, 400);
  }

  if (request.method === 'DELETE') {
    const bodyId = url.searchParams.get('body');
    if (!bodyId) return json({ schema: SCHEMA, error: 'BODY_ID_REQUIRED' }, 400);
    const result = await deleteBody(bucket, bodyId);
    return result.found
      ? json({ schema: SCHEMA, outcome: 'PRIVATE_COPY_REMOVED', body: result.body })
      : json({ schema: SCHEMA, error: 'BODY_NOT_FOUND' }, 404);
  }

  return json({ schema: SCHEMA, error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'GET, PUT, POST, DELETE' });
}

export async function onRequest(context) {
  try {
    return await handleOwnerRequest(context);
  } catch (error) {
    if (error instanceof VaultBodyIntegrityError) {
      return json({
        schema: SCHEMA,
        error: error.code,
        recovery: 'HOLD_SOURCE_BYTES_FOR_OWNER_INSPECTION_NO_AUTOMATIC_DELETION'
      }, error.code === 'BODY_BYTES_MISSING' ? 404 : 409);
    }
    throw error;
  }
}
