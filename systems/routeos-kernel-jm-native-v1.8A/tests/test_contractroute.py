#!/usr/bin/env python3
import json,subprocess,tempfile,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
class T(unittest.TestCase):
 def test_check(self):subprocess.run(['python3',str(R/'tools/contractroutec.py'),str(R/'source/contractroute.jmroute'),'--out-dir',str(R/'generated'),'--check'],check=True)
 def test_contract_fields(self):
  t=(R/'generated/contractroute.inc').read_text()
  for x in ['#define USER1_CODE','extern uint64_t boot_pml4[]','jm_generated_contractroute_announce']:self.assertIn(x,t)
 def fixture(self):return '#define COM1 JM_DEVICE_SERIALROUTE_PORT\n#define IDT_SIZE 256\nextern uint64_t boot_pml4[];\n/* GENERATED PRIMITIVEROUTE v1.5A SOURCE X. */\nvoid f(void) {\n  serial_init();\n  jm_generated_primitiveroute_announce();\n}\n'
 def test_integrate(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k';q=Path(d)/'r';k.write_text(self.fixture());subprocess.run(['python3',str(R/'tools/integrate_contractroute.py'),'--kernel',str(k),'--generated',str(R/'generated/contractroute.inc'),'--receipt',str(q)],check=True);self.assertIn('KERNELCONTRACTROUTE v1.8A',k.read_text())
 def test_schema_holds(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s';o=json.loads((R/'source/contractroute.jmroute').read_text());o['constants']['IDT_SIZE']=255;p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n');self.assertNotEqual(subprocess.run(['python3',str(R/'tools/contractroutec.py'),str(p),'--out-dir',d]).returncode,0)
if __name__=='__main__':unittest.main()
