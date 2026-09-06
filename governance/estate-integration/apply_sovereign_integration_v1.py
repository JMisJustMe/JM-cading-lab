#!/usr/bin/env python3
"""Apply JM Estate Sovereign Integration v1 to current living web surfaces.

Forward-descendant rule: this script is intended to run on the integration branch.
It does not touch frozen package ancestors. It wires current living surfaces to one
public-safe registry while keeping private owner/write capability out of public code.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('.')
BRIDGE_SRC = '/navigator/estate-integration/bridge.js'
MARKER = 'data-jm-estate-integration="v1"'
PUBLIC_REGISTRY = Path('navigator/estate-integration/public-registry.json')
TARGETS = {
    'navigator/index.html': 'navigator',
    'apps/index.html': 'apps',
    'recovery/index.html': 'recovery',
    'lyrics/index.html': 'lyrics',
}
STRINGLINE = Path('navigator/stringline.json')
NAV_REGISTRY = Path('registry/jm3232-navigator.json')
RECEIPT = Path('estate-integration/APPLY_RECEIPT.json')


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def insert_bridge(path: Path, surface: str) -> bool:
    text = path.read_text(encoding='utf-8')
    if MARKER in text:
        return False
    lower = text.lower()
    pos = lower.rfind('</body>')
    if pos < 0:
        raise RuntimeError(f'{path}: </body> not found')
    tag = f'\n<script defer src="{BRIDGE_SRC}" data-jm-surface="{surface}" {MARKER}></script>\n'
    text = text[:pos] + tag + text[pos:]
    path.write_text(text, encoding='utf-8')
    return True


def patch_stringline() -> bool:
    data = json.loads(STRINGLINE.read_text(encoding='utf-8'))
    rows = data.setdefault('seed_project_strings', [])
    project = {
        'id': 'estate-sovereign-integration',
        'name': 'Estate Sovereign Integration',
        'headChat': 'Estate integration continuation',
        'headRecord': 'JM Estate Sovereign Integration v1',
        'status': 'THREADING',
        'keeper': 'One canonical public door. Many sovereign bodies. Shared live route state without authority collapse.',
        'bodies': [
            {
                'id': 'estate-integration-public-registry',
                'name': 'Estate Public Nervous System Registry',
                'type': 'Public-safe route and authority registry',
                'role': 'Shared machine-readable route state consumed by integrated public surfaces',
                'status': 'THREADING',
                'route': './estate-integration/'
            },
            {
                'id': 'estate-canonical-root',
                'name': 'JMISJUSTME — The Living Estate',
                'type': 'Canonical public Estate door',
                'role': 'Stable public root; descendants update behind governed routes',
                'status': 'PROVEN',
                'route': '../'
            },
            {
                'id': 'navigator-public-mcp',
                'name': 'JM3232 Navigator public OpenAI descendant',
                'type': 'Read-only MCP service',
                'role': 'Public AI/search bridge kept separate from owner mutable state',
                'status': 'THREADING',
                'route': 'https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp'
            },
            {
                'id': 'freestanding-website-v1-5-h1',
                'name': 'JMISJUSTME Independent Website v1.5 H1',
                'type': 'Freestanding sovereign website lineage',
                'role': 'Separate live host lineage; not a replacement canonical root',
                'status': 'PROVEN',
                'route': 'https://jmisjustme.xo.je/'
            },
            {
                'id': 'github-source-corridor',
                'name': 'JMisJustMe/JM-cading-lab',
                'type': 'Source/version/recovery corridor',
                'role': 'Source and recovery rail; not Estate landlord',
                'status': 'STANDING',
                'route': 'https://github.com/JMisJustMe/JM-cading-lab'
            }
        ]
    }
    for i, row in enumerate(rows):
        if row.get('id') == project['id']:
            if row == project:
                return False
            rows[i] = project
            break
    else:
        rows.append(project)
    data['version'] = 'v0.1.9 sovereign integration seed'
    data['integration_registry'] = {
        'schema': 'JM.Estate.PublicNervousSystem/1',
        'source': 'estate-integration/public-registry.json',
        'publicRoute': './estate-integration/public-registry.json',
        'boundary': 'Public-safe route state only; private owner/write state is excluded.'
    }
    STRINGLINE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return True


def patch_navigator_registry() -> bool:
    data = json.loads(NAV_REGISTRY.read_text(encoding='utf-8'))
    before = json.dumps(data, sort_keys=True, ensure_ascii=False)
    aliases = [a for a in data.get('aliases', []) if a != 'Unified Browser']
    data['aliases'] = aliases
    hist = data.setdefault('historical_or_ambiguous_names', [])
    note = 'Unified Browser — historical overlap/alias only; current Unified Browser remains a separate Estate body.'
    if note not in hist:
        hist.append(note)
    data['schema'] = 'JM.NavigatorRegistry/1.3'
    data['version'] = '0.1.2 — sovereign integration bridge descendant'
    data['status'] = 'EXECUTABLE_V0_1_2_INTEGRATION_BRIDGE_STAGED'
    data['integration_bridge'] = {
        'schema': 'JM.Estate.PublicBridge/1',
        'registrySource': 'navigator/estate-integration/public-registry.json',
        'publicRoute': 'https://jmisjustme-estate.pages.dev/navigator/estate-integration/',
        'consumerSurfaces': ['navigator', 'apps', 'recovery', 'lyrics'],
        'exchange': ['route state', 'public-safe authority role', 'bridge-ready event', 'local trace receipt'],
        'privateExclusions': ['owner mutable MCP state', 'owner write endpoints', 'private Living Estate source bytes'],
        'separations': {
            'Unified Browser': 'SEPARATE_CURRENT_BODY',
            'JM Inline Contact': 'SEPARATE_IN_CHATGPT_CONTACT_LINEAGE',
            'GitHub': 'SOURCE_CORRIDOR_NOT_PUBLIC_ESTATE_IDENTITY'
        }
    }
    connected = data.setdefault('connected_bodies', [])
    item = {
        'name': 'JM Estate Sovereign Integration v1',
        'version': 'v1 staged descendant',
        'role': 'Shared public route/authority bridge across current living web surfaces',
        'route': 'https://jmisjustme-estate.pages.dev/navigator/estate-integration/'
    }
    for i, row in enumerate(connected):
        if row.get('name') == item['name']:
            connected[i] = item
            break
    else:
        connected.append(item)
    data['source_paths'] = list(dict.fromkeys(data.get('source_paths', []) + [
        'navigator/estate-integration/index.html',
        'navigator/estate-integration/public-registry.json',
        'navigator/estate-integration/bridge.js',
    ]))
    data['boundary'] = (
        'Navigator v0.1.2 now consumes the shared public-safe Estate integration registry while retaining its own identity. '
        'Unified Browser and JM Inline Contact remain separate bodies. Private owner/write capability is not published. '
        'Live deployment/contact remains separately proved after merge/deploy.'
    )
    after = json.dumps(data, sort_keys=True, ensure_ascii=False)
    if before == after:
        return False
    NAV_REGISTRY.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return True


def main() -> None:
    if not PUBLIC_REGISTRY.is_file():
        raise RuntimeError(f'missing {PUBLIC_REGISTRY}')
    public = json.loads(PUBLIC_REGISTRY.read_text(encoding='utf-8'))
    if public.get('canonical_root') != 'https://jmisjustme-estate.pages.dev/':
        raise RuntimeError('canonical root mismatch')
    if public.get('privacy_boundary', {}).get('contains_owner_write_endpoint') is not False:
        raise RuntimeError('public registry owner-write boundary failed closed')

    paths = [Path(p) for p in TARGETS] + [STRINGLINE, NAV_REGISTRY, PUBLIC_REGISTRY]
    for path in paths:
        if not path.is_file():
            raise RuntimeError(f'missing required source {path}')
    before = {str(p): sha(p) for p in paths}
    changed = []
    for raw, surface in TARGETS.items():
        if insert_bridge(Path(raw), surface):
            changed.append(raw)
    if patch_stringline():
        changed.append(str(STRINGLINE))
    if patch_navigator_registry():
        changed.append(str(NAV_REGISTRY))
    after = {str(p): sha(p) for p in paths}

    receipt = {
        'schema': 'JM.Estate.SovereignIntegrationApplyReceipt/1',
        'created_utc': datetime.now(timezone.utc).isoformat(),
        'state': 'APPLIED_ON_INTEGRATION_BRANCH_NOT_LIVE_PROOF',
        'canonical_root': public['canonical_root'],
        'public_registry': str(PUBLIC_REGISTRY),
        'bridge_marker': MARKER,
        'target_surfaces': TARGETS,
        'changed': changed,
        'before_sha256': before,
        'after_sha256': after,
        'private_owner_write_published': False,
        'ancestor_mutation_claimed': False,
        'live_deployment_claimed': False,
        'next_gate': 'CI integrity PASS, then merge/deploy, then canonical-host contact proof.'
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'changed': changed, 'receipt': str(RECEIPT)}, indent=2))


if __name__ == '__main__':
    main()
