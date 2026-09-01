#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, re, sys

OFFICE_ANCHOR = "struct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame) {\n"
OLD_GATE_BLOCK = r"""  if (frame->vector == JM_GATE_PERMISSIONGATE_VECTOR) {
    save_current(frame);
    struct body *active = current_body >= 0 ? &bodies[current_body] : NULL;
    if (!active) return select_next();
    if (active->frame.rax == SYS_TRACE_READ) {
      serial_write("[JM] USER BODY "); serial_u64(active->id);
      serial_write(" -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN\n");
      active->frame.rax = ticks;
      active->state = BODY_READY;
      return &active->frame;
    }
    if (active->frame.rax == SYS_YIELD) {
      active->state = BODY_READY;
      return select_next();
    }
    receipt("PERMISSIONGATE DENY: UNKNOWN SYSTEM CALL");
    active->frame.rax = (uint64_t)-1;
    active->state = BODY_READY;
    return &active->frame;
  }
"""
NEW_GATE_BLOCK = """  if (frame->vector == JM_GATE_PERMISSIONGATE_VECTOR) {
    return jm_generated_permissiongate(frame);
  }
"""

def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()

def macro(text: str, name: str) -> str:
    match = re.search(rf'^#define\s+{re.escape(name)}\s+"([^"]+)"$', text, re.MULTILINE)
    if not match:
        raise ValueError(f"missing macro {name}")
    return match.group(1)

def integrate(kernel_path: pathlib.Path, office_path: pathlib.Path, receipt_path: pathlib.Path | None = None) -> dict[str, object]:
    kernel = kernel_path.read_text(encoding="utf-8")
    office = office_path.read_text(encoding="utf-8")
    if "JM_NATIVE AUTHORITY" not in kernel or '#include "routeos_authority.h"' not in kernel:
        raise ValueError("v0.2A boot authority must be integrated first")
    if "jm_generated_permissiongate" in kernel:
        raise ValueError("PermissionGate is already generated")
    if kernel.count(OLD_GATE_BLOCK) != 1:
        raise ValueError(f"expected one handwritten PermissionGate block, found {kernel.count(OLD_GATE_BLOCK)}")
    if kernel.count(OFFICE_ANCHOR) != 1:
        raise ValueError("dispatch anchor missing or duplicated")
    integrated = kernel.replace(OFFICE_ANCHOR, office + "\n" + OFFICE_ANCHOR, 1)
    integrated = integrated.replace(OLD_GATE_BLOCK, NEW_GATE_BLOCK, 1)
    if OLD_GATE_BLOCK in integrated or integrated.count("return jm_generated_permissiongate(frame);") != 1:
        raise ValueError("operational replacement did not complete")
    kernel_path.write_text(integrated, encoding="utf-8", newline="\n")
    receipt = {
        "gate": "JM_GENERATED_PERMISSIONGATE_OPERATIONAL",
        "permissiongate_version": macro(office, "JM_PERMISSIONGATE_VERSION"),
        "permissiongate_source_sha256": macro(office, "JM_PERMISSIONGATE_SOURCE_SHA256"),
        "proof_parent": macro(office, "JM_PERMISSIONGATE_PROOF_PARENT"),
        "machine_parent": macro(office, "JM_PERMISSIONGATE_MACHINE_PARENT"),
        "kernel_before_sha256": sha(kernel),
        "kernel_after_sha256": sha(integrated),
        "generated_office_sha256": sha(office),
        "handwritten_gate_removed": True,
        "generated_dispatch_call_count": integrated.count("return jm_generated_permissiongate(frame);"),
        "runtime_marker": f"[JM] PERMISSIONGATE GENERATED {macro(office, 'JM_PERMISSIONGATE_VERSION')} SOURCE {macro(office, 'JM_PERMISSIONGATE_SOURCE_SHA256')} ACTIVE",
    }
    if receipt_path:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return receipt

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kernel", required=True, type=pathlib.Path)
    parser.add_argument("--office", required=True, type=pathlib.Path)
    parser.add_argument("--receipt", type=pathlib.Path)
    args = parser.parse_args()
    try:
        receipt = integrate(args.kernel, args.office, args.receipt)
    except (OSError, ValueError) as exc:
        print(f"integrate_permissiongate: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
