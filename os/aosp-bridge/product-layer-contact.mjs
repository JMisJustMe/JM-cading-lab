#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { stageJMProduct } from './install-jm-aosp-product.mjs';

const REVISION = 'android17-release';
const REMOTE = 'https://android.googlesource.com/device/google/cuttlefish';
const ROOT = path.resolve(process.env.JM_AOSP_PRODUCT_CONTACT_ROOT ?? '.jm-aosp-product-contact');
const RECEIPT_DIR = path.resolve(process.env.JM_AOSP_RECEIPT_DIR ?? 'jm-aosp-receipts');

function run(command, args, cwd = undefined) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(path.dirname(ROOT), { recursive: true });
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

run('git', [
  'clone',
  '--depth', '1',
  '--filter=blob:none',
  '--no-checkout',
  '--branch', REVISION,
  REMOTE,
  ROOT
]);

run('git', ['sparse-checkout', 'init', '--cone'], ROOT);
run('git', ['sparse-checkout', 'set', 'vsoc_x86_64_only/phone'], ROOT);
run('git', ['checkout', REVISION], ROOT);

const upstreamCommit = run('git', ['rev-parse', 'HEAD'], ROOT);
const upstreamRemote = run('git', ['config', '--get', 'remote.origin.url'], ROOT);
const base = path.join(ROOT, 'vsoc_x86_64_only', 'phone', 'aosp_cf.mk');

// Mirror the Repo checkout path expected by the product inheritance statement.
const mirrorBaseDir = path.join(ROOT, 'device', 'google', 'cuttlefish', 'vsoc_x86_64_only', 'phone');
fs.mkdirSync(mirrorBaseDir, { recursive: true });
const mirrorBase = path.join(mirrorBaseDir, 'aosp_cf.mk');
fs.copyFileSync(base, mirrorBase);

const upstreamBefore = sha256(base);
const mirrorBefore = sha256(mirrorBase);
const staged = stageJMProduct(ROOT);
const upstreamAfter = sha256(base);
const mirrorAfter = sha256(mirrorBase);

const checks = [
  { id: 'upstream.remote', passed: upstreamRemote === REMOTE, actual: upstreamRemote, required: REMOTE },
  { id: 'upstream.commit', passed: /^[0-9a-f]{40}$/i.test(upstreamCommit), actual: upstreamCommit, required: '40-hex commit' },
  { id: 'upstream.base-preserved', passed: upstreamBefore === upstreamAfter, actual: upstreamAfter, required: upstreamBefore },
  { id: 'repo-layout.base-preserved', passed: mirrorBefore === mirrorAfter, actual: mirrorAfter, required: mirrorBefore },
  { id: 'jm.stage', passed: staged.passed === true, actual: staged.passed, required: true },
  { id: 'jm.separate-tree', passed: staged.destination.includes(path.join('device', 'jm', 'cuttlefish')), actual: staged.destination, required: 'device/jm/cuttlefish' }
];

const passed = checks.every(item => item.passed);
const receipt = {
  schema: 'jm.aosp-product-layer-contact-receipt/0.7',
  at: new Date().toISOString(),
  upstream: {
    remote: upstreamRemote,
    revision: REVISION,
    commit: upstreamCommit,
    baseProduct: 'device/google/cuttlefish/vsoc_x86_64_only/phone/aosp_cf.mk',
    baseSha256Before: mirrorBefore,
    baseSha256After: mirrorAfter
  },
  staged,
  checks,
  ding: passed ? {
    type: 'DING',
    scope: 'JM_AOSP_PRODUCT_LAYER_REAL_SOURCE_CONTACT',
    claim: 'The JM Cuttlefish product layer was staged beside a real Android 17 Cuttlefish base checkout while the upstream base product remained byte-identical.'
  } : null,
  boundary: 'Real source-tree staging contact only. Soong product discovery, compilation, image inclusion and boot remain unearned until heavy-host contact.'
};

const out = path.join(RECEIPT_DIR, 'JM_AOSP_PRODUCT_LAYER_CONTACT_RECEIPT_v0_7.json');
fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
console.log('[JM AOSP] receipt:', out);

if (!passed) process.exitCode = 1;
