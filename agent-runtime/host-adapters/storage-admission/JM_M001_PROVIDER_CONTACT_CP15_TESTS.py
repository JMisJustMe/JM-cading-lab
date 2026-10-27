#!/usr/bin/env python3
"""Synthetic-only adversarial tests for M001 CP15 provider-byte contact."""
import copy,hashlib,json,os,tempfile,unittest
from pathlib import Path
from JM_M001_PROVIDER_CONTACT_CP15 import parent_import,run,evaluate
D=Path(__file__).resolve().parent
OVERLAY=D/'JM_M001_PURPOSE_AND_ACCESS_OVERLAY_CP13.py'
DONOR=D/'JM_M001_Carrier_Admission_Gate_v0_1.py'

class CP15(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
  self.dir=Path(self.temp.name)
  self.a=self.dir/'lib.html';self.b=self.dir/'drop.html';self.a.write_bytes(b'<!doctype html>CP15 witness'*200)
  self.b.write_bytes(self.a.read_bytes())
  self.overlay,self.donor=parent_import(OVERLAY,DONOR)
  sha=hashlib.sha256(self.a.read_bytes()).hexdigest()
  self.row={'family':'SYNTHETIC','library_native_id':'libfile_'+'a'*32,'provider_file_id':'id:abcdABCD0123_-',
    'library_snapshot_path':str(self.a),'provider_readback_path':str(self.b),
    'provider_metadata':{'id':'id:abcdABCD0123_-','size':self.a.stat().st_size,'is_downloadable':True},
    'expected_bytes':self.a.stat().st_size,'expected_sha256':sha}
 def check(self,field,expected='INVALID'):
  out=evaluate(self.row,self.overlay,self.donor);self.assertEqual(out['contact'],expected);self.assertFalse(out['retirement_authorised']);self.assertEqual(out['native_mutations'],0);self.assertEqual(out['credited_library_reclaim_bytes'],0);self.assertEqual(out['decision'],'HOLD')
 def test_exact_contact_with_explicit_hold(self):self.check(None,'EXACT_FILE_BYTES')
 def test_run_all_held(self):
  out=run([self.row],OVERLAY,DONOR);self.assertEqual(out['exact_contact_count'],1);self.assertEqual(out['held_count'],1);self.assertEqual(out['account_quota_bytes_claimed'],0)
 def test_provider_not_fully_authenticated(self):
  out=evaluate(self.row,self.overlay,self.donor);self.assertIn('UNAUTHENTICATED',out['evidence_origin']);self.assertIn('HOST_GATES',out['hold_reasons'][1])
 def test_source_corruption(self):self.a.write_bytes(b'bad');self.check(None)
 def test_provider_corruption(self):self.b.write_bytes(b'bad');self.check(None)
 def test_expected_hash_wrong(self):self.row['expected_sha256']='0'*64;self.check(None)
 def test_expected_hash_malformed(self):self.row['expected_sha256']='fake';self.check(None)
 def test_native_id_missing(self):self.row.pop('library_native_id');self.check(None)
 def test_native_id_invalid(self):self.row['library_native_id']='id:evil';self.check(None)
 def test_provider_id_invalid(self):self.row['provider_file_id']='https://example.com/file';self.check(None)
 def test_provider_metadata_missing(self):self.row.pop('provider_metadata');self.check(None)
 def test_provider_id_mismatch(self):self.row['provider_metadata']['id']='id:wrong';self.check(None)
 def test_provider_metadata_size_mismatch(self):self.row['provider_metadata']['size']+=1;self.check(None)
 def test_provider_downloadability_false(self):self.row['provider_metadata']['is_downloadable']=False;self.check(None)
 def test_expected_bytes_mismatch(self):self.row['expected_bytes']+=1;self.check(None)
 def test_same_path(self):self.row['provider_readback_path']=str(self.a);self.check(None)
 def test_hardlink(self):self.b.unlink();os.link(self.a,self.b);self.check(None)
 def test_source_symlink(self):self.a.unlink();self.a.symlink_to(self.b);self.check(None)
 def test_provider_symlink(self):self.b.unlink();self.b.symlink_to(self.a);self.check(None)
 def test_directory_as_provider(self):self.row['provider_readback_path']=str(self.dir);self.check(None)
 def test_missing_source(self):self.a.unlink();self.check(None)
 def test_missing_provider(self):self.b.unlink();self.check(None)
 def test_no_side_effects(self):
  before=(self.a.read_bytes(),self.b.read_bytes());self.check(None,'EXACT_FILE_BYTES');self.assertEqual(before,(self.a.read_bytes(),self.b.read_bytes()))
 def test_oversize_bound(self):
  with open(self.b,'r+b') as f:f.truncate(257*1024*1024)
  self.check(None)
 def test_root_array_not_a_list(self):
  with self.assertRaises(ValueError):run({},OVERLAY,DONOR)
 def test_root_array_over_100(self):
  with self.assertRaises(ValueError):run([self.row]*101,OVERLAY,DONOR)
 def test_tampered_overlay_fails(self):
  changed=self.dir/'changed.py';changed.write_bytes(OVERLAY.read_bytes()+b'# BAD\n')
  with self.assertRaisesRegex(ValueError,'CP13_OVERLAY_SHA_MISMATCH'):parent_import(changed,DONOR)
 def test_tampered_donor_fails(self):
  changed=self.dir/'donor.py';changed.write_bytes(DONOR.read_bytes()+b'# BAD\n')
  with self.assertRaisesRegex(ValueError,'DONOR_SHA_MISMATCH'):parent_import(OVERLAY,changed)
 def test_unknown_purpose_still_holds(self):
  self.row['role_release_evidence']={'purpose_released':True,'reserved_future_use_released':True}
  self.row['authorization']={'owner_approved':True}
  self.check(None,'EXACT_FILE_BYTES')
 # CP16 integration regression: a caller cannot turn local equality into native release.
 def test_caller_claims_authentication_remain_hold(self):
  self.row['provider_origin_authenticated']=True
  self.row['owner_exact_release_verified']=True
  self.row['role_release_evidence']={'all_roles_released':True}
  self.check(None,'EXACT_FILE_BYTES')
 def test_untrusted_provider_auth_flag_not_promoted(self):
  self.row['provider_metadata']['authenticated']=True
  out=evaluate(self.row,self.overlay,self.donor)
  self.assertEqual(out['contact'],'EXACT_FILE_BYTES')
  self.assertEqual(out['evidence_origin'],'UNAUTHENTICATED_LOCAL_INPUT')
  self.assertFalse(out['retirement_authorised'])
 def test_fake_release_cannot_override_corruption(self):
  self.row['authorization']={'authority':'owner_explicit_specific_release','approved':True}
  self.b.write_bytes(b'CORRUPT'+self.b.read_bytes())
  self.check(None)

if __name__=='__main__':unittest.main(verbosity=2)
