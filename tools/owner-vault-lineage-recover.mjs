#!/usr/bin/env node
/**
 * JM Owner Vault CP20: independently verify/recover an owner-saved CP19 packet.
 *
 * Offline only: no network, owner key, R2 binding, Vault import or native-ID
 * replacement. A new destination is required; never overwrite an existing
 * directory, source or differently intended body.
 *
 * Usage:
 *   node owner-vault-lineage-recover.mjs --input packet.json --verify-only
 *   node owner-vault-lineage-recover.mjs --input packet.json --output-dir ./restored-lineage
 *   node owner-vault-lineage-recover.mjs --input packet.json --audit-dir ./restored-lineage
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA = 'JM.OwnerVault/0.1.LineageExport';
const ASSET_SCHEMA = 'JM.OwnerVault/0.1.AssetLineageExport';
const ASSET_VERSIONS = 8, ASSET_MAX_TOTAL = 24 * 1024 * 1024, ASSET_MAX_SINGLE = 64 * 1024 * 1024;
const ASSET_EXTENDED_SCHEMA = 'JM.OwnerVault/0.1.AssetExtendedExport';
const ASSET_EXTENDED_TOTAL = 64 * 1024 * 1024, ASSET_EXTENDED_SHARD = 8 * 1024 * 1024;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/i;
const MAX_VERSIONS = 16;
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_PACKET_BYTES = 94 * 1024 * 1024;
const MAX_SINGLE_SOURCE = 25 * 1024 * 1024;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(code); };


// CP22–CP24: one original CP20 recovery tool for HTML and genuine binary sources.
// CP24 carries a safe original extension for native app re-entry without extra
// working copies. The immutable source version UUID remains in every filename.

// CP24: preserve the native extension for direct editing after cold restore.
// Stable UUID prefix retains sovereign revision identity and prevents collisions.
// The packet's untrusted filename is data: never an output path.
function nativeRecoveryName(metadata) {
  const original = typeof metadata.fileName === 'string' ? metadata.fileName : '';
  const safe = original.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-')
    .replace(/\s+/g,' ').trim().replace(/^\.+$/, 'source')
    .replace(/[. ]+$/g,'') || 'original-file.bin';
  // Long original names must not lose their native type suffix; do not
  // sacrifice a .wav/.psd/.docx/.blend extension to a naive prefix cut.
  const dot = safe.lastIndexOf('.');
  const extension = dot > 0 && safe.length - dot <= 16 ? safe.slice(dot) : '';
  const stem = (extension ? safe.slice(0, -extension.length) : safe)
    .slice(0, 120 - extension.length).replace(/[. ]+$/g,'');
  return metadata.id + '__' + (stem || 'original-file') + extension;
}
function recoveryFilename(verified, metadata) {
  return verified.asset ? nativeRecoveryName(metadata) : metadata.id + '.html';
}

// CP26: repeated capture-group regex over megabytes of original base64 can
// exhaust V8's call stack before hash verification. Scan bounded noncapturing
// chunks, then require byte-exact canonical base64 after decoding.
function validBoundedBase64(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return false;
  const padding=value.endsWith('==')?2:value.endsWith('=')?1:0;
  const end=value.length-padding;
  for(let i=0;i<end;i+=32768) {
    if (!/^[A-Za-z0-9+/]*$/.test(value.slice(i,Math.min(end,i+32768)))) return false;
  }
  return true;
}

function validateAssetPacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)
    || packet.schema !== ASSET_SCHEMA || !ID.test(packet.selected_id || '')
    || !Array.isArray(packet.versions) || packet.versions.length < 1
    || packet.versions.length > ASSET_VERSIONS
    || packet.version_count !== packet.versions.length
    || packet.order !== 'SELECTED_HEAD_TO_OLDEST_ANCESTOR') {
    fail('ASSET_PACKET_SCHEMA_OR_SIZE_INVALID');
  }
  const ready = [], seen = new Set();
  let expected = packet.selected_id, total = 0, originalIdentity = null;
  for (const item of packet.versions) {
    const m = item?.metadata, value = item?.base64;
    if (!m || typeof m !== 'object' || Array.isArray(m)
      || !ID.test(m.id || '') || m.id !== expected || seen.has(m.id)
      || !SHA.test(m.sha256 || '')
      || !Number.isSafeInteger(m.bytes) || m.bytes < 0 || m.bytes > ASSET_MAX_SINGLE
      || !ID.test((m.sourceInstanceId || '').replace(/^asset-/,''))
      || typeof m.fileName !== 'string' || m.fileName.length < 1 || m.fileName.length > 180
      || typeof m.name !== 'string' || m.name.length > 500
      || typeof m.mediaType !== 'string' || m.mediaType.length > 100
      || (m.previousVersionId !== null && !ID.test(m.previousVersionId || ''))
      || typeof value !== 'string' || value.length > Math.ceil(ASSET_MAX_SINGLE / 3) * 4 + 4
      || !validBoundedBase64(value)) {
      fail('ASSET_LINEAGE_IDENTITY_OR_ENCODING_INVALID');
    }
    if (originalIdentity !== null && m.sourceInstanceId !== originalIdentity) {
      fail('ASSET_LINEAGE_CROSS_PURPOSE_REFUSED');
    }
    if (originalIdentity === null) originalIdentity = m.sourceInstanceId;
    const bytes = Buffer.from(value, 'base64');
    if (bytes.toString('base64') !== value || bytes.length !== m.bytes
      || digest(bytes) !== m.sha256.toLowerCase()) {
      fail('ASSET_LINEAGE_EXACT_BINARY_INTEGRITY_FAILED');
    }
    total += bytes.length;
    if (total > ASSET_MAX_TOTAL) fail('ASSET_LINEAGE_TOTAL_LIMIT_EXCEEDED');
    seen.add(m.id); ready.push({metadata:m, bytes});
    expected = m.previousVersionId || null;
  }
  if (expected !== null || total !== packet.source_bytes) {
    fail('ASSET_LINEAGE_INCOMPLETE_OR_TOTAL_WRONG');
  }
  return { ready, total, asset: true };
}

// CP28: extended packet arrives as bounded 8 MiB independently verified
// source shards. The whole original and every preserved ancestor are verified
// BEFORE a new destination can be created. The packet remains owner-local.
function validateExtendedPacket(packet) {
  if(!packet || typeof packet!=='object' || Array.isArray(packet)
    || packet.schema!==ASSET_EXTENDED_SCHEMA || !ID.test(packet.selected_id||'')
    || !SHA.test(packet.index_pin_sha256||'')
    || !Array.isArray(packet.versions) || packet.versions.length<1
    || packet.versions.length>ASSET_VERSIONS
    || packet.version_count!==packet.versions.length
    || packet.shard_bytes!==ASSET_EXTENDED_SHARD
    || packet.order!=='SELECTED_HEAD_TO_OLDEST_ANCESTOR')
    fail('ASSET_EXTENDED_SCHEMA_INVALID');
  const ready=[],seen=new Set();
  let expected=packet.selected_id,total=0,source=null;
  for(const item of packet.versions){
    const m=item?.metadata, shards=item?.shards;
    if(!m || typeof m!=='object' || Array.isArray(m)
      || !ID.test(m.id||'') || m.id!==expected || seen.has(m.id)
      || !SHA.test(m.sha256||'')
      || !Number.isSafeInteger(m.bytes) || m.bytes<0 || m.bytes>ASSET_MAX_SINGLE
      || !ID.test((m.sourceInstanceId||'').replace(/^asset-/,''))
      || typeof m.fileName!=='string' || !m.fileName || m.fileName.length>180
      || typeof m.name!=='string' || m.name.length>500
      || typeof m.mediaType!=='string' || m.mediaType.length>100
      || (m.previousVersionId!==null && !ID.test(m.previousVersionId||''))
      || !Array.isArray(shards) || shards.length!==Math.ceil(m.bytes/ASSET_EXTENDED_SHARD))
      fail('ASSET_EXTENDED_IDENTITY_OR_SHARD_COUNT_INVALID');
    if(source!==null && source!==m.sourceInstanceId)
      fail('ASSET_EXTENDED_CROSS_PURPOSE_REFUSED');
    source=m.sourceInstanceId;
    const buffers=[];
    for(let i=0;i<shards.length;i++){
      const part=shards[i], len=Math.min(ASSET_EXTENDED_SHARD,m.bytes-i*ASSET_EXTENDED_SHARD);
      if(!part || part.shard_index!==i || part.offset!==i*ASSET_EXTENDED_SHARD
        || part.bytes!==len || !SHA.test(part.sha256||'')
        || typeof part.base64!=='string'
        || part.base64.length>Math.ceil(ASSET_EXTENDED_SHARD/3)*4+4
        || !validBoundedBase64(part.base64))fail('ASSET_EXTENDED_SHARD_IDENTITY_INVALID');
      const decoded=Buffer.from(part.base64,'base64');
      if(decoded.length!==len || decoded.toString('base64')!==part.base64
        || digest(decoded)!==part.sha256.toLowerCase())
        fail('ASSET_EXTENDED_SHARD_INTEGRITY_FAILED');
      buffers.push(decoded);
    }
    const bytes=Buffer.concat(buffers,m.bytes);
    if(digest(bytes)!==m.sha256.toLowerCase())
      fail('ASSET_EXTENDED_WHOLE_ORIGINAL_INTEGRITY_FAILED');
    total+=bytes.length;
    if(total>ASSET_EXTENDED_TOTAL)fail('ASSET_EXTENDED_TOTAL_LIMIT');
    ready.push({metadata:m,bytes});seen.add(m.id);
    expected=m.previousVersionId||null;
  }
  if(expected!==null || total!==packet.source_bytes)
    fail('ASSET_EXTENDED_INCOMPLETE_ANCESTRY');
  return {ready,total,asset:true};
}

function validatePacket(packet) {
  if (packet?.schema === ASSET_EXTENDED_SCHEMA) return validateExtendedPacket(packet);
  if (packet?.schema === ASSET_SCHEMA) return validateAssetPacket(packet);
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)
      || packet.schema !== SCHEMA || !ID.test(packet.selected_id || '')
      || !Array.isArray(packet.versions) || packet.versions.length < 1
      || packet.versions.length > MAX_VERSIONS
      || packet.version_count !== packet.versions.length
      || packet.order !== 'SELECTED_HEAD_TO_OLDEST_ANCESTOR') {
    fail('LINEAGE_PACKET_SCHEMA_OR_SIZE_INVALID');
  }
  let expected = packet.selected_id;
  let total = 0;
  const seen = new Set();
  const ready = [];
  for (const entry of packet.versions) {
    const m = entry?.metadata;
    if (!m || typeof m !== 'object' || Array.isArray(m)
        || typeof entry.content !== 'string'
        || !ID.test(m.id || '') || m.id !== expected || seen.has(m.id)
        || !SHA.test(m.sha256 || '') || !Number.isSafeInteger(m.bytes)
        || m.bytes < 0 || m.bytes > MAX_SINGLE_SOURCE
        || (m.previousVersionId != null && !ID.test(m.previousVersionId))
        || (m.sourceInstanceId != null && typeof m.sourceInstanceId !== 'string')) {
      fail('LINEAGE_IDENTITY_OR_METADATA_INVALID');
    }
    const bytes = Buffer.from(entry.content, 'utf8');
    if (bytes.length !== m.bytes || digest(bytes) !== m.sha256.toLowerCase()) {
      fail('LINEAGE_EXACT_SOURCE_INTEGRITY_FAILED');
    }
    total += bytes.length;
    if (total > MAX_SOURCE_BYTES) fail('LINEAGE_SOURCE_LIMIT_EXCEEDED');
    if (ready.length) {
      const child = ready[ready.length - 1].metadata;
      const normal = child.sourceInstanceId != null
        && m.sourceInstanceId != null && child.sourceInstanceId === m.sourceInstanceId;
      const legacy = m.sourceInstanceId == null
        && child.sourceInstanceId === `vault-${m.id}`;
      if (!normal && !legacy) fail('LINEAGE_CROSS_PURPOSE_ANCESTOR_REFUSED');
    }
    seen.add(m.id);
    ready.push({ metadata: m, bytes });
    expected = m.previousVersionId || null;
  }
  if (expected !== null || total !== packet.source_bytes) {
    fail('LINEAGE_CHAIN_OR_TOTAL_INCOMPLETE');
  }
  return { ready, total };
}

// CP31: actual authorised Windows device exposed unavailable POSIX flags.
// Retain Linux atomic final-component O_NOFOLLOW unchanged. Windows checks
// pre/post lstat against its opened handle; these checks are NOT atomically
// equivalent to FILE_FLAG_OPEN_REPARSE_POINT or directory fsync.
async function assertWindowsOpenedRegularFile(filename,handle) {
  // Windows NTFS file IDs can exceed Number.MAX_SAFE_INTEGER. Use lossless
  // BigInt identities on BOTH sides, rather than accepting rounded/zero IDs.
  const current=await fs.lstat(filename,{bigint:true});
  const opened=await handle.stat({bigint:true});
  if(!current.isFile()||current.isSymbolicLink()||!opened.isFile()
    ||current.dev!==opened.dev||current.ino!==opened.ino
    ||typeof current.ino!=='bigint'||current.ino<=0n
    ||typeof opened.ino!=='bigint'||opened.ino<=0n)
    fail('WINDOWS_OPENED_SOURCE_REPARSE_OR_IDENTITY_HOLD');
  return opened;
}
async function openBoundedSourceFile(filename,openFile=fs.open) {
  if(process.platform==='win32') {
    await assertNoSymlinkDirectoryComponents(path.dirname(path.resolve(filename)));
    const first=await fs.lstat(filename,{bigint:true});
    if(!first.isFile()||first.isSymbolicLink()
      ||typeof first.ino!=='bigint'||first.ino<=0n)
      fail('WINDOWS_SOURCE_PATH_REPARSE_HOLD');
    const h=await openFile(filename,fsConstants.O_RDONLY);
    try{
      const stat=await assertWindowsOpenedRegularFile(filename,h);
      if(first.dev!==stat.dev||first.ino!==stat.ino)
        fail('WINDOWS_SOURCE_CHANGED_BETWEEN_CHECK_AND_OPEN');
      return h;
    }catch(error){await h.close();throw error;}
  }
  if(typeof fsConstants.O_NOFOLLOW!=='number'
    ||typeof fsConstants.O_NONBLOCK!=='number')
    fail('LINEAGE_SAFE_OPEN_UNSUPPORTED');
  return openFile(filename,fsConstants.O_RDONLY
    |fsConstants.O_NOFOLLOW|fsConstants.O_NONBLOCK);
}

// CP26: lstat + readFile is a path-reopening race. Open the actual regular
// file with no-follow and nonblocking flags, then validate the OPEN handle.
// This protects the final component even if it is swapped after preflight;
// it is not an atomic defence against replacement of ancestor directories.
async function readBoundedRegularFile(filename, maxBytes, openFile = fs.open) {
  if(!Number.isSafeInteger(maxBytes)||maxBytes<0)
    fail('LINEAGE_SAFE_OPEN_UNSUPPORTED');
  const handle=await openBoundedSourceFile(filename,openFile);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes || stat.size < 0) {
      fail('LINEAGE_OPENED_FILE_UNSAFE_OR_OVERBOUNDED');
    }
    // CP28: readFile() allocates until EOF, so a file that grows after the
    // opened-handle stat can exhaust memory before a post-read size check.
    // Read at most maxBytes + 1, including under concurrent append.
    const chunks = [];
    let total = 0;
    while (true) {
      const length = Math.min(64 * 1024, maxBytes - total + 1);
      const chunk = Buffer.allocUnsafe(length);
      const { bytesRead } = await handle.read(chunk, 0, length, null);
      if (!Number.isSafeInteger(bytesRead) || bytesRead < 0 || bytesRead > length) {
        fail('LINEAGE_OPENED_FILE_READ_INVALID');
      }
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maxBytes) fail('LINEAGE_OPENED_FILE_OVERBOUNDED');
      chunks.push(chunk.subarray(0, bytesRead));
    }
    if(process.platform==='win32')
      await assertWindowsOpenedRegularFile(filename,handle);
    return Buffer.concat(chunks, total);
  } finally {
    await handle.close();
  }
}

// CP27: a final-file O_NOFOLLOW open still follows symlinked ancestor
// directories. Refuse existing redirected input ancestors before reading any
// packet bytes, including --verify-only. This is preflight, not race-proof.
async function readPacket(input) {
  await assertNoSymlinkDirectoryComponents(path.dirname(path.resolve(input)));
  const file = await fs.lstat(input);
  if (!file.isFile() || file.isSymbolicLink() || file.size > MAX_PACKET_BYTES) {
    fail('LINEAGE_INPUT_NOT_REGULAR_OR_OVERBOUNDED');
  }
  const raw = await readBoundedRegularFile(input, MAX_PACKET_BYTES);
  if (raw.length > MAX_PACKET_BYTES) fail('LINEAGE_PACKET_SIZE_LIMIT');
  let packet;
  try { packet = JSON.parse(raw.toString('utf8')); }
  catch { fail('LINEAGE_PACKET_NOT_JSON'); }
  return { packet, packet_sha256: digest(raw), ...validatePacket(packet) };
}

// CP22: an interrupted recovery may already contain useful owner bytes.
// Only an empty directory with the same identity we created may be removed.
// Never recursively delete a partially recovered or replaced destination.
async function cleanupEmptyFailedRecovery(dest, createdIdentity) {
  let current;
  try { current = await fs.lstat(dest); }
  catch (error) {
    if (error.code === 'ENOENT') return 'DESTINATION_ALREADY_ABSENT';
    throw error;
  }
  if (!current.isDirectory() || current.isSymbolicLink()
    || current.dev !== createdIdentity.dev || current.ino !== createdIdentity.ino) {
    return 'DESTINATION_IDENTITY_CHANGED_PRESERVED';
  }
  try {
    await fs.rmdir(dest); // Nonrecursive: fails closed if ANY file exists.
    return 'EMPTY_FAILED_RECOVERY_REMOVED';
  } catch (error) {
    if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
      return 'PARTIAL_RECOVERY_PRESERVED_FOR_OWNER';
    }
    throw error;
  }
}

// CP23: reject symlinks at EVERY existing directory component, not just the
// final parent/destination. This is a preflight check, not a claim of
// race-proof custody against a hostile concurrent filesystem actor.
async function assertNoSymlinkDirectoryComponents(directory) {
  const absolute = path.resolve(directory);
  const root = path.parse(absolute).root;
  let current = root;
  for (const component of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail('LINEAGE_PATH_COMPONENT_UNSAFE');
    }
  }
}

// CP24: one deterministic recovery receipt contract for creation and cold audit.
// A changed boundary or an injected success field is not an authentic receipt.
function recoveryManifest(verified) {
  return {
    schema: 'JM.OwnerVault/0.1.OfflineRecovered',
    selected_id: verified.packet.selected_id,
    packet_sha256: verified.packet_sha256,
    original_schema: verified.packet.schema,
    original_source_bytes: verified.total,
    original_versions: verified.ready.map(({ metadata }) => metadata),
    boundary: 'OWNER_LOCAL_VERIFIED_FILES_ONLY; NO R2 RESTORE, OFFSITE CUSTODY, LIVE DEPLOYMENT OR NATIVE-ID REPLACEMENT'
  };
}

// CP25: a successful readback alone is not crash-durable. Flush every
// newly created exact-source file and the receipt before acknowledging it.
// Keep the opener injectable only for deterministic failure-path tests.
async function writeDurableNewFile(filename, bytes, openFile = fs.open) {
  const handle = await openFile(filename, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

// CP29: sync the actual opened directory, not a symlink substituted after
// preflight. Bind it to the previously observed destination/parent identity.
// This is final-component protection, not an atomic ancestor-directory lock.
async function syncRecoveryDirectory(directory, openFile = fs.open, expectedIdentity = null) {
  if(process.platform==='win32') {
    await assertNoSymlinkDirectoryComponents(directory);
    const stat=await fs.lstat(directory);
    if(!stat.isDirectory()||stat.isSymbolicLink()
      ||(expectedIdentity&&(stat.dev!==expectedIdentity.dev
        ||stat.ino!==expectedIdentity.ino)))
      fail('WINDOWS_DIRECTORY_IDENTITY_HOLD');
    // Actual Windows Node refuses directory fsync with EPERM.
    // Exact file fsync/readback and independent later audit remain active.
    return {directory_fsync_proven:false};
  }
  if (typeof fsConstants.O_NOFOLLOW !== 'number'
      || typeof fsConstants.O_DIRECTORY !== 'number') {
    fail('LINEAGE_DIRECTORY_SYNC_UNSUPPORTED');
  }
  const flags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_DIRECTORY;
  const handle = await openFile(directory, flags);
  try {
    const stat = await handle.stat();
    if (!stat.isDirectory()
        || (expectedIdentity && (stat.dev !== expectedIdentity.dev
          || stat.ino !== expectedIdentity.ino))) {
      fail('LINEAGE_DIRECTORY_SYNC_UNSAFE');
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function restorePacket(input, destination) {
  const verified = await readPacket(input);
  const dest = path.resolve(destination);
  const parent = path.dirname(dest);
  if (dest === parent || dest === path.parse(dest).root) {
    fail('LINEAGE_DESTINATION_UNSAFE');
  }
  // No recursive mkdir: the owner must explicitly choose an existing parent.
  const parentStat = await fs.lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    fail('LINEAGE_PARENT_UNSAFE');
  }
  // CP23: lstat(parent) alone misses a symlink in an earlier path component.
  // Refuse redirected ancestors before any new owner source is written.
  await assertNoSymlinkDirectoryComponents(parent);
  // mkdir without recursive is an atomic existing-directory refusal.
  await fs.mkdir(dest, { mode: 0o700 });
  const createdIdentity = await fs.lstat(dest);
  try {
    const inventory = recoveryManifest(verified);
    for (const { metadata, bytes } of verified.ready) {
      const name = recoveryFilename(verified, metadata); // identity-bound safe filename
      const filename = path.join(dest, name);
      await writeDurableNewFile(filename, bytes);
      const check = await readBoundedRegularFile(filename, verified.asset ? ASSET_MAX_SINGLE : MAX_SINGLE_SOURCE);
      if (!check.equals(bytes) || digest(check) !== metadata.sha256.toLowerCase()) {
        fail('LINEAGE_DISK_READBACK_FAILED');
      }
    }
    const manifestPath = path.join(dest, 'recovery-manifest.json');
    const expectedManifest = Buffer.from(JSON.stringify(inventory, null, 2) + '\n', 'utf8');
    await writeDurableNewFile(manifestPath, expectedManifest);
    // Exact bytes, not merely two parsed fields, must survive before success.
    const storedManifest = await readBoundedRegularFile(manifestPath, MAX_PACKET_BYTES);
    if (!storedManifest.equals(expectedManifest)) {
      fail('LINEAGE_MANIFEST_READBACK_FAILED');
    }
    // Persist directory entries (source filenames, receipt, new destination).
    // Any unsupported/failed fsync is HOLD, never an acknowledged recovery.
    await syncRecoveryDirectory(dest, fs.open, createdIdentity);
    const currentParent = await fs.lstat(parent);
    const currentDest = await fs.lstat(dest);
    if (currentParent.dev !== parentStat.dev || currentParent.ino !== parentStat.ino
        || currentParent.isSymbolicLink()
        || currentDest.dev !== createdIdentity.dev || currentDest.ino !== createdIdentity.ino
        || currentDest.isSymbolicLink()) {
      fail('LINEAGE_DIRECTORY_IDENTITY_CHANGED');
    }
    await syncRecoveryDirectory(parent, fs.open, parentStat);
  } catch (error) {
    // A partial write may contain recovered source or an unrelated file added
    // after mkdir. Never recursively remove owner data on an error.
    await cleanupEmptyFailedRecovery(dest, createdIdentity);
    throw error;
  }
  return { outcome: 'OFFLINE_SOURCE_RECOVERED', kind: verified.asset ? 'ORIGINAL_BINARY_ASSET' : 'ORIGINAL_HTML', selected_id: verified.packet.selected_id,
    version_count: verified.ready.length, source_bytes: verified.total,
    packet_sha256: verified.packet_sha256, destination: dest,
    remote_vault_modified: false, owner_offsite_custody_claimed: false };
}

// CP21: a second, independently started process can verify the actual
// persisted recovery files, not just the original export packet. This is
// strictly read-only; changed sources are reported, never overwritten.
async function auditRestoredPacket(input, destination) {
  const verified = await readPacket(input);
  const dest = path.resolve(destination);
  const dirStat = await fs.lstat(dest);
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) {
    fail('LINEAGE_AUDIT_DIRECTORY_UNSAFE');
  }
  await assertNoSymlinkDirectoryComponents(dest);
  const expectedNames = new Set(['recovery-manifest.json',
    ...verified.ready.map(({ metadata }) => recoveryFilename(verified, metadata))]);
  const entries = await fs.readdir(dest, { withFileTypes: true });
  if (entries.length !== expectedNames.size || entries.some(e =>
    !expectedNames.has(e.name) || !e.isFile() || e.isSymbolicLink())) {
    fail('LINEAGE_AUDIT_INVENTORY_MISMATCH');
  }
  let storedManifest;
  try {
    storedManifest = (await readBoundedRegularFile(path.join(dest, 'recovery-manifest.json'), MAX_PACKET_BYTES)).toString('utf8');
  } catch { fail('LINEAGE_AUDIT_MANIFEST_UNREADABLE'); }
  // Reject forged offsite/deployment claims, extra fields and changed receipt
  // bytes, even when the original packet hash and ancestor list still match.
  if (storedManifest !== JSON.stringify(recoveryManifest(verified), null, 2) + '\n') {
    fail('LINEAGE_AUDIT_MANIFEST_MISMATCH');
  }
  for (const { metadata, bytes } of verified.ready) {
    const restored = await readBoundedRegularFile(path.join(dest, recoveryFilename(verified, metadata)), verified.asset ? ASSET_MAX_SINGLE : MAX_SINGLE_SOURCE);
    if (!restored.equals(bytes) || digest(restored) !== metadata.sha256.toLowerCase()) {
      fail('LINEAGE_AUDIT_SOURCE_MISMATCH');
    }
  }
  return { outcome: 'OFFLINE_RESTORED_FILES_AUDITED', kind: verified.asset ? 'ORIGINAL_BINARY_ASSET' : 'ORIGINAL_HTML',
    selected_id: verified.packet.selected_id, version_count: verified.ready.length,
    source_bytes: verified.total, packet_sha256: verified.packet_sha256,
    destination: dest, remote_vault_modified: false,
    owner_offsite_custody_claimed: false };
}


// CP25: multiple independently authored original bodies, ONE bounded offline
// operation. This is a capability of the existing recovery CLI, not a new
// cloud vault, new storage layer, or identity merge.
const BATCH_MAX_PACKETS = 8;
const BATCH_MAX_SOURCE_BYTES = 64 * 1024 * 1024;
async function readBatchPackets(inputs) {
  if (!Array.isArray(inputs) || inputs.length < 2 || inputs.length > BATCH_MAX_PACKETS)
    fail('BATCH_PACKET_COUNT_HOLD');
  const packets = [], ids = new Set(), filenames = new Set(), sources = new Set();
  let total = 0, versionCount = 0;
  for (const input of inputs) {
    const verified = await readPacket(input); // inherited bounded, no-follow reader
    if (total + verified.total > BATCH_MAX_SOURCE_BYTES) fail('BATCH_TOTAL_BYTES_HOLD');
    total += verified.total;
    versionCount += verified.ready.length;
    const identity = verified.ready[0]?.metadata?.sourceInstanceId;
    if (identity != null) {
      if (sources.has(identity)) fail('BATCH_OVERLAPPING_SOURCE_USE_HOLD');
      sources.add(identity);
    }
    for (const {metadata} of verified.ready) {
      if (ids.has(metadata.id)) fail('BATCH_DUPLICATE_VERSION_ID_HOLD');
      ids.add(metadata.id);
      const fileName = recoveryFilename(verified, metadata);
      if (filenames.has(fileName)) fail('BATCH_SOURCE_FILENAME_COLLISION_HOLD');
      filenames.add(fileName);
    }
    packets.push(verified);
  }
  return {packets, total, versionCount, filenames};
}
function batchRecoveryManifest(batch) {
  return {
    schema:'JM.OwnerVault/0.1.OfflineBatchRecovered',
    packet_count:batch.packets.length, total_source_bytes:batch.total,
    total_versions:batch.versionCount,
    original_lineages:batch.packets.map(recoveryManifest),
    boundary:'MULTI_ORIGINAL_LOCAL_SOURCE_ONLY; NO_CLOUD_WRITE_OFFSITE_CUSTODY_OR_PUBLIC_DEPLOYMENT'
  };
}
async function restoreBatchPackets(inputs, destination) {
  const batch = await readBatchPackets(inputs); // validate EVERY source before mkdir
  const dest = path.resolve(destination), parent = path.dirname(dest);
  if (dest === parent || dest === path.parse(dest).root) fail('BATCH_DESTINATION_UNSAFE');
  const parentStat = await fs.lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) fail('BATCH_PARENT_UNSAFE');
  await assertNoSymlinkDirectoryComponents(parent);
  await fs.mkdir(dest, {mode:0o700}); // no overwrite or recursive accidental ancestry
  const createdIdentity = await fs.lstat(dest);
  try {
    for (const verified of batch.packets) {
      for (const {metadata,bytes} of verified.ready) {
        const filename = path.join(dest, recoveryFilename(verified, metadata));
        await writeDurableNewFile(filename, bytes);
        const readback = await readBoundedRegularFile(filename,
          verified.asset ? ASSET_MAX_SINGLE : MAX_SINGLE_SOURCE);
        if (!readback.equals(bytes) || digest(readback) !== metadata.sha256.toLowerCase())
          fail('BATCH_DISK_READBACK_HOLD');
      }
    }
    const receipt = Buffer.from(JSON.stringify(batchRecoveryManifest(batch),null,2)+'\n');
    const receiptPath = path.join(dest,'recovery-manifest.json');
    await writeDurableNewFile(receiptPath,receipt);
    const held = await readBoundedRegularFile(receiptPath,MAX_PACKET_BYTES);
    if (!held.equals(receipt)) fail('BATCH_RECEIPT_READBACK_HOLD');
    await syncRecoveryDirectory(dest,fs.open,createdIdentity);
    const actualParent=await fs.lstat(parent), actualDest=await fs.lstat(dest);
    if (actualParent.dev!==parentStat.dev || actualParent.ino!==parentStat.ino
      || actualParent.isSymbolicLink()
      || actualDest.dev!==createdIdentity.dev || actualDest.ino!==createdIdentity.ino
      || actualDest.isSymbolicLink()) fail('BATCH_DIRECTORY_IDENTITY_CHANGED');
    await syncRecoveryDirectory(parent,fs.open,parentStat);
  } catch(error) {
    await cleanupEmptyFailedRecovery(dest,createdIdentity);
    throw error; // owner bytes remain on partial failure, never recursively deleted
  }
  return {outcome:'OFFLINE_MULTI_SOURCE_RECOVERED',
    packet_count:batch.packets.length,version_count:batch.versionCount,
    source_bytes:batch.total,destination:dest,
    remote_vault_modified:false,owner_offsite_custody_claimed:false};
}
async function auditBatchPackets(inputs,destination) {
  const batch=await readBatchPackets(inputs), dest=path.resolve(destination);
  const stat=await fs.lstat(dest);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('BATCH_AUDIT_DIRECTORY_UNSAFE');
  await assertNoSymlinkDirectoryComponents(dest);
  const expected=new Set(['recovery-manifest.json',...batch.filenames]);
  const entries=await fs.readdir(dest,{withFileTypes:true});
  if (entries.length!==expected.size || entries.some(e=>
      !expected.has(e.name) || !e.isFile() || e.isSymbolicLink()))
    fail('BATCH_AUDIT_INVENTORY_HOLD');
  const receipt=Buffer.from(JSON.stringify(batchRecoveryManifest(batch),null,2)+'\n');
  const actualReceipt=await readBoundedRegularFile(path.join(dest,'recovery-manifest.json'),MAX_PACKET_BYTES);
  if (!actualReceipt.equals(receipt)) fail('BATCH_AUDIT_RECEIPT_MISMATCH');
  for (const verified of batch.packets) {
    for (const {metadata,bytes} of verified.ready) {
      const restored=await readBoundedRegularFile(path.join(dest,recoveryFilename(verified,metadata)),
        verified.asset?ASSET_MAX_SINGLE:MAX_SINGLE_SOURCE);
      if (!restored.equals(bytes) || digest(restored)!==metadata.sha256.toLowerCase())
        fail('BATCH_AUDIT_SOURCE_MISMATCH');
    }
  }
  return {outcome:'OFFLINE_MULTI_SOURCE_AUDITED',
    packet_count:batch.packets.length,version_count:batch.versionCount,
    source_bytes:batch.total,destination:dest,
    remote_vault_modified:false,owner_offsite_custody_claimed:false};
}


// CP28: the same sovereign offline verifier accepts an owner-saved catalog
// alongside independently downloaded 2 MiB source pieces. No second CLI,
// network contact, repo root, remote credentials or embedded 512 MiB JSON.
// The catalog is proof of inventory only after every piece is read and hashed.
const PARTS_SCHEMA='JM.OwnerVault/0.1.AssetPartsCatalog';
const PART_BYTES=2*1024*1024, PART_CATALOG_MAX=512*1024;
const PART_CATALOG_VERSIONS=8, PART_CATALOG_SINGLE=64*1024*1024;
function sourcePartFile(id,i){return 'JM_Vault_Part_'+id+'_'+String(i).padStart(2,'0')+'.bin';}
async function readPartsCatalog(filename){
  const origin=path.resolve(filename);
  await assertNoSymlinkDirectoryComponents(path.dirname(origin));
  const raw=await readBoundedRegularFile(origin,PART_CATALOG_MAX);
  let packet;
  try{packet=JSON.parse(raw.toString('utf8'));}catch{fail('COLD_CATALOG_NOT_JSON');}
  if(!packet||packet.schema!==PARTS_SCHEMA||!ID.test(packet.selected_id||'')
    ||!Array.isArray(packet.versions)||!packet.versions.length
    ||packet.versions.length>PART_CATALOG_VERSIONS
    ||packet.version_count!==packet.versions.length
    ||packet.order!=='SELECTED_HEAD_TO_OLDEST_ANCESTOR'
    ||packet.part_bytes!==PART_BYTES)fail('COLD_CATALOG_SCHEMA_HOLD');
  let expected=packet.selected_id,identity=null,total=0;
  const seen=new Set(),filenames=new Set();
  for(const v of packet.versions){
    const m=v?.metadata,parts=v?.parts;
    if(!m||!ID.test(m.id||'')||m.id!==expected||seen.has(m.id)
      ||!ID.test((m.sourceInstanceId||'').replace(/^asset-/,''))
      ||!SHA.test(m.sha256||'')
      ||!Number.isSafeInteger(m.bytes)||m.bytes<0||m.bytes>PART_CATALOG_SINGLE
      ||typeof m.fileName!=='string'||!m.fileName||m.fileName.length>180
      ||(m.previousVersionId!==null&&!ID.test(m.previousVersionId||''))
      ||(identity!==null&&identity!==m.sourceInstanceId)
      ||!Array.isArray(parts)
      ||parts.length!==Math.max(1,Math.ceil(m.bytes/PART_BYTES))
      ||parts.length>32)fail('COLD_CATALOG_IDENTITY_OR_SIZE_HOLD');
    identity=m.sourceInstanceId;
    seen.add(m.id);
    for(let i=0;i<parts.length;i++){
      const p=parts[i],name=sourcePartFile(m.id,i);
      const size=i===parts.length-1?m.bytes-PART_BYTES*(parts.length-1):PART_BYTES;
      if(!p||p.index!==i||p.fileName!==name||p.bytes!==size
        ||!SHA.test(p.sha256||'')||filenames.has(name))
        fail('COLD_CATALOG_PART_CONTRACT_HOLD');
      filenames.add(name);
    }
    total+=m.bytes;
    if(total>PART_CATALOG_SINGLE*PART_CATALOG_VERSIONS)
      fail('COLD_CATALOG_TOTAL_HOLD');
    expected=m.previousVersionId;
  }
  if(expected!==null||total!==packet.source_bytes)
    fail('COLD_CATALOG_ANCESTRY_INCOMPLETE');
  return {packet,sha256:digest(raw),total,folder:path.dirname(origin),filenames};
}
async function inspectColdParts(catalog){
  // Validate all sources before creating any working output directory.
  await assertNoSymlinkDirectoryComponents(catalog.folder);
  for(const v of catalog.packet.versions){
    const digestWhole=createHash('sha256');
    let count=0;
    for(const p of v.parts){
      const bytes=await readBoundedRegularFile(path.join(catalog.folder,p.fileName),PART_BYTES);
      if(bytes.length!==p.bytes||digest(bytes)!==p.sha256)
        fail('COLD_PART_EXACT_HASH_HOLD');
      digestWhole.update(bytes);count+=bytes.length;
    }
    if(count!==v.metadata.bytes||digestWhole.digest('hex')!==v.metadata.sha256)
      fail('COLD_WHOLE_SOURCE_HASH_HOLD');
  }
  return catalog;
}
function coldRecoveryManifest(catalog){
  return {schema:'JM.OwnerVault/0.1.OfflineRecovered',
    selected_id:catalog.packet.selected_id,
    packet_sha256:catalog.sha256,
    original_schema:catalog.packet.schema,
    original_source_bytes:catalog.total,
    original_versions:catalog.packet.versions.map(v=>v.metadata),
    boundary:'OWNER_LOCAL_VERIFIED_FILES_ONLY; NO R2 RESTORE, OFFSITE CUSTODY, LIVE DEPLOYMENT OR NATIVE-ID REPLACEMENT'};
}
// CP29: verify restored native originals through their exact 2 MiB
// lineage pieces, with a single opened O_NOFOLLOW file handle. Never
// allocate a whole 64 MiB native file merely to prove it was restored.
// This is a read-only verification, not an editor or new custody copy.
async function verifyColdNativeInPieces(filename, version, openFile=fs.open) {
  const handle=await openBoundedSourceFile(filename,openFile);
  try{
    const initial=await handle.stat();
    if(!initial.isFile()||initial.size!==version.metadata.bytes
      ||initial.size<0||initial.size>PART_CATALOG_SINGLE)
      fail('COLD_NATIVE_OPENED_SIZE_HOLD');
    const whole=createHash('sha256');
    let offset=0;
    for(const part of version.parts){
      if(part.bytes<0||part.bytes>PART_BYTES)fail('COLD_NATIVE_PART_BOUND_HOLD');
      const bytes=Buffer.alloc(part.bytes);
      let read=0;
      while(read<bytes.length){
        const result=await handle.read(bytes,read,bytes.length-read,offset+read);
        if(result.bytesRead<=0)fail('COLD_NATIVE_SHORT_READ_HOLD');
        read+=result.bytesRead;
      }
      if(digest(bytes)!==part.sha256.toLowerCase())
        fail('COLD_NATIVE_PART_READBACK_HOLD');
      whole.update(bytes);offset+=bytes.length;
    }
    if(offset!==initial.size||whole.digest('hex')!==version.metadata.sha256.toLowerCase())
      fail('COLD_NATIVE_WHOLE_READBACK_HOLD');
    const final=await handle.stat();
    if(!final.isFile()||final.size!==initial.size||final.ino!==initial.ino
      ||final.dev!==initial.dev)fail('COLD_NATIVE_CHANGED_DURING_READ_HOLD');
    if(process.platform==='win32')
      await assertWindowsOpenedRegularFile(filename,handle);
  }finally{await handle.close();}
}

async function restoreColdParts(input,destination){
  const catalog=await inspectColdParts(await readPartsCatalog(input));
  const dest=path.resolve(destination), parent=path.dirname(dest);
  if(dest===parent||dest===path.parse(dest).root)fail('COLD_DESTINATION_UNSAFE');
  const parentStat=await fs.lstat(parent);
  if(!parentStat.isDirectory()||parentStat.isSymbolicLink())fail('COLD_PARENT_HOLD');
  await assertNoSymlinkDirectoryComponents(parent);
  await fs.mkdir(dest,{mode:0o700});
  const made=await fs.lstat(dest);
  try{
    for(const v of catalog.packet.versions){
      const name=nativeRecoveryName(v.metadata);
      const fd=await fs.open(path.join(dest,name),'wx',0o600);
      try{
        let offset=0;
        for(const p of v.parts){
          const bytes=await readBoundedRegularFile(path.join(catalog.folder,p.fileName),PART_BYTES);
          if(bytes.length!==p.bytes||digest(bytes)!==p.sha256)
            fail('COLD_PART_CHANGED_DURING_RECOVERY');
          let written=0;
          while(written<bytes.length){
            const w=await fd.write(bytes,written,bytes.length-written,offset+written);
            if(w.bytesWritten<=0)fail('COLD_FILE_WRITE_SHORT');
            written+=w.bytesWritten;
          }
          offset+=bytes.length;
        }
        if(offset!==v.metadata.bytes)fail('COLD_RECONSTRUCTED_BYTE_COUNT_HOLD');
        await fd.sync();
      }finally{await fd.close();}
      await verifyColdNativeInPieces(path.join(dest,name),v);
    }
    const receipt=Buffer.from(JSON.stringify(coldRecoveryManifest(catalog),null,2)+'\n');
    await writeDurableNewFile(path.join(dest,'recovery-manifest.json'),receipt);
    if(!(await readBoundedRegularFile(path.join(dest,'recovery-manifest.json'),PART_CATALOG_MAX)).equals(receipt))
      fail('COLD_MANIFEST_READBACK_HOLD');
    await syncRecoveryDirectory(dest,fs.open,made);
    const actualDest=await fs.lstat(dest),actualParent=await fs.lstat(parent);
    if(actualDest.ino!==made.ino||actualDest.dev!==made.dev||actualDest.isSymbolicLink()
      ||actualParent.ino!==parentStat.ino||actualParent.dev!==parentStat.dev||actualParent.isSymbolicLink())
      fail('COLD_DIRECTORY_IDENTITY_CHANGED');
    await syncRecoveryDirectory(parent,fs.open,parentStat);
  }catch(error){await cleanupEmptyFailedRecovery(dest,made);throw error;}
  return {outcome:'OFFLINE_SEGMENTED_SOURCE_RECOVERED',
    selected_id:catalog.packet.selected_id,version_count:catalog.packet.versions.length,
    source_bytes:catalog.total,destination:dest,remote_vault_modified:false,
    owner_offsite_custody_claimed:false,
    directory_fsync_proven:process.platform!=='win32',
    atomic_nofollow_proven:process.platform!=='win32',
    durability_boundary:process.platform==='win32'
      ?'WINDOWS_FILE_FSYNC_READBACK; DIRECTORY_METADATA_FSYNC_UNAVAILABLE'
      :'NATIVE_FILE_AND_DIRECTORY_FSYNC'};
}
async function auditColdParts(input,destination){
  const catalog=await inspectColdParts(await readPartsCatalog(input));
  const dest=path.resolve(destination);
  const stat=await fs.lstat(dest);
  if(!stat.isDirectory()||stat.isSymbolicLink())fail('COLD_AUDIT_DIRECTORY_UNSAFE');
  await assertNoSymlinkDirectoryComponents(dest);
  const expected=new Set(['recovery-manifest.json',...catalog.packet.versions.map(v=>nativeRecoveryName(v.metadata))]);
  if(expected.size!==catalog.packet.versions.length+1)fail('COLD_FILENAME_COLLISION_HOLD');
  const entries=await fs.readdir(dest,{withFileTypes:true});
  if(entries.length!==expected.size||entries.some(e=>!expected.has(e.name)||!e.isFile()||e.isSymbolicLink()))
    fail('COLD_AUDIT_INVENTORY_HOLD');
  const expectedReceipt=Buffer.from(JSON.stringify(coldRecoveryManifest(catalog),null,2)+'\n');
  const receipt=await readBoundedRegularFile(path.join(dest,'recovery-manifest.json'),PART_CATALOG_MAX);
  if(!receipt.equals(expectedReceipt))fail('COLD_AUDIT_RECEIPT_HOLD');
  for(const v of catalog.packet.versions){
    await verifyColdNativeInPieces(path.join(dest,nativeRecoveryName(v.metadata)),v);
  }
  return {outcome:'OFFLINE_SEGMENTED_SOURCE_AUDITED',
    selected_id:catalog.packet.selected_id,version_count:catalog.packet.versions.length,
    source_bytes:catalog.total,destination:dest,remote_vault_modified:false,
    owner_offsite_custody_claimed:false,
    directory_fsync_proven:process.platform!=='win32',
    atomic_nofollow_proven:process.platform!=='win32'};
}

async function main(args) {
  const catalogAt=args.indexOf('--parts-catalog');
  const catalogPath=catalogAt>=0?args[catalogAt+1]:null;
  const inputs = args.flatMap((arg,index) => arg === '--input' ? [args[index+1]] : []);
  const input = inputs[0] || null;
  const verifyOnly = args.includes('--verify-only');
  const outputAt = args.indexOf('--output-dir');
  const output = outputAt >= 0 ? args[outputAt + 1] : null;
  const auditAt = args.indexOf('--audit-dir');
  const audit = auditAt >= 0 ? args[auditAt + 1] : null;
  if(catalogAt>=0){
    if(inputs.length||!catalogPath||catalogPath.startsWith('--')||
      Number(verifyOnly)+Number(Boolean(output))+Number(Boolean(audit))!==1)
      fail('USAGE: --parts-catalog saved-catalog.json (--verify-only | --output-dir NEW | --audit-dir EXISTING)');
    if(verifyOnly){
      const v=await inspectColdParts(await readPartsCatalog(catalogPath));
      return {outcome:'OFFLINE_SEGMENTED_SOURCE_VERIFIED',
        version_count:v.packet.versions.length,source_bytes:v.total,
        packet_sha256:v.sha256,remote_vault_modified:false,owner_offsite_custody_claimed:false};
    }
    if(audit)return auditColdParts(catalogPath,audit);
    return restoreColdParts(catalogPath,output);
  }
  if (!input || inputs.some(v=>!v || v.startsWith('--'))
    || Number(verifyOnly) + Number(Boolean(output)) + Number(Boolean(audit)) !== 1) {
    fail('USAGE: --input <packet.json> [--input <another-packet.json> ...] (--verify-only | --output-dir <new-directory> | --audit-dir <existing-directory>)');
  }
  if (inputs.length > 1) {
    if (audit) return auditBatchPackets(inputs,audit);
    if (verifyOnly) {
      const batch = await readBatchPackets(inputs);
      return {outcome:'OFFLINE_MULTI_PACKET_VERIFIED',packet_count:batch.packets.length,
        version_count:batch.versionCount,source_bytes:batch.total,
        remote_vault_modified:false,owner_offsite_custody_claimed:false};
    }
    return restoreBatchPackets(inputs,output);
  }
  if (audit) return auditRestoredPacket(input, audit);
  if (verifyOnly) {
    const v = await readPacket(input);
    return { outcome: 'OFFLINE_PACKET_VERIFIED', kind: v.asset ? 'ORIGINAL_BINARY_ASSET' : 'ORIGINAL_HTML', selected_id: v.packet.selected_id,
      version_count: v.ready.length, source_bytes: v.total,
      packet_sha256: v.packet_sha256, remote_vault_modified: false,
      owner_offsite_custody_claimed: false };
  }
  return restorePacket(input, output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await main(process.argv.slice(2)))); }
  catch (error) {
    console.error(JSON.stringify({ outcome: 'HOLD_NO_RECOVERY', error: String(error.message).slice(0, 180),
      remote_vault_modified: false }));
    process.exitCode = 3;
  }
}

export { validatePacket, readPacket, restorePacket, auditRestoredPacket, cleanupEmptyFailedRecovery,
  writeDurableNewFile, syncRecoveryDirectory, readBoundedRegularFile, nativeRecoveryName,
  readBatchPackets, restoreBatchPackets, auditBatchPackets,
  readPartsCatalog, inspectColdParts, restoreColdParts, auditColdParts, verifyColdNativeInPieces };
