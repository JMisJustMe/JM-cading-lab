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

compiler = load("memorybodyc", ROOT / "tools" / "memorybodyc.py")
integrator = load("integrate_memorybody", ROOT / "tools" / "integrate_memorybody.py")

class MemoryBodyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = ROOT / "source" / "memorybody.jmroute"
        self.mb = compiler.parse(self.source)

    def test_v04_anchor_is_parent(self) -> None:
        self.assertEqual(self.mb.laws["PROOF_PARENT"], "52706adf66b5060b3aec17f21982d9cf5eddc23d")
        self.assertEqual(self.mb.laws["MACHINE_PARENT"], "ba60cc66c1cfa622971301af7b84f35f5ad570c9")

    def test_memory_routes_are_complete(self) -> None:
        self.assertEqual(self.mb.memory.fields["blocks"], "16")
        self.assertEqual(self.mb.memory.fields["ownership"], "kernel")
        self.assertEqual(self.mb.allocate.fields["scan"], "first_free")
        self.assertEqual(self.mb.release.fields["validate"], "exact_block")

    def test_generated_outputs_are_current(self) -> None:
        subprocess.run([
            "python3", str(ROOT / "tools" / "memorybodyc.py"), str(self.source),
            "--out-dir", str(ROOT / "generated"), "--check",
        ], check=True)

    def test_generated_office_compiles_and_routes(self) -> None:
        office = (ROOT / "generated" / "memorybody_office.inc").read_text()
        harness = """
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#define JM_BODY_MEMORYBODY_PAGE_SIZE 4096
static void serial_write(const char *s) { (void)s; }
""" + office + """
int main(void) {
  void *a = memory_allocate();
  void *b = memory_allocate();
  if (!a || !b || a == b) return 1;
  if (!memory_release(a)) return 2;
  if (memory_release(a)) return 3;
  return 0;
}
"""
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "harness.c"
            binary = pathlib.Path(tmp) / "harness"
            path.write_text(harness)
            subprocess.run(["clang", "-std=c11", "-Wall", "-Wextra", "-Werror", str(path), "-o", str(binary)], check=True)
            subprocess.run([str(binary)], check=True)

    def test_integration_replaces_memorybody_once(self) -> None:
        synthetic = (
            '#define JM_PERMISSIONGATE_VERSION "v0.3A"\n'
            '#define JM_ROUTESCHEDULER_VERSION "v0.4A"\n'
            + integrator.OLD_MEMORY_BLOCK
        )
        with tempfile.TemporaryDirectory() as tmp:
            kernel = pathlib.Path(tmp) / "routeos_kernel.c"
            kernel.write_text(synthetic)
            receipt = integrator.integrate(kernel, ROOT / "generated" / "memorybody_office.inc")
            text = kernel.read_text()
            self.assertTrue(receipt["handwritten_memorybody_removed"])
            self.assertNotIn(integrator.OLD_MEMORY_BLOCK, text)
            self.assertEqual(receipt["memory_allocate_count"], 1)
            self.assertEqual(receipt["memory_release_count"], 1)

    def test_wrong_block_count_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad = pathlib.Path(tmp) / "bad.jmroute"
            bad.write_text(self.source.read_text().replace("blocks=16", "blocks=15"))
            with self.assertRaises(compiler.SourceError):
                compiler.parse(bad)

if __name__ == "__main__":
    unittest.main(verbosity=2)
