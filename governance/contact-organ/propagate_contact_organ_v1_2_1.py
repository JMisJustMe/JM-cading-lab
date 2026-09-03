#!/usr/bin/env python3
"""JM Estate Contact Organ propagation v1.2.1.

Loads the frozen-green v1.2 propagator, applies explicit recovery overrides for
exact sources that have since been seated into repo source-carriage, then runs
normal v1.2 materialisation rules.

This is a descendant, not a rewrite of v1.2.
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

if OVERRIDES.exists():
    rows = json.loads(OVERRIDES.read_text(encoding='utf-8')).get('rows', [])
    for row in rows:
        rid = row['recipientId']
        mod.RECOVERY_BY_ID[rid] = {**mod.RECOVERY_BY_ID.get(rid, {}), **row}

mod.main()
