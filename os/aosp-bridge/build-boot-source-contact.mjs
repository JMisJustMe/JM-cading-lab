#!/usr/bin/env node

/*
 * JM AOSP Build/Boot Source Contact v0.4
 *
 * Extends real Android 17 contact into the exact source surfaces that define
 * the documented Cuttlefish build target and the core boot/runtime chain.
 *
 * Claim ceiling: source/build-anatomy contact only; still not a full AOSP build.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REVISION = process.env.JM_AOSP_REVISION ?? 'android17-release';
const ROOT = path.resolve(process.env.JM_AOSP_BUILD_BOOT_ROOT ?? '.jm-aosp-build-boot-source');
const RECEIPT_DIR = path.resolve(process.env.JM_AOSP_RECEIPT_DIR ?? 'jm-aosp-receipts');

const PROJECTS = Object.freeze([
  {
    id: 'frameworks-base-systemserver',
    remote: 'https://android.googlesource.com/platform/frameworks/base',
    sparse: ['services/java/com/android/server'],
    landmarks: {
      SystemServer: 'services/java/com/android/server/SystemServer.java'
    }
  },
  {
    id: 'build-soong-entrypoints',
    remote: 'https://android.googlesource.com/platform/build/soong',
    sparse: ['cmd/soong_build', 'cmd/soong_ui'],
    landmarks: {
      SoongBuildMain: 'cmd/soong_build/main.go',
      SoongUiMain: 'cmd/soong_ui/main.go'
    }
  },
  {
    id: 'build-make',
    remote: 'https://android.googlesource.com/platform/build',
    sparse: ['core', 'target/product', 'tools/releasetools'],
    landmarks: {
      EnvSetup: 'envsetup.sh',
      CoreMain: 'core/main.mk'
    }
  },
  {
    id: 'cuttlefish-device',
    remote: 'https://android.googlesource.com/device/google/cuttlefish',
    sparse: ['vsoc_x86_64_only/phone', 'shared'],
    landmarks: {
      AndroidProducts: 'AndroidProducts.mk',
      X8664OnlyPhoneProduct: 'vsoc_x86_64_only/phone/aosp_cf.mk'
    }
  },
  {
    id: 'art-runtime',
    remote: 'https://android.googlesource.com/platform/art',
    sparse: ['runtime', 'libartbase'],
    landmarks: {
      Runtime: 'runtime/runtime.cc',
      RuntimeBlueprint: 'runtime/Android.bp'
    }
  },
  {
    id: 'bionic',
    remote: 'https://android.googlesource.com/platform/bionic',
    sparse: ['libc', 'libdl'],
    landmarks: {
      LibcBlueprint: 'libc/Android.bp'
    }
  },
  {
    id: 'system-sepolicy',
    remote: 'https://android.googlesource.com/platform/system/sepolicy',
    sparse: ['private', 'public'],
    landmarks: {
      PrivateDomainPolicy: 'private/domain.te',
      PublicSystemServerPolicy: 'public/system_server.te'
    }
  },
  {
    id: 'bootable-recovery',
    remote: 'https://android.googlesource.com/platform/bootable/recovery',
    sparse: ['recovery_utils', 'install'],
    landmarks: {
      RecoveryMain: 'recovery.cpp'
    }
  },
  {
    id: 'avb',
    remote: 'https://android.googlesource.com/platform/external/avb',
    sparse: ['libavb', 'avbtool'],
    landmarks: {
      AvbSlotVerify: 'libavb/avb_slot_verify.c',
      AvbTool: 'avbtool.py'
    }
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

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

function inspectLandmarks(root, landmarks) {
  return Object.fromEntries(Object.entries(landmarks).map(([name, rel]) => {
    const file = path.join(root, ...rel.split('/'));
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    return [name, {
      path: rel,
      exists,
      bytes: exists ? fs.statSync(file).size : 0,
      sha256: exists ? sha256File(file) : null
    }];
  }));
}

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const contacts = [];

for (const project of PROJECTS) {
  const dest = path.join(ROOT, project.id);
  console.log('[JM AOSP] build/boot contact', project.id);

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
  const landmarks = inspectLandmarks(dest, project.landmarks);
  const landmarkPassed = Object.values(landmarks).every(item => item.exists);

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
    passed:
      remote === project.remote &&
      branch === REVISION &&
      /^[0-9a-f]{40}$/i.test(commit) &&
      files.length > 0 &&
      landmarkPassed
  });
}

const cuttlefishRoot = path.join(ROOT, 'cuttlefish-device');
const productsFile = path.join(cuttlefishRoot, 'AndroidProducts.mk');
const productsText = fs.readFileSync(productsFile, 'utf8');
const documentedProduct = 'aosp_cf_x86_64_only_phone';
const productDeclared = productsText.includes(documentedProduct);

const allPassed = contacts.every(item => item.passed) && productDeclared;
const totalFiles = contacts.reduce((sum, item) => sum + item.fileCount, 0);
const totalBytes = contacts.reduce((sum, item) => sum + item.bytes, 0);

const receipt = {
  schema: 'jm.aosp-build-boot-source-contact-receipt/0.4',
  at: new Date().toISOString(),
  host: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    hostname: os.hostname()
  },
  upstreamRevision: REVISION,
  documentedLunchTarget: 'aosp_cf_x86_64_only_phone-aosp_current-userdebug',
  productAuthority: {
    product: documentedProduct,
    declaredByCuttlefishAndroidProducts: productDeclared
  },
  contacts,
  totals: {
    projects: contacts.length,
    files: totalFiles,
    bytes: totalBytes
  },
  ding: allPassed ? {
    type: 'DING',
    scope: 'AOSP_BUILD_BOOT_SOURCE_ANATOMY_CONTACT',
    claim: 'Android 17 build/boot anatomy returned from official AOSP source, including SystemServer, Soong/build entrypoints, the documented Cuttlefish x86_64-only phone product, ART, Bionic, SELinux policy, recovery and AVB.'
  } : null,
  boundary: 'SOURCE ANATOMY CONTACT ONLY. Does not prove full repo sync, Soong/Ninja compilation, image generation, Cuttlefish boot, CTS, physical hardware or production readiness.'
};

const out = path.join(RECEIPT_DIR, 'JM_AOSP_BUILD_BOOT_SOURCE_CONTACT_RECEIPT_v0_4.json');
fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');

console.log(JSON.stringify(receipt, null, 2));
console.log('[JM AOSP] receipt:', out);

if (!allPassed) process.exitCode = 1;
