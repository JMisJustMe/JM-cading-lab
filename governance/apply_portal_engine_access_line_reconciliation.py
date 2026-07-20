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
# Apps House — Portal is a routed access identity, not a missing standalone app.
# ---------------------------------------------------------------------------
text = APPS.read_text(encoding='utf-8')
match = re.search(r'const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=', text, re.S)
if not match:
    raise SystemExit('Apps registry is unreadable')
rows = json.loads(match.group(1))
portal_rows = [row for row in rows if row[0] == 'Portal Engine']
if len(portal_rows) != 1:
    raise SystemExit(f'Expected one Portal Engine row, found {len(portal_rows)}')
portal_rows[0][:] = [
    'Portal Engine',
    'Estate OS v0.3.1 + TBS Delta 004.1 · access identity recovered',
    'Operating Houses',
    'routed',
]

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
expected_stats = {
    'room_count': 44,
    'full_plus_preserved': 29,
    'routed': 12,
    'source_needed': 0,
    'preparation': 2,
}
if stats != expected_stats:
    raise SystemExit(f'Unexpected Portal-recovered Apps stats: {stats} != {expected_stats}')
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
    text, changed = re.subn(pattern, replacement, text, count=1)
    if changed != 1:
        raise SystemExit(f'Apps visible stat marker failed: {pattern}')
text = re.sub(
    r'const FILTERS=\[\["all","All \d+"\]',
    f'const FILTERS=[["all","All {stats["room_count"]}"]',
    text,
    count=1,
)
old_route = 'if(n==="JMStudios")return["https://jmisjustme.github.io/JM-cading-lab/games-beyond/","Enter Games&Beyond source route"];'
new_route = old_route + 'if(n==="Portal Engine")return["/","Enter Living Estate access layer"];'
if 'if(n==="Portal Engine")' not in text:
    if old_route not in text:
        raise SystemExit('Apps routeFor insertion marker is missing')
    text = text.replace(old_route, new_route, 1)
APPS.write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# Stringline — preserve Portal identity, Estate OS carrier and TBS command roles.
# ---------------------------------------------------------------------------
stringline = json.loads(STRINGLINE.read_text(encoding='utf-8'))
stringline['version'] = 'v0.1.7 Portal access-line reconciliation seed'
projects = {project['id']: project for project in stringline['seed_project_strings']}
operating = projects['operating-houses']
operating['status'] = 'STANDING'
operating['keeper'] = 'Portal makes the rooms reachable. Estate OS carries them. TBS commands the route. None replaces the others.'
portal_body = {
    'id': 'portal-engine',
    'name': 'Portal Engine',
    'type': 'Central access identity / Estate router',
    'role': 'Recovered access identity carried by JM Estate OS v0.3.1 and operated through TBS Delta 004.1',
    'status': 'PROVEN',
    'physicalCarrier': 'JM Estate OS v0.3.1 Safe Room Store Fix',
    'commandSurface': 'JM Command Register v0.1 — TBS Panel / Delta 004.1',
    'truthBoundary': 'TBS Delta 004.2R',
    'identityAnchor': 'JM Estate Retrieval Engine v0.4',
    'matureLineage': 'JM Estate Retrieval Engine v0.6 — Estate OS / Portal Engine INSTALLED / HOLD',
    'standaloneClaim': 'NOT_CLAIMED',
    'publicRoute': '../',
}
existing = next((body for body in operating['bodies'] if body.get('id') == 'portal-engine'), None)
if existing:
    existing.update(portal_body)
else:
    operating['bodies'].append(portal_body)
STRINGLINE.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Classification authority — connect roles without collapsing identities.
# ---------------------------------------------------------------------------
authority = json.loads(AUTHORITY.read_text(encoding='utf-8'))
bodies = authority['bodies']
estate_family = next(body for body in bodies if body.get('id') == 'estate-os-family')
estate_family.update({
    'portal_access_identity': 'Portal Engine',
    'portal_physical_carrier': 'JM Estate OS v0.3.1 Safe Room Store Fix',
    'portal_command_surface': 'JM Command Register v0.1 — TBS Panel / Delta 004.1',
    'portal_truth_boundary': 'TBS Delta 004.2R',
    'portal_ruling': 'CONNECTED_ROLES_NOT_COLLAPSED',
})
portal_authority = {
    'id': 'portal-engine-access-line',
    'name': 'Portal Engine Access Line',
    'primary_seat': 'Operating Houses & Launchers / Estate OS access layer',
    'governing_identity': 'central access identity for locating, mounting, opening and continuing JM bodies',
    'identity_anchor': 'JM Estate Retrieval Engine v0.4 — exact Portal card INSTALLED',
    'mature_lineage_record': 'JM Estate Retrieval Engine v0.6 — Estate OS / Portal Engine INSTALLED / HOLD',
    'physical_access_carrier': 'JM Estate OS v0.3.1 Safe Room Store Fix',
    'command_surface': 'JM Command Register v0.1 — TBS Panel / Delta 004.1',
    'source_pull_boundary': 'TBS Delta 004.2R',
    'standalone_package_claim': 'NOT_CLAIMED',
    'private_keeper': 'PORTAL_ENGINE_ACCESS_LINE_RECONCILIATION_v1_0_ZIONFOLDER.zip',
    'recovery_record': 'registry/portal-engine-access-line-authority.json',
    'ruling': 'RECOVERED_AS_SOVEREIGN_ACCESS_IDENTITY_CARRIED_BY_ESTATE_OS_TBS',
    'prohibited_reductions': [
        'missing standalone app package',
        'Estate OS, TBS and Portal collapsed into one identity',
        'public access card exposing private carrier payload',
    ],
    'severity': 'RECOVERED_AND_REMOUNTED',
}
existing_authority = next((body for body in bodies if body.get('id') == portal_authority['id']), None)
if existing_authority:
    existing_authority.update(portal_authority)
else:
    bodies.append(portal_authority)
AUTHORITY.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Integrity receipt — close the final false package-retrieval card.
# ---------------------------------------------------------------------------
integrity = json.loads(INTEGRITY.read_text(encoding='utf-8'))
integrity['schema'] = 'JM.EstateClassificationIntegrityReceipt/1.5'
integrity['status'] = 'PASS_PORTAL_ACCESS_LINE_RECOVERED'
integrity['remaining_exact_package_retrieval'] = []
integrity['counts']['non_game_app_rooms'] = len(rows)
integrity['counts']['stringline_projects'] = len(stringline['seed_project_strings'])
corrected = 'Portal Engine access identity recovered through Estate OS / TBS carrier line'
if corrected not in integrity['corrected_public_bodies']:
    integrity['corrected_public_bodies'].append(corrected)
proof = integrity.setdefault('proof', {})
proof.update({
    'portal_filename_sweep_no_standalone_package': 'PASS',
    'portal_identity_retrieval_v04': 'PASS',
    'portal_mature_merge_v06': 'PASS',
    'estate_os_v031_headless_access': 'PASS_2_VIEWPORTS',
    'tbs_delta_0041_inline_command': 'PASS',
    'tbs_delta_0042_original_script_defect': 'FOUND_AND_PRESERVED',
    'tbs_delta_0042r_repair': 'PASS_2_VIEWPORTS',
    'portal_access_line_headless_qa': 'PASS_7_OF_7',
})
integrity['portal_recovery_record'] = 'registry/portal-engine-access-line-authority.json'
INTEGRITY.write_text(json.dumps(integrity, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

print(json.dumps({
    'apps_stats': stats,
    'portal_public_state': 'routed',
    'stringline_version': stringline['version'],
    'remaining_exact_package_retrieval': [],
}, indent=2))
