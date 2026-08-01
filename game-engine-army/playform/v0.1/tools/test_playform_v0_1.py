#!/usr/bin/env python3
from __future__ import annotations
import json,re,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PARTS=[ROOT/f'app.part{i}.txt' for i in range(1,4)]
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index=(ROOT/'index.html').read_text();cls.css=(ROOT/'style.css').read_text();cls.loader=(ROOT/'app-loader.js').read_text();cls.app=''.join(p.read_text() for p in PARTS);cls.m=json.loads((ROOT/'SOURCE_LINEAGE_AND_BUILD_MANIFEST.json').read_text())
 def test_source_and_syntax(self):
  self.assertTrue(all(p.is_file() for p in PARTS));self.assertTrue(self.app.startswith("(()=>{"));self.assertTrue(self.app.rstrip().endswith('})();'))
  with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False) as f:f.write(self.app);p=Path(f.name)
  try:
   r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
  finally:p.unlink(missing_ok=True)
 def test_exact_source_law_and_components(self):
  self.assertEqual(self.m['proofLaw'],'A Playform is not real until it produces an observable repeatable loop.')
  for field in ['actor','tool','gesture','space','mode','objective','loop','expression']:self.assertIn(field,self.app+self.index)
 def test_validation_gate(self):
  for marker in ["['actor','tool','space','objective']","steps.length>=3","/repeat|again|return|loop|adapt/i","core.length===4&&observable&&returning"]:self.assertIn(marker,self.app)
  self.assertIn('Compile held: core components and a returning three-step loop are required.',self.app)
 def test_two_cycle_repeatability_proof(self):
  for marker in ["objective:{cyclesRequired:2}","state.runtime.cycles++","state.runtime.cycles>=2","FIRST CYCLE PROVEN","Observable repeatable loop proven twice","PLAYFORM DING"]:self.assertIn(marker,self.app)
 def test_coding_body_topologies(self):
  self.assertEqual(len(self.m['codingBodies']),6)
  for name in self.m['codingBodies']:self.assertIn(name,self.app)
  for marker in ["coding==='quadze'","coding==='recorp'","coding==='flowtalk'","coding==='formeula'","BODY[state.coding]"]:self.assertIn(marker,self.app)
 def test_2_5d_contact_and_recovery(self):
  for marker in ['function diamond','function pt','nearestNode','FaultHold: action contacted the wrong loop step','RecoveryBody restored the compiled loop baseline','pointerdown','data-move']:self.assertIn(marker,self.app+self.index)
 def test_deterministic_compiled_form(self):
  self.assertIn("core.formHash=hash(JSON.stringify(core))",self.app);segment=self.app.split('const core={schema:',1)[1].split('core.formHash',1)[0];self.assertNotIn('new Date',segment);self.assertNotIn('builtAt',segment)
 def test_roundtrip_and_portable_delivery(self):
  for marker in ['jm.playform-compiled/0.1','exportForm','importProject','function playableDocument','Self-contained repeatable loop exported','localStorage']:self.assertIn(marker,self.app)
  self.assertNotIn('document.documentElement.outerHTML',self.app)
 def test_responsive_offline_and_manifest(self):
  combined=self.index+self.css+self.loader+self.app+(ROOT/'README.md').read_text()
  for marker in ['viewport-fit=cover','@media(max-width:1050px)','@media(max-width:600px)','phone','laptop','2.5D']:self.assertIn(marker,combined)
  self.assertNotRegex(self.index+self.css+self.loader+self.app,r'https?://')
  self.assertEqual(self.m['status'],'FIRST_REPEATABLE_PLAYABLE_LOOP_FLOOR_BUILD_NOT_FINAL_CROWN');d=self.m['donors'][0];self.assertEqual(d['bytes'],20222);self.assertTrue(re.fullmatch(r'[0-9a-f]{64}',d['sha256']))
if __name__=='__main__':unittest.main(verbosity=2)
