#!/usr/bin/env python3
import json,subprocess,tempfile,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
class T(unittest.TestCase):
 def test_check(self):subprocess.run(['python3',str(R/'tools/entryroutec.py'),str(R/'source/entryroute.jmroute'),'--out-dir',str(R/'generated'),'--check'],check=True)
 def test_two_units(self):self.assertTrue((R/'generated/entryroute_head.inc').exists() and (R/'generated/entryroute_tail.inc').exists())
 def test_symbols(self):
  t=(R/'generated/entryroute_head.inc').read_text()+(R/'generated/entryroute_tail.inc').read_text()
  for s in ['jm_generated_entryroute_announce', 'routeos_kernel_entry']:self.assertIn(s,t)
 def fixture(self):return 'void serial_init(void);\nvoid jm_generated_primitiveroute_announce(void);\n/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */\nstatic void jm_generated_ignitionbody(unsigned magic,unsigned info) { serial_init();\n  jm_generated_primitiveroute_announce();\n}\n__attribute__((noreturn)) void routeos_kernel_entry(uint32_t magic, uint32_t mb_info) {\n  jm_generated_ignitionbody(magic, mb_info);\n}\n'
 def test_integrate(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k';q=Path(d)/'r';k.write_text(self.fixture());subprocess.run(['python3',str(R/'tools/integrate_entryroute.py'),'--kernel',str(k),'--head',str(R/'generated/entryroute_head.inc'),'--tail',str(R/'generated/entryroute_tail.inc'),'--receipt',str(q)],check=True);self.assertIn('ENTRYROUTE v1.7A TAIL',k.read_text())
 def test_schema_holds(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s';o=json.loads((R/'source/entryroute.jmroute').read_text());o['arguments']=[];p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n');self.assertNotEqual(subprocess.run(['python3',str(R/'tools/entryroutec.py'),str(p),'--out-dir',d]).returncode,0)
if __name__=='__main__':unittest.main()
