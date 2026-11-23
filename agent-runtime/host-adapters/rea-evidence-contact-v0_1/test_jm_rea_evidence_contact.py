import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from jm_rea_evidence_contact import ContactError, load_source, main, project

EV1 = 'ev_' + 'a'*64
EV2 = 'ev_' + 'b'*64
UK1 = 'unk_' + 'c'*64


def record(evid, links=None):
    return {
        'evidence_id': evid, 'provider': {'id': 'synthetic', 'name': 'Synthetic', 'version': '0'},
        'subject': {'digest': {'sha256': 'f'*64}, 'format': 'apk', 'name': '/private/path.apk'},
        'predicate_type': 'synthetic.fixture', 'operation': 'fixture',
        'confidence': 'derived', 'authority': 'historical-reference',
        'evidence_links': links or [], 'limitations': ['test only'],
        'locations': [{'kind': 'artifact-path', 'path': '/sensitive/sample.apk'}],
        'raw_result': {'secret': 'DO_NOT_COPY'},
        'normalized_result': {'secret': 'DO_NOT_COPY'},
    }


def bundle():
    return {
        'artifacts': [], 'providers': [], 'environments': [], 'scenarios': [], 'captures': [],
        'records': [record(EV1), record(EV2, [EV1])],
        'unknowns': [{'unknown_id': UK1, 'revision': 1, 'status': 'open', 'severity': 'high',
                     'question': 'What is behavior?', 'supporting_evidence_ids': [EV1],
                     'contradicting_evidence_ids': [], 'mutation_evidence_ids': [EV2]}],
    }


class ContactTests(unittest.TestCase):
    def test_valid_projection_redacts_secrets_and_locations(self):
        r = project(bundle(), '1'*64, 100)
        s = json.dumps(r)
        self.assertEqual(r['record_count'], 2)
        self.assertEqual(r['unknown_count'], 1)
        self.assertEqual(r['state'], 'EXTRACTED_UNVERIFIED')
        self.assertFalse(r['proof_boundary']['jm_executable_contact'])
        self.assertNotIn('DO_NOT_COPY', s)
        self.assertNotIn('/sensitive/', s)
        self.assertEqual(r['records'][0]['location_kinds'], ['artifact-path'])

    def test_optional_location_details(self):
        self.assertIn('/sensitive/', json.dumps(project(bundle(), '1'*64, 100, include_locations=True)))

    def test_snapshot_supported(self):
        r = project({'target': {}, 'binding': {}, 'evidence_bundle': bundle()}, '1'*64, 100)
        self.assertEqual(r['source']['kind'], 'rea-analysis-snapshot')

    def test_duplicate_records_rejected(self):
        b = bundle(); b['records'].append(record(EV1))
        with self.assertRaisesRegex(ContactError, 'duplicate evidence_id'):
            project(b, '1'*64, 100)

    def test_dangling_evidence_links_rejected(self):
        b = bundle(); b['records'][1]['evidence_links'] = ['ev_'+'d'*64]
        with self.assertRaisesRegex(ContactError, 'unknown evidence link'):
            project(b, '1'*64, 100)

    def test_missing_unk_mutation_reference_rejected(self):
        b = bundle(); b['unknowns'][0]['mutation_evidence_ids'] = ['ev_'+'d'*64]
        with self.assertRaisesRegex(ContactError, 'references missing'):
            project(b, '1'*64, 100)

    def test_unknown_history_gaps_rejected(self):
        b = bundle(); b['unknowns'][0]['revision'] = 2
        with self.assertRaisesRegex(ContactError, 'history has gaps'):
            project(b, '1'*64, 100)

    def test_output_never_overwritten_and_input_untouched(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t)/'rea.json'; out = Path(t)/'jm.json'
            inp.write_text(json.dumps(bundle()), encoding='utf-8')
            digest = hashlib.sha256(inp.read_bytes()).hexdigest()
            self.assertEqual(main([str(inp), str(out), '--expect-input-sha256', digest]), 0)
            original = out.read_bytes()
            self.assertEqual(main([str(inp), str(out)]), 2)
            self.assertEqual(out.read_bytes(), original)
            self.assertEqual(hashlib.sha256(inp.read_bytes()).hexdigest(), digest)

    def test_bad_sha_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t)/'rea.json'; out = Path(t)/'jm.json'
            inp.write_text(json.dumps(bundle()))
            self.assertEqual(main([str(inp),str(out),'--expect-input-sha256','0'*64]), 2)
            self.assertFalse(out.exists())

    def test_symlink_input_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t)/'rea.json'; link = Path(t)/'link.json'
            inp.write_text(json.dumps(bundle()))
            link.symlink_to(inp)
            with self.assertRaises(OSError):
                load_source(link)

    def test_duplicate_json_keys_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t)/'rea.json'
            inp.write_text('{"records":[],"records":[],"unknowns":[]}')
            with self.assertRaisesRegex(ContactError, 'duplicate JSON key'):
                load_source(inp)


if __name__ == '__main__':
    unittest.main()