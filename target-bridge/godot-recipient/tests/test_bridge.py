#!/usr/bin/env python3
"""Offline tests for registered-source Godot emission. Not a substitute for the native Godot runtime."""
import hashlib, json, re, tempfile, shutil, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SHA='1fde14e48737e3f7cf9331a3d774e06958c670b81c0932409e4dc2c1d7db9d4c'
class BridgeOffline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan=json.loads((ROOT/'bridge/semantic_plan.json').read_text())
        cls.passport=json.loads((ROOT/'bridge/source_passport.json').read_text())
        cls.gd=(ROOT/'Main.gd').read_text()
    def test_exact_source(self):
        source=ROOT/'ancestry/SPINBREAK_v0_8_JM_INLINE_SAME_BODY.html'
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),SHA)
        self.assertEqual(self.plan['source']['sha256'],SHA)
    def test_canonical_readback_4_of_4(self):
        head=json.loads((ROOT/'ancestry/CURRENT_HEAD_v1_1.json').read_text())
        text=json.dumps(head)
        self.assertIn('GDevelop',text);self.assertIn('Unity',text)
        self.assertIn('PASS',text)
    def test_source_supported_effects(self):
        s=(ROOT/'ancestry/SPINBREAK_v0_8_JM_INLINE_SAME_BODY.html').read_text()
        for name,regex in self.passport['checked_expressions'].items():
            with self.subTest(name=name):self.assertRegex(s,regex)
    def test_operation_contract_values(self):
        k=self.plan['operations']['kic'];w=self.plan['operations']['wake']
        self.assertEqual((k['spin_delta'],k['guard_spin_gte']),(-4.2,8))
        self.assertEqual((w['stability_delta'],w['spin_delta'],w['integrity_delta']), (16.,7.,-3.5))
        self.assertTrue(w['one_use'])
    def test_native_layout(self):
        for f in ['project.godot','Main.tscn','Main.gd','tests/host_logic_test.gd']:
            with self.subTest(f=f):self.assertTrue((ROOT/f).is_file())
        self.assertIn('res://Main.tscn',(ROOT/'project.godot').read_text())
    def test_host_trace_not_artificially_passed(self):
        self.assertIn('marks[semantic] = "WAIT"',self.gd)
        self.assertIn('if not SEMANTICS.has(name):',self.gd)
        self.assertIn('if marks[semantic] != "PASS":',self.gd)
        self.assertIn('save_receipt()',self.gd)
        self.assertIn('if not complete:',self.gd)
        self.assertIn('"runtime": OS.get_name()',self.gd)
        self.assertNotIn('"runtime": "Godot editor / user device',self.gd)
    def test_exposed_touch_controls(self):
        for s in ['InputEventScreenTouch','InputEventMouseButton','InputEventKey','pointer_actions','keyboard_actions','action_for(point','refresh_holds','trigger_kic()','trigger_wake()']:
            with self.subTest(s=s):self.assertIn(s,self.gd)
    def test_source_registration(self):
        self.assertEqual(len(self.plan['semantic_ids']),9)
        self.assertEqual(len(set(self.plan['semantic_ids'])),9)
        for i in self.plan['semantic_ids']:self.assertIn(i,self.gd)
    def test_emitter_byte_reproducibility(self):
        original=(ROOT/'Main.gd').read_bytes()
        p=subprocess.run([sys.executable,str(ROOT/'bridge/emit_godot.py')],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stdout+p.stderr)
        self.assertEqual((ROOT/'Main.gd').read_bytes(),original)
    def test_refuse_corrupted_source_and_keep_host_intact(self):
        with tempfile.TemporaryDirectory() as t:
            dst=Path(t)/'test';shutil.copytree(ROOT,dst)
            source=dst/'ancestry/SPINBREAK_v0_8_JM_INLINE_SAME_BODY.html'
            source.write_bytes(source.read_bytes()+b'\n<!-- TAMPER -->\n')
            before=(dst/'Main.gd').read_bytes()
            p=subprocess.run([sys.executable,str(dst/'bridge/emit_godot.py')],capture_output=True,text=True)
            self.assertNotEqual(p.returncode,0)
            self.assertIn('SOURCE CHANGED',p.stderr)
            self.assertEqual((dst/'Main.gd').read_bytes(),before)
    def test_refuse_corrupted_semantics_and_keep_host_intact(self):
        with tempfile.TemporaryDirectory() as t:
            dst=Path(t)/'test';shutil.copytree(ROOT,dst)
            plan=dst/'bridge/semantic_plan.json';p=json.loads(plan.read_text())
            p['operations']['kic']['spin_delta']=-99.0
            plan.write_text(json.dumps(p))
            before=(dst/'Main.gd').read_bytes()
            result=subprocess.run([sys.executable,str(dst/'bridge/emit_godot.py')],capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual((dst/'Main.gd').read_bytes(),before)
    def test_native_unattended_runner_test_requirements(self):
        source=(ROOT/'tests/host_logic_test.gd').read_text()
        for s in ['extends SceneTree','func check','func _run','load("res://Main.tscn")','scene.trigger_kic()','scene.trigger_wake()','scene.keyboard_actions["RIGHT"] = true','scene.complete','scene.receipt_data()','quit(0 if fails == 0 else 1)']:
            with self.subTest(s=s):self.assertIn(s,source)
    def test_no_false_native_pass_file(self):
        proof=json.loads((ROOT/'tests/STATIC_QA_RESULT.json').read_text())
        self.assertNotEqual(proof['godot_runtime'],'PASS')
        self.assertEqual(proof['new_godot_ding'],'HOLD')
    def test_declared_scope_limited(self):
        self.assertGreaterEqual(len(self.plan['hold']),5)
        self.assertIn('NOT a full port',self.plan['scope'])
        self.assertIn('Godot real-host runtime until owner test',self.plan['hold'])
if __name__=='__main__':
    unittest.main(verbosity=2)
