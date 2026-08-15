import fs from 'node:fs';

const readJson = url => JSON.parse(fs.readFileSync(url, 'utf8'));
const mount = readJson(new URL('../../integration/mounts/natural-operational-language-recoverable-workspace-v2.0.json', import.meta.url));
const registryManifest = readJson(new URL('../../integration/REGISTRY.json', import.meta.url));
const bodies = registryManifest.parts.flatMap(part => readJson(new URL(`../../integration/${part}`, import.meta.url)).bodies);
const byId = new Map(bodies.map(body => [body.id, body]));

const checks = [];
function check(name, fn) {
  try {
    const result = fn();
    checks.push({ name, passed: true, result });
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
  }
}
function expect(value, message) {
  if (!value) throw new Error(message);
}

check('01 canonical registry remains exactly 100 bodies', () => {
  expect(registryManifest.count === 100, `REGISTRY_COUNT_${registryManifest.count}`);
  expect(bodies.length === 100, `BODY_COUNT_${bodies.length}`);
  return { manifest: registryManifest.count, actual: bodies.length };
});

check('02 v2.0 mount stays outside the canonical registry', () => {
  expect(mount.canonicalRegistryMutation === false, 'CANONICAL_REGISTRY_MUTATION_NOT_FALSE');
  expect(!byId.has(mount.id), 'V20_MOUNT_INFLATED_INTO_CANONICAL_100');
  expect(mount.supreme === false, 'SUPREME_BODY_INFLATION');
  return { externalSurface: mount.id };
});

check('03 frozen authority is exact and anchor identity is locked', () => {
  expect(mount.authority.freezeHead === '69174bc78c4a0824965ed0c0240965f7527496dc', 'FREEZE_HEAD_CHANGED');
  expect(mount.authority.anchorCommitIdenticalToFreeze === true, 'ANCHOR_FREEZE_IDENTITY_NOT_LOCKED');
  expect(mount.authority.freezeBranch === 'freeze/natural-operational-language-recoverable-workspace-v2-0', 'FREEZE_BRANCH_CHANGED');
  expect(mount.authority.anchorBranch === 'anchor/natural-operational-language-recoverable-workspace-v2-0', 'ANCHOR_BRANCH_CHANGED');
  return mount.authority;
});

check('04 required donor and support bodies still exist', () => {
  const missing = mount.mountedAgainst.requiredBodies.filter(id => !byId.has(id));
  expect(missing.length === 0, `MISSING_REQUIRED_BODIES:${missing.join(',')}`);
  return mount.mountedAgainst.requiredBodies.map(id => ({ id, name: byId.get(id).name }));
});

check('05 frozen v2.0 creator body is present', () => {
  const files = [
    './00_OPEN_FIRST.html',
    './recoverable-workspace.mjs',
    './test-v2.0.mjs',
    './build-standalone.mjs',
    './FREEZE_LOCK_ANCHOR_v2.0.md',
    './CLASSIFICATION_APPS_TOOLS.md'
  ];
  const missing = files.filter(file => !fs.existsSync(new URL(file, import.meta.url)));
  expect(missing.length === 0, `MISSING_V20_FILES:${missing.join(',')}`);
  return files;
});

check('06 creator/recovery doors are genuinely mounted', () => {
  expect(mount.status === 'PROVISIONAL_MOUNT', `STATUS_${mount.status}`);
  expect(mount.claimBoundary.creatorWorkspace === 'MOUNTED', 'CREATOR_WORKSPACE_NOT_MOUNTED');
  expect(mount.claimBoundary.previewCommitDoor === 'MOUNTED', 'PREVIEW_COMMIT_NOT_MOUNTED');
  expect(mount.claimBoundary.replayRecovery === 'MOUNTED', 'REPLAY_RECOVERY_NOT_MOUNTED');
  expect(mount.claimBoundary.undoRedoCheckpointsRooms === 'MOUNTED', 'RECOVERY_TOOLS_NOT_MOUNTED');
  expect(mount.claimBoundary.integrityBoundRoomImportExport === 'MOUNTED', 'ROOM_PACKAGE_NOT_MOUNTED');
  expect(mount.claimBoundary.portableIRDoor === 'MOUNTED', 'PORTABLE_IR_NOT_MOUNTED');
  return mount.claimBoundary;
});

check('07 sovereign contact remains explicit, bounded and non-persistent', () => {
  expect(mount.claimBoundary.directSovereignExecution === 'MOUNTED_SELECTED_ADAPTERS_SESSION_TRANSIENT', 'DIRECT_EXECUTION_BOUNDARY_DRIFT');
  expect(mount.claimBoundary.persistedSovereignGrants === 'NOT_MOUNTED', 'SESSION_GRANT_FALSE_PERSISTENCE');
  expect(mount.claimBoundary.oneContainerKernelContact === 'NOT_YET_MOUNTED', 'KERNEL_FALSE_GREEN');
  expect(mount.claimBoundary.semanticCrown === 'NOT_CLAIMED', 'CROWN_INFLATION');
  return mount.claimBoundary;
});

check('08 front-door and recovery laws remain intact', () => {
  for (const law of [
    'PEA_BEFORE_GALAXY',
    'NATURAL_LANGUAGE_FRONT_DOOR',
    'MARK_NOT_MEANING',
    'UNKNOWN_NOT_GUESSED',
    'AND_TWO_SIDED_CUSTODY',
    'PREVIEW_NOT_COMMIT',
    'REPLAY_RECOVERY',
    'SESSION_GRANT_NOT_PERSISTENCE',
    'EXPLICIT_OPERATOR_CUSTODY',
    'CLASSIFICATION_NOT_LINEAGE_DELETION',
    'NO_SUPREME_BODY'
  ]) expect(mount.laws.includes(law), `MISSING_LAW:${law}`);
  expect(mount.surface.frontDoorLaw === 'NATURAL_LANGUAGE_FRONT_DOOR', 'FRONT_DOOR_MOVED');
  expect(mount.surface.recoveryLaw === 'REPLAY_LEDGER_NOT_OPAQUE_STATE_INJECTION', 'RECOVERY_LAW_MOVED');
  return mount.laws;
});

check('09 current body is classified under Apps/Tools, not Games', () => {
  expect(mount.classification.primaryProject === 'APPS_TOOLS', 'PRIMARY_PROJECT_NOT_APPS_TOOLS');
  expect(mount.classification.primaryCategory === 'TOOL', 'PRIMARY_CATEGORY_NOT_TOOL');
  expect(mount.classification.workingType === 'CREATOR_WORKSPACE_MANAGEMENT_ORCHESTRATION_OPERATIONAL_INTERFACE', 'WORKING_TYPE_DRIFT');
  expect(mount.classification.gamePrimaryClassification === false, 'FALSE_GAME_PRIMARY_CLASSIFICATION');
  expect(mount.classification.gameRelationship === 'DOWNSTREAM_TARGET_AND_INTERACTION_LINEAGE_ONLY', 'GAME_RELATIONSHIP_DRIFT');
  expect(mount.classification.classificationLaw === 'CLASSIFICATION_NOT_LINEAGE_DELETION', 'CLASSIFICATION_LAW_DRIFT');
  return mount.classification;
});

const failed = checks.filter(item => !item.passed);
const receipt = {
  schema: 'jm.natural-operational-language.provisional-mount-proof/2.0',
  status: failed.length ? 'FAIL' : 'PASS',
  passed: checks.length - failed.length,
  failed: failed.length,
  mount: mount.id,
  classification: mount.classification,
  freezeHead: mount.authority.freezeHead,
  canonicalRegistryCount: bodies.length,
  checks
};

console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
