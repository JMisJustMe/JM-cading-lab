#!/usr/bin/env python3
"""JM Estate Contact Organ propagation v1.2.1 — source-seat continuation.

Loads the frozen-green v1.2 propagator, applies explicit exact-source recovery
overrides, materialises newly seated sources, then preserves the historical
v1.2 accounting receipts byte-for-byte while writing a distinct v1.2.1 receipt.

FROZEN PARENT -> CLEAN DESCENDANT.
NO DING, NO CLAIM.
"""
from pathlib import Path
import importlib.util
import json

HERE = Path(__file__).resolve().parent
BASE = HERE / 'propagate_contact_organ_v1_2.py'
OVERRIDES = HERE / 'source_recovery_overrides_v1_2_1.json'

spec = importlib.util.spec_from_file_location('jm_contact_propagation_v1_2', BASE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

rows = json.loads(OVERRIDES.read_text(encoding='utf-8')).get('rows', []) if OVERRIDES.exists() else []
for row in rows:
    rid = row['recipientId']
    mod.RECOVERY_BY_ID[rid] = {**mod.RECOVERY_BY_ID.get(rid, {}), **row}

out = mod.OUT
old_receipt = out / 'PROPAGATION_RECEIPT_v1_2.json'
old_queue = out / 'SOURCE_RECOVERY_QUEUE_v1_2.json'
old_receipt_bytes = old_receipt.read_bytes() if old_receipt.exists() else None
old_queue_bytes = old_queue.read_bytes() if old_queue.exists() else None

mod.main()

# Capture the new accounting before restoring the frozen v1.2 receipts.
new_report = json.loads(old_receipt.read_text(encoding='utf-8'))
new_queue = json.loads(old_queue.read_text(encoding='utf-8'))
override_ids = {r['recipientId'] for r in rows}

# Rename newly materialised override descendants/receipts to the v1.2.1 descendant line.
for rid in override_ids:
    d = out / rid
    if not d.exists():
        continue
    for p in list(d.glob('*_CONTACT_ORGAN_v1_2_DESCENDANT.html')):
        target = p.with_name(p.name.replace('_v1_2_DESCENDANT.html', '_v1_2_1_DESCENDANT.html'))
        p.replace(target)
        for row in new_report.get('results', []):
            if row.get('recipientId') == rid and row.get('descendant'):
                row['descendant'] = str(target.relative_to(mod.ROOT))
                row['status'] = row['status'].replace('V1_2_', 'V1_2_1_')
    patch = d / 'PATCH_RECEIPT_v1_2.json'
    if patch.exists():
        pr = json.loads(patch.read_text(encoding='utf-8'))
        pr['schema'] = 'jm.estate.contact-organ-patch-receipt/1.2.1'
        pr['propagationLine'] = 'v1.2.1 exact-source-seat continuation'
        if pr.get('descendant'):
            pr['descendant'] = pr['descendant'].replace('_v1_2_DESCENDANT.html', '_v1_2_1_DESCENDANT.html')
            target_path = mod.ROOT / pr['descendant']
            if target_path.exists():
                import hashlib
                pr['descendantSha256'] = hashlib.sha256(target_path.read_bytes()).hexdigest()
        patch21 = d / 'PATCH_RECEIPT_v1_2_1.json'
        patch21.write_text(json.dumps(pr, indent=2) + '\n', encoding='utf-8')
        patch.unlink()

new_report['schema'] = 'jm.estate.contact-organ-github-propagation/1.2.1'
new_report['inherits'] = 'v1.2 absolute-accounting floor; promotes newly seated exact sources without rewriting v1.2 receipts'
new_report['sourceSeatOverrides'] = sorted(override_ids)
(out / 'PROPAGATION_RECEIPT_v1_2_1.json').write_text(json.dumps(new_report, indent=2) + '\n', encoding='utf-8')
new_queue['schema'] = 'jm.estate.contact-organ-source-recovery-queue/1.2.1'
(out / 'SOURCE_RECOVERY_QUEUE_v1_2_1.json').write_text(json.dumps(new_queue, indent=2) + '\n', encoding='utf-8')

if old_receipt_bytes is not None:
    old_receipt.write_bytes(old_receipt_bytes)
if old_queue_bytes is not None:
    old_queue.write_bytes(old_queue_bytes)

print(json.dumps(new_report, indent=2))
