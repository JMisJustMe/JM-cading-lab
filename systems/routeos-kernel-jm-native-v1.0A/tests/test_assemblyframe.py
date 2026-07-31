#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source/assemblyentry_framecarrier.jmroute"
ASM = ROOT / "generated/assemblyentry_framecarrier.S"
META = ROOT / "generated/assemblyentry_framecarrier.json"
COMP = ROOT / "tools/assemblyframec.py"
INTEGRATE = ROOT / "tools/integrate_assemblyframe.py"


class AssemblyFrameTests(unittest.TestCase):
    def test_01_source_contract(self):
        text = SRC.read_text()
        self.assertIn("OFFICE AssemblyEntry", text)
        self.assertIn("OFFICE FrameCarrier", text)
        self.assertEqual(text.count("VECTOR "), 3)
        self.assertEqual(text.count("SAVE_REGISTER "), 15)
        self.assertEqual(text.count("RESTORE_REGISTER "), 15)
        self.assertEqual(text.count("FRAME_FIELD "), 22)
        self.assertIn("RETURN_OPCODE iretq", text)

    def test_02_generated_outputs_current(self):
        subprocess.run(["python3", str(COMP), str(SRC), "--out-dir", str(ROOT / "generated"), "--check"], check=True)
        meta = json.loads(META.read_text())
        self.assertEqual(meta["source_sha256"], hashlib.sha256(SRC.read_bytes()).hexdigest())
        self.assertEqual(meta["frame_size_bytes"], 176)
        self.assertEqual(meta["frame_offsets"]["vector"], 120)
        self.assertEqual(meta["frame_offsets"]["ss"], 168)

    def test_03_generated_assembly_compiles_and_disassembles(self):
        if not shutil.which("clang") or not shutil.which("objdump"):
            self.skipTest("clang/objdump unavailable")
        with tempfile.TemporaryDirectory() as td:
            obj = Path(td) / "carrier.o"
            subprocess.run(["clang", "-c", str(ASM), "-o", str(obj)], check=True)
            dis = subprocess.check_output(["objdump", "-d", "-Mintel", str(obj)], text=True)
            for symbol in ("routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "routeos_enter_frame"):
                self.assertIn(f"<{symbol}>:", dis)
            self.assertGreaterEqual(dis.count("iretq"), 4)
            self.assertEqual(dis.count("routeos_interrupt_dispatch"), 0)
            rel = subprocess.check_output(["objdump", "-r", str(obj)], text=True)
            self.assertEqual(rel.count("routeos_interrupt_dispatch"), 3)

    def test_04_integration_replaces_only_handwritten_carrier(self):
        fixture = '''.section .text
.globl routeos_reload_cr3
routeos_reload_cr3:
  ret
.globl routeos_isr_ud
routeos_isr_ud:
  pushq $0
  iretq
.globl routeos_isr_timer
routeos_isr_timer:
  pushq $0
  iretq
.globl routeos_isr_syscall
routeos_isr_syscall:
  pushq $0
  iretq
.globl routeos_enter_frame
routeos_enter_frame:
  iretq
.globl routeos_user_blob_start
routeos_user_blob_start:
  nop
'''
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "kernel"
            root.mkdir()
            source = root / "interrupts.S"
            source.write_text(fixture)
            receipt = Path(td) / "receipt.json"
            subprocess.run([
                "python3", str(INTEGRATE), "--kernel-root", str(root), "--carrier", str(ASM),
                "--metadata", str(META), "--receipt", str(receipt)
            ], check=True)
            output = source.read_text()
            self.assertEqual(output.count("GENERATED ASSEMBLYENTRY + FRAMECARRIER"), 1)
            self.assertIn("routeos_reload_cr3:", output)
            self.assertIn("routeos_user_blob_start:", output)
            for symbol in ("routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "routeos_enter_frame"):
                self.assertEqual(output.count(f"{symbol}:"), 1)
            data = json.loads(receipt.read_text())
            self.assertEqual(data["source_sha256"], hashlib.sha256(SRC.read_bytes()).hexdigest())
            self.assertEqual(data["generated_marker_count"], 1)

    def test_05_frame_order_mutation_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            bad = Path(td) / "bad.jmroute"
            text = SRC.read_text().replace("FRAME_FIELD r15\nFRAME_FIELD r14", "FRAME_FIELD r14\nFRAME_FIELD r15", 1)
            bad.write_text(text)
            proc = subprocess.run(["python3", str(COMP), str(bad), "--out-dir", str(Path(td) / "out")])
            self.assertNotEqual(proc.returncode, 0)

    def test_06_stale_generation_fails(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td)
            subprocess.run(["python3", str(COMP), str(SRC), "--out-dir", str(out)], check=True)
            (out / "assemblyentry_framecarrier.S").write_text("stale")
            proc = subprocess.run(["python3", str(COMP), str(SRC), "--out-dir", str(out), "--check"])
            self.assertNotEqual(proc.returncode, 0)

    def test_07_generated_identity_and_contract(self):
        assembly = ASM.read_text()
        meta = json.loads(META.read_text())
        self.assertIn(meta["source_sha256"], assembly)
        self.assertEqual(assembly.count("call routeos_interrupt_dispatch"), 3)
        self.assertEqual(assembly.count("JM_FRAME_RESTORE"), 5)
        self.assertIn("addq $16, %rsp", assembly)
        self.assertIn("movq %rdi, %rsp", assembly)


if __name__ == "__main__":
    unittest.main()
