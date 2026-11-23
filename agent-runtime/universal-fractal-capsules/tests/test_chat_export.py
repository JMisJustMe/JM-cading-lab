"""Synthetic ChatGPT mapping-tree importer checks. No real conversation data."""
import json
import tempfile
import unittest
import uuid
from pathlib import Path
from jm_ufc import CapsuleError, canonical
from jm_ufc_chat_export_adapter import build_spec
from jm_ufc_web import export_web, import_web


class ChatExportTest(unittest.TestCase):
    SECRET='This synthetic export password is absolutely not for actual private conversations'

    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path=Path(self.folder.name)
        self.owner=str(uuid.uuid4())
        self.chat_id='synthetic-chat-id'
        self.chat={
            'id': self.chat_id, 'title': 'Demo branches', 'current_node': 'reply-new',
            'mapping': {
                'root': {'parent': None, 'message': None, 'children': ['user']},
                'user': {'parent': 'root','message': {'id':'msg-u','author':{'role':'user'},'content':{'content_type':'multimodal_text','parts':['See image',{'content_type':'image_asset_pointer','asset_pointer':'file-service://demo-png'}]}},'children':['reply-old','reply-new']},
                'reply-old': {'parent':'user','message':{'id':'msg-a1','author':{'role':'assistant'},'content':{'parts':['Discarded answer']}},'children':[]},
                'reply-new': {'parent':'user','message':{'id':'msg-a2','author':{'role':'assistant'},'content':{'parts':['Visible answer']}},'children':[]}
            }
        }
        self.export=self.path/'conversations.json'
        self.export.write_text(json.dumps([{'id':'unselected-chat','mapping':{}}, self.chat]),encoding='utf-8')
        self.assets=self.path/'assets';self.assets.mkdir()
        (self.assets/'original.png').write_bytes(b'\x89PNG\r\n\x1a\nbytes from the supplied export asset')
        self.map=self.path/'asset-map.json'
        self.map.write_text(json.dumps({'file-service://demo-png':'original.png'}),encoding='utf-8')

    def _spec(self):
        dest=self.path/'stage';dest.mkdir(exist_ok=True)
        return build_spec(self.export,self.chat_id,self.owner,1,dest,self.assets,self.map),dest

    def test_current_branch_and_discarded_reply_both_preserved(self):
        spec,stage=self._spec()
        messages=[i for i in spec['items'] if i['kind']=='message']
        self.assertEqual(len(messages),3)
        self.assertEqual([m['metadata']['source_node_id'] for m in messages],['user','reply-new','reply-old'])
        self.assertEqual([m['metadata']['current_branch'] for m in messages],[True,True,False])
        self.assertIn(messages[0]['id'],messages[1]['parents'])
        self.assertIn(messages[0]['id'],messages[2]['parents'])
        raw=next(i for i in spec['items'] if i['kind']=='conversation')
        self.assertEqual(json.loads((stage/raw['source']).read_bytes())['mapping']['reply-old']['message']['content']['parts'][0],'Discarded answer')
        self.assertNotIn('unselected-chat',(stage/raw['source']).read_text())

    def test_attachment_actual_bytes_and_roundtrip(self):
        spec,stage=self._spec()
        s=stage/'spec.json';s.write_bytes(canonical(spec))
        archive=self.path/'done.jmufc'
        export_web(s,archive,self.SECRET)
        recovered=self.path/'restored'
        manifest=import_web(archive,recovered,self.SECRET,Path(str(archive)+'.receipt.json'))
        original=(self.assets/'original.png').read_bytes()
        attachment=next(x for x in manifest['items'] if x['kind']=='image')
        self.assertEqual((recovered/attachment['path']).read_bytes(),original)
        self.assertEqual(len([x for x in manifest['items'] if x['kind']=='message']),3)

    def test_no_phantom_image_without_explicit_original(self):
        with self.assertRaisesRegex(CapsuleError,'Unresolved attachment pointer'):
            build_spec(self.export,self.chat_id,self.owner,1,self.path/'stage-no-image')
        self.assertFalse((self.path/'stage-no-image'/'capsule-spec.json').exists())

    def test_unidentifiable_chat_holds(self):
        with self.assertRaises(CapsuleError):
            build_spec(self.export,'some title that is not an ID',self.owner,1,self.path/'stage-missing',self.assets,self.map)

    def test_ambiguous_current_branch_holds(self):
        self.chat.pop('current_node')
        self.export.write_text(json.dumps([self.chat]))
        with self.assertRaisesRegex(CapsuleError,'current_node'):
            build_spec(self.export,self.chat_id,self.owner,1,self.path/'stage-ambiguous',self.assets,self.map)

    def test_cycle_holds(self):
        self.chat['mapping']['user']['parent']='reply-new'
        self.export.write_text(json.dumps([self.chat]))
        with self.assertRaisesRegex(CapsuleError,'cyclic'):
            build_spec(self.export,self.chat_id,self.owner,1,self.path/'stage-cycle',self.assets,self.map)

    def test_path_escape_rejected(self):
        self.map.write_text(json.dumps({'file-service://demo-png':'../outside.png'}))
        with self.assertRaises(CapsuleError):
            build_spec(self.export,self.chat_id,self.owner,1,self.path/'stage-path',self.assets,self.map)


if __name__=='__main__':unittest.main()
