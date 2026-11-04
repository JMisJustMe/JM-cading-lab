#!/usr/bin/env python3
"""CP04 fail-closed verification of the actual Build Mesh v0.8.6 source registry."""
import hashlib, json, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
p = HERE / "current_registry.json"
raw = p.read_bytes()
x = json.loads(raw.decode("utf-8"))
assert x["schema"] == "JM.CareerCurrentProjectRegistry/0.24"
assert x["date"] == "2026-11-04"
assert len(x["records"]) == 22
matches = [r for r in x["records"] if r.get("id") == "llm2-v2"]
assert len(matches) == 1
r = matches[0]
assert r["title"] == "JM LLM #2 v2.1 — Maximal Earned Direct-Content Edition"
assert r["head_version"] == "2.1.0"
assert r["owner_archive_sha256"] == "28016904da6a44dabc6e49688090452fde98e7da73541a5daa2003c8c51d38b0"
assert r["learned_bank_sha256"] == "133cf26f1dfc106133bf183fb4ddcd0ffa4a8d7280628863ad35c667af50af21"
assert r["unpromoted_v2_2"] is True
assert "v2.0" in r["prior_frozen_head"]
assert any(z.get("relation") == "GOVERNED_BY_RECURSIVE_CAPABILITY_GROWTH_RETURN_PROTOCOL" and z.get("merge") is False and z.get("proof_transfer") is False for z in r["relations"])
assert sum("JM LLM #2" in (z.get("title") or "") for z in x["records"]) == 1
sys.path.insert(0,str(HERE))
import server
assert server.VERSION == "0.8.6"
assert len(server.CURRENT) == 22
assert server.CURRENT_REGISTRY_SHA256 == hashlib.sha256(raw).hexdigest()
head = server.resolve_current_head({"name": "JM LLM #2"})
assert head["state"] == "CURRENT_DECLARED", head
assert head["current_head"] == r["title"], head
assert head["primary_evidence"]["id"] == "llm2-v2", head
sync = server.build_sync_contract({"name":"JM LLM #2"})
assert sync["hosted_snapshot"]["current_registry_sha256"] == hashlib.sha256(raw).hexdigest(), sync
print(json.dumps({
  "schema":"JM.BuildMesh.CP04LLM2LiveSourcePreflight/1",
  "status":"PASS_SOURCE_REGISTRY_ONLY",
  "source_version":server.VERSION,
  "loaded_registry_schema":x["schema"],
  "record_count":len(server.CURRENT),
  "record_id_retained":r["id"],
  "current_head":head["current_head"],
  "exact_sha256":server.CURRENT_REGISTRY_SHA256,
  "scoped_gates":20,
  "hosted_production":"NOT_CLAIMED_UNTIL_RENDER_DEPLOY_AND_MCP_READBACK",
  "private_model_source_published":False
},indent=2))
