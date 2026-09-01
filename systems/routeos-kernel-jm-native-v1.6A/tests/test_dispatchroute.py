#!/usr/bin/env python3
import json,subprocess,tempfile,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
class T(unittest.TestCase):
 def test_check(self):subprocess.run(['python3',str(R/'tools/dispatchroutec.py'),str(R/'source/dispatchroute.jmroute'),'--out-dir',str(R/'generated'),'--check'],check=True)
 def test_symbols(self):
  t=(R/'generated/dispatchroute.inc').read_text()
  for s in ['jm_generated_dispatchroute', 'routeos_interrupt_dispatch', 'jm_generated_dispatchroute_announce']:self.assertIn(s,t)
 def fixture(self):return 'struct cpu_frame { unsigned long vector; };\nstruct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame) {\n  if (frame->vector == 32) { ++ticks; outb(0x20, 0x20); }\n  return frame;\n}\n/* GENERATED USERBOUNDARY. X */\n'
 def test_integrate(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k';q=Path(d)/'r';k.write_text(self.fixture());subprocess.run(['python3',str(R/'tools/integrate_dispatchroute.py'),'--kernel',str(k),'--generated',str(R/'generated/dispatchroute.inc'),'--receipt',str(q)],check=True);self.assertIn('GENERATED DISPATCHROUTE v1.6A',k.read_text())
 def test_duplicate_holds(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k';q=Path(d)/'r';k.write_text(self.fixture()+self.fixture());self.assertNotEqual(subprocess.run(['python3',str(R/'tools/integrate_dispatchroute.py'),'--kernel',str(k),'--generated',str(R/'generated/dispatchroute.inc'),'--receipt',str(q)]).returncode,0)
 def test_schema_mutation_holds(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s';o=json.loads((R/'source/dispatchroute.jmroute').read_text());o['timer_vector']=33;p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n');self.assertNotEqual(subprocess.run(['python3',str(R/'tools/dispatchroutec.py'),str(p),'--out-dir',d]).returncode,0)
if __name__=='__main__':unittest.main()
