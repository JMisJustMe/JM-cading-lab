import json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'source/serialroute.jmroute'; COMP=ROOT/'tools/serialroutec.py'; GEN=ROOT/'generated/serialroute_office.inc'; INT=ROOT/'tools/integrate_serialroute.py'
class T(unittest.TestCase):
 def run_c(self, text):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s'; p.write_text(text); return subprocess.run(['python3',str(COMP),str(p),'--out-dir',d],capture_output=True,text=True)
 def test_check(self): subprocess.run(['python3',str(COMP),str(SRC),'--out-dir',str(ROOT/'generated'),'--check'],check=True)
 def test_port_drift(self): self.assertNotEqual(self.run_c(SRC.read_text().replace('PORT 0x3F8','PORT 0x2F8')).returncode,0)
 def test_office_drift(self): self.assertNotEqual(self.run_c(SRC.read_text().replace('OFFICE SerialRoute','OFFICE SerialRoute\nOFFICE Extra')).returncode,0)
 def test_newline_drift(self): self.assertNotEqual(self.run_c(SRC.read_text().replace('NEWLINE_MODE CRLF','NEWLINE_MODE LF')).returncode,0)
 def test_tx_mask_drift(self): self.assertNotEqual(self.run_c(SRC.read_text().replace('TX_READY_MASK 0x20','TX_READY_MASK 0x40')).returncode,0)
 def test_register_and_runtime_contract(self):
  g=GEN.read_text()
  for x in ['outb(COM1 + 1, 0x0);','outb(COM1 + 3, 0x80);','outb(COM1 + 0, 0x3);','outb(COM1 + 2, 0xc7);','inb(COM1 + 5)','SERIALROUTE GENERATED v1.3A','jm_generated_serialroute_u64']: self.assertIn(x,g)
 def test_integrator(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k.c'; k.write_text('A\nstatic void serial_init(void) {\n OLD\n}\nstatic void serial_char(char c){}\n/* ---- CORESTATE / MEMORYBODY ---- */\nZ\n'); r=Path(d)/'r.json'
   subprocess.run(['python3',str(INT),'--kernel',str(k),'--generated',str(GEN),'--receipt',str(r)],check=True)
   self.assertIn('GENERATED SERIALROUTE',k.read_text()); self.assertEqual(json.loads(r.read_text())['handwritten_serialroute_residue'],0)
 def test_integrator_rejects_missing(self):
  with tempfile.TemporaryDirectory() as d:
   k=Path(d)/'k.c'; k.write_text('x'); r=subprocess.run(['python3',str(INT),'--kernel',str(k),'--generated',str(GEN),'--receipt',str(Path(d)/'r')]); self.assertNotEqual(r.returncode,0)
if __name__=='__main__': unittest.main()
