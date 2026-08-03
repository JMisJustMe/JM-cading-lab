#!/usr/bin/env python3
"""Aggregate five Android bounded-soak shards into one 100-body federation receipt."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

MASTER_SCHEMA = "jm.everybody.android-bounded-soak-master/0.1"


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def aggregate(
    source: Path,
    out: Path,
    *,
    expected_api: int,
    expected_bodies: int,
    expected_shards: int,
    cycles_per_body: int,
) -> dict[str, Any]:
    shard_paths = sorted(source.rglob("SHARD_RECEIPT.json"))
    if len(shard_paths) != expected_shards:
        raise SystemExit(
            f"expected {expected_shards} bounded-soak shard receipts, found {len(shard_paths)}"
        )

    shards = [load_json(path) for path in shard_paths]
    shard_indices = sorted(int(item["shard_index"]) for item in shards)
    if shard_indices != list(range(expected_shards)):
        raise SystemExit(f"bounded-soak shard index drift: {shard_indices}")
    for shard in shards:
        if shard["status"] != "ANDROID_BOUNDED_SOAK_SHARD_PASS":
            raise SystemExit(f"non-passing bounded-soak shard: {shard}")
        if int(shard["runtime_api"]) != expected_api:
            raise SystemExit(f"mixed bounded-soak API receipt: {shard['runtime_api']}")
        if int(shard["cycles_per_body"]) != cycles_per_body:
            raise SystemExit(f"bounded-soak shard cycle drift: {shard['cycles_per_body']}")

    receipt_paths = sorted(source.rglob("RECEIPTS/*.json"))
    entries = [load_json(path) for path in receipt_paths]
    if len(entries) != expected_bodies:
        raise SystemExit(
            f"expected {expected_bodies} bounded-soak body receipts, found {len(entries)}"
        )

    body_ids = [str(item["body_id"]) for item in entries]
    packages = [str(item["package"]) for item in entries]
    if len(set(body_ids)) != expected_bodies:
        raise SystemExit("bounded-soak body IDs are not unique")
    if len(set(packages)) != expected_bodies:
        raise SystemExit("bounded-soak packages are not unique")

    for entry in entries:
        if entry["status"] != "ANDROID_BOUNDED_SOAK_AND_PERFORMANCE_PASS":
            raise SystemExit(f"non-passing bounded-soak body: {entry['body_id']}")
        if int(entry["runtime_api"]) != expected_api:
            raise SystemExit(f"mixed bounded-soak body API: {entry['body_id']}")
        if int(entry["cycle_count"]) != cycles_per_body:
            raise SystemExit(f"bounded-soak cycle drift: {entry['body_id']}")
        if int(entry["cold_start_proofs"]) != cycles_per_body:
            raise SystemExit(f"bounded-soak launch proof drift: {entry['body_id']}")
        if int(entry["memory_sample_count"]) != cycles_per_body:
            raise SystemExit(f"bounded-soak memory proof drift: {entry['body_id']}")
        if int(entry["fault_free_window_count"]) != cycles_per_body:
            raise SystemExit(f"bounded-soak fault-window drift: {entry['body_id']}")
        if entry.get("runtime_faults"):
            raise SystemExit(f"bounded-soak runtime fault survived: {entry['body_id']}")
        metrics = entry["metrics"]
        thresholds = entry["thresholds"]
        checks = (
            ("max_launch_ms", "max_single_launch_ms"),
            ("p95_launch_ms", "max_p95_launch_ms"),
            ("max_pss_kb", "max_pss_kb"),
            ("pss_growth_kb", "max_pss_growth_kb"),
            ("pss_spread_kb", "max_pss_spread_kb"),
        )
        for metric_name, threshold_name in checks:
            if int(metrics[metric_name]) > int(thresholds[threshold_name]):
                raise SystemExit(
                    f"bounded-soak threshold breach survived for {entry['body_id']}: "
                    f"{metric_name}={metrics[metric_name]} > {thresholds[threshold_name]}"
                )

    ordered = sorted(entries, key=lambda item: str(item["body_id"]))
    total_contacts = expected_bodies * cycles_per_body
    master_entries = [
        {
            "body_id": item["body_id"],
            "package": item["package"],
            "apk_sha256": item["apk_sha256"],
            "identity_sha256": item["identity_sha256"],
            "runtime_api": item["runtime_api"],
            "runtime_release": item["runtime_release"],
            "runtime_abi": item["runtime_abi"],
            "cycle_count": item["cycle_count"],
            "cold_start_proofs": item["cold_start_proofs"],
            "memory_sample_count": item["memory_sample_count"],
            "fault_free_window_count": item["fault_free_window_count"],
            "metrics": item["metrics"],
            "thresholds": item["thresholds"],
            "runtime_faults": item["runtime_faults"],
        }
        for item in ordered
    ]
    master = {
        "schema": MASTER_SCHEMA,
        "status": "ANDROID_100_BOUNDED_SOAK_AND_PERFORMANCE_FEDERATION_PASS",
        "body_count": expected_bodies,
        "shard_count": expected_shards,
        "cycles_per_body": cycles_per_body,
        "runtime_apis": sorted({int(item["runtime_api"]) for item in entries}),
        "runtime_releases": sorted({str(item["runtime_release"]) for item in entries}),
        "runtime_abis": sorted({str(item["runtime_abi"]) for item in entries}),
        "install_proofs": expected_bodies,
        "cold_start_proofs": total_contacts,
        "memory_samples": total_contacts,
        "fault_free_windows": total_contacts,
        "max_launch_ms": max(int(item["metrics"]["max_launch_ms"]) for item in entries),
        "max_p95_launch_ms": max(int(item["metrics"]["p95_launch_ms"]) for item in entries),
        "max_pss_kb": max(int(item["metrics"]["max_pss_kb"]) for item in entries),
        "max_pss_growth_kb": max(int(item["metrics"]["pss_growth_kb"]) for item in entries),
        "max_pss_spread_kb": max(int(item["metrics"]["pss_spread_kb"]) for item in entries),
        "runtime_fault_free_proofs": expected_bodies,
        "entries": master_entries,
        "claim_boundary": (
            f"All {expected_bodies} exact APK bodies completed {cycles_per_body} bounded forced-cold-start "
            f"cycles each ({total_contacts} launch, memory and fault-window contacts) on Android API "
            f"{expected_api}, within the declared launch and memory ceilings. This does not claim "
            "long-duration, physical-device, thermal, battery, sensor, release-signing or store proof."
        ),
    }
    out.mkdir(parents=True, exist_ok=True)
    write_json(out / "JM_ANDROID_100_BOUNDED_SOAK_RECEIPT.json", master)
    print(json.dumps(master, ensure_ascii=False, indent=2, sort_keys=True))
    return master


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-api", type=int, required=True)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=5)
    parser.add_argument("--cycles-per-body", type=int, required=True)
    args = parser.parse_args()
    aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_api=args.expected_api,
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
        cycles_per_body=args.cycles_per_body,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
