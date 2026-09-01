import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "generated"
INTEGRATOR = ROOT / "tools/integrate_protectionroute.py"
RETENTION = GEN / "office_retention.inc"


class ProtectionRouteRetentionTests(unittest.TestCase):
    def test_exact_office_declarations_are_frozen(self):
        text = RETENTION.read_text()
        for symbol in [
            "jm_generated_descriptorinstall",
            "jm_generated_vectorroute_install",
            "jm_generated_interruptcontroller_install",
            "jm_generated_usermaproute_install",
            "jm_generated_bodyframeinstall",
            "jm_generated_protectionroute_user_install",
        ]:
            declaration = f"static void {symbol}(void) __attribute__((noinline, used));"
            self.assertEqual(text.count(declaration), 1, declaration)

    def test_internal_helpers_are_not_forced_into_elf(self):
        text = RETENTION.read_text()
        self.assertNotIn("jm_generated_vectorroute_set", text)
        self.assertNotIn("jm_generated_usermaproute_mark", text)

    def test_integrator_records_retention_contract(self):
        synthetic = """A
static void gdt_install(void) { OLD_GDT }
static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) { OLD_SET }
static void idt_install(void) { OLD_IDT }
static void jm_interruptroute_announce(void) { KEEP_ANNOUNCE }
static void pic_pit_install(void) { OLD_PIC }
/* GENERATED BODYREGISTRY. EDIT source/bodyregistry_userboundary.jmroute, NOT THIS FILE. */
MIDDLE
static void mark_user_page(uint64_t address) { OLD_MAP }
static void user_boundary_install(void) { OLD_USER }
/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */
Z
"""
        with tempfile.TemporaryDirectory() as d:
            kernel = Path(d) / "routeos_kernel.c"
            kernel.write_text(synthetic)
            receipt = Path(d) / "receipt.json"
            subprocess.run(
                [
                    "python3",
                    str(INTEGRATOR),
                    "--kernel",
                    str(kernel),
                    "--generated-dir",
                    str(GEN),
                    "--receipt",
                    str(receipt),
                ],
                check=True,
            )
            record = json.loads(receipt.read_text())
            self.assertEqual(record["office_retention_contract_count"], 1)
            self.assertEqual(
                record["office_retention_contract_sha256"],
                "772a54aa7c64ed9c25b94f6af901cf7cc0e01c2d65ca4c7f147f969288d9939f",
            )
            integrated = kernel.read_text()
            self.assertLess(
                integrated.index("EXACT ELF OFFICE RETENTION CONTRACT"),
                integrated.index("GENERATED DESCRIPTORINSTALL"),
            )


if __name__ == "__main__":
    unittest.main()
