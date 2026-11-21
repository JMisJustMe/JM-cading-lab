#!/usr/bin/env python3
"""Read-only JM AI / AI Studio / conversation-export adapter for UFC CP02.

Preserves exported JSON and every explicitly supplied original attachment.
Does not introspect proprietary provider APIs, private model weights or remote chat.
"""
import argparse
import json
import shutil
import sys
import tempfile
import uuid
from pathlib import Path
from jm_ufc import CapsuleError, secure_relative, canonical, password_from_env
from jm_ufc_web import export_web

KINDS={'.png':'image','.jpg':'image','.jpeg':'image','.webp':'image','.gif':'image','.svg':'image','.pdf':'document','.docx':'document','.txt':'document','.mp3':'audio','.wav':'audio','.mp4':'video','.webm':'video','.apk':'build','.zip':'build','.py':'source','.ts':'source','.tsx':'source','.js':'source','.kt':'source','.html':'source'}

def build_spec(input_json:Path, owner_id:str, number:int, staging:Path, base:Path|None=None, previous_capsule_id:str|None=None):
    root=input_json.resolve()
    if not root.is_file():raise CapsuleError('Missing original JSON export')
    if root.stat().st_size>2*1024*1024:raise CapsuleError('Bounded conversation JSON source >2 MiB')
    try:payload=json.loads(root.read_text('utf-8'))
    except (ValueError,UnicodeError) as exc:raise CapsuleError('Invalid JSON conversation') from exc
    if not isinstance(payload,dict) or not isinstance(payload.get('messages'),list) or not payload['messages']:
        raise CapsuleError('Explicit messages array required; no guessing proprietary export format')
    try:owner_uuid=uuid.UUID(owner_id)
    except (ValueError,AttributeError) as exc:raise CapsuleError('Owner UUID required') from exc
    if number<1:raise CapsuleError('Positive independent personal number required')
    if previous_capsule_id:uuid.UUID(previous_capsule_id)
    base=(base or root.parent).resolve()
    root_id=str(uuid.uuid5(owner_uuid,'conversation:'+str(payload.get('conversation_id') or root.name)))
    original=staging/'original.json';shutil.copyfile(root,original)
    items=[{'id':root_id,'kind':'conversation','path':'conversation/original.json','source':'original.json','position':0,'parents':[],
            'metadata':{'source_format':payload.get('format','explicit-messages-json'),'source_conversation_id':str(payload.get('conversation_id',''))}}]
    pos=1
    for i,msg in enumerate(payload['messages']):
        if not isinstance(msg,dict) or not isinstance(msg.get('role'),str):raise CapsuleError('Message role required')
        if 'content' not in msg:raise CapsuleError('Message content required')
        msg_id=str(uuid.uuid5(uuid.UUID(root_id),'message:'+str(i)+':'+str(msg.get('id',''))))
        path=staging/f'message-{i:06d}.json';path.write_bytes(canonical(msg))
        items.append({'id':msg_id,'kind':'message','path':f'messages/{i:06d}.json','source':path.name,
                      'position':pos,'parents':[root_id],'metadata':{'role':msg['role'],'message_index':i}});pos+=1
        for j,attachment in enumerate(msg.get('attachments',[])):
            if not isinstance(attachment,dict) or not isinstance(attachment.get('source'),str):raise CapsuleError('Attachment requires local source; URL is not recoverable bytes')
            rel=secure_relative(attachment['source'])
            asset=(base/rel).resolve()
            if not asset.is_relative_to(base) or not asset.is_file() or asset.is_symlink():raise CapsuleError('Attachment outside explicit base/missing')
            if asset.stat().st_size>16*1024*1024:raise CapsuleError('Oversized browser attachment')
            dest=f'assets/{i:06d}/{j:03d}-{asset.name}'
            stagingfile=staging/f'attachment-{i:06d}-{j:03d}{asset.suffix}';shutil.copyfile(asset,stagingfile)
            items.append({'id':str(uuid.uuid5(uuid.UUID(msg_id),'attachment:'+str(j))),
             'kind':KINDS.get(asset.suffix.lower(),'other'),'source':stagingfile.name,'path':dest,'position':pos,
             'parents':[msg_id],'metadata':{'original_name':asset.name,'message_index':i,'attachment_index':j,'mime_type':str(attachment.get('mime_type',''))}});pos+=1
    return {'owner_id':str(owner_uuid),'personal_number':number,'creation_kind':'conversation',
            'previous_capsule_id':previous_capsule_id,'items':items}

def main():
    p=argparse.ArgumentParser(description='Wrap explicit JM/AI Studio conversation JSON and original bytes into encrypted UFC')
    p.add_argument('--input',required=True,type=Path);p.add_argument('--base',type=Path)
    p.add_argument('--owner-id',required=True);p.add_argument('--personal-number',required=True,type=int)
    p.add_argument('--archive',required=True,type=Path);p.add_argument('--previous-capsule-id')
    args=p.parse_args()
    try:
        secret=password_from_env('JM_UFC_PASSPHRASE')
        with tempfile.TemporaryDirectory(prefix='jm-ufc-ai-input-') as temp:
            folder=Path(temp)
            spec=build_spec(args.input,args.owner_id,args.personal_number,folder,args.base,args.previous_capsule_id)
            src=folder/'capsule.spec.json';src.write_bytes(canonical(spec))
            receipt=export_web(src,args.archive,secret)
        print(json.dumps(receipt,indent=2));return 0
    except (OSError,ValueError,UnicodeError) as exc:
        print('JM AI CAPTURE HOLD:',exc,file=sys.stderr);return 2
if __name__=='__main__':sys.exit(main())
