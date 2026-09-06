#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

CANON = 'https://jmisjustme-estate.pages.dev/'
MARKER = 'data-jm-estate-integration="v1"'
PUBLIC = Path('navigator/estate-integration/public-registry.json')
BRIDGE = Path('navigator/estate-integration/bridge.js')
RUNTIME = Path('navigator/estate-integration/index.html')
STRINGLINE = Path('navigator/stringline.json')
NAVREG = Path('registry/jm3232-navigator.json')
TARGETS = [
    Path('navigator/index.html'),
    Path('apps/index.html'),
    Path('recovery/index.html'),
    Path('lyrics/index.html'),
]


def require(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(msg)


def main() -> None:
    public = json.loads(PUBLIC.read_text(encoding='utf-8'))
    require(public.get('schema') == 'JM.Estate.PublicNervousSystem/1', 'public registry schema mismatch')
    require(public.get('canonical_root') == CANON, 'canonical root mismatch')
    privacy = public.get('privacy_boundary', {})
    require(privacy.get('contains_private_owner_data') is False, 'private owner data exposed')
    require(privacy.get('contains_owner_write_endpoint') is False, 'owner write endpoint exposed')
    require(privacy.get('contains_mutable_owner_state') is False, 'mutable owner state exposed')

    raw_public = PUBLIC.read_text(encoding='utf-8')
    forbidden = [
        'navigator-live-contact.jm-inline-contact-probe.pages.dev',
        'OPENAI_API_KEY',
        'CLOUDFLARE_API_TOKEN',
        'CLOUDFLARE_ACCOUNT_ID',
    ]
    for token in forbidden:
        require(token not in raw_public, f'forbidden public token/route present: {token}')

    route_ids = [r.get('id') for r in public.get('routes', [])]
    require(len(route_ids) == len(set(route_ids)), 'duplicate public route ids')
    require({'estate','navigator','apps','theory','lyrics','recovery'}.issubset(set(route_ids)), 'core public route missing')

    bridge_text = BRIDGE.read_text(encoding='utf-8')
    require('JM.Estate.PublicBridge/1' in bridge_text, 'bridge schema missing')
    require('jm-estate-integration-ready' in bridge_text, 'bridge ready event missing')
    require('registry.load.pass' in bridge_text, 'bridge trace receipt missing')

    runtime_text = RUNTIME.read_text(encoding='utf-8')
    require('./bridge.js' in runtime_text, 'integration runtime does not load bridge')

    for path in TARGETS:
        text = path.read_text(encoding='utf-8')
        require(text.count(MARKER) == 1, f'{path}: expected exactly one integration bridge marker')
        require('/navigator/estate-integration/bridge.js' in text, f'{path}: shared bridge route missing')

    stringline = json.loads(STRINGLINE.read_text(encoding='utf-8'))
    projects = [p for p in stringline.get('seed_project_strings', []) if p.get('id') == 'estate-sovereign-integration']
    require(len(projects) == 1, 'Stringline must contain exactly one Estate integration project')
    require(stringline.get('integration_registry', {}).get('publicRoute') == './estate-integration/public-registry.json', 'Stringline registry route mismatch')
    body_ids = {b.get('id') for b in projects[0].get('bodies', [])}
    require({'estate-integration-public-registry','estate-canonical-root','navigator-public-mcp'}.issubset(body_ids), 'Stringline integration bodies incomplete')

    nav = json.loads(NAVREG.read_text(encoding='utf-8'))
    require(nav.get('schema') == 'JM.NavigatorRegistry/1.3', 'Navigator registry descendant schema not applied')
    require('Unified Browser' not in nav.get('aliases', []), 'Unified Browser still collapsed into Navigator aliases')
    require(nav.get('integration_bridge', {}).get('separations', {}).get('Unified Browser') == 'SEPARATE_CURRENT_BODY', 'Unified Browser separation missing')
    require(nav.get('integration_bridge', {}).get('privateExclusions'), 'private exclusions missing')

    print('JM Estate Sovereign Integration v1 integrity PASS')
    print(f'core_routes={len(public.get("routes", []))} services={len(public.get("services", []))} surfaces={len(TARGETS)}')


if __name__ == '__main__':
    main()
