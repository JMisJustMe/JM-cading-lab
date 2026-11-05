import json,sys,tempfile,uuid,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from jm_ufc_ai_adapter import build_spec
from jm_ufc_web import export_web,verify_web
from jm_ufc import CapsuleError
class TestAIAdapter(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
  self.root=Path(self.temp.name);(self.root/'assets').mkdir()
  (self.root/'assets/image.png').write_bytes(b'\x89PNG'+b'Actual original data')
  self.messages={'conversation_id':'jm-llm-core-original-001','format':'JM LLM owner-export','messages':[
    {'role':'user','content':'Examine the original drawing','attachments':[{'source':'assets/image.png','mime_type':'image/png'}]},
    {'role':'assistant','content':'A grounded description.'}]}
  (self.root/'export.json').write_text(json.dumps(self.messages))
 def test_ai_export_full_ancestry(self):
  stage=self.root/'stage';stage.mkdir();owner=str(uuid.uuid4())
  spec=build_spec(self.root/'export.json',owner,1,stage)
  self.assertEqual(len(spec['items']),4)
  self.assertEqual(spec['items'][2]['parents'],[spec['items'][1]['id']])
  (stage/'spec.json').write_text(json.dumps(spec));out=self.root/'ai.jmufc';export_web(stage/'spec.json',out,'public test passphrase not for real archives')
  m,blobs=verify_web(out,'public test passphrase not for real archives');self.assertEqual(blobs[m['items'][2]['sha256']],(self.root/'assets/image.png').read_bytes())
  nextstage=self.root/'second';nextstage.mkdir()
  same=build_spec(self.root/'export.json',owner,1,nextstage)
  self.assertEqual([x['id'] for x in same['items']],[x['id'] for x in spec['items']])
 def test_missing_asset_hold(self):
  self.messages['messages'][0]['attachments'][0]['source']='https://example.invalid/asset.png'
  (self.root/'export.json').write_text(json.dumps(self.messages))
  stage=self.root/'stage';stage.mkdir()
  with self.assertRaises(CapsuleError):build_spec(self.root/'export.json',str(uuid.uuid4()),1,stage)
if __name__=='__main__':unittest.main()
