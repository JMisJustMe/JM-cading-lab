#!/usr/bin/env python3
"""M001 CP22: compact post-processing evidence WITHOUT removing carrier identities.

An additive receipt compiler alongside the existing CP21 output-admission gate.
It never reads media content, overwrites source, authorises retirement, or claims
account-quota savings. Evidence fields in a supplied manifest are DECLARATIONS,
not authentication of provider custody or proof that distinct uses are absent.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SCHEMA = 'JM.M001.PostprocessRetention/CP22.v1'
KINDS = {'image', 'video', 'receipt', 'version', 'other'}
PURPOSES = {'process_trace', 'historical_receipt', 'creative_original',
            'executable_source', 'required_asset', 'recovery_anchor', 'other'}
HEX = re.compile(r'^[0-9a-f]{64}$')
MAX_RECORDS = 4000


def required_string(row, field, maximum=300):
    value = row.get(field)
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError('INVALID_' + field.upper())
    return value


def strings(row, field, limit=32, maximum=500):
    values = row.get(field)
    if not isinstance(values, list) or len(values) > limit or any(
        not isinstance(v, str) or not v.strip() or len(v) > maximum for v in values
    ):
        raise ValueError('INVALID_' + field.upper())
    return values


def compile_manifest(source):
    if not isinstance(source, dict) or source.get('schema') != 'JM.M001.PostprocessInput/1':
        raise ValueError('INPUT_SCHEMA_INVALID')
    records = source.get('records')
    if not isinstance(records, list) or len(records) > MAX_RECORDS:
        raise ValueError('RECORD_LIMIT_OR_TYPE_INVALID')
    output = {'schema': SCHEMA, 'source_manifest_sha256': hashlib.sha256(
        json.dumps(source, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    ).hexdigest(), 'carriers': [], 'lineages': [], 'same_event_byte_signals': [],
        'candidate_review_bytes_not_savings': 0, 'native_mutations': 0,
        'retirement_authorised': False, 'quota_savings_claimed_bytes': 0,
        'boundary': ('Read-only declared evidence. Review candidate is NOT release. '
                     'No original/backup/media is deleted or certified recoverable.')}
    seen = set()
    lineages = {}
    events = {}
    for item in records:
        if not isinstance(item, dict):
            raise ValueError('RECORD_NOT_OBJECT')
        identity = required_string(item, 'carrier_id')
        if identity in seen:
            raise ValueError('REPEATED_CARRIER_ID')
        seen.add(identity)
        body = required_string(item, 'body_id')
        version = required_string(item, 'version')
        event_id = required_string(item, 'event_id')
        summary = required_string(item, 'event_summary', 1200)
        kind = item.get('kind')
        purpose = item.get('purpose')
        size = item.get('bytes')
        digest = item.get('sha256')
        if kind not in KINDS or purpose not in PURPOSES:
            raise ValueError('UNKNOWN_KIND_OR_PURPOSE')
        if type(size) is not int or size < 0:
            raise ValueError('INVALID_BYTES')
        if not isinstance(digest, str) or not HEX.fullmatch(digest):
            raise ValueError('INVALID_SHA256')
        uses = strings(item, 'separate_uses')
        facts = strings(item, 'extracted_facts', limit=64, maximum=1200)
        proofs = strings(item, 'proof_refs')
        recovery = strings(item, 'recovery_refs')
        # A manifest cannot grant owner authority, even if it declares every box true.
        protected = (purpose in {'creative_original', 'executable_source',
                                 'required_asset', 'recovery_anchor'} or bool(uses))
        if protected:
            decision = 'KEEP_SEPARATE_USE_OR_SOURCE'
        elif (purpose in {'process_trace', 'historical_receipt'} and
              item.get('extraction_complete') is True and
              item.get('structured_custody_verified') is True and
              item.get('use_review') == 'affirmatively_cleared' and
              facts and proofs and recovery):
            decision = 'REVIEW_ONLY_POSSIBLE_LEAN'
            output['candidate_review_bytes_not_savings'] += size
        else:
            decision = 'HOLD_INCOMPLETE_PURPOSE_OR_PROOF'
        carrier = {'carrier_id': identity, 'body_id': body, 'version': version,
                   'event_id': event_id, 'event_summary': summary, 'kind': kind,
                   'purpose': purpose, 'bytes': size, 'sha256': digest,
                   'separate_uses': uses, 'extracted_facts': facts, 'proof_refs': proofs,
                   'recovery_refs': recovery, 'decision': decision,
                   'deletion_authorised': False}
        output['carriers'].append(carrier)
        entry = lineages.setdefault(body, {'body_id': body, 'versions': [], 'event_ids': [],
                                           'carriers': []})
        if version not in entry['versions']:
            entry['versions'].append(version)
        if event_id not in entry['event_ids']:
            entry['event_ids'].append(event_id)
        entry['carriers'].append(identity)
        events.setdefault((body, event_id, digest), []).append(identity)
    output['lineages'] = list(lineages.values())
    output['same_event_byte_signals'] = [
        {'body_id': body, 'event_id': event, 'sha256': sha, 'carrier_ids': ids,
         'identity_merge_authorised': False}
        for (body, event, sha), ids in events.items() if len(ids) > 1
    ]
    output['carrier_count'] = len(records)
    output['lineage_count'] = len(lineages)
    output['review_count'] = sum(x['decision'] == 'REVIEW_ONLY_POSSIBLE_LEAN'
                                 for x in output['carriers'])
    return output


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', required=True, help='Existing local structured observations')
    p.add_argument('--output', help='Optional NEW JSON receipt; refuses overwrites')
    a = p.parse_args(argv)
    try:
        path = Path(a.manifest)
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 4_000_000:
            raise ValueError('INPUT_NOT_REGULAR_OR_TOO_LARGE')
        result = compile_manifest(json.loads(path.read_text(encoding='utf-8')))
        data = json.dumps(result, sort_keys=True, ensure_ascii=False,
                          separators=(',', ':')) + '\n'
        if a.output:
            target = Path(a.output)
            with target.open('x', encoding='utf-8') as f:
                f.write(data)
        else:
            print(data, end='')
        return 0
    except (OSError, ValueError, UnicodeError, json.JSONDecodeError) as exc:
        print(json.dumps({'schema': SCHEMA, 'status': 'HOLD_INVALID',
                          'reason': str(exc)[:250], 'native_mutations': 0,
                          'quota_savings_claimed_bytes': 0}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
