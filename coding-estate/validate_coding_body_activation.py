#!/usr/bin/env python3
import json, pathlib, sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
POLICY=ROOT/"coding-estate"/"JM_CODING_BODY_ACTIVATION_POLICY_v0_1.json"
CURRENT=ROOT/"coding-estate"/"JM_CODING_ESTATE_CURRENT_64.json"

errors=[]

def load(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"cannot load {p.relative_to(ROOT)}: {exc}")
        return {}

policy=load(POLICY)
current=load(CURRENT)

if policy.get("schema")!="JM.CodingBodyActivationPolicy/0.1":
    errors.append("activation policy schema mismatch")
if current.get("schema")!="JM.CodingEstate.Current64/1.0":
    errors.append("Current64 schema mismatch")

ids=current.get("identities") or []
if len(ids)!=64:
    errors.append(f"Current64 expected 64 identities, got {len(ids)}")
by_id={x.get("code_id"):x for x in ids}

active=policy.get("baseline_active") or []
active_ids=[x.get("code_id") for x in active]
if len(active_ids)!=12:
    errors.append(f"baseline runtime spine expected 12 identities, got {len(active_ids)}")
if len(active_ids)!=len(set(active_ids)):
    errors.append("duplicate active code_id")
for code_id in active_ids:
    if code_id not in by_id:
        errors.append(f"unknown active code_id {code_id}")

expected=[3,6,7,8,10,26,27,28,29,62,63,64]
if active_ids!=expected:
    errors.append(f"baseline active sequence drift: expected {expected}, got {active_ids}")

if len(ids)-len(active_ids)!=52:
    errors.append("activation accounting must leave exactly 52 available-not-selected bodies")

if policy.get("activation_states")!=["ACTIVE_ROUTE","AVAILABLE_NOT_SELECTED"]:
    errors.append("activation state vocabulary drift")

surfaces=policy.get("surface_support") or {}
for required in ["portable-runtime","android","codex-repository","chatgpt-mcp","browser","github-ci","cloud","other"]:
    if required not in surfaces:
        errors.append(f"missing surface support profile: {required}")

if errors:
    print("JM CODING BODY ACTIVATION POLICY: FAIL")
    for e in errors: print("- "+e)
    sys.exit(1)

print("JM CODING BODY ACTIVATION POLICY: PASS")
print("current64=64 active_runtime_spine=12 available_not_selected=52")
print("selection_is_process_execution=False adjacent_organs_are_separate=True")
