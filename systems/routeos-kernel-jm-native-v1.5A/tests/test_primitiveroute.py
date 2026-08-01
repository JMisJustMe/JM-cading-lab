#!/usr/bin/env python3
import json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class T(unittest.TestCase):
 def test_checked_outputs(self): subprocess.run(['python3',str(ROOT/'tools/primitiveroutec.py'),str(ROOT/'source/primitiveroute.jmroute'),'--out-dir',str(ROOT/'generated'),'--check'],check=True)
 def test_source_hash(self):
  import hashlib
  self.assertEqual(hashlib.sha256((ROOT/'source/primitiveroute.jmroute').read_bytes()).hexdigest(),'62476361bed4398041d8005dd242d0344809a893a6ca5e85618f3495ca77ccbb')
 def test_unknown_source_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s'; o=json.loads((ROOT/'source/primitiveroute.jmroute').read_text()); o['io_wait_port']=129; p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n')
   r=subprocess.run(['python3',str(ROOT/'tools/primitiveroutec.py'),str(p),'--out-dir',d],capture_output=True); self.assertNotEqual(r.returncode,0)
 def fixture(self): return '#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\nstatic inline void outb(uint16_t port, uint8_t value) { (void)port; (void)value; }\nstatic inline uint8_t inb(uint16_t port) { (void)port; return 0; }\nstatic inline void io_wait(void) { outb(0x80, 0); }\nstatic void *jm_memcpy(void *dst, const void *src, size_t n) { (void)src; (void)n; return dst; }\nstatic void *jm_memset(void *dst, int value, size_t n) { (void)value; (void)n; return dst; }\n/* GENERATED SERIALROUTE v1.3A SOURCE X. */\nstatic void serial_write(const char *s) { (void)s; }\nstatic void serial_init(void) {}\nstatic void boot(void) {\n  serial_init();\n}\n'
 def test_integrates_and_removes_residue(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k.c'; r=Path(d)/'r.json'; k.write_text(self.fixture())
   subprocess.run(['python3',str(ROOT/'tools/integrate_primitiveroute.py'),'--kernel',str(k),'--generated',str(ROOT/'generated/primitiveroute.inc'),'--receipt',str(r)],check=True)
   t=k.read_text(); self.assertIn('GENERATED PRIMITIVEROUTE v1.5A',t); self.assertNotIn('static inline void outb',t); self.assertEqual(json.loads(r.read_text())['generated_marker_count'],1)
 def test_reintegration_holds(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k.c'; r=Path(d)/'r'; k.write_text(self.fixture()); cmd=['python3',str(ROOT/'tools/integrate_primitiveroute.py'),'--kernel',str(k),'--generated',str(ROOT/'generated/primitiveroute.inc'),'--receipt',str(r)]; subprocess.run(cmd,check=True); self.assertNotEqual(subprocess.run(cmd).returncode,0)
 def test_generated_symbols_declared(self):
  t=(ROOT/'generated/primitiveroute.inc').read_text()
  for s in ['jm_generated_portout','jm_generated_portin','jm_generated_iowait','jm_generated_memorycopy','jm_generated_memoryset','jm_generated_primitiveroute_announce']: self.assertIn(s,t)
 def test_aliases_present(self):
  t=(ROOT/'generated/primitiveroute.inc').read_text();
  for s in ['#define outb','#define inb','#define io_wait','#define jm_memcpy','#define jm_memset']: self.assertIn(s,t)
if __name__=='__main__': unittest.main()
