#!/usr/bin/env python3
"""Aggregate exact-API Android runtime receipts across all sovereign bodies."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-api-floor-runtime-master/0.1"


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
) -> dict[str, Any]:
    shard_paths = sorted(source.rglob("SHARD_RECEIPT.json"))
    body_paths = sorted(source.rglob("RECEIPTS/*.json"))
    if len(shard_paths) != expected_shards:
        raise SystemExit(f"expected {expected_shards} shard receipts, found {len(shard_paths)}")
    if len(body_paths) != expected_bodies:
        raise SystemExit(f"expected {expected_bodies} body receipts, found {len(body_paths)}")

    shards = [load_json(path) for path in shard_paths]
    entries = [load_json(path) for path in body_paths]
    if any(item.get("status") != "ANDROID_API_FLOOR_RUNTIME_SHARD_PASS" for item in shards):
        raise SystemExit("one or more exact-API runtime shards did not pass")
    if any(
        item.get("status") != "ANDROID_API_FLOOR_INSTALL_LAUNCH_FORCE_STOP_REOPEN_PASS"
        for item in entries
    ):
        raise SystemExit("one or more exact-API body runtime receipts did not pass")

    body_ids = [str(item["body_id"]) for item in entries]
    packages = [str(item["package"]) for item in entries]
    runtime_apis = {int(item["runtime_api"]) for item in entries}
    runtime_releases = {str(item["runtime_release"]) for item in entries}
    runtime_abis = {str(item["runtime_abi"]) for item in entries}
    shard_apis = {int(item["runtime_api"]) for item in shards}

    if runtime_apis != {expected_api} or shard_apis != {expected_api}:
        raise SystemExit(
            f"exact Android API floor not preserved: body APIs={runtime_apis}, shard APIs={shard_apis}"
        )
    if len(set(body_ids)) != expected_bodies:
        raise SystemExit("exact-API body IDs are not unique")
    if len(set(packages)) != expected_bodies:
        raise SystemExit("exact-API Android package identities are not unique")
    if sum(int(item["body_count"]) for item in shards) != expected_bodies:
        raise SystemExit("exact-API shard body counts do not federate to the expected body count")
    if any(item.get("runtime_faults") for item in entries):
        raise SystemExit("runtime fault list survived an exact-API passing body receipt")

    entries.sort(key=lambda item: item["body_id"])
    status = (
        f"ANDROID_{expected_bodies}_API{expected_api}_MINIMUM_FLOOR_"
        "INSTALL_LAUNCH_FORCE_STOP_REOPEN_FEDERATION_PASS"
    )
    receipt = {
        "schema": SCHEMA,
        "status": status,
        "expected_runtime_api": expected_api,
        "runtime_apis": sorted(runtime_apis),
        "runtime_releases": sorted(runtime_releases),
        "runtime_abis": sorted(runtime_abis),
        "body_count": expected_bodies,
        "shard_count": expected_shards,
        "unique_body_ids": len(set(body_ids)),
        "unique_packages": len(set(packages)),
        "api_floor_proofs": expected_bodies,
        "install_proofs": expected_bodies,
        "first_launch_proofs": expected_bodies,
        "process_and_focus_proofs": expected_bodies * 2,
        "force_stop_exit_proofs": expected_bodies,
        "relaunch_proofs": expected_bodies,
        "runtime_fault_free_proofs": expected_bodies,
        "entries": entries,
        "claim_boundary": (
            f"All {expected_bodies} exact provenance-sealed debug APKs installed, launched, exposed "
            f"process/focus contact, force-stopped, relaunched and passed scoped crash/ANR scanning "
            f"on Android API {expected_api}, their declared minimum runtime floor. Physical devices, "
            "release signing, sensors, gestures, performance and long-duration stability remain "
            "separate gates."
        ),
    }
    write_json(out / f"JM_ANDROID_{expected_bodies}_API{expected_api}_RUNTIME_RECEIPT.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-api", type=int, required=True)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=5)
    args = parser.parse_args()
    aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_api=args.expected_api,
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
