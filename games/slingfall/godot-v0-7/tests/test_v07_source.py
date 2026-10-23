from pathlib import Path
import hashlib,unittest
R=Path(__file__).resolve().parents[1]
S=(R/'Main.gd').read_text()
class WorldPulseStatic(unittest.TestCase):
 def test_original_hash(self): self.assertEqual(hashlib.sha256((R/'ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html').read_bytes()).hexdigest(),'b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62')
 def test_modes(self): self.assertIn('const OPERATIONS = ["SECTOR","CONVOY","BEACON"]',S)
 def test_pulse_presence(self): self.assertIn('func _pulse_step(dt: float)',S)
 def test_capture_is_time_based(self): self.assertIn('delta*dt/PULSE_CAPTURE_SECONDS',S)
 def test_opponents_matter(self): self.assertIn('powers["blue"])-float(powers["red"]',S)
 def test_no_auto_bonus(self): self.assertIn('if float(drop["progress"]) >= 1.0:',S)
 def test_mobile_order(self): self.assertIn('func _issue_pulse_order() -> bool:',S)
 def test_two_sided_rewards(self): self.assertIn('battle["pulse_recovered"][team]',S)
 def test_touch_interception(self): self.assertIn('p.distance_to(_pulse_position()) < 58.0:',S)
 def test_visual_feedback(self): self.assertIn('func _draw_pulse() -> void:',S)
 def test_additive_migration(self): self.assertIn('if not battle.has("signal_pulse"):',S)
 def test_save_schema(self): self.assertIn('"version":2,"battle":battle',S)
 def test_embodiment(self): self.assertIn('v0.7 living silhouettes:',S)
 def test_expiry(self): self.assertIn('if float(drop["ttl"]) <= 0.0:',S)
 def test_outcome_preserved(self):
  for fn in ('_beacon_step','_convoy_step','_capture_step'): self.assertIn('func '+fn+'(dt: float)',S)
if __name__=='__main__': unittest.main(verbosity=2)
