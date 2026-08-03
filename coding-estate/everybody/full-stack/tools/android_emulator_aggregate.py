#!/usr/bin/env python3
"""Aggregate sovereign Android emulator runtime receipts."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-emulator-runtime-master/0.1"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def aggregate(source: Path, out: Path, *, expected_bodies: int, expected_shards: int) -> dict[str, Any]:
    shard_paths = sorted(source.rglob("SHARD_RECEIPT.json"))
    body_paths = sorted(source.rglob("RECEIPTS/*.json"))
    if len(shard_paths) != expected_shards:
        raise SystemExit(f"expected {expected_shards} shard receipts, found {len(shard_paths)}")
    if len(body_paths) != expected_bodies:
        raise SystemExit(f"expected {expected_bodies} body receipts, found {len(body_paths)}")

    shards = [load_json(path) for path in shard_paths]
    entries = [load_json(path) for path in body_paths]
    if any(item.get("status") != "ANDROID_EMULATOR_RUNTIME_SHARD_PASS" for item in shards):
        raise SystemExit("one or more emulator shards did not pass")
    if any(item.get("status") != "ANDROID_INSTALL_LAUNCH_FORCE_STOP_REOPEN_PASS" for item in entries):
        raise SystemExit("one or more body runtime receipts did not pass")

    body_ids = [str(item["body_id"]) for item in entries]
    packages = [str(item["package"]) for item in entries]
    if len(set(body_ids)) != expected_bodies:
        raise SystemExit("body runtime IDs are not unique")
    if len(set(packages)) != expected_bodies:
        raise SystemExit("installed Android package identities are not unique")
    if sum(int(item["body_count"]) for item in shards) != expected_bodies:
        raise SystemExit("shard body counts do not federate to the expected body count")
    if any(item.get("runtime_faults") for item in entries):
        raise SystemExit("runtime fault list survived a passing body receipt")

    entries.sort(key=lambda item: item["body_id"])
    receipt = {
        "schema": SCHEMA,
        "status": "ANDROID_100_EMULATOR_INSTALL_LAUNCH_FORCE_STOP_REOPEN_FEDERATION_PASS",
        "body_count": expected_bodies,
        "shard_count": expected_shards,
        "unique_body_ids": len(set(body_ids)),
        "unique_packages": len(set(packages)),
        "install_proofs": expected_bodies,
        "first_launch_proofs": expected_bodies,
        "process_and_focus_proofs": expected_bodies * 2,
        "force_stop_exit_proofs": expected_bodies,
        "relaunch_proofs": expected_bodies,
        "runtime_fault_free_proofs": expected_bodies,
        "entries": entries,
        "claim_boundary": (
            "All 100 provenance-sealed debug APKs installed, launched, exposed a live process and "
            "resumed activity, force-stopped, relaunched and passed scoped crash/ANR scanning across "
            "the configured API 35 emulator federation. Physical devices, release signing, sensors, "
            "gestures, performance and long-duration stability remain separate gates."
        ),
    }
    write_json(out / "JM_ANDROID_100_EMULATOR_RUNTIME_RECEIPT.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=5)
    args = parser.parse_args()
    aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
