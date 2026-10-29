import copy, hashlib, json, os, stat, sys, tempfile, unittest, zipfile
from unittest import mock
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import JM_M001_PRE_RETIREMENT_EXECUTION_CP31 as cp31

ROOT=Path(__file__).parent
DONOR=ROOT/'JM_M001_Carrier_Admission_Gate_v0_1.py'
CP13=ROOT/'JM_M001_PURPOSE_AND_ACCESS_OVERLAY_CP13.py'
class CP31Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(); d=Path(self.tmp.name);self.d=d
  for name in ('root.zip','house.zip','drive.zip'):
   with zipfile.ZipFile(d/name,'w') as z:z.writestr('original.txt','a'*2048)
  b=(d/'root.zip').read_bytes()
  self.now=datetime(2026,10,28,19,18,tzinfo=timezone.utc)
  self.row={'label':'SYNTHETIC_PREMATURE_CP30_REGRESSION','root_path':str(d/'root.zip'),'house_path':str(d/'house.zip'),
   'root_native_id':'libfile_'+'1'*32,'house_native_id':'libfile_'+'2'*32,
   'root_expected_bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),
   'root_created_at':'2026-10-28T17:32:27Z','root_active_library_verified':True,
   'house_active_library_verified':True,'independent_cold_download_path':str(d/'drive.zip'),
   'independent_provider_origin_authenticated':True,
   'role_release_evidence':{k:True for k in cp31.REQUIRED},
   'explicit_authorization_evidence':{'exact_root_native_id':'libfile_'+'1'*32,
   'acknowledged_native_link_loss':True,'authority':'owner_explicit_specific_release'},
   'proposed_operation':'delete_reversible'}
 def tearDown(self): self.tmp.cleanup()
 def check(self,rows=None):return cp31.assess({'records':rows or [self.row]},DONOR,CP13,self.now)
 def test_cp30_under_96h(self):
  x=self.check()['records'][0];self.assertIn('96H_PRESERVATION_WINDOW_OPEN',x['hold_reasons'])
 def test_recent_no_direct_link(self):
  row=copy.deepcopy(self.row);row['role_release_evidence']['direct_link_released']=False
  x=self.check([row])['records'][0];self.assertIn('ROLE_HOLD:direct_link_released',x['hold_reasons'])
 def test_mature_without_release_still_hold(self):
  row=copy.deepcopy(self.row);row['root_created_at']='2026-10-20T12:00:00Z';row['role_release_evidence']['direct_link_released']=False
  x=self.check([row])['records'][0];self.assertNotIn('96H_PRESERVATION_WINDOW_OPEN',x['hold_reasons']);self.assertIn('ROLE_HOLD:direct_link_released',x['hold_reasons'])
 def test_full_synthetic_release_still_not_permission(self):
  row=copy.deepcopy(self.row);row['root_created_at']='2026-10-20T12:00:00Z';x=self.check([row])['records'][0]
  self.assertEqual(x['source_cp13_decision'],'REVIEW_READY_NEEDS_HOST_AUTHORIZATION')
  self.assertIn('HOST_MUST_INDEPENDENTLY_VERIFY_OWNER_RELEASE_AND_NATIVE_LINK_TRANSFER',x['hold_reasons']);self.assertFalse(x['native_action_authorised'])
 def test_wrong_original_id_is_hold(self):
  row=copy.deepcopy(self.row);row['explicit_authorization_evidence']['exact_root_native_id']='libfile_'+'3'*32
  self.assertIn('NO_EXACT_OWNER_NATIVE_ROLE_RELEASE',self.check([row])['records'][0]['hold_reasons'])
 def test_false_provider_provenance(self):
  row=copy.deepcopy(self.row);row['independent_provider_origin_authenticated']=False
  self.assertIn('COLD_PROVIDER_PROVENANCE_UNAUTHENTICATED',self.check([row])['records'][0]['hold_reasons'])
 def test_source_tamper(self):
  (self.d/'root.zip').write_bytes(b'invalid');self.assertIn('SOURCE_HOUSE_HASH_OR_BYTES_NOT_PROVED',self.check()['records'][0]['hold_reasons'])
 def test_cold_tamper(self):
  (self.d/'drive.zip').write_bytes(b'corrupt');self.assertTrue(any(s.startswith('COLD_RESTORE_INVALID') for s in self.check()['records'][0]['hold_reasons']))
 def test_missing_separate_purpose(self):
  row=copy.deepcopy(self.row);row['role_release_evidence'].pop('reserved_future_use_released')
  self.assertIn('ROLE_HOLD:reserved_future_use_released',self.check([row])['records'][0]['hold_reasons'])
 def test_riskier_operation_refused(self):
  row=copy.deepcopy(self.row);row['proposed_operation']='permanent_delete'
  self.assertIn('OPERATION_NOT_SPECIFIED_AS_REVERSIBLE_TRASH',self.check([row])['records'][0]['hold_reasons'])
 def test_duplicate_id_refused(self):
  r=self.check([self.row,copy.deepcopy(self.row)]);self.assertIn('REPEATED_ROOT_IDENTITY_REFUSED',r['records'][1]['hold_reasons'])
 def test_zero_mutation_claims(self):
  before=[(self.d/f).read_bytes() for f in ('root.zip','house.zip','drive.zip')]
  v=self.check();self.assertEqual(v['native_mutations'],0);self.assertEqual(v['retirement_authorised_count'],0)
  self.assertEqual(v['measured_quota_savings_bytes'],0);self.assertEqual(v['gross_retirement_claimed_bytes'],0)
  self.assertEqual(before,[(self.d/f).read_bytes() for f in ('root.zip','house.zip','drive.zip')])
 def test_empty_refused(self):
  with self.assertRaises(ValueError):cp31.assess({'records':[]},DONOR,CP13,self.now)
 def test_overbroad_batch(self):
  with self.assertRaises(ValueError):self.check([copy.deepcopy(self.row) for i in range(101)])
 def test_cp13_source_modified_refused(self):
  fake=self.d/'cp13.py';fake.write_bytes(CP13.read_bytes()+b'\n#altered')
  with self.assertRaisesRegex(ValueError,'CP13_SOURCE_PIN_MISMATCH'):cp31.assess({'records':[self.row]},DONOR,fake,self.now)
 def test_cp13_nonregular_refused(self):
  with self.assertRaises(ValueError):cp31.load_cp13(self.d)
 def test_direct_link_release_works_only_in_source_review(self):
  row=copy.deepcopy(self.row);row['root_created_at']='2026-10-20T12:00:00Z';row['role_release_evidence']['direct_link_released']=True
  self.assertEqual(self.check([row])['records'][0]['decision'],'HOLD_NO_MUTATION')
 def test_no_hot_source_role(self):
  row=copy.deepcopy(self.row);row['role_release_evidence']['source_frozen_role_released']=False
  self.assertIn('ROLE_HOLD:source_frozen_role_released',self.check([row])['records'][0]['hold_reasons'])
 def test_no_current_head(self):
  row=copy.deepcopy(self.row);row['role_release_evidence']['current_head_safe']=False
  self.assertIn('ROLE_HOLD:current_head_safe',self.check([row])['records'][0]['hold_reasons'])
 def test_no_lineage_reentry(self):
  row=copy.deepcopy(self.row);row['role_release_evidence']['lineage_and_flaz_reentry_verified']=False
  self.assertIn('ROLE_HOLD:lineage_and_flaz_reentry_verified',self.check([row])['records'][0]['hold_reasons'])
 def test_cli_holds_even_fully_authorised_synthetic(self):
  row=copy.deepcopy(self.row);row['root_created_at']='2026-10-20T12:00:00Z';p=self.d/'review.json';p.write_text(json.dumps({'records':[row]}))
  rc=cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13)]);self.assertEqual(rc,3)
 def test_cli_refuses_overwrite(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  rc=cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(p)]);self.assertEqual(rc,4)
 def test_cli_write_once_verified_and_private(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  dest=self.d/'receipt.json'
  self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(dest)]),3)
  receipt=json.loads(dest.read_text())
  self.assertEqual(receipt['native_mutations'],0)
  self.assertEqual(receipt['retirement_authorised_count'],0)
  self.assertEqual(receipt['records'][0]['decision'],'HOLD_NO_MUTATION')
  self.assertEqual(stat.S_IMODE(dest.stat().st_mode),0o600)
  before=dest.read_bytes()
  self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(dest)]),4)
  self.assertEqual(dest.read_bytes(),before)
 def test_cli_directory_entry_fsync_before_success(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  dest=self.d/'durable-receipt.json'
  real_fsync=os.fsync
  modes=[]
  def inspect_fsync(fd):
   modes.append(stat.S_IFMT(os.fstat(fd).st_mode))
   return real_fsync(fd)
  with mock.patch.object(cp31.os,'fsync',side_effect=inspect_fsync):
   self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(dest)]),3)
  self.assertIn(stat.S_IFREG,modes,'Receipt bytes must be fsynced')
  self.assertIn(stat.S_IFDIR,modes,'New directory entry must be fsynced')
  self.assertEqual(json.loads(dest.read_text())['native_mutations'],0)
 def test_cli_directory_sync_failure_is_hold_and_retains_file(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  dest=self.d/'unsynced-receipt.json'
  with mock.patch.object(cp31,'_sync_report_parent',side_effect=OSError('SYNTHETIC_DIRECTORY_SYNC_FAILED')):
   self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(dest)]),4)
  self.assertTrue(dest.is_file(),'Retain suspect evidence for owner-led recovery')
  self.assertEqual(json.loads(dest.read_text())['native_mutations'],0)
 def test_cli_symlink_parent_directory_refused(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  link=self.d/'linked-dir'
  try:os.symlink(self.d,link,target_is_directory=True)
  except (OSError,NotImplementedError):self.skipTest('symlinks unavailable')
  dest=link/'untrusted-receipt.json'
  self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(dest)]),4)
  self.assertTrue((self.d/'untrusted-receipt.json').is_file(),'Retain anomalous bytes for owner investigation')
 def test_cli_readback_corruption_is_not_success(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  dest=self.d/'untrusted-receipt.json'
  with mock.patch.object(cp31,'_read_report_exact',return_value=b'corrupted'):
   self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(dest)]),4)
  self.assertTrue(dest.is_file(),'Keep abnormal bytes for investigation, not silent deletion')
  self.assertEqual(json.loads(dest.read_text())['native_mutations'],0)
 def test_cli_refuses_symlink_receipt_without_mutation(self):
  p=self.d/'review.json';p.write_text(json.dumps({'records':[self.row]}))
  original=self.d/'protected.json';original.write_text('DO NOT REPLACE')
  link=self.d/'link.json'
  try:os.symlink(original,link)
  except (OSError,NotImplementedError):self.skipTest('symlinks unavailable')
  self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13),'--output',str(link)]),4)
  self.assertEqual(original.read_text(),'DO NOT REPLACE')
 def test_cp13_shortened_evidence_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['records']=[]
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_CARDINALITY_MISMATCH'):self.check()
 def test_cp13_extra_evidence_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['records'].append(copy.deepcopy(gate['records'][0]))
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_CARDINALITY_MISMATCH'):self.check()
 def test_cp13_native_identity_substitution_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['records'][0]['root_native_id']='libfile_'+'9'*32
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_IDENTITY_OR_ORDER_MISMATCH'):self.check()
 def test_cp13_label_substitution_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['records'][0]['label']='DIFFERENT_ORIGINAL'
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_IDENTITY_OR_ORDER_MISMATCH'):self.check()
 def test_cp13_reordered_evidence_fails_closed(self):
  other=copy.deepcopy(self.row);other['root_native_id']='libfile_'+'4'*32
  rows=[self.row,other]
  gate=cp31.load_cp13(CP13).run({'records':rows},DONOR,now=self.now)
  gate['records'].reverse()
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_IDENTITY_OR_ORDER_MISMATCH'):self.check(rows)
 def test_cp13_house_identity_substitution_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['records'][0]['house_native_id']='libfile_'+'9'*32
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_IDENTITY_OR_ORDER_MISMATCH'):self.check()
 def test_cp13_row_schema_substitution_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['records'][0]['schema']='untrusted.schema'
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=cp31.load_cp13(CP13).SCHEMA,run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_RECORD_IDENTITY_OR_ORDER_MISMATCH'):self.check()
 def test_cp13_false_summary_count_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['record_count']=2
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_SUMMARY_OR_READ_ONLY_CONTRACT_MISMATCH'):self.check()
 def test_cp13_forged_mutation_claim_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['native_mutations']=1
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_SUMMARY_OR_READ_ONLY_CONTRACT_MISMATCH'):self.check()
 def test_cp13_review_ready_count_mismatch_fails_closed(self):
  gate=cp31.load_cp13(CP13).run({'records':[self.row]},DONOR,now=self.now)
  gate['review_ready_count']+=1
  with mock.patch.object(cp31,'load_cp13',return_value=mock.Mock(SCHEMA=gate['schema'],run=mock.Mock(return_value=gate))):
   with self.assertRaisesRegex(ValueError,'CP13_SUMMARY_OR_READ_ONLY_CONTRACT_MISMATCH'):self.check()
 def test_cli_refuses_bad_input(self):
  p=self.d/'invalid.json';p.write_text('"not an inventory"')
  self.assertEqual(cp31.main(['--input',str(p),'--donor',str(DONOR),'--cp13',str(CP13)]),4)
if __name__=='__main__':unittest.main(verbosity=2)
