#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, shutil, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"source/bodyregistry_userboundary.jmroute"
REG=ROOT/"generated/bodyregistry_office.inc"
BOUND=ROOT/"generated/userboundary_office.inc"
META=ROOT/"generated/bodyregistry_userboundary.json"
COMP=ROOT/"tools/bodyregistryboundaryc.py"
INT=ROOT/"tools/integrate_bodyregistryboundary.py"
class Tests(unittest.TestCase):
  def test_01_source_contract(self):
    t=SRC.read_text(); self.assertIn("OFFICE BodyRegistry",t); self.assertIn("OFFICE UserBoundary",t)
    self.assertEqual(t.count("FRAME_FIELD "),22); self.assertEqual(t.count("USER "),2); self.assertIn("STATE BODY_BLOCKED 2",t)
  def test_02_generated_current(self):
    subprocess.run(["python3",str(COMP),str(SRC),"--out-dir",str(ROOT/"generated"),"--check"],check=True)
    m=json.loads(META.read_text()); self.assertEqual(m["source_sha256"],hashlib.sha256(SRC.read_bytes()).hexdigest())
  def test_03_generated_offices_compile(self):
    if not shutil.which("clang"): self.skipTest("clang unavailable")
    h=f'''#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\n#define JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES 2\n#define USER1_CODE 0x500000ULL\n#define USER1_STACK_PAGE 0x600000ULL\n#define USER1_STACK_TOP 0x601000ULL\n#define USER2_CODE 0x700000ULL\n#define USER2_STACK_PAGE 0x800000ULL\n#define USER2_STACK_TOP 0x801000ULL\n#define USER_CODE_SELECTOR 0x23\n#define USER_DATA_SELECTOR 0x1B\nstatic uint64_t boot_pml4[512],boot_pdpt[512],boot_pd[512],boot_pts[4096];\nstatic uint8_t routeos_user_blob_start[1],routeos_user_blob_end[1];\nstatic void serial_write(const char*s){{(void)s;}}\nstatic void routeos_reload_cr3(void){{}}\nstatic void *jm_memset(void*d,int v,size_t n){{unsigned char*p=d;for(size_t i=0;i<n;i++)p[i]=(unsigned char)v;return d;}}\nstatic void *jm_memcpy(void*d,const void*s,size_t n){{unsigned char*x=d;const unsigned char*y=s;for(size_t i=0;i<n;i++)x[i]=y[i];return d;}}\n#include "{REG}"\n#include "{BOUND}"\nint main(void){{user_boundary_install();return current_body+(int)ticks+(int)bodies[0].id;}}\n'''
    with tempfile.TemporaryDirectory() as td:
      p=Path(td)/"h.c";p.write_text(h);subprocess.run(["clang","-std=c11","-Wall","-Wextra","-Werror","-c",str(p),"-o",str(Path(td)/"h.o")],check=True)
  def test_04_two_seam_replacement(self):
    fixture='''a\n/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */\nstruct cpu_frame { int x; };\nstruct body { int x; };\nstatic struct body bodies[2];\n/* GENERATED OPERATIONAL OFFICE. EDIT source/routescheduler.jmroute, NOT THIS FILE. */\nscheduler\nstatic void mark_user_page(uint64_t address) { (void)address; }\nstatic void user_boundary_install(void) { routeos_reload_cr3(); bodies[1].frame.ss = 0; }\n/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */\nignition\n'''
    with tempfile.TemporaryDirectory() as td:
      k=Path(td)/"k.c";k.write_text(fixture);r=Path(td)/"r.json"
      subprocess.run(["python3",str(INT),"--kernel",str(k),"--registry",str(REG),"--boundary",str(BOUND),"--receipt",str(r)],check=True)
      o=k.read_text();self.assertEqual(o.count("/* GENERATED BODYREGISTRY."),1);self.assertEqual(o.count("/* GENERATED USERBOUNDARY."),1);self.assertNotIn("/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */",o)
      self.assertEqual(json.loads(r.read_text())["source_sha256"],hashlib.sha256(SRC.read_bytes()).hexdigest())
  def test_05_stale_generation_fails(self):
    with tempfile.TemporaryDirectory() as td:
      out=Path(td);subprocess.run(["python3",str(COMP),str(SRC),"--out-dir",str(out)],check=True);(out/"bodyregistry_office.inc").write_text("stale")
      p=subprocess.run(["python3",str(COMP),str(SRC),"--out-dir",str(out),"--check"]);self.assertNotEqual(p.returncode,0)
  def test_06_frame_and_runtime_identity(self):
    r=REG.read_text();b=BOUND.read_text();m=json.loads(META.read_text())
    self.assertIn("BODYREGISTRY GENERATED",r);self.assertIn("USERBOUNDARY GENERATED",b)
    self.assertIn("uint64_t vector, error, rip, cs, rflags, rsp, ss;",r)
    self.assertIn("routeos_reload_cr3();",b);self.assertEqual([u["id"] for u in m["users"]],[1,2])
if __name__=="__main__":unittest.main()
