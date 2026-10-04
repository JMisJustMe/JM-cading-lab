#!/usr/bin/env python3
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PATH = HERE / "JM_SOVEREIGN_AGENT_CONTRACT_v0_1.json"
ROOT = HERE.parents[1]
CURRENT64_PATH = ROOT / "coding-estate" / "JM_CODING_ESTATE_CURRENT_64.json"

REQUIRED_LAWS = {
    "NO DING, NO CLAIM",
    "CONTACT BEFORE CROWN",
    "RECOVER BEFORE REBUILD",
    "MESH ≠ MERGE",
    "BODY ≠ CARRIER ≠ ROUTE ≠ SEAT",
    "ACCESS ≠ AUTHORITY",
}
REQUIRED_BODIES = {
    "OneBody Coding OS / OneBody",
    "JM32-1DA",
    "Cading / JM-Cading Runtime",
    "CodeHand RouteOS",
    "JM GameCore",
    "GameForge",
    "GlyphForge",
    "GlyphPlay",
    "PLAYFORM",
    "Android Forge",
    "JM Target Bridge",
    "JM JudgeMaker",
    "JM JangleMonitor",
    "JM JourMaze",
    "TraceBox",
    "Zionfolder / recovery organs",
}
REQUIRED_PROOF = {
    "runtime",
    "host",
    "recipient",
    "device",
    "owner/lived-contact",
    "release/deployment",
}

errors = []
try:
    data = json.loads(PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"CONTRACT LOAD FAIL: {exc}")
    sys.exit(1)

try:
    current64 = json.loads(CURRENT64_PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"CURRENT64 LOAD FAIL: {exc}")
    sys.exit(1)

contract64 = data.get("coding_estate_current_64") or []
canonical64 = [x.get("name") for x in (current64.get("identities") or [])]
if len(canonical64) != 64:
    errors.append(f"canonical current64 registry expected 64 identities, got {len(canonical64)}")
if contract64 != canonical64:
    errors.append("agent contract current64 list does not exactly match canonical Coding Estate current64 registry")
std = data.get("coding_estate_standard") or {}
if std.get("current_identity_count") != 64:
    errors.append("agent contract coding_estate_standard current_identity_count must be 64")

if data.get("schema") != "JM.SovereignAgentContract/0.1":
    errors.append("schema mismatch")
if data.get("authority_class") != "ROUTE_CARRIER_NOT_CURRENT_HEAD":
    errors.append("authority class must remain route-carrier only")

sovereignty = data.get("sovereignty") or {}
for key, expected in {
    "host_neutral": True,
    "host_ownership": False,
    "connected_is_captive": False,
    "adapter_is_body": False,
    "host_is_owner": False,
    "convenience_is_consent": False,
}.items():
    if sovereignty.get(key) is not expected:
        errors.append(f"sovereignty.{key} expected {expected!r}")

laws = set(data.get("laws") or [])
missing_laws = REQUIRED_LAWS - laws
if missing_laws:
    errors.append("missing laws: " + ", ".join(sorted(missing_laws)))

bodies = [x.get("body") for x in (data.get("coding_body_router") or []) if isinstance(x, dict)]
missing_bodies = REQUIRED_BODIES - set(bodies)
if missing_bodies:
    errors.append("missing coding bodies: " + ", ".join(sorted(missing_bodies)))
if len(bodies) != len(set(bodies)):
    errors.append("duplicate coding-body router entry")

proof = set(data.get("proof_layers") or [])
missing_proof = REQUIRED_PROOF - proof
if missing_proof:
    errors.append("missing proof layers: " + ", ".join(sorted(missing_proof)))

inherit_required = set((data.get("inheritance") or {}).get("required") or [])
if "../../AGENTS.md" not in inherit_required:
    errors.append("root AGENTS.md inheritance missing")
if "../../JM_ESTATE/GOVERNANCE/JM_ESTATE_PRODUCTION_INHERITANCE_STANDARD_v1.0.md" not in inherit_required:
    errors.append("Estate production inheritance standard missing")

for rel in sorted(inherit_required):
    candidate = (HERE / rel).resolve()
    if not candidate.exists():
        errors.append(f"referenced agent contract path missing: {rel}")

order = data.get("currentness_order") or []
if not order or order[0] != "direct current owner/device receipt for the exact claim":
    errors.append("currentness order must begin with direct current owner/device receipt")

role = data.get("build_mesh_role") or {}
if role.get("not_owner_of_reached_bodies") is not True:
    errors.append("Build Mesh must not own reached bodies")

if errors:
    print("JM SOVEREIGN AGENT CONTRACT: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("JM SOVEREIGN AGENT CONTRACT: PASS")
print(f"laws={len(laws)} coding_bodies={len(bodies)} proof_layers={len(proof)}")
print("host_neutral=True host_ownership=False route_carrier_only=True")
