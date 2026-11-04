const SCHEMA = 'JM.OwnerVault/0.1';
const PREFIX = 'jm-owner-vault/v0.1';
const STATE_KEY = `${PREFIX}/state.json`;
const INDEX_KEY = `${PREFIX}/bodies/index.json`;
const SNAPSHOT_PREFIX = `${PREFIX}/snapshots`;
const BODY_PREFIX = `${PREFIX}/bodies`;
const MAX_BODY_BYTES = 25 * 1024 * 1024;
// CP21 uses the EXISTING authenticated R2 Vault, preserving binary bytes.
const ASSET_INDEX_KEY = `${PREFIX}/assets/index.json`;
const ASSET_PREFIX = `${PREFIX}/assets`;
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
// CP26 extension: large original files travel as immutable 2 MiB source parts,
// but remain ONE indexed sovereign file identity after exact finalization.
const ASSET_PART_BYTES = 2 * 1024 * 1024;
const MAX_ASSET_PARTS = 32;
const MAX_CHUNKED_ASSET_BYTES = ASSET_PART_BYTES * MAX_ASSET_PARTS;
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

// Existing-but-unreadable private metadata is not a new empty vault.
// Preserve the original record for deliberate, owner-controlled recovery.
class VaultCustodyHold extends Error {
  constructor() { super('PRIVATE_CUSTODY_HOLD'); }
}
// CP18: newest-first index ancestry must be independently traversable.
// Purposeful source identities remain distinct even with identical HTML.
function custodyAncestryValid(bodies) {
  const positions = new Map(bodies.map((item, index) => [item.id, index]));
  for (let i = 0; i < bodies.length; i += 1) {
    const child = bodies[i];
    if (!child.previousVersionId) continue; // A genuine founding version.
    const ancestorIndex = positions.get(child.previousVersionId);
    if (ancestorIndex === undefined || ancestorIndex <= i) return false;
    const parent = bodies[ancestorIndex];
    // Original legacy sources have no stable sourceInstanceId; their first
    // explicit revision adopts the existing vault-{id} lineage convention.
    const legacyLineage = parent.sourceInstanceId == null
      && child.sourceInstanceId === `vault-${parent.id}`;
    if (!legacyLineage && (!parent.sourceInstanceId
      || parent.sourceInstanceId !== child.sourceInstanceId)) return false;
  }
  return true;
}

function custodyShapeValid(record, key) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if (key === INDEX_KEY) {
    return record.schema === `${SCHEMA}.BodyIndex`
      && Array.isArray(record.bodies)
      && record.bodies.every(item => item && typeof item === 'object'
        && !Array.isArray(item) && typeof item.id === 'string' && item.id.length > 0
        // CP17: a present-but-invalid digest must never downgrade a
        // supposedly verified source to the legacy unverified download path.
        && (item.sha256 == null || (typeof item.sha256 === 'string'
          && /^[a-f0-9]{64}$/i.test(item.sha256)))
        && (item.bytes == null || (Number.isSafeInteger(item.bytes)
          && item.bytes >= 0 && item.bytes <= MAX_BODY_BYTES))
        && (item.sourceInstanceId == null || typeof item.sourceInstanceId === 'string')
        && (item.previousVersionId == null || typeof item.previousVersionId === 'string'))
      // Duplicate IDs make lookup ambiguous and deletion can remove multiple
      // index entries while deleting only one object. Hold corrupt custody.
      && new Set(record.bodies.map(item => item.id)).size === record.bodies.length
      // CP18: a valid revision cannot point to a missing, younger, itself,
      // or a different sovereign source/use. Never silently repair ancestry.
      && custodyAncestryValid(record.bodies);
  }
  if (key === ASSET_INDEX_KEY) {
    return record.schema === `${SCHEMA}.AssetIndex`
      && Array.isArray(record.assets) && record.assets.length <= 2000
      && record.assets.every(item => item && typeof item === 'object' && !Array.isArray(item)
        && /^[0-9a-f-]{36}$/i.test(item.id || '')
        && /^asset-[0-9a-f-]{36}$/i.test(item.sourceInstanceId || '')
        && typeof item.fileName === 'string' && item.fileName.length <= 180
        && typeof item.name === 'string' && item.name.length <= 500
        && typeof item.mediaType === 'string' && item.mediaType.length <= 100
        && /^[a-f0-9]{64}$/i.test(item.sha256 || '')
        && Number.isSafeInteger(item.bytes) && item.bytes >= 0
        && item.bytes <= (item.storageKind === 'chunked-v1' ? MAX_CHUNKED_ASSET_BYTES : MAX_ASSET_BYTES)
        && (item.storageKind == null || (item.storageKind === 'chunked-v1'
          && Number.isSafeInteger(item.partCount) && item.partCount >= 7 && item.partCount <= MAX_ASSET_PARTS
          && item.partCount === Math.ceil(item.bytes / ASSET_PART_BYTES)
          && Array.isArray(item.partHashes) && item.partHashes.length === item.partCount
          && item.partHashes.every(h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h))))
        && (item.previousVersionId === null || /^[0-9a-f-]{36}$/i.test(item.previousVersionId || '')))
      && new Set(record.assets.map(item => item.id)).size === record.assets.length
      && custodyAncestryValid(record.assets);
  }
  if (key === STATE_KEY) {
    const state = record.state;
    return record.schema === `${SCHEMA}.State`
      && state && typeof state === 'object' && !Array.isArray(state)
      && (state.notes === undefined || typeof state.notes === 'string')
      && (state.favourites === undefined || (Array.isArray(state.favourites)
          && state.favourites.every(value => typeof value === 'string')))
      && (state.recent === undefined || (Array.isArray(state.recent)
          && state.recent.every(value => value && typeof value === 'object' && !Array.isArray(value))));
  }
  return false;
}
// Attach the R2 read version privately to the parsed record. Never send an
// ETag through JSON, turn it into owner authority or mistake a read for a lock.
const readVersions = new WeakMap();
class VaultWriteConflict extends Error {
  constructor() { super('PRIVATE_CONCURRENT_WRITE_CONFLICT'); }
}
// CP16: an owner editor must not silently replace state changed since its last read.
class VaultStateStaleError extends Error {
  constructor() { super('OWNER_STATE_HEAD_CHANGED'); }
}
async function readJson(bucket, key, fallback) {
  let object;
  try { object = await bucket.get(key); }
  catch { throw new VaultCustodyHold(); }
  if (!object) {
    if (fallback && typeof fallback === 'object') readVersions.set(fallback, null);
    return fallback; // Legitimate first-run absence: create-once CAS.
  }
  let parsed;
  try { parsed = JSON.parse(await object.text()); }
  catch { throw new VaultCustodyHold(); }
  if (!custodyShapeValid(parsed, key)) throw new VaultCustodyHold();
  readVersions.set(parsed, object.etag);
  return parsed;
}

async function writeJson(bucket, key, value, expectedPrevious = undefined) {
  const options = {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  };
  if (expectedPrevious !== undefined) {
    if (!expectedPrevious || !readVersions.has(expectedPrevious)) throw new VaultCustodyHold();
    const version = readVersions.get(expectedPrevious);
    if (version === null) {
      options.onlyIf = new Headers({ 'If-None-Match': '*' });
    } else {
      if (typeof version !== 'string' || !version) throw new VaultCustodyHold();
      options.onlyIf = { etagMatches: version };
    }
  }
  // R2 evaluates onlyIf against committed state atomically. A null return
  // means the write was not stored; never acknowledge an editor's lost update.
  const committed = await bucket.put(key, JSON.stringify(value, null, 2), options);
  if (expectedPrevious !== undefined && committed === null) throw new VaultWriteConflict();
}

// A successful index PUT must survive independent readback without losing
// any existing purposeful bodies. This is detection, not a multi-writer lock.
async function verifyIndexWrite(bucket, expected) {
  const actual = await readJson(bucket, INDEX_KEY, null);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new VaultBodyIntegrityError('BODY_INDEX_READBACK_MISMATCH');
  }
}

async function verifyStateWrite(bucket, expected) {
  const actual = await readJson(bucket, STATE_KEY, null);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new VaultBodyIntegrityError('OWNER_STATE_READBACK_MISMATCH');
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
    state_revision: await sha256Text(JSON.stringify(stateRecord)),
    bodies: Array.isArray(bodyIndex.bodies) ? bodyIndex.bodies : [],
    bodies_updated_at: bodyIndex.updated_at || null,
    boundary: 'Private owner storage. Nothing in this response is a public-publication claim.'
  };
}

async function saveState(bucket, payload) {
  // A PUT may update a healthy state or create a genuinely absent state;
  // it may never overwrite an existing unreadable state.
  const priorState = await readJson(bucket, STATE_KEY, { schema: `${SCHEMA}.State`, updated_at: null, state: safeState({}) });
  // Opt-in editor precondition. Existing API clients remain compatible, but
  // the JM Owner Room now supplies the exact last-observed state revision.
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'expectedStateRevision')) {
    const expected = payload.expectedStateRevision;
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)
      || await sha256Text(JSON.stringify(priorState)) !== expected) {
      throw new VaultStateStaleError();
    }
  }
  const now = new Date().toISOString();
  const record = {
    schema: `${SCHEMA}.State`,
    updated_at: now,
    state: safeState(payload?.state)
  };
  await writeJson(bucket, STATE_KEY, record, priorState);
  await verifyStateWrite(bucket, record);
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
    // A matching index entry is not proof that its source bytes still exist.
    await verifiedBody(bucket, `${BODY_PREFIX}/${previous.id}.html`, previous.sha256, previous.bytes);
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
  await writeJson(bucket, INDEX_KEY, next, index);
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
  if (hash === base.sha256) {
    // Do not acknowledge an unchanged edit when the held ancestor is damaged.
    await verifiedBody(bucket, `${BODY_PREFIX}/${base.id}.html`, base.sha256, base.bytes);
    return { unchanged: true, body: base };
  }
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
  await writeJson(bucket, INDEX_KEY, nextIndex, index);
  await verifyIndexWrite(bucket, nextIndex);
  return { unchanged: false, body: record };
}

async function deleteBody(bucket, id) {
  const index = await readJson(bucket, INDEX_KEY, { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  const bodies = Array.isArray(index.bodies) ? index.bodies : [];
  const target = bodies.find(item => item.id === id);
  if (!target) return { found: false };

  // CP13: A revision is an immutable ancestor, not a disposable duplicate.
  // Refuse deletion while any retained revision still points to this source.
  // This protects exact previousVersionId traversal and cold recovery.
  if (bodies.some(item => item.previousVersionId === id)) {
    return { error: json({
      schema: SCHEMA,
      error: 'BODY_ANCESTOR_STILL_REFERENCED',
      recovery: 'PRESERVE_ANCESTOR_OR_REMOVE_DEPENDENT_REVISIONS_FIRST'
    }, 409) };
  }

  // Never destroy the sole source object while the old index still points to it.
  // A failed index write must leave the recoverable source and old index intact.
  const objectKey = `${BODY_PREFIX}/${target.id}.html`;
  await verifiedBody(bucket, objectKey, target.sha256, target.bytes);
  const now = new Date().toISOString();
  const nextIndex = {
    schema: `${SCHEMA}.BodyIndex`,
    updated_at: now,
    bodies: bodies.filter(item => item.id !== id)
  };
  await writeJson(bucket, INDEX_KEY, nextIndex, index);
  await verifyIndexWrite(bucket, nextIndex);
  // If deletion is interrupted after index commit, the orphaned bytes are kept
  // for manual recovery. Never roll back the index by overwriting other writers.
  try { await bucket.delete(objectKey); }
  catch { throw new VaultBodyIntegrityError('BODY_DELETE_READBACK_MISMATCH'); }
  let stillHeld;
  try { stillHeld = await bucket.get(objectKey); }
  catch { throw new VaultBodyIntegrityError('BODY_DELETE_READBACK_MISMATCH'); }
  if (stillHeld) throw new VaultBodyIntegrityError('BODY_DELETE_READBACK_MISMATCH');
  return { found: true, body: target };
}

async function createSnapshot(bucket) {
  const current = await manifest(bucket);
  const now = new Date().toISOString();
  // A timestamp alone can collide during rapid repeated snapshots.
  const key = `${SNAPSHOT_PREFIX}/${now.replace(/[:.]/g, '-')}-${crypto.randomUUID()}.json`;
  const snapshot = {
    schema: `${SCHEMA}.Snapshot`,
    created_at: now,
    state: current.state,
    bodies: current.bodies,
    note: 'Snapshot contains owner state and body metadata. HTML bytes remain single R2 body objects and are not duplicated by this snapshot.'
  };
  await writeJson(bucket, key, snapshot);
  // A storage PUT acknowledgement is not a durable snapshot receipt.
  // Verify the exact stored JSON bytes, not only the returned metadata.
  let held;
  try { held = await bucket.get(key); }
  catch { throw new VaultBodyIntegrityError('SNAPSHOT_READBACK_MISMATCH'); }
  if (!held) throw new VaultBodyIntegrityError('SNAPSHOT_READBACK_MISMATCH');
  let actual;
  try { actual = await held.text(); }
  catch { throw new VaultBodyIntegrityError('SNAPSHOT_READBACK_MISMATCH'); }
  if (actual !== JSON.stringify(snapshot, null, 2)) {
    throw new VaultBodyIntegrityError('SNAPSHOT_READBACK_MISMATCH');
  }
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

// CP19: explicit, owner-authenticated, read-only portable recovery of ONE
// version chain. No extra R2 objects, silent backup claims or automatic writes.
async function exportBodyLineage(bucket, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) {
    return json({ schema: SCHEMA, error: 'LINEAGE_EXPORT_BODY_ID_REQUIRED' }, 400);
  }
  const originalIndex = await readJson(bucket, INDEX_KEY,
    { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  const byId = new Map(originalIndex.bodies.map(item => [item.id, item]));
  let selected = byId.get(id);
  if (!selected) return json({ schema: SCHEMA, error: 'BODY_NOT_FOUND' }, 404);
  const selectedEntries = [], versions = [];
  const MAX_VERSIONS = 16;
  const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
  let totalBytes = 0;
  // Preflight the complete chain before reading any potentially large HTML
  // bodies. This is a bound on actual source capacity, not only JSON headers.
  while (selected) {
    if (selectedEntries.length >= MAX_VERSIONS) {
      return json({ schema: SCHEMA, error: 'LINEAGE_EXPORT_VERSION_LIMIT', max_versions: MAX_VERSIONS }, 409);
    }
    if (!/^[a-f0-9]{64}$/i.test(selected.sha256 || '')
      || !Number.isSafeInteger(selected.bytes) || selected.bytes < 0) {
      return json({ schema: SCHEMA, error: 'LINEAGE_EXPORT_UNVERIFIED_LEGACY_SOURCE' }, 409);
    }
    if (selected.bytes + totalBytes > MAX_TOTAL_BYTES) {
      return json({ schema: SCHEMA, error: 'LINEAGE_EXPORT_BYTE_LIMIT', max_bytes: MAX_TOTAL_BYTES }, 413);
    }
    selectedEntries.push(selected);
    totalBytes += selected.bytes;
    selected = selected.previousVersionId ? byId.get(selected.previousVersionId) : null;
  }
  for (const entry of selectedEntries) {
    const source = await verifiedBody(bucket, `${BODY_PREFIX}/${entry.id}.html`,
      entry.sha256, entry.bytes);
    versions.push({ metadata: entry, content: source.content });
  }
  // The index must not have changed while bytes were being assembled.
  // A race can invalidate custody even if each held body was immutable.
  const currentIndex = await readJson(bucket, INDEX_KEY,
    { schema: `${SCHEMA}.BodyIndex`, updated_at: null, bodies: [] });
  if (JSON.stringify(currentIndex) !== JSON.stringify(originalIndex)
    || readVersions.get(currentIndex) !== readVersions.get(originalIndex)) {
    throw new VaultWriteConflict();
  }
  return json({
    schema: `${SCHEMA}.LineageExport`, selected_id: id,
    exported_at: new Date().toISOString(), version_count: versions.length,
    source_bytes: totalBytes, order: 'SELECTED_HEAD_TO_OLDEST_ANCESTOR',
    versions,
    boundary: 'AUTHENTICATED_ON_DEMAND_EXPORT. NOT A COLD BACKUP UNTIL SAVED AND INDEPENDENTLY VERIFIED OUTSIDE THIS HOST.'
  }, 200, { 'content-disposition': `attachment; filename="JM_Vault_Lineage_${id}.json"` });
}


// CP21: multi-format ORIGINAL BYTE custody; never HTML/base64 wrapping.
async function assetHash(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
}
function emptyAssetIndex() {
  return { schema: `${SCHEMA}.AssetIndex`, updated_at: null, assets: [] };
}
async function assetIndex(bucket) {
  return readJson(bucket, ASSET_INDEX_KEY, emptyAssetIndex());
}
// The old repeated-group base64 regex over multi-megabyte sources can
// overflow a JS call stack. A bounded scan + strict canonical byte hash is
// safe for both original small assets and 2 MiB CP26 source pieces.
function validBoundedBase64(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return false;
  const padding=value.endsWith('==')?2:value.endsWith('=')?1:0;
  const end=value.length-padding;
  for(let i=0;i<end;i+=32768) {
    if (!/^[A-Za-z0-9+/]*$/.test(value.slice(i,Math.min(end,i+32768)))) return false;
  }
  return true;
}

function decodeAsset(value) {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_ASSET_BYTES / 3) * 4 + 4
    || !validBoundedBase64(value)) return null;
  try {
    const str = atob(value);
    if (str.length > MAX_ASSET_BYTES) return null;
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes;
  } catch { return null; }
}
async function assetBytes(bucket, metadata) {
  if (metadata.storageKind === 'chunked-v1') {
    const desc={
      uploadId:metadata.id,sourceInstanceId:metadata.sourceInstanceId,
      sha256:metadata.sha256,bytes:metadata.bytes,partCount:metadata.partCount,
      fileName:metadata.fileName,expectedBaseId:'',expectedBaseSha256:''
    };
    // Metadata for finalized immutable part objects records original revision
    // preconditions. Read them directly; don't mistake a new head for old bytes.
    const combined=new Uint8Array(metadata.bytes);
    for (let i=0;i<metadata.partCount;i++){
      const key=assetPartKey(metadata.id,i);
      let object;try{object=await bucket.get(key);}catch{throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE');}
      if (!object) throw new VaultBodyIntegrityError('ASSET_PART_MISSING');
      let part;try{part=new Uint8Array(await object.arrayBuffer());}catch{throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE');}
      const size=i===metadata.partCount-1?metadata.bytes-ASSET_PART_BYTES*(metadata.partCount-1):ASSET_PART_BYTES;
      if (part.length!==size || await assetHash(part)!==metadata.partHashes[i]
        || object.customMetadata?.uploadId!==metadata.id
        || object.customMetadata?.sourceInstanceId!==metadata.sourceInstanceId
        || object.customMetadata?.fullSha256!==metadata.sha256
        || object.customMetadata?.index!==String(i)
        || object.customMetadata?.partCount!==String(metadata.partCount)) {
        throw new VaultBodyIntegrityError('ASSET_PART_INTEGRITY_MISMATCH');
      }
      combined.set(part,i*ASSET_PART_BYTES);
    }
    if(await assetHash(combined)!==metadata.sha256)
      throw new VaultBodyIntegrityError('ASSET_WHOLE_FILE_INTEGRITY_MISMATCH');
    return combined;
  }
  let object;
  try { object = await bucket.get(`${ASSET_PREFIX}/${metadata.id}.bin`); }
  catch { throw new VaultBodyIntegrityError('ASSET_BYTES_UNREADABLE'); }
  if (!object) throw new VaultBodyIntegrityError('ASSET_BYTES_MISSING');
  let bytes;
  try { bytes = new Uint8Array(await object.arrayBuffer()); }
  catch { throw new VaultBodyIntegrityError('ASSET_BYTES_UNREADABLE'); }
  if (bytes.length > MAX_ASSET_BYTES || bytes.length !== metadata.bytes
      || await assetHash(bytes) !== metadata.sha256.toLowerCase()) {
    throw new VaultBodyIntegrityError('ASSET_INTEGRITY_MISMATCH');
  }
  return bytes;
}

// CP26 — one sovereign file; the R2 part objects ARE its original bytes.
// Part identity is fixed by the locally persisted uploadId, never a new
// purpose on retry. No dynamic source evaluation or automatic publication.
function assetPartKey(id, partIndex) {
  return `${ASSET_PREFIX}/parts/${id}/${partIndex}.bin`;
}
function chunkDescription(f) {
  if (!f || typeof f !== 'object'
    || !/^[0-9a-f-]{36}$/i.test(f.uploadId || '')
    || !/^asset-[0-9a-f-]{36}$/i.test(f.sourceInstanceId || '')
    || !/^[a-f0-9]{64}$/.test(f.sha256 || '')
    || !Number.isSafeInteger(f.bytes) || f.bytes <= MAX_ASSET_BYTES || f.bytes > MAX_CHUNKED_ASSET_BYTES
    || !Number.isSafeInteger(f.partCount) || f.partCount < 7 || f.partCount > MAX_ASSET_PARTS
    || f.partCount !== Math.ceil(f.bytes / ASSET_PART_BYTES)
    || typeof f.fileName !== 'string' || !f.fileName
    || (f.expectedBaseId != null && !/^[0-9a-f-]{36}$/i.test(f.expectedBaseId))
    || (f.expectedBaseSha256 != null && !/^[a-f0-9]{64}$/.test(f.expectedBaseSha256))
    || Boolean(f.expectedBaseId) !== Boolean(f.expectedBaseSha256)) return null;
  return {
    uploadId:f.uploadId, sourceInstanceId:f.sourceInstanceId,
    sha256:f.sha256, bytes:f.bytes, partCount:f.partCount,
    fileName:safeFileName(f.fileName), name:boundedString(f.name || f.fileName,500),
    mediaType:typeof f.mediaType === 'string'
      && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(f.mediaType)
      && f.mediaType.length <= 100 ? f.mediaType.toLowerCase() : 'application/octet-stream',
    expectedBaseId:f.expectedBaseId || '',
    expectedBaseSha256:f.expectedBaseSha256 || ''
  };
}
function chunkMetadata(desc, i, hash) {
  return {
    uploadId:desc.uploadId, sourceInstanceId:desc.sourceInstanceId,
    fullSha256:desc.sha256, totalBytes:String(desc.bytes), partCount:String(desc.partCount),
    index:String(i), sha256:hash, fileName:desc.fileName,
    expectedBaseId:desc.expectedBaseId, expectedBaseSha256:desc.expectedBaseSha256
  };
}
function sameChunkMetadata(actual, expected) {
  return !!actual && Object.entries(expected).every(([k,v])=>actual[k]===v);
}
async function readAssetPart(bucket, desc, i, expectedHash=null) {
  let object;
  try { object=await bucket.get(assetPartKey(desc.uploadId,i)); }
  catch { throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE'); }
  if (!object) throw new VaultBodyIntegrityError('ASSET_PART_MISSING');
  let bytes;
  try { bytes=new Uint8Array(await object.arrayBuffer()); }
  catch { throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE'); }
  const expectedSize = i === desc.partCount-1
    ? desc.bytes - ASSET_PART_BYTES*(desc.partCount-1) : ASSET_PART_BYTES;
  if (bytes.length !== expectedSize
    || (expectedHash && await assetHash(bytes) !== expectedHash)) {
    throw new VaultBodyIntegrityError('ASSET_PART_INTEGRITY_MISMATCH');
  }
  const h=await assetHash(bytes);
  if (!sameChunkMetadata(object.customMetadata,chunkMetadata(desc,i,h)))
    throw new VaultBodyIntegrityError('ASSET_PART_SOURCE_IDENTITY_MISMATCH');
  return {bytes,hash:h};
}
// CP27: authenticated, read-only reconciliation of a SINGLE checkpoint-held
// upload. Enumerates only the caller's immutable part keys, not an R2 bucket
// listing. Every present byte/identity is reverified before being reported;
// missing parts are not misreported as completed custody.
async function inspectAssetParts(bucket, payload) {
  const desc=chunkDescription(payload?.file);
  if (!desc) return {error:json({schema:SCHEMA,error:'ASSET_PART_INSPECTION_DESCRIPTION_INVALID'},400)};
  const index=await assetIndex(bucket);
  const current=index.assets.find(a=>a.sourceInstanceId===desc.sourceInstanceId)||null;
  if (current && current.sha256===desc.sha256 && current.bytes===desc.bytes) {
    if (current.fileName!==desc.fileName)
      return {error:json({schema:SCHEMA,error:'ASSET_PART_INSPECTION_HEAD_CHANGED'},409)};
    await assetBytes(bucket,current);
    return {already_indexed:true,asset_id:current.id,partCount:desc.partCount,
      present:[],missing:[],boundary:'VERIFIED_INDEXED_ORIGINAL_NOT_AN_UNINDEXED_UPLOAD'};
  }
  if (current && (current.id!==desc.expectedBaseId || current.sha256!==desc.expectedBaseSha256))
    return {error:json({schema:SCHEMA,error:'ASSET_PART_INSPECTION_HEAD_CHANGED'},409)};
  if (!current && desc.expectedBaseId)
    return {error:json({schema:SCHEMA,error:'ASSET_PART_INSPECTION_BASE_MISSING'},409)};
  const present=[],missing=[];
  for(let i=0;i<desc.partCount;i++) {
    const key=assetPartKey(desc.uploadId,i);
    let obj;try{obj=await bucket.get(key);}catch{throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE');}
    if (!obj) {missing.push(i);continue;}
    const checked=await readAssetPart(bucket,desc,i);
    present.push({partIndex:i,sha256:checked.hash});
  }
  return {already_indexed:false,partCount:desc.partCount,present,missing,
    boundary:'READ_ONLY_CHECKPOINT_BOUND_PART_INSPECTION_NO_GARBAGE_COLLECTION'};
}

async function uploadAssetPart(bucket,payload) {
  const desc=chunkDescription(payload?.file);
  const i=payload?.partIndex;
  if (!desc || !Number.isSafeInteger(i) || i<0 || i>=desc.partCount)
    return {error:json({schema:SCHEMA,error:'ASSET_PART_DESCRIPTION_INVALID'},400)};
  const bytes=decodeAsset(payload?.base64);
  const expectedLen=i===desc.partCount-1
    ? desc.bytes-ASSET_PART_BYTES*(desc.partCount-1):ASSET_PART_BYTES;
  if (!bytes || bytes.length!==expectedLen || bytes.length>ASSET_PART_BYTES)
    return {error:json({schema:SCHEMA,error:'ASSET_PART_SIZE_HOLD'},413)};
  const hash=await assetHash(bytes);
  if (hash!==payload.partSha256) return {error:json({schema:SCHEMA,error:'ASSET_PART_CLIENT_HASH_MISMATCH'},409)};
  // Refuse a stale/differently intended revision BEFORE storing additional R2 bytes.
  const index=await assetIndex(bucket),current=index.assets.find(a=>a.sourceInstanceId===desc.sourceInstanceId);
  if (current && (current.sha256!==desc.sha256
      && (current.id!==desc.expectedBaseId || current.sha256!==desc.expectedBaseSha256))) {
    return {error:json({schema:SCHEMA,error:'ASSET_PART_REVISION_HEAD_CHANGED'},409)};
  }
  if (!current && desc.expectedBaseId) return {error:json({schema:SCHEMA,error:'ASSET_PART_REVISION_BASE_MISSING'},409)};
  const meta=chunkMetadata(desc,i,hash), key=assetPartKey(desc.uploadId,i);
  let prior;
  try {prior=await bucket.get(key);} catch {throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE');}
  if (prior) {
    const original=await readAssetPart(bucket,desc,i,hash);
    if (original.hash!==hash) throw new VaultBodyIntegrityError('ASSET_PART_ALREADY_DIFFERENT');
    return {unchanged:true,partIndex:i,sha256:hash};
  }
  const committed=await bucket.put(key,bytes,{
    onlyIf:new Headers({'If-None-Match':'*'}),
    httpMetadata:{contentType:'application/octet-stream'},
    customMetadata:meta
  });
  // Concurrent create can race. Only exact identity/bytes may be acknowledged.
  if (committed===null) {
    await readAssetPart(bucket,desc,i,hash);
    return {unchanged:true,partIndex:i,sha256:hash};
  }
  await readAssetPart(bucket,desc,i,hash);
  return {unchanged:false,partIndex:i,sha256:hash};
}
async function finishChunkedAsset(bucket,payload) {
  const desc=chunkDescription(payload?.file);
  if (!desc) return {error:json({schema:SCHEMA,error:'ASSET_FINISH_DESCRIPTION_INVALID'},400)};
  const index=await assetIndex(bucket), all=index.assets;
  const current=all.find(a=>a.sourceInstanceId===desc.sourceInstanceId)||null;
  if (current && current.sha256===desc.sha256 && current.bytes===desc.bytes) {
    await assetBytes(bucket,current);
    return {unchanged:true,asset:current};
  }
  if (current && (current.id!==desc.expectedBaseId || current.sha256!==desc.expectedBaseSha256))
    return {error:json({schema:SCHEMA,error:'ASSET_FINISH_HEAD_CHANGED'},409)};
  if (!current && desc.expectedBaseId)
    return {error:json({schema:SCHEMA,error:'ASSET_FINISH_BASE_MISSING'},409)};
  if (all.length>=2000) return {error:json({schema:SCHEMA,error:'ASSET_INDEX_CAPACITY_HOLD'},409)};
  // One full original buffer for end-to-end SHA; individual network requests
  // and immutable R2 source pieces are strictly limited to 2 MiB.
  const whole=new Uint8Array(desc.bytes), hashes=[];
  for(let i=0;i<desc.partCount;i++) {
    const part=await readAssetPart(bucket,desc,i);
    whole.set(part.bytes,i*ASSET_PART_BYTES); hashes.push(part.hash);
  }
  if (await assetHash(whole)!==desc.sha256)
    throw new VaultBodyIntegrityError('ASSET_WHOLE_FILE_INTEGRITY_MISMATCH');
  const now=new Date().toISOString();
  const asset={
    id:desc.uploadId,sourceInstanceId:desc.sourceInstanceId,
    name:desc.name,fileName:desc.fileName,mediaType:desc.mediaType,
    sha256:desc.sha256,bytes:desc.bytes,storageKind:'chunked-v1',
    partCount:desc.partCount,partHashes:hashes,
    previousVersionId:current?.id||null,uploaded_at:now,
    status:'PRIVATE_ORIGINAL_CHUNKED_SOURCE_NOT_PUBLICATION'
  };
  // All part objects constitute ONE original file, no second wrapped copy.
  const next={schema:`${SCHEMA}.AssetIndex`,updated_at:now,assets:[asset,...all]};
  await writeJson(bucket,ASSET_INDEX_KEY,next,index);
  if(JSON.stringify(await assetIndex(bucket))!==JSON.stringify(next))
    throw new VaultBodyIntegrityError('ASSET_INDEX_READBACK_MISMATCH');
  await assetBytes(bucket,asset);
  return {unchanged:false,asset};
}

async function uploadAsset(bucket, payload) {
  const file = payload?.file;
  if (!file || typeof file !== 'object' || Array.isArray(file)
    || !/^asset-[0-9a-f-]{36}$/i.test(file.sourceInstanceId || '')) {
    return { error: json({ schema: SCHEMA, error: 'ASSET_SOURCE_ID_REQUIRED' }, 400) };
  }
  const bytes = decodeAsset(file.base64);
  if (!bytes) return { error: json({ schema: SCHEMA, error: 'ASSET_INVALID_OR_OVERBOUNDED', max_bytes: MAX_ASSET_BYTES }, 413) };
  const hash = await assetHash(bytes);
  if (typeof file.sha256 !== 'string' || file.sha256.toLowerCase() !== hash) {
    return { error: json({ schema: SCHEMA, error: 'ASSET_CLIENT_HASH_MISMATCH' }, 409) };
  }
  const fileName = safeFileName(file.fileName || 'jm-original-file');
  const name = boundedString(file.name || fileName, 500);
  const mediaType = typeof file.mediaType === 'string'
    && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.mediaType) && file.mediaType.length <= 100
      ? file.mediaType.toLowerCase() : 'application/octet-stream';
  const index = await assetIndex(bucket), assets = index.assets;
  const current = assets.find(item => item.sourceInstanceId === file.sourceInstanceId) || null;
  if (current) {
    if (current.sha256 === hash && current.bytes === bytes.length) {
      await assetBytes(bucket, current);
      return { unchanged: true, asset: current };
    }
    if (file.expectedBaseId !== current.id || file.expectedBaseSha256 !== current.sha256) {
      return { error: json({ schema: SCHEMA, error: 'ASSET_REVISION_HEAD_CHANGED' }, 409) };
    }
  } else if (file.expectedBaseId || file.expectedBaseSha256) {
    return { error: json({ schema: SCHEMA, error: 'ASSET_REVISION_BASE_NOT_FOUND' }, 409) };
  }
  if (assets.length >= 2000) return { error: json({ schema: SCHEMA, error: 'ASSET_INDEX_CAPACITY_HOLD' }, 409) };
  const id = crypto.randomUUID(), now = new Date().toISOString();
  // Actual binary R2 object, no duplicate HTML carrier or JSON wrapper.
  await bucket.put(`${ASSET_PREFIX}/${id}.bin`, bytes, {
    httpMetadata: { contentType: 'application/octet-stream' }, customMetadata: { sha256: hash }
  });
  const asset = { id, name, fileName, mediaType, bytes: bytes.length, sha256: hash,
    sourceInstanceId: file.sourceInstanceId, previousVersionId: current?.id || null,
    uploaded_at: now, status: 'PRIVATE_ORIGINAL_BYTES_NOT_PUBLICATION' };
  await assetBytes(bucket, asset);
  const next = { schema: `${SCHEMA}.AssetIndex`, updated_at: now, assets: [asset, ...assets] };
  await writeJson(bucket, ASSET_INDEX_KEY, next, index);
  const confirmed = await assetIndex(bucket);
  if (JSON.stringify(confirmed) !== JSON.stringify(next)) {
    throw new VaultBodyIntegrityError('ASSET_INDEX_READBACK_MISMATCH');
  }
  return { unchanged: false, asset };
}
async function downloadAsset(bucket, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return json({ schema: SCHEMA, error: 'ASSET_ID_INVALID' }, 400);
  const index = await assetIndex(bucket), asset = index.assets.find(x => x.id === id);
  if (!asset) return json({ schema: SCHEMA, error: 'ASSET_NOT_FOUND' }, 404);
  const bytes = await assetBytes(bucket, asset);
  return new Response(bytes, { headers: {
    'content-type': 'application/octet-stream', 'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff', 'x-jm-asset-sha256': asset.sha256,
    'content-disposition': `attachment; filename="${safeFileName(asset.fileName)}"`
  } });
}
async function removeAsset(bucket, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return json({ schema: SCHEMA, error: 'ASSET_ID_INVALID' }, 400);
  const index = await assetIndex(bucket), asset = index.assets.find(x => x.id === id);
  if (!asset) return json({ schema: SCHEMA, error: 'ASSET_NOT_FOUND' }, 404);
  if (index.assets.some(x => x.previousVersionId === id)) {
    return json({ schema: SCHEMA, error: 'ASSET_ANCESTOR_STILL_REFERENCED' }, 409);
  }
  await assetBytes(bucket, asset);
  const next = { schema: `${SCHEMA}.AssetIndex`, updated_at: new Date().toISOString(),
    assets: index.assets.filter(x => x.id !== id) };
  await writeJson(bucket, ASSET_INDEX_KEY, next, index);
  if (JSON.stringify(await assetIndex(bucket)) !== JSON.stringify(next)) {
    throw new VaultBodyIntegrityError('ASSET_INDEX_READBACK_MISMATCH');
  }
  // Intentional owner removal of a leaf only. Interruptions preserve orphan bytes.
  try {
    if (asset.storageKind === 'chunked-v1') {
      for(let i=0;i<asset.partCount;i++) {
        const key=assetPartKey(asset.id,i);
        await bucket.delete(key);
        if (await bucket.get(key)) throw new VaultBodyIntegrityError('ASSET_DELETE_READBACK_HOLD');
      }
    } else {
      const key=`${ASSET_PREFIX}/${id}.bin`;
      await bucket.delete(key);
      if (await bucket.get(key)) throw new VaultBodyIntegrityError('ASSET_DELETE_READBACK_HOLD');
    }
  } catch { throw new VaultBodyIntegrityError('ASSET_DELETE_READBACK_HOLD'); }
  return json({ schema: SCHEMA, outcome: 'ASSET_REMOVED', asset });
}


// CP28: piecewise extended owner export; the original 24 MiB packet remains
// unchanged. A single read never base64-wraps an entire 64 MiB R2 original.
const EXTENDED_SOURCE_BYTES = 64 * 1024 * 1024;
const EXTENDED_SHARD_BYTES = 8 * 1024 * 1024;
function extendedLineage(index, selectedId) {
  const byId=new Map(index.assets.map(a=>[a.id,a]));
  let current=byId.get(selectedId), total=0;
  if (!current) return {error:json({schema:SCHEMA,error:'ASSET_NOT_FOUND'},404)};
  const versions=[],seen=new Set(),source=current.sourceInstanceId;
  while(current) {
    if (versions.length>=8) return {error:json({schema:SCHEMA,error:'ASSET_EXTENDED_VERSION_LIMIT'},409)};
    if(seen.has(current.id) || current.sourceInstanceId!==source)
      throw new VaultCustodyHold();
    if (total+current.bytes>EXTENDED_SOURCE_BYTES)
      return {error:json({schema:SCHEMA,error:'ASSET_EXTENDED_TOTAL_LIMIT',max_bytes:EXTENDED_SOURCE_BYTES},413)};
    versions.push(current);seen.add(current.id);total+=current.bytes;
    current=current.previousVersionId?byId.get(current.previousVersionId):null;
  }
  return {versions,total};
}
async function extendedPlan(bucket,selectedId) {
  if(!/^[0-9a-f-]{36}$/i.test(selectedId||''))
    return json({schema:SCHEMA,error:'ASSET_EXTENDED_ID_INVALID'},400);
  const index=await assetIndex(bucket),lineage=extendedLineage(index,selectedId);
  if(lineage.error)return lineage.error;
  const pin=await sha256Text(JSON.stringify(index.assets));
  return json({schema:`${SCHEMA}.AssetExtendedPlan`,selected_id:selectedId,
    index_pin_sha256:pin,version_count:lineage.versions.length,source_bytes:lineage.total,
    shard_bytes:EXTENDED_SHARD_BYTES,order:'SELECTED_HEAD_TO_OLDEST_ANCESTOR',
    versions:lineage.versions,boundary:'READ_ONLY_PLAN_NOT_AN_OFFSITE_BACKUP'});
}
async function extendedShard(bucket,selectedId,versionId,shardText,pin) {
  if(!/^[0-9a-f-]{36}$/i.test(selectedId||'')
    || !/^[0-9a-f-]{36}$/i.test(versionId||'')
    || !/^[a-f0-9]{64}$/.test(pin||'')
    || !/^(0|[1-9][0-9]?)$/.test(shardText||'')) {
    return json({schema:SCHEMA,error:'ASSET_EXTENDED_REQUEST_INVALID'},400);
  }
  const index=await assetIndex(bucket),lineage=extendedLineage(index,selectedId);
  if(lineage.error)return lineage.error;
  if(await sha256Text(JSON.stringify(index.assets))!==pin)
    return json({schema:SCHEMA,error:'ASSET_EXTENDED_INDEX_CHANGED'},409);
  const metadata=lineage.versions.find(v=>v.id===versionId);
  if(!metadata)return json({schema:SCHEMA,error:'ASSET_EXTENDED_VERSION_NOT_IN_LINEAGE'},409);
  const shardIndex=Number(shardText);
  const start=shardIndex*EXTENDED_SHARD_BYTES;
  if(start>=metadata.bytes)return json({schema:SCHEMA,error:'ASSET_EXTENDED_SHARD_OUT_OF_RANGE'},400);
  const len=Math.min(EXTENDED_SHARD_BYTES,metadata.bytes-start);
  let bytes;
  if(metadata.storageKind==='chunked-v1') {
    // Four immutable 2 MiB parts at a time; never concatenate 64 MiB here.
    const chunks=[];
    const first=start/ASSET_PART_BYTES,last=Math.ceil((start+len)/ASSET_PART_BYTES);
    for(let i=first;i<last;i++) {
      let object;
      try {object=await bucket.get(assetPartKey(metadata.id,i));}
      catch {throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE');}
      if(!object)throw new VaultBodyIntegrityError('ASSET_PART_MISSING');
      let part;
      try{part=new Uint8Array(await object.arrayBuffer());}
      catch{throw new VaultBodyIntegrityError('ASSET_PART_UNREADABLE');}
      const size=i===metadata.partCount-1?
        metadata.bytes-ASSET_PART_BYTES*(metadata.partCount-1):ASSET_PART_BYTES;
      if(part.length!==size || await assetHash(part)!==metadata.partHashes[i]
        || object.customMetadata?.uploadId!==metadata.id
        || object.customMetadata?.sourceInstanceId!==metadata.sourceInstanceId
        || object.customMetadata?.fullSha256!==metadata.sha256
        || object.customMetadata?.index!==String(i)
        || object.customMetadata?.partCount!==String(metadata.partCount))
        throw new VaultBodyIntegrityError('ASSET_PART_INTEGRITY_MISMATCH');
      chunks.push(part);
    }
    bytes=new Uint8Array(len);let cursor=0;
    for(const part of chunks) {bytes.set(part,cursor);cursor+=part.length;}
    if(cursor!==len)throw new VaultBodyIntegrityError('ASSET_EXTENDED_SHARD_LENGTH_HOLD');
  } else {
    const full=await assetBytes(bucket,metadata);
    bytes=full.subarray(start,start+len);
  }
  const sha=await assetHash(bytes);
  const latest=await assetIndex(bucket);
  if(await sha256Text(JSON.stringify(latest.assets))!==pin
    || readVersions.get(latest)!==readVersions.get(index))
    throw new VaultWriteConflict();
  return json({schema:`${SCHEMA}.AssetExtendedShard`,selected_id:selectedId,
    version_id:versionId,index_pin_sha256:pin,shard_index:shardIndex,
    offset:start,bytes:len,sha256:sha,base64:assetBase64(bytes),
    boundary:'OWNER_PRIVATE_READ_ONLY_EXACT_BYTES'});
}

// CP22: explicitly owner-triggered exact binary ancestry export, using only
// the original authenticated Vault and immutable binary objects.
function assetBase64(bytes) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 32768) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
  }
  return btoa(chunks.join(''));
}
async function exportAssetLineage(bucket, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) {
    return json({ schema: SCHEMA, error: 'ASSET_LINEAGE_ID_REQUIRED' }, 400);
  }
  const original = await assetIndex(bucket);
  const byId = new Map(original.assets.map(a => [a.id, a]));
  let selected = byId.get(id);
  if (!selected) return json({ schema: SCHEMA, error: 'ASSET_NOT_FOUND' }, 404);
  const entries = [];
  let total = 0;
  const MAX_VERSIONS = 8, MAX_TOTAL = 24 * 1024 * 1024;
  // Bound the *complete* chain before reading any potentially large objects.
  while (selected) {
    if (entries.length >= MAX_VERSIONS) {
      return json({ schema: SCHEMA, error: 'ASSET_LINEAGE_VERSION_LIMIT', max_versions: MAX_VERSIONS }, 409);
    }
    if (selected.bytes + total > MAX_TOTAL) {
      return json({ schema: SCHEMA, error: 'ASSET_LINEAGE_BYTE_LIMIT', max_bytes: MAX_TOTAL }, 413);
    }
    entries.push(selected); total += selected.bytes;
    selected = selected.previousVersionId ? byId.get(selected.previousVersionId) : null;
  }
  const versions = [];
  for (const metadata of entries) {
    const bytes = await assetBytes(bucket, metadata);
    versions.push({ metadata, base64: assetBase64(bytes) });
  }
  const current = await assetIndex(bucket);
  if (JSON.stringify(current) !== JSON.stringify(original)
    || readVersions.get(current) !== readVersions.get(original)) {
    throw new VaultWriteConflict();
  }
  return json({
    schema: `${SCHEMA}.AssetLineageExport`,
    selected_id: id, exported_at: new Date().toISOString(),
    version_count: versions.length, source_bytes: total,
    order: 'SELECTED_HEAD_TO_OLDEST_ANCESTOR', versions,
    boundary: 'OWNER_TRIGGERED_EXACT_BINARY_LINEAGE_EXPORT; NOT_A_COLD_BACKUP_UNTIL_INDEPENDENTLY_AUDITED'
  }, 200, { 'content-disposition': `attachment; filename="JM_Vault_Asset_Lineage_${id}.json"` });
}


// CP28: segmented, owner-only, READ-ONLY cold export. This uses the original
// R2 asset index and immutable source objects, not another cloud store.
// The catalog is a map of immutable per-version pieces, not a claim that
// the owner has downloaded them. The original CP22 JSON route remains intact.
const COLD_CATALOG_SCHEMA = 'JM.OwnerVault/0.1.AssetPartsCatalog';
function coldPartFilename(id,i) {
  return 'JM_Vault_Part_' + id + '_' + String(i).padStart(2,'0') + '.bin';
}
function coldAncestors(index,id) {
  const byId=new Map(index.assets.map(a=>[a.id,a]));
  let m=byId.get(id);
  if(!m) return null;
  const ancestors=[],seen=new Set();let total=0,source=null;
  while(m){
    if(ancestors.length>=8) throw new VaultBodyIntegrityError('COLD_LINEAGE_TOO_MANY_VERSIONS');
    if(seen.has(m.id)||source!==null&&m.sourceInstanceId!==source)
      throw new VaultBodyIntegrityError('COLD_LINEAGE_IDENTITY_HOLD');
    seen.add(m.id);source=m.sourceInstanceId;
    if(m.bytes>MAX_CHUNKED_ASSET_BYTES || total+m.bytes>8*MAX_CHUNKED_ASSET_BYTES)
      throw new VaultBodyIntegrityError('COLD_LINEAGE_SIZE_HOLD');
    total+=m.bytes;ancestors.push(m);
    if(m.previousVersionId && !byId.has(m.previousVersionId))
      throw new VaultBodyIntegrityError('COLD_LINEAGE_MISSING_ANCESTOR');
    m=m.previousVersionId?byId.get(m.previousVersionId):null;
  }
  return {ancestors,total};
}
async function catalogAssetParts(bucket,id) {
  if(!/^[0-9a-f-]{36}$/i.test(id||''))return json({schema:SCHEMA,error:'COLD_ASSET_ID_REQUIRED'},400);
  const original=await assetIndex(bucket);
  const ancestry=coldAncestors(original,id);
  if(!ancestry)return json({schema:SCHEMA,error:'ASSET_NOT_FOUND'},404);
  const versions=[];
  for(const metadata of ancestry.ancestors){
    const count=Math.max(1,Math.ceil(metadata.bytes/ASSET_PART_BYTES));
    let hashes;
    if(metadata.storageKind==='chunked-v1'){
      hashes=metadata.partHashes;
    }else{
      const bytes=await assetBytes(bucket,metadata); // <=12 MiB legacy original
      hashes=[];
      for(let i=0;i<count;i++)hashes.push(await assetHash(bytes.subarray(i*ASSET_PART_BYTES,(i+1)*ASSET_PART_BYTES)));
    }
    const parts=hashes.map((sha256,i)=>({
      index:i,bytes:i===count-1?metadata.bytes-ASSET_PART_BYTES*(count-1):ASSET_PART_BYTES,
      sha256,fileName:coldPartFilename(metadata.id,i)
    }));
    versions.push({metadata,parts});
  }
  const current=await assetIndex(bucket);
  if(JSON.stringify(current)!==JSON.stringify(original)
    ||readVersions.get(current)!==readVersions.get(original))
    throw new VaultWriteConflict();
  return json({schema:COLD_CATALOG_SCHEMA,selected_id:id,
    version_count:versions.length,source_bytes:ancestry.total,
    order:'SELECTED_HEAD_TO_OLDEST_ANCESTOR',part_bytes:ASSET_PART_BYTES,
    versions,boundary:'OWNER_SAVED_PIECES_REQUIRED; NOT_OFFSITE_OR_COLD_PROVEN_UNTIL_OFFLINE_VERIFIED'
  },200,{'content-disposition':'attachment; filename="JM_Vault_Cold_Catalog_'+id+'.json"'});
}
async function exportColdAssetPart(bucket,id,requested) {
  if(!/^[0-9a-f-]{36}$/i.test(id||'')||!/^(0|[1-9][0-9]?)$/.test(requested||''))
    return json({schema:SCHEMA,error:'COLD_PART_ID_INVALID'},400);
  const index=await assetIndex(bucket),asset=index.assets.find(a=>a.id===id);
  if(!asset)return json({schema:SCHEMA,error:'ASSET_NOT_FOUND'},404);
  const i=Number(requested),count=Math.max(1,Math.ceil(asset.bytes/ASSET_PART_BYTES));
  if(i>=count||count>MAX_ASSET_PARTS)
    return json({schema:SCHEMA,error:'COLD_PART_INDEX_HOLD'},400);
  let bytes;
  if(asset.storageKind==='chunked-v1'){
    const key=assetPartKey(asset.id,i);
    let obj;
    try{obj=await bucket.get(key);}catch{throw new VaultBodyIntegrityError('COLD_PART_UNREADABLE');}
    if(!obj)throw new VaultBodyIntegrityError('COLD_PART_MISSING');
    try{bytes=new Uint8Array(await obj.arrayBuffer());}catch{throw new VaultBodyIntegrityError('COLD_PART_UNREADABLE');}
    const expectedLen=i===count-1?asset.bytes-ASSET_PART_BYTES*(count-1):ASSET_PART_BYTES;
    const check=await assetHash(bytes);
    if(bytes.length!==expectedLen||check!==asset.partHashes[i]
      ||obj.customMetadata?.uploadId!==asset.id
      ||obj.customMetadata?.sourceInstanceId!==asset.sourceInstanceId
      ||obj.customMetadata?.fullSha256!==asset.sha256
      ||obj.customMetadata?.index!==String(i)
      ||obj.customMetadata?.partCount!==String(count)
      ||obj.customMetadata?.sha256!==check)
      throw new VaultBodyIntegrityError('COLD_PART_ORIGINAL_INTEGRITY_HOLD');
  }else{
    const whole=await assetBytes(bucket,asset);
    bytes=whole.subarray(i*ASSET_PART_BYTES,(i+1)*ASSET_PART_BYTES);
  }
  const hash=await assetHash(bytes);
  const fresh=await assetIndex(bucket);
  if(JSON.stringify(fresh)!==JSON.stringify(index)
    ||readVersions.get(fresh)!==readVersions.get(index))throw new VaultWriteConflict();
  return new Response(bytes,{headers:{
    'content-type':'application/octet-stream','cache-control':'no-store, max-age=0',
    'x-content-type-options':'nosniff',
    'x-jm-part-sha256':hash,'x-jm-asset-id':asset.id,'x-jm-part-index':String(i),
    'content-disposition':'attachment; filename="'+coldPartFilename(id,i)+'"'
  }});
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
    if (mode === 'export-asset-extended-plan') return extendedPlan(bucket,url.searchParams.get('asset'));
    if (mode === 'export-asset-extended-shard') return extendedShard(bucket,
      url.searchParams.get('asset'),url.searchParams.get('version'),
      url.searchParams.get('part'),url.searchParams.get('pin'));
    if (mode === 'export-asset-lineage') return exportAssetLineage(bucket, url.searchParams.get('asset'));
    if (mode === 'export-asset-catalog') return catalogAssetParts(bucket,url.searchParams.get('asset'));
    if (mode === 'export-asset-part') return exportColdAssetPart(bucket,url.searchParams.get('asset'),url.searchParams.get('part'));
    if (mode === 'assets') {
      const index = await assetIndex(bucket);
      return json({ schema: `${SCHEMA}.AssetIndex`, assets: index.assets,
        max_asset_bytes: MAX_ASSET_BYTES, max_chunked_asset_bytes: MAX_CHUNKED_ASSET_BYTES, asset_part_bytes: ASSET_PART_BYTES, boundary: 'PRIVATE_EXPLICIT_ORIGINAL_FILE_CUSTODY' });
    }
    const assetId = url.searchParams.get('asset');
    if (assetId) return downloadAsset(bucket, assetId);
    const bodyId = url.searchParams.get('body');
    if (mode === 'export-lineage') return exportBodyLineage(bucket, bodyId);
    if (bodyId) return downloadBody(bucket, bodyId);
    return json(await manifest(bucket));
  }

  if (request.method === 'PUT') {
    let payload;
    try { payload = await request.json(); }
    catch { return json({ schema: SCHEMA, error: 'INVALID_JSON' }, 400); }
    const record = await saveState(bucket, payload);
    return json({ schema: SCHEMA, outcome: 'STATE_SAVED', updated_at: record.updated_at,
      state_revision: await sha256Text(JSON.stringify(record)), state: record.state });
  }

  if (request.method === 'POST') {
    let payload;
    try { payload = await request.json(); }
    catch { return json({ schema: SCHEMA, error: 'INVALID_JSON' }, 400); }

    if (payload?.action === 'inspect-asset-parts') {
      const result=await inspectAssetParts(bucket,payload);
      if (result.error) return result.error;
      return json({schema:SCHEMA,outcome:'ASSET_PART_INSPECTION',...result});
    }
    if (payload?.action === 'upload-asset-part') {
      const result=await uploadAssetPart(bucket,payload);
      if (result.error) return result.error;
      return json({schema:SCHEMA,outcome:result.unchanged?'ASSET_PART_UNCHANGED':'ASSET_PART_STORED',...result},result.unchanged?200:201);
    }
    if (payload?.action === 'finalize-chunked-asset') {
      const result=await finishChunkedAsset(bucket,payload);
      if (result.error) return result.error;
      return json({schema:SCHEMA,outcome:result.unchanged?'ASSET_UNCHANGED':'ASSET_STORED',...result},result.unchanged?200:201);
    }
    if (payload?.action === 'upload-asset') {
      const outcome = await uploadAsset(bucket, payload);
      if (outcome.error) return outcome.error;
      return json({ schema: SCHEMA, outcome: outcome.unchanged ? 'ASSET_UNCHANGED' : 'ASSET_STORED', ...outcome }, outcome.unchanged ? 200 : 201);
    }
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
    const assetId = url.searchParams.get('asset');
    if (assetId) return removeAsset(bucket, assetId);
    const bodyId = url.searchParams.get('body');
    if (!bodyId) return json({ schema: SCHEMA, error: 'BODY_ID_REQUIRED' }, 400);
    const result = await deleteBody(bucket, bodyId);
    if (result.error) return result.error;
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
    if (error instanceof VaultStateStaleError) {
      return json({ schema: SCHEMA, error: 'OWNER_STATE_HEAD_CHANGED',
        recovery: 'RELOAD_PRIVATE_OWNER_STATE_BEFORE_SYNC_NO_AUTOMATIC_OVERWRITE' }, 409);
    }
    if (error instanceof VaultWriteConflict) {
      return json({
        schema: SCHEMA,
        error: 'PRIVATE_CONCURRENT_WRITE_CONFLICT',
        recovery: 'RELOAD_CURRENT_PRIVATE_STATE_AND_RETRY_WITH_CURRENT_HEAD'
      }, 409);
    }
    if (error instanceof VaultCustodyHold) {
      return json({
        schema: SCHEMA,
        error: 'PRIVATE_CUSTODY_HOLD',
        recovery: 'OWNER_VERIFIED_PRIVATE_RECOVERY_REQUIRED'
      }, 503);
    }
    if (error instanceof VaultBodyIntegrityError) {
      return json({
        schema: SCHEMA,
        error: error.code,
        recovery: 'HOLD_SOURCE_BYTES_FOR_OWNER_INSPECTION_NO_AUTOMATIC_DELETION'
      }, ['BODY_BYTES_MISSING', 'ASSET_BYTES_MISSING'].includes(error.code) ? 404 : 409);
    }
    throw error;
  }
}
