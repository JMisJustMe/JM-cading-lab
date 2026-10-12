"""Comparator fixture tests only: no private game bundled in public CI."""
import copy
import importlib.util
from pathlib import Path
import sys
import types
import unittest

stub=types.ModuleType('playwright')
sync=types.ModuleType('playwright.sync_api')
sync.sync_playwright=lambda:None
stub.sync_api=sync
sys.modules.setdefault('playwright',stub)
sys.modules.setdefault('playwright.sync_api',sync)
file=Path(__file__).with_name('jm_rea_combound_multiturn_parity_v0_9.py')
spec=importlib.util.spec_from_file_location('jm_multiturn',file)
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

def fixture():
 out=[]
 for i in range(21):
  if i<7: turn,phase,no='player','moving',1
  elif i==7: turn,phase,no='enemy','ai_preview',1
  elif i<16: turn,phase,no='enemy','moving',1
  else: turn,phase,no='player','player_aim',2
  out.append({'frame':i*120,'phase':phase,'turn':turn,'turnNo':no,'ended':False,
              'receipts':['MATCH_START','SHOT_COMMIT'],'units':[{'hp':100}]})
 return out

class CheckSequence(unittest.TestCase):
 def test_good_synthetic_roundtrip(self):
  s=fixture();r=runner.compare(s,copy.deepcopy(s))
  self.assertEqual(r['checkpoints'],21)
  self.assertTrue(r['enemy_shot_observed'])
  self.assertTrue(r['return_to_player_observed'])
 def test_changed_health_detected(self):
  s=fixture();t=copy.deepcopy(s);t[10]['units'][0]['hp']=0
  with self.assertRaisesRegex(RuntimeError,'OBSERVABLE_CONSEQUENCE_DIVERGENCE'):runner.compare(s,t)
 def test_no_ai_preview_is_hold(self):
  s=fixture();s[7]['phase']='moving'
  with self.assertRaisesRegex(RuntimeError,'AI_PREVIEW_ABSENT'):runner.compare(s,s)
 def test_no_enemy_shot_is_hold(self):
  s=fixture()
  for i in range(8,16):s[i]['phase']='ai_preview'
  with self.assertRaisesRegex(RuntimeError,'ENEMY_SHOT_ABSENT'):runner.compare(s,s)
 def test_no_player_return_is_hold(self):
  s=fixture()
  for i in range(16,21):s[i]['turnNo']=1
  with self.assertRaisesRegex(RuntimeError,'PLAYER_RETURN_TURN_ABSENT'):runner.compare(s,s)
 def test_full_match_claim_does_not_inherit(self):
  s=fixture();s[-1]['ended']=True
  with self.assertRaisesRegex(RuntimeError,'COMPLETE_MATCH_NOT_IN_THIS_FIXTURE'):runner.compare(s,s)
 def test_truncated_checkpoints_hold(self):
  s=fixture()[:-1]
  with self.assertRaisesRegex(RuntimeError,'CHECKPOINT_COUNT'):runner.compare(s,s)

if __name__=='__main__':unittest.main()
