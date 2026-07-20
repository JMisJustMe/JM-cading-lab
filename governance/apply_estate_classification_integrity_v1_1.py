from __future__ import annotations

# Retrigger marker: 2026-07-20T16:08Z — observed second-wave run.

import json
import re
from pathlib import Path

APPS = Path('apps/index.html')
STRINGLINE = Path('navigator/stringline.json')
AUTHORITY = Path('registry/estate-classification-authority-v1.0.json')
AUDIT = Path('governance/JM_ESTATE_CLASSIFICATION_INTEGRITY_AUDIT_v1_0.md')

text = APPS.read_text(encoding='utf-8')
match = re.search(r'const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=', text, re.S)
if not match:
    raise SystemExit('Apps registry or embedded stat receipt is missing')
rows = json.loads(match.group(1))

out = []
theory_readable_seen = False
for row in rows:
    name, version, category, status = row
    if name == 'JM QUADZE MultiHub SOLO':
        out.append([name, 'v1.0 mounted SOLO / SERVE / STORE body', category, 'full_current'])
    elif name == 'CadenVM / CadenPad':
        out.append([name, 'v0.10 Frozen Project Workspace · Android Ding', 'Coding & Proof', 'full_current'])
    elif name == 'TraceBox / RouteBox':
        out.append([name, 'v5.2 Standalone PWA', 'Coding & Proof', 'full_current'])
    elif name == 'BodyVault':
        out.append([name, 'v0.4.2 TRUE NO-INTERPRETER', 'Estate & Recovery', 'full_current'])
    elif name == 'OWNMADE':
        out.append([name, 'v1.3 PWA Project + File Dock', 'Utilities & Incubator', 'full_current'])
    elif name == 'Gold Mode Coding Hub':
        out.append([name, 'v0.9.5.1 Mobile Hotfix · v0.9.4 preserved core', 'Coding & Proof', 'full_current'])
    elif name == 'JM Theory Multihub' and 'v0.5 Readable Source' in version:
        if not theory_readable_seen:
            out.append(['JM Theory Multihub', 'v0.5 Readable Source Package', 'Theory & Books', 'full_current'])
            theory_readable_seen = True
    else:
        out.append(row)
        if name == 'JM Theory Multihub' and 'v0.5 Readable Source' in version:
            theory_readable_seen = True

if not theory_readable_seen:
    insert_at = max((i for i, row in enumerate(out) if row[0] == 'JM Theory Multihub'), default=19) + 1
    out.insert(insert_at, ['JM Theory Multihub', 'v0.5 Readable Source Package', 'Theory & Books', 'full_current'])

apps_json = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
text = text[:match.start(1)] + apps_json + text[match.end(1):]
APPS.write_text(text, encoding='utf-8')

stringline = json.loads(STRINGLINE.read_text(encoding='utf-8'))
stringline['version'] = 'v0.1.3 classification-integrity second wave'
projects = {project['id']: project for project in stringline['seed_project_strings']}

coding = projects['coding-os']
coding['bodies'] = [
    {
        'id': 'coding-estate-public',
        'name': 'JM Coding Estate',
        'type': 'Coding house / runtimes / compilers',
        'role': 'Public coding-estate integration route',
        'status': 'STANDING',
        'route': 'https://jmisjustme.github.io/JM-cading-lab/coding-estate/integration/00_OPEN_FIRST.html',
    },
    {
        'id': 'gold-mode-coding-hub',
        'name': 'Gold Mode Coding Hub',
        'type': 'Coding house + working creation lab',
        'role': 'v0.9.5.1 Mobile Hotfix; full v0.9.4 hub preserved beneath the working Drag & Aim creation route',
        'status': 'PROVEN',
    },
    {
        'id': 'cadenvm-v010',
        'name': 'CadenVM / CadenPad',
        'type': 'VM / multi-program project workspace',
        'role': 'v0.10 frozen: foldered ProjectSavePacks, multi-program workspace and Android Ding',
        'status': 'FROZEN',
    },
    {
        'id': 'tracebox-v52',
        'name': 'TraceBox / RouteBox',
        'type': 'Proof, diagnosis and cross-domain route system',
        'role': 'v5.2 standalone offline-capable PWA body',
        'status': 'PROVEN',
    },
]

theory = projects['theory']
theory_bodies = [body for body in theory.get('bodies', []) if body.get('id') != 'theory-readable-v05']
theory_bodies.append({
    'id': 'theory-readable-v05',
    'name': 'JM Theory Multihub — Readable Source',
    'type': 'Full-body readable source package',
    'role': 'v0.5 packaged source + receipt + SHA256 + Zionfolder; parallel to the public reader',
    'status': 'MOUNTED',
    'route': '../theory/',
})
theory['bodies'] = theory_bodies

recovery = projects['recovery-delivery']
for body in recovery.get('bodies', []):
    if body.get('id') == 'bodyvault':
        body.update({
            'name': 'BodyVault',
            'type': 'Vault / no-interpreter recovery body',
            'role': 'v0.4.2 TRUE NO-INTERPRETER: OPEN_FIRST, full and lite packages, no JS/onclick/fetch/external CSS',
            'status': 'FROZEN',
        })

utilities = projects.get('utilities-incubator')
utilities_body = {
    'id': 'utilities-incubator',
    'name': 'Utilities & Incubator',
    'headChat': 'Utilities and Incubator Project Head',
    'headRecord': 'Utility Body Current-Best Record',
    'status': 'THREADING',
    'keeper': 'A growing aspect body must not be labelled source-needed after its working builds and receipts exist.',
    'bodies': [
        {
            'id': 'ownmade-v13',
            'name': 'OWNMADE',
            'type': 'Playable PWA mini-studio machine',
            'role': 'v1.3 Project Board + File Reader + Image Gallery + Search Hub + preserved studio tools',
            'status': 'PROVEN',
        }
    ],
}
if utilities:
    utilities.update(utilities_body)
else:
    stringline['seed_project_strings'].append(utilities_body)
STRINGLINE.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

authority = json.loads(AUTHORITY.read_text(encoding='utf-8'))
bodies = authority['bodies']
by_id = {body['id']: body for body in bodies}

by_id['gold-mode-coding-hub'].update({
    'confirmed_line': ['v0.6 frozen current-best', 'v0.9 shared mechanics', 'v0.9.2 all-coding activation / 53 bodies', 'v0.9.4 full Estate Explorer and Composer', 'v0.9.5 First Working Creation', 'v0.9.5.1 Mobile Hotfix'],
    'operating_authority': 'v0.9.5.1 Mobile Hotfix; v0.9.4 hub preserved inside',
    'ruling': 'CURRENT FRONTIER CONFIRMED',
    'severity': 'MAJOR_CORRECTED',
})

additions = [
    {
        'id': 'cadenvm',
        'name': 'CadenVM / CadenPad',
        'primary_seat': 'Coding Estate / VM & Workspace',
        'governing_identity': 'hosted JM programming VM and multi-program project workspace',
        'frozen_current_use_anchor': 'v0.10 Project Library / Foldered SavePacks + Android Ding',
        'prohibited_reductions': ['v0.9+ family wording after v0.10 was frozen and device-proven'],
        'severity': 'MAJOR_CORRECTED',
    },
    {
        'id': 'tracebox-routebox',
        'name': 'TraceBox / RouteBox',
        'primary_seat': 'Proof, Claims & Diagnostics / Cross-Domain Route Systems',
        'governing_identity': 'recoverable input-route-state-change-proof system',
        'operating_authority': 'v5.2 standalone PWA',
        'prohibited_reductions': ['source-needed registry card after the standalone PWA package exists'],
        'severity': 'CRITICAL_CORRECTED',
    },
    {
        'id': 'bodyvault',
        'name': 'BodyVault',
        'primary_seat': 'Builders, Recovery & Delivery / Vault',
        'governing_identity': 'open-first source, package and recovery vault',
        'frozen_current_use_anchor': 'v0.4.2 TRUE NO-INTERPRETER',
        'prohibited_reductions': ['Mount direction / source-needed after full and lite v0.4.2 packages were proven'],
        'severity': 'CRITICAL_CORRECTED',
    },
    {
        'id': 'ownmade',
        'name': 'OWNMADE',
        'primary_seat': 'Utilities & Incubator / Multi-Aspect Machine',
        'governing_identity': 'playable PWA utility and mini-studio machine route',
        'latest_confirmed_build': 'v1.3 PWA Project + File Dock',
        'prohibited_reductions': ['registered/source-needed utility branch after v1.0-v1.3 build receipts'],
        'severity': 'MAJOR_CORRECTED',
    },
    {
        'id': 'theory-readable-v05',
        'name': 'JM Theory Multihub — Readable Source',
        'primary_seat': 'Theory Estate / Source Custody',
        'governing_identity': 'full-body readable-source package parallel to public reader and private/full census',
        'operating_authority': 'v0.5 packaged with receipt, SHA256 and Zionfolder',
        'prohibited_reductions': ['omission that makes the public reader appear to be the only current body'],
        'severity': 'MAJOR_CORRECTED',
    },
    {
        'id': 'quadze-multihub-v10',
        'name': 'JM QUADZE MultiHub SOLO',
        'primary_seat': 'Operating Houses & Launchers',
        'governing_identity': 'mounted multimedia/multi-room delivery body',
        'confirmed_package': 'v1.0 SOLO 15.9 MB + SERVE PWA + STORE debug APK assembly/signature pass; install pending',
        'ruling': 'CURRENT PUBLIC PACKAGE IDENTIFIED; LATER v4.x MEMORY CLAIM REQUIRES EXACT PACKAGE RETRIEVAL',
        'severity': 'WATCH',
    },
]
for body in additions:
    if body['id'] in by_id:
        by_id[body['id']].update(body)
    else:
        bodies.append(body)

authority['status'] = 'GOVERNING_SECOND_WAVE'
authority['second_wave_date'] = '2026-07-20'
AUTHORITY.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

audit = AUDIT.read_text(encoding='utf-8')
section = '''\n## Second-wave findings\n\nThe deeper source-status pass found additional understatements after the first correction:\n\n- **CadenVM / CadenPad:** v0.10 is frozen and Android-proven; the public `v0.9+` wording was stale.\n- **TraceBox / RouteBox:** v5.2 standalone PWA exists; `Source needed` was incorrect.\n- **BodyVault:** v0.4.2 TRUE NO-INTERPRETER is the current vault anchor; `Mount direction` was incorrect.\n- **OWNMADE:** v1.3 PWA Project + File Dock exists; `Source needed` was incorrect.\n- **Gold Mode Coding Hub:** the frontier reaches v0.9.5.1 Mobile Hotfix while preserving the full v0.9.4 hub.\n- **JM Theory Multihub:** v0.5 Readable Source is a real package lane and must stand beside, not behind, the public reader.\n- **JM QUADZE MultiHub:** the exact retrieved public package is v1.0 across SOLO/SERVE/STORE routes. A later v4.x memory claim remains a retrieval watch item rather than being silently crowned or erased.\n'''
if '## Second-wave findings' not in audit:
    audit += section
AUDIT.write_text(audit, encoding='utf-8')

print(json.dumps({'apps_rooms_after_second_wave': len(out), 'stringline_version': stringline['version'], 'authority_status': authority['status']}, indent=2))
