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

  const hash = await sha256Text(content);
  const index = await readJson(bucket, INDEX_KEY, { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  const bodies = Array.isArray(index.bodies) ? index.bodies : [];
  const duplicate = bodies.find(item => item.sha256 === hash);
  if (duplicate) {
    return { duplicate: true, body: duplicate };
  }

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

  const metadata = {
    id,
    name,
    fileName,
    bytes: byteCount,
    sha256: hash,
    uploaded_at: now,
    source: 'explicit-owner-sync',
    status: 'PRIVATE_DURABLE_COPY_NOT_PUBLICATION'
  };

  const next = {
    schema: `${SCHEMA}.BodyIndex`,
    updated_at: now,
    bodies: [metadata, ...bodies].slice(0, 2000)
  };
  await writeJson(bucket, INDEX_KEY, next);
  return { duplicate: false, body: metadata };
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
  const object = await bucket.get(`${BODY_PREFIX}/${id}.html`);
  if (!object) return json({ schema: SCHEMA, error: 'BODY_BYTES_MISSING' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('content-disposition', `attachment; filename="${safeFileName(target.fileName)}"`);
  return new Response(object.body, { headers });
}

export async function onRequest(context) {
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

    if (payload?.action === 'upload-body') {
      const outcome = await uploadBody(bucket, payload);
      if (outcome.error) return outcome.error;
      return json({ schema: SCHEMA, outcome: outcome.duplicate ? 'DUPLICATE_ALREADY_HELD' : 'BODY_STORED', ...outcome }, outcome.duplicate ? 200 : 201);
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
