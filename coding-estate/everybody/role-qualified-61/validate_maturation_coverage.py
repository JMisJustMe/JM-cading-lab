#!/usr/bin/env python3
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CENSUS = HERE / "JM_61_ROLE_QUALIFIED_CODING_CENSUS.json"
COVERAGE = HERE / "MATURATION_COVERAGE.json"
P4 = HERE / "P4_RECOVERED_DONOR_SEATING.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition, message):
    if not condition:
        raise SystemExit(message)


census = load(CENSUS)
coverage = load(COVERAGE)
p4 = load(P4)

census_ids = [row[2] for row in census["identity"]]
current = coverage["current_crowned_ids"]
pending = coverage["pending_p4_ids"]
p4_ids = p4["new_census_ids_if_ci_green"]

require(len(census_ids) == census["counts"]["actual_coding_identities"] == coverage["census_total"] == 61,
        "Census total mismatch")
require(len(census_ids) == len(set(census_ids)), "Duplicate identity in 61 census")
require(len(current) == len(set(current)), "Duplicate current maturation identity")
require(len(pending) == len(set(pending)), "Duplicate pending P4 identity")
require(set(current).isdisjoint(pending), "P4 attempts to recount an already crowned identity")
require(set(current).issubset(census_ids), "Current maturation ledger contains a non-census identity")
require(set(pending).issubset(census_ids), "Pending P4 contains a non-census identity")
require(pending == p4_ids, "P4 manifest and maturation ledger disagree")
require(len(current) == coverage["current_crowned_count"] == 37, "Current crowned count must reconstruct to 37")
require(len(pending) == coverage["pending_p4_count"] == 5, "P4 pending count mismatch")
require(len(current) + len(pending) == coverage["provisional_count_if_p4_green"] == 42,
        "Provisional P4 coverage must be 42 unique identities")
require(coverage["remaining_if_p4_green"] == 61 - 42, "Remaining count mismatch")
require("JM GameCore" in coverage["explicit_noncounted_suite_participants"],
        "JM GameCore non-count boundary missing")
require("JM GameCore" not in census_ids, "JM GameCore must not be promoted into the 61 identity census")

basis = coverage["coverage_basis"]
flattened_basis = [body_id for group in basis.values() for body_id in group]
require(len(flattened_basis) == 37, "Coverage-basis groups must reconstruct exactly 37 entries")
require(len(set(flattened_basis)) == 37, "Coverage-basis groups overlap/double-count")
require(set(flattened_basis) == set(current), "Coverage-basis groups do not equal current crowned set")

receipt = {
    "schema": "jm.role-qualified-maturation-coverage-validation/1.0",
    "passed": True,
    "census_total": len(census_ids),
    "current_crowned": len(current),
    "pending_p4": len(pending),
    "provisional_if_p4_green": len(current) + len(pending),
    "remaining_if_p4_green": len(census_ids) - len(current) - len(pending),
    "p4_ids": pending,
    "noncounted_suite_participants": coverage["explicit_noncounted_suite_participants"]
}
print(json.dumps(receipt, indent=2, ensure_ascii=False))
