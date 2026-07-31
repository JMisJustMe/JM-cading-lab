#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

SYMBOLS = ["routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "routeos_enter_frame"]
RUNTIME_MARKERS = [
    "[JM] ROUTESCHEDULER: ENTERING USER BODY 1",
    "[JM] USER BODY 2 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN",
    "[JM] FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT",
    "[JM] RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES",
    "[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN",
]


def function_block(disassembly: str, symbol: str) -> str:
    match = re.search(rf"^[0-9a-f]+ <{re.escape(symbol)}>:\n(?P<body>.*?)(?=^[0-9a-f]+ <|\Z)", disassembly, re.M | re.S)
    if not match:
        raise SystemExit(f"HOLD: disassembly missing {symbol}")
    return match.group("body")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("trace", type=Path)
    parser.add_argument("elf", type=Path)
    parser.add_argument("integrated_assembly", type=Path)
    parser.add_argument("metadata", type=Path)
    parser.add_argument("receipt", type=Path)
    args = parser.parse_args()

    trace = args.trace.read_text(encoding="utf-8", errors="replace")
    for marker in RUNTIME_MARKERS:
        if marker not in trace:
            raise SystemExit(f"HOLD: runtime marker missing: {marker}")
    source = args.integrated_assembly.read_text(encoding="utf-8")
    if source.count("GENERATED ASSEMBLYENTRY + FRAMECARRIER") != 1:
        raise SystemExit("HOLD: generated assembly marker not singular")
    for symbol in SYMBOLS:
        if source.count(f"{symbol}:") != 1:
            raise SystemExit(f"HOLD: integrated assembly symbol count wrong: {symbol}")

    meta = json.loads(args.metadata.read_text(encoding="utf-8"))
    receipt = json.loads(args.receipt.read_text(encoding="utf-8"))
    if receipt["source_sha256"] != meta["source_sha256"] or receipt["frame_size_bytes"] != 176:
        raise SystemExit("HOLD: integration receipt does not match generated metadata")

    disassembly = subprocess.check_output(["objdump", "-d", "-Mintel", str(args.elf)], text=True)
    vectors = {"routeos_isr_ud": "0x6", "routeos_isr_timer": "0x20", "routeos_isr_syscall": "0x80"}
    for symbol, vector in vectors.items():
        block = function_block(disassembly, symbol)
        if "push   0x0" not in block or f"push   {vector}" not in block:
            raise SystemExit(f"HOLD: {symbol} lacks synthetic error/vector frame")
        if "call" not in block or "routeos_interrupt_dispatch" not in block:
            raise SystemExit(f"HOLD: {symbol} does not dispatch through the frozen C ABI")
        if "mov    rsp,rax" not in block or "iretq" not in block:
            raise SystemExit(f"HOLD: {symbol} does not switch and return through generated frame")
    entry = function_block(disassembly, "routeos_enter_frame")
    if "mov    rsp,rdi" not in entry or "iretq" not in entry:
        raise SystemExit("HOLD: routeos_enter_frame does not consume the generated CPU frame")
    if disassembly.count("iretq") < 4:
        raise SystemExit("HOLD: expected generated iretq paths are absent")

    strings = subprocess.check_output(["strings", str(args.elf)], text=True)
    identity = f'[JM] ASSEMBLYENTRY FRAMECARRIER GENERATED {meta["VERSION"]} SOURCE {meta["source_sha256"]} ACTIVE'
    if identity not in strings:
        raise SystemExit("HOLD: generated carrier identity not linked into ELF")
    print("JM_GENERATED_ASSEMBLYENTRY_FRAMECARRIER ENFORCEMENT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
