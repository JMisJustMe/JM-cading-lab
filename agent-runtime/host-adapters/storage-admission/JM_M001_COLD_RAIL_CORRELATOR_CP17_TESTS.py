import copy,json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import JM_M001_COLD_RAIL_CORRELATOR_CP17 as cp

class CP17(unittest.TestCase):
 def setUp(self):
  self.l=[{'name':'A.zip','bytes':100,'id':'libfile_'+'a'*32},
          {'name':'B.zip','bytes':200,'id':'libfile_'+'b'*32},
          {'name':'X.zip','bytes':500,'id':'libfile_'+'c'*32}]
  self.d=[{'name':'A.zip','bytes':100,'id':'id:X_A'},
          {'name':'B.zip','bytes':999,'id':'id:X_B'},
          {'name':'Z.zip','bytes':555,'id':'id:X_Z'}]
 def report(self):return cp.correlate(self.l,self.d)
 def test_counts(self):
  a=self.report();self.assertEqual((a['library_count'],a['provider_count'],a['same_name_groups'],a['library_unmatched'],a['provider_unmatched']),(3,3,2,1,1))
 def test_equal_metadata_not_certification(self):
  a=self.report();self.assertEqual(a['findings'][0]['signal'],'SAME_NAME_SIZE_CANDIDATE_NEEDS_SHA_CONTACT');self.assertFalse(a['provider_origin_authenticated'])
 def test_different_bytes_do_not_merge(self):
  a=self.report();self.assertEqual(a['findings'][1]['signal'],'SAME_NAME_DIFFERENT_BYTES_KEEP_BOTH')
 def test_all_keep_and_zero_reclaim(self):
  a=self.report();self.assertEqual(a['native_mutations'],0);self.assertEqual(a['reclaimed_bytes'],0)
  self.assertTrue(all(x['decision']=='KEEP_ALL' and not x['retirement_authorised'] and x['credited_reclaimed_bytes']==0 for x in a['findings']))
 def test_same_name_multiple_library(self):
  self.l.append({'name':'A.zip','bytes':100,'id':'libfile_'+'d'*32});self.assertEqual(self.report()['findings'][0]['signal'],'AMBIGUOUS_MULTIPLE_IDENTITIES_KEEP_ALL')
 def test_same_name_multiple_provider(self):
  self.d.append({'name':'A.zip','bytes':100,'id':'id:X_COPY'});self.assertEqual(self.report()['findings'][0]['signal'],'AMBIGUOUS_MULTIPLE_IDENTITIES_KEEP_ALL')
 def test_multiple_disjoint_uses_stay_separate(self):
  self.l.append({'name':'A.zip','bytes':99,'id':'libfile_'+'d'*32});r=self.report();self.assertEqual(len(r['findings'][0]['library']),2)
 def test_size_zero_valid(self):
  self.l[0]['bytes']=self.d[0]['bytes']=0;self.assertEqual(self.report()['same_name_size_leads'],1)
 def test_bool_size_refused(self):
  self.l[0]['bytes']=True
  with self.assertRaises(ValueError):self.report()
 def test_negative_size_refused(self):
  self.l[0]['bytes']=-1
  with self.assertRaises(ValueError):self.report()
 def test_absurd_size_refused(self):
  self.l[0]['bytes']=10**14
  with self.assertRaises(ValueError):self.report()
 def test_float_size_refused(self):
  self.l[0]['bytes']=1.0
  with self.assertRaises(ValueError):self.report()
 def test_missing_native_id_refused(self):
  self.l[0].pop('id')
  with self.assertRaises(ValueError):self.report()
 def test_invalid_library_id_refused(self):
  self.l[0]['id']='id:fake'
  with self.assertRaises(ValueError):self.report()
 def test_invalid_dropbox_id_refused(self):
  self.d[0]['id']='libfile_'+'0'*32
  with self.assertRaises(ValueError):self.report()
 def test_duplicate_same_rail_id_refused(self):
  self.l[1]['id']=self.l[0]['id']
  with self.assertRaises(ValueError):self.report()
 def test_same_string_two_rails_not_identity_collapse(self):
  self.d[0]['id']='id:002';self.assertEqual(self.report()['same_name_size_leads'],1)
 def test_missing_filename_refused(self):
  self.d[0].pop('name')
  with self.assertRaises(ValueError):self.report()
 def test_slash_filename_refused(self):
  self.l[0]['name']='foo/A.zip'
  with self.assertRaises(ValueError):self.report()
 def test_backslash_filename_refused(self):
  self.l[0]['name']='foo\\A.zip'
  with self.assertRaises(ValueError):self.report()
 def test_parent_filename_refused(self):
  self.l[0]['name']='..'
  with self.assertRaises(ValueError):self.report()
 def test_non_nfc_refused(self):
  self.l[0]['name']='A\u0301.zip'
  with self.assertRaises(ValueError):self.report()
 def test_control_filename_refused(self):
  self.d[0]['name']='A\x00.zip'
  with self.assertRaises(ValueError):self.report()
 def test_empty_filename_refused(self):
  self.d[0]['name']=''
  with self.assertRaises(ValueError):self.report()
 def test_oversized_filename_refused(self):
  self.d[0]['name']='x'*513
  with self.assertRaises(ValueError):self.report()
 def test_nonlist_refused(self):
  with self.assertRaises(ValueError):cp.correlate({},[])
 def test_non_object_refused(self):
  self.l.append('not object')
  with self.assertRaises(ValueError):self.report()
 def test_inventory_over_max_refused(self):
  with self.assertRaises(ValueError):cp.validate([{}]*(cp.MAX_ITEMS+1),'library')
 def test_empty_inputs(self):
  x=cp.correlate([],[]);self.assertEqual(x['findings'],[]);self.assertEqual(x['reclaimed_bytes'],0)
 def test_name_match_exact_no_casefold(self):
  self.d[0]['name']='a.ZIP';self.assertEqual(self.report()['same_name_size_leads'],0)
 def test_input_not_modified(self):
  a=copy.deepcopy((self.l,self.d));self.report();self.assertEqual((self.l,self.d),a)
 def test_role_release_spoof_ignored(self):
  self.d[0]['owner_release']=True;self.l[0]['approved_retirement']=True;self.assertEqual(self.report()['reclaimed_bytes'],0)
 def test_connector_origin_spoof_ignored(self):
  self.d[0]['verified_provider']=True;self.assertFalse(self.report()['provider_origin_authenticated'])
 def test_same_name_mismatch_count(self):
  x=self.report();self.assertEqual((x['same_name_size_leads'],x['same_name_different_size_holds']),(1,1))
 def test_readonly_cli_refuses_existing_target(self):
  with tempfile.TemporaryDirectory() as tmp:
   t=Path(tmp);L=t/'L.json';D=t/'D.json';L.write_text(json.dumps(self.l));D.write_text(json.dumps(self.d))
   call=[sys.executable,str(Path(cp.__file__)),'--library',str(L),'--dropbox',str(D),'--output',str(L)]
   x=subprocess.run(call,capture_output=True,text=True)
   self.assertNotEqual(x.returncode,0);self.assertEqual(json.loads(L.read_text()),self.l)
 def test_readonly_cli_new_output_no_input_changes(self):
  with tempfile.TemporaryDirectory() as tmp:
   t=Path(tmp);L=t/'L.json';D=t/'D.json';O=t/'O.json';L.write_text(json.dumps(self.l));D.write_text(json.dumps(self.d));before=(L.read_bytes(),D.read_bytes())
   x=subprocess.run([sys.executable,str(Path(cp.__file__)),'--library',str(L),'--dropbox',str(D),'--output',str(O)],capture_output=True,text=True)
   self.assertEqual(x.returncode,0,x.stderr);self.assertEqual(before,(L.read_bytes(),D.read_bytes()));self.assertEqual(json.loads(O.read_text())['native_mutations'],0)

if __name__=='__main__':unittest.main(verbosity=2)
