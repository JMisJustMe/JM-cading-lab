#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_api_floor_aggregate as aggregate  # noqa: E402
import android_api_floor_runtime as runtime  # noqa: E402


def main() -> int:
    assert runtime.clean_prop("24\r\n") == "24"
    assert runtime.clean_prop("7.0\n") == "7.0"
    assert runtime.clean_prop("x86_64\r\n") == "x86_64"

    with tempfile.TemporaryDirectory(prefix="jm-api24-runtime-") as temp:
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
                body = {
                    "schema": "jm.body.android-api-floor-runtime/0.1",
                    "status": "ANDROID_API_FLOOR_INSTALL_LAUNCH_FORCE_STOP_REOPEN_PASS",
                    "body_id": body_id,
                    "package": f"com.jmisjustme.body.body{ordinal:03d}",
                    "runtime_api": 24,
                    "runtime_release": "7.0",
                    "runtime_abi": "x86_64",
                    "expected_runtime_api": 24,
                    "install_success": True,
                    "first_launch": {"status": "ok"},
                    "force_stop_exit_proof": True,
                    "relaunch": {"status": "ok"},
                    "runtime_faults": [],
                }
                (receipt_root / f"{body_id}.json").write_text(
                    json.dumps(body, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8",
                )
            shard = {
                "schema": "jm.everybody.android-api-floor-runtime/0.1",
                "status": "ANDROID_API_FLOOR_RUNTIME_SHARD_PASS",
                "shard_index": shard_index,
                "shard_count": shard_count,
                "body_count": len(body_ids),
                "body_ids": body_ids,
                "runtime_api": 24,
                "runtime_release": "7.0",
                "runtime_abi": "x86_64",
                "expected_runtime_api": 24,
                "api_floor_proofs": len(body_ids),
            }
            (shard_root / "SHARD_RECEIPT.json").write_text(
                json.dumps(shard, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

        receipt = aggregate.aggregate(
            source,
            out,
            expected_api=24,
            expected_bodies=100,
            expected_shards=5,
        )
        assert receipt["status"] == (
            "ANDROID_100_API24_MINIMUM_FLOOR_"
            "INSTALL_LAUNCH_FORCE_STOP_REOPEN_FEDERATION_PASS"
        )
        assert receipt["runtime_apis"] == [24]
        assert receipt["runtime_releases"] == ["7.0"]
        assert receipt["runtime_abis"] == ["x86_64"]
        assert receipt["body_count"] == 100
        assert receipt["api_floor_proofs"] == 100
        assert receipt["process_and_focus_proofs"] == 200
        assert len(receipt["entries"]) == 100

        broken = source / "shard-0-of-5" / "RECEIPTS" / "body-000.json"
        value = json.loads(broken.read_text(encoding="utf-8"))
        value["runtime_api"] = 35
        broken.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        try:
            aggregate.aggregate(
                source,
                out,
                expected_api=24,
                expected_bodies=100,
                expected_shards=5,
            )
        except SystemExit:
            pass
        else:
            raise AssertionError("mixed API-level runtime receipts were accepted")

    print("JM ANDROID API FLOOR: 5 SHARDS + 100 API24 BODY RECEIPTS PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
