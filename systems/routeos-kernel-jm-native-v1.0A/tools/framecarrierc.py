#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
import sys

EXPECTED_PUSH = [
    "rax", "rbx", "rcx", "rdx", "rbp", "rdi", "rsi",
    "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15",
]
EXPECTED_STUBS = [
    ("routeos_isr_ud", 6),
    ("routeos_isr_timer", 32),
    ("routeos_isr_syscall", 128),
]

@dataclass(frozen=True)
class Spec:
    version: str
    proof_parent: str
    machine_parent: str
    offices: tuple[str, ...]
    serial_port: int
    serial_lsr_offset: int
    serial_tx_ready: int
    push_registers: tuple[str, ...]
    frame_skip_qwords: int
    enter_symbol: str
    enter_argument: str
    return_instruction: str
    dispatch_symbol: str
    frame_argument: str
    next_frame_return: str
    stubs: tuple[tuple[str, int], ...]
    error_placeholder: int


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse(path: Path) -> Spec:
    values: dict[str, str] = {}
    offices: list[str] = []
    regs: list[str] = []
    stubs: list[tuple[str, int]] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        key = parts[0]
        if key == "OFFICE":
            if len(parts) != 2:
                raise ValueError(f"line {line_no}: OFFICE expects one value")
            offices.append(parts[1])
        elif key == "PUSH_REGISTER":
            if len(parts) != 2:
                raise ValueError(f"line {line_no}: PUSH_REGISTER expects one value")
            regs.append(parts[1])
        elif key == "STUB":
            if len(parts) != 3:
                raise ValueError(f"line {line_no}: STUB expects symbol and vector")
            stubs.append((parts[1], int(parts[2], 0)))
        else:
            if len(parts) != 2:
                raise ValueError(f"line {line_no}: {key} expects one value")
            if key in values:
                raise ValueError(f"line {line_no}: duplicate {key}")
            values[key] = parts[1]

    required = {
        "VERSION", "PROOF_PARENT", "MACHINE_PARENT", "SERIAL_PORT",
        "SERIAL_LSR_OFFSET", "SERIAL_TX_READY", "FRAME_SKIP_QWORDS",
        "ENTER_SYMBOL", "ENTER_ARGUMENT", "RETURN_INSTRUCTION",
        "DISPATCH_SYMBOL", "FRAME_ARGUMENT", "NEXT_FRAME_RETURN",
        "ERROR_PLACEHOLDER",
    }
    missing = sorted(required - values.keys())
    if missing:
        raise ValueError(f"missing keys: {', '.join(missing)}")
    if offices != ["FrameCarrier", "InterruptEntry"]:
        raise ValueError(f"office order mismatch: {offices}")
    if regs != EXPECTED_PUSH:
        raise ValueError(f"push-register contract mismatch: {regs}")
    if stubs != EXPECTED_STUBS:
        raise ValueError(f"stub contract mismatch: {stubs}")
    if values["RETURN_INSTRUCTION"] != "iretq":
        raise ValueError("FrameCarrier must return through iretq")
    if values["ENTER_ARGUMENT"] != "rdi" or values["FRAME_ARGUMENT"] != "rdi":
        raise ValueError("frame pointer contract must use rdi")
    if values["NEXT_FRAME_RETURN"] != "rax":
        raise ValueError("next-frame return contract must use rax")

    return Spec(
        version=values["VERSION"],
        proof_parent=values["PROOF_PARENT"],
        machine_parent=values["MACHINE_PARENT"],
        offices=tuple(offices),
        serial_port=int(values["SERIAL_PORT"], 0),
        serial_lsr_offset=int(values["SERIAL_LSR_OFFSET"], 0),
        serial_tx_ready=int(values["SERIAL_TX_READY"], 0),
        push_registers=tuple(regs),
        frame_skip_qwords=int(values["FRAME_SKIP_QWORDS"], 0),
        enter_symbol=values["ENTER_SYMBOL"],
        enter_argument=values["ENTER_ARGUMENT"],
        return_instruction=values["RETURN_INSTRUCTION"],
        dispatch_symbol=values["DISPATCH_SYMBOL"],
        frame_argument=values["FRAME_ARGUMENT"],
        next_frame_return=values["NEXT_FRAME_RETURN"],
        stubs=tuple(stubs),
        error_placeholder=int(values["ERROR_PLACEHOLDER"], 0),
    )


def reg(name: str) -> str:
    return f"%{name}"


def generate_assembly(spec: Spec, source_hash: str) -> str:
    frame_marker = f"[JM] FRAMECARRIER GENERATED {spec.version} SOURCE {source_hash} ACTIVE\\n"
    interrupt_marker = f"[JM] INTERRUPTENTRY GENERATED {spec.version} SOURCE {source_hash} ACTIVE\\n"
    push_lines = "\n".join(f"  pushq {reg(r)}" for r in spec.push_registers)
    pop_lines = "\n".join(f"  popq {reg(r)}" for r in reversed(spec.push_registers))
    stubs = "\n".join(f"JM_INTERRUPT_ENTRY {name}, {vector}" for name, vector in spec.stubs)
    skip_bytes = spec.frame_skip_qwords * 8
    lsr_port = spec.serial_port + spec.serial_lsr_offset

    return f"""/* GENERATED FRAMECARRIER + INTERRUPTENTRY {spec.version} SOURCE {source_hash}. */
/* Proof parent: {spec.proof_parent}; machine parent: {spec.machine_parent}. */

.macro JM_PUSH_FRAME_REGS
{push_lines}
.endm

.macro JM_POP_FRAME_REGS
{pop_lines}
.endm

/* Ring-0 serial receipt helper. All caller registers are either already saved
 * by the ISR carrier or replaced from the target frame before CPL3 entry. */
.type jm_generated_frame_serial_emit,@function
jm_generated_frame_serial_emit:
  cld
.Ljm_frame_serial_next:
  movb (%rsi), %r8b
  testb %r8b, %r8b
  jz .Ljm_frame_serial_done
.Ljm_frame_serial_wait:
  movw ${lsr_port:#x}, %dx
  inb %dx, %al
  testb ${spec.serial_tx_ready:#x}, %al
  jz .Ljm_frame_serial_wait
  movw ${spec.serial_port:#x}, %dx
  movb %r8b, %al
  outb %al, %dx
  incq %rsi
  jmp .Ljm_frame_serial_next
.Ljm_frame_serial_done:
  ret

.macro JM_INTERRUPT_ENTRY name, vector
.global \\name
\\name:
  pushq ${spec.error_placeholder}
  pushq $\\vector
  JM_PUSH_FRAME_REGS
  cmpb $0, jm_generated_interruptentry_seen(%rip)
  jne 1f
  movb $1, jm_generated_interruptentry_seen(%rip)
  leaq jm_generated_interruptentry_marker(%rip), %rsi
  call jm_generated_frame_serial_emit
1:
  movq %rsp, %{spec.frame_argument}
  call {spec.dispatch_symbol}
  movq %{spec.next_frame_return}, %rsp
  JM_POP_FRAME_REGS
  addq ${skip_bytes}, %rsp
  {spec.return_instruction}
.endm

{stubs}

.global {spec.enter_symbol}
.type {spec.enter_symbol},@function
{spec.enter_symbol}:
  movq %{spec.enter_argument}, %r13
  leaq jm_generated_framecarrier_marker(%rip), %rsi
  call jm_generated_frame_serial_emit
  movq %r13, %rsp
  JM_POP_FRAME_REGS
  addq ${skip_bytes}, %rsp
  {spec.return_instruction}

.section .rodata
.align 8
jm_generated_framecarrier_marker:
  .asciz \"{frame_marker}\"
jm_generated_interruptentry_marker:
  .asciz \"{interrupt_marker}\"

.section .bss
.align 1
jm_generated_interruptentry_seen:
  .skip 1

.section .text
/* END GENERATED FRAMECARRIER + INTERRUPTENTRY. */
"""


def generate_record(spec: Spec, source_hash: str, assembly: str) -> str:
    record = {
        "version": spec.version,
        "proof_parent": spec.proof_parent,
        "machine_parent": spec.machine_parent,
        "offices": list(spec.offices),
        "source_sha256": source_hash,
        "assembly_sha256": sha256_bytes(assembly.encode("utf-8")),
        "serial_port": spec.serial_port,
        "serial_lsr_port": spec.serial_port + spec.serial_lsr_offset,
        "serial_tx_ready": spec.serial_tx_ready,
        "push_registers": list(spec.push_registers),
        "pop_registers": list(reversed(spec.push_registers)),
        "frame_skip_qwords": spec.frame_skip_qwords,
        "enter_symbol": spec.enter_symbol,
        "dispatch_symbol": spec.dispatch_symbol,
        "stubs": [{"symbol": n, "vector": v} for n, v in spec.stubs],
        "runtime_frame_marker": f"[JM] FRAMECARRIER GENERATED {spec.version} SOURCE {source_hash} ACTIVE",
        "runtime_interrupt_marker": f"[JM] INTERRUPTENTRY GENERATED {spec.version} SOURCE {source_hash} ACTIVE",
    }
    return json.dumps(record, indent=2, sort_keys=True) + "\n"


def write_or_check(path: Path, content: str, check: bool) -> None:
    if check:
        if not path.exists():
            raise SystemExit(f"HOLD: missing generated output: {path}")
        existing = path.read_text(encoding="utf-8")
        if existing != content:
            raise SystemExit(f"HOLD: stale generated output: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    source_bytes = args.source.read_bytes()
    source_hash = sha256_bytes(source_bytes)
    spec = parse(args.source)
    assembly = generate_assembly(spec, source_hash)
    record = generate_record(spec, source_hash, assembly)
    write_or_check(args.out_dir / "framecarrier_interruptentry.S", assembly, args.check)
    write_or_check(args.out_dir / "framecarrier_interruptentry.json", record, args.check)
    if not args.check:
        print(source_hash)
        print(sha256_bytes(assembly.encode("utf-8")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as exc:
        print(f"HOLD: {exc}", file=sys.stderr)
        raise SystemExit(2)
