#!/usr/bin/env python3
from __future__ import annotations
import importlib.util, pathlib, subprocess, sys, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

def load(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

compiler = load("permissiongatec", ROOT / "tools" / "permissiongatec.py")
integrator = load("integrate_permissiongate", ROOT / "tools" / "integrate_permissiongate.py")

class PermissionGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = ROOT / "source" / "permissiongate.jmroute"
        self.pg = compiler.parse(self.source)

    def test_frozen_anchor_is_parent(self) -> None:
        self.assertEqual(self.pg.laws["PROOF_PARENT"], "f76343108422109e8aa939d785d0d88bdba61f08")
        self.assertEqual(self.pg.laws["MACHINE_PARENT"], "0fcb74bf1a959f3020b80511dde01cd67523fc6e")

    def test_operational_routes_are_complete(self) -> None:
        calls = {record.name: record for record in self.pg.calls}
        self.assertEqual(set(calls), {"TRACE_READ", "YIELD"})
        self.assertEqual(calls["TRACE_READ"].fields["return"], "ticks")
        self.assertEqual(self.pg.deny.fields["return"], "-1")

    def test_generated_outputs_are_current(self) -> None:
        subprocess.run([
            "python3", str(ROOT / "tools" / "permissiongatec.py"), str(self.source),
            "--out-dir", str(ROOT / "generated"), "--check",
        ], check=True)

    def test_generated_office_compiles_on_freestanding_floor(self) -> None:
        office = (ROOT / "generated" / "permissiongate_office.inc").read_text()
        harness = """
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#define JM_GATE_PERMISSIONGATE_VECTOR 0x80
struct cpu_frame { uint64_t rax; };
enum body_state { BODY_READY, BODY_RUNNING, BODY_BLOCKED };
struct body { uint64_t id; enum body_state state; struct cpu_frame frame; };
static struct body bodies[2];
static int current_body;
static uint64_t ticks;
static void save_current(struct cpu_frame *frame) { (void)frame; }
static struct cpu_frame *select_next(void) { return &bodies[0].frame; }
static void serial_write(const char *s) { (void)s; }
static void serial_u64(uint64_t value) { (void)value; }
static void receipt(const char *s) { (void)s; }
""" + office + "\nint main(void) { return jm_generated_permissiongate(&bodies[0].frame) == 0; }\n"
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "harness.c"
            path.write_text(harness)
            subprocess.run(["clang", "-std=c11", "-Wall", "-Wextra", "-Werror", "-fsyntax-only", str(path)], check=True)

    def test_integration_removes_handwritten_dispatch(self) -> None:
        synthetic = (
            '#include "routeos_authority.h"\n'
            'static const char *marker = "JM_NATIVE AUTHORITY";\n'
            + integrator.OFFICE_ANCHOR
            + integrator.OLD_GATE_BLOCK
            + '}\n'
        )
        with tempfile.TemporaryDirectory() as tmp:
            kernel = pathlib.Path(tmp) / "routeos_kernel.c"
            kernel.write_text(synthetic)
            receipt = integrator.integrate(kernel, ROOT / "generated" / "permissiongate_office.inc")
            text = kernel.read_text()
            self.assertTrue(receipt["handwritten_gate_removed"])
            self.assertNotIn(integrator.OLD_GATE_BLOCK, text)
            self.assertEqual(text.count("return jm_generated_permissiongate(frame);"), 1)

    def test_duplicate_call_number_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad = pathlib.Path(tmp) / "bad.jmroute"
            bad.write_text(self.source.read_text().replace("CALL YIELD number=2", "CALL YIELD number=1"))
            with self.assertRaises(compiler.SourceError):
                compiler.parse(bad)

if __name__ == "__main__":
    unittest.main(verbosity=2)
