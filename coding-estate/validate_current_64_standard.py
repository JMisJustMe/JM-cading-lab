#!/usr/bin/env python3
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CURRENT = ROOT / "coding-estate" / "JM_CODING_ESTATE_CURRENT_64.json"
INHERITED = ROOT / "coding-estate" / "everybody" / "role-qualified-61" / "JM_61_ROLE_QUALIFIED_CODING_CENSUS.json"
STANDARD = ROOT / "coding-estate" / "JM_CODING_ESTATE_RUNNING_STANDARD_v1_0.md"

errors = []

def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"cannot load {path.relative_to(ROOT)}: {exc}")
        return {}

current = load(CURRENT)
inherited = load(INHERITED)
standard_text = STANDARD.read_text(encoding="utf-8") if STANDARD.exists() else ""

if current.get("schema") != "JM.CodingEstate.Current64/1.0":
    errors.append("current64 schema mismatch")

counts = current.get("counts") or {}
expected_counts = {
    "inherited_role_qualified": 61,
    "post_census_new": 3,
    "current_coding_identities": 64,
    "adjacent_non_code_organs": 44,
    "preserved_engineering_ecology": 105,
}
for key, expected in expected_counts.items():
    if counts.get(key) != expected:
        errors.append(f"counts.{key} expected {expected}, got {counts.get(key)!r}")

ids = current.get("identities") or []
if len(ids) != 64:
    errors.append(f"identity length expected 64, got {len(ids)}")
code_ids = [x.get("code_id") for x in ids if isinstance(x, dict)]
if code_ids != list(range(1,65)):
    errors.append("code_id sequence must be exactly 1..64")

names = [x.get("name") for x in ids if isinstance(x, dict)]
if len(names) != len(set(names)):
    errors.append("duplicate current64 body names")

source_rows = inherited.get("identity") or []
source_names = [row[3] for row in source_rows]
if len(source_names) != 61:
    errors.append(f"inherited source expected 61 identities, got {len(source_names)}")
if names[:61] != source_names:
    errors.append("current64 identities 1..61 do not exactly match role-qualified inherited authority")

post = names[61:]
if post != ["JM JudgeMaker","JM JangleMonitor","JM JourMaze"]:
    errors.append(f"post-census identities mismatch: {post!r}")

for name in names:
    if name not in standard_text:
        errors.append(f"running standard omits body name: {name}")

laws = set(current.get("operating_rules") or [])
for required in {
    "RECOVER BEFORE REBUILD",
    "CONTACT BEFORE CROWN",
    "NO DING, NO CLAIM",
    "MESH ≠ MERGE",
    "BODY ≠ CARRIER ≠ ROUTE ≠ SEAT",
    "ACCESS ≠ AUTHORITY",
}:
    if required not in laws:
        errors.append(f"missing operating law: {required}")

if "MEMBER OF X HOUSE ≠ IS AN X" != current.get("identity_law"):
    errors.append("identity law drift")

if errors:
    print("JM CODING ESTATE CURRENT 64 RUNNING STANDARD: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("JM CODING ESTATE CURRENT 64 RUNNING STANDARD: PASS")
print("current_coding_identities=64 inherited=61 post_census=3 adjacent_non_code=44")
print("historical_engineering_ecology=105 remains separate from current identity count")
