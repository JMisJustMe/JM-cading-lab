#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys

trace = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
assembly = Path(sys.argv[2]).read_text(encoding="utf-8")
elf = Path(sys.argv[3])
sha = "50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914"
frame = f"[JM] FRAMECARRIER GENERATED v1.0A SOURCE {sha} ACTIVE"
interrupt_entry = f"[JM] INTERRUPTENTRY GENERATED v1.0A SOURCE {sha} ACTIVE"

for name, marker in (("FrameCarrier", frame), ("InterruptEntry", interrupt_entry)):
    if trace.count(marker) != 1:
        raise SystemExit(f"HOLD: {name} runtime marker count is {trace.count(marker)}, expected 1")

entry_receipt = "[JM] ROUTESCHEDULER: ENTERING USER BODY 1"
first_user_call = "[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS"
for marker in (entry_receipt, first_user_call):
    if marker not in trace:
        raise SystemExit(f"HOLD: inherited runtime marker missing: {marker}")
if not (trace.index(entry_receipt) < trace.index(frame) < trace.index(interrupt_entry) < trace.index(first_user_call)):
    raise SystemExit("HOLD: generated frame/interrupt entry order is wrong")

for inherited in (
    "[JM] IGNITIONBODY GENERATED v0.7A",
    "[JM] MEMORYBODY GENERATED v0.5A",
    "[JM] DESCRIPTORBODY GENERATED v0.8A",
    "[JM] BODYREGISTRY GENERATED v0.9A",
    "[JM] USERBOUNDARY GENERATED v0.9A",
    "[JM] INTERRUPTROUTE GENERATED v0.8A",
    "[JM] ROUTESCHEDULER GENERATED v0.4A",
    "[JM] PERMISSIONGATE GENERATED v0.3A",
    "[JM] FAULTHOLD GENERATED v0.6A",
    "[JM] RECOVERYBODY GENERATED v0.6A",
    "[JM] USER BODY 2 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS",
    "[JM] FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT",
    "[JM] RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES",
):
    if inherited not in trace:
        raise SystemExit(f"HOLD: inherited route missing: {inherited}")

recovery = trace.index("[JM] RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES")
if trace.find(first_user_call, recovery + 1) < 0:
    raise SystemExit("HOLD: safe body did not continue after generated recovery")

if assembly.count("/* GENERATED FRAMECARRIER + INTERRUPTENTRY v1.0A") != 1:
    raise SystemExit("HOLD: generated assembly office is not singular")
for old in (".macro PUSH_REGS", ".macro POP_REGS", ".macro ROUTEOS_ISR"):
    if old in assembly:
        raise SystemExit(f"HOLD: handwritten assembly remains: {old}")
for required in (".macro JM_PUSH_FRAME_REGS", ".macro JM_POP_FRAME_REGS", ".macro JM_INTERRUPT_ENTRY"):
    if assembly.count(required) != 1:
        raise SystemExit(f"HOLD: generated assembly contract count wrong: {required}")

symbols = subprocess.check_output(["nm", "-n", str(elf)], text=True)
for symbol in ("routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "routeos_enter_frame"):
    if not re.search(rf"\b{re.escape(symbol)}$", symbols, re.M):
        raise SystemExit(f"HOLD: generated ELF symbol missing: {symbol}")
    dis = subprocess.check_output(["objdump", "-d", f"--disassemble={symbol}", str(elf)], text=True)
    if "iretq" not in dis:
        raise SystemExit(f"HOLD: generated {symbol} does not return through iretq")
    if symbol.startswith("routeos_isr_") and "routeos_interrupt_dispatch" not in dis:
        raise SystemExit(f"HOLD: generated {symbol} does not call routeos_interrupt_dispatch")

print("JM_GENERATED_FRAMECARRIER_INTERRUPTENTRY_TRACE PASS")
print("GENERATED_ASSEMBLY_FRAME_CONTRACT PASS")
print("GENERATED_ISR_DISPATCH_CONTRACT PASS")
