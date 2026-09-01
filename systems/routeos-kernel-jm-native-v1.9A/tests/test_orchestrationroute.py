#!/usr/bin/env python3
import json,subprocess,tempfile,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
class T(unittest.TestCase):
 def test_check(self):subprocess.run(['python3',str(R/'tools/orchestrationroutec.py'),str(R/'source/orchestrationroute.jmroute'),'--out-dir',str(R/'generated'),'--check'],check=True)
 def test_sequence(self):
  t=(R/'generated/orchestrationroute.inc').read_text()
  for x in ['serial_init();','gdt_install();','idt_install();','user_boundary_install();','pic_pit_install();','routeos_enter_frame']:self.assertIn(x,t)
 def fixture(self):return '/* GENERATED ENTRYROUTE v1.7A HEAD SOURCE X. */\n/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */\n__attribute__((noreturn)) static void jm_generated_ignitionbody(uint32_t magic, uint32_t mb_info) { for (;;) {} }\n/* GENERATED ENTRYROUTE v1.7A TAIL SOURCE X. */\n'
 def test_integrate(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k';q=Path(d)/'r';k.write_text(self.fixture());subprocess.run(['python3',str(R/'tools/integrate_orchestrationroute.py'),'--kernel',str(k),'--generated',str(R/'generated/orchestrationroute.inc'),'--receipt',str(q)],check=True);self.assertIn('ORCHESTRATIONROUTE v1.9A',k.read_text())
 def test_schema_holds(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s';o=json.loads((R/'source/orchestrationroute.jmroute').read_text());o['sequence']=[];p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n');self.assertNotEqual(subprocess.run(['python3',str(R/'tools/orchestrationroutec.py'),str(p),'--out-dir',d]).returncode,0)
if __name__=='__main__':unittest.main()
