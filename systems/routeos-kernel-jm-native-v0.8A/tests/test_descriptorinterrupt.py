#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, shutil, subprocess, tempfile, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source/descriptor_interrupt.jmroute"
GEN = ROOT / "generated/descriptor_interrupt_office.inc"
META = ROOT / "generated/descriptor_interrupt_office.json"
COMPILER = ROOT / "tools/descriptorinterruptc.py"
INTEGRATOR = ROOT / "tools/integrate_descriptorinterrupt.py"

class DescriptorInterruptTests(unittest.TestCase):
    def test_01_source_contract(self):
        text = SRC.read_text()
        self.assertIn("OFFICE DescriptorBody", text)
        self.assertIn("OFFICE InterruptRoute", text)
        self.assertEqual(text.count("IDT_GATE "), 3)
        self.assertIn("PIT_TARGET_HZ 100", text)

    def test_02_generated_outputs_are_current(self):
        subprocess.run(["python3", str(COMPILER), str(SRC), "--out-dir", str(ROOT/"generated"), "--check"], check=True)
        meta = json.loads(META.read_text())
        self.assertEqual(meta["source_sha256"], hashlib.sha256(SRC.read_bytes()).hexdigest())

    def test_03_generated_office_compiles(self):
        if not shutil.which("clang"): self.skipTest("clang unavailable")
        harness = f'''#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\n#define IDT_SIZE 256\n#define TSS_SELECTOR 0x28\n#define JM_FAULT_FAULTHOLD_VECTOR 6\n#define JM_GATE_PERMISSIONGATE_VECTOR 0x80\nstatic void *jm_memset(void *d,int v,size_t n){{unsigned char*p=d;for(size_t i=0;i<n;i++)p[i]=(unsigned char)v;return d;}}\nstatic void serial_write(const char*s){{(void)s;}}\nstatic inline void outb(uint16_t p,uint8_t v){{(void)p;(void)v;}}\nstatic inline uint8_t inb(uint16_t p){{(void)p;return 0xFF;}}\nstatic inline void io_wait(void){{}}\nstatic void routeos_load_gdt(const void*p){{(void)p;}}\nstatic void routeos_load_tr(uint16_t s){{(void)s;}}\nstatic void routeos_isr_ud(void){{}}\nstatic void routeos_isr_timer(void){{}}\nstatic void routeos_isr_syscall(void){{}}\n#include "{GEN}"\nint main(void){{gdt_install();idt_install();pic_pit_install();return 0;}}\n'''
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"h.c"; p.write_text(harness)
            subprocess.run(["clang","-std=c11","-Wall","-Wextra","-Werror","-c",str(p),"-o",str(Path(td)/"h.o")],check=True)

    def test_04_exact_block_replacement(self):
        fixture = """before\n/* ---- GDT / TSS ---- */\nstatic void gdt_install(void) {}\nstatic void idt_install(void) {}\nstatic void pic_pit_install(void) { uint16_t divisor = 1193182U / 100U; }\n/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */\nafter\n"""
        with tempfile.TemporaryDirectory() as td:
            k=Path(td)/"routeos_kernel.c"; k.write_text(fixture)
            r=Path(td)/"receipt.json"
            subprocess.run(["python3",str(INTEGRATOR),"--kernel",str(k),"--office",str(GEN),"--receipt",str(r)],check=True)
            out=k.read_text(); receipt=json.loads(r.read_text())
            self.assertEqual(out.count("static void gdt_install(void)"),1)
            self.assertEqual(out.count("static void idt_install(void)"),1)
            self.assertEqual(out.count("static void pic_pit_install(void)"),1)
            self.assertNotIn("uint16_t divisor = 1193182U / 100U;",out)
            self.assertEqual(receipt["source_sha256"], hashlib.sha256(SRC.read_bytes()).hexdigest())

    def test_05_stale_generation_fails(self):
        with tempfile.TemporaryDirectory() as td:
            out=Path(td); subprocess.run(["python3",str(COMPILER),str(SRC),"--out-dir",str(out)],check=True)
            (out/"descriptor_interrupt_office.inc").write_text("stale")
            p=subprocess.run(["python3",str(COMPILER),str(SRC),"--out-dir",str(out),"--check"])
            self.assertNotEqual(p.returncode,0)

    def test_06_runtime_markers_and_authority(self):
        text=GEN.read_text()
        self.assertIn("DESCRIPTORBODY GENERATED",text)
        self.assertIn("INTERRUPTROUTE GENERATED",text)
        self.assertIn("JM_FAULT_FAULTHOLD_VECTOR",text)
        self.assertIn("JM_GATE_PERMISSIONGATE_VECTOR",text)
        self.assertIn("routeos_load_gdt",text)
        self.assertIn("routeos_load_tr",text)

if __name__ == "__main__": unittest.main()
