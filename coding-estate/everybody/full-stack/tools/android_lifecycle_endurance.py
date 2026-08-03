#!/usr/bin/env python3
"""Prove repeated Android lifecycle and recovery contact for sovereign APK bodies."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any

import android_api_floor_runtime as device_runtime
import android_emulator_runtime as base

SCHEMA = "jm.everybody.android-lifecycle-endurance/0.1"
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
        r"^\s*TOTAL PSS:\s*([0-9]+)\b",
        r"^\s*TOTAL\s+([0-9]+)\s+",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.MULTILINE)
        if match:
            value = int(match.group(1))
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

    install = base.run([str(adb), "install", "-r", "-t", str(apk)], timeout=180)
    if "Success" not in install.stdout:
        raise RuntimeError(f"adb install did not report Success for {body_id}: {install.stdout}")

    launches: list[dict[str, Any]] = []
    rotations: list[dict[str, Any]] = []
    force_cycles: list[dict[str, Any]] = []
    try:
        base.run([str(adb), "shell", "am", "force-stop", package], timeout=30)
        base.wait_for_process_exit(adb, package)
        base.run([str(adb), "logcat", "-c"], timeout=30)

        launches.append(
            launch_contact(adb, package, activity, label="cold_start")
        )

        rotations.append(
            rotate_and_prove(
                adb,
                package,
                activity,
                rotation=1,
                label="landscape_contact",
            )
        )
        rotations.append(
            rotate_and_prove(
                adb,
                package,
                activity,
                rotation=0,
                label="portrait_recovery",
            )
        )

        base.run([str(adb), "shell", "input", "keyevent", "3"], timeout=30)
        time.sleep(1)
        home_pids, home_pid_raw = base.wait_for_process(adb, package)
        launches.append(
            launch_contact(adb, package, activity, label="home_return")
        )

        base.run([str(adb), "shell", "input", "keyevent", "4"], timeout=30)
        time.sleep(0.5)
        launches.append(
            launch_contact(adb, package, activity, label="back_relaunch")
        )

        base.run([str(adb), "shell", "input", "keyevent", "3"], timeout=30)
        time.sleep(0.5)
        base.run([str(adb), "shell", "am", "kill", package], timeout=30)
        base.wait_for_process_exit(adb, package)
        launches.append(
            launch_contact(adb, package, activity, label="process_kill_relaunch")
        )

        clear = base.run([str(adb), "shell", "pm", "clear", package], timeout=60)
        if "Success" not in clear.stdout:
            raise RuntimeError(f"pm clear did not report Success for {body_id}: {clear.stdout}")
        base.wait_for_process_exit(adb, package)
        launches.append(
            launch_contact(adb, package, activity, label="data_clear_relaunch")
        )

        for cycle in range(1, FORCE_STOP_CYCLES + 1):
            base.run([str(adb), "shell", "am", "force-stop", package], timeout=30)
            base.wait_for_process_exit(adb, package)
            contact = launch_contact(
                adb,
                package,
                activity,
                label=f"force_stop_relaunch_{cycle}",
            )
            force_cycles.append(
                {
                    "cycle": cycle,
                    "process_exit_proof": True,
                    "contact": contact,
                }
            )
            launches.append(contact)

        if len(launches) != LAUNCH_CONTACTS_PER_BODY:
            raise RuntimeError(
                f"lifecycle launch route count drift for {body_id}: {len(launches)}"
            )

        meminfo = base.run(
            [str(adb), "shell", "dumpsys", "meminfo", package],
            timeout=60,
        ).stdout
        total_pss_kb = parse_total_pss(meminfo)
        final_pids, final_pid_raw = base.wait_for_process(adb, package)
        final_focus = base.ensure_focus(adb, package, activity)

        time.sleep(1)
        logcat = base.run(
            [str(adb), "logcat", "-d", "-v", "brief"],
            timeout=60,
        ).stdout
        faults = base.runtime_faults(logcat, package)
        if faults:
            raise RuntimeError(f"lifecycle runtime faults for {body_id}: {faults}")

        receipt = {
            "schema": "jm.body.android-lifecycle-endurance/0.1",
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
            "runtime_faults": faults,
            "logcat_sha256": text_sha256(logcat),
            "claim_boundary": (
                "The exact provenance-sealed APK survived cold start, portrait/landscape contact, "
                "Home return, Back relaunch, background process kill/relaunch, data clear/relaunch, "
                f"{FORCE_STOP_CYCLES} force-stop/reopen cycles, memory inspection and scoped crash/ANR "
                f"scanning on Android API {expected_api}. Long-duration soak, physical-device, sensor, "
                "release-signing and performance-threshold proof remain separate gates."
            ),
        }
        write_json(out / "RECEIPTS" / f"{body_id}.json", receipt)
        print(f"JM_ANDROID_LIFECYCLE_ENDURANCE_PASS:{body_id}", flush=True)
        return receipt
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
