#!/usr/bin/env python3
"""Replace the handwritten FaultHold + RecoveryBody dispatcher route with generated JM output."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

OFFICE_ANCHOR = "struct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame) {\n"
OLD_BLOCK = '''  if (frame->vector == JM_FAULT_FAULTHOLD_VECTOR) {
    save_current(frame);
    if (current_body >= 0) {
      serial_write("[JM] FAULTHOLD: USER BODY "); serial_u64(bodies[current_body].id);
      serial_write(" INVALID OPCODE CAUGHT\\n");
      bodies[current_body].state = BODY_BLOCKED;
      receipt("RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES");
    }
    return select_next();
  }

  receipt("FAULTHOLD: UNHANDLED VECTOR");
  return frame;
'''
NEW_BLOCK = '''  if (frame->vector == JM_FAULT_FAULTHOLD_VECTOR) {
    return jm_generated_faulthold(frame);
  }

  return jm_generated_unhandled_fault(frame);
'''


def macro(text: str, name: str) -> str:
    match = re.search(rf'^#define\s+{re.escape(name)}\s+"([^"]+)"$', text, re.MULTILINE)
    if not match:
        raise ValueError(f"missing macro {name}")
    return match.group(1)


def integrate(kernel: Path, office: Path, receipt_path: Path | None = None) -> dict[str, object]:
    original = kernel.read_text(encoding="utf-8")
    generated = office.read_text(encoding="utf-8")
    if "jm_generated_faulthold" in original or "FAULTHOLD GENERATED" in original:
        raise ValueError("kernel already contains generated FaultHold")
    if original.count(OFFICE_ANCHOR) != 1:
        raise ValueError("dispatcher anchor must occur exactly once")
    if original.count(OLD_BLOCK) != 1:
        raise ValueError(f"handwritten fault/recovery block must occur exactly once, found {original.count(OLD_BLOCK)}")
    integrated = original.replace(OFFICE_ANCHOR, generated + "\n" + OFFICE_ANCHOR, 1)
    integrated = integrated.replace(OLD_BLOCK, NEW_BLOCK, 1)
    if integrated.count("static struct cpu_frame *jm_generated_faulthold") != 1:
        raise ValueError("generated FaultHold function is not singular")
    if integrated.count("static struct cpu_frame *jm_generated_recoverybody") != 1:
        raise ValueError("generated RecoveryBody function is not singular")
    if "bodies[current_body].state = BODY_BLOCKED;\n      receipt(\"RECOVERYBODY" in integrated:
        raise ValueError("handwritten fault/recovery route survived")
    kernel.write_text(integrated, encoding="utf-8", newline="\n")
    receipt = {
        "gate": "JM_GENERATED_FAULTHOLD_RECOVERYBODY",
        "version": macro(generated, "JM_FAULTRECOVERY_VERSION"),
        "source_sha256": macro(generated, "JM_FAULTRECOVERY_SOURCE_SHA256"),
        "proof_parent": macro(generated, "JM_FAULTRECOVERY_PROOF_PARENT"),
        "machine_parent": macro(generated, "JM_FAULTRECOVERY_MACHINE_PARENT"),
        "kernel_before_sha256": hashlib.sha256(original.encode()).hexdigest(),
        "kernel_after_sha256": hashlib.sha256(integrated.encode()).hexdigest(),
        "office_sha256": hashlib.sha256(generated.encode()).hexdigest(),
        "faulthold_count": integrated.count("static struct cpu_frame *jm_generated_faulthold"),
        "recoverybody_count": integrated.count("static struct cpu_frame *jm_generated_recoverybody"),
        "runtime_faulthold_marker": f"[JM] FAULTHOLD GENERATED {macro(generated, 'JM_FAULTRECOVERY_VERSION')} SOURCE {macro(generated, 'JM_FAULTRECOVERY_SOURCE_SHA256')} ACTIVE",
        "runtime_recovery_marker": f"[JM] RECOVERYBODY GENERATED {macro(generated, 'JM_FAULTRECOVERY_VERSION')} SOURCE {macro(generated, 'JM_FAULTRECOVERY_SOURCE_SHA256')} SELECT SAFE NEXT",
    }
    if receipt_path:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kernel", required=True, type=Path)
    parser.add_argument("--office", required=True, type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    print(json.dumps(integrate(args.kernel, args.office, args.receipt), indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
