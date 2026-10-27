import copy, hashlib, json, os, sys, tempfile, unittest, zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import JM_M001_PURPOSE_AND_ACCESS_OVERLAY_CP13 as cp
DONOR=os.environ.get('JM_M001_PROTECTED_GATE_PATH', str(Path(__file__).with_name('JM_M001_Carrier_Admission_Gate_v0_1.py')))

class CP13Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        d=Path(self.tmp.name)
        self.d=d
        self.now=datetime(2026,10,27,22,50,tzinfo=timezone.utc)
        self.root=d/'root.zip';self.house=d/'house.zip';self.cold=d/'cold.zip'
        with zipfile.ZipFile(self.root,'w') as z:z.writestr('hello.txt','original JM source'*30)
        raw=self.root.read_bytes();self.house.write_bytes(raw);self.cold.write_bytes(raw)
        self.rootid='libfile_'+'1'*32
        self.houseid='libfile_'+'2'*32
        self.row={'label':'SYNTHETIC ONLY', 'root_path':str(self.root),'house_path':str(self.house),
            'root_native_id':self.rootid,'house_native_id':self.houseid,'root_expected_bytes':len(raw),
            'sha256':hashlib.sha256(raw).hexdigest(),
            'root_created_at':(self.now-timedelta(days=9)).isoformat(),
            'root_active_library_verified':True,'house_active_library_verified':True,
            'independent_cold_download_path':str(self.cold),'independent_provider_origin_authenticated':True,
            'role_release_evidence':{k:True for k in cp.NECESSARY},
            'explicit_authorization_evidence':{'exact_root_native_id':self.rootid,'acknowledged_native_link_loss':True,'authority':'owner_explicit_specific_release'}}
        self.g=cp.donor_import(DONOR)
    def tearDown(self):self.tmp.cleanup()
    def ev(self,row=None):return cp.evaluate(row if row is not None else self.row,self.g,self.now)
    def test_positive_is_review_only(self):
        x=self.ev();self.assertEqual(x['decision'],'REVIEW_READY_NEEDS_HOST_AUTHORIZATION');self.assertFalse(x['retirement_authorised']);self.assertEqual(x['claimed_quota_savings_bytes'],0)
    def test_byte_identity_not_permission(self):
        x=self.ev({**self.row,'role_release_evidence':{}})
        self.assertIn('ROLE_HOLD:direct_link_released',x['hold_reasons']);self.assertEqual(x['decision'],'HOLD')
    def test_each_role_binds_independently(self):
        for k in cp.NECESSARY:
            with self.subTest(role=k):
                a=copy.deepcopy(self.row);a['role_release_evidence'][k]=False
                self.assertIn('ROLE_HOLD:'+k,self.ev(a)['hold_reasons'])
    def test_missing_intended_future_use(self):
        a=copy.deepcopy(self.row);a['role_release_evidence'].pop('reserved_future_use_released');self.assertEqual(self.ev(a)['decision'],'HOLD')
    def test_no_direct_link_approval(self):
        a=copy.deepcopy(self.row);a['role_release_evidence']['direct_link_released']=False;self.assertEqual(self.ev(a)['decision'],'HOLD')
    def test_owner_release_id_mismatch(self):
        a=copy.deepcopy(self.row);a['explicit_authorization_evidence']['exact_root_native_id']=self.houseid;self.assertIn('NO_EXACT_OWNER_NATIVE_ROLE_RELEASE',self.ev(a)['hold_reasons'])
    def test_owner_release_missing(self):
        a=copy.deepcopy(self.row);a['explicit_authorization_evidence']=None;self.assertIn('NO_EXACT_OWNER_NATIVE_ROLE_RELEASE',self.ev(a)['hold_reasons'])
    def test_link_loss_unevidenced(self):
        a=copy.deepcopy(self.row);a['explicit_authorization_evidence']['acknowledged_native_link_loss']=False;self.assertEqual(self.ev(a)['decision'],'HOLD')
    def test_wrong_authority_string(self):
        a=copy.deepcopy(self.row);a['explicit_authorization_evidence']['authority']='assistant_inference';self.assertEqual(self.ev(a)['decision'],'HOLD')
    def test_live_root_absent(self):
        a=copy.deepcopy(self.row);a['root_active_library_verified']=False;self.assertIn('ROOT_LIVE_RESIDENCY_NOT_AUTHENTICATED',self.ev(a)['hold_reasons'])
    def test_live_house_absent(self):
        a=copy.deepcopy(self.row);a['house_active_library_verified']=False;self.assertIn('HOUSE_LIVE_RESIDENCY_NOT_AUTHENTICATED',self.ev(a)['hold_reasons'])
    def test_future_age(self):
        a=copy.deepcopy(self.row);a['root_created_at']=(self.now-timedelta(hours=1)).isoformat();self.assertIn('96H_PRESERVATION_WINDOW_OPEN',self.ev(a)['hold_reasons'])
    def test_naive_age_hold(self):
        a=copy.deepcopy(self.row);a['root_created_at']='2026-10-22T15:00:00';self.assertIn('CREATED_AT_UNPROVED',self.ev(a)['hold_reasons'])
    def test_bad_created_hold(self):
        a=copy.deepcopy(self.row);a['root_created_at']='notdate';self.assertIn('CREATED_AT_UNPROVED',self.ev(a)['hold_reasons'])
    def test_missing_cold(self):
        a=copy.deepcopy(self.row);a['independent_cold_download_path']=None;self.assertIn('INDEPENDENT_PROVIDER_DOWNLOAD_NOT_PRESENT',self.ev(a)['hold_reasons'])
    def test_bad_cold_hash(self):
        self.cold.write_bytes(b'other');self.assertTrue(any(x.startswith('COLD_RESTORE_INVALID') for x in self.ev()['hold_reasons']))
    def test_cold_provenance_hold(self):
        a=copy.deepcopy(self.row);a['independent_provider_origin_authenticated']=False;self.assertIn('COLD_PROVIDER_PROVENANCE_UNAUTHENTICATED',self.ev(a)['hold_reasons'])
    def test_cold_source_alias_hold(self):
        a=copy.deepcopy(self.row);a['independent_cold_download_path']=str(self.root);self.assertTrue(any(x.startswith('COLD_RESTORE_INVALID') for x in self.ev(a)['hold_reasons']))
    def test_root_hash_tampered_hold(self):
        self.root.write_bytes(b'tamper');self.assertIn('SOURCE_HOUSE_HASH_OR_BYTES_NOT_PROVED',self.ev()['hold_reasons'])
    def test_house_hash_tampered_hold(self):
        self.house.write_bytes(b'tamper');self.assertIn('SOURCE_HOUSE_HASH_OR_BYTES_NOT_PROVED',self.ev()['hold_reasons'])
    def test_root_size_wrong_hold(self):
        a=copy.deepcopy(self.row);a['root_expected_bytes']+=1;self.assertIn('ROOT_EXPECTED_BYTES_MISMATCH',self.ev(a)['hold_reasons'])
    def test_bad_expected_hash_hold(self):
        a=copy.deepcopy(self.row);a['sha256']='0'*64;self.assertIn('SOURCE_HOUSE_HASH_OR_BYTES_NOT_PROVED',self.ev(a)['hold_reasons'])
    def test_invalid_hash_format(self):
        a=copy.deepcopy(self.row);a['sha256']='not-a-hash';self.assertEqual(self.ev(a)['decision'],'HOLD')
    def test_same_library_id_refused(self):
        a=copy.deepcopy(self.row);a['house_native_id']=self.rootid;self.assertTrue(any('SEPARATE_NATIVE_IDS_REQUIRED' in x for x in self.ev(a)['hold_reasons']))
    def test_missing_root_file_hold(self):
        self.root.unlink();self.assertEqual(self.ev()['decision'],'HOLD')
    def test_same_inode_refused(self):
        self.house.unlink();os.link(self.root,self.house);self.assertEqual(self.ev()['decision'],'HOLD')
    def test_corrupt_zip_rejected(self):
        self.root.write_bytes(self.root.read_bytes()[:32]);self.assertEqual(self.ev()['decision'],'HOLD')
    def test_exact_protected_donor_minus_single_terminal_lf_accepted(self):
        raw=Path(DONOR).read_bytes()
        canonical=raw if raw.endswith(b'\n') else raw+b'\n'
        p=self.d/'valid_one_missing_lf.py'
        p.write_bytes(canonical[:-1])
        self.assertTrue(hasattr(cp.donor_import(p),'assess'))
    def test_donor_file_tamper_refused(self):
        p=self.d/'false_donor.py';p.write_bytes(Path(DONOR).read_bytes()+b'\n# fake')
        with self.assertRaisesRegex(ValueError,'DONOR_SHA_MISMATCH'):cp.donor_import(p)
    def test_nonregular_donor_refused(self):
        with self.assertRaises(ValueError):cp.donor_import(self.d)
    def test_output_no_side_effects(self):
        before=[p.read_bytes() for p in (self.root,self.house,self.cold)]
        x=cp.run({'records':[self.row]},DONOR,self.now)
        self.assertEqual(x['native_mutations'],0);self.assertEqual(x['retirement_authorised_count'],0)
        self.assertEqual(x['new_account_quota_savings_bytes'],0)
        self.assertEqual(before,[p.read_bytes() for p in (self.root,self.house,self.cold)])

if __name__=='__main__':unittest.main(verbosity=2)
