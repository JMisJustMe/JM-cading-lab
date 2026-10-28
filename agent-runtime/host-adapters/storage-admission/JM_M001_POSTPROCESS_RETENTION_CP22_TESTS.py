#!/usr/bin/env python3
"""JM M001 CP22 synthetic non-regression tests; no private Estate media."""
import copy
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from JM_M001_POSTPROCESS_RETENTION_CP22 import compile_manifest, SCHEMA

H = hashlib.sha256(b'synthetic').hexdigest()

def row(identity, *, purpose='process_trace', uses=None, complete=True):
    return {'carrier_id': identity, 'body_id': 'JM.SUIT', 'version': 'v1',
            'event_id': 'E001', 'event_summary': 'Synthetic inspection recorded',
            'kind': 'image', 'purpose': purpose, 'bytes': 2048, 'sha256': H,
            'separate_uses': uses or [], 'extracted_facts': ['UI overflow observed'],
            'proof_refs': ['test:trace001'], 'recovery_refs': ['test:cold001'],
            'extraction_complete': complete, 'structured_custody_verified': True,
            'use_review': 'affirmatively_cleared'}

checks = {}
def check(name, ok):
    checks[name] = bool(ok)
    if not ok:
        raise AssertionError(name)

def valid(rows):
    return {'schema': 'JM.M001.PostprocessInput/1', 'records': rows}

x = compile_manifest(valid([row('A'), row('B')]))
check('compiles', x['schema'] == SCHEMA)
check('lineage_not_file_count', x['lineage_count'] == 1 and x['carrier_count'] == 2)
check('version_preserved', x['lineages'][0]['versions'] == ['v1'])
check('event_convergence_not_merger', len(x['same_event_byte_signals']) == 1 and
      x['same_event_byte_signals'][0]['identity_merge_authorised'] is False)
check('review_not_release', x['review_count'] == 2 and
      not x['retirement_authorised'] and x['native_mutations'] == 0 and
      x['quota_savings_claimed_bytes'] == 0)
check('candidate_not_savings', x['candidate_review_bytes_not_savings'] == 4096)
x2 = compile_manifest(valid([row('A', uses=['future world sprite']), row('B')]))
check('separate_reserved_use_kept', x2['carriers'][0]['decision'] == 'KEEP_SEPARATE_USE_OR_SOURCE')
check('same_bytes_does_not_override_role', x2['carriers'][0]['deletion_authorised'] is False)
check('creative_source_kept', compile_manifest(valid([row('A', purpose='creative_original')]))['review_count'] == 0)
check('incomplete_extract_holds', compile_manifest(valid([row('A', complete=False)]))['review_count'] == 0)
missing = row('A'); missing['recovery_refs'] = []
check('no_cold_route_holds', compile_manifest(valid([missing]))['review_count'] == 0)
missing = row('A'); missing['use_review'] = 'unknown'
check('unknown_uses_hold', compile_manifest(valid([missing]))['review_count'] == 0)
changed = row('B'); changed['version'] = 'v2'; changed['event_id'] = 'E002'
check('distinct_version_event_preserved', len(compile_manifest(valid([row('A'), changed]))['lineages'][0]['versions']) == 2)
for label, changed in [('duplicate_identity', [row('A'), row('A')]),
                       ('unknown_kind', [{**row('A'), 'kind': 'untrusted'}]),
                       ('bad_digest', [{**row('A'), 'sha256': '123'}]),
                       ('negative_bytes', [{**row('A'), 'bytes': -2}]),
                       ('boolean_bytes', [{**row('A'), 'bytes': True}])]:
    try:
        compile_manifest(valid(changed))
    except ValueError:
        check(label, True)
    else:
        check(label, False)
with tempfile.TemporaryDirectory() as temp:
    d = Path(temp)
    manifest = d / 'fixture.json'; manifest.write_text(json.dumps(valid([row('A')])))
    dst = d / 'compact.json'
    cmd = [sys.executable, str(Path(__file__).with_name('JM_M001_POSTPROCESS_RETENTION_CP22.py')),
           '--manifest', str(manifest), '--output', str(dst)]
    first = subprocess.run(cmd, capture_output=True)
    check('write_new_receipt', first.returncode == 0 and dst.is_file())
    old = dst.read_bytes()
    second = subprocess.run(cmd, capture_output=True)
    check('no_overwrite', second.returncode == 2 and dst.read_bytes() == old)
    check('readback_schema', json.loads(old)['schema'] == SCHEMA)
    symlink = d / 'alias.json'; symlink.symlink_to(manifest)
    denied = subprocess.run([sys.executable, cmd[1], '--manifest', str(symlink)], capture_output=True)
    check('symlink_input_refused', denied.returncode == 2)
print(json.dumps({'schema': 'JM.M001.CP22.Tests/1', 'pass': all(checks.values()),
                  'checks': len(checks), 'cases': checks}, indent=2, sort_keys=True))
