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
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/i;
const MAX_VERSIONS = 16;
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_PACKET_BYTES = 46 * 1024 * 1024;
const MAX_SINGLE_SOURCE = 25 * 1024 * 1024;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error(code); };

function validatePacket(packet) {
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

// CP26: lstat + readFile is a path-reopening race. Open the actual regular
// file with no-follow and nonblocking flags, then validate the OPEN handle.
// This protects the final component even if it is swapped after preflight;
// it is not an atomic defence against replacement of ancestor directories.
async function readBoundedRegularFile(filename, maxBytes, openFile = fs.open) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0
      || typeof fsConstants.O_NOFOLLOW !== 'number'
      || typeof fsConstants.O_NONBLOCK !== 'number') {
    fail('LINEAGE_SAFE_OPEN_UNSUPPORTED');
  }
  const flags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
  const handle = await openFile(filename, flags);
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
    original_schema: SCHEMA,
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
      const name = `${metadata.id}.html`; // IDs only; never owner-provided filenames.
      const filename = path.join(dest, name);
      await writeDurableNewFile(filename, bytes);
      const check = await readBoundedRegularFile(filename, MAX_SINGLE_SOURCE);
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
  return { outcome: 'OFFLINE_SOURCE_RECOVERED', selected_id: verified.packet.selected_id,
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
    ...verified.ready.map(({ metadata }) => `${metadata.id}.html`)]);
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
    const restored = await readBoundedRegularFile(path.join(dest, `${metadata.id}.html`), MAX_SINGLE_SOURCE);
    if (!restored.equals(bytes) || digest(restored) !== metadata.sha256.toLowerCase()) {
      fail('LINEAGE_AUDIT_SOURCE_MISMATCH');
    }
  }
  return { outcome: 'OFFLINE_RESTORED_FILES_AUDITED',
    selected_id: verified.packet.selected_id, version_count: verified.ready.length,
    source_bytes: verified.total, packet_sha256: verified.packet_sha256,
    destination: dest, remote_vault_modified: false,
    owner_offsite_custody_claimed: false };
}

async function main(args) {
  const inputAt = args.indexOf('--input');
  const input = inputAt >= 0 ? args[inputAt + 1] : null;
  const verifyOnly = args.includes('--verify-only');
  const outputAt = args.indexOf('--output-dir');
  const output = outputAt >= 0 ? args[outputAt + 1] : null;
  const auditAt = args.indexOf('--audit-dir');
  const audit = auditAt >= 0 ? args[auditAt + 1] : null;
  if (!input || Number(verifyOnly) + Number(Boolean(output)) + Number(Boolean(audit)) !== 1) {
    fail('USAGE: --input <owner-saved-packet.json> (--verify-only | --output-dir <new-directory> | --audit-dir <existing-directory>)');
  }
  if (audit) return auditRestoredPacket(input, audit);
  if (verifyOnly) {
    const v = await readPacket(input);
    return { outcome: 'OFFLINE_PACKET_VERIFIED', selected_id: v.packet.selected_id,
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
  writeDurableNewFile, syncRecoveryDirectory, readBoundedRegularFile };
