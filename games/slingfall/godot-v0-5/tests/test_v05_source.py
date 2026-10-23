from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'Main.gd').read_text()
class V05(unittest.TestCase):
 def test_inherits(self):
  self.assertIn('const CONVOY_ROUTE',SOURCE)
  self.assertIn('func _convoy_step(dt: float)',SOURCE)
 def test_player_choice(self):
  self.assertIn('func start_battle(variant: String = "")',SOURCE)
  self.assertIn('operation_selected = "CONVOY" if operation_selected == "SECTOR" else "SECTOR"',SOURCE)
 def test_real_collision(self):
  self.assertIn('distance < CONVOY_ESCORT_RADIUS',SOURCE)
  self.assertIn('distance < CONVOY_INTERCEPT_RADIUS',SOURCE)
 def test_no_fake_success(self):
  self.assertIn('bool(battle["convoy"]["complete"])',SOURCE)
  self.assertIn('float(battle["convoy"]["hull"]) <= 0.0',SOURCE)
 def test_save_migration(self):
  self.assertIn('if not battle.has("operation"):',SOURCE)
  self.assertIn('if not battle.has("convoy"):',SOURCE)
 def test_world_presentation(self):
  self.assertIn('func _draw_convoy()',SOURCE)
  self.assertIn('"CONVOY EXTRACTION"',SOURCE)
 def test_native_suite(self):
  tests=(ROOT/'tests/host_logic_test.gd').read_text()
  for s in ['V05 cargo cannot progress','V05 checkpoint triggers','V05 extraction requires','V05 destruction loses']:
   self.assertIn(s,tests)
 def test_original_immutable(self):
  import hashlib
  data=(ROOT/'ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html').read_bytes()
  self.assertEqual(hashlib.sha256(data).hexdigest(),'b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62')
if __name__=='__main__':unittest.main(verbosity=2)
