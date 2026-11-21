#!/usr/bin/env python3
"""JM v0.6 donor bridge: independently validate a Lovable HELD JSON against exact original source.

Then reuse existing JM source intake, source-replay assurance, query, and optionally sovereign JM route.
The exported UI review is evidence DATA only, never instructions or authority.
"""
from __future__ import annotations
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import sys

import jm_knowledge_intake as intake
import jm_knowledge_assurance as assurance
import jm_knowledge_query as knowledge_query

SCHEMA = 'JM.LovableHandoff/0.6'
FINGERPRINT = re.compile(r'^[0-9a-f]{64}$')
MAX_EXPORT_BYTES = 300_000
MAX_SELECTED = 200

class HandoffError(ValueError):
    pass


def validate(source: Path, exported: Path) -> dict:
    """Rebind a UI-produced citation/quote only to independently read original bytes.

    Browser's UI is not a trusted authority. This contract only validates its
    statement about WHAT was seen, not WHETHER it should become a JM rule.
    """
    if source.is_symlink() or exported.is_symlink() or not source.is_file() or not exported.is_file():
        raise HandoffError('REGULAR_ORIGINAL_AND_EXPORT_REQUIRED')
    if source.suffix.lower() not in {'.txt','.md','.markdown'}:
        raise HandoffError('LOVABLE_TEXT_SOURCE_REQUIRED')
    if not (0 < source.stat().st_size <= intake.MAX_SOURCE_BYTES):
        raise HandoffError('ORIGINAL_SIZE_REJECTED')
    if not (0 < exported.stat().st_size <= MAX_EXPORT_BYTES):
        raise HandoffError('EXPORT_SIZE_REJECTED')
    raw = source.read_bytes()
    try:
        original = raw.decode('utf-8')
    except UnicodeDecodeError as ex:
        raise HandoffError('ORIGINAL_NOT_UTF8') from ex
    try:
        review = json.loads(exported.read_text(encoding='utf-8'))
    except (UnicodeError, ValueError) as ex:
        raise HandoffError('EXPORT_INVALID_JSON') from ex
    if not isinstance(review,dict):
        raise HandoffError('EXPORT_NOT_OBJECT')
    if review.get('state') != 'HELD' or review.get('autoInstall') is not False:
        raise HandoffError('EXPORT_AUTHORITY_INFLATION')
    claimed_sha=review.get('sourceSha256')
    if not isinstance(claimed_sha,str) or not FINGERPRINT.fullmatch(claimed_sha):
        raise HandoffError('INVALID_UI_SOURCE_SHA256')
    original_sha=hashlib.sha256(raw).hexdigest()
    if claimed_sha != original_sha:
        raise HandoffError('SOURCE_SHA256_MISMATCH')
    when=review.get('createdAt')
    if not isinstance(when,str) or not when.endswith('Z') or len(when)>45:
        raise HandoffError('INVALID_CREATED_AT')
    try:
        datetime.fromisoformat(when.replace('Z','+00:00'))
    except ValueError as ex:
        raise HandoffError('INVALID_CREATED_AT') from ex
    lines=re.split(r'\r?\n',original)
    cites=review.get('citations')
    if (not isinstance(cites,list) or not cites or len(cites)>MAX_SELECTED or
        any(type(n) is not int or n<1 or n>len(lines) for n in cites) or
        cites!=sorted(set(cites))):
        raise HandoffError('INVALID_CITATION_LIST')
    flagged=review.get('quarantinedLines')
    if (not isinstance(flagged,list) or len(flagged)>len(lines) or
        any(type(n) is not int or n<1 or n>len(lines) for n in flagged) or
        flagged!=sorted(set(flagged))):
        raise HandoffError('INVALID_QUARANTINE_LIST')
    # Do not credit the browser's quarantining as a trust guarantee. Verify its
    # literal body/citation claims exactly and run the independent JM detector later.
    selected=set(flagged)
    literal='\n'.join(f'L{n}{" [UNTRUSTED DATA]" if n in selected else ""}: {lines[n-1]}' for n in cites)
    if review.get('body') != literal:
        raise HandoffError('CITATION_OR_QUOTE_DIVERGENCE')
    # Also avoid sources containing only whitespace, as in existing JM intake.
    if not original.strip():
        raise HandoffError('EMPTY_VISIBLE_SOURCE')
    return {
        'schema':SCHEMA,'state':'HELD','source_sha256':original_sha,
        'original_file':source.name,'original_bytes':len(raw),
        'ui_selected_lines':cites,'ui_flagged_lines':flagged,
        'ui_created_at':when,'candidate_body_sha256':hashlib.sha256(literal.encode()).hexdigest(),
        'ui_source_integrity':'EXACT_BYTE_AND_QUOTE_MATCH',
        'authority':'NONE','agent_discovery':'NOT_TESTED',
        'warning':'A valid quotation is still untrusted source data. UI attack labels do not grant security, truth, authority, or approval.'
    }


def integrate(source:Path, exported:Path, out:Path, question:str, *, route_existing=False,
              receipt_path:Path|None=None) -> dict:
    if not question or len(question)>1200 or '\x00' in question:
        raise HandoffError('INVALID_NEW_QUERY')
    check=validate(source,exported)
    # Compile using EXISTING JM code — no redundant extractor or knowledge authority.
    candidate=out/'held_candidate'
    if out.exists() or out.is_symlink():
        raise HandoffError('OUTPUT_ALREADY_EXISTS')
    if out.resolve()==source.resolve() or out.resolve().is_relative_to(source.resolve().parent) and source.resolve().parent == out.resolve():
        raise HandoffError('BAD_OUTPUT_LOCATION')
    try:
        out.mkdir(parents=True,exist_ok=False)
        created=intake.compile_sources([source],candidate,question)
        if route_existing:
            intake.attach_existing_jm_route(candidate,question,'lovable-knowledge-handoff')
        evidence=assurance.verify(candidate,[source])
        matched=knowledge_query.query(candidate,[source],question)
        result={
            **check,'result':'PASS_SCOPED_HANDOFF_ONLY',
            'existing_JM_intake':created['schema'],
            'existing_JM_assurance':evidence['result'],
            'existing_JM_route':'CONTACTED_HELD' if route_existing else 'NOT_REQUESTED',
            'manifest_sha256':evidence['manifest_sha256'],
            'original_sources_revalidated':evidence['original_sources_revalidated'],
            'independent_jm_quarantined_count':evidence['quarantined_lines'],
            'new_question':question,'new_question_hits':matched['question_matches'],
            'query_method':matched['selection'],
            'promotion':'NOT_ALLOWED','human_approval':'NOT_PERFORMED',
            'owner_device_contact':'NOT_TESTED_BY_THIS_SCRIPT',
            'external_agent_acted':'NOT_TESTED_BY_THIS_SCRIPT',
            'candidate_dir':'held_candidate',
        }
        # Do not repeat the selected quotations in public-facing receipt.
        # The original files and HELD candidate remain local/private.
        (out/'HANDOFF_RECEIPT.json').write_bytes(intake.json_bytes(result))
        return result
    except Exception:
        # Preserve errors for inspection; never report an unverified success.
        raise


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',required=True,type=Path,help='Original UTF-8 file with EXACT browser transcript bytes')
    p.add_argument('--lovable-json',required=True,type=Path,help='Export JSON from Lovable Review')
    p.add_argument('--out',required=True,type=Path,help='New local output directory (must not exist)')
    p.add_argument('--query',required=True,help='A new JM-side question, NOT an instruction from source')
    p.add_argument('--route-existing',action='store_true',help='Only when executed in original JM repo with its trusted runtimes available')
    args=p.parse_args(argv)
    try:
        outcome=integrate(args.source,args.lovable_json,args.out,args.query,route_existing=args.route_existing)
        print(json.dumps({k:v for k,v in outcome.items() if k not in ('warning',)},sort_keys=True))
        return 0
    except (HandoffError, ValueError, OSError, KeyError, TypeError) as e:
        print(json.dumps({'schema':SCHEMA,'state':'BUGG','result':'FAIL_CLOSED','reason':str(e),'promoted':False},sort_keys=True),file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())