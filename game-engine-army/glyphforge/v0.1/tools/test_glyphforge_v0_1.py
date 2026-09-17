#!/usr/bin/env python3
from __future__ import annotations
import json,re,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PARTS=[ROOT/p for p in ['app.part1.txt','app.part2.txt','app.part3a.txt','app.part3b.txt','app.part4.txt']]
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index=(ROOT/'index.html').read_text();cls.css=(ROOT/'style.css').read_text();cls.loader=(ROOT/'app-loader.js').read_text();cls.app=''.join(p.read_text() for p in PARTS);cls.m=json.loads((ROOT/'SOURCE_LINEAGE_AND_BUILD_MANIFEST.json').read_text())
 def test_source_and_syntax(self):
  self.assertTrue(all(p.is_file() for p in PARTS));self.assertIn('app.part3a.txt',self.loader);self.assertIn('app.part3b.txt',self.loader);self.assertTrue(self.app.startswith("(()=>{"));self.assertTrue(self.app.rstrip().endswith('})();'))
  with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False) as f:f.write(self.app);p=Path(f.name)
  try:
   r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
  finally:p.unlink(missing_ok=True)
 def test_asset_editor(self):
  for marker in ['12×12','pixelCanvas','drawPixel','mirrorGlyph','rotateGlyph','duplicateAsset','deleteAsset','PALETTE','asset-atlas']:self.assertIn(marker,self.app+self.index+self.m['rendering'])
 def test_explicit_routing_and_no_silent_input(self):
  for marker in ['const ACTIONS','const INPUTS','dispatchPhysical','dispatchAction','routeStatus','visible consequence','routeConflicts','PermissionGate','Deadzone rejected accidental weak release']:self.assertIn(marker,self.app)
  self.assertIn("$$('[data-action]').forEach",self.app);self.assertIn("window.addEventListener('keydown'",self.app);self.assertIn("prev.addEventListener('pointerdown'",self.app)
 def test_modes_and_preview(self):
  for mode in ['Pull','Pitch','Fire','Fling']:self.assertIn(mode,self.app)
  for marker in ['diamond','sprite','tickShot','2.5D','previewWrap']:self.assertIn(marker,self.app+self.css+self.m['rendering'])
 def test_adapter_targets_and_negotiation(self):
  self.assertEqual(len(self.m['adapterTargets']),4)
  for target in self.m['adapterTargets']:self.assertIn(target,self.app)
  for marker in ['required','missing','forcedMissing','FaultHold','RecoveryBody','NEGOTIATION PASS','NEGOTIATION HELD']:self.assertIn(marker,self.app)
 def test_deterministic_adapter_boundary(self):
  self.assertIn("core.adapterHash=hash(JSON.stringify(core))",self.app);self.assertNotIn('builtAt',self.app.split('function adapterCore',1)[1].split('function compile',1)[0]);self.assertIn('identityHash',self.app);self.assertIn('assetDigest',self.app)
 def test_roundtrip_and_self_contained_demo(self):
  for marker in ['jm.glyphforge-adapter/0.1','exportAdapter','importProject','round-trip import restored exact identity','function demoDocument','Self-contained adapter demo exported']:self.assertIn(marker,self.app)
  self.assertNotIn('document.documentElement.outerHTML',self.app)
 def test_responsive_and_offline(self):
  combined=self.index+self.css+self.loader+self.app+(ROOT/'README.md').read_text()
  for marker in ['viewport-fit=cover','@media(max-width:1050px)','@media(max-width:600px)','phone','laptop']:self.assertIn(marker,combined)
  self.assertNotRegex(self.index+self.css+self.loader+self.app,r'https?://')
 def test_manifest(self):
  self.assertEqual(self.m['status'],'FIRST_ADAPTER_AND_ASSET_FORGE_FLOOR_BUILD_NOT_FINAL_CROWN');self.assertEqual(len(self.m['donors']),1);d=self.m['donors'][0];self.assertEqual(d['bytes'],44208);self.assertTrue(re.fullmatch(r'[0-9a-f]{64}',d['sha256']));self.assertIn('not a final GPU asset pipeline',self.m['claimBoundary'])
if __name__=='__main__':unittest.main(verbosity=2)
