#!/usr/bin/env python3
import ast
import json
import pathlib
import sys

ROOT=pathlib.Path(__file__).resolve().parents[2]
GOV=ROOT/"JM_ESTATE"/"GOVERNANCE"
FIELD=GOV/"JM_ESTATE_CAPABILITY_FIELD_v1.0.json"
STANDARD=GOV/"JM_ESTATE_CAPABILITY_ROUTING_STANDARD_v1.0.md"
CAPS=ROOT/"services"/"jm-ecostate-build-mesh-mcp-v0_5"/"capabilities.py"

errors=[]

def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"cannot load {path.relative_to(ROOT)}: {exc}")
        return {}

field=load_json(FIELD)
text=STANDARD.read_text(encoding="utf-8") if STANDARD.exists() else ""

try:
    src=CAPS.read_text(encoding="utf-8")
    node=ast.parse(src)
    profiles=None
    for n in node.body:
        if isinstance(n, ast.Assign):
            for target in n.targets:
                if isinstance(target,ast.Name) and target.id=="CAPABILITY_PROFILES":
                    profiles=ast.literal_eval(n.value)
    if profiles is None:
        raise RuntimeError("CAPABILITY_PROFILES assignment not found")
except Exception as exc:
    errors.append(f"cannot parse Build Mesh capability profiles: {exc}")
    profiles=[]

if field.get("schema")!="JM.EstateCapabilityField/1.0":
    errors.append("schema mismatch")
if field.get("authority_class")!="ROUTING_FIELD_NOT_CURRENT_HEAD_AUTHORITY":
    errors.append("authority class drift")

snapshot=field.get("live_snapshot") or {}
if snapshot.get("current_project_records")!=19:
    errors.append("current-project snapshot count must be 19")
if snapshot.get("capability_profiles")!=29:
    errors.append("capability-profile snapshot count must be 29")

if len(profiles)!=29:
    errors.append(f"Build Mesh capability profile count expected 29, got {len(profiles)}")
source_current=[p for p in profiles if str(p.get("source","")).startswith("current_project_registry")]
source_overlay=[p for p in profiles if p.get("source")=="current_overlay"]
if len(source_current)!=18:
    errors.append(f"current-project capability profiles expected 18, got {len(source_current)}")
if len(source_overlay)!=11:
    errors.append(f"overlay capability profiles expected 11, got {len(source_overlay)}")

heads=field.get("current_project_heads") or []
overlays=field.get("overlay_and_donor_profiles") or []
if len(heads)!=19:
    errors.append(f"machine field current project heads expected 19, got {len(heads)}")
if len(overlays)!=11:
    errors.append(f"machine field overlay profiles expected 11, got {len(overlays)}")

source_names=[p.get("name") for p in source_current]
field_profile_names=[p.get("name") for p in heads if p.get("id")!="ecostate-build-mesh-current"]
if field_profile_names!=source_names:
    errors.append("machine field current-profile names drift from capabilities.py")
if [p.get("name") for p in overlays] != [p.get("name") for p in source_overlay]:
    errors.append("machine field overlay names drift from capabilities.py")
if not any(p.get("id")=="ecostate-build-mesh-current" for p in heads):
    errors.append("Build Mesh current self-seat missing from 19-head field")

required_laws={
    "RECOVER BEFORE REBUILD","CONTACT BEFORE CROWN","NO DING, NO CLAIM","MESH ≠ MERGE",
    "BODY ≠ CARRIER ≠ ROUTE ≠ SEAT","ACCESS ≠ AUTHORITY",
    "OVERLAY / DONOR CUE ≠ CURRENT-PROJECT AUTHORITY","DONOR PROOF ≠ RECEIVER PROOF"
}
laws=set(field.get("laws") or [])
for law in sorted(required_laws-laws):
    errors.append("missing routing law: "+law)

for needle in [
    "CURRENT PROJECT HEAD ≠ OVERLAY / DONOR PROFILE ≠ CAPABILITY CUE ≠ EXECUTION PROOF",
    "**19 current project records**",
    "**29 Build Mesh capability profiles**",
    "WHOLE ESTATE ROUTER → CODING DOMAIN SELECTED? → CURRENT-64 CODING ROUTER"
]:
    if needle not in text:
        errors.append("human standard missing: "+needle)

if errors:
    print("JM ESTATE WHOLE CAPABILITY ROUTER: FAIL")
    for e in errors:
        print("- "+e)
    sys.exit(1)

print("JM ESTATE WHOLE CAPABILITY ROUTER: PASS")
print(f"current_project_heads={len(heads)} capability_profiles={len(profiles)} overlays={len(overlays)}")
print("profile_is_authority=False overlay_is_current_head=False live_resolution_required=True")
