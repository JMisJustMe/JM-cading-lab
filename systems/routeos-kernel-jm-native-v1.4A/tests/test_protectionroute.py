import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source/protectionroute.jmroute"
COMP = ROOT / "tools/protectionroutec.py"
GEN = ROOT / "generated"
INTEGRATOR = ROOT / "tools/integrate_protectionroute.py"


class ProtectionRouteTests(unittest.TestCase):
    def compile_text(self, text: str):
        with tempfile.TemporaryDirectory() as d:
            source = Path(d) / "source.jmroute"
            source.write_text(text)
            return subprocess.run(
                ["python3", str(COMP), str(source), "--out-dir", d],
                capture_output=True,
                text=True,
            )

    def test_generated_outputs_are_current(self):
        subprocess.run(
            ["python3", str(COMP), str(SRC), "--out-dir", str(GEN), "--check"],
            check=True,
        )

    def test_office_order_is_frozen(self):
        mutated = SRC.read_text().replace(
            "OFFICE DescriptorInstall\nOFFICE VectorRoute",
            "OFFICE VectorRoute\nOFFICE DescriptorInstall",
        )
        self.assertNotEqual(self.compile_text(mutated).returncode, 0)

    def test_descriptor_contract_is_frozen(self):
        mutated = SRC.read_text().replace(
            "KERNEL_CODE_DESCRIPTOR 0x00AF9A000000FFFF",
            "KERNEL_CODE_DESCRIPTOR 0x00AF9B000000FFFF",
        )
        self.assertNotEqual(self.compile_text(mutated).returncode, 0)

    def test_vector_privilege_contract_is_frozen(self):
        mutated = SRC.read_text().replace("IDT_USER_ATTR 0xEE", "IDT_USER_ATTR 0x8E")
        self.assertNotEqual(self.compile_text(mutated).returncode, 0)

    def test_timer_contract_is_frozen(self):
        mutated = SRC.read_text().replace("PIT_DIVISOR 11931", "PIT_DIVISOR 11932")
        self.assertNotEqual(self.compile_text(mutated).returncode, 0)

    def test_user_map_contract_is_frozen(self):
        mutated = SRC.read_text().replace("USER2_CODE 0x02004000", "USER2_CODE 0x02008000")
        self.assertNotEqual(self.compile_text(mutated).returncode, 0)

    def test_body_count_contract_is_frozen(self):
        mutated = SRC.read_text().replace("BODY_COUNT 2", "BODY_COUNT 3")
        self.assertNotEqual(self.compile_text(mutated).returncode, 0)

    def test_generated_hardware_operations_exist(self):
        descriptor = (GEN / "descriptorinstall.inc").read_text()
        vector = (GEN / "vectorroute.inc").read_text()
        controller = (GEN / "interruptcontroller.inc").read_text()
        user = (GEN / "usermap_bodyframe.inc").read_text()
        for token in ["routeos_load_gdt", "routeos_load_tr", "gdt[5]", "tss.rsp0"]:
            self.assertIn(token, descriptor)
        for token in ["routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "lidt"]:
            self.assertIn(token, vector)
        for token in ["PIC_MASTER_COMMAND", "PIT_CHANNEL0_PORT", "master_mask & ~"]:
            self.assertIn(token, controller)
        for token in ["routeos_reload_cr3", "routeos_user_blob_start", "bodies[1].frame.rsp"]:
            self.assertIn(token, user)

    def test_generation_record_has_five_markers(self):
        record = json.loads((GEN / "protectionroute.json").read_text())
        self.assertEqual(len(record["offices"]), 5)
        self.assertEqual(len(record["runtime_markers"]), 5)
        self.assertEqual(len(record["generated"]), 4)

    def test_integrator_replaces_all_four_seams(self):
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
            integrated = kernel.read_text()
            data = json.loads(receipt.read_text())
            self.assertTrue(all(v == 0 for v in data["handwritten_residue"].values()))
            self.assertEqual(len(data["removed_handwritten_sha256"]), 4)
            self.assertIn("GENERATED DESCRIPTORINSTALL", integrated)
            self.assertIn("BODYFRAMEINSTALL GENERATED", integrated)
            self.assertIn("KEEP_ANNOUNCE", integrated)

    def test_integrator_rejects_missing_seam(self):
        with tempfile.TemporaryDirectory() as d:
            kernel = Path(d) / "k.c"
            kernel.write_text("no kernel seams here\n")
            result = subprocess.run(
                [
                    "python3",
                    str(INTEGRATOR),
                    "--kernel",
                    str(kernel),
                    "--generated-dir",
                    str(GEN),
                    "--receipt",
                    str(Path(d) / "receipt.json"),
                ]
            )
            self.assertNotEqual(result.returncode, 0)

    def test_integrator_rejects_already_generated_body(self):
        with tempfile.TemporaryDirectory() as d:
            kernel = Path(d) / "k.c"
            kernel.write_text("/* GENERATED DESCRIPTORINSTALL v1.4A SOURCE duplicate. */\n")
            result = subprocess.run(
                [
                    "python3",
                    str(INTEGRATOR),
                    "--kernel",
                    str(kernel),
                    "--generated-dir",
                    str(GEN),
                    "--receipt",
                    str(Path(d) / "receipt.json"),
                ]
            )
            self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
