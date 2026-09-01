#!/usr/bin/env python3
"""Integrate generated JM RouteOS authority into the frozen v0.1A kernel source."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

INCLUDE_ANCHOR = "#include <stdbool.h>\n"
AUTHORITY_INCLUDE = '#include "routeos_authority.h"\n'

ASSERT_BLOCK = """
_Static_assert(JM_ROUTEOS_REQUIREMENT_COUNT == 7, "JM requirement count changed");
_Static_assert(JM_ROUTEOS_RECORD_COUNT == 9, "JM office count changed");
_Static_assert(JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES == 2, "v0.1A supports exactly two user bodies");
_Static_assert(JM_BODY_ROUTESCHEDULER_CADENCE_TICKS == 25, "v0.1A scheduler cadence mismatch");
_Static_assert(JM_GATE_PERMISSIONGATE_VECTOR == 0x80, "PermissionGate vector mismatch");
_Static_assert(JM_DEVICE_SERIALROUTE_PORT == 0x3F8, "SerialRoute port mismatch");
_Static_assert(JM_FAULT_FAULTHOLD_VECTOR == 6, "FaultHold vector mismatch");
"""

TRACE_ANCHOR = "  serial_init();\n"
TRACE_BLOCK = """  serial_write("[JM] JM_NATIVE AUTHORITY ");
  serial_write(JM_ROUTEOS_AUTHORITY_VERSION);
  serial_write(" SOURCE ");
  serial_write(JM_ROUTEOS_SOURCE_SHA256);
  serial_write(" PARENT ");
  serial_write(JM_ROUTEOS_PROOF_PARENT);
  serial_write("\\n");
"""

REPLACEMENTS = {
    "#define COM1 0x3F8": "#define COM1 JM_DEVICE_SERIALROUTE_PORT",
    "static struct body bodies[2];": "static struct body bodies[JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES];",
    "for (size_t attempt = 0; attempt < 2; ++attempt)": (
        "for (size_t attempt = 0; attempt < JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES; ++attempt)"
    ),
    "(current_body + 1 + (int)attempt) % 2": (
        "(current_body + 1 + (int)attempt) % JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES"
    ),
    "idt_set(6, routeos_isr_ud, 0x8E);": (
        "idt_set(JM_FAULT_FAULTHOLD_VECTOR, routeos_isr_ud, 0x8E);"
    ),
    "idt_set(128, routeos_isr_syscall, 0xEE);": (
        "idt_set(JM_GATE_PERMISSIONGATE_VECTOR, routeos_isr_syscall, 0xEE);"
    ),
    "if ((ticks % 25) == 0)": (
        "if ((ticks % JM_BODY_ROUTESCHEDULER_CADENCE_TICKS) == 0)"
    ),
    "if (frame->vector == 128)": "if (frame->vector == JM_GATE_PERMISSIONGATE_VECTOR)",
    "if (frame->vector == 6)": "if (frame->vector == JM_FAULT_FAULTHOLD_VECTOR)",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def macro(header_text: str, name: str) -> str:
    match = re.search(rf'^#define\s+{re.escape(name)}\s+"([^"]+)"$', header_text, re.MULTILINE)
    if not match:
        raise ValueError(f"missing string macro {name}")
    return match.group(1)


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise ValueError(f"expected exactly one integration anchor {old!r}, found {count}")
    return text.replace(old, new, 1)


def integrate(kernel_path: Path, header_path: Path, receipt_path: Path | None = None) -> dict[str, object]:
    kernel_path = kernel_path.resolve()
    header_path = header_path.resolve()
    if not kernel_path.is_file():
        raise FileNotFoundError(kernel_path)
    if not header_path.is_file():
        raise FileNotFoundError(header_path)

    header_text = header_path.read_text(encoding="utf-8")
    version = macro(header_text, "JM_ROUTEOS_AUTHORITY_VERSION")
    source_sha = macro(header_text, "JM_ROUTEOS_SOURCE_SHA256")
    parent = macro(header_text, "JM_ROUTEOS_PROOF_PARENT")

    original = kernel_path.read_text(encoding="utf-8")
    if AUTHORITY_INCLUDE in original or "JM_NATIVE AUTHORITY" in original:
        raise ValueError("kernel source is already JM-authority integrated")

    integrated = replace_once(
        original,
        INCLUDE_ANCHOR,
        INCLUDE_ANCHOR + AUTHORITY_INCLUDE + ASSERT_BLOCK + "\n",
    )
    for old, new in REPLACEMENTS.items():
        integrated = replace_once(integrated, old, new)
    integrated = replace_once(integrated, TRACE_ANCHOR, TRACE_ANCHOR + TRACE_BLOCK)

    destination = kernel_path.parent / "routeos_authority.h"
    shutil.copyfile(header_path, destination)
    kernel_path.write_text(integrated, encoding="utf-8")

    receipt: dict[str, object] = {
        "gate": "JM_NATIVE_BOOT_INTEGRATION",
        "authority_version": version,
        "authority_source_sha256": source_sha,
        "proof_parent": parent,
        "kernel_source_before_sha256": hashlib.sha256(original.encode()).hexdigest(),
        "kernel_source_after_sha256": hashlib.sha256(integrated.encode()).hexdigest(),
        "authority_header_sha256": sha256(destination),
        "governed_runtime_values": sorted(REPLACEMENTS.values()),
        "runtime_trace": f"[JM] JM_NATIVE AUTHORITY {version} SOURCE {source_sha} PARENT {parent}",
    }
    if receipt_path is not None:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kernel", required=True, type=Path)
    parser.add_argument("--authority-header", required=True, type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    receipt = integrate(args.kernel, args.authority_header, args.receipt)
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
