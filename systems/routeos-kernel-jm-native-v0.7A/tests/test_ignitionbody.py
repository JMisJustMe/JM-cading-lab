#!/usr/bin/env python3
from __future__ import annotations
import importlib.util, pathlib, subprocess, sys, tempfile, unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); assert spec and spec.loader
    module = importlib.util.module_from_spec(spec); sys.modules[name] = module; spec.loader.exec_module(module); return module
compiler = load("ignitionbodyc", ROOT / "tools" / "ignitionbodyc.py")
integrator = load("integrate_ignitionbody", ROOT / "tools" / "integrate_ignitionbody.py")
class IgnitionBodyTests(unittest.TestCase):
    def setUp(self):
        self.source = ROOT / "source" / "ignitionbody.jmroute"; self.office = ROOT / "generated" / "ignitionbody_office.inc"; self.program = compiler.parse(self.source)
    def test_source_lineage(self):
        self.assertEqual(self.program.laws["PROOF_PARENT"], "3510c192320e40b5490681c6fc8d3a92ba13a3d6")
        self.assertEqual(self.program.laws["MACHINE_PARENT"], "f59980059d5e64def7a7893e7ded4a18078d80a3")
    def test_ordered_steps(self):
        self.assertEqual([s.name for s in self.program.steps], compiler.EXPECTED_STEPS)
        self.assertEqual([int(s.fields["order"]) for s in self.program.steps], list(range(1, 12)))
    def test_generated_outputs_current(self):
        subprocess.run(["python3", str(ROOT / "tools" / "ignitionbodyc.py"), str(self.source), "--out-dir", str(ROOT / "generated"), "--check"], check=True)
    def test_generated_office_compiles(self):
        office = self.office.read_text(encoding="utf-8")
        harness = '''
#include <stdbool.h>
#include <stdint.h>
#define BODY_RUNNING 2
#define JM_ROUTEOS_AUTHORITY_VERSION "v0.2A"
#define JM_ROUTEOS_SOURCE_SHA256 "x"
#define JM_ROUTEOS_PROOF_PARENT "y"
struct frame { int x; }; struct body { int state; struct frame frame; }; static struct body bodies[2]; static int current_body;
static void serial_init(void){} static void serial_write(const char*s){(void)s;} static void receipt(const char*s){(void)s;}
static void *memory_allocate(void){static int x; return &x;} static bool memory_release(void*p){return p!=0;}
static void gdt_install(void){} static void idt_install(void){} static void user_boundary_install(void){} static void pic_pit_install(void){}
__attribute__((noreturn)) static void routeos_enter_frame(struct frame*f){(void)f; for(;;){}}
''' + office + '\n__attribute__((noreturn)) void routeos_kernel_entry(uint32_t m,uint32_t i){jm_generated_ignitionbody(m,i);}\n'
        with tempfile.TemporaryDirectory() as tmp:
            c=pathlib.Path(tmp)/"office.c"; o=pathlib.Path(tmp)/"office.o"; c.write_text(harness,encoding="utf-8")
            subprocess.run(["cc","-std=c11","-Wall","-Wextra","-Werror","-c",str(c),"-o",str(o)],check=True)
    def test_real_entry_replaced_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp)/"kernel.c"; p.write_text("prefix\n"+integrator.OLD_FUNCTION+"suffix\n",encoding="utf-8")
            receipt=integrator.integrate(p,self.office); text=p.read_text(encoding="utf-8")
            self.assertEqual(receipt["gate"],"JM_GENERATED_IGNITIONBODY"); self.assertNotIn(integrator.OLD_FUNCTION,text); self.assertIn("jm_generated_ignitionbody(magic, mb_info);",text)
    def test_wrong_step_order_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp)/"bad.jmroute"; text=self.source.read_text().replace("STEP SERIAL_INIT order=1", "STEP SERIAL_INIT order=2",1); p.write_text(text,encoding="utf-8")
            with self.assertRaises(compiler.SourceError): compiler.parse(p)
if __name__=="__main__": unittest.main(verbosity=2)
