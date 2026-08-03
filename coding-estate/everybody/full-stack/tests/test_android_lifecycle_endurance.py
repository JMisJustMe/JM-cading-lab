#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_emulator_runtime as emulator_runtime  # noqa: E402
import android_lifecycle_aggregate as aggregate  # noqa: E402
import android_lifecycle_endurance as lifecycle  # noqa: E402


def prove_logcat_snapshot_recovery() -> None:
    command_log: list[list[str]] = []
    snapshot_attempts = 0

    def transient_run(
        command: list[str],
        *,
        capture_output: bool,
        text: bool,
        timeout: int,
        check: bool,
    ) -> subprocess.CompletedProcess[str]:
        nonlocal snapshot_attempts
        command_log.append(command)
        if command[1:] == ["wait-for-device"]:
            return subprocess.CompletedProcess(command, 0, "", "")
        if command[1] == "logcat":
            snapshot_attempts += 1
            if snapshot_attempts < 3:
                return subprocess.CompletedProcess(command, 255, "", "")
            return subprocess.CompletedProcess(command, 0, "I/ActivityTaskManager: clean\n", "")
        raise AssertionError(f"unexpected command in retry proof: {command}")

    with patch.object(emulator_runtime.subprocess, "run", side_effect=transient_run), patch.object(
        emulator_runtime.time,
        "sleep",
        return_value=None,
    ):
        result = emulator_runtime.run(
            ["/sdk/adb", "logcat", "-d", "-v", "brief"],
            timeout=60,
        )

    assert result.returncode == 0
    assert snapshot_attempts == 3
    assert sum(command[1:] == ["wait-for-device"] for command in command_log) == 2

    hard_fail_commands: list[list[str]] = []

    def permanent_failure(
        command: list[str],
        *,
        capture_output: bool,
        text: bool,
        timeout: int,
        check: bool,
    ) -> subprocess.CompletedProcess[str]:
        hard_fail_commands.append(command)
        if command[1:] == ["wait-for-device"]:
            return subprocess.CompletedProcess(command, 0, "", "")
        return subprocess.CompletedProcess(command, 255, "", "")

    with patch.object(emulator_runtime.subprocess, "run", side_effect=permanent_failure), patch.object(
        emulator_runtime.time,
        "sleep",
        return_value=None,
    ):
        try:
            emulator_runtime.run(
                ["/sdk/adb", "logcat", "-d", "-v", "brief"],
                timeout=60,
            )
        except RuntimeError as error:
            message = str(error)
            assert "BOUNDED_RETRY_RECEIPT" in message
            assert '"attempt": 4' in message
        else:
            raise AssertionError("permanent logcat snapshot failure was accepted")

    assert sum(command[1] == "logcat" for command in hard_fail_commands) == 4
    assert sum(command[1:] == ["wait-for-device"] for command in hard_fail_commands) == 3


def main() -> int:
    assert lifecycle.parse_total_pss("TOTAL PSS: 12,345 TOTAL RSS: 30,000\n") == 12345
    assert lifecycle.parse_total_pss("  TOTAL   6,789  100  200  300\n") == 6789
    try:
        lifecycle.parse_total_pss("TOTAL PSS: 0\n")
    except ValueError:
        pass
    else:
        raise AssertionError("zero memory receipt was accepted")

    assert lifecycle.FORCE_STOP_CYCLES == 3
    assert lifecycle.LAUNCH_CONTACTS_PER_BODY == 8
    assert lifecycle.ROTATION_CONTACTS_PER_BODY == 2
    assert emulator_runtime.LOGCAT_SNAPSHOT_ATTEMPTS == 4
    prove_logcat_snapshot_recovery()

    with tempfile.TemporaryDirectory(prefix="jm-lifecycle-aggregate-") as temp:
        source = Path(temp) / "shards"
        out = Path(temp) / "master"
        body_count = 100
        shard_count = 5
        for shard_index in range(shard_count):
            shard_root = source / f"shard-{shard_index}-of-{shard_count}"
            receipt_root = shard_root / "RECEIPTS"
            receipt_root.mkdir(parents=True)
            body_ids = []
            for ordinal in range(shard_index, body_count, shard_count):
                body_id = f"body-{ordinal:03d}"
                body_ids.append(body_id)
                entry = {
                    "schema": "jm.body.android-lifecycle-endurance/0.1",
                    "status": "ANDROID_LIFECYCLE_ENDURANCE_AND_RECOVERY_PASS",
                    "body_id": body_id,
                    "package": f"com.jmisjustme.body.body{ordinal:03d}",
                    "runtime_api": 35,
                    "runtime_release": "15",
                    "runtime_abi": "x86_64",
                    "launch_contact_count": 8,
                    "rotation_contact_count": 2,
                    "home_return_proof": True,
                    "back_relaunch_proof": True,
                    "process_kill_exit_and_relaunch_proof": True,
                    "data_clear_exit_and_relaunch_proof": True,
                    "force_stop_cycle_count": 3,
                    "memory_receipt": {"total_pss_kb": 4096 + ordinal},
                    "runtime_faults": [],
                }
                (receipt_root / f"{body_id}.json").write_text(
                    json.dumps(entry, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8",
                )
            shard = {
                "schema": "jm.everybody.android-lifecycle-endurance/0.1",
                "status": "ANDROID_LIFECYCLE_ENDURANCE_SHARD_PASS",
                "shard_index": shard_index,
                "shard_count": shard_count,
                "body_count": len(body_ids),
                "body_ids": body_ids,
                "runtime_api": 35,
                "launch_contact_proofs": len(body_ids) * 8,
                "rotation_contact_proofs": len(body_ids) * 2,
                "force_stop_cycle_proofs": len(body_ids) * 3,
            }
            (shard_root / "SHARD_RECEIPT.json").write_text(
                json.dumps(shard, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

        receipt = aggregate.aggregate(
            source,
            out,
            expected_api=35,
            expected_bodies=100,
            expected_shards=5,
            launches_per_body=8,
            rotations_per_body=2,
            force_cycles_per_body=3,
        )
        assert receipt["status"] == "ANDROID_100_LIFECYCLE_ENDURANCE_AND_RECOVERY_FEDERATION_PASS"
        assert receipt["runtime_apis"] == [35]
        assert receipt["body_count"] == 100
        assert receipt["launch_contact_proofs"] == 800
        assert receipt["rotation_contact_proofs"] == 200
        assert receipt["force_stop_cycle_proofs"] == 300
        assert receipt["memory_receipts"] == 100
        assert len(receipt["entries"]) == 100

        broken = source / "shard-0-of-5" / "RECEIPTS" / "body-000.json"
        value = json.loads(broken.read_text(encoding="utf-8"))
        value["launch_contact_count"] = 7
        broken.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        try:
            aggregate.aggregate(
                source,
                out,
                expected_api=35,
                expected_bodies=100,
                expected_shards=5,
                launches_per_body=8,
                rotations_per_body=2,
                force_cycles_per_body=3,
            )
        except SystemExit:
            pass
        else:
            raise AssertionError("incomplete lifecycle route was accepted")

    print(
        "JM ANDROID LIFECYCLE: LOGCAT RETRY + COMMA MEMORY PARSER + "
        "5 SHARDS + 100 ENDURANCE RECEIPTS PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
