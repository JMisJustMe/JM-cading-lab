from pathlib import Path
import hashlib,unittest
R=Path(__file__).resolve().parents[1]
S=(R/'Main.gd').read_text()
class BeaconStatic(unittest.TestCase):
 def test_exact_ancestor(self):
  self.assertEqual(hashlib.sha256((R/'ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html').read_bytes()).hexdigest(),'b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62')
 def test_three_ops(self): self.assertIn('const OPERATIONS = ["SECTOR","CONVOY","BEACON"]',S)
 def test_original_save_version(self): self.assertIn('"version":2,"battle":battle',S)
 def test_same_save_paths(self): self.assertIn('user://slingfall_field_ascent_battle.json',S)
 def test_core_real(self): self.assertIn('func _beacon_step(dt: float)',S)
 def test_wave_is_earned(self): self.assertIn('if not _beacon_spawn_wave():',S)
 def test_real_damage(self): self.assertIn('func _beacon_hit(damage: float)',S)
 def test_defense_order(self): self.assertIn('DEFEND_BEACON',S)
 def test_waves_not_sectors(self): self.assertIn('if str(battle.get("operation","SECTOR")) == "BEACON":',S)
 def test_visual_feedback(self): self.assertIn('func _draw_beacon()',S)
 def test_moving_animation(self): self.assertIn('var moving: bool = bool(h.get("moving",false))',S)
 def test_earned_rewards(self): self.assertIn('WAVE %d CLEARED',S)
 def test_migrates_old(self): self.assertIn('if not battle.has("beacon"):',S)
 def test_false_completion_guard(self): self.assertIn('if raiders > 0:',S)
 def test_three_role_distinction(self): self.assertIn('const BEACON_WAVES = [["dart"],["warden","dart"],["bulwark","warden","dart"]]',S)
 def test_old_modes_present(self):
  self.assertIn('func _convoy_step(dt: float)',S)
  self.assertIn('func _capture_step(dt: float)',S)
if __name__ == '__main__': unittest.main(verbosity=2)
