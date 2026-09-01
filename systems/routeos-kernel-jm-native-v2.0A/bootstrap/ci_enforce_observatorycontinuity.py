#!/usr/bin/env python3
"""Final v2.0A machine/visual gate.

This gate deliberately distinguishes singular state transitions from repeated proof of
continuation. Body 1 is expected to cross PermissionGate many times after recovery;
that repetition is evidence, not duplication drift.
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def marker_count(text: str, marker: str) -> int:
    return text.count(marker)


def unique_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse serial replay from JMTRACE-DUMP by stable event identity."""
    seen: set[tuple[int, int, str, int, int, int]] = set()
    result: list[dict[str, Any]] = []
    for event in events:
        key = (
            int(event["sequence"]),
            int(event["tick"]),
            str(event["kind"]),
            int(event["body"]),
            int(event["vector"]),
            int(event["value"]),
        )
        if key not in seen:
            seen.add(key)
            result.append(event)
    return result


def main() -> None:
    if len(sys.argv) != 7:
        raise SystemExit(
            "usage: ci_enforce_observatorycontinuity.py "
            "TRACE KERNEL ELF RECEIPT DECODED OBSERVATORY_HTML"
        )

    trace_path, kernel_path, elf_path, receipt_path, decoded_path, html_path = map(
        Path, sys.argv[1:]
    )
    trace = trace_path.read_text(encoding="utf-8", errors="replace")
    kernel = kernel_path.read_text(encoding="utf-8")
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    decoded = json.loads(decoded_path.read_text(encoding="utf-8"))
    html = html_path.read_text(encoding="utf-8")

    source_sha = "d36b935c3a5ee6b467c469045b7bfa200589f87196fac8b4dc4c611f98080271"
    identity = (
        "[JM] OBSERVATORYCONTINUITYROUTE GENERATED v2.0A SOURCE "
        f"{source_sha} ACTIVE"
    )
    singular_markers = {
        identity: 1,
        "ORCHESTRATIONROUTE GENERATED v1.9A": 1,
        "[JMHEALTH] checks=6 passed=6 state=PASS": 1,
        "[JMCAP] version=v2.0A": 1,
        "INVALID OPCODE CAUGHT": 1,
        "RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES": 1,
    }
    for marker, expected in singular_markers.items():
        require(
            marker_count(trace, marker) == expected,
            f"marker count mismatch: {marker}",
        )

    fault_marker = "INVALID OPCODE CAUGHT"
    quarantine_marker = "kind=QUARANTINE body=2 vector=6"
    recovery_marker = "RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES"
    safe_marker = (
        "[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ -> "
        "PERMISSIONGATE PASS -> KERNEL TRACE RETURN"
    )
    fault_pos = trace.index(fault_marker)
    quarantine_pos = trace.find(quarantine_marker, fault_pos)
    recovery_pos = trace.find(recovery_marker, fault_pos)
    safe_pos = trace.find(safe_marker, recovery_pos)
    require(quarantine_pos > fault_pos, "Body 2 quarantine did not follow its fault")
    require(recovery_pos > quarantine_pos, "RecoveryBody did not follow quarantine")
    require(safe_pos > recovery_pos, "safe Body 1 did not continue after recovery")
    safe_calls = marker_count(trace[recovery_pos:], safe_marker)
    require(safe_calls >= 1, "no safe Body 1 calls occurred after recovery")

    for hook in [
        "JM_TRACE_EVENT_SCHEDULE",
        "JM_TRACE_EVENT_SYSCALL_PASS",
        "JM_TRACE_EVENT_SYSCALL_YIELD",
        "JM_TRACE_EVENT_SYSCALL_DENY",
        "jm_generated_recoverypolicy_fault",
        "jm_generated_healthprobe_boot",
        "jm_generated_capabilitymanifest_emit",
    ]:
        require(hook in kernel, f"integrated hook missing: {hook}")
    require(
        kernel.count("/* GENERATED OBSERVATORYCONTINUITYROUTE v2.0A") == 1,
        "generated v2.0A office must be mounted exactly once",
    )
    require(receipt.get("hook_count") == 8, "integration receipt hook count drift")
    require(
        receipt.get("old_authority_removed") is False,
        "v2.0A must not remove inherited authority",
    )

    nm_output = subprocess.check_output(["nm", "-n", str(elf_path)], text=True)
    names = {parts[-1] for line in nm_output.splitlines() if (parts := line.split())}
    for symbol in [
        "jm_generated_observatorycontinuity_announce",
        "jm_generated_traceledger_record",
        "jm_generated_recoverypolicy_fault",
        "jm_generated_healthprobe_boot",
        "jm_generated_ignitionbody",
    ]:
        require(symbol in names, f"retained ELF symbol missing: {symbol}")

    health = decoded.get("health") or {}
    require(health.get("state") == "PASS", "decoded health state is not PASS")
    require(
        health.get("checks") == 6 and health.get("passed") == 6,
        "decoded health count drift",
    )
    capability = decoded.get("capability") or {}
    require(capability.get("version") == "v2.0A", "decoded capability version drift")
    require(capability.get("trace_capacity") == 128, "decoded trace capacity drift")
    require(capability.get("fault_budget") == 1, "decoded fault budget drift")
    require(capability.get("bodies") == 2, "decoded body-count drift")

    containment = decoded.get("fault_containment") or {}
    decoded_safe_calls = int(containment.get("safe_body_1_calls_after_recovery", 0))
    require(containment.get("fault_seen") is True, "decoded fault missing")
    require(containment.get("recovery_seen") is True, "decoded recovery missing")
    require(decoded_safe_calls >= 1, "decoded safe continuation missing")
    # QEMU may finish writing the final serial line while the decoder snapshot is taken.
    # Both independent views must prove continuation; an exact timed count is not authority.
    require(
        abs(decoded_safe_calls - safe_calls) <= 2,
        "decoded/raw post-recovery continuation counts diverge materially",
    )

    events = unique_events(list(decoded.get("events") or []))
    require(len(events) >= 6, "too few unique structured events")
    sequences = [int(event["sequence"]) for event in events]
    # Receipt-only events are emitted live, while schedule/syscall events can first
    # appear later inside the bounded recovery dump. Sequence identity, not serial
    # line order, is the authoritative ordering key.
    require(all(sequence > 0 for sequence in sequences), "invalid event sequence")
    require(len(sequences) == len(set(sequences)), "event sequence identities collide")
    counts = Counter(str(event["kind"]) for event in events)
    for kind in ["BOOT_READY", "HEALTH_PASS", "FAULT", "QUARANTINE", "RECOVERY", "CONTINUE"]:
        require(counts[kind] >= 1, f"unique structured event missing: {kind}")
    for kind in ["FAULT", "QUARANTINE", "RECOVERY"]:
        require(counts[kind] == 1, f"unique {kind} transition must occur exactly once")

    by_kind = {
        kind: next(event for event in events if event["kind"] == kind)
        for kind in ["FAULT", "QUARANTINE", "RECOVERY"]
    }
    require(
        int(by_kind["FAULT"]["sequence"])
        < int(by_kind["QUARANTINE"]["sequence"])
        < int(by_kind["RECOVERY"]["sequence"]),
        "structured fault/quarantine/recovery ordering drift",
    )
    require(
        int(by_kind["FAULT"]["body"]) == 2
        and int(by_kind["QUARANTINE"]["body"]) == 2,
        "fault policy targeted the wrong body",
    )
    require(
        int(by_kind["FAULT"]["vector"]) == 6
        and int(by_kind["QUARANTINE"]["vector"]) == 6,
        "fault policy classified the wrong vector",
    )

    for phrase in [
        "Kernel Observatory",
        "Operational route",
        "Structured trace ledger",
        "v2.0A",
        source_sha[:16],
    ]:
        require(phrase in html, f"observatory HTML missing: {phrase}")

    print(
        "JM_GENERATED_OBSERVATORYCONTINUITYROUTE MACHINE DING: PASS "
        f"safe_calls_after_recovery={safe_calls} unique_events={len(events)}"
    )


if __name__ == "__main__":
    main()
