from __future__ import annotations

from collections import Counter
import json
import re
from pathlib import Path

APPS = Path('apps/index.html')
STRINGLINE = Path('navigator/stringline.json')
AUTHORITY = Path('registry/estate-classification-authority-v1.0.json')
INTEGRITY = Path('registry/estate-classification-integrity-receipt-v1.0.json')

# ---------------------------------------------------------------------------
# Apps House: move both recovered BUILD 050 organs from "exact package
# retrieval" into routed-organ state. They are not missing standalone apps.
# ---------------------------------------------------------------------------
text = APPS.read_text(encoding='utf-8')
match = re.search(r'const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=', text, re.S)
if not match:
    raise SystemExit('Apps registry is unreadable')
rows = json.loads(match.group(1))
changed = set()
for row in rows:
    if row[0] == 'Latest Body Finder':
        row[1] = 'BUILD 050 · v0.4 installed working organ'
        row[2] = 'Registers & Governance'
        row[3] = 'routed'
        changed.add(row[0])
    elif row[0] == 'Source-Body Auditor':
        row[1] = 'BUILD 050 · v0.4 installed active proof organ'
        row[2] = 'Registers & Governance'
        row[3] = 'routed'
        changed.add(row[0])
if changed != {'Latest Body Finder', 'Source-Body Auditor'}:
    raise SystemExit(f'BUILD 050 Apps rows missing: {changed}')

apps_json = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
text = text[:match.start(1)] + apps_json + text[match.end(1):]
counts = Counter(row[3] for row in rows)
stats = {
    'room_count': len(rows),
    'full_plus_preserved': counts['full_current'] + counts['full_alt'],
    'routed': counts['routed'],
    'source_needed': counts['registered'],
    'preparation': counts['prep'],
}
text = re.sub(
    r'const APP_STAT_COUNTS=\{.*?\};',
    'const APP_STAT_COUNTS=' + json.dumps(stats, separators=(',', ':')) + ';',
    text,
    count=1,
)
visible = [
    (r'<div class="stat"><b>\d+</b><span>registered non-game rooms</span></div>', f'<div class="stat"><b>{stats["room_count"]}</b><span>registered non-game rooms</span></div>'),
    (r'<div class="stat"><b>\d+</b><span>full \+ preserved bodies</span></div>', f'<div class="stat"><b>{stats["full_plus_preserved"]}</b><span>full + preserved bodies</span></div>'),
    (r'<div class="stat"><b>\d+</b><span>routed organs</span></div>', f'<div class="stat"><b>{stats["routed"]}</b><span>routed organs</span></div>'),
    (r'<div class="stat"><b>\d+ \+ \d+</b><span>package-retrieval \+ preparation</span></div>', f'<div class="stat"><b>{stats["source_needed"]} + {stats["preparation"]}</b><span>package-retrieval + preparation</span></div>'),
]
for pattern, replacement in visible:
    text, n = re.subn(pattern, replacement, text, count=1)
    if n != 1:
        raise SystemExit(f'Apps visible stat marker failed: {pattern}')
text = re.sub(r'const FILTERS=\[\["all","All \d+"\]', f'const FILTERS=[["all","All {stats["room_count"]}"]', text, count=1)
text = text.replace(
    'if(n==="JMStudios")return["https://jmisjustme.github.io/JM-cading-lab/games-beyond/","Enter Games&Beyond source route"];',
    'if(n==="JMStudios")return["https://jmisjustme.github.io/JM-cading-lab/games-beyond/","Enter Games&Beyond source route"];if(n==="Latest Body Finder"||n==="Source-Body Auditor")return["/recovery/","Open recovered governance route"];',
    1,
)
APPS.write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# Stringline: promote both organs to their recovered current states while
# preserving the six-stage governance chain.
# ---------------------------------------------------------------------------
stringline = json.loads(STRINGLINE.read_text(encoding='utf-8'))
stringline['version'] = 'v0.1.6 BUILD 050 Latest Source reconciliation seed'
projects = {project['id']: project for project in stringline['seed_project_strings']}
registers = projects['registers-governance']
registers['status'] = 'STANDING'
registers['keeper'] = 'A later host does not supersede a body it dropped. Recover the organ, preserve the host, then carry its live state forward.'
for body in registers['bodies']:
    if body['id'] == 'latest-body-finder':
        body.update({
            'name': 'Latest Body Finder',
            'type': 'BUILD 050 current-best discovery organ',
            'role': 'Recovered from Retrieval Engine v0.4; working organ routed into Current Best and Crown decisions',
            'status': 'MOUNTED',
            'physicalHost': 'JM Estate Retrieval Engine v0.4',
            'currentHost': 'Living Notebook / Registers & Governance chain',
            'standaloneClaim': 'NOT_CLAIMED',
        })
    elif body['id'] == 'source-body-auditor':
        body.update({
            'name': 'Source-Body Auditor',
            'type': 'BUILD 050 source/claim proof organ',
            'role': 'Recovered from Retrieval Engine v0.4; active proof organ routed through Source Ledger, Build Gate and Crown checks',
            'status': 'PROVEN',
            'physicalHost': 'JM Estate Retrieval Engine v0.4',
            'currentHost': 'Build Gate + Source Ledger + Registers & Governance chain',
            'standaloneClaim': 'NOT_CLAIMED',
        })
STRINGLINE.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Classification authority: replace the old package-retrieval ruling with the
# recovered shared-organ authority. Portal Engine remains the open package.
# ---------------------------------------------------------------------------
authority = json.loads(AUTHORITY.read_text(encoding='utf-8'))
chain = next(body for body in authority['bodies'] if body.get('id') == 'registers-governance-chain')
chain.update({
    'physical_organ_host': 'JM Estate Retrieval Engine v0.4 — 91 cards / exact index agreement',
    'recovered_organs': [
        'Latest Body Finder BUILD 050 — working organ',
        'Source-Body Auditor BUILD 050 — active proof organ',
    ],
    'later_branch_guard': 'Retrieval Engine v0.5.1 and v0.6 omit both exact IDs and cannot supersede their v0.4 organ authority.',
    'package_retrieval_open': [],
    'ruling': 'BUILD 050 ORGANS RECOVERED AND REMOUNTED; NO STANDALONE APP CLAIM',
    'recovery_record': 'registry/build050-latest-source-reconciliation-authority.json',
    'severity': 'RECOVERED_AND_REMOUNTED',
})
AUTHORITY.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Integrity receipt: close the two false retrieval rows. Portal Engine remains
# the only exact standalone package retrieval item in the public catalogue.
# ---------------------------------------------------------------------------
integrity = json.loads(INTEGRITY.read_text(encoding='utf-8'))
integrity['schema'] = 'JM.EstateClassificationIntegrityReceipt/1.4'
integrity['status'] = 'PASS_BUILD050_ORGANS_RECOVERED'
integrity['counts']['non_game_app_rooms'] = len(rows)
integrity['counts']['stringline_projects'] = len(stringline['seed_project_strings'])
integrity['remaining_exact_package_retrieval'] = ['Portal Engine standalone package']
integrity.setdefault('proof', {})['latest_body_finder_build050_recovery'] = 'PASS'
integrity['proof']['source_body_auditor_build050_recovery'] = 'PASS'
integrity['proof']['retrieval_engine_v04_html_index_agreement'] = 'PASS_91_OF_91'
integrity['proof']['later_retrieval_branch_omission_guard'] = 'PASS'
integrity['build050_recovery_record'] = 'registry/build050-latest-source-reconciliation-authority.json'
INTEGRITY.write_text(json.dumps(integrity, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

print(json.dumps({'apps_stats': stats, 'stringline_version': stringline['version'], 'remaining_package_retrieval': integrity['remaining_exact_package_retrieval']}, indent=2))
