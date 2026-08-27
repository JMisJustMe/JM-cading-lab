#!/usr/bin/env python3
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'FOURFOLD_DUAL_AUTHORITY_MANIFEST.json').read_text(encoding='utf-8'))
a=m['authorities']
assert m['status']=='ROLE_QUALIFIED_RECONCILIATION_READY'
assert a['mounted_flagship']['version']=='v0.17 Living Bodies'
assert a['mounted_flagship']['source_bytes']==1364785
assert a['mounted_flagship']['source_sha256']=='3c0cff991e8e95bf647c303771c474f38bf15ae3b156fdeb76076892b050e31a'
assert a['mounted_flagship']['cartridge_id']=='fourfold-arena'
assert a['owner_forge_candidate']['version']=='v0.21.1'
assert a['owner_forge_candidate']['source_bytes']==1497992
assert a['owner_forge_candidate']['source_sha256']=='e944857af4abe461c22cb459c954fed065b81f3741b23c64c3be1531521141f2'
assert a['owner_forge_candidate']['cartridge_id']=='fourfold-owner-forge-v0-21-1'
assert a['owner_forge_candidate']['carrier_alignment']=='ALIGNED_EXISTING_OLD_PACK'
assert a['owner_forge_candidate']['physical_owner_device_ding']=='OPEN'
assert m['relation']['type']=='SAME_LINEAGE_DISTINCT_ROLE_AUTHORITIES'
assert m['transport_decision']['live_http_contact']=='NOT_PROVED_IN_THIS_RECONCILIATION'
r=(ROOT/'FOURFOLD_DUAL_AUTHORITY_RECEIPT.md').read_text(encoding='utf-8')
for s in ['v0.17 remains the mounted/public flagship authority','v0.21.1 remains the Owner Forge candidate','Registered handoff ≠ live HTTP contact','physical owner-device Ding: **OPEN**']:
 assert s in r,s
print('FOURFOLD DUAL AUTHORITY RECONCILIATION PASS')
