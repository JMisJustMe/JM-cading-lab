#!/usr/bin/env python3
"""JM M001 CP20 exact cold re-entry; inherits CP19/CP08 restoration principles.
Restores 7 sovereign source ZIPs unchanged. Never retires a Library ID.
Requires Python 3 and zstd executable. Output folder must be new/empty.
"""
from pathlib import Path, PurePosixPath
import sys, zipfile, hashlib, json, shutil, tempfile, subprocess, argparse, os, stat
SCHEMA='JM.M001.CP20.SharedCold/1'
EXPECTED={'SOURCE_MANIFEST_CP20.json','RESTORE_EXACT_CP20.py','ORIGINAL_SOURCE_STREAM.zst'}
SHA=lambda b:hashlib.sha256(b).hexdigest()

def restore(package,out):
 p=Path(package);target=Path(out)
 if p.is_symlink() or not p.is_file():raise ValueError('UNSAFE_PACKAGE')
 if target.is_symlink() or (target.exists() and (not target.is_dir() or any(target.iterdir()))):raise ValueError('OUTPUT_NOT_EMPTY_OR_UNSAFE')
 if not shutil.which('zstd'):raise ValueError('ZSTD_REQUIRED')
 with zipfile.ZipFile(p) as z:
  inf=z.infolist(); names=[x.filename for x in inf]
  if len(names)!=3 or set(names)!=EXPECTED:raise ValueError('PACKAGE_MEMBERS_INVALID')
  if z.testzip() is not None:raise ValueError('PACKAGE_CRC_INVALID')
  m=json.loads(z.read('SOURCE_MANIFEST_CP20.json'))
  rows=m.get('sources')
  if m.get('schema')!=SCHEMA or m.get('codec')!='zstd-long-window' or not isinstance(rows,list) or len(rows)!=7:raise ValueError('SCHEMA_OR_EDITION_COUNT_INVALID')
  seen=set();off=0
  for r in rows:
   n=r['name']; sz=r['bytes']; h=r['sha256']
   if not isinstance(n,str) or not n.isascii() or PurePosixPath(n).name!=n or '\\' in n or '/' in n or not n.endswith('.zip') or n in seen:raise ValueError('UNSAFE_OR_DUPLICATE_SOURCE_NAME')
   if not isinstance(sz,int) or sz<=0 or sz>=60000000 or not isinstance(r['offset'],int) or r['offset']!=off:raise ValueError('SOURCE_OFFSETS_INVALID')
   if not isinstance(h,str) or len(h)!=64 or any(c not in '0123456789abcdef' for c in h):raise ValueError('SOURCE_HASH_INVALID')
   if r['family'] not in ('TIWIN','JM Lyrics and Music') or not isinstance(r['zip_members'],int) or r['zip_members']<1:raise ValueError('MEMBER_OR_FAMILY_INVALID')
   seen.add(n);off+=sz
  if off!=m.get('total_source_bytes') or off>200000000:raise ValueError('UNSAFE_TOTAL_LENGTH')
  with tempfile.TemporaryDirectory() as tmp:
   t=Path(tmp);c=t/'bytes.zst';outb=t/'decoded.bin'
   with z.open('ORIGINAL_SOURCE_STREAM.zst') as zin,c.open('wb') as f:shutil.copyfileobj(zin,f,1024*1024)
   if c.stat().st_size!=m.get('compressed_size') or SHA(c.read_bytes())!=m.get('compressed_sha256'):raise ValueError('COMPRESSED_BYTES_CORRUPTED')
   with outb.open('wb') as f:
    result=subprocess.run(['zstd','-q','-d','--long=27','-c',str(c)],stdout=f,stderr=subprocess.PIPE)
   if result.returncode!=0 or outb.stat().st_size!=off:raise ValueError('DECOMPRESSION_REFUSED')
   receipts=[]
   with outb.open('rb') as fi:
    for r in rows:
     data=fi.read(r['bytes'])
     if len(data)!=r['bytes'] or SHA(data)!=r['sha256']:raise ValueError('EXACT_ZIP_RESTORE_FAILED')
     with zipfile.ZipFile(__import__('io').BytesIO(data)) as origin:
      if origin.testzip() is not None or len(origin.infolist())!=r['zip_members']:raise ValueError('ORIGINAL_ZIP_CRC_OR_MEMBER_COUNT_FAILED')
     receipts.append({'name':r['name'],'bytes':len(data),'sha256':SHA(data),'zip_members':r['zip_members'],'status':'PASS'})
    if fi.read(1):raise ValueError('TRAILING_PAYLOAD')
   target.mkdir(parents=True,exist_ok=True)
   with outb.open('rb') as fi:
    for r in rows:
     with (target/r['name']).open('xb') as f:
      remain=r['bytes']
      while remain:
       b=fi.read(min(remain,1024*1024))
       if not b:raise ValueError('UNEXPECTED_EOF')
       f.write(b);remain-=len(b)
  return {'status':'PASS','source_count':len(rows),'total_source_bytes':off,'source_zip_members':sum(x['zip_members'] for x in receipts),'sources':receipts,'native_mutations':0,'authorised_retirement':False}
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('package');a.add_argument('--out',required=True);x=a.parse_args()
 try:print(json.dumps(restore(x.package,x.out),indent=2))
 except Exception as e:print(json.dumps({'status':'HOLD','reason':str(e)}),file=sys.stderr);sys.exit(2)
