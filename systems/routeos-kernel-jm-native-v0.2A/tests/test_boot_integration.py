from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("integrate_boot", ROOT / "tools" / "integrate_boot.py")
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

HEADER = '''
#define JM_ROUTEOS_AUTHORITY_VERSION "v0.2A"
#define JM_ROUTEOS_SOURCE_SHA256 "0f8d44080dc6adfa855996b76efe7f538284643ead8170599809d1e0dbc10371"
#define JM_ROUTEOS_PROOF_PARENT "54f67566036316b25515fb53fa98f06769d3850d"
#define JM_ROUTEOS_REQUIREMENT_COUNT 7
#define JM_ROUTEOS_RECORD_COUNT 9
#define JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES 2
#define JM_BODY_ROUTESCHEDULER_CADENCE_TICKS 25
#define JM_GATE_PERMISSIONGATE_VECTOR 0x80
#define JM_DEVICE_SERIALROUTE_PORT 0x3F8
#define JM_FAULT_FAULTHOLD_VECTOR 6
'''.lstrip()

KERNEL = '''
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#define COM1 0x3F8
static void serial_write(const char *s) {(void)s;}
static void serial_init(void) {}
struct body { int x; };
static struct body bodies[2];
void probe(void *frame_) {
  struct { int vector; } *frame = frame_;
  int current_body = 0;
  unsigned long ticks = 25;
  for (size_t attempt = 0; attempt < 2; ++attempt) {
    int candidate = (current_body + 1 + (int)attempt) % 2;
    (void)candidate;
  }
  idt_set(6, routeos_isr_ud, 0x8E);
  idt_set(128, routeos_isr_syscall, 0xEE);
  if ((ticks % 25) == 0) {}
  if (frame->vector == 128) {}
  if (frame->vector == 6) {}
}
void routeos_kernel_entry(void) {
  serial_init();
}
'''.lstrip()


class BootIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.kernel = root / "kernel" / "routeos_kernel.c"
        self.header = root / "generated" / "routeos_authority.h"
        self.receipt = root / "proof" / "receipt.json"
        self.kernel.parent.mkdir(parents=True)
        self.header.parent.mkdir(parents=True)
        self.kernel.write_text(KERNEL, encoding="utf-8")
        self.header.write_text(HEADER, encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_generated_authority_governs_kernel_constants(self) -> None:
        MODULE.integrate(self.kernel, self.header, self.receipt)
        text = self.kernel.read_text(encoding="utf-8")
        self.assertIn('#include "routeos_authority.h"', text)
        self.assertIn("#define COM1 JM_DEVICE_SERIALROUTE_PORT", text)
        self.assertIn("JM_GATE_PERMISSIONGATE_VECTOR", text)
        self.assertIn("JM_FAULT_FAULTHOLD_VECTOR", text)
        self.assertIn("JM_BODY_ROUTESCHEDULER_CADENCE_TICKS", text)
        self.assertIn("JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES", text)

    def test_runtime_identity_and_receipt_are_exact(self) -> None:
        receipt = MODULE.integrate(self.kernel, self.header, self.receipt)
        expected = (
            "[JM] JM_NATIVE AUTHORITY v0.2A SOURCE "
            "0f8d44080dc6adfa855996b76efe7f538284643ead8170599809d1e0dbc10371 "
            "PARENT 54f67566036316b25515fb53fa98f06769d3850d"
        )
        self.assertEqual(receipt["runtime_trace"], expected)
        self.assertEqual(json.loads(self.receipt.read_text())["runtime_trace"], expected)
        self.assertEqual((self.kernel.parent / "routeos_authority.h").read_text(), HEADER)

    def test_second_integration_is_rejected(self) -> None:
        MODULE.integrate(self.kernel, self.header)
        with self.assertRaisesRegex(ValueError, "already JM-authority integrated"):
            MODULE.integrate(self.kernel, self.header)

    def test_missing_frozen_anchor_is_rejected(self) -> None:
        self.kernel.write_text(KERNEL.replace("#define COM1 0x3F8\n", ""), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "expected exactly one integration anchor"):
            MODULE.integrate(self.kernel, self.header)


if __name__ == "__main__":
    unittest.main()
