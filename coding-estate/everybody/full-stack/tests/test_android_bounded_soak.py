#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_bounded_soak as soak  # noqa: E402
import android_bounded_soak_aggregate as aggregate  # noqa: E402


def synthetic_body(ordinal: int, cycles: int) -> dict[str, object]:
    launch_values = [200 + ordinal + cycle for cycle in range(cycles)]
    pss_values = [60_000 + ordinal + cycle * 10 for cycle in range(cycles)]
    metrics = {
        "min_launch_ms": min(launch_values),
        "median_launch_ms": launch_values[len(launch_values) // 2],
        "mean_launch_ms": int(sum(launch_values) / len(launch_values)),
        "p95_launch_ms": soak.percentile_nearest_rank(launch_values, 0.95),
        "max_launch_ms": max(launch_values),
        "min_pss_kb": min(pss_values),
        "median_pss_kb": pss_values[len(pss_values) // 2],
        "max_pss_kb": max(pss_values),
        "pss_growth_kb": pss_values[-1] - pss_values[0],
        "pss_spread_kb": max(pss_values) - min(pss_values),
    }
    return {
        "schema": "jm.body.android-bounded-soak/0.1",
        "status": "ANDROID_BOUNDED_SOAK_AND_PERFORMANCE_PASS",
        "body_id": f"body-{ordinal:03d}",
        "package": f"com.jmisjustme.body.body{ordinal:03d}",
        "apk_sha256": f"apk-{ordinal:064d}"[-64:],
        "identity_sha256": f"identity-{ordinal:064d}"[-64:],
        "runtime_api": 35,
        "runtime_release": "15",
        "runtime_abi": "x86_64",
        "cycle_count": cycles,
        "cold_start_proofs": cycles,
        "memory_sample_count": cycles,
        "fault_free_window_count": cycles,
        "metrics": metrics,
        "thresholds": {
            "max_single_launch_ms": soak.MAX_SINGLE_LAUNCH_MS,
            "max_p95_launch_ms": soak.MAX_P95_LAUNCH_MS,
            "max_pss_kb": soak.MAX_PSS_KB,
            "max_pss_growth_kb": soak.MAX_PSS_GROWTH_KB,
            "max_pss_spread_kb": soak.MAX_PSS_SPREAD_KB,
        },
        "runtime_faults": [],
    }


def main() -> int:
    assert soak.SOAK_CYCLES == 12
    assert soak.percentile_nearest_rank([1, 2, 3, 4], 0.50) == 2
    assert soak.percentile_nearest_rank(list(range(1, 13)), 0.95) == 12
    assert soak.launch_duration_ms(
        {"this_time_ms": 100, "total_time_ms": 120, "wait_time_ms": 140}
    ) == 140

    healthy_metrics = {
        "max_launch_ms": soak.MAX_SINGLE_LAUNCH_MS,
        "p95_launch_ms": soak.MAX_P95_LAUNCH_MS,
        "max_pss_kb": soak.MAX_PSS_KB,
        "pss_growth_kb": soak.MAX_PSS_GROWTH_KB,
        "pss_spread_kb": soak.MAX_PSS_SPREAD_KB,
    }
    soak.enforce_metrics(healthy_metrics)
    broken_metrics = dict(healthy_metrics)
    broken_metrics["p95_launch_ms"] += 1
    try:
        soak.enforce_metrics(broken_metrics)
    except RuntimeError:
        pass
    else:
        raise AssertionError("bounded-soak threshold breach was accepted")

    with tempfile.TemporaryDirectory(prefix="jm-bounded-soak-") as temp:
        source = Path(temp) / "shards"
        out = Path(temp) / "master"
        cycles = soak.SOAK_CYCLES
        body_count = 100
        shard_count = 5

        for shard_index in range(shard_count):
            root = source / f"artifact-{shard_index}" / f"soak-shard-{shard_index}-of-5"
            receipts = root / "RECEIPTS"
            receipts.mkdir(parents=True)
            body_ids: list[str] = []
            for ordinal in range(shard_index, body_count, shard_count):
                body = synthetic_body(ordinal, cycles)
                body_id = str(body["body_id"])
                body_ids.append(body_id)
                (receipts / f"{body_id}.json").write_text(
                    json.dumps(body, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8",
                )
            shard = {
                "schema": "jm.everybody.android-bounded-soak/0.1",
                "status": "ANDROID_BOUNDED_SOAK_SHARD_PASS",
                "shard_index": shard_index,
                "shard_count": shard_count,
                "body_count": len(body_ids),
                "body_ids": body_ids,
                "cycles_per_body": cycles,
                "runtime_api": 35,
                "cold_start_proofs": len(body_ids) * cycles,
                "memory_samples": len(body_ids) * cycles,
                "fault_free_windows": len(body_ids) * cycles,
            }
            (root / "SHARD_RECEIPT.json").write_text(
                json.dumps(shard, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

        master = aggregate.aggregate(
            source,
            out,
            expected_api=35,
            expected_bodies=100,
            expected_shards=5,
            cycles_per_body=cycles,
        )
        assert master["status"] == "ANDROID_100_BOUNDED_SOAK_AND_PERFORMANCE_FEDERATION_PASS"
        assert master["body_count"] == 100
        assert master["cycles_per_body"] == 12
        assert master["cold_start_proofs"] == 1200
        assert master["memory_samples"] == 1200
        assert master["fault_free_windows"] == 1200
        assert master["runtime_apis"] == [35]
        assert master["runtime_releases"] == ["15"]
        assert master["runtime_abis"] == ["x86_64"]
        assert len(master["entries"]) == 100

        broken = source / "artifact-0" / "soak-shard-0-of-5" / "RECEIPTS" / "body-000.json"
        value = json.loads(broken.read_text(encoding="utf-8"))
        value["cycle_count"] = cycles - 1
        broken.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        try:
            aggregate.aggregate(
                source,
                out,
                expected_api=35,
                expected_bodies=100,
                expected_shards=5,
                cycles_per_body=cycles,
            )
        except SystemExit:
            pass
        else:
            raise AssertionError("incomplete bounded-soak route was accepted")

    print(
        "JM ANDROID BOUNDED SOAK: PERCENTILES + THRESHOLDS + "
        "5 SHARDS + 100 BODIES + 1,200 CONTACTS PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
