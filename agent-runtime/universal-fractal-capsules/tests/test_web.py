import io
import json
import tempfile
import unittest
import uuid
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from jm_ufc import CapsuleError
from jm_ufc_web import encrypt_web,decrypt_web,export_web,verify_web,import_web

class BrowserBridgeTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name)
        self.passphrase='This passphrase belongs to a synthetic test only'
        (self.base/'chat.json').write_text('{"messages":[{"text":"Hi","position":0}]}',encoding='utf-8')
        (self.base/'actual.png').write_bytes(b'\x89PNG\r\n\x1a\nFake synthetic bytes for file integrity')
        self.owner=str(uuid.uuid4());self.root=str(uuid.uuid4());self.image=str(uuid.uuid4())
        self.spec=self.base/'source.json'
        self.spec.write_text(json.dumps({'owner_id':self.owner,'personal_number':1,'creation_kind':'conversation','items':[
          {'id':self.root,'kind':'conversation','source':'chat.json','path':'chat/chat.json','parents':[],'position':0},
          {'id':self.image,'kind':'image','source':'actual.png','path':'media/actual.png','parents':[self.root],'position':1,'metadata':{'attachment_index':0}}
        ]}),encoding='utf-8')
    def test_original_bytes_roundtrip(self):
        archive=self.base/'out.jmufc';receipt=export_web(self.spec,archive,self.passphrase)
        self.assertEqual(receipt['item_count'],2)
        m,data=verify_web(archive,self.passphrase,Path(str(archive)+'.receipt.json'))
        self.assertEqual(m['owner_id'],self.owner)
        self.assertEqual(m['personal_number'],1)
        self.assertEqual(m['items'][1]['parents'],[self.root])
        dest=self.base/'restored'
        import_web(archive,dest,self.passphrase,Path(str(archive)+'.receipt.json'))
        for p in ['chat/chat.json','media/actual.png']:
            self.assertEqual((dest/p).read_bytes(),(self.base/Path(p).name).read_bytes() if p.endswith('actual.png') else (self.base/'chat.json').read_bytes())
        with self.assertRaises(CapsuleError):import_web(archive,dest,self.passphrase)
    def test_wrong_password_and_edit_rejected(self):
        a=self.base/'out.jmufc';export_web(self.spec,a,self.passphrase)
        with self.assertRaises(CapsuleError):decrypt_web(a.read_bytes(),'some other great password')
        b=bytearray(a.read_bytes());b[-2]^=4
        with self.assertRaises(CapsuleError):decrypt_web(bytes(b),self.passphrase)
    def test_receipt_mismatch_rejected(self):
        a=self.base/'out.jmufc';export_web(self.spec,a,self.passphrase)
        p=Path(str(a)+'.receipt.json');r=json.loads(p.read_text());r['root_hash']='0'*64;p.write_text(json.dumps(r))
        with self.assertRaises(CapsuleError):verify_web(a,self.passphrase,p)
    def test_inner_hash_mismatch_rejected(self):
        a=self.base/'out.jmufc';export_web(self.spec,a,self.passphrase)
        m,data=decrypt_web(a.read_bytes(),self.passphrase)
        data.pop(next(iter(data)))
        with self.assertRaises(CapsuleError):encrypt_web(m,data,self.passphrase)
    def test_web_limit(self):
        a=self.base/'out.jmufc';export_web(self.spec,a,self.passphrase)
        m,data=decrypt_web(a.read_bytes(),self.passphrase)
        data[next(iter(data))] = b'z'*(16*1024*1024+1)
        with self.assertRaises(CapsuleError):encrypt_web(m,data,self.passphrase)

if __name__=='__main__': unittest.main()
