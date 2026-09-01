from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
COMPILER = ROOT / "tools" / "bootroutec.py"
SOURCE = ROOT / "source" / "bootcarrier_longmoderoute.jmroute"
GENERATED = ROOT / "generated"

spec = importlib.util.spec_from_file_location("bootroutec", COMPILER)
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


class BootRouteTests(unittest.TestCase):
    def test_committed_outputs_are_deterministic(self):
        subprocess.run([sys.executable, str(COMPILER), str(SOURCE), "--out-dir", str(GENERATED), "--check"], check=True)

    def test_exact_frozen_contract(self):
        parsed = mod.parse(SOURCE)
        self.assertEqual(list(parsed.offices), mod.EXPECTED_OFFICES)
        self.assertEqual(parsed.page_table_count, 32)
        self.assertEqual(parsed.page_table_entries, 16384)
        self.assertEqual(parsed.page_table_storage_pages, 35)
        self.assertEqual(parsed.boot_stack_bytes, 32768)
        self.assertEqual(parsed.boot_code_selector, 0x08)
        self.assertEqual(parsed.boot_data_selector, 0x10)

    def test_generated_head_contains_live_transition(self):
        head = (GENERATED / "bootcarrier_longmoderoute_head.S").read_text()
        for token in (".section .multiboot", "_start:", "rep stosl", "%cr4", "rdmsr", "wrmsr", "%cr3", "%cr0", "lgdt boot_gdt_ptr", "ljmp $0x8, $long_mode_entry", ".code64", "call routeos_kernel_entry", "lretq", "ltr %ax"):
            self.assertIn(token, head)

    def test_generated_record_is_bounded_and_complete(self):
        record = json.loads((GENERATED / "bootcarrier_longmoderoute.json").read_text())
        self.assertEqual(record["identity_map_bytes"], 64 * 1024 * 1024)
        self.assertEqual(record["page_table_storage_bytes"], 35 * 4096)
        self.assertEqual(record["processor_route"], ["CR4.PAE", "EFER.LME", "CR3", "CR0.PG", "LGDT", "far-jump", "code64"])

    def test_rejects_contract_drift(self):
        text = SOURCE.read_text().replace("PAGE_TABLE_COUNT 32", "PAGE_TABLE_COUNT 31")
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "bad.jmroute"
            path.write_text(text)
            with self.assertRaises(ValueError):
                mod.parse(path)

    def test_rejects_office_flattening(self):
        text = SOURCE.read_text().replace("OFFICE PrivilegeLoader\n", "")
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "bad.jmroute"
            path.write_text(text)
            with self.assertRaises(ValueError):
                mod.parse(path)


if __name__ == "__main__":
    unittest.main()
