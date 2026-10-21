#!/usr/bin/env python3
"""Source-scope regression gates: relationship planning never executes a merge."""
import importlib
import json
import os
import tempfile

# An isolated, nonproduction registry fixture exercises source-level planning.
# It is not the live v0.24 exact-byte registry and cannot earn a deployment Ding.
registry = {
    "schema":"JM.CareerCurrentProjectRegistry/0.24",
    "date":"2026-10-19",
    "body":"JM synthetic source-test fixture — NOT LIVE AUTHORITY",
    "records":[{"id":"fixture","title":"Synthetic fixture only","status":"TEST_ONLY",
                "summary":"No owner data","proof":"No external proof",
                "boundary":"Fixture data is not a live current head"}],
}
with tempfile.NamedTemporaryFile(mode="w",encoding="utf-8",suffix=".json",delete=False) as f:
    json.dump(registry,f)
    fixture_path=f.name
os.environ["JM_CURRENT_REGISTRY_PATH"]=fixture_path
try:
    server = importlib.import_module("server")
finally:
    os.unlink(fixture_path)
server.resolve_current_head = lambda args: {
    "state": "CURRENT_DECLARED",
    "current_head": "mock current head of " + args["name"],
}
server.resolve_profile = lambda name: {"id": "mock-" + name.lower().replace(" ", "-")}

assert set(server.RELATIONSHIP_OPERATIONS) == {
    "SEPARATE", "MESH", "INTEGRATE", "MERGE", "TRANSFORM", "BREAKAWAY"
}
assert "plan_relationship_operation" in server.HANDLERS
assert any(t["name"] == "plan_relationship_operation" for t in server.TOOLS)
status = server.build_mesh_status({"probe_navigator": False})
assert status["relationship_operations"] == list(server.RELATIONSHIP_OPERATIONS)
assert "MESH ≠ MERGE" not in status["laws"]
for op in server.RELATIONSHIP_OPERATIONS:
    arguments = {"operation": op, "objective": "Connect distinct bodies without erasing provenance", "bodies": ["JM GameCore", "JM Target Bridge"]}
    first = server.plan_relationship_operation(arguments)
    second = server.plan_relationship_operation(arguments)
    assert first["schema"] == "JM.BuildMesh.RelationshipPlan/1"
    assert first["proposal_id"] == second["proposal_id"]
    assert first["operation"] == op
    assert first["mutation_performed"] is False
    assert first["recipient_proof_transferred"] is False
    assert first["owner_device_proof_claimed"] is False
    assert len(first["participants"]) == 2
    assert len(first["steps"]) >= 6
    assert first["merge_requires_explicit_authority"] is (op == "MERGE")
for bad in (
    {"operation": "AUTO_MERGE", "objective": "x", "bodies": ["A", "B"]},
    {"operation": "MERGE", "objective": "", "bodies": ["A", "B"]},
    {"operation": "MERGE", "objective": "x", "bodies": ["A", "A"]},
    {"operation": "MERGE", "objective": "x", "bodies": ["A"]},
):
    try:
        server.plan_relationship_operation(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("invalid relationship accepted: " + str(bad))
print(json.dumps({"schema": "JM.BuildMesh.RelationshipPlanTests/1", "state": "SOURCE_SCOPE_PASS", "operations": len(server.RELATIONSHIP_OPERATIONS), "external_executions": 0}, indent=2))
