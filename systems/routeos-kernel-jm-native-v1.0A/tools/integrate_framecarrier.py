#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

OLD_BLOCK = r'''.macro PUSH_REGS
  pushq %rax
  pushq %rbx
  pushq %rcx
  pushq %rdx
  pushq %rbp
  pushq %rdi
  pushq %rsi
  pushq %r8
  pushq %r9
  pushq %r10
  pushq %r11
  pushq %r12
  pushq %r13
  pushq %r14
  pushq %r15
.endm

.macro POP_REGS
  popq %r15
  popq %r14
  popq %r13
  popq %r12
  popq %r11
  popq %r10
  popq %r9
  popq %r8
  popq %rsi
  popq %rdi
  popq %rbp
  popq %rdx
  popq %rcx
  popq %rbx
  popq %rax
.endm

.macro ROUTEOS_ISR name, vector
.global \name
\name:
  pushq $0
  pushq $\vector
  PUSH_REGS
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
  POP_REGS
  addq $16, %rsp
  iretq
.endm

ROUTEOS_ISR routeos_isr_ud, 6
ROUTEOS_ISR routeos_isr_timer, 32
ROUTEOS_ISR routeos_isr_syscall, 128

.global routeos_enter_frame
routeos_enter_frame:
  movq %rdi, %rsp
  POP_REGS
  addq $16, %rsp
  iretq
'''


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assembly", type=Path, required=True)
    parser.add_argument("--office", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()

    before_bytes = args.assembly.read_bytes()
    before = before_bytes.decode("utf-8")
    if before.count(OLD_BLOCK) != 1:
        raise SystemExit(f"HOLD: handwritten frame-carrier block count is {before.count(OLD_BLOCK)}, expected 1")
    office = args.office.read_text(encoding="utf-8")
    if office.count("GENERATED FRAMECARRIER + INTERRUPTENTRY") < 2:
        raise SystemExit("HOLD: generated assembly markers missing")
    after = before.replace(OLD_BLOCK, office.rstrip() + "\n", 1)
    if OLD_BLOCK in after or ".macro PUSH_REGS" in after or ".macro ROUTEOS_ISR" in after:
        raise SystemExit("HOLD: handwritten frame-carrier assembly remains")
    if after.count(".macro JM_PUSH_FRAME_REGS") != 1:
        raise SystemExit("HOLD: generated push-frame macro is not singular")
    if after.count(".macro JM_INTERRUPT_ENTRY") != 1:
        raise SystemExit("HOLD: generated interrupt-entry macro is not singular")
    if after.count("routeos_enter_frame:") != 1:
        raise SystemExit("HOLD: routeos_enter_frame symbol is not singular")

    args.assembly.write_text(after, encoding="utf-8")
    receipt = {
        "assembly_path": str(args.assembly),
        "assembly_before_sha256": sha256(before_bytes),
        "assembly_after_sha256": sha256(after.encode("utf-8")),
        "office_path": str(args.office),
        "office_sha256": sha256(office.encode("utf-8")),
        "old_block_count": 1,
        "generated_framecarrier_count": after.count("FRAMECARRIER GENERATED v1.0A"),
        "generated_interruptentry_count": after.count("INTERRUPTENTRY GENERATED v1.0A"),
        "handwritten_push_regs_remaining": after.count(".macro PUSH_REGS"),
        "handwritten_routeos_isr_remaining": after.count(".macro ROUTEOS_ISR"),
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
