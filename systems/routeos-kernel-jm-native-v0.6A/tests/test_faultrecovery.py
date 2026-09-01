#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

def load(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

compiler = load("faultrecoveryc", ROOT / "tools" / "faultrecoveryc.py")
integrator = load("integrate_faultrecovery", ROOT / "tools" / "integrate_faultrecovery.py")

class FaultRecoveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = ROOT / "source" / "faulthold_recoverybody.jmroute"
        self.office = ROOT / "generated" / "faulthold_recoverybody_office.inc"
        self.program = compiler.parse(self.source)

    def test_source_authority_and_lineage(self) -> None:
        self.assertEqual(self.program.laws["SOURCE_AUTHORITY"], "jm_native")
        self.assertEqual(self.program.laws["PROOF_PARENT"], "8b891d1f4bcdf904791588f5bb46adc31908b9d4")
        self.assertEqual(self.program.laws["MACHINE_PARENT"], "3cd46fdfa825391c99f0999bb4939231e03ad619")

    def test_fault_and_recovery_records(self) -> None:
        records = {r.name: r for r in self.program.records}
        self.assertEqual(records["FAULTHOLD"].fields["vector"], "6")
        self.assertEqual(records["FAULTHOLD"].fields["state"], "BODY_BLOCKED")
        self.assertEqual(records["RECOVERYBODY"].fields["select"], "next_runnable")

    def test_generated_outputs_are_current(self) -> None:
        subprocess.run(["python3", str(ROOT / "tools" / "faultrecoveryc.py"), str(self.source), "--out-dir", str(ROOT / "generated"), "--check"], check=True)

    def test_generated_office_compiles_with_stubs(self) -> None:
        office = self.office.read_text(encoding="utf-8")
        harness = '''
#include <stdbool.h>
#include <stdint.h>
#define JM_FAULT_FAULTHOLD_VECTOR 6
#define BODY_BLOCKED 3
struct cpu_frame { uint64_t vector; };
struct body { uint64_t id; int state; };
static struct body bodies[2];
static int current_body;
static void serial_write(const char *s) {(void)s;}
static void serial_u64(uint64_t n) {(void)n;}
static void receipt(const char *s) {(void)s;}
static void save_current(struct cpu_frame *f) {(void)f;}
static struct cpu_frame frame;
static struct cpu_frame *select_next(void) { return &frame; }
''' + office + '\nint main(void){ return (jm_generated_faulthold(&frame) == 0) || (jm_generated_unhandled_fault(&frame) == 0); }\n'
        with tempfile.TemporaryDirectory() as tmp:
            c = pathlib.Path(tmp) / "office.c"
            exe = pathlib.Path(tmp) / "office"
            c.write_text(harness, encoding="utf-8")
            subprocess.run(["cc", "-std=c11", "-Wall", "-Wextra", "-Werror", str(c), "-o", str(exe)], check=True)

    def test_real_style_block_is_replaced_once(self) -> None:
        kernel = "prefix\n" + integrator.OFFICE_ANCHOR + integrator.OLD_BLOCK + "suffix\n"
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "kernel.c"
            path.write_text(kernel, encoding="utf-8")
            receipt = integrator.integrate(path, self.office)
            text = path.read_text(encoding="utf-8")
            self.assertEqual(receipt["faulthold_count"], 1)
            self.assertEqual(receipt["recoverybody_count"], 1)
            self.assertNotIn(integrator.OLD_BLOCK, text)
            self.assertIn("return jm_generated_faulthold(frame);", text)

    def test_duplicate_record_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "bad.jmroute"
            path.write_text(self.source.read_text() + "\nFAULT FAULTHOLD vector=6 action=block_current state=BODY_BLOCKED\n", encoding="utf-8")
            with self.assertRaises(compiler.SourceError):
                compiler.parse(path)

if __name__ == "__main__":
    unittest.main(verbosity=2)
