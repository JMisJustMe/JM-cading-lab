from __future__ import annotations
import importlib.util,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
MODULE_PATH=ROOT/"coding-estate/everybody/semantic-depth/tools/simultaneous_federation_factory.py"
SPEC=importlib.util.spec_from_file_location("simultaneous_federation_factory",MODULE_PATH)
assert SPEC and SPEC.loader
factory=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(factory)

class SimultaneousFederationFactoryTests(unittest.TestCase):
 def test_all_hundred_profiles_have_distinct_federation_namespaces(self):
  profiles=[factory.profile(body) for body in factory.load_bodies(ROOT)]
  namespaces={p['namespace']+'.semantic-to-x86-federation-v0.6' for p in profiles}
  self.assertEqual(len(profiles),100);self.assertEqual(len(namespaces),100)
 def test_link_tokens_form_ordered_chain(self):
  profiles=[factory.profile(body) for body in factory.load_bodies(ROOT)]
  links=[factory.token32({'edge':'GENESIS','to':profiles[0]['semantic_signature']})]
  links += [factory.token32({'from':a['semantic_signature'],'to':b['semantic_signature']}) for a,b in zip(profiles,profiles[1:])]
  links.append(factory.token32({'from':profiles[-1]['semantic_signature'],'edge':'TERMINUS'}))
  self.assertEqual(len(links),101);self.assertGreater(len(set(links)),90)
  for i,p in enumerate(profiles):
   source=factory.federation_source(p,links[i],links[i+1],i+1,100)
   self.assertIn(f'#define BODY_ID "{p["body"]["id"]}"',source)
   self.assertIn(f'#define INCOMING_TOKEN 0x{links[i]:08x}u',source)
   self.assertIn(f'#define OUTGOING_TOKEN 0x{links[i+1]:08x}u',source)
   self.assertIn('JM_FED_MACHINE_DING:PASS',source)

if __name__=='__main__':unittest.main()
