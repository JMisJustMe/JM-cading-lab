#!/usr/bin/env python3
"""Install, launch, force-stop and relaunch sovereign body APKs on Android."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import time
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-emulator-runtime/0.1"
LOGCAT_SNAPSHOT_ATTEMPTS = 4


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def text_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def is_logcat_snapshot(command: list[str]) -> bool:
    """Return whether this is a read-only ``adb logcat -d`` observation."""
    return len(command) >= 3 and command[1] == "logcat" and "-d" in command[2:]


def run(
    command: list[str],
    *,
    timeout: int = 120,
    allow_failure: bool = False,
) -> subprocess.CompletedProcess[str]:
    """Run a command, recovering only transient ADB logcat snapshot failures.

    Android platform-tools can occasionally return code 255 with no stdout or
    stderr for an otherwise healthy ``adb logcat -d`` request. A failed read is
    never treated as a clean fault window: the device route is re-established
    and the snapshot is retried a bounded number of times. Every other command
    keeps the original one-attempt behaviour.
    """
    attempts = (
        LOGCAT_SNAPSHOT_ATTEMPTS
        if is_logcat_snapshot(command) and not allow_failure
        else 1
    )
    result: subprocess.CompletedProcess[str] | None = None
    failures: list[dict[str, Any]] = []

    for attempt in range(1, attempts + 1):
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        if result.returncode == 0 or allow_failure:
            return result

        failures.append(
            {
                "attempt": attempt,
                "returncode": result.returncode,
                "stdout_sha256": text_sha256(result.stdout),
                "stderr_sha256": text_sha256(result.stderr),
            }
        )
        if attempt < attempts:
            print(
                f"JM_ANDROID_LOGCAT_SNAPSHOT_RETRY:{attempt}:{result.returncode}",
                flush=True,
            )
            subprocess.run(
                [command[0], "wait-for-device"],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            time.sleep(0.5 * attempt)

    assert result is not None
    failure_suffix = ""
    if attempts > 1:
        failure_suffix = f"\nBOUNDED_RETRY_RECEIPT:\n{json.dumps(failures, sort_keys=True)}"
    raise RuntimeError(
        f"command failed ({result.returncode}): {' '.join(command)}\n"
        f"STDOUT:\n{result.stdout[-5000:]}\nSTDERR:\n{result.stderr[-5000:]}"
        f"{failure_suffix}"
    )


def parse_start_wait(text: str) -> dict[str, Any]:
    values: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if separator:
            values[key.strip()] = value.strip()
    status = values.get("Status", "").lower()
    if status != "ok":
        raise ValueError(f"Android activity launch did not report Status: ok: {text[-2000:]}")
    activity = values.get("Activity")
    if not activity:
        raise ValueError("Android activity launch output did not expose Activity")
    numeric: dict[str, int | None] = {}
    for key in ("ThisTime", "TotalTime", "WaitTime"):
        raw = values.get(key)
        numeric[key] = int(raw) if raw and raw.isdigit() else None
    return {
        "status": "ok",
        "activity": activity,
        "launch_state": values.get("LaunchState"),
        "this_time_ms": numeric["ThisTime"],
        "total_time_ms": numeric["TotalTime"],
        "wait_time_ms": numeric["WaitTime"],
        "complete": "Complete" in text,
    }


def parse_pid(text: str) -> list[int]:
    values = [int(item) for item in re.findall(r"\b[0-9]+\b", text)]
    if not values:
        raise ValueError(f"body process did not expose a PID: {text!r}")
    return values


def runtime_faults(logcat: str, package: str) -> list[str]:
    faults: list[str] = []
    if f"ANR in {package}" in logcat:
        faults.append("ANR")
    if f"Process: {package}" in logcat and "FATAL EXCEPTION" in logcat:
        faults.append("FATAL_EXCEPTION")
    if f"Force finishing activity {package}" in logcat:
        faults.append("FORCE_FINISH")
    return faults


def selected_entries(
    entries: list[dict[str, Any]],
    *,
    shard_index: int,
    shard_count: int,
    body_id: str | None = None,
) -> list[dict[str, Any]]:
    ordered = sorted(entries, key=lambda item: str(item["body_id"]))
    if body_id:
        selected = [item for item in ordered if item["body_id"] == body_id]
        if len(selected) != 1:
            raise ValueError(f"expected one provenance entry for {body_id}, found {len(selected)}")
        return selected
    if shard_count < 1 or not 0 <= shard_index < shard_count:
        raise ValueError("invalid emulator shard coordinates")
    return [item for ordinal, item in enumerate(ordered) if ordinal % shard_count == shard_index]


def ensure_focus(adb: Path, package: str, activity: str) -> str:
    result = run([str(adb), "shell", "dumpsys", "activity", "activities"], timeout=60)
    expected_full = f"{package}/{activity}"
    expected_short = f"{package}/.{activity.rsplit('.', 1)[-1]}"
    if expected_full not in result.stdout and expected_short not in result.stdout:
        raise RuntimeError(
            f"resumed activity proof missing for {package}: expected {expected_full} or {expected_short}"
        )
    return result.stdout


def wait_for_process(adb: Path, package: str, *, timeout_seconds: int = 20) -> tuple[list[int], str]:
    deadline = time.monotonic() + timeout_seconds
    last = ""
    while time.monotonic() < deadline:
        result = run([str(adb), "shell", "pidof", package], timeout=30, allow_failure=True)
        last = result.stdout.strip()
        if result.returncode == 0 and last:
            return parse_pid(last), last
        time.sleep(0.5)
    raise RuntimeError(f"process did not become live for {package}; last pidof={last!r}")


def wait_for_process_exit(adb: Path, package: str, *, timeout_seconds: int = 15) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        result = run([str(adb), "shell", "pidof", package], timeout=30, allow_failure=True)
        if result.returncode != 0 or not result.stdout.strip():
            return
        time.sleep(0.5)
    raise RuntimeError(f"process remained live after force-stop for {package}")


def verify_one(adb: Path, delivery: Path, entry: dict[str, Any], out: Path) -> dict[str, Any]:
    body_id = str(entry["body_id"])
    package = str(entry["compiled_manifest"]["package"])
    activity = str(entry["compiled_manifest"]["launchable_activity"])
    component = f"{package}/{activity}"
    apk = delivery / "APKS" / f"{body_id}.apk"
    if not apk.is_file():
        raise RuntimeError(f"missing APK for emulator proof: {body_id}")

    install = run([str(adb), "install", "-r", "-t", str(apk)], timeout=180)
    if "Success" not in install.stdout:
        raise RuntimeError(f"adb install did not report Success for {body_id}: {install.stdout}")

    try:
        run([str(adb), "shell", "am", "force-stop", package], timeout=30)
        wait_for_process_exit(adb, package)
        run([str(adb), "logcat", "-c"], timeout=30)

        first_raw = run(
            [str(adb), "shell", "am", "start", "-W", "-n", component],
            timeout=120,
        ).stdout
        first = parse_start_wait(first_raw)
        if package not in first["activity"]:
            raise RuntimeError(f"first launch resolved to another package for {body_id}: {first}")
        first_pids, first_pid_raw = wait_for_process(adb, package)
        first_focus = ensure_focus(adb, package, activity)

        run([str(adb), "shell", "am", "force-stop", package], timeout=30)
        wait_for_process_exit(adb, package)
        run([str(adb), "logcat", "-c"], timeout=30)

        second_raw = run(
            [str(adb), "shell", "am", "start", "-W", "-n", component],
            timeout=120,
        ).stdout
        second = parse_start_wait(second_raw)
        if package not in second["activity"]:
            raise RuntimeError(f"relaunch resolved to another package for {body_id}: {second}")
        second_pids, second_pid_raw = wait_for_process(adb, package)
        second_focus = ensure_focus(adb, package, activity)
        time.sleep(1)
        logcat = run([str(adb), "logcat", "-d", "-v", "brief"], timeout=60).stdout
        faults = runtime_faults(logcat, package)
        if faults:
            raise RuntimeError(f"runtime faults for {body_id}: {faults}")

        receipt = {
            "schema": "jm.body.android-emulator-runtime/0.1",
            "status": "ANDROID_INSTALL_LAUNCH_FORCE_STOP_REOPEN_PASS",
            "body_id": body_id,
            "package": package,
            "activity": activity,
            "apk_sha256": entry["apk_sha256"],
            "identity_sha256": entry["identity_sha256"],
            "install_success": True,
            "first_launch": first,
            "first_pids": first_pids,
            "first_pid_output_sha256": text_sha256(first_pid_raw),
            "first_focus_sha256": text_sha256(first_focus),
            "force_stop_exit_proof": True,
            "relaunch": second,
            "relaunch_pids": second_pids,
            "relaunch_pid_output_sha256": text_sha256(second_pid_raw),
            "relaunch_focus_sha256": text_sha256(second_focus),
            "runtime_faults": faults,
            "logcat_sha256": text_sha256(logcat),
            "claim_boundary": (
                "APK installation, launch, process/focus presence, force-stop, relaunch and a scoped "
                "crash/ANR scan passed on the configured Android emulator. Physical-device behaviour, "
                "release signing, sensors, gestures and long-duration stability remain separate gates."
            ),
        }
        write_json(out / "RECEIPTS" / f"{body_id}.json", receipt)
        print(f"JM_ANDROID_EMULATOR_REOPEN_PASS:{body_id}", flush=True)
        return receipt
    finally:
        run([str(adb), "uninstall", package], timeout=120, allow_failure=True)


def verify_shard(
    delivery: Path,
    out: Path,
    adb: Path,
    *,
    shard_index: int,
    shard_count: int,
    body_id: str | None,
) -> dict[str, Any]:
    provenance_path = delivery / "ANDROID_APK_PROVENANCE_RECEIPT.json"
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    entries = selected_entries(
        list(provenance["entries"]),
        shard_index=shard_index,
        shard_count=shard_count,
        body_id=body_id,
    )
    out.mkdir(parents=True, exist_ok=True)
    receipts = [verify_one(adb, delivery, entry, out) for entry in entries]
    body_ids = sorted(item["body_id"] for item in receipts)
    shard = {
        "schema": SCHEMA,
        "status": "ANDROID_EMULATOR_RUNTIME_SHARD_PASS",
        "source_status": provenance["status"],
        "shard_index": shard_index,
        "shard_count": shard_count,
        "body_count": len(receipts),
        "body_ids": body_ids,
        "install_proofs": len(receipts),
        "first_launch_proofs": len(receipts),
        "force_stop_proofs": len(receipts),
        "relaunch_proofs": len(receipts),
        "runtime_fault_free_proofs": len(receipts),
    }
    write_json(out / "SHARD_RECEIPT.json", shard)
    print(json.dumps(shard, ensure_ascii=False, indent=2, sort_keys=True))
    return shard


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delivery", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--adb", type=Path, required=True)
    parser.add_argument("--shard-index", type=int, default=0)
    parser.add_argument("--shard-count", type=int, default=1)
    parser.add_argument("--body-id")
    args = parser.parse_args()
    verify_shard(
        args.delivery.resolve(),
        args.out.resolve(),
        args.adb.resolve(),
        shard_index=args.shard_index,
        shard_count=args.shard_count,
        body_id=args.body_id,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
