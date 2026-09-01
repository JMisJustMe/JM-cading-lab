from __future__ import annotations
import importlib.util,tempfile,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
MODULE_PATH=ROOT/"coding-estate/everybody/semantic-depth/tools/semantic_depth_factory.py"
SPEC=importlib.util.spec_from_file_location("semantic_depth_factory",MODULE_PATH)
assert SPEC and SPEC.loader
factory=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(factory)

class SemanticDepthFactoryTests(unittest.TestCase):
 def test_all_hundred_body_specific_and_isolated(self):
  with tempfile.TemporaryDirectory() as tmp:
   m=factory.build(ROOT,Path(tmp)); self.assertEqual(m["body_count"],100); self.assertEqual(m["unique_namespaces"],100); self.assertEqual(m["unique_semantic_signatures"],100); self.assertTrue(m["all_capabilities_executed"]); self.assertTrue(m["all_fault_recovery_passed"]); self.assertTrue(m["all_isolated_processes_passed"]); self.assertEqual(m["machine_kernel_ding"],"OPEN_PER_BODY")
 def test_named_bodies_have_distinct_semantics(self):
  bodies={item["id"]:item for item in factory.load_bodies(ROOT)}; names=["cading","quadze","routeos","flowtalk","formeula","game-coding","recorp"]; profiles=[factory.profile(bodies[name]) for name in names]
  self.assertEqual(len({item["semantic_signature"] for item in profiles}),len(names)); self.assertEqual(len({item["source_prefix"] for item in profiles}),len(names)); self.assertTrue(all(item["capability_effects"] for item in profiles))
 def test_cross_body_source_rejected(self):
  bodies=factory.load_bodies(ROOT); first=factory.profile(bodies[0]); second=factory.profile(bodies[1])
  with self.assertRaises(ValueError): factory.parse(second,factory.proof_source(first))
 def test_fault_and_recovery_are_required(self):
  current=factory.profile(factory.load_bodies(ROOT)[0]); source="\n".join(line for line in factory.proof_source(current).splitlines() if "::recover " not in line)+"\n"
  with self.assertRaises(ValueError): factory.execute(current,factory.lower(current,factory.parse(current,source)))
 def test_all_declared_capabilities_execute(self):
  body=next(item for item in factory.load_bodies(ROOT) if item["id"]=="cading"); current=factory.profile(body); state=factory.execute(current,factory.lower(current,factory.parse(current,factory.proof_source(current))))
  self.assertEqual(set(state["capabilities"]),{item["verb"] for item in current["capability_effects"]}); self.assertGreaterEqual(len(state["capabilities"]),len(body["caps"]))
 def test_deterministic(self): factory.deterministic(ROOT)

if __name__=="__main__": unittest.main()
