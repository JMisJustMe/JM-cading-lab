#!/usr/bin/env python3
"""Prove repeated Android lifecycle and recovery contact for sovereign APK bodies."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import traceback
from pathlib import Path
from typing import Any

import android_api_floor_runtime as device_runtime
import android_emulator_runtime as base

SCHEMA = "jm.everybody.android-lifecycle-endurance/0.2"
FORCE_STOP_CYCLES = 3
LAUNCH_CONTACTS_PER_BODY = 8
ROTATION_CONTACTS_PER_BODY = 2


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def text_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def parse_total_pss(text: str) -> int:
    patterns = (
        r"^\s*TOTAL PSS:\s*([0-9][0-9,]*)\b",
        r"^\s*TOTAL\s+([0-9][0-9,]*)\s+",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.MULTILINE)
        if match:
            value = int(match.group(1).replace(",", ""))
            if value > 0:
                return value
    raise ValueError("dumpsys meminfo did not expose a positive TOTAL PSS value")


def setting_value(adb: Path, namespace: str, key: str) -> str:
    return (
        base.run(
            [str(adb), "shell", "settings", "get", namespace, key],
            timeout=30,
        )
        .stdout.replace("\r", "")
        .strip()
    )


def clear_logcat(adb: Path) -> None:
    base.run([str(adb), "logcat", "-c"], timeout=30)


def scan_runtime_window(adb: Path, package: str, *, label: str) -> dict[str, Any]:
    """Inspect only the observation window after a recovery contact.

    Intentional force-stop, process-kill and data-clear commands are followed by
    ``clear_logcat`` before the recovery launch. This keeps Android's expected
    lifecycle-management messages from being misclassified as spontaneous app
    faults while preserving fatal-exception and ANR rejection after recovery.
    """
    time.sleep(0.75)
    logcat = base.run(
        [str(adb), "logcat", "-d", "-v", "brief"],
        timeout=60,
    ).stdout
    faults = base.runtime_faults(logcat, package)
    receipt = {
        "label": label,
        "logcat_sha256": text_sha256(logcat),
        "runtime_faults": faults,
    }
    if faults:
        raise RuntimeError(f"post-recovery runtime faults at {label}: {faults}")
    clear_logcat(adb)
    return receipt


def launch_contact(
    adb: Path,
    package: str,
    activity: str,
    *,
    label: str,
) -> dict[str, Any]:
    component = f"{package}/{activity}"
    raw = base.run(
        [str(adb), "shell", "am", "start", "-W", "-n", component],
        timeout=120,
    ).stdout
    launch = base.parse_start_wait(raw)
    if package not in launch["activity"]:
        raise RuntimeError(f"{label} resolved to another package: {launch}")
    pids, pid_raw = base.wait_for_process(adb, package)
    focus = base.ensure_focus(adb, package, activity)
    return {
        "label": label,
        "launch": launch,
        "pids": pids,
        "pid_output_sha256": text_sha256(pid_raw),
        "focus_sha256": text_sha256(focus),
    }


def rotate_and_prove(
    adb: Path,
    package: str,
    activity: str,
    *,
    rotation: int,
    label: str,
) -> dict[str, Any]:
    base.run(
        [str(adb), "shell", "settings", "put", "system", "accelerometer_rotation", "0"],
        timeout=30,
    )
    base.run(
        [str(adb), "shell", "settings", "put", "system", "user_rotation", str(rotation)],
        timeout=30,
    )
    time.sleep(1.5)
    recovered = setting_value(adb, "system", "user_rotation")
    if recovered != str(rotation):
        raise RuntimeError(
            f"{label} rotation state mismatch: expected {rotation}, recovered {recovered!r}"
        )
    focus = base.ensure_focus(adb, package, activity)
    pids, pid_raw = base.wait_for_process(adb, package)
    return {
        "label": label,
        "requested_rotation": rotation,
        "recovered_rotation": int(recovered),
        "pids": pids,
        "pid_output_sha256": text_sha256(pid_raw),
        "focus_sha256": text_sha256(focus),
    }


def verify_one(
    adb: Path,
    delivery: Path,
    entry: dict[str, Any],
    out: Path,
    *,
    expected_api: int,
    device: dict[str, Any],
) -> dict[str, Any]:
    body_id = str(entry["body_id"])
    package = str(entry["compiled_manifest"]["package"])
    activity = str(entry["compiled_manifest"]["launchable_activity"])
    apk = delivery / "APKS" / f"{body_id}.apk"
    if not apk.is_file():
        raise RuntimeError(f"missing lifecycle APK for {body_id}")

    phase = "install"
    launches: list[dict[str, Any]] = []
    rotations: list[dict[str, Any]] = []
    force_cycles: list[dict[str, Any]] = []
    observation_windows: list[dict[str, Any]] = []
    home_pids: list[int] = []
    home_pid_raw = ""

    try:
        install = base.run([str(adb), "install", "-r", "-t", str(apk)], timeout=180)
        if "Success" not in install.stdout:
            raise RuntimeError(
                f"adb install did not report Success for {body_id}: {install.stdout}"
            )

        phase = "initial_force_stop"
        base.run([str(adb), "shell", "am", "force-stop", package], timeout=30)
        base.wait_for_process_exit(adb, package)
        clear_logcat(adb)

        phase = "cold_start"
        launches.append(launch_contact(adb, package, activity, label="cold_start"))

        phase = "landscape_contact"
        rotations.append(
            rotate_and_prove(
                adb,
                package,
                activity,
                rotation=1,
                label="landscape_contact",
            )
        )
        phase = "portrait_recovery"
        rotations.append(
            rotate_and_prove(
                adb,
                package,
                activity,
                rotation=0,
                label="portrait_recovery",
            )
        )
        observation_windows.append(
            scan_runtime_window(adb, package, label="cold_start_and_rotation_window")
        )

        phase = "home_background"
        base.run([str(adb), "shell", "input", "keyevent", "3"], timeout=30)
        time.sleep(1)
        home_pids, home_pid_raw = base.wait_for_process(adb, package)

        phase = "home_return"
        launches.append(launch_contact(adb, package, activity, label="home_return"))
        observation_windows.append(
            scan_runtime_window(adb, package, label="home_return_window")
        )

        phase = "back_exit"
        base.run([str(adb), "shell", "input", "keyevent", "4"], timeout=30)
        time.sleep(0.5)

        phase = "back_relaunch"
        launches.append(launch_contact(adb, package, activity, label="back_relaunch"))
        observation_windows.append(
            scan_runtime_window(adb, package, label="back_relaunch_window")
        )

        phase = "process_kill"
        base.run([str(adb), "shell", "input", "keyevent", "3"], timeout=30)
        time.sleep(0.75)
        base.run([str(adb), "shell", "am", "kill", package], timeout=30)
        base.wait_for_process_exit(adb, package)
        clear_logcat(adb)

        phase = "process_kill_relaunch"
        launches.append(
            launch_contact(adb, package, activity, label="process_kill_relaunch")
        )
        observation_windows.append(
            scan_runtime_window(adb, package, label="process_kill_relaunch_window")
        )

        phase = "data_clear"
        clear = base.run([str(adb), "shell", "pm", "clear", package], timeout=60)
        if "Success" not in clear.stdout:
            raise RuntimeError(f"pm clear did not report Success for {body_id}: {clear.stdout}")
        base.wait_for_process_exit(adb, package)
        clear_logcat(adb)

        phase = "data_clear_relaunch"
        launches.append(
            launch_contact(adb, package, activity, label="data_clear_relaunch")
        )
        observation_windows.append(
            scan_runtime_window(adb, package, label="data_clear_relaunch_window")
        )

        for cycle in range(1, FORCE_STOP_CYCLES + 1):
            phase = f"force_stop_{cycle}"
            base.run([str(adb), "shell", "am", "force-stop", package], timeout=30)
            base.wait_for_process_exit(adb, package)
            clear_logcat(adb)

            phase = f"force_stop_relaunch_{cycle}"
            contact = launch_contact(
                adb,
                package,
                activity,
                label=f"force_stop_relaunch_{cycle}",
            )
            window = scan_runtime_window(
                adb,
                package,
                label=f"force_stop_relaunch_{cycle}_window",
            )
            force_cycles.append(
                {
                    "cycle": cycle,
                    "process_exit_proof": True,
                    "contact": contact,
                    "observation_window": window,
                }
            )
            launches.append(contact)
            observation_windows.append(window)

        phase = "route_count_verification"
        if len(launches) != LAUNCH_CONTACTS_PER_BODY:
            raise RuntimeError(
                f"lifecycle launch route count drift for {body_id}: {len(launches)}"
            )
        if len(rotations) != ROTATION_CONTACTS_PER_BODY:
            raise RuntimeError(
                f"lifecycle rotation route count drift for {body_id}: {len(rotations)}"
            )
        if len(force_cycles) != FORCE_STOP_CYCLES:
            raise RuntimeError(
                f"lifecycle force-stop route count drift for {body_id}: {len(force_cycles)}"
            )

        phase = "memory_receipt"
        meminfo = base.run(
            [str(adb), "shell", "dumpsys", "meminfo", package],
            timeout=60,
        ).stdout
        total_pss_kb = parse_total_pss(meminfo)

        phase = "final_process_and_focus"
        final_pids, final_pid_raw = base.wait_for_process(adb, package)
        final_focus = base.ensure_focus(adb, package, activity)

        phase = "final_runtime_scan"
        final_window = scan_runtime_window(adb, package, label="final_stability_window")
        observation_windows.append(final_window)

        receipt = {
            "schema": "jm.body.android-lifecycle-endurance/0.2",
            "status": "ANDROID_LIFECYCLE_ENDURANCE_AND_RECOVERY_PASS",
            "body_id": body_id,
            "package": package,
            "activity": activity,
            "apk_sha256": entry["apk_sha256"],
            "identity_sha256": entry["identity_sha256"],
            "expected_runtime_api": expected_api,
            **device,
            "install_success": True,
            "launch_contact_count": len(launches),
            "launches": launches,
            "rotation_contact_count": len(rotations),
            "rotations": rotations,
            "observation_window_count": len(observation_windows),
            "observation_windows": observation_windows,
            "home_background_process_proof": {
                "pids": home_pids,
                "pid_output_sha256": text_sha256(home_pid_raw),
            },
            "home_return_proof": True,
            "back_relaunch_proof": True,
            "process_kill_exit_and_relaunch_proof": True,
            "data_clear_exit_and_relaunch_proof": True,
            "force_stop_cycle_count": len(force_cycles),
            "force_stop_cycles": force_cycles,
            "memory_receipt": {
                "total_pss_kb": total_pss_kb,
                "meminfo_sha256": text_sha256(meminfo),
            },
            "final_pids": final_pids,
            "final_pid_output_sha256": text_sha256(final_pid_raw),
            "final_focus_sha256": text_sha256(final_focus),
            "runtime_faults": [],
            "claim_boundary": (
                "The exact provenance-sealed APK survived cold start, portrait/landscape contact, "
                "Home return, Back relaunch, background process kill/relaunch, data clear/relaunch, "
                f"{FORCE_STOP_CYCLES} force-stop/reopen cycles, memory inspection and isolated "
                f"post-recovery crash/ANR scanning on Android API {expected_api}. Long-duration soak, "
                "physical-device, sensor, release-signing and performance-threshold proof remain "
                "separate gates."
            ),
        }
        write_json(out / "RECEIPTS" / f"{body_id}.json", receipt)
        print(f"JM_ANDROID_LIFECYCLE_ENDURANCE_PASS:{body_id}", flush=True)
        return receipt
    except Exception as exc:
        failure = {
            "schema": "jm.body.android-lifecycle-endurance-failure/0.1",
            "status": "ANDROID_LIFECYCLE_ENDURANCE_FAULT_HOLD",
            "body_id": body_id,
            "package": package,
            "activity": activity,
            "phase": phase,
            "error_type": type(exc).__name__,
            "error": str(exc),
            "traceback": traceback.format_exc(),
            "launch_contacts_completed": len(launches),
            "rotation_contacts_completed": len(rotations),
            "force_stop_cycles_completed": len(force_cycles),
            "observation_windows_completed": len(observation_windows),
            "expected_runtime_api": expected_api,
            **device,
        }
        write_json(out / "FAILURES" / f"{body_id}.json", failure)
        raise
    finally:
        base.run(
            [str(adb), "shell", "settings", "put", "system", "user_rotation", "0"],
            timeout=30,
            allow_failure=True,
        )
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
            f"lifecycle runtime API mismatch: expected {expected_api}, "
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
        )
        for entry in entries
    ]
    body_ids = sorted(item["body_id"] for item in receipts)
    count = len(receipts)
    shard = {
        "schema": SCHEMA,
        "status": "ANDROID_LIFECYCLE_ENDURANCE_SHARD_PASS",
        "source_status": provenance["status"],
        "shard_index": shard_index,
        "shard_count": shard_count,
        "body_count": count,
        "body_ids": body_ids,
        "expected_runtime_api": expected_api,
        **device,
        "install_proofs": count,
        "launch_contact_proofs": count * LAUNCH_CONTACTS_PER_BODY,
        "rotation_contact_proofs": count * ROTATION_CONTACTS_PER_BODY,
        "home_return_proofs": count,
        "back_relaunch_proofs": count,
        "process_kill_relaunch_proofs": count,
        "data_clear_relaunch_proofs": count,
        "force_stop_cycle_proofs": count * FORCE_STOP_CYCLES,
        "memory_receipts": count,
        "runtime_fault_free_proofs": count,
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
    verify_shard(
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
