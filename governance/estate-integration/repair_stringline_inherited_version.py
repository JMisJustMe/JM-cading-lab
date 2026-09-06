#!/usr/bin/env python3
"""Repair the integration descendant's Stringline version without erasing inherited authority.

The first v1 applicator incorrectly replaced the v0.1.8 QUADZE authority-version label.
This forward repair preserves that historical/operative version phrase and appends the
Estate integration state instead of inventing a replacement version number.
"""
from __future__ import annotations

import json
from pathlib import Path

PATH = Path('navigator/stringline.json')
REQUIRED = 'v0.1.8 QUADZE v4 authority reconciliation'
INTEGRATION = 'Estate Sovereign Integration v1'
BAD_FIRST_PASS = 'v0.1.9 sovereign integration seed'
CANONICAL_DESCENDANT_LABEL = 'v0.1.8 QUADZE v4 authority reconciliation seed + Estate Sovereign Integration v1'


def main() -> None:
    data = json.loads(PATH.read_text(encoding='utf-8'))
    current = str(data.get('version', ''))

    if current == BAD_FIRST_PASS:
        data['version'] = CANONICAL_DESCENDANT_LABEL
    elif REQUIRED in current:
        if INTEGRATION not in current:
            data['version'] = current.rstrip() + ' + ' + INTEGRATION
    else:
        raise SystemExit(
            'Refusing integration version repair: inherited QUADZE v4 authority label is absent.'
        )

    data.setdefault('integration_registry', {})['inheritance_boundary'] = (
        'Estate integration is additive. It does not replace or demote the v0.1.8 QUADZE v4 authority reconciliation seed.'
    )
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(data['version'])


if __name__ == '__main__':
    main()
