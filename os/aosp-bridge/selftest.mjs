import assert from 'node:assert/strict';

import {
  AOSP_UPSTREAM,
  DEPENDENCY_LEDGER,
  assessAospHost,
  buildJMControlPlane,
  createAospExecutionPlan,
  evaluateAospContactReceipt,
  renderAospBuildScript
} from './jm-aosp-bridge.mjs';

let pass = 0;
const test = (name, fn) => {
  fn();
  pass += 1;
  console.log('PASS', String(pass).padStart(2, '0'), name);
};

const readyHost = {
  os: 'linux',
  arch: 'x86_64',
  freeDiskGB: 500,
  ramGB: 64,
  glibcVersion: '2.39',
  repoAvailable: true,
  repoVersion: '2.45',
  nodeAvailable: true,
  nodeVersion: process.version
};

const blockedHost = {
  ...readyHost,
  freeDiskGB: 54,
  ramGB: 32
};

test('AOSP route uses current android-latest-release alias', () => {
  assert.equal(AOSP_UPSTREAM.branch, 'android-latest-release');
});

test('AOSP route uses current Cuttlefish phone target', () => {
  assert.equal(AOSP_UPSTREAM.target, 'aosp_cf_x86_64_only_phone-aosp_current-userdebug');
});

test('dependency ledger keeps AOSP as declared upstream, not JM authorship', () => {
  assert.equal(DEPENDENCY_LEDGER.find(x => x.id === 'aosp-source')?.class, 'OPEN_SOURCE_UPSTREAM');
});

test('dependency ledger marks OS_CODING as JM', () => {
  assert.equal(DEPENDENCY_LEDGER.find(x => x.id === 'os-coding')?.class, 'JM');
});

test('ready Linux host passes hard preflight', () => {
  const assessment = assessAospHost(readyHost);
  assert.equal(assessment.ready, true);
  assert.deepEqual(assessment.failed, []);
});

test('undersized host is held rather than pretending build readiness', () => {
  const assessment = assessAospHost(blockedHost);
  assert.equal(assessment.ready, false);
  assert.ok(assessment.failed.includes('host.disk'));
  assert.ok(assessment.failed.includes('host.ram'));
});

test('OS_CODING -> OneBody IR -> TheoC control plane verifies', () => {
  const control = buildJMControlPlane(readyHost);
  assert.equal(control.osCoding.ast.type, 'OSCodingProgram');
  assert.equal(control.osCoding.ir.type, 'OSCodingIR');
  assert.equal(control.oneBody.proof.ok, true);
  assert.equal(control.theoC.proof.ok, true);
  assert.equal(control.realContactAuthorised, true);
});

test('held host does not execute the OneBody preflight Ding', () => {
  const control = buildJMControlPlane(blockedHost);
  assert.equal(control.realContactAuthorised, false);
  assert.equal(control.oneBody.execution, null);
});

test('held host emits no real AOSP commands', () => {
  const plan = createAospExecutionPlan(blockedHost);
  assert.equal(plan.status, 'HOLD');
  assert.deepEqual(plan.commands, []);
});

test('ready host emits Repo sync + envsetup + lunch + m', () => {
  const plan = createAospExecutionPlan(readyHost);
  const joined = plan.commands.join('\n');
  assert.equal(plan.status, 'READY');
  assert.match(joined, /repo init .*android-latest-release/);
  assert.match(joined, /repo sync -c -j8/);
  assert.match(joined, /source build\/envsetup\.sh/);
  assert.match(joined, /lunch aosp_cf_x86_64_only_phone-aosp_current-userdebug/);
  assert.match(joined, /m -j/);
});

test('build script includes boot return observation', () => {
  const script = renderAospBuildScript(createAospExecutionPlan(readyHost));
  assert.match(script, /launch_cvd --daemon/);
  assert.match(script, /sys\.boot_completed/);
  assert.match(script, /ro\.build\.fingerprint/);
});

test('empty receipt earns no build Ding and no boot Ding', () => {
  const verdict = evaluateAospContactReceipt({});
  assert.equal(verdict.build.ding, null);
  assert.equal(verdict.boot.ding, null);
  assert.equal(verdict.crown, 'NO_AOSP_BUILD_BOOT_CROWN');
});

test('build evidence can earn bounded build Ding without boot Ding', () => {
  const verdict = evaluateAospContactReceipt({
    buildExitCode: 0,
    systemImageObserved: true,
    branch: AOSP_UPSTREAM.branch,
    target: AOSP_UPSTREAM.target,
    manifestRevision: 'platform/build@deadbeef'
  });
  assert.ok(verdict.build.ding);
  assert.equal(verdict.boot.ding, null);
});

test('boot Ding requires build evidence first', () => {
  const verdict = evaluateAospContactReceipt({
    bootCompleted: '1',
    buildFingerprint: 'jm/test/fingerprint'
  });
  assert.equal(verdict.boot.ding, null);
});

test('full returned contact earns bounded build + boot Dings', () => {
  const verdict = evaluateAospContactReceipt({
    buildExitCode: 0,
    systemImageObserved: true,
    branch: AOSP_UPSTREAM.branch,
    target: AOSP_UPSTREAM.target,
    manifestRevision: 'platform/build@deadbeef',
    bootCompleted: '1',
    buildFingerprint: 'aosp/cf_x86_64_only_phone/jm-contact'
  });
  assert.ok(verdict.build.ding);
  assert.ok(verdict.boot.ding);
  assert.equal(verdict.crown, 'BOUNDED_AOSP_BUILD_BOOT_CONTACT');
});

test('final crown stays bounded beyond real-phone/production claims', () => {
  const verdict = evaluateAospContactReceipt({
    buildExitCode: 0,
    systemImageObserved: true,
    branch: AOSP_UPSTREAM.branch,
    target: AOSP_UPSTREAM.target,
    manifestRevision: 'platform/build@deadbeef',
    bootCompleted: '1',
    buildFingerprint: 'aosp/cf_x86_64_only_phone/jm-contact'
  });
  assert.match(verdict.boundary, /real-phone hardware support/);
  assert.match(verdict.boundary, /CTS compatibility/);
});

console.log(JSON.stringify({
  schema: 'jm.aosp-bridge-selftest/0.1',
  pass,
  total: 16,
  state: pass === 16 ? 'PASS' : 'FAIL',
  claim: 'JM AOSP bridge logic proven only; no AOSP compile/boot claimed.'
}, null, 2));
