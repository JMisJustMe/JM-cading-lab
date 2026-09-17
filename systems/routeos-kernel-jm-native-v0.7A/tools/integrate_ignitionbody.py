#!/usr/bin/env python3
"""Replace handwritten routeos_kernel_entry orchestration with generated IgnitionBody."""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

OLD_FUNCTION = '''__attribute__((noreturn)) void routeos_kernel_entry(uint32_t magic, uint32_t mb_info) {
  (void)mb_info;
  serial_init();
  serial_write("[JM] JM_NATIVE AUTHORITY ");
  serial_write(JM_ROUTEOS_AUTHORITY_VERSION);
  serial_write(" SOURCE ");
  serial_write(JM_ROUTEOS_SOURCE_SHA256);
  serial_write(" PARENT ");
  serial_write(JM_ROUTEOS_PROOF_PARENT);
  serial_write("\\n");
  receipt("JM BOOT IMAGE LOADED");
  if (magic != 0x36D76289U) receipt("BOOTROUTE HOLD: MULTIBOOT2 MAGIC MISMATCH");
  receipt("ROUTEOS KERNEL ENTRY");
  receipt("PRIVILEGED EXECUTION ACTIVE");

  void *probe = memory_allocate();
  if (probe && memory_release(probe)) receipt("MEMORY INITIALISED: ALLOCATE/RELEASE PASS");
  else receipt("MEMORY HOLD");

  gdt_install();
  idt_install();
  user_boundary_install();
  pic_pit_install();
  receipt("INTERRUPT ROUTE ACTIVE");
  receipt("BODYREGISTRY: TWO USER BODIES REGISTERED");
  receipt("PERMISSIONGATE: INT 0x80 CONTROLLED ENTRY ACTIVE");
  receipt("DEVICE OUTPUT: JM-CONTROLLED SERIAL ACTIVE");
  receipt("ROUTESCHEDULER: ENTERING USER BODY 1");
  current_body = 0;
  bodies[0].state = BODY_RUNNING;
  /* Do not STI in CPL0 here. The prepared user frame carries IF=1, so
   * IRETQ enables timer interrupts atomically after the CPL3 stack/frame
   * transition. This prevents a ring-0 timer frame being mistaken for a
   * ring-3 frame by the common scheduler ISR.
   */
  routeos_enter_frame(&bodies[0].frame);
}
'''
NEW_FUNCTION = '''__attribute__((noreturn)) void routeos_kernel_entry(uint32_t magic, uint32_t mb_info) {
  jm_generated_ignitionbody(magic, mb_info);
}
'''

def macro(text: str, name: str) -> str:
    match = re.search(rf'^#define\s+{re.escape(name)}\s+"([^"]+)"$', text, re.MULTILINE)
    if not match: raise ValueError(f"missing macro {name}")
    return match.group(1)

def integrate(kernel: Path, office: Path, receipt_path: Path | None = None) -> dict[str, object]:
    original = kernel.read_text(encoding="utf-8"); generated = office.read_text(encoding="utf-8")
    if "jm_generated_ignitionbody" in original or "IGNITIONBODY GENERATED" in original: raise ValueError("kernel already contains generated IgnitionBody")
    if original.count(OLD_FUNCTION) != 1: raise ValueError(f"handwritten kernel entry must occur exactly once, found {original.count(OLD_FUNCTION)}")
    integrated = original.replace(OLD_FUNCTION, generated + "\n" + NEW_FUNCTION, 1)
    if integrated.count("static void jm_generated_ignitionbody") != 1: raise ValueError("generated IgnitionBody is not singular")
    if integrated.count("jm_generated_ignitionbody(magic, mb_info);") != 1: raise ValueError("entry wrapper is not singular")
    if 'void *probe = memory_allocate();' in integrated.replace(generated, "", 1): raise ValueError("handwritten entry orchestration survived")
    kernel.write_text(integrated, encoding="utf-8", newline="\n")
    receipt = {
        "gate": "JM_GENERATED_IGNITIONBODY",
        "version": macro(generated, "JM_IGNITIONBODY_VERSION"),
        "source_sha256": macro(generated, "JM_IGNITIONBODY_SOURCE_SHA256"),
        "proof_parent": macro(generated, "JM_IGNITIONBODY_PROOF_PARENT"),
        "machine_parent": macro(generated, "JM_IGNITIONBODY_MACHINE_PARENT"),
        "kernel_before_sha256": hashlib.sha256(original.encode()).hexdigest(),
        "kernel_after_sha256": hashlib.sha256(integrated.encode()).hexdigest(),
        "office_sha256": hashlib.sha256(generated.encode()).hexdigest(),
        "runtime_marker": f"[JM] IGNITIONBODY GENERATED {macro(generated, 'JM_IGNITIONBODY_VERSION')} SOURCE {macro(generated, 'JM_IGNITIONBODY_SOURCE_SHA256')} ACTIVE",
    }
    if receipt_path: receipt_path.parent.mkdir(parents=True, exist_ok=True); receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return receipt

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--kernel", required=True, type=Path); parser.add_argument("--office", required=True, type=Path); parser.add_argument("--receipt", type=Path); args = parser.parse_args()
    print(json.dumps(integrate(args.kernel, args.office, args.receipt), indent=2, sort_keys=True)); return 0
if __name__ == "__main__": raise SystemExit(main())
