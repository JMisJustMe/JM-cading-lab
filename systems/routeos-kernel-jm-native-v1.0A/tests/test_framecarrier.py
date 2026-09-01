#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "framecarrier_interruptentry.jmroute"
GEN = ROOT / "generated"
COMPILER = ROOT / "tools" / "framecarrierc.py"
INTEGRATOR = ROOT / "tools" / "integrate_framecarrier.py"
EXPECTED_SOURCE_SHA = "50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914"
EXPECTED_ASM_SHA = "79e7171f56c84c135731eaa2bc069093b53d465b449a58a179f9ee65f042621e"


def load_integrator():
    spec = importlib.util.spec_from_file_location("integrate_framecarrier", INTEGRATOR)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FrameCarrierTests(unittest.TestCase):
    def test_01_source_contract_and_hash(self) -> None:
        import hashlib
        self.assertEqual(hashlib.sha256(SOURCE.read_bytes()).hexdigest(), EXPECTED_SOURCE_SHA)
        text = SOURCE.read_text(encoding="utf-8")
        self.assertEqual(text.count("OFFICE FrameCarrier"), 1)
        self.assertEqual(text.count("OFFICE InterruptEntry"), 1)
        self.assertEqual(text.count("PUSH_REGISTER "), 15)
        self.assertIn("STUB routeos_isr_ud 6", text)
        self.assertIn("STUB routeos_isr_timer 32", text)
        self.assertIn("STUB routeos_isr_syscall 128", text)
        self.assertIn("RETURN_INSTRUCTION iretq", text)

    def test_02_generated_outputs_are_byte_exact(self) -> None:
        subprocess.run(["python3", str(COMPILER), str(SOURCE), "--out-dir", str(GEN), "--check"], check=True)
        import hashlib
        self.assertEqual(hashlib.sha256((GEN / "framecarrier_interruptentry.S").read_bytes()).hexdigest(), EXPECTED_ASM_SHA)
        record = json.loads((GEN / "framecarrier_interruptentry.json").read_text())
        self.assertEqual(record["source_sha256"], EXPECTED_SOURCE_SHA)
        self.assertEqual(record["assembly_sha256"], EXPECTED_ASM_SHA)

    def test_03_generated_assembly_compiles_and_exports_contract(self) -> None:
        if not shutil.which("clang") or not shutil.which("nm"):
            self.skipTest("clang/nm unavailable")
        with tempfile.TemporaryDirectory() as td:
            obj = Path(td) / "framecarrier.o"
            subprocess.run(["clang", "-target", "x86_64-unknown-elf", "-ffreestanding", "-fno-pic", "-mno-red-zone", "-c", str(GEN / "framecarrier_interruptentry.S"), "-o", str(obj)], check=True)
            symbols = subprocess.check_output(["nm", "-n", str(obj)], text=True)
            for symbol in ("routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "routeos_enter_frame"):
                self.assertIn(symbol, symbols)

    def test_04_exact_handwritten_block_replacement(self) -> None:
        module = load_integrator()
        fixture = "HEAD\n" + module.OLD_BLOCK + "\n/* Position-independent user body copied into separate user pages. */\nTAIL\n"
        with tempfile.TemporaryDirectory() as td:
            td = Path(td)
            assembly = td / "boot.S"
            receipt = td / "receipt.json"
            assembly.write_text(fixture, encoding="utf-8")
            subprocess.run(["python3", str(INTEGRATOR), "--assembly", str(assembly), "--office", str(GEN / "framecarrier_interruptentry.S"), "--receipt", str(receipt)], check=True)
            result = assembly.read_text(encoding="utf-8")
            self.assertNotIn(".macro PUSH_REGS", result)
            self.assertNotIn(".macro ROUTEOS_ISR", result)
            self.assertEqual(result.count(".macro JM_PUSH_FRAME_REGS"), 1)
            self.assertEqual(result.count(".macro JM_INTERRUPT_ENTRY"), 1)
            self.assertEqual(result.count("routeos_enter_frame:"), 1)

    def test_05_integrated_assembly_compiles(self) -> None:
        if not shutil.which("clang"):
            self.skipTest("clang unavailable")
        module = load_integrator()
        fixture = ".section .text\n.code64\n" + module.OLD_BLOCK + "\n.section .usertext,\"ax\"\n"
        with tempfile.TemporaryDirectory() as td:
            td = Path(td)
            assembly = td / "boot.S"
            obj = td / "boot.o"
            receipt = td / "receipt.json"
            assembly.write_text(fixture, encoding="utf-8")
            subprocess.run(["python3", str(INTEGRATOR), "--assembly", str(assembly), "--office", str(GEN / "framecarrier_interruptentry.S"), "--receipt", str(receipt)], check=True)
            subprocess.run(["clang", "-target", "x86_64-unknown-elf", "-ffreestanding", "-fno-pic", "-mno-red-zone", "-c", str(assembly), "-o", str(obj)], check=True)

    def test_06_disassembly_has_frame_and_interrupt_returns(self) -> None:
        if not shutil.which("clang") or not shutil.which("objdump"):
            self.skipTest("clang/objdump unavailable")
        with tempfile.TemporaryDirectory() as td:
            obj = Path(td) / "framecarrier.o"
            subprocess.run(["clang", "-target", "x86_64-unknown-elf", "-ffreestanding", "-fno-pic", "-mno-red-zone", "-c", str(GEN / "framecarrier_interruptentry.S"), "-o", str(obj)], check=True)
            dis = subprocess.check_output(["objdump", "-d", str(obj)], text=True)
            self.assertGreaterEqual(dis.count("iretq"), 4)
            self.assertIn("in     (%dx),%al", dis)
            self.assertIn("out    %al,(%dx)", dis)
            for vector in ("$0x6", "$0x20", "$0x80"):
                self.assertIn(vector, dis)


if __name__ == "__main__":
    unittest.main()
