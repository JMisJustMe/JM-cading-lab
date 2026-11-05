#!/usr/bin/env python3
"""JM UFC additive browser/Android carrier. Reuses the CP01 manifest and validation.

JMUFCW02\n = PBKDF2-SHA256 250k, AES-256-GCM, canonical JSON payload.
No network traffic, no secret logging, no file replacement. This web carrier is
separate from the existing JMUFC01\n Scrypt/ZIP carrier, not a silent mutation.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jm_ufc import CapsuleError, build_capsule, decode_capsule, validate_manifest, secure_relative, canonical, sha256, password_from_env

MAGIC_WEB = b'JMUFCW02\n'
AAD_WEB = b'JM-UFC-WEB02-AES256GCM'
ITERATIONS = 250000
MAX_WEB = 16 * 1024 * 1024

def kdf(password: str, salt: bytes) -> bytes:
    if len(password) < 12:
        raise CapsuleError('Passphrase must have at least 12 characters')
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, 32)

def encrypt_web(manifest: dict, data: dict, password: str) -> bytes:
    validate_manifest(manifest)
    if sum(len(v) for v in data.values()) > MAX_WEB:
        raise CapsuleError('Web carrier limit 16 MiB')
    if set(data) != {i['sha256'] for i in manifest['items']}:
        raise CapsuleError('Payload keys mismatch manifest')
    if any(sha256(v) != digest for digest, v in data.items()):
        raise CapsuleError('Invalid content bytes')
    packet = canonical({'format':'JM.UFC.WebCarrier/2', 'manifest':manifest,
                       'blobs':{k:base64.b64encode(v).decode('ascii') for k,v in sorted(data.items())}})
    if len(packet) > 24 * 1024 * 1024:
        raise CapsuleError('Encoded carrier oversized')
    salt, nonce = os.urandom(16), os.urandom(12)
    body = AESGCM(kdf(password, salt)).encrypt(nonce, packet, AAD_WEB)
    return MAGIC_WEB + salt + nonce + body

def decrypt_web(content: bytes, password: str):
    if len(content) > 25 * 1024 * 1024 or len(content) < len(MAGIC_WEB)+44 or not content.startswith(MAGIC_WEB):
        raise CapsuleError('Invalid/oversized web archive header')
    offset = len(MAGIC_WEB)
    salt, nonce = content[offset:offset+16], content[offset+16:offset+28]
    try:
        body = AESGCM(kdf(password,salt)).decrypt(nonce, content[offset+28:], AAD_WEB)
    except InvalidTag as exc:
        raise CapsuleError('Authentication failed') from exc
    try:
        packet = json.loads(body)
    except (ValueError,UnicodeDecodeError) as exc:
        raise CapsuleError('Non-JSON authenticated payload') from exc
    if not isinstance(packet,dict) or set(packet) != {'format','manifest','blobs'} or packet['format']!='JM.UFC.WebCarrier/2':
        raise CapsuleError('Wrong carrier schema')
    m, b64 = packet['manifest'],packet['blobs']
    validate_manifest(m)
    if not isinstance(b64,dict) or set(b64) != {i['sha256'] for i in m['items']}:
        raise CapsuleError('Manifest and blob inventory differ')
    data = {}
    for item in m['items']:
        digest = item['sha256']
        if digest not in data:
            encoded = b64[digest]
            if not isinstance(encoded,str) or len(encoded) > MAX_WEB*2:
                raise CapsuleError('Oversized base64 blob')
            try:
                raw = base64.b64decode(encoded, validate=True)
            except Exception as exc:
                raise CapsuleError('Invalid blob encoding') from exc
            if len(raw) != item['bytes'] or sha256(raw) != digest:
                raise CapsuleError('Blob byte/hash mismatch')
            data[digest] = raw
    if sum(i['bytes'] for i in m['items']) > MAX_WEB:
        raise CapsuleError('Web carrier size limit')
    return m, data

def receipt_for(raw:bytes, manifest:dict):
    return {'format':'JM.UFC.Receipt/1.0','capsule_id':manifest['capsule_id'],
            'personal_number':manifest['personal_number'],
            'owner_fingerprint':sha256(manifest['owner_id'].encode())[:20],
            'root_hash':manifest['root_hash'], 'encrypted_archive_sha256':sha256(raw),
            'item_count':len(manifest['items']),'created_at':manifest['created_at'],
            'note':'Unsigned independent checksum receipt; trust external custody.'}

def verify_web(archive:Path, password:str, receipt_path:Path|None=None):
    content=archive.read_bytes()
    m, data = decrypt_web(content,password)
    if receipt_path:
        receipt=json.loads(receipt_path.read_text(encoding='utf-8'))
        if receipt.get('encrypted_archive_sha256')!=sha256(content) or receipt.get('root_hash')!=m['root_hash'] or receipt.get('capsule_id')!=m['capsule_id']:
            raise CapsuleError('Receipt mismatch')
    return m,data

def export_web(spec_path:Path, archive_path:Path, password:str):
    if archive_path.exists() or Path(str(archive_path)+'.receipt.json').exists():
        raise CapsuleError('Refusing overwrite')
    spec=json.loads(spec_path.read_text(encoding='utf-8'))
    legacy, _=build_capsule(spec,spec_path.parent,password)
    manifest,blobs=decode_capsule(legacy,password)
    blob=encrypt_web(manifest,blobs,password)
    receipt=receipt_for(blob, manifest)
    archive_path.parent.mkdir(parents=True,exist_ok=True)
    with archive_path.open('xb') as out:out.write(blob)
    try:
        with Path(str(archive_path)+'.receipt.json').open('x',encoding='utf-8') as out:
            json.dump(receipt,out,ensure_ascii=False,indent=2)
    except Exception:
        archive_path.unlink(missing_ok=True)
        raise
    return receipt

def import_web(archive:Path, dest:Path,password:str,receipt:Path|None=None):
    manifest, blobs=verify_web(archive,password,receipt)
    dest=dest.resolve()
    if dest.exists(): raise CapsuleError('Destination already exists')
    dest.parent.mkdir(parents=True,exist_ok=True)
    staging=Path(tempfile.mkdtemp(prefix='.jmufc-web-',dir=dest.parent))
    try:
        for item in manifest['items']:
            path=staging.joinpath(*secure_relative(item['path']).parts)
            path.parent.mkdir(parents=True,exist_ok=True)
            with path.open('xb') as out:out.write(blobs[item['sha256']])
        (staging/'capsule.json').write_bytes(canonical(manifest))
        staging.rename(dest)
    except BaseException:
        shutil.rmtree(staging,ignore_errors=True)
        raise
    return manifest

def main(argv=None):
    p=argparse.ArgumentParser(description='JM UFC browser/Android interoperable encrypted carrier')
    sub=p.add_subparsers(dest='command',required=True)
    for name in ('export','verify','import'):
        cmd=sub.add_parser(name)
        cmd.add_argument('--archive',required=True,type=Path)
        cmd.add_argument('--passphrase-env',default='JM_UFC_PASSPHRASE')
        if name=='export':cmd.add_argument('--spec',required=True,type=Path)
        if name=='import':cmd.add_argument('--dest',required=True,type=Path)
        if name!='export':cmd.add_argument('--receipt',type=Path)
    args=p.parse_args(argv)
    try:
        password=password_from_env(args.passphrase_env)
        if args.command=='export':result=export_web(args.spec,args.archive,password)
        elif args.command=='verify':
            m,_=verify_web(args.archive,password,args.receipt)
            result={'verified':True,'capsule_id':m['capsule_id'],'root_hash':m['root_hash'],'items':len(m['items'])}
        else:
            m=import_web(args.archive,args.dest,password,args.receipt)
            result={'restored':True,'capsule_id':m['capsule_id'],'items':len(m['items']),'dest':str(args.dest)}
        print(json.dumps(result,indent=2))
        return 0
    except (CapsuleError,OSError,ValueError) as exc:
        print('UFC WEB HOLD: '+str(exc),file=sys.stderr)
        return 1

if __name__=='__main__':sys.exit(main())
