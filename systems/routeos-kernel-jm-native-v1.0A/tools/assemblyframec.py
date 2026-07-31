#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

EXPECTED_OFFICES = ["AssemblyEntry", "FrameCarrier"]
EXPECTED_VECTORS = [
    {"symbol": "routeos_isr_ud", "vector": 6, "error_policy": "SYNTHETIC_ZERO"},
    {"symbol": "routeos_isr_timer", "vector": 32, "error_policy": "SYNTHETIC_ZERO"},
    {"symbol": "routeos_isr_syscall", "vector": 128, "error_policy": "SYNTHETIC_ZERO"},
]
EXPECTED_SAVE = ["rax", "rbx", "rcx", "rdx", "rbp", "rdi", "rsi", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15"]
EXPECTED_RESTORE = list(reversed(EXPECTED_SAVE))
EXPECTED_FIELDS = EXPECTED_RESTORE + ["vector", "error", "rip", "cs", "rflags", "rsp", "ss"]
SINGLES = {"VERSION", "PROOF_PARENT", "MACHINE_PARENT", "DISPATCH", "ENTRY", "METADATA_QWORDS", "RETURN_OPCODE"}


def parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    data: dict = {"offices": [], "vectors": [], "save_registers": [], "restore_registers": [], "frame_fields": []}
    for no, line in enumerate(raw.splitlines(), 1):
        parts = line.strip().split()
        if not parts or parts[0].startswith("#"):
            continue
        key = parts[0]
        if key == "OFFICE":
            if len(parts) != 2:
                raise ValueError(f"line {no}: OFFICE expects one value")
            data["offices"].append(parts[1])
        elif key == "VECTOR":
            if len(parts) != 4:
                raise ValueError(f"line {no}: VECTOR expects symbol number error_policy")
            data["vectors"].append({"symbol": parts[1], "vector": int(parts[2], 0), "error_policy": parts[3]})
        elif key == "SAVE_REGISTER":
            if len(parts) != 2:
                raise ValueError(f"line {no}: SAVE_REGISTER expects one register")
            data["save_registers"].append(parts[1])
        elif key == "RESTORE_REGISTER":
            if len(parts) != 2:
                raise ValueError(f"line {no}: RESTORE_REGISTER expects one register")
            data["restore_registers"].append(parts[1])
        elif key == "FRAME_FIELD":
            if len(parts) != 2:
                raise ValueError(f"line {no}: FRAME_FIELD expects one field")
            data["frame_fields"].append(parts[1])
        elif key in SINGLES:
            if len(parts) != 2:
                raise ValueError(f"line {no}: {key} expects one value")
            if key in data:
                raise ValueError(f"line {no}: duplicate {key}")
            data[key] = parts[1]
        else:
            raise ValueError(f"line {no}: unknown directive {key}")

    for key in SINGLES:
        if key not in data:
            raise ValueError(f"missing {key}")
    if data["offices"] != EXPECTED_OFFICES:
        raise ValueError("office order must be AssemblyEntry then FrameCarrier")
    if data["vectors"] != EXPECTED_VECTORS:
        raise ValueError("v1.0A vector contract must be #UD, timer and int 0x80 with synthetic zero errors")
    if data["save_registers"] != EXPECTED_SAVE:
        raise ValueError("save order must match the proven handwritten carrier")
    if data["restore_registers"] != EXPECTED_RESTORE:
        raise ValueError("restore order must reverse the proven save order")
    if data["frame_fields"] != EXPECTED_FIELDS:
        raise ValueError("CPU frame field order must match BodyRegistry v0.9A exactly")
    if int(data["METADATA_QWORDS"], 0) != 2:
        raise ValueError("v1.0A requires vector and error metadata qwords")
    if data["RETURN_OPCODE"] != "iretq":
        raise ValueError("v1.0A returns through iretq")
    if data["DISPATCH"] != "routeos_interrupt_dispatch" or data["ENTRY"] != "routeos_enter_frame":
        raise ValueError("dispatch and entry symbols must preserve the frozen kernel ABI")
    if not re.fullmatch(r"v\d+\.\d+[A-Z]", data["VERSION"]):
        raise ValueError("invalid version")
    data["source_sha256"] = hashlib.sha256(raw.encode()).hexdigest()
    data["frame_offsets"] = {field: index * 8 for index, field in enumerate(data["frame_fields"])}
    data["frame_size_bytes"] = len(data["frame_fields"]) * 8
    return data


def render_assembly(data: dict) -> str:
    save = "\n".join(f"  pushq %{reg}" for reg in data["save_registers"])
    restore = "\n".join(f"  popq %{reg}" for reg in data["restore_registers"])
    isrs = []
    for item in data["vectors"]:
        isrs.append(f'''.globl {item["symbol"]}
.type {item["symbol"]}, @function
{item["symbol"]}:
  pushq $0
  pushq ${item["vector"]}
  JM_FRAME_SAVE
  movq %rsp, %rdi
  call {data["DISPATCH"]}
  movq %rax, %rsp
  JM_FRAME_RESTORE
.size {item["symbol"]}, .-{item["symbol"]}
''')
    marker = f'[JM] ASSEMBLYENTRY FRAMECARRIER GENERATED {data["VERSION"]} SOURCE {data["source_sha256"]} ACTIVE'
    return f'''/* GENERATED ASSEMBLYENTRY + FRAMECARRIER. EDIT source/assemblyentry_framecarrier.jmroute, NOT THIS FILE. */
.section .text
.code64
.extern {data["DISPATCH"]}

.macro JM_FRAME_SAVE
{save}
.endm

.macro JM_FRAME_RESTORE
{restore}
  addq ${int(data["METADATA_QWORDS"], 0) * 8}, %rsp
  {data["RETURN_OPCODE"]}
.endm

{''.join(isrs)}.globl {data["ENTRY"]}
.type {data["ENTRY"]}, @function
{data["ENTRY"]}:
  movq %rdi, %rsp
  JM_FRAME_RESTORE
.size {data["ENTRY"]}, .-{data["ENTRY"]}

.p2align 3
.globl jm_assemblyentry_framecarrier_identity
.type jm_assemblyentry_framecarrier_identity, @object
jm_assemblyentry_framecarrier_identity:
  .asciz "{marker}"
.size jm_assemblyentry_framecarrier_identity, .-jm_assemblyentry_framecarrier_identity
'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = parse(args.source)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    targets = {
        args.out_dir / "assemblyentry_framecarrier.S": render_assembly(data),
        args.out_dir / "assemblyentry_framecarrier.json": json.dumps(data, indent=2, sort_keys=True) + "\n",
    }
    if args.check:
        stale = [str(path) for path, content in targets.items() if not path.exists() or path.read_text() != content]
        if stale:
            raise SystemExit("stale generated outputs: " + ", ".join(stale))
    else:
        for path, content in targets.items():
            path.write_text(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
