#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  assessAospHost,
  buildJMControlPlane,
  createAospExecutionPlan,
  renderAospBuildScript
} from './jm-aosp-bridge.mjs';

function tryText(command, args = []) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function repoVersion() {
  const text = tryText('repo', ['version']);
  const match = text.match(/repo(?: launcher)? version\s+([0-9.]+)/i)
    ?? text.match(/repo version\s+([0-9.]+)/i)
    ?? text.match(/\b([0-9]+\.[0-9]+(?:\.[0-9]+)?)\b/);
  return { available: Boolean(text), version: match?.[1] ?? null, raw: text || null };
}

function diskFreeGB(target) {
  let probe = path.resolve(target);
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  const text = tryText('df', ['-Pk', probe]);
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 0;
  const cols = lines.at(-1).trim().split(/\s+/);
  const availableKB = Number(cols.at(-3));
  return Number.isFinite(availableKB) ? availableKB / 1024 / 1024 : 0;
}

function glibcVersion() {
  const report = process.report?.getReport?.();
  const runtime = report?.header?.glibcVersionRuntime;
  if (runtime) return runtime;
  const text = tryText('ldd', ['--version']);
  return text.match(/\b(\d+\.\d+(?:\.\d+)?)\b/)?.[1] ?? null;
}

function detectHost(root) {
  const repo = repoVersion();
  return {
    os: process.platform,
    arch: process.arch,
    freeDiskGB: Number(diskFreeGB(root).toFixed(2)),
    ramGB: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
    glibcVersion: glibcVersion(),
    repoAvailable: repo.available,
    repoVersion: repo.version,
    repoRaw: repo.raw,
    nodeAvailable: true,
    nodeVersion: process.version
  };
}

const execute = process.argv.includes('--execute');
const root = process.env.JM_AOSP_ROOT ?? path.join(os.homedir(), 'jm-aosp', 'android-latest-release');
const receiptDir = process.env.JM_AOSP_RECEIPT_DIR ?? path.resolve('jm-aosp-receipts');
fs.mkdirSync(receiptDir, { recursive: true });

const host = detectHost(root);
const assessment = assessAospHost(host);
const control = buildJMControlPlane(host);
const plan = createAospExecutionPlan(host);

const preflightReceipt = {
  schema: 'jm.aosp-preflight-receipt/0.1',
  at: new Date().toISOString(),
  root,
  host,
  assessment,
  controlClaim: control.claim,
  planStatus: plan.status,
  boundary: 'Preflight/control-plane receipt only; no AOSP build or boot claim.'
};

const preflightPath = path.join(receiptDir, 'JM_AOSP_PREFLIGHT_RECEIPT_v0_1.json');
fs.writeFileSync(preflightPath, JSON.stringify(preflightReceipt, null, 2) + '\n');

console.log('[JM AOSP] preflight receipt:', preflightPath);
for (const item of assessment.checks) {
  console.log(item.passed ? 'PASS' : 'HOLD', item.id, 'actual=', item.actual, 'required=', item.required);
}

if (plan.status !== 'READY') {
  console.error('[JM AOSP] HOLD — host requirements not satisfied. No AOSP build command emitted or executed.');
  process.exitCode = 78;
} else {
  const script = renderAospBuildScript(plan);
  const scriptPath = path.join(receiptDir, 'jm-aosp-real-contact.generated.sh');
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, 0o755);
  console.log('[JM AOSP] JM control plane READY.');
  console.log('[JM AOSP] generated real-contact script:', scriptPath);

  if (execute) {
    console.log('[JM AOSP] --execute supplied: entering real AOSP source/build/boot route.');
    const result = spawnSync('bash', [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env, JM_AOSP_ROOT: root }
    });
    process.exitCode = result.status ?? 1;
  } else {
    console.log('[JM AOSP] not executed: rerun with --execute when you intend to start the heavy AOSP contact.');
  }
}
