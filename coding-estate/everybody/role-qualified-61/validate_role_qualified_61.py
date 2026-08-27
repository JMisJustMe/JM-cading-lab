#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
DEFAULT_CENSUS = HERE / "JM_61_ROLE_QUALIFIED_CODING_CENSUS.json"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--census", type=Path, default=DEFAULT_CENSUS)
    ap.add_argument("--role-depth-manifest", type=Path)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    data = load(args.census)
    bodies = data["bodies"]

    assert data["historical_engineering_ecology_count"] == 105
    assert data["actual_coding_identity_count"] == 61
    assert data["adjacent_non_code_ecology_count"] == 44
    assert data["unresolved_identity_count"] == 0
    assert len(bodies) == 61

    new_numbers = [int(x["new_no"]) for x in bodies]
    old_ids = [int(x["old_105_id"]) for x in bodies]
    body_ids = [str(x["body_id"]) for x in bodies]
    names = [str(x["name"]) for x in bodies]

    assert new_numbers == list(range(1, 62)), "new role-qualified numbering must be 1..61"
    assert len(set(old_ids)) == 61, "old 105 ids must be unique inside the 61"
    assert all(1 <= x <= 105 for x in old_ids)
    assert len(set(body_ids)) == 61
    assert len(set(names)) == 61
    assert 104 in old_ids, "JM Visualang must remain in the actual-code census"
    for adjacent in (101, 102, 103, 105):
        assert adjacent not in old_ids, f"post-100 adjacent body {adjacent} must not be counted as code"

    tiers: dict[str, int] = {}
    for body in bodies:
        tier = str(body["source_truth_tier"])
        tiers[tier] = tiers.get(tier, 0) + 1
    assert tiers == data["source_truth_tier_counts"]
    assert tiers.get("EXACT_HISTORICAL_NATIVE_EXECUTABLE") == 4
    assert tiers.get("RECONSTRUCTED_EXECUTABLE_DESCENDANT") == 5

    result: dict[str, Any] = {
        "schema": "jm.role-qualified-coding-census-validation/1.0",
        "identity_count": len(bodies),
        "old_105_ids_unique": True,
        "body_ids_unique": True,
        "names_unique": True,
        "source_truth_tier_counts": tiers,
        "engineering_ecology_equation": "61 actual code + 44 adjacent organs = 105 engineering ecology",
        "status": "ROLE_QUALIFIED_61_IDENTITY_PASS",
    }

    if args.role_depth_manifest:
        depth = load(args.role_depth_manifest)
        receipts = depth.get("receipts", [])
        by_id = {str(x.get("body_id")): x for x in receipts}
        missing = [x for x in body_ids if x not in by_id]
        assert not missing, f"61-body role-depth intersection missing: {missing}"
        selected = [by_id[x] for x in body_ids]
        result["role_depth_intersection"] = {
            "source_manifest_body_count": depth.get("body_count"),
            "selected_actual_code_count": len(selected),
            "selected_unique_depth_signatures": len({x.get("body_depth_signature") for x in selected}),
            "selected_bridge_count": sum(
                x.get("bridge_declaration") == "AUTHORISED_FORWARD_ROLE_DEPTH_BRIDGE"
                for x in selected
            ),
            "excluded_ecology_count": int(depth.get("body_count", 0)) - len(selected),
        }
        assert len(selected) == 61
        assert result["role_depth_intersection"]["selected_unique_depth_signatures"] == 61

    text = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
