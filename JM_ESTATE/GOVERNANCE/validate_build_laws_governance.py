#!/usr/bin/env python3
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = ROOT / "JM_ESTATE" / "GOVERNANCE"
CONTRACT = BASE / "JM_BUILD_LAWS_PREFERENCES_GOVERNANCE_v1.0.json"
STANDARD = BASE / "JM_BUILD_LAWS_PREFERENCES_GOVERNANCE_STANDARD_v1.0.md"
CURRENT64 = ROOT / "coding-estate" / "JM_CODING_ESTATE_CURRENT_64.json"

errors=[]

def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"cannot load {path.relative_to(ROOT)}: {exc}")
        return {}

data=load(CONTRACT)
current64=load(CURRENT64)
text=STANDARD.read_text(encoding="utf-8") if STANDARD.exists() else ""

if data.get("schema") != "JM.BuildLawsPreferencesGovernance/1.0":
    errors.append("schema mismatch")
if data.get("authority_class") != "OPERATING_COMPOSITE_NOT_SOURCE_REPLACEMENT":
    errors.append("authority class drift")
if data.get("master_runtime") != "SOURCE → SIGNAL → CONTACT FIELD → ROUTE PRESSURE → STATE CHANGE → DING → TRACE → RECOVERY → OUTPUT":
    errors.append("master runtime drift")

required_laws={
    "NO DING, NO CLAIM",
    "CONTACT BEFORE CROWN",
    "SOURCE BEFORE CROWN",
    "RECOVER BEFORE REBUILD",
    "RECOVER BEFORE BURDEN",
    "HOUSE BEFORE ARCHIVE",
    "MESH ≠ MERGE",
    "BODY ≠ CARRIER ≠ ROUTE ≠ SEAT",
    "ACCESS ≠ AUTHORITY",
    "SYNTAX PASS ≠ RUNTIME PASS",
    "RECIPIENT A DING ≠ RECIPIENT B DING",
    "MEMBER OF X HOUSE ≠ IS AN X",
    "TASK OWNERSHIP ≠ STEP OWNERSHIP",
    "DO FOR SELF OFF OF OWN MERITS",
    "AMBIGUITY SHOULD SHRINK POWER, NOT EXPAND IT",
    "HISTORICAL TODO ≠ AUTOMATIC CURRENT DEBT",
    "PRESENT AUTHORITY GOVERNS PRESENT ACTION",
    "BRIDGE CREATION MUST DECLARE ITSELF"
}
laws=set(data.get("foundational_laws") or [])
for law in sorted(required_laws-laws):
    errors.append("missing foundational law: "+law)

expected_gate=[
    "SOURCE AUTHORITY","ENTRY AUTHORITY","STRUCTURE AUTHORITY",
    "BEHAVIOUR AUTHORITY","DELIVERY AUTHORITY","RECEIPT AUTHORITY"
]
if (data.get("authority_gate") or {}).get("required") != expected_gate:
    errors.append("six-authority gate drift")

sovereignty=set((data.get("sovereignty") or {}).get("rules") or [])
for rule in {
    "CONNECTED ≠ CAPTIVE","ACCESS ≠ OWNERSHIP","OWNERSHIP ≠ CONTROL",
    "CONTROL ≠ SOVEREIGNTY","CONVENIENCE ≠ CONSENT","ADAPTER ≠ BODY","HOST ≠ OWNER"
}:
    if rule not in sovereignty:
        errors.append("missing sovereignty rule: "+rule)

if (data.get("consequence_law") or {}).get("keeper") != "THE UI MAY REPORT AN ATTEMPT. ONLY THE CONSEQUENCE MAY REPORT SUCCESS.":
    errors.append("consequence keeper drift")

prefs=set(data.get("working_preferences") or [])
for fragment in [
    "Full Body → Straight Run → Correct After",
    "Android-first; laptop-conjoined where relevant",
    "OneBody preference",
    "CLEAR BODY, QUIET TRACE",
    "Reuse Priority"
]:
    if fragment not in prefs:
        errors.append("missing working preference: "+fragment)

ids=current64.get("identities") or []
if len(ids) != 64:
    errors.append(f"current64 registry expected 64 identities, got {len(ids)}")
coding=(data.get("coding_integration") or {})
if coding.get("current64_registry") != "coding-estate/JM_CODING_ESTATE_CURRENT_64.json":
    errors.append("current64 registry pointer drift")

required_text=[
    "FULL BODY → STRAIGHT RUN → CORRECT AFTER",
    "SOURCE AUTHORITY + ENTRY AUTHORITY + STRUCTURE AUTHORITY + BEHAVIOUR AUTHORITY + DELIVERY AUTHORITY + RECEIPT AUTHORITY",
    "AUTHORITY WITHOUT PREFLIGHT = UNCHECKED PASS",
    "THE UI MAY REPORT AN ATTEMPT. ONLY THE CONSEQUENCE MAY REPORT SUCCESS.",
    "AMBIGUITY SHOULD SHRINK POWER, NOT EXPAND IT.",
    "STORAGE COST MUST EARN RETRIEVAL VALUE",
    "ALL **64 current coding identities** inherit this floor"
]
for needle in required_text:
    if needle not in text:
        errors.append("human standard missing: "+needle)

if errors:
    print("JM BUILD LAWS / PREFERENCES / GOVERNANCE STANDARD: FAIL")
    for error in errors:
        print("- "+error)
    sys.exit(1)

print("JM BUILD LAWS / PREFERENCES / GOVERNANCE STANDARD: PASS")
print(f"foundational_laws={len(laws)} authority_gates=6 current_coding_identities={len(ids)}")
print("host_neutral=True source_replacement=False consequence_readback_required=True")
