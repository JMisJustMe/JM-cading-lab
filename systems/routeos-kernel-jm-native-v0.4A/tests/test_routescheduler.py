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

compiler = load("routeschedulerc", ROOT / "tools" / "routeschedulerc.py")
integrator = load("integrate_routescheduler", ROOT / "tools" / "integrate_routescheduler.py")

class RouteSchedulerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = ROOT / "source" / "routescheduler.jmroute"
        self.rs = compiler.parse(self.source)

    def test_v03_anchor_is_parent(self) -> None:
        self.assertEqual(self.rs.laws["PROOF_PARENT"], "2e814746c846fc5aeb45bee7bb03338d7c9a0896")
        self.assertEqual(self.rs.laws["MACHINE_PARENT"], "bb31256906b3db76a78993367ce0d38cb7418153")

    def test_scheduler_routes_are_complete(self) -> None:
        self.assertEqual(self.rs.scheduler.fields["policy"], "round_robin")
        self.assertEqual(self.rs.scheduler.fields["skip_state"], "BODY_BLOCKED")
        self.assertEqual(self.rs.save.fields["ready_state"], "BODY_READY")
        self.assertEqual(self.rs.hold.fields["action"], "halt")

    def test_generated_outputs_are_current(self) -> None:
        subprocess.run([
            "python3", str(ROOT / "tools" / "routeschedulerc.py"), str(self.source),
            "--out-dir", str(ROOT / "generated"), "--check",
        ], check=True)

    def test_generated_office_compiles(self) -> None:
        office = (ROOT / "generated" / "routescheduler_office.inc").read_text()
        harness = """
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#define JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES 2
struct cpu_frame { uint64_t rax; };
enum body_state { BODY_READY, BODY_RUNNING, BODY_BLOCKED };
struct body { uint64_t id; enum body_state state; struct cpu_frame frame; uint64_t runs; };
static struct body bodies[2];
static int current_body = -1;
static void *jm_memcpy(void *d, const void *s, size_t n) { (void)s; (void)n; return d; }
static void serial_write(const char *s) { (void)s; }
static void receipt(const char *s) { (void)s; }
""" + office + "\nint main(void) { save_current(&bodies[0].frame); return select_next() == 0; }\n"
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "harness.c"
            path.write_text(harness)
            subprocess.run(["clang", "-std=c11", "-Wall", "-Wextra", "-Werror", "-fsyntax-only", str(path)], check=True)

    def test_integration_replaces_scheduler_once(self) -> None:
        synthetic = (
            '#define JM_PERMISSIONGATE_VERSION "v0.3A"\n'
            'static void *jm_generated_permissiongate;\n'
            + integrator.OLD_SCHEDULER_BLOCK
        )
        with tempfile.TemporaryDirectory() as tmp:
            kernel = pathlib.Path(tmp) / "routeos_kernel.c"
            kernel.write_text(synthetic)
            receipt = integrator.integrate(kernel, ROOT / "generated" / "routescheduler_office.inc")
            text = kernel.read_text()
            self.assertTrue(receipt["handwritten_scheduler_removed"])
            self.assertNotIn(integrator.OLD_SCHEDULER_BLOCK, text)
            self.assertEqual(receipt["select_next_count"], 1)
            self.assertEqual(receipt["save_current_count"], 1)

    def test_wrong_body_count_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad = pathlib.Path(tmp) / "bad.jmroute"
            bad.write_text(self.source.read_text().replace("bodies=2", "bodies=3"))
            with self.assertRaises(compiler.SourceError):
                compiler.parse(bad)

if __name__ == "__main__":
    unittest.main(verbosity=2)
