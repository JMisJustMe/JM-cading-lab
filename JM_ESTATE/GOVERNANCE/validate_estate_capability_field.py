#!/usr/bin/env python3
import ast
import hashlib
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

# Creation-time tables preserve ancestry. Current descendants can change names
# and source classification; validate their independently pinned source instead.
current=field.get("authority_reentry") or {}
registry_path=ROOT/"services/jm-ecostate-build-mesh-mcp-v0_5/current_registry.json"
registry=load_json(registry_path)
if current.get("registry_path")!=registry_path.relative_to(ROOT).as_posix():
    errors.append("current registry re-entry path drift")
if current.get("registry_schema")!=registry.get("schema"):
    errors.append("current registry schema drift")
if hashlib.sha256(registry_path.read_bytes()).hexdigest()!=current.get("registry_sha256"):
    errors.append("exact current registry hash drift")
if len(registry.get("records",[]))!=current.get("current_project_records"):
    errors.append("current registry record count drift")
profile_hash=hashlib.sha256(json.dumps(profiles,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
if profile_hash!=current.get("profiles_sha256_canonical_json") or len(profiles)!=current.get("capability_profiles"):
    errors.append("exact current capability profiles drift")
profile_ids=[p.get("id") for p in profiles]
if len(set(profile_ids))!=len(profile_ids) or None in profile_ids:
    errors.append("current profile identity collision")
if not {r.get("id") for r in registry.get("records",[])}.issubset(set(profile_ids)):
    errors.append("current registry recipient missing from capability profiles")

heads=field.get("current_project_heads") or []
overlays=field.get("overlay_and_donor_profiles") or []
if len(heads)!=19:
    errors.append(f"machine field current project heads expected 19, got {len(heads)}")
if len(overlays)!=11:
    errors.append(f"machine field overlay profiles expected 11, got {len(overlays)}")

historical_ids={p.get("id") for p in heads+overlays if p.get("id")!="ecostate-build-mesh-current"}
if not historical_ids.issubset(set(profile_ids)):
    errors.append("historical donor ancestry missing from current profiles")
if not any(p.get("id")=="ecostate-build-mesh-current" for p in heads):
    errors.append("Build Mesh current self-seat missing from 19-head field")

required_laws={
    "RECOVER BEFORE REBUILD","CONTACT BEFORE CROWN","NO DING, NO CLAIM","CONTACT DOES NOT IMPLY MERGER","EARNED MERGE IS PERMITTED",
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
print(f"historical_head_seats={len(heads)} current_capability_profiles={len(profiles)} historical_overlay_seats={len(overlays)}")
print("profile_is_authority=False overlay_is_current_head=False live_resolution_required=True")
