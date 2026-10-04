#!/usr/bin/env python3
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PATH = HERE / "JM_SOVEREIGN_AGENT_CONTRACT_v0_1.json"
ROOT = HERE.parents[1]
CURRENT64_PATH = ROOT / "coding-estate" / "JM_CODING_ESTATE_CURRENT_64.json"
BUILD_GOVERNANCE_PATH = ROOT / "JM_ESTATE" / "GOVERNANCE" / "JM_BUILD_LAWS_PREFERENCES_GOVERNANCE_v1.0.json"
ESTATE_CAPABILITY_PATH = ROOT / "JM_ESTATE" / "GOVERNANCE" / "JM_ESTATE_CAPABILITY_FIELD_v1.0.json"
PORTABLE_RUNTIME_PATH = ROOT / "agent-runtime" / "JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json"
HOST_ADAPTER_CONTRACT_PATH = ROOT / "agent-runtime" / "host-adapters" / "JM_HOST_ADAPTER_CONFORMANCE_v1_0.json"
HOST_ADAPTER_REGISTRY_PATH = ROOT / "agent-runtime" / "host-adapters" / "JM_HOST_ADAPTER_REGISTRY_v1_0.json"
CODING_ACTIVATION_POLICY_PATH = ROOT / "coding-estate" / "JM_CODING_BODY_ACTIVATION_POLICY_v0_1.json"

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

try:
    build_governance = json.loads(BUILD_GOVERNANCE_PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"BUILD GOVERNANCE LOAD FAIL: {exc}")
    sys.exit(1)

try:
    estate_capability = json.loads(ESTATE_CAPABILITY_PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"ESTATE CAPABILITY LOAD FAIL: {exc}")
    sys.exit(1)

try:
    portable_runtime = json.loads(PORTABLE_RUNTIME_PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"PORTABLE RUNTIME LOAD FAIL: {exc}")
    sys.exit(1)

try:
    host_adapter_contract = json.loads(HOST_ADAPTER_CONTRACT_PATH.read_text(encoding="utf-8"))
    host_adapter_registry = json.loads(HOST_ADAPTER_REGISTRY_PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"HOST ADAPTER CONFORMANCE LOAD FAIL: {exc}")
    sys.exit(1)

try:
    coding_activation_policy = json.loads(CODING_ACTIVATION_POLICY_PATH.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"CODING ACTIVATION POLICY LOAD FAIL: {exc}")
    sys.exit(1)

host_conf = data.get("host_adapter_conformance") or {}
if host_conf.get("schema") != "JM.HostAdapterConformance/1.0":
    errors.append("agent contract host-adapter conformance schema missing/drifted")
if host_adapter_contract.get("schema") != "JM.HostAdapterConformance/1.0":
    errors.append("canonical host-adapter conformance schema missing/drifted")
if host_adapter_registry.get("schema") != "JM.HostAdapterRegistry/1.0":
    errors.append("canonical host-adapter registry schema missing/drifted")
canonical_adapter_ids = [x.get("id") for x in (host_adapter_registry.get("adapters") or [])]
if host_conf.get("registered_adapter_ids") != canonical_adapter_ids:
    errors.append("agent contract host-adapter list does not exactly match canonical registry")
if host_conf.get("proof_ladder") != host_adapter_contract.get("proof_levels"):
    errors.append("agent contract host-adapter proof ladder does not match canonical conformance contract")
if host_conf.get("keeper") != "CHANGE THE PLUG, NOT THE BODY.":
    errors.append("host-adapter keeper drift")

portable = data.get("portable_runtime") or {}
if portable.get("schema") != "JM.SovereignAgentRuntime/0.1":
    errors.append("agent contract portable-runtime schema missing/drifted")
if portable_runtime.get("schema") != "JM.SovereignAgentRuntime/0.1":
    errors.append("canonical portable-runtime schema missing/drifted")
if portable.get("authority_class") != "RUNTIME_ADAPTER_NOT_SOURCE_AUTHORITY":
    errors.append("portable runtime authority class drift")
impl = portable_runtime.get("implementations") or {}
for key in ("python","node"):
    rel = impl.get(key)
    if not rel or not (ROOT / rel).exists():
        errors.append(f"portable runtime implementation missing: {key}")
runtime_sources = portable_runtime.get("canonical_sources") or {}
if runtime_sources.get("sovereign_agent") != "services/jm-ecostate-build-mesh-mcp-v0_5/JM_SOVEREIGN_AGENT_CONTRACT_v0_1.json":
    errors.append("portable runtime sovereign-agent source pointer drift")

estate_route = data.get("estate_capability_routing") or {}
if estate_route.get("schema") != "JM.EstateCapabilityField/1.0":
    errors.append("agent contract Estate capability schema missing/drifted")
if estate_capability.get("schema") != "JM.EstateCapabilityField/1.0":
    errors.append("canonical Estate capability schema missing/drifted")
canonical_heads = [x.get("name") for x in (estate_capability.get("current_project_heads") or [])]
if estate_route.get("project_heads") != canonical_heads:
    errors.append("agent contract Estate project-head list does not exactly match canonical capability field")
if estate_route.get("current_project_head_count") != len(canonical_heads):
    errors.append("agent contract Estate project-head count does not match canonical capability field")
canonical_overlays = estate_capability.get("overlay_and_donor_profiles") or []
if estate_route.get("overlay_profile_count") != len(canonical_overlays):
    errors.append("agent contract Estate overlay count does not match canonical capability field")
if estate_route.get("authority_class") != "ROUTING_FIELD_NOT_CURRENT_HEAD_AUTHORITY":
    errors.append("agent contract Estate capability authority class drift")

bg = data.get("build_laws_governance") or {}
if bg.get("schema") != "JM.BuildLawsPreferencesGovernance/1.0":
    errors.append("agent contract build-governance schema missing/drifted")
if build_governance.get("schema") != "JM.BuildLawsPreferencesGovernance/1.0":
    errors.append("canonical build-governance schema missing/drifted")
if bg.get("master_runtime") != build_governance.get("master_runtime"):
    errors.append("agent contract master runtime does not match canonical build-governance contract")
if bg.get("authority_gate") != (build_governance.get("authority_gate") or {}).get("required"):
    errors.append("agent contract authority gate does not match canonical build-governance contract")

activation = data.get("coding_body_activation") or {}
if activation.get("schema") != "JM.CodingBodyActivationPolicy/0.1":
    errors.append("agent contract coding-body activation schema missing/drifted")
if coding_activation_policy.get("schema") != "JM.CodingBodyActivationPolicy/0.1":
    errors.append("canonical coding-body activation policy schema missing/drifted")
canonical_active_ids = [x.get("code_id") for x in (coding_activation_policy.get("baseline_active") or [])]
if activation.get("active_runtime_spine_code_ids") != canonical_active_ids:
    errors.append("agent contract activation IDs do not exactly match canonical activation policy")
if activation.get("active_runtime_spine_count") != len(canonical_active_ids):
    errors.append("agent contract active runtime-spine count drift")
if activation.get("available_not_selected_count") != 64 - len(canonical_active_ids):
    errors.append("agent contract available-not-selected count drift")
if runtime_sources.get("coding_activation_policy") != "coding-estate/JM_CODING_BODY_ACTIVATION_POLICY_v0_1.json":
    errors.append("portable runtime coding-activation source pointer drift")

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
