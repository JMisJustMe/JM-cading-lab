#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, re, sys

OLD_MEMORY_BLOCK = """#define HEAP_BLOCKS 16
#define HEAP_BLOCK_SIZE 256
static uint8_t heap[HEAP_BLOCKS][HEAP_BLOCK_SIZE] __attribute__((aligned(16)));
static bool heap_used[HEAP_BLOCKS];
static void *memory_allocate(void) {
  for (size_t i = 0; i < HEAP_BLOCKS; ++i) {
    if (!heap_used[i]) { heap_used[i] = true; return heap[i]; }
  }
  return NULL;
}
static bool memory_release(void *p) {
  for (size_t i = 0; i < HEAP_BLOCKS; ++i) {
    if (p == heap[i] && heap_used[i]) { heap_used[i] = false; return true; }
  }
  return false;
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
    if "JM_PERMISSIONGATE_VERSION" not in kernel or "JM_ROUTESCHEDULER_VERSION" not in kernel:
        raise ValueError("v0.4A generated operational stack must be integrated first")
    if "JM_MEMORYBODY_VERSION" in kernel:
        raise ValueError("MemoryBody is already generated")
    if kernel.count(OLD_MEMORY_BLOCK) != 1:
        raise ValueError(f"expected one handwritten MemoryBody block, found {kernel.count(OLD_MEMORY_BLOCK)}")
    integrated = kernel.replace(OLD_MEMORY_BLOCK, office, 1)
    if OLD_MEMORY_BLOCK in integrated or integrated.count("MEMORYBODY GENERATED") != 1:
        raise ValueError("MemoryBody operational replacement did not complete")
    kernel_path.write_text(integrated, encoding="utf-8", newline="\n")
    receipt = {
        "gate": "JM_GENERATED_MEMORYBODY_OPERATIONAL",
        "memorybody_version": macro(office, "JM_MEMORYBODY_VERSION"),
        "memorybody_source_sha256": macro(office, "JM_MEMORYBODY_SOURCE_SHA256"),
        "proof_parent": macro(office, "JM_MEMORYBODY_PROOF_PARENT"),
        "machine_parent": macro(office, "JM_MEMORYBODY_MACHINE_PARENT"),
        "kernel_before_sha256": sha(kernel),
        "kernel_after_sha256": sha(integrated),
        "generated_office_sha256": sha(office),
        "handwritten_memorybody_removed": True,
        "memory_allocate_count": integrated.count("static void *memory_allocate(void)"),
        "memory_release_count": integrated.count("static bool memory_release(void *p)"),
        "runtime_marker": f"[JM] MEMORYBODY GENERATED {macro(office, 'JM_MEMORYBODY_VERSION')} SOURCE {macro(office, 'JM_MEMORYBODY_SOURCE_SHA256')} ACTIVE",
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
        print(f"integrate_memorybody: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
