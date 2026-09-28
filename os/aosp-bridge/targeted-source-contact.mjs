#!/usr/bin/env node

/*
 * JM AOSP Targeted Source Contact v0.3
 *
 * Pulls selected real AOSP Android 17 source organs using shallow partial+sparse
 * Git contact so JM can work against genuine upstream code before the full
 * 400 GB checkout/build carrier is available.
 *
 * Claim ceiling: targeted source contact only; not a full AOSP checkout/build.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REVISION = process.env.JM_AOSP_REVISION ?? 'android17-release';
const ROOT = path.resolve(process.env.JM_AOSP_TARGETED_ROOT ?? '.jm-aosp-targeted-source');
const RECEIPT_DIR = path.resolve(process.env.JM_AOSP_RECEIPT_DIR ?? 'jm-aosp-receipts');

const PROJECTS = Object.freeze([
  {
    id: 'frameworks-base',
    remote: 'https://android.googlesource.com/platform/frameworks/base',
    sparse: [
      'core/java/android/app',
      'services/core/java/com/android/server',
      'packages/SystemUI/src'
    ],
    landmarks: ['ActivityThread.java', 'SystemServer.java', 'SystemUIInitializer.java']
  },
  {
    id: 'system-core',
    remote: 'https://android.googlesource.com/platform/system/core',
    sparse: ['init', 'adb'],
    landmarks: ['main.cpp', 'init.cpp']
  },
  {
    id: 'frameworks-native',
    remote: 'https://android.googlesource.com/platform/frameworks/native',
    sparse: ['libs/binder', 'services/surfaceflinger'],
    landmarks: ['ProcessState.cpp', 'SurfaceFlinger.cpp']
  },
  {
    id: 'settings',
    remote: 'https://android.googlesource.com/platform/packages/apps/Settings',
    sparse: ['src', 'res'],
    landmarks: ['SettingsActivity.java']
  },
  {
    id: 'launcher3',
    remote: 'https://android.googlesource.com/platform/packages/apps/Launcher3',
    sparse: ['src', 'res'],
    landmarks: ['Launcher.java']
  },
  {
    id: 'build-soong',
    remote: 'https://android.googlesource.com/platform/build/soong',
    sparse: ['android', 'cmd'],
    landmarks: ['soong_build.go', 'androidmk.go']
  }
]);

function run(command, args, cwd = undefined) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function walkFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out.sort();
}

function treeDigest(root, files) {
  const h = crypto.createHash('sha256');
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    h.update(rel);
    h.update('\0');
    h.update(fs.readFileSync(file));
    h.update('\0');
  }
  return h.digest('hex');
}

function findLandmark(root, basename) {
  return walkFiles(root)
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .find(rel => path.basename(rel) === basename) ?? null;
}

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const contacts = [];

for (const project of PROJECTS) {
  const dest = path.join(ROOT, project.id);
  console.log('[JM AOSP] contact', project.id);

  run('git', [
    'clone',
    '--depth', '1',
    '--filter=blob:none',
    '--no-checkout',
    '--branch', REVISION,
    project.remote,
    dest
  ]);

  run('git', ['sparse-checkout', 'init', '--cone'], dest);
  run('git', ['sparse-checkout', 'set', ...project.sparse], dest);
  run('git', ['checkout', REVISION], dest);

  const commit = run('git', ['rev-parse', 'HEAD'], dest);
  const remote = run('git', ['config', '--get', 'remote.origin.url'], dest);
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], dest);
  const files = walkFiles(dest);
  const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const landmarks = Object.fromEntries(project.landmarks.map(name => [name, findLandmark(dest, name)]));

  contacts.push({
    id: project.id,
    remote,
    branch,
    revisionRequested: REVISION,
    commit,
    sparsePaths: project.sparse,
    fileCount: files.length,
    bytes,
    treeSha256: treeDigest(dest, files),
    landmarks,
    passed: remote === project.remote &&
      branch === REVISION &&
      /^[0-9a-f]{40}$/i.test(commit) &&
      files.length > 0
  });
}

const allPassed = contacts.every(item => item.passed);
const totalFiles = contacts.reduce((sum, item) => sum + item.fileCount, 0);
const totalBytes = contacts.reduce((sum, item) => sum + item.bytes, 0);

const receipt = {
  schema: 'jm.aosp-targeted-source-contact-receipt/0.3',
  at: new Date().toISOString(),
  host: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    hostname: os.hostname()
  },
  upstreamRevision: REVISION,
  contacts,
  totals: {
    projects: contacts.length,
    files: totalFiles,
    bytes: totalBytes
  },
  ding: allPassed ? {
    type: 'DING',
    scope: 'AOSP_TARGETED_SOURCE_CONTACT',
    claim: 'Selected Android 17 AOSP framework, init/adb, native/Binder/SurfaceFlinger, Settings, Launcher3 and Soong source returned from official android.googlesource.com repositories.'
  } : null,
  boundary: 'TARGETED SOURCE CONTACT ONLY. Sparse source is not the full AOSP tree and does not prove full repo sync, compilation, image production, boot, CTS, hardware support or production readiness.'
};

const out = path.join(RECEIPT_DIR, 'JM_AOSP_TARGETED_SOURCE_CONTACT_RECEIPT_v0_3.json');
fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
console.log('[JM AOSP] receipt:', out);

if (!allPassed) process.exitCode = 1;
