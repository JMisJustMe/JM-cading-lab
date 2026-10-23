from pathlib import Path
import hashlib, unittest
P = Path(__file__).resolve().parents[1]
MAIN=(P/'Main.gd').read_text()
class V04(unittest.TestCase):
 def test_ancestor_sha(self):
  self.assertEqual(hashlib.sha256((P/'ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html').read_bytes()).hexdigest(),'b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62')
 def test_save_compat(self):
  self.assertIn('SAVE_BATTLE = "user://slingfall_field_ascent_battle.json"',MAIN)
  self.assertIn('"version":2',MAIN)
  self.assertIn('Schema-2 migration',MAIN)
  self.assertIn('config/name="SLINGFALL — Field Ascent"',(P/'project.godot').read_text())
 def test_three_original_heroes_and_zones(self):
  for name in ['"bulwark"','"dart"','"warden"','"RIDGE"','"CROSSROADS"','"SUPPLY"']:self.assertIn(name,MAIN)
  self.assertIn('WIN_SCORE = 105.0',MAIN)
  self.assertIn('MATCH_TIME = 140.0',MAIN)
 def test_destructible_cover(self):
  for token in ['COVER_BLUEPRINTS','func _damage_cover','func _nearest_cover','damage*0.40','cover["destroyed"] = true','func _draw_ion_telegraphs']:
   self.assertIn(token,MAIN)
 def test_real_weather(self):
  for token in ['CROSSWIND_DRIFT','"drift"','func _ion_impact','ION_WARNING_SECONDS','ION_STRIKE_DAMAGE','"countdown"','"ION STORM"']:
   self.assertIn(token,MAIN)
 def test_new_ai(self):
  for token in ['"enemy_plan"','"COUNTER "','var pressure =','var counter =','func _enemy_step']:
   self.assertIn(token,MAIN)
 def test_mobile_continuity(self):
  for token in ['InputEventScreenTouch','InputEventScreenDrag','func _pointer_up','_issue_order','_recall','_toggle_pause']:
   self.assertIn(token,MAIN)
 def test_original_quality_tests_retained(self):
  self.assertTrue((P/'tests/qa_static.py').exists());self.assertTrue((P/'tests/test_v03_source.py').exists())
if __name__=='__main__': unittest.main(verbosity=2)
