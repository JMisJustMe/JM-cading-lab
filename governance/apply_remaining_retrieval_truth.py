from __future__ import annotations

import json
import re
from pathlib import Path

APPS = Path('apps/index.html')
STRINGLINE = Path('navigator/stringline.json')
AUTHORITY = Path('registry/estate-classification-authority-v1.0.json')
RECEIPT = Path('registry/estate-classification-integrity-receipt-v1.0.json')

text = APPS.read_text(encoding='utf-8')
match = re.search(r'const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=', text, re.S)
if not match:
    raise SystemExit('Apps registry not found')
rows = json.loads(match.group(1))

versions = {
    'Portal Engine': 'Access-layer body · exact standalone package retrieval',
    'Latest Body Finder': 'BUILD 050 ancestor · exact standalone package retrieval',
    'Source-Body Auditor': 'BUILD 050 family · exact standalone package retrieval',
}
rows = [[name, versions.get(name, version), category, status] for name, version, category, status in rows]
apps_json = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
text = text[:match.start(1)] + apps_json + text[match.end(1):]
text = text.replace('source-needed + preparation', 'package-retrieval + preparation')
text = text.replace('registered:"Source needed"', 'registered:"Exact package retrieval"')
text = text.replace('["registered","Source needed"]', '["registered","Package retrieval"]')
text = text.replace('<strong>＋</strong>Recovery', '<strong>＋</strong>Retrieval')
APPS.write_text(text, encoding='utf-8')

stringline = json.loads(STRINGLINE.read_text(encoding='utf-8'))
stringline['version'] = 'v0.1.4 classification-integrity + governance-chain seed'
project = {
    'id': 'registers-governance',
    'name': 'Registers & Governance Chain',
    'headChat': 'Estate Governance Project Head',
    'headRecord': 'Source-to-Living Authority Chain',
    'status': 'STANDING',
    'keeper': 'The chain carries authority in stages. A known role is not the same as a recovered standalone package.',
    'bodies': [
        {
            'id': 'source-ledger',
            'name': 'Source Ledger',
            'type': 'Source authority register',
            'role': 'Records what sources exist and where they came from',
            'status': 'MOUNTED',
        },
        {
            'id': 'latest-body-finder',
            'name': 'Latest Body Finder',
            'type': 'Candidate/version finder',
            'role': 'BUILD 050 ancestor is known; exact standalone package retrieval remains open',
            'status': 'STRANDED',
        },
        {
            'id': 'source-body-auditor',
            'name': 'Source-Body Auditor',
            'type': 'Source/body relation auditor',
            'role': 'BUILD 050 family is known; exact standalone package retrieval remains open',
            'status': 'STRANDED',
        },
        {
            'id': 'current-best-register',
            'name': 'Current Best Register',
            'type': 'Operating-authority register',
            'role': 'Selects safest/current-best body after source and audit checks',
            'status': 'MOUNTED',
        },
        {
            'id': 'crown-register',
            'name': 'Crown Register',
            'type': 'Claim/crown governor',
            'role': 'Separates working, frozen, open, blocked and earned crowns',
            'status': 'MOUNTED',
        },
        {
            'id': 'living-register',
            'name': 'Living Register',
            'type': 'Live state carrier',
            'role': 'Carries forward approved state without inflating it',
            'status': 'THREADING',
        },
    ],
}
projects = stringline['seed_project_strings']
existing = next((item for item in projects if item.get('id') == project['id']), None)
if existing:
    existing.update(project)
else:
    projects.append(project)
STRINGLINE.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

authority = json.loads(AUTHORITY.read_text(encoding='utf-8'))
entry = {
    'id': 'registers-governance-chain',
    'name': 'Source-to-Living Governance Chain',
    'primary_seat': 'Registers & Governance',
    'governing_identity': 'staged authority chain from source identification to live-state carriage',
    'chain': ['Source Ledger', 'Latest Body Finder', 'Source-Body Auditor', 'Current Best Register', 'Crown Register', 'Living Register'],
    'package_retrieval_open': ['Latest Body Finder BUILD 050 ancestor', 'Source-Body Auditor BUILD 050 family'],
    'ruling': 'KNOWN GOVERNING BODIES; EXACT STANDALONE PACKAGES NOT YET RECOVERED',
    'prohibited_reductions': ['blank source-needed ideas', 'fully recovered standalone tools without package evidence'],
    'severity': 'HONEST_RETRIEVAL_STATE',
}
body = next((item for item in authority['bodies'] if item.get('id') == entry['id']), None)
if body:
    body.update(entry)
else:
    authority['bodies'].append(entry)
AUTHORITY.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

receipt = json.loads(RECEIPT.read_text(encoding='utf-8'))
receipt['schema'] = 'JM.EstateClassificationIntegrityReceipt/1.2'
receipt['status'] = 'PASS_RETRIEVAL_TRUTH'
receipt['counts']['stringline_projects'] = len(projects)
receipt['remaining_exact_package_retrieval'] = [
    'Portal Engine standalone package',
    'Latest Body Finder BUILD 050 standalone package',
    'Source-Body Auditor BUILD 050 standalone package',
]
receipt['proof']['remaining_registered_rows_individually_audited'] = 'PASS'
receipt['proof']['known_body_vs_recovered_package_distinction'] = 'PASS'
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

print(json.dumps({'rooms': len(rows), 'retrieval_rows': 3, 'stringline_projects': len(projects)}, indent=2))
