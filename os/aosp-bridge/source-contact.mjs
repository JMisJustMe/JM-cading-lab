#!/usr/bin/env node

/*
 * JM AOSP Source Contact v0.2
 *
 * Performs a real, bounded external contact with the official AOSP manifest
 * repository. This is deliberately smaller than repo sync/build and therefore
 * can run on ordinary CI. It may earn SOURCE/MANIFEST CONTACT only.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MANIFEST_URL = 'https://android.googlesource.com/platform/manifest';
const MANIFEST_ALIAS = 'android-latest-release';
const workRoot = path.resolve(process.env.JM_AOSP_MANIFEST_DIR ?? '.jm-aosp-manifest-contact');
const receiptDir = path.resolve(process.env.JM_AOSP_RECEIPT_DIR ?? 'jm-aosp-receipts');
const checkout = path.join(workRoot, 'manifest');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim();
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function xmlAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`));
  return match?.[1] ?? null;
}

fs.rmSync(workRoot, { recursive: true, force: true });
fs.mkdirSync(workRoot, { recursive: true });
fs.mkdirSync(receiptDir, { recursive: true });

run('git', ['clone', '--depth', '1', '--branch', MANIFEST_ALIAS, MANIFEST_URL, checkout]);

const commit = run('git', ['-C', checkout, 'rev-parse', 'HEAD']);
const branch = run('git', ['-C', checkout, 'rev-parse', '--abbrev-ref', 'HEAD']);
const remote = run('git', ['-C', checkout, 'config', '--get', 'remote.origin.url']);
const defaultXmlPath = path.join(checkout, 'default.xml');
const defaultXml = fs.readFileSync(defaultXmlPath, 'utf8');

const projectCount = (defaultXml.match(/<project\b/g) ?? []).length;
const includeCount = (defaultXml.match(/<include\b/g) ?? []).length;
const defaultTag = defaultXml.match(/<default\b[^>]*>/)?.[0] ?? '';
const resolvedDefaultRevision = xmlAttr(defaultTag, 'revision');
const remoteTag = defaultXml.match(/<remote\b[^>]*>/)?.[0] ?? '';
const manifestFetch = xmlAttr(remoteTag, 'fetch');

const checks = [
  { id: 'remote.official', passed: remote === MANIFEST_URL, actual: remote, required: MANIFEST_URL },
  { id: 'branch.alias', passed: branch === MANIFEST_ALIAS, actual: branch, required: MANIFEST_ALIAS },
  { id: 'commit.pinned', passed: /^[0-9a-f]{40}$/i.test(commit), actual: commit, required: '40-hex Git commit' },
  { id: 'manifest.xml', passed: /<manifest\b/.test(defaultXml), actual: defaultXmlPath, required: '<manifest>' },
  { id: 'manifest.projects', passed: projectCount > 0 || includeCount > 0, actual: { projectCount, includeCount }, required: 'project/include entries > 0' },
  { id: 'manifest.revision', passed: Boolean(resolvedDefaultRevision), actual: resolvedDefaultRevision, required: 'non-empty default revision' }
];

const passed = checks.every(item => item.passed);
const receipt = {
  schema: 'jm.aosp-source-contact-receipt/0.2',
  at: new Date().toISOString(),
  upstream: {
    remote,
    requestedAlias: MANIFEST_ALIAS,
    checkedOutBranch: branch,
    manifestCommit: commit,
    resolvedDefaultRevision,
    manifestFetch,
    defaultXmlSha256: sha256(defaultXml),
    projectCount,
    includeCount
  },
  checks,
  ding: passed ? {
    type: 'DING',
    scope: 'AOSP_SOURCE_MANIFEST_CONTACT',
    claim: 'Official AOSP android-latest-release manifest returned from android.googlesource.com and was pinned/inspected.'
  } : null,
  boundary: 'SOURCE/MANIFEST CONTACT ONLY. This is not repo sync, AOSP compilation, image production, boot, CTS, hardware or production proof.'
};

const out = path.join(receiptDir, 'JM_AOSP_SOURCE_CONTACT_RECEIPT_v0_2.json');
fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');

console.log(JSON.stringify(receipt, null, 2));
console.log('[JM AOSP] receipt:', out);

if (!passed) process.exitCode = 1;
