from __future__ import annotations
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
MODULE_PATH=ROOT/"coding-estate/everybody/functioning-bodies/tools/functioning_body_factory.py"
SPEC=importlib.util.spec_from_file_location("functioning_body_factory",MODULE_PATH)
assert SPEC and SPEC.loader
factory=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(factory)

class FunctioningBodyFactoryTests(unittest.TestCase):
 def test_loads_exact_first_hundred(self):
  bodies=factory.load_bodies(ROOT)
  self.assertEqual(len(bodies),100)
  ids={body["id"] for body in bodies}
  self.assertIn("cading",ids)
  self.assertIn("quadze",ids)

 def test_all_hundred_execute_state_and_capability(self):
  with tempfile.TemporaryDirectory() as tmp:
   manifest=factory.build(ROOT,Path(tmp))
   self.assertEqual(manifest["body_count"],100)
   self.assertTrue(manifest["all_state_changed"])
   self.assertTrue(manifest["all_capabilities_executed"])
   self.assertEqual(manifest["status"],"PORTABLE_FUNCTIONING_PARITY_PASS_NOT_FULL_NATIVE_CROWN")
   self.assertEqual(len({r["semantic_signature"] for r in manifest["receipts"]}),100)
   for receipt in manifest["receipts"]:
    self.assertEqual(receipt["status"],"FUNCTIONING_BODY_EXECUTED")
    self.assertGreater(receipt["trace_count"],0)
    self.assertEqual(receipt["machine_kernel_ding"],"OPEN")

 def test_sources_are_body_namespaced_and_cross_body_rejected(self):
  bodies=factory.load_bodies(ROOT)
  first,second=bodies[0],bodies[1]
  d1=factory.dialect(first)
  d2=factory.dialect(second)
  source=factory.proof_source(first,d1,1)
  self.assertIn(d1["source_prefix"],source)
  self.assertNotEqual(d1["source_prefix"],d2["source_prefix"])
  with self.assertRaises(ValueError):
   factory.parse(d2,source)

 def test_invalid_verb_rejected(self):
  body=factory.load_bodies(ROOT)[0]
  d=factory.dialect(body)
  source="\n".join([
   f"USE {body['id']}",
   f"LAW {json.dumps(body['law'])}",
   f"{d['source_prefix']}definitely-not-valid {{}}",
   "RECEIPT",
   "",
  ])
  with self.assertRaises(ValueError):
   factory.parse(d,source)

 def test_all_present_family_routes_are_functional(self):
  families={factory.classify(body) for body in factory.load_bodies(ROOT)}
  confirmed={"route","logic","formula","embodied","compiler","runtime","game","governance","delivery","visual","authoring","composition"}
  self.assertTrue(confirmed.issubset(families))
  self.assertTrue(families.issubset(factory.FAMILY_PRIMITIVES))

 def test_deterministic(self):
  factory.deterministic(ROOT)

if __name__=="__main__":
 unittest.main()
