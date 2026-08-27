#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
CENSUS = HERE / "JM_61_ROLE_QUALIFIED_CODING_CENSUS.json"
DONORS = HERE / "P1_FOUNDATION_DONOR_MAP.json"
MATURATION = HERE / "P1_FOUNDATION_BRIDGE_MATURATION.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    census = load(CENSUS)
    donors = load(DONORS)
    maturation = load(MATURATION)
    bodies = donors["bodies"]

    assert donors["scope_count"] == 14 == len(bodies)
    body_ids = [b["body_id"] for b in bodies]
    assert len(set(body_ids)) == 14
    assert body_ids == census["priority"]["P1_foundation_native_depth"], (
        "Foundation donor map must preserve the current P1 authority order",
        body_ids,
        census["priority"]["P1_foundation_native_depth"],
    )

    expected_classes = {
        "EXACT_NATIVE_RECOVERED_SUBSET": 2,
        "SPECIALIST_CURRENT_NATIVE_DONOR": 8,
        "RECOVERED_WORKING_PROFILE_PLUS_DECLARED_BRIDGE": 4,
    }
    actual_classes = {}
    missing = []
    for body in bodies:
        cls = body["donor_class"]
        actual_classes[cls] = actual_classes.get(cls, 0) + 1
        assert body.get("claim_boundary"), f"{body['body_id']} lacks claim boundary"
        assert body.get("next_native_gate"), f"{body['body_id']} lacks next gate"
        donors_for_body = body.get("strongest_donors") or []
        assert donors_for_body, f"{body['body_id']} has no donor path"
        for rel in donors_for_body:
            if not (REPO / rel).exists():
                missing.append(str(rel))

    assert actual_classes == expected_classes, (actual_classes, expected_classes)
    assert not missing, f"Missing donor paths: {missing}"

    bridge_ids = {
        b["body_id"] for b in bodies
        if b["donor_class"] == "RECOVERED_WORKING_PROFILE_PLUS_DECLARED_BRIDGE"
    }
    assert bridge_ids == {"os-coding", "codehand", "onebody-ir", "theoc"}

    exact_ids = {
        b["body_id"] for b in bodies
        if b["donor_class"] == "EXACT_NATIVE_RECOVERED_SUBSET"
    }
    assert exact_ids == {"cading", "quadze"}

    maturation_bodies = maturation.get("bodies", [])
    maturation_ids = {body["body_id"] for body in maturation_bodies}
    assert maturation_ids == bridge_ids, (maturation_ids, bridge_ids)
    bridge_missing = []
    for body in maturation_bodies:
        assert body.get("historicalRecoveryClaim") is False
        for key in ("implementation", "selftest"):
            rel = body[key]
            if not (REPO / rel).exists():
                bridge_missing.append(rel)
        for rel in body.get("donors", []):
            if not (REPO / rel).exists():
                bridge_missing.append(rel)
    assert not bridge_missing, f"Missing bridge maturation paths: {bridge_missing}"

    result = {
        "schema": "jm.role-qualified-foundation-donor-validation/1.1",
        "foundation_count": len(bodies),
        "donor_class_counts": actual_classes,
        "bridge_ids": sorted(bridge_ids),
        "bridge_implementations_present": True,
        "bridge_maturation_status": maturation["status"],
        "exact_native_ids": sorted(exact_ids),
        "all_donor_paths_exist": True,
        "status": "P1_FOUNDATION_DONOR_AND_BRIDGE_MAP_PASS",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
