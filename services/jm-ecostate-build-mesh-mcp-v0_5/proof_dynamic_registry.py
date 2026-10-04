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

assert server.VERSION == "0.7.5"
assert server.CURRENT_REGISTRY_SOURCE == "current_registry.json"
assert server.CURRENT_REGISTRY_HASH_MODE == "SHA256_EXACT_LOADED_BYTES"
assert server.CURRENT_REGISTRY_RELOAD_POLICY == "PROCESS_START"
assert server.CURRENT_REGISTRY_SHA256 == expected_hash
assert server.CURRENT_REGISTRY_BYTES == len(raw)
assert server.CURRENT_REGISTRY_SCHEMA == parsed["schema"] == "JM.CareerCurrentProjectRegistry/0.4"
assert server.CURRENT_REGISTRY_DATE == parsed["date"] == "2026-10-04"
assert server.CURRENT_REGISTRY_BODY == parsed["body"]
assert server.CURRENT == parsed["records"]
assert len(server.CURRENT) == 19
assert len({x["id"] for x in server.CURRENT}) == len(server.CURRENT)

head = server.resolve_current_head({"name":"JM ECOSTATE — Build Mesh"})
assert head["state"] == "CURRENT_DECLARED", head
assert "v1.0.6" in head["current_head"], head

status = server.build_mesh_status({"probe_navigator":False})
assert status["current_registry_sha256"] == expected_hash
assert status["current_registry_loaded_bytes"] == len(raw)
assert status["current_registry_path_mode"] == "SERVICE_LOCAL"
assert status["estate_keeper_contract_schema"] == "JM.BuildMesh.EstateKeeperContract/0.7.5"

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

keeper = server.estate_keeper_contract({"scope":"private Library delta maintenance","last_checkpoint":"PASS_84","changed_count":0,"unresolved_count":0})
assert keeper["schema"] == "JM.BuildMesh.EstateKeeperContract/0.7.5"
assert keeper["no_census_default"] is True
assert keeper["destructive_default"] == "HOLD"
assert keeper["mutation_performed"] is False
assert keeper["authority_rule"] == "Identity/current-head authority must be exact or privately re-contacted. Fuzzy discovery is never promoted to authority."

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
