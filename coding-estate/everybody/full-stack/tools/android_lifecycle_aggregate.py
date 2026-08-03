#!/usr/bin/env python3
"""Aggregate repeated Android lifecycle/endurance receipts for all sovereign bodies."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-lifecycle-endurance-master/0.1"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def aggregate(
    source: Path,
    out: Path,
    *,
    expected_api: int,
    expected_bodies: int,
    expected_shards: int,
    launches_per_body: int,
    rotations_per_body: int,
    force_cycles_per_body: int,
) -> dict[str, Any]:
    shard_paths = sorted(source.rglob("SHARD_RECEIPT.json"))
    body_paths = sorted(source.rglob("RECEIPTS/*.json"))
    if len(shard_paths) != expected_shards:
        raise SystemExit(f"expected {expected_shards} lifecycle shard receipts, found {len(shard_paths)}")
    if len(body_paths) != expected_bodies:
        raise SystemExit(f"expected {expected_bodies} lifecycle body receipts, found {len(body_paths)}")

    shards = [load_json(path) for path in shard_paths]
    entries = [load_json(path) for path in body_paths]
    if any(item.get("status") != "ANDROID_LIFECYCLE_ENDURANCE_SHARD_PASS" for item in shards):
        raise SystemExit("one or more lifecycle shards did not pass")
    if any(item.get("status") != "ANDROID_LIFECYCLE_ENDURANCE_AND_RECOVERY_PASS" for item in entries):
        raise SystemExit("one or more body lifecycle receipts did not pass")

    body_ids = [str(item["body_id"]) for item in entries]
    packages = [str(item["package"]) for item in entries]
    runtime_apis = {int(item["runtime_api"]) for item in entries}
    if runtime_apis != {expected_api}:
        raise SystemExit(f"lifecycle runtime API drift: {runtime_apis}")
    if len(set(body_ids)) != expected_bodies:
        raise SystemExit("lifecycle body IDs are not unique")
    if len(set(packages)) != expected_bodies:
        raise SystemExit("lifecycle package identities are not unique")
    if sum(int(item["body_count"]) for item in shards) != expected_bodies:
        raise SystemExit("lifecycle shard counts do not federate to the expected body count")

    for entry in entries:
        body_id = entry["body_id"]
        if entry.get("launch_contact_count") != launches_per_body:
            raise SystemExit(f"launch contact count drift for {body_id}")
        if entry.get("rotation_contact_count") != rotations_per_body:
            raise SystemExit(f"rotation contact count drift for {body_id}")
        if entry.get("force_stop_cycle_count") != force_cycles_per_body:
            raise SystemExit(f"force-stop cycle count drift for {body_id}")
        if int(entry.get("memory_receipt", {}).get("total_pss_kb", 0)) <= 0:
            raise SystemExit(f"positive memory receipt missing for {body_id}")
        if entry.get("runtime_faults"):
            raise SystemExit(f"runtime fault survived passing lifecycle receipt for {body_id}")

    entries.sort(key=lambda item: item["body_id"])
    receipt = {
        "schema": SCHEMA,
        "status": "ANDROID_100_LIFECYCLE_ENDURANCE_AND_RECOVERY_FEDERATION_PASS",
        "expected_runtime_api": expected_api,
        "runtime_apis": sorted(runtime_apis),
        "body_count": expected_bodies,
        "shard_count": expected_shards,
        "unique_body_ids": len(set(body_ids)),
        "unique_packages": len(set(packages)),
        "install_proofs": expected_bodies,
        "launch_contact_proofs": expected_bodies * launches_per_body,
        "rotation_contact_proofs": expected_bodies * rotations_per_body,
        "home_return_proofs": expected_bodies,
        "back_relaunch_proofs": expected_bodies,
        "process_kill_relaunch_proofs": expected_bodies,
        "data_clear_relaunch_proofs": expected_bodies,
        "force_stop_cycle_proofs": expected_bodies * force_cycles_per_body,
        "memory_receipts": expected_bodies,
        "runtime_fault_free_proofs": expected_bodies,
        "entries": entries,
        "claim_boundary": (
            f"All {expected_bodies} exact provenance-sealed debug APKs survived repeated lifecycle "
            f"and recovery contact on Android API {expected_api}: cold start, orientation transitions, "
            "Home return, Back relaunch, background process kill/relaunch, app-data clear/relaunch, "
            f"{force_cycles_per_body} force-stop/reopen cycles, memory inspection and scoped crash/ANR "
            "scanning. Long-duration soak, physical devices, sensors, release signing and explicit "
            "performance thresholds remain separate gates."
        ),
    }
    write_json(out / "JM_ANDROID_100_LIFECYCLE_ENDURANCE_RECEIPT.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-api", type=int, default=35)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=5)
    parser.add_argument("--launches-per-body", type=int, default=8)
    parser.add_argument("--rotations-per-body", type=int, default=2)
    parser.add_argument("--force-cycles-per-body", type=int, default=3)
    args = parser.parse_args()
    aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_api=args.expected_api,
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
        launches_per_body=args.launches_per_body,
        rotations_per_body=args.rotations_per_body,
        force_cycles_per_body=args.force_cycles_per_body,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
