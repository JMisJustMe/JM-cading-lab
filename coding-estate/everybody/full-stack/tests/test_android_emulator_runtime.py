#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_emulator_runtime as runtime  # noqa: E402


def main() -> int:
    launch = runtime.parse_start_wait(
        """Starting: Intent { cmp=com.jmisjustme.body.cading/.MainActivity }
Status: ok
LaunchState: COLD
Activity: com.jmisjustme.body.cading/.MainActivity
ThisTime: 321
TotalTime: 321
WaitTime: 347
Complete
"""
    )
    assert launch == {
        "status": "ok",
        "activity": "com.jmisjustme.body.cading/.MainActivity",
        "launch_state": "COLD",
        "this_time_ms": 321,
        "total_time_ms": 321,
        "wait_time_ms": 347,
        "complete": True,
    }
    assert runtime.parse_pid("1234 5678\n") == [1234, 5678]
    assert runtime.runtime_faults("clean", "com.example.body") == []
    assert runtime.runtime_faults(
        "FATAL EXCEPTION: main\nProcess: com.example.body, PID: 9",
        "com.example.body",
    ) == ["FATAL_EXCEPTION"]
    assert runtime.runtime_faults("ANR in com.example.body", "com.example.body") == ["ANR"]

    entries = [{"body_id": f"body-{index:03d}"} for index in range(100)]
    shards = [
        runtime.selected_entries(entries, shard_index=index, shard_count=5)
        for index in range(5)
    ]
    assert [len(shard) for shard in shards] == [20, 20, 20, 20, 20]
    assert len({item["body_id"] for shard in shards for item in shard}) == 100
    assert runtime.selected_entries(
        entries,
        shard_index=0,
        shard_count=5,
        body_id="body-042",
    ) == [{"body_id": "body-042"}]

    for broken in ("Status: Error\nActivity: x/.Main", "Status: ok"):
        try:
            runtime.parse_start_wait(broken)
        except ValueError:
            pass
        else:
            raise AssertionError(f"broken launch output was accepted: {broken!r}")

    print("JM ANDROID EMULATOR RUNTIME: LAUNCH/PID/FAULT/SHARD PARSERS PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
