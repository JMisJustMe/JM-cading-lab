import fs from 'node:fs';

const readJson = url => JSON.parse(fs.readFileSync(url, 'utf8'));
const mount = readJson(new URL('../integration/mounts/natural-operational-language-bounce-v0.1.json', import.meta.url));
const registryManifest = readJson(new URL('../integration/REGISTRY.json', import.meta.url));
const bodies = registryManifest.parts.flatMap(part => readJson(new URL(`../integration/${part}`, import.meta.url)).bodies);
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

check('02 mount does not mutate canonical registry', () => {
  expect(mount.canonicalRegistryMutation === false, 'CANONICAL_REGISTRY_MUTATION_NOT_FALSE');
  expect(!byId.has(mount.id), 'MOUNT_INFLATED_INTO_CANONICAL_100');
  return { externalSurface: mount.id };
});

check('03 freeze and anchor are declared commit-identical', () => {
  expect(mount.authority.anchorCommitIdenticalToFreeze === true, 'ANCHOR_FREEZE_IDENTITY_NOT_LOCKED');
  expect(mount.authority.freezeHead === 'b9b9127fc37e504f1d3b9b7cdbaa94d2b605eb7d', 'FREEZE_HEAD_CHANGED');
  return { freezeHead: mount.authority.freezeHead };
});

check('04 required sovereign donor/support bodies exist', () => {
  const missing = mount.mountedAgainst.requiredBodies.filter(id => !byId.has(id));
  expect(missing.length === 0, `MISSING_REQUIRED_BODIES:${missing.join(',')}`);
  return mount.mountedAgainst.requiredBodies.map(id => ({ id, name: byId.get(id).name }));
});

check('05 natural-language creator surface exists', () => {
  const files = [
    './00_OPEN_FIRST.html',
    './bounce-spine.mjs',
    './estate-route-adapter.mjs',
    './FREEZE_LOCK_ANCHOR_v0.1.md'
  ];
  const missing = files.filter(file => !fs.existsSync(new URL(file, import.meta.url)));
  expect(missing.length === 0, `MISSING_SURFACE_FILES:${missing.join(',')}`);
  return files;
});

check('06 mount remains provisional and non-crowned', () => {
  expect(mount.status === 'PROVISIONAL_MOUNT', `STATUS_${mount.status}`);
  expect(mount.mountPrematurityAcknowledged === true, 'PREMATURITY_NOT_RECORDED');
  expect(mount.supreme === false, 'SUPREMACY_FOUND');
  expect(mount.claimBoundary.semanticCrown === 'NOT_CLAIMED', 'CROWN_INFLATION');
  expect(mount.claimBoundary.directSovereignExecution === 'NOT_YET_MOUNTED', 'DIRECT_EXECUTION_FALSE_GREEN');
  return mount.claimBoundary;
});

check('07 front door law remains natural-language first', () => {
  expect(mount.surface.frontDoorLaw === 'NATURAL_LANGUAGE_FRONT_DOOR', 'FRONT_DOOR_MOVED');
  expect(mount.laws.includes('PEA_BEFORE_GALAXY'), 'PEA_LAW_MISSING');
  expect(mount.laws.includes('MARK_NOT_MEANING'), 'MARK_MEANING_BOUNDARY_MISSING');
  expect(mount.laws.includes('UNKNOWN_NOT_GUESSED'), 'UNKNOWN_GUESS_BOUNDARY_MISSING');
  expect(mount.laws.includes('EXPLICIT_OPERATOR_CUSTODY'), 'OPERATOR_CUSTODY_MISSING');
  return mount.laws;
});

const failed = checks.filter(item => !item.passed);
const receipt = {
  schema: 'jm.natural-operational-language.provisional-mount-proof/1.0',
  status: failed.length ? 'FAIL' : 'PASS',
  passed: checks.length - failed.length,
  failed: failed.length,
  mount: mount.id,
  freezeHead: mount.authority.freezeHead,
  canonicalRegistryCount: bodies.length,
  checks
};

console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
