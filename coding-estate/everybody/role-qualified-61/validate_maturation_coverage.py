#!/usr/bin/env python3
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CENSUS = HERE / "JM_61_ROLE_QUALIFIED_CODING_CENSUS.json"
COVERAGE = HERE / "MATURATION_COVERAGE.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition, message):
    if not condition:
        raise SystemExit(message)


census = load(CENSUS)
coverage = load(COVERAGE)

census_ids = [row[2] for row in census["identity"]]
current = coverage["current_crowned_ids"]
pending = coverage.get("pending_ids", [])

require(len(census_ids) == census["counts"]["actual_coding_identities"] == coverage["census_total"] == 61,
        "Census total mismatch")
require(len(census_ids) == len(set(census_ids)), "Duplicate identity in 61 census")
require(len(current) == len(set(current)), "Duplicate current maturation identity")
require(len(pending) == len(set(pending)), "Duplicate pending maturation identity")
require(set(current).isdisjoint(pending), "Pending phase attempts to recount an already crowned identity")
require(set(current).issubset(census_ids), "Current maturation ledger contains a non-census identity")
require(set(pending).issubset(census_ids), "Pending maturation ledger contains a non-census identity")
require(len(current) == coverage["current_crowned_count"], "Current crowned count does not match crowned ID set")
require(coverage["remaining_count"] == len(census_ids) - len(current), "Remaining count mismatch")
require("JM GameCore" in coverage["explicit_noncounted_suite_participants"],
        "JM GameCore non-count boundary missing")
require("JM GameCore" not in census_ids, "JM GameCore must not be promoted into the 61 identity census")

basis = coverage["coverage_basis"]
flattened_basis = [body_id for group in basis.values() for body_id in group]
require(len(flattened_basis) == len(set(flattened_basis)), "Coverage-basis groups overlap/double-count")
require(set(flattened_basis) == set(current), "Coverage-basis groups do not equal current crowned set")
require(len(flattened_basis) == coverage["current_crowned_count"],
        "Coverage-basis count does not reconstruct current crown")

pending_phase = coverage.get("pending_phase")
if pending:
    require(pending_phase, "Pending identities exist without a named pending phase")
else:
    require(pending_phase is None, "Pending phase is named but pending ID set is empty")

receipt = {
    "schema": "jm.role-qualified-maturation-coverage-validation/1.1",
    "passed": True,
    "census_total": len(census_ids),
    "current_crowned": len(current),
    "remaining": len(census_ids) - len(current),
    "pending_phase": pending_phase,
    "pending_count": len(pending),
    "pending_ids": pending,
    "coverage_groups": {name: len(ids) for name, ids in basis.items()},
    "noncounted_suite_participants": coverage["explicit_noncounted_suite_participants"]
}
print(json.dumps(receipt, indent=2, ensure_ascii=False))
