#!/usr/bin/env python3
"""Offline, read-only REA Evidence -> JM TraceBox contact *candidate*.

External REA records are untrusted claims. This does not authenticate REA's
canonical digests, execute REA, inspect target bytes, or award host/owner Ding.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys

SCHEMA = 'jm.tracebox.rea-evidence-contact.v0.1'
EVIDENCE_ID = re.compile(r'^ev_[0-9a-f]{64}$')
UNKNOWN_ID = re.compile(r'^unk_[0-9a-f]{64}$')
SHA256 = re.compile(r'^[0-9a-f]{64}$')
MAX_INPUT = 16 * 1024 * 1024


class ContactError(ValueError):
    pass


def _required_object(value, context):
    if not isinstance(value, dict):
        raise ContactError(f'{context} must be an object')
    return value


def _required_list(value, context):
    if not isinstance(value, list):
        raise ContactError(f'{context} must be an array')
    return value


def _id(value, regex, context):
    if not isinstance(value, str) or not regex.fullmatch(value):
        raise ContactError(f'{context} has an invalid identifier')
    return value


def _no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ContactError(f'duplicate JSON key: {key}')
        result[key] = value
    return result


def load_source(path: Path) -> tuple[dict, str, int]:
    # No follow: prevent silently reading another source via a symlink.
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0)
    fd = os.open(path, flags)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise ContactError('input must be a regular file')
        if info.st_size > MAX_INPUT:
            raise ContactError('input exceeds 16 MiB safety limit')
        with os.fdopen(fd, 'rb', closefd=False) as f:
            raw = f.read(MAX_INPUT + 1)
        if len(raw) > MAX_INPUT:
            raise ContactError('input exceeds 16 MiB safety limit')
    finally:
        os.close(fd)
    try:
        obj = json.loads(raw.decode('utf-8'), object_pairs_hook=_no_duplicate_keys,
                         parse_constant=lambda s: (_ for _ in ()).throw(ContactError(f'non-JSON constant: {s}')))
    except (ValueError, UnicodeError) as exc:
        raise ContactError(f'invalid JSON input: {exc}') from exc
    return _required_object(obj, 'input'), hashlib.sha256(raw).hexdigest(), len(raw)


def project(data: dict, source_digest: str, nbytes: int, *, include_locations: bool = False) -> dict:
    if 'evidence_bundle' in data:
        origin = 'rea-analysis-snapshot' if 'target' in data and 'binding' in data else 'rea-evidence-wrapper'
        bundle = _required_object(data['evidence_bundle'], 'evidence_bundle')
    else:
        origin = 'rea-evidence-bundle'
        bundle = data
    records = _required_list(bundle.get('records'), 'records')
    unknowns = _required_list(bundle.get('unknowns'), 'unknowns')
    trace_records = []
    seen = set()
    for i, rec in enumerate(records):
        rec = _required_object(rec, f'records[{i}]')
        evid = _id(rec.get('evidence_id'), EVIDENCE_ID, f'records[{i}].evidence_id')
        if evid in seen:
            raise ContactError('duplicate evidence_id')
        seen.add(evid)
        provider = _required_object(rec.get('provider'), f'records[{i}].provider')
        for key in ('id', 'name'):
            if not isinstance(provider.get(key), str) or not provider[key]:
                raise ContactError(f'records[{i}].provider.{key} missing')
        subject = rec.get('subject')
        if subject is not None:
            subject = _required_object(subject, f'records[{i}].subject')
            digest = _required_object(subject.get('digest'), f'records[{i}].subject.digest')
            _id(digest.get('sha256'), SHA256, f'records[{i}].subject.digest.sha256')
        confidence, authority = rec.get('confidence'), rec.get('authority')
        if confidence not in ('observed', 'derived', 'inferred'):
            raise ContactError(f'records[{i}].confidence invalid')
        if authority not in ('shipped-artifact', 'controlled-replay', 'historical-reference',
                             'external-service', 'analyst-inference'):
            raise ContactError(f'records[{i}].authority invalid')
        links = _required_list(rec.get('evidence_links'), f'records[{i}].evidence_links')
        for ref in links:
            _id(ref, EVIDENCE_ID, f'records[{i}].evidence_links')
        limitations = _required_list(rec.get('limitations'), f'records[{i}].limitations')
        locations = _required_list(rec.get('locations'), f'records[{i}].locations')
        for loc in locations:
            _required_object(loc, f'records[{i}].locations[]')
        trace_records.append({
            'source_evidence_id': evid,
            'source_subject': ({'sha256': subject['digest']['sha256'],
                                'format': subject.get('format', 'unknown')}
                               if subject is not None else None),
            'source_provider': {'id': provider['id'], 'name': provider['name'],
                                'version': provider.get('version')},
            'predicate_type': rec.get('predicate_type'),
            'operation': rec.get('operation'),
            'source_confidence_claim': confidence,
            'source_authority_claim': authority,
            'limitations': limitations,
            'source_evidence_links': links,
            'location_kinds': [loc.get('kind') for loc in locations],
            **({'source_locations': locations} if include_locations else {}),
            'jm_contact_state': 'UNVERIFIED_SOURCE_CLAIM',
        })
    for rec in trace_records:
        missing = set(rec['source_evidence_links']) - seen
        if missing:
            raise ContactError(f'unknown evidence link(s): {sorted(missing)}')
    unknown_history: dict[str, list[dict]] = {}
    unknown_keys = set()
    for i, item in enumerate(unknowns):
        u = _required_object(item, f'unknowns[{i}]')
        uid = _id(u.get('unknown_id'), UNKNOWN_ID, f'unknowns[{i}].unknown_id')
        revision = u.get('revision')
        if type(revision) is not int or revision < 1:
            raise ContactError(f'unknowns[{i}].revision invalid')
        if (uid, revision) in unknown_keys:
            raise ContactError('duplicate unknown revision')
        unknown_keys.add((uid, revision))
        for key in ('supporting_evidence_ids', 'contradicting_evidence_ids', 'mutation_evidence_ids'):
            references = _required_list(u.get(key), f'unknowns[{i}].{key}')
            for ref in references:
                if _id(ref, EVIDENCE_ID, key) not in seen:
                    raise ContactError(f'{key} references missing Evidence record')
        unknown_history.setdefault(uid, []).append(u)
    projected_unknowns = []
    for uid, versions in sorted(unknown_history.items()):
        versions.sort(key=lambda x: x['revision'])
        if [v['revision'] for v in versions] != list(range(1, len(versions)+1)):
            raise ContactError('unknown revision history has gaps')
        last = versions[-1]
        projected_unknowns.append({
            'source_unknown_id': uid,
            'revisions_retained': len(versions),
            'source_latest_state': last.get('status'),
            'source_severity': last.get('severity'),
            'source_question': last.get('question'),
            'jm_contact_state': 'UNVERIFIED_SOURCE_QUESTION',
        })
    trace_records.sort(key=lambda x: x['source_evidence_id'])
    return {
        'schema': SCHEMA,
        'state': 'EXTRACTED_UNVERIFIED',
        'source': {'kind': origin, 'file_sha256': source_digest, 'byte_count': nbytes,
                   'rea_validation': 'NOT_PERFORMED', 'target_runtime_contact': 'NOT_PERFORMED'},
        'route': ['EXTERNAL_REA_EVIDENCE', 'READ_ONLY_IMPORT', 'JM_TRACEBOX_CANDIDATE',
                  'AUTHORITY_REVIEW_PENDING'],
        'record_count': len(trace_records),
        'unknown_count': len(projected_unknowns),
        'records': trace_records,
        'unknowns': projected_unknowns,
        'proof_boundary': {
            'source_evidence_ids_cryptographically_authenticated': False,
            'rea_bundle_integrity_verified_by_rea': False,
            'jm_executable_contact': False,
            'jm_host_contact': False,
            'owner_device_contact': False,
            'integration_promoted': False,
        },
        'security': 'Metadata projection only. raw_result and normalized_result never copied. Original input untouched.',
    }


def write_once(path: Path, data: dict) -> None:
    payload = (json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False)+'\n').encode('utf-8')
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0)
    fd = os.open(path, flags, 0o600)
    try:
        with os.fdopen(fd, 'wb', closefd=False) as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    finally:
        os.close(fd)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='REA evidence-export JSON or analysis snapshot JSON')
    parser.add_argument('output', type=Path, help='NEW local JSON TraceBox candidate (never overwritten)')
    parser.add_argument('--expect-input-sha256', help='fail unless source bytes match this SHA-256')
    parser.add_argument('--include-locations', action='store_true', help='include potentially sensitive source paths / offsets in output')
    args = parser.parse_args(argv)
    try:
        source, sha, size = load_source(args.input)
        if args.expect_input_sha256 and (not SHA256.fullmatch(args.expect_input_sha256) or sha != args.expect_input_sha256):
            raise ContactError('input sha256 mismatch')
        report = project(source, sha, size, include_locations=args.include_locations)
        write_once(args.output, report)
    except (ContactError, OSError, TypeError) as exc:
        print(f'HOLD: {exc}', file=sys.stderr)
        return 2
    print(f'EXTRACTED_UNVERIFIED: records={report["record_count"]} unknowns={report["unknown_count"]} output={args.output}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())