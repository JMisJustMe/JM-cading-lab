"""Admission consequences on actual public JM bytes; no private CI inputs."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


production = load('production', 'agent-runtime/host-adapters/storage-admission/jm_m001_production_admission.py')
closure = load('closure', 'scripts/jm_build_closure.py')
packager = load('packager', 'scripts/jm_package_advanced_generator.py')
KEEPER = ROOT / 'games-beyond/downloads/JM_ADVANCED_GAME_GENERATOR_PLAYABLE_PROOF_PACK_v0_2.zip'


class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.a, self.b = self.root / 'candidate.zip', self.root / 'keeper.zip'
        shutil.copyfile(KEEPER, self.a)
        shutil.copyfile(KEEPER, self.b)
        self.saved_registry = production.ROLE_REGISTRY

    def tearDown(self):
        production.ROLE_REGISTRY = self.saved_registry
        self.tmp.cleanup()

    def distinct(self):
        with zipfile.ZipFile(self.a, 'a') as z:
            z.writestr('TEST_ONLY_DISTINCTNESS.txt', 'explicit test descendant; no product promotion')

    def ledger(self):
        ex = self.root / 'execution.json'
        ex.write_text(json.dumps({'schema': 'jm.build-execution/0.1', 'state': 'CLOSED',
            'closure': {'execution_closed': True}, 'gates': {}, 'created_for': {}}))
        return closure.init_ledger(ex, closure.load_policy())

    def test_duplicate_cannot_add_carrier(self):
        r = production.check(self.a, self.b)
        self.assertEqual(r['production_decision'], 'REUSE_EXISTING')
        self.assertFalse(r['additional_carrier_allowed'])
        with self.assertRaises(ValueError): closure.check_package_admission(self.a, self.b)

    def test_no_arguments_cannot_bypass_api(self):
        ledger = self.ledger()
        with self.assertRaises(ValueError):
            closure.update_stage(ledger, closure.load_policy(), 'PACKAGE', 'PASS', ['external:proof'], '', '', '')
        self.assertEqual(ledger['stages']['PACKAGE']['state'], 'OPEN')
        self.assertEqual(len(ledger['history']), 1)

    def test_distinct_preserves_separate_evidence(self):
        self.distinct()
        self.assertEqual(production.check(self.a, self.b)['production_decision'], 'ADMIT_DISTINCT')
        with self.assertRaises(ValueError):
            closure.update_stage(self.ledger(), closure.load_policy(), 'PACKAGE', 'PASS', [], '', '', '', self.a, self.b)
        r = closure.update_stage(self.ledger(), closure.load_policy(), 'PACKAGE', 'PASS', ['external:proof'], '', '', '', self.a, self.b)
        self.assertEqual(r['stages']['FREEZE']['state'], 'OPEN')

    def test_legitimate_distinct_public_JM_package(self):
        # Actual preserved KICSHIFT deployable source, not modified game code.
        body = ROOT / 'games-beyond/kicshift'
        with zipfile.ZipFile(self.a, 'w') as z:
            for p in sorted(body.rglob('*')):
                if p.is_file(): z.write(p, p.relative_to(body))
        r = production.check(self.a, self.b)
        self.assertEqual(r['production_decision'], 'ADMIT_DISTINCT')
        self.assertTrue(r['additional_carrier_allowed'])
        self.assertFalse(r['admission_authorised'])  # normal source/role review still applies

    def test_protected_keeper_reuse_preserves_bytes(self):
        before = self.b.read_bytes()
        r = closure.update_stage(self.ledger(), closure.load_policy(), 'PACKAGE', 'PASS',
                                 ['external:retained-keeper-role'], '', '', '', self.a, self.b, True)
        self.assertFalse(r['stages']['PACKAGE']['carrier_admission']['additional_carrier_allowed'])
        self.assertEqual(before, self.b.read_bytes())

    def test_unknown_role_is_not_a_bypass(self):
        with self.assertRaises(ValueError): production.check(self.a, self.b, 'unapproved')

    def role_fixture(self):
        # Test authority only. The production registry remains empty; no real
        # owner approval or protected-carrier role transfer is manufactured.
        evidence = ROOT / 'registry/build-routes/JM_BUILD_CLOSURE_POLICY_v0.1.json'
        sha = hashlib.sha256(self.a.read_bytes()).hexdigest()
        role = {'state': 'APPROVED', 'candidate_sha256': sha, 'keeper_sha256': sha,
                'candidate_role': 'TEST protected recovery copy', 'keeper_role': 'TEST direct delivery',
                'reason': 'TEST separate responsibility', 'evidence_path': str(evidence.relative_to(ROOT)),
                'evidence_sha256': hashlib.sha256(evidence.read_bytes()).hexdigest()}
        path = self.root / 'test-authority.json'
        path.write_text(json.dumps({'schema': 'JM.M001.ApprovedCarrierRoles/0.1', 'roles': {'test-role': role}}))
        production.ROLE_REGISTRY = path
        return path

    def test_pinned_separate_role_retains_justified_carrier(self):
        self.role_fixture()
        r = production.check(self.a, self.b, 'test-role')
        self.assertEqual(r['production_decision'], 'ADMIT_DISTINCT_ROLE')
        self.assertTrue(r['additional_carrier_allowed'])
        self.assertFalse(r['retirement_authorised'])

    def test_role_evidence_recovery_failure_holds(self):
        path = self.role_fixture()
        r = json.loads(path.read_text());r['roles']['test-role']['evidence_sha256'] = '0' * 64
        path.write_text(json.dumps(r))
        with self.assertRaises(ValueError): production.check(self.a, self.b, 'test-role')

    def test_role_byte_mismatch_holds(self):
        self.role_fixture(); self.distinct()
        with self.assertRaises(ValueError): production.check(self.a, self.b, 'test-role')

    def test_missing_recovery_holds(self):
        self.b.unlink()
        with self.assertRaises(ValueError): production.check(self.a, self.b)

    def test_corrupt_recovery_holds(self):
        self.b.write_bytes(self.b.read_bytes()[:-30])
        with self.assertRaises(ValueError): production.check(self.a, self.b)

    def test_no_package_flow_unchanged(self):
        r = closure.update_stage(self.ledger(), closure.load_policy(), 'PACKAGE', 'N/A', [], 'No package required', '', '')
        self.assertEqual(r['stages']['PACKAGE']['state'], 'N/A')

    def stage(self):
        stage = self.root / 'source'; stage.mkdir()
        with zipfile.ZipFile(self.b) as z:
            prefix = z.namelist()[0].split('/')[0] + '/'
            for i in z.infolist():
                if i.is_dir(): continue
                target = stage / i.filename.removeprefix(prefix)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(i))
        return stage

    def test_real_package_unchanged_reuses_without_metadata_churn(self):
        # Preserve actual producer's archive prefix.
        archive = self.root / KEEPER.name; shutil.copyfile(KEEPER, archive)
        before = archive.read_bytes()
        r = packager.package(self.stage(), archive)
        self.assertFalse(r['additional_carrier_allowed'])
        self.assertEqual(before, archive.read_bytes())
        self.assertFalse(archive.with_suffix('.run.json').exists())

    def test_real_source_descendant_and_repeat(self):
        archive = self.root / KEEPER.name; shutil.copyfile(KEEPER, archive)
        stage = self.stage(); (stage / 'TEST_ONLY_DISTINCTNESS.txt').write_text('test descendant')
        first = packager.package(stage, archive)
        self.assertTrue(first['additional_carrier_allowed'])
        before = archive.read_bytes()
        second = packager.package(stage, archive)
        self.assertFalse(second['additional_carrier_allowed'])
        self.assertEqual(before, archive.read_bytes())

    def test_packager_recovery_failure_does_not_overwrite(self):
        stage = self.stage(); self.b.write_bytes(b'corrupt recovery')
        before = self.b.read_bytes()
        with self.assertRaises(ValueError): packager.package(stage, self.b)
        self.assertEqual(before, self.b.read_bytes())


if __name__ == '__main__':
    unittest.main()
