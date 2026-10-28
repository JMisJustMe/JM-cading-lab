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
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
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

async function readPacket(input) {
  const file = await fs.lstat(input);
  if (!file.isFile() || file.isSymbolicLink() || file.size > MAX_PACKET_BYTES) {
    fail('LINEAGE_INPUT_NOT_REGULAR_OR_OVERBOUNDED');
  }
  const raw = await fs.readFile(input);
  if (raw.length > MAX_PACKET_BYTES) fail('LINEAGE_PACKET_SIZE_LIMIT');
  let packet;
  try { packet = JSON.parse(raw.toString('utf8')); }
  catch { fail('LINEAGE_PACKET_NOT_JSON'); }
  return { packet, packet_sha256: digest(raw), ...validatePacket(packet) };
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
  // mkdir without recursive is an atomic existing-directory refusal.
  await fs.mkdir(dest, { mode: 0o700 });
  try {
    const inventory = {
      schema: 'JM.OwnerVault/0.1.OfflineRecovered',
      selected_id: verified.packet.selected_id,
      packet_sha256: verified.packet_sha256,
      original_schema: SCHEMA,
      original_source_bytes: verified.total,
      original_versions: verified.ready.map(({ metadata }) => metadata),
      boundary: 'OWNER_LOCAL_VERIFIED_FILES_ONLY; NO R2 RESTORE, OFFSITE CUSTODY, LIVE DEPLOYMENT OR NATIVE-ID REPLACEMENT'
    };
    for (const { metadata, bytes } of verified.ready) {
      const name = `${metadata.id}.html`; // IDs only; never owner-provided filenames.
      const filename = path.join(dest, name);
      await fs.writeFile(filename, bytes, { flag: 'wx', mode: 0o600 });
      const check = await fs.readFile(filename);
      if (!check.equals(bytes) || digest(check) !== metadata.sha256.toLowerCase()) {
        fail('LINEAGE_DISK_READBACK_FAILED');
      }
    }
    await fs.writeFile(path.join(dest, 'recovery-manifest.json'),
      JSON.stringify(inventory, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 });
    const stored = JSON.parse(await fs.readFile(path.join(dest, 'recovery-manifest.json'), 'utf8'));
    if (stored.packet_sha256 !== verified.packet_sha256
      || stored.original_versions.length !== verified.ready.length) {
      fail('LINEAGE_MANIFEST_READBACK_FAILED');
    }
  } catch (error) {
    // Only delete the newly created directory, never a pre-existing user path.
    await fs.rm(dest, { recursive: true, force: true });
    throw error;
  }
  return { outcome: 'OFFLINE_SOURCE_RECOVERED', selected_id: verified.packet.selected_id,
    version_count: verified.ready.length, source_bytes: verified.total,
    packet_sha256: verified.packet_sha256, destination: dest,
    remote_vault_modified: false, owner_offsite_custody_claimed: false };
}

async function main(args) {
  const inputAt = args.indexOf('--input');
  const input = inputAt >= 0 ? args[inputAt + 1] : null;
  const verifyOnly = args.includes('--verify-only');
  const outputAt = args.indexOf('--output-dir');
  const output = outputAt >= 0 ? args[outputAt + 1] : null;
  if (!input || (verifyOnly === Boolean(output))) {
    fail('USAGE: --input <owner-saved-packet.json> (--verify-only | --output-dir <new-directory>)');
  }
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

export { validatePacket, readPacket, restorePacket };
