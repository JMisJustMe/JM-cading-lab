#!/usr/bin/env python3
import hashlib
import importlib.util
import json
import pathlib
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("jm_build_mesh_server", ROOT / "server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

registry_path = ROOT / "current_registry.json"
raw = registry_path.read_bytes()
expected_hash = hashlib.sha256(raw).hexdigest()
parsed = json.loads(raw.decode("utf-8"))

assert server.VERSION == "0.8.2"
assert server.CURRENT_REGISTRY_SOURCE == "current_registry.json"
assert server.CURRENT_REGISTRY_HASH_MODE == "SHA256_EXACT_LOADED_BYTES"
assert server.CURRENT_REGISTRY_RELOAD_POLICY == "PROCESS_START"
assert server.CURRENT_REGISTRY_SHA256 == expected_hash
assert server.CURRENT_REGISTRY_BYTES == len(raw)
assert server.CURRENT_REGISTRY_SCHEMA == parsed["schema"] == "JM.CareerCurrentProjectRegistry/0.9"
assert server.CURRENT_REGISTRY_DATE == parsed["date"] == "2026-10-05"
assert server.CURRENT_REGISTRY_BODY == parsed["body"]
assert server.CURRENT == parsed["records"]
assert len(server.CURRENT) == 22
assert len({x["id"] for x in server.CURRENT}) == len(server.CURRENT)

head = server.resolve_current_head({"name":"JM ECOSTATE — Build Mesh"})
assert head["state"] == "CURRENT_DECLARED", head
assert head["current_head"] == "JM ECOSTATE — Build Mesh — Hosted v0.8.2 Authority-Tier Precedence Repair", head

status = server.build_mesh_status({"probe_navigator":False})
assert status["current_registry_sha256"] == expected_hash
assert status["current_registry_loaded_bytes"] == len(raw)
assert status["current_registry_path_mode"] == "SERVICE_LOCAL"
assert status["estate_keeper_contract_schema"] == "JM.BuildMesh.EstateKeeperContract/0.7.6"

sync = server.build_sync_contract({"name":"JM ECOSTATE — Build Mesh"})
snap = sync["hosted_snapshot"]
assert snap["current_registry_sha256"] == expected_hash
assert snap["current_registry_source"] == "current_registry.json"
assert snap["current_registry_hash_mode"] == "SHA256_EXACT_LOADED_BYTES"

profile = server.resolve_profile("JM ECOSTATE — Build Mesh")
assert profile and profile["id"] == "ecostate-build-mesh-v102"
assert "external current-registry loading" in profile["capabilities"]
assert "dynamic exact-byte registry hashing" in profile["capabilities"]
assert "delta-first Estate maintenance planning" in profile["capabilities"]
assert "JM32-1DA exact runtime-route seating" in profile["capabilities"]
assert "PRIVATE PACKAGE v1.0.10" in head["primary_evidence"]["status"]
assert "HOSTED MCP v0.8.2" in head["primary_evidence"]["status"]

jm32 = server.resolve_profile("JM32-1DA")
assert jm32 and jm32["id"] == "jm32-1da-v221", jm32
mesh = server.build_capability_mesh({"builds":["32_Cb","JM32-1DA"],"max_nodes":4})
declared = [
    edge for edge in mesh["edges"]
    if edge.get("relation") == "DECLARED_RELATION"
    and edge.get("declared_relation") == "ANCESTRAL_DONOR_TO_RUNTIME_ROUTE_EXPANSION"
]
assert len(declared) == 1, mesh
edge = declared[0]
assert edge["from"] == "32cb-v21" and edge["to"] == "jm32-1da-v221", edge
assert edge["merge"] is False and edge["proof_transfer"] is False, edge

adapter = server.resolve_profile("JM32-1DA Cross-Device Runtime Adapter")
assert adapter and adapter["id"] == "jm32-1da-cross-device-adapter-v02", adapter
adapter_mesh = server.build_capability_mesh({"builds":["JM32-1DA","JM32-1DA Cross-Device Runtime Adapter"],"max_nodes":4})
adapter_declared = [
    e for e in adapter_mesh["edges"]
    if e.get("relation") == "DECLARED_RELATION"
    and e.get("declared_relation") == "HAS_SEPARATE_CROSS_DEVICE_ADAPTER"
]
assert len(adapter_declared) == 1, adapter_mesh
assert adapter_declared[0]["from"] == "jm32-1da-v221" and adapter_declared[0]["to"] == "jm32-1da-cross-device-adapter-v02", adapter_declared[0]
assert adapter_declared[0]["merge"] is False and adapter_declared[0]["proof_transfer"] is False, adapter_declared[0]

llm = server.resolve_profile("JM LLM Core")
assert llm and llm["id"] == "llm-core-v1", llm
assert llm["name"] == "JM LLM Core v1.3 — Symbiosis Cycle 003", llm
assert "bounded modular arithmetic" in llm["capabilities"], llm
assert "bounded ordinary mathematical induction" in llm["capabilities"], llm
assert "cross-cycle capability retention" in llm["capabilities"], llm
assert "bounded propositional truth tables" in llm["capabilities"], llm
assert "bounded predicate-quantifier formalization" in llm["capabilities"], llm
assert "finite-domain quantifier evaluation" in llm["capabilities"], llm
assert "strong induction" in llm["open_frontiers"], llm
assert "arbitrary first-order theorem proving" in llm["open_frontiers"], llm
assert "predicate logic" not in llm["open_frontiers"], llm
llm_head = server.resolve_current_head({"name":"JM LLM Core"})
assert llm_head["state"] == "CURRENT_DECLARED", llm_head
assert llm_head["current_head"] == "JM LLM Core v1.3 — Symbiosis Cycle 003", llm_head
assert "4836/4836 PASS" in llm_head["primary_evidence"]["proof"], llm_head
assert llm_head.get("competing_candidates") == [], llm_head

return_mesh = server.build_capability_mesh({"builds":["JM LLM Core","JM ECOSTATE Build Mesh"],"max_nodes":4})
returned = [
    e for e in return_mesh["edges"]
    if e.get("relation") == "DECLARED_RELATION"
    and e.get("declared_relation") == "SYMBIOSIS_CAPABILITY_RETURN_TO_ECOSTATE"
]
assert len(returned) == 1, return_mesh
assert returned[0]["from"] == "llm-core-v1" and returned[0]["to"] == "ecostate-build-mesh-v102", returned[0]
assert returned[0]["merge"] is False and returned[0]["proof_transfer"] is False, returned[0]

keeper = server.estate_keeper_contract({"scope":"private Library delta maintenance","last_checkpoint":"PASS_84","changed_count":0,"unresolved_count":0})
assert keeper["schema"] == "JM.BuildMesh.EstateKeeperContract/0.7.6"
assert keeper["no_census_default"] is True
assert keeper["destructive_default"] == "HOLD"
assert keeper["mutation_performed"] is False
assert keeper["authority_rule"] == "Identity/current-head authority must be exact or privately re-contacted. Fuzzy discovery is never authority."

# Prove hash follows changed bytes rather than a hardcoded constant.
with tempfile.TemporaryDirectory() as td:
    p = pathlib.Path(td) / "registry.json"
    modified = dict(parsed)
    modified["authority"] = parsed["authority"] + "_TEST"
    p.write_text(json.dumps(modified, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    loaded = server.load_current_registry(str(p))
    assert loaded["sha256"] == hashlib.sha256(p.read_bytes()).hexdigest()
    assert loaded["sha256"] != expected_hash

# Prove invalid/ambiguous registry fails closed.
with tempfile.TemporaryDirectory() as td:
    p = pathlib.Path(td) / "bad.json"
    bad = dict(parsed)
    bad["records"] = [dict(parsed["records"][0]), dict(parsed["records"][0])]
    p.write_text(json.dumps(bad, ensure_ascii=False), encoding="utf-8")
    try:
        server.load_current_registry(str(p))
    except RuntimeError as exc:
        assert "unique" in str(exc).lower()
    else:
        raise AssertionError("duplicate registry ids did not fail closed")

print(json.dumps({
    "state":"PASS",
    "server_version":server.VERSION,
    "registry_schema":server.CURRENT_REGISTRY_SCHEMA,
    "registry_records":len(server.CURRENT),
    "registry_bytes":len(raw),
    "registry_sha256":expected_hash,
    "registry_source":server.CURRENT_REGISTRY_SOURCE,
    "hash_mode":server.CURRENT_REGISTRY_HASH_MODE,
    "self_head":head["current_head"],
}, ensure_ascii=False, indent=2))
