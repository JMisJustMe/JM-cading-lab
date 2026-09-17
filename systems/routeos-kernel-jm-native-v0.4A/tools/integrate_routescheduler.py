#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, re, sys

OLD_SCHEDULER_BLOCK = """static struct cpu_frame *select_next(void) {
  for (size_t attempt = 0; attempt < JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES; ++attempt) {
    int candidate = (current_body + 1 + (int)attempt) % JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES;
    if (bodies[candidate].state != BODY_BLOCKED) {
      current_body = candidate;
      bodies[candidate].state = BODY_RUNNING;
      bodies[candidate].runs++;
      return &bodies[candidate].frame;
    }
  }
  receipt("FAULTHOLD: NO RUNNABLE BODY");
  for (;;) { __asm__ volatile("cli; hlt"); }
}
static void save_current(struct cpu_frame *frame) {
  if (current_body >= 0 && bodies[current_body].state != BODY_BLOCKED) {
    jm_memcpy(&bodies[current_body].frame, frame, sizeof(*frame));
    bodies[current_body].state = BODY_READY;
  }
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
    if "JM_PERMISSIONGATE_VERSION" not in kernel or "jm_generated_permissiongate" not in kernel:
        raise ValueError("v0.3A generated PermissionGate must be integrated first")
    if "JM_ROUTESCHEDULER_VERSION" in kernel:
        raise ValueError("RouteScheduler is already generated")
    if kernel.count(OLD_SCHEDULER_BLOCK) != 1:
        raise ValueError(f"expected one handwritten scheduler block, found {kernel.count(OLD_SCHEDULER_BLOCK)}")
    integrated = kernel.replace(OLD_SCHEDULER_BLOCK, office, 1)
    if OLD_SCHEDULER_BLOCK in integrated or integrated.count("ROUTESCHEDULER GENERATED") != 1:
        raise ValueError("RouteScheduler operational replacement did not complete")
    kernel_path.write_text(integrated, encoding="utf-8", newline="\n")
    receipt = {
        "gate": "JM_GENERATED_ROUTESCHEDULER_OPERATIONAL",
        "routescheduler_version": macro(office, "JM_ROUTESCHEDULER_VERSION"),
        "routescheduler_source_sha256": macro(office, "JM_ROUTESCHEDULER_SOURCE_SHA256"),
        "proof_parent": macro(office, "JM_ROUTESCHEDULER_PROOF_PARENT"),
        "machine_parent": macro(office, "JM_ROUTESCHEDULER_MACHINE_PARENT"),
        "kernel_before_sha256": sha(kernel),
        "kernel_after_sha256": sha(integrated),
        "generated_office_sha256": sha(office),
        "handwritten_scheduler_removed": True,
        "select_next_count": integrated.count("static struct cpu_frame *select_next(void)"),
        "save_current_count": integrated.count("static void save_current(struct cpu_frame *frame)"),
        "runtime_marker": f"[JM] ROUTESCHEDULER GENERATED {macro(office, 'JM_ROUTESCHEDULER_VERSION')} SOURCE {macro(office, 'JM_ROUTESCHEDULER_SOURCE_SHA256')} ACTIVE",
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
        print(f"integrate_routescheduler: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
