from __future__ import annotations
import importlib.util,tempfile,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
MODULE_PATH=ROOT/"coding-estate/everybody/semantic-depth/tools/qemu_kernel_factory.py"
SPEC=importlib.util.spec_from_file_location("qemu_kernel_factory",MODULE_PATH)
assert SPEC and SPEC.loader
factory=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(factory)

class QemuKernelFactoryTests(unittest.TestCase):
 def test_all_hundred_build_distinct_images(self):
  with tempfile.TemporaryDirectory() as tmp:
   m=factory.build(ROOT,Path(tmp),False)
   self.assertEqual(m["body_count"],100);self.assertEqual(m["unique_kernel_hashes"],100);self.assertEqual(m["unique_compiler_namespaces"],100);self.assertFalse(m["all_qemu_passed"])
 def test_kernel_source_carries_body_semantics(self):
  bodies={item["id"]:item for item in factory.load_bodies(ROOT)}
  for name in ("cading","quadze","routeos","formeula","recorp"):
   current=factory.profile(bodies[name]);source=factory.kernel_source(current)
   self.assertIn(f'JM_BODY_BOOT:{name}',source);self.assertIn(current["semantic_signature"],source);self.assertIn(current["namespace"]+".semantic-to-x86-v0.3",source)
 def test_distinct_sources(self):
  bodies=factory.load_bodies(ROOT);sources={factory.sha(factory.kernel_source(factory.profile(body))) for body in bodies};self.assertEqual(len(sources),100)

if __name__=="__main__":unittest.main()
