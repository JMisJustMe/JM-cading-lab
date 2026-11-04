#!/usr/bin/env python3
"""Verify public-safe AI head contact delta; never imply hosted registry mutated."""
from __future__ import annotations
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "registry/JM_AI_CURRENT_AUTHORITY_DELTA_CP04_2026-11-04.json"
x = json.loads(p.read_text(encoding="utf-8"))
assert x["schema"] == "JM.Estate.AIAuthorityContactDelta/1"
assert x["authority_class"] == "DERIVED_PUBLIC_SAFE_CONTACT_RECORD_NOT_HOT_AUTHORITY"
assert x["identity"] == "JM LLM #2"
cur = x["current_source"]
par = x["protected_parent"]
host = x["hosted_build_mesh_snapshot"]
bd = x["proof_boundary"]
assert cur["version"] == "v2.1"
assert cur["archive_sha256"] == "28016904da6a44dabc6e49688090452fde98e7da73541a5daa2003c8c51d38b0"
assert cur["learned_bank_sha256"] == "133cf26f1dfc106133bf183fb4ddcd0ffa4a8d7280628863ad35c667af50af21"
assert par["role"] == "FROZEN_HISTORICAL_ANCESTOR_NOT_CURRENT"
assert "v2.0" in par["name"]
assert x["unpromoted"]["promoted"] is False
assert host["registry_source"] == "current_registry.json"
assert host["registry_schema"] == "JM.CareerCurrentProjectRegistry/0.24"
assert host["state"] == "STALE_FOR_JM_LLM2"
assert bd["live_build_mesh_registry_mutated"] is False
assert bd["latest_hosted_current_head_verified_as_v2_1"] is False
assert bd["private_weights_published"] is False
assert bd["model_identity_merged"] is False
s = (ROOT / "scripts/jm_ai_federation_cp02.py").read_text(encoding="utf-8")
assert cur["archive_sha256"] in s
assert x["existing_contact"]["receiver_pr"] == 729
print("JM CP04 AI CURRENT-AUTHORITY DELTA VALIDATOR: 18/18 PASS; HOSTED SYNC DRIFT OPEN")
