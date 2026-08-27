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
    counts = data["counts"]
    rows = data["identity"]
    groups = data["source_truth_groups"]

    assert counts == {
        "engineering_ecology": 105,
        "actual_coding_identities": 61,
        "adjacent_non_code_organs": 44,
        "unresolved": 0,
    }
    assert len(rows) == 61

    new_numbers = [int(r[0]) for r in rows]
    old_ids = [int(r[1]) for r in rows]
    body_ids = [str(r[2]) for r in rows]
    names = [str(r[3]) for r in rows]

    assert new_numbers == list(range(1, 62)), "new role-qualified numbering must be 1..61"
    assert len(set(old_ids)) == 61, "old 105 ids must be unique inside the 61"
    assert all(1 <= x <= 105 for x in old_ids)
    assert len(set(body_ids)) == 61
    assert len(set(names)) == 61
    assert 104 in old_ids, "JM Visualang must remain in the actual-code census"
    for adjacent in (101, 102, 103, 105):
        assert adjacent not in old_ids, f"post-100 adjacent body {adjacent} must not be counted as code"

    expected_tier_counts = {
        "FORWARD_NATIVE_CURRENT_SPEC_HISTORICAL_SOURCE_OPEN": 24,
        "RECOVERED_WORKING_PROFILE": 27,
        "RECONSTRUCTED_EXECUTABLE_DESCENDANT": 5,
        "EXACT_HISTORICAL_NATIVE_EXECUTABLE": 4,
        "RECOVERED_STANDALONE_NATIVE_LINE": 1,
    }
    actual_tier_counts = {k: len(v) for k, v in groups.items()}
    assert actual_tier_counts == expected_tier_counts, (actual_tier_counts, expected_tier_counts)

    flattened = [str(body_id) for members in groups.values() for body_id in members]
    assert len(flattened) == 61, "source-truth groups must contain exactly 61 seats"
    assert len(set(flattened)) == 61, "source-truth groups must not overlap"
    assert set(flattened) == set(body_ids), "source-truth groups must cover every and only actual code identity"

    assert data["priority"]["P0_reconstructed_source_recovery"] == [
        "jmlogic", "kocodifying", "codifying", "jmp", "mark-level-syntax"
    ]
    assert set(data["post_100"]["actual_code"]) == {"jm-visualang"}
    assert set(data["post_100"]["adjacent_ecology"]) == {
        "jaggedmirror", "jm-actual-engine", "jm-describe-into-reality-engine", "jm-living-diagram-motion-layer"
    }

    result: dict[str, Any] = {
        "schema": "jm.role-qualified-coding-census-validation/1.1",
        "identity_count": len(rows),
        "old_105_ids_unique": True,
        "body_ids_unique": True,
        "names_unique": True,
        "source_truth_tier_counts": actual_tier_counts,
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
