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
# Apps House — replace the weak v1 SOLO card with the recovered v4 role split.
# ---------------------------------------------------------------------------
text = APPS.read_text(encoding='utf-8')
match = re.search(r'const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=', text, re.S)
if not match:
    raise SystemExit('Apps registry is unreadable')
rows = json.loads(match.group(1))
quadze_rows = [row for row in rows if row[0] in {'JM QUADZE MultiHub SOLO', 'JM QUADZE MultiHub OneBody OS'}]
if len(quadze_rows) != 1:
    raise SystemExit(f'Expected one QUADZE MultiHub row, found {len(quadze_rows)}')
quadze_rows[0][:] = [
    'JM QUADZE MultiHub OneBody OS',
    'v4.1 SOLO · v4.0 full APK-ready source',
    'Operating Houses',
    'full_current',
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
expected = {'room_count': 44, 'full_plus_preserved': 29, 'routed': 12, 'source_needed': 0, 'preparation': 2}
if stats != expected:
    raise SystemExit(f'Unexpected Apps stats after QUADZE recovery: {stats} != {expected}')
text = re.sub(r'const APP_STAT_COUNTS=\{.*?\};', 'const APP_STAT_COUNTS=' + json.dumps(stats, separators=(',', ':')) + ';', text, count=1)
APPS.write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# Stringline — one body, multiple authority lanes, none silently crowned over
# the others.
# ---------------------------------------------------------------------------
stringline = json.loads(STRINGLINE.read_text(encoding='utf-8'))
stringline['version'] = 'v0.1.8 QUADZE v4 authority reconciliation seed'
projects = {project['id']: project for project in stringline['seed_project_strings']}
operating = projects['operating-houses']
operating['status'] = 'STANDING'
operating['keeper'] = 'Full source, SOLO projection and lineage APK carry different crowns. Newer does not mean total replacement.'
quadze_body = {
    'id': 'quadze-multihub',
    'name': 'JM QUADZE MultiHub OneBody OS',
    'type': 'Multi-room OneBody operating house / editable source machine',
    'role': 'v4.0 full APK-ready source authority plus v4.1 fetch-free SOLO projection',
    'status': 'FROZEN',
    'fullSourceAuthority': 'v4.0 APK-ready source',
    'soloAuthority': 'v4.1 SOLO',
    'signedLineageApk': 'v3.0 signed lineage APK — device install unproved',
    'v4NativeApk': 'NOT_BUILT_NOT_CLAIMED',
    'playStoreBundle': 'NOT_BUILT_NOT_CLAIMED',
    'deviceContact': 'SEPARATE_DING_NOT_REPROVED',
    'privateCustody': '/JM_Estate/Zionfolders/Operating_Houses/QUADZE_MultiHub_v4_1/',
    'publicPayload': 'NOT_PUBLISHED',
}
existing = next((body for body in operating['bodies'] if body.get('id') == 'quadze-multihub'), None)
if existing:
    existing.update(quadze_body)
else:
    operating['bodies'].append(quadze_body)
STRINGLINE.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Classification authority — promote the retrieved v4 package while retaining
# the old registry ID as a stable reference.
# ---------------------------------------------------------------------------
authority = json.loads(AUTHORITY.read_text(encoding='utf-8'))
quadze = next(body for body in authority['bodies'] if body.get('id') == 'quadze-multihub-v10')
quadze.update({
    'name': 'JM QUADZE MultiHub OneBody OS',
    'primary_seat': 'Operating Houses & Launchers / MultiHub OS',
    'governing_identity': 'one-body operating house carrying JM coding bodies, game engines, rooms, editable workspace and preserved source packs',
    'source_ancestor': 'v1.0 SOLO / SERVE / STORE public package lane',
    'full_source_authority': 'v4.0 APK-ready source — 29 mounted entries / 27 preserved source packs',
    'solo_projection_authority': 'v4.1 SOLO — 29 embedded rooms / 56,651,010 bytes / fetch-free',
    'signed_lineage_apk': 'v3.0 signed APK — lineage proof only / device install unproved',
    'v4_native_apk': 'NOT_BUILT_NOT_CLAIMED',
    'play_store_bundle': 'NOT_BUILT_NOT_CLAIMED',
    'custody_defect_guard': 'Inherited SHA256SUMS and v4.0 manifest do not fully govern v4.1 additions; corrected 398-file recovery manifest is mounted beside untouched originals.',
    'private_custody': '/JM_Estate/Zionfolders/Operating_Houses/QUADZE_MultiHub_v4_1/',
    'recovery_record': 'registry/quadze-multihub-v4-authority.json',
    'ruling': 'V4_FULL_SOURCE_AND_SOLO_AUTHORITIES_RECOVERED_WITH_SEPARATE_APK_BOUNDARY',
    'severity': 'RECOVERED_AND_RECONCILED_V4_AUTHORITY',
})
AUTHORITY.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Integrity receipt — close the final v4 memory/package watch item.
# ---------------------------------------------------------------------------
integrity = json.loads(INTEGRITY.read_text(encoding='utf-8'))
integrity['schema'] = 'JM.EstateClassificationIntegrityReceipt/1.6'
integrity['status'] = 'PASS_QUADZE_V4_AUTHORITY_RECOVERED'
integrity['watch_items'] = [item for item in integrity.get('watch_items', []) if 'JM QUADZE MultiHub later v4.x' not in item]
corrected = 'JM QUADZE MultiHub v4.0 full-source and v4.1 SOLO authority split recovered'
if corrected not in integrity['corrected_public_bodies']:
    integrity['corrected_public_bodies'].append(corrected)
proof = integrity.setdefault('proof', {})
proof.update({
    'quadze_v40_zip_integrity': 'PASS',
    'quadze_v41_zip_integrity': 'PASS',
    'quadze_v40_build_manifest': 'PASS_394_OF_394',
    'quadze_v41_corrected_manifest': 'PASS_398_OF_398',
    'quadze_v41_solo_static': 'PASS_29_OF_29',
    'quadze_v41_solo_script_syntax': 'PASS',
    'quadze_v41_solo_headless_qa': 'PASS_2_VIEWPORTS',
    'quadze_v41_solo_interactions': 'PASS_SEARCH_OPEN_BACK_HOME_EXPORT',
    'quadze_inherited_checksum_defect': 'FOUND_PRESERVED_AND_CORRECTED_EXTERNALLY',
    'quadze_v3_lineage_apk_hash': 'PASS',
    'quadze_v4_native_apk_boundary': 'NOT_BUILT_NOT_CLAIMED',
})
integrity['quadze_recovery_record'] = 'registry/quadze-multihub-v4-authority.json'
INTEGRITY.write_text(json.dumps(integrity, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

print(json.dumps({
    'apps_stats': stats,
    'quadze_public_body': quadze_rows[0],
    'stringline_version': stringline['version'],
    'watch_items': integrity['watch_items'],
}, indent=2))
