import tempfile,unittest,json,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from jm_ufc_custody import run,copy_one
from jm_ufc import sha256
class CustodyTest(unittest.TestCase):
 def setUp(self):
  d=tempfile.TemporaryDirectory();self.addCleanup(d.cleanup);self.d=Path(d.name);self.inbox=self.d/'inbox';self.dest=self.d/'cloud';self.inbox.mkdir();self.dest.mkdir()
  self.archive=self.inbox/'demo.jmufc';self.body=b'JMUFCW02\n'+b'this is synthetic ciphertext only';self.archive.write_bytes(self.body)
  self.receipt=self.inbox/'demo.jmufc.receipt.json';self.receipt.write_text(json.dumps({'capsule_id':str(uuid.uuid4()),'root_hash':'a'*64,'encrypted_archive_sha256':sha256(self.body)}))
 def test_copy_and_idempotent_readback(self):
  r=run(self.inbox,self.dest);self.assertTrue(r['success']);self.assertEqual(r['results'][0]['archive_status'],'NEW_VERIFIED')
  r2=run(self.inbox,self.dest);self.assertEqual(r2['results'][0]['archive_status'],'ALREADY_VERIFIED')
  self.assertEqual(Path(r2['results'][0]['archive']).read_bytes(),self.body)
 def test_tampered_receipt_fails_without_copy(self):
  r=json.loads(self.receipt.read_text());r['encrypted_archive_sha256']='a'*64;self.receipt.write_text(json.dumps(r));out=run(self.inbox,self.dest)
  self.assertFalse(out['success']);self.assertEqual(list(self.dest.iterdir()),[])
 def test_missing_cloud_fails_closed(self):
  self.dest.rmdir()
  with self.assertRaises(RuntimeError):run(self.inbox,self.dest)
 def test_reject_recursive_destination(self):
  with self.assertRaises(RuntimeError):run(self.inbox,self.inbox)
if __name__=='__main__':unittest.main()
