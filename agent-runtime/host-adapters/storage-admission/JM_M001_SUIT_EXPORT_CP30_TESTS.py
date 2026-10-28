#!/usr/bin/env python3
"""Public-safe synthetic JM SUIT CP30 export-admission QA; no private assets."""
import hashlib
import importlib.util
import io
import json
import os
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('cp30',HERE/'JM_M001_SUIT_EXPORT_CP30.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


def fixture():
    d={}
    scripts=[]
    for i in range(8):
        name=f'jm_code/{i:02d}_synthetic.js'
        body=f'function synthetic_{i}(){{return {i};}}\n'.encode()
        d[name]=body
        scripts.append({'name':name,'bytes':len(body),'sha256':m.sha(body)})
    d['index.html']=b'<!doctype html><title>synthetic only</title>'+b''.join(
        b'<script src="'+p['name'].encode()+b'"></script>' for p in scripts)
    flat=d['index.html']
    for p in scripts:
        flat=flat.replace(b'<script src="'+p['name'].encode()+b'"></script>',b'<script>'+d[p['name']]+b'</script>')
    d['MANIFEST.json']=json.dumps({'schema':'JM.SUIT.MODULAR.RECOVERY.v1',
      'script_parts':scripts,'original_html_sha256':m.sha(flat),'original_html_bytes':len(flat)}).encode()
    return d,flat


class CP30(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=Path(self.tmp.name)
        self.data,self.original=fixture()
        self.zip=self.path/'fixture.zip'
        with zipfile.ZipFile(self.zip,'w',zipfile.ZIP_DEFLATED) as z:
            for k,v in self.data.items():z.writestr(k,v)
        self.keeper=self.path/'keeper.html';self.keeper.write_bytes(self.original)

    def tearDown(self):self.tmp.cleanup()

    def gate(self,**kw):
        return m.preflight({'archive':self.zip,'source_dir':None},
            self.keeper,HERE,**kw)

    def test_original_reused_without_any_new_file(self):
        result=self.gate()
        self.assertEqual(result['status'],'REUSE_EXACT_KEEPER')
        self.assertFalse(result['qa_file_created'])
        self.assertEqual(result['quota_savings_claimed_bytes'],0)
        self.assertFalse(result['native_library_write_authorised'])

    def test_modular_exact_recovery(self):
        original,exact=m.reconstruct(m.read_source(archive=self.zip))
        self.assertTrue(exact)
        self.assertEqual(original,self.original)

    def test_explicit_qa_output_only(self):
        qa=self.path/'qa-new.html'
        result=self.gate(qa_output=qa)
        self.assertTrue(result['qa_file_created'])
        self.assertEqual(qa.read_bytes(),self.original)
        with self.assertRaisesRegex(ValueError,'QA_OUTPUT_MUST_BE_NEW'):
            self.gate(qa_output=qa)

    def test_missing_keeper_fails(self):
        self.keeper.unlink()
        with self.assertRaisesRegex(ValueError,'KEEPER_NOT_REGULAR'):
            self.gate()

    def test_keeper_role_not_forged(self):
        self.keeper.write_bytes(b'wrong')
        result=self.gate()
        self.assertEqual(result['status'],'HOLD_DISTINCT_RELEASE_REQUIRES_OWNER_ROLE')
        self.assertFalse(result['native_retirement_authorised'])

    def test_modification_requires_changed_mode(self):
        d=dict(self.data)
        key='jm_code/07_synthetic.js'
        d[key]+=b'// legal edit\n'
        other=self.path/'changed.zip'
        with zipfile.ZipFile(other,'w') as z:
            for n,b in d.items():z.writestr(n,b)
        self.zip=other
        with self.assertRaisesRegex(ValueError,'BASELINE_MODULE_HASH_CHANGED'):
            self.gate()
        r=self.gate(mode='changed')
        self.assertEqual(r['status'],'HOLD_DISTINCT_RELEASE_REQUIRES_OWNER_ROLE')
        self.assertFalse(r['qa_file_created'])

    def test_changed_mode_cannot_claim_original(self):
        with self.assertRaisesRegex(ValueError,'UNCHANGED_SOURCE'):
            self.gate(mode='changed')

    def test_syntax_error_rejected(self):
        d=dict(self.data);d['jm_code/02_synthetic.js']=b'function broken( {'
        bad=self.path/'bad-js.zip'
        with zipfile.ZipFile(bad,'w') as z:
            for n,b in d.items():z.writestr(n,b)
        self.zip=bad
        with self.assertRaisesRegex(ValueError,'JAVASCRIPT_SYNTAX_REFUSED'):
            self.gate(mode='changed')

    def test_corrupt_zip_refused(self):
        self.zip.write_bytes(b'not zip')
        with self.assertRaises((zipfile.BadZipFile,ValueError)):
            self.gate()

    def test_zip_traversal_refused(self):
        with zipfile.ZipFile(self.zip,'a') as z:z.writestr('../escape',b'escape')
        with self.assertRaisesRegex(ValueError,'UNSAFE_ARCHIVE_MEMBER'):
            self.gate()

    def test_zip_duplicate_refused(self):
        with zipfile.ZipFile(self.zip,'a') as z:z.writestr('index.html',b'fake')
        with self.assertRaisesRegex(ValueError,'DUPLICATE_OR_TOO_MANY_MEMBERS'):
            self.gate()

    def test_archive_symlink_refused(self):
        link=self.path/'link.zip'
        try:os.symlink(self.zip,link)
        except OSError:self.skipTest('symlinks unavailable')
        self.zip=link
        with self.assertRaisesRegex(ValueError,'BAD_MODULAR_ARCHIVE'):
            self.gate()

    def test_required_module_refused(self):
        d=dict(self.data);d.pop('jm_code/03_synthetic.js')
        other=self.path/'missing.zip'
        with zipfile.ZipFile(other,'w') as z:
            for k,v in d.items():z.writestr(k,v)
        self.zip=other
        with self.assertRaisesRegex(ValueError,'REQUIRED_SOURCE_MISSING'):
            self.gate()

    def test_repeated_script_link_refused(self):
        d=dict(self.data);d['index.html']+=b'<script src="jm_code/03_synthetic.js"></script>'
        other=self.path/'duplicate-tag.zip'
        with zipfile.ZipFile(other,'w') as z:
            for k,v in d.items():z.writestr(k,v)
        self.zip=other
        with self.assertRaisesRegex(ValueError,'DUPLICATE_SOURCE_SCRIPT_ENTRY'):
            self.gate()

    def test_no_keeper_or_source_collapse(self):
        with self.assertRaisesRegex(ValueError,'SELECT_EXACTLY_ONE_SOURCE'):
            m.read_source(archive=self.zip,source_dir=self.path)
        with self.assertRaisesRegex(ValueError,'SELECT_EXACTLY_ONE_SOURCE'):
            m.read_source()


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(CP30)
    res=unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'schema':'JM.M001.SUIT.CP30.Test/1','run':res.testsRun,
      'pass':res.wasSuccessful(),'failures':len(res.failures),'errors':len(res.errors)}))
    raise SystemExit(0 if res.wasSuccessful() else 2)
