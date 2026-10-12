"""Synthetic safety tests only: no actual private game code or REA execution."""
import unittest, importlib.util
from pathlib import Path

p=Path(__file__).with_name('jm_rea_private_combound_runner_v0_8.py')
spec=importlib.util.spec_from_file_location('private_binding',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
SUBJECT='a'*64
MODULE='b'*64
MANIFEST=[{'module':'combound_inline_000.js','sha256':MODULE,'bytes':123}]
def node(name,artifact=MODULE):
 return {'kind':'function','label':name,'node_id':'jsrg_node_'+('e'*64),
  'identity':{'module_path':'combound_inline_000.js','artifact_sha256':artifact}}
def evidence(nodes=None,root=SUBJECT,subject=SUBJECT):
 return {'subject':{'digest':{'sha256':subject}},'normalized_result':
  {'semantic_graph':{'root_artifact_sha256':root,'nodes':nodes if nodes is not None else
    [node('releaseDrag'),node('commitShot')]}}}
def validate(record=None,module='combound_inline_000.js',roots='releaseDrag,commitShot'):
 return m.verify_staged_rea_identity(record if record is not None else evidence(),MANIFEST,module,roots)

class SourceBinding(unittest.TestCase):
 def test_original_module_hash_and_subject_match(self):
  proof=validate();self.assertTrue(proof['extracted_source_chain_confirmed'])
  self.assertEqual(proof['selected_module_sha256'],MODULE)
  self.assertEqual(len(proof['verified_function_roots']),2)
 def test_mismatched_rea_subject_refused(self):
  with self.assertRaisesRegex(RuntimeError,'REA_SUBJECT_GRAPH_DIGEST_MISMATCH'):
   validate(evidence(root='f'*64))
 def test_mismatched_method_source_digest_refused(self):
  with self.assertRaisesRegex(RuntimeError,'REA_FUNCTION_SOURCE_DIGEST_MISMATCH_releaseDrag'):
   validate(evidence(nodes=[node('releaseDrag','f'*64),node('commitShot')]))
 def test_missing_method_refused(self):
  with self.assertRaisesRegex(RuntimeError,'REA_FUNCTION_ROOT_MISSING_OR_AMBIGUOUS_commitShot'):
   validate(evidence(nodes=[node('releaseDrag')]))
 def test_ambiguous_method_refused(self):
  with self.assertRaisesRegex(RuntimeError,'REA_FUNCTION_ROOT_MISSING_OR_AMBIGUOUS_releaseDrag'):
   validate(evidence(nodes=[node('releaseDrag'),node('releaseDrag'),node('commitShot')]))
 def test_module_must_have_been_staged(self):
  with self.assertRaisesRegex(RuntimeError,'SELECTED_SOURCE_MODULE_NOT_STAGED'):
   validate(module='different.js')
 def test_duplicate_roots_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'BAD_OR_DUPLICATE_ROOTS'):
   validate(roots='releaseDrag,releaseDrag')
 def test_receipt_has_no_private_code(self):
  out=validate()
  self.assertNotIn('function ',str(out))
  self.assertNotIn('<script',str(out))
  self.assertNotIn('protected HTML',str(out))

if __name__=='__main__': unittest.main()
