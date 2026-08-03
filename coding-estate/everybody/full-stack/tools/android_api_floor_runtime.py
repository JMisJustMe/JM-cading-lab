#!/usr/bin/env python3
"""Bind the sovereign Android runtime proof to one exact API/ABI floor."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import android_emulator_runtime as base

SCHEMA = "jm.everybody.android-api-floor-runtime/0.1"


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def clean_prop(value: str) -> str:
    return value.replace("\r", "").strip()


def device_info(adb: Path) -> dict[str, Any]:
    api_raw = clean_prop(
        base.run([str(adb), "shell", "getprop", "ro.build.version.sdk"], timeout=30).stdout
    )
    release = clean_prop(
        base.run([str(adb), "shell", "getprop", "ro.build.version.release"], timeout=30).stdout
    )
    abi = clean_prop(
        base.run([str(adb), "shell", "getprop", "ro.product.cpu.abi"], timeout=30).stdout
    )
    if not api_raw.isdigit():
        raise ValueError(f"Android device did not expose a numeric API level: {api_raw!r}")
    if not release or not abi:
        raise ValueError(f"Android device release/ABI missing: release={release!r} abi={abi!r}")
    return {"runtime_api": int(api_raw), "runtime_release": release, "runtime_abi": abi}


def verify_floor(
    delivery: Path,
    out: Path,
    adb: Path,
    *,
    expected_api: int,
    shard_index: int,
    shard_count: int,
    body_id: str | None,
) -> dict[str, Any]:
    device = device_info(adb)
    if device["runtime_api"] != expected_api:
        raise SystemExit(
            f"Android runtime floor mismatch: expected API {expected_api}, "
            f"recovered API {device['runtime_api']}"
        )

    base_shard = base.verify_shard(
        delivery,
        out,
        adb,
        shard_index=shard_index,
        shard_count=shard_count,
        body_id=body_id,
    )

    receipt_paths = sorted((out / "RECEIPTS").glob("*.json"))
    if len(receipt_paths) != base_shard["body_count"]:
        raise SystemExit(
            f"runtime receipt count drift: expected {base_shard['body_count']}, "
            f"found {len(receipt_paths)}"
        )

    for path in receipt_paths:
        receipt = json.loads(path.read_text(encoding="utf-8"))
        receipt.update(
            {
                "schema": "jm.body.android-api-floor-runtime/0.1",
                "status": "ANDROID_API_FLOOR_INSTALL_LAUNCH_FORCE_STOP_REOPEN_PASS",
                **device,
                "expected_runtime_api": expected_api,
                "claim_boundary": (
                    f"The exact provenance-sealed APK installed, launched, exposed process/focus "
                    f"contact, force-stopped, relaunched and passed scoped crash/ANR scanning on "
                    f"Android API {expected_api} ({device['runtime_release']}, {device['runtime_abi']}). "
                    "Physical devices, release signing, sensors, gestures, performance and "
                    "long-duration stability remain separate gates."
                ),
            }
        )
        write_json(path, receipt)

    shard = {
        **base_shard,
        "schema": SCHEMA,
        "status": "ANDROID_API_FLOOR_RUNTIME_SHARD_PASS",
        **device,
        "expected_runtime_api": expected_api,
        "api_floor_proofs": base_shard["body_count"],
    }
    write_json(out / "SHARD_RECEIPT.json", shard)
    print(json.dumps(shard, ensure_ascii=False, indent=2, sort_keys=True))
    return shard


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delivery", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--adb", type=Path, required=True)
    parser.add_argument("--expected-api", type=int, required=True)
    parser.add_argument("--shard-index", type=int, default=0)
    parser.add_argument("--shard-count", type=int, default=1)
    parser.add_argument("--body-id")
    args = parser.parse_args()
    verify_floor(
        args.delivery.resolve(),
        args.out.resolve(),
        args.adb.resolve(),
        expected_api=args.expected_api,
        shard_index=args.shard_index,
        shard_count=args.shard_count,
        body_id=args.body_id,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
