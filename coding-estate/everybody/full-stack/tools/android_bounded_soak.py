#!/usr/bin/env python3
"""Prove bounded Android cold-start, memory and fault stability for sovereign APK bodies."""
from __future__ import annotations

import argparse
import json
import math
import statistics
import time
import traceback
from pathlib import Path
from typing import Any

import android_api_floor_runtime as device_runtime
import android_emulator_runtime as base
import android_lifecycle_endurance as lifecycle

SCHEMA = "jm.everybody.android-bounded-soak/0.1"
SOAK_CYCLES = 12
MAX_SINGLE_LAUNCH_MS = 15_000
MAX_P95_LAUNCH_MS = 8_000
MAX_PSS_KB = 256 * 1024
MAX_PSS_GROWTH_KB = 64 * 1024
MAX_PSS_SPREAD_KB = 128 * 1024


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def percentile_nearest_rank(values: list[int], percentile: float) -> int:
    if not values:
        raise ValueError("percentile requires at least one value")
    if not 0 < percentile <= 1:
        raise ValueError("percentile must be inside (0, 1]")
    ordered = sorted(values)
    rank = max(1, math.ceil(percentile * len(ordered)))
    return ordered[rank - 1]


def launch_duration_ms(launch: dict[str, Any]) -> int:
    candidates = [
        launch.get("this_time_ms"),
        launch.get("total_time_ms"),
        launch.get("wait_time_ms"),
    ]
    numeric = [int(value) for value in candidates if isinstance(value, int) and value >= 0]
    if not numeric:
        raise RuntimeError(f"Android launch did not expose a numeric duration: {launch}")
    return max(numeric)


def enforce_metrics(metrics: dict[str, int]) -> None:
    checks = (
        ("max_launch_ms", MAX_SINGLE_LAUNCH_MS),
        ("p95_launch_ms", MAX_P95_LAUNCH_MS),
        ("max_pss_kb", MAX_PSS_KB),
        ("pss_growth_kb", MAX_PSS_GROWTH_KB),
        ("pss_spread_kb", MAX_PSS_SPREAD_KB),
    )
    for field, ceiling in checks:
        value = metrics[field]
        if value > ceiling:
            raise RuntimeError(f"bounded soak threshold exceeded: {field}={value} > {ceiling}")


def sample_cycle(
    adb: Path,
    package: str,
    activity: str,
    *,
    cycle: int,
) -> dict[str, Any]:
    base.run([str(adb), "shell", "am", "force-stop", package], timeout=30)
    base.wait_for_process_exit(adb, package)
    lifecycle.clear_logcat(adb)

    contact = lifecycle.launch_contact(
        adb,
        package,
        activity,
        label=f"bounded_soak_cold_start_{cycle}",
    )
    duration_ms = launch_duration_ms(contact["launch"])
    time.sleep(0.6)

    meminfo = base.run(
        [str(adb), "shell", "dumpsys", "meminfo", package],
        timeout=60,
    ).stdout
    total_pss_kb = lifecycle.parse_total_pss(meminfo)
    window = lifecycle.scan_runtime_window(
        adb,
        package,
        label=f"bounded_soak_cycle_{cycle}_window",
    )
    return {
        "cycle": cycle,
        "launch_duration_ms": duration_ms,
        "launch": contact,
        "memory": {
            "total_pss_kb": total_pss_kb,
            "meminfo_sha256": lifecycle.text_sha256(meminfo),
        },
        "observation_window": window,
    }


def verify_one(
    adb: Path,
    delivery: Path,
    entry: dict[str, Any],
    out: Path,
    *,
    expected_api: int,
    device: dict[str, Any],
    cycles: int,
) -> dict[str, Any]:
    body_id = str(entry["body_id"])
    package = str(entry["compiled_manifest"]["package"])
    activity = str(entry["compiled_manifest"]["launchable_activity"])
    apk = delivery / "APKS" / f"{body_id}.apk"
    if not apk.is_file():
        raise RuntimeError(f"missing bounded-soak APK for {body_id}")
    if cycles < 2:
        raise ValueError("bounded soak requires at least two cycles")

    phase = "install"
    current_cycle = 0
    samples: list[dict[str, Any]] = []
    try:
        install = base.run([str(adb), "install", "-r", "-t", str(apk)], timeout=180)
        if "Success" not in install.stdout:
            raise RuntimeError(f"adb install did not report Success for {body_id}: {install.stdout}")

        for current_cycle in range(1, cycles + 1):
            phase = f"bounded_soak_cycle_{current_cycle}"
            samples.append(
                sample_cycle(
                    adb,
                    package,
                    activity,
                    cycle=current_cycle,
                )
            )

        phase = "metric_calculation"
        launch_values = [int(item["launch_duration_ms"]) for item in samples]
        pss_values = [int(item["memory"]["total_pss_kb"]) for item in samples]
        metrics = {
            "min_launch_ms": min(launch_values),
            "median_launch_ms": int(statistics.median(launch_values)),
            "mean_launch_ms": int(round(statistics.fmean(launch_values))),
            "p95_launch_ms": percentile_nearest_rank(launch_values, 0.95),
            "max_launch_ms": max(launch_values),
            "min_pss_kb": min(pss_values),
            "median_pss_kb": int(statistics.median(pss_values)),
            "max_pss_kb": max(pss_values),
            "pss_growth_kb": max(0, pss_values[-1] - pss_values[0]),
            "pss_spread_kb": max(pss_values) - min(pss_values),
        }

        phase = "threshold_enforcement"
        enforce_metrics(metrics)

        phase = "final_process_and_focus"
        final_pids, final_pid_raw = base.wait_for_process(adb, package)
        final_focus = base.ensure_focus(adb, package, activity)

        receipt = {
            "schema": "jm.body.android-bounded-soak/0.1",
            "status": "ANDROID_BOUNDED_SOAK_AND_PERFORMANCE_PASS",
            "body_id": body_id,
            "package": package,
            "activity": activity,
            "apk_sha256": entry["apk_sha256"],
            "identity_sha256": entry["identity_sha256"],
            "expected_runtime_api": expected_api,
            **device,
            "install_success": True,
            "cycle_count": len(samples),
            "cold_start_proofs": len(samples),
            "memory_sample_count": len(samples),
            "fault_free_window_count": len(samples),
            "cycles": samples,
            "metrics": metrics,
            "thresholds": {
                "max_single_launch_ms": MAX_SINGLE_LAUNCH_MS,
                "max_p95_launch_ms": MAX_P95_LAUNCH_MS,
                "max_pss_kb": MAX_PSS_KB,
                "max_pss_growth_kb": MAX_PSS_GROWTH_KB,
                "max_pss_spread_kb": MAX_PSS_SPREAD_KB,
            },
            "final_pids": final_pids,
            "final_pid_output_sha256": lifecycle.text_sha256(final_pid_raw),
            "final_focus_sha256": lifecycle.text_sha256(final_focus),
            "runtime_faults": [],
            "claim_boundary": (
                f"The exact provenance-sealed APK completed {cycles} bounded forced-cold-start cycles "
                f"with launch, process/focus, memory and scoped crash/ANR receipts on Android API "
                f"{expected_api}. This is a bounded machine soak, not a long-duration or physical-device "
                "claim. Release signing, sensors, store publication and device thermal/battery behaviour "
                "remain separate gates."
            ),
        }
        write_json(out / "RECEIPTS" / f"{body_id}.json", receipt)
        print(f"JM_ANDROID_BOUNDED_SOAK_PASS:{body_id}", flush=True)
        return receipt
    except Exception as error:
        failure = {
            "schema": "jm.body.android-bounded-soak-faulthold/0.1",
            "status": "ANDROID_BOUNDED_SOAK_FAULTHOLD",
            "body_id": body_id,
            "package": package,
            "phase": phase,
            "current_cycle": current_cycle,
            "completed_cycles": len(samples),
            "error_type": type(error).__name__,
            "error": str(error),
            "traceback": traceback.format_exc(),
        }
        write_json(out / "FAILURES" / f"{body_id}.json", failure)
        raise
    finally:
        base.run([str(adb), "uninstall", package], timeout=120, allow_failure=True)


def verify_shard(
    delivery: Path,
    out: Path,
    adb: Path,
    *,
    expected_api: int,
    shard_index: int,
    shard_count: int,
    body_id: str | None,
    cycles: int,
) -> dict[str, Any]:
    provenance = json.loads(
        (delivery / "ANDROID_APK_PROVENANCE_RECEIPT.json").read_text(encoding="utf-8")
    )
    entries = base.selected_entries(
        list(provenance["entries"]),
        shard_index=shard_index,
        shard_count=shard_count,
        body_id=body_id,
    )
    device = device_runtime.device_info(adb)
    if device["runtime_api"] != expected_api:
        raise SystemExit(
            f"bounded-soak runtime API mismatch: expected {expected_api}, "
            f"recovered {device['runtime_api']}"
        )

    out.mkdir(parents=True, exist_ok=True)
    receipts = [
        verify_one(
            adb,
            delivery,
            entry,
            out,
            expected_api=expected_api,
            device=device,
            cycles=cycles,
        )
        for entry in entries
    ]
    body_ids = sorted(item["body_id"] for item in receipts)
    count = len(receipts)
    shard = {
        "schema": SCHEMA,
        "status": "ANDROID_BOUNDED_SOAK_SHARD_PASS",
        "source_status": provenance["status"],
        "shard_index": shard_index,
        "shard_count": shard_count,
        "body_count": count,
        "body_ids": body_ids,
        "cycles_per_body": cycles,
        "expected_runtime_api": expected_api,
        **device,
        "install_proofs": count,
        "cold_start_proofs": count * cycles,
        "memory_samples": count * cycles,
        "fault_free_windows": count * cycles,
        "max_launch_ms": max(item["metrics"]["max_launch_ms"] for item in receipts),
        "max_p95_launch_ms": max(item["metrics"]["p95_launch_ms"] for item in receipts),
        "max_pss_kb": max(item["metrics"]["max_pss_kb"] for item in receipts),
        "max_pss_growth_kb": max(item["metrics"]["pss_growth_kb"] for item in receipts),
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
    parser.add_argument("--cycles", type=int, default=SOAK_CYCLES)
    args = parser.parse_args()
    verify_shard(
        args.delivery.resolve(),
        args.out.resolve(),
        args.adb.resolve(),
        expected_api=args.expected_api,
        shard_index=args.shard_index,
        shard_count=args.shard_count,
        body_id=args.body_id,
        cycles=args.cycles,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
