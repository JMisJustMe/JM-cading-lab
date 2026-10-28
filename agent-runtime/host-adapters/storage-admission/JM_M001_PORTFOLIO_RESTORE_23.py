#!/usr/bin/env python3
"""JM M001 CP20 cold-portfolio exact restore, inheritance of CP08, CP12, CP19, CP20.
Read-only on all provider carriers and original JM sources. No native Library
mutation, no direct download migration, no owner role release.
Requires zstd CLI and Python 3; final output must not already exist.
"""
import argparse, pathlib, hashlib, tempfile, shutil, zipfile, json, subprocess, sys, os
PINS={
 'cp08':('7d38642fdb6bba3da589279189fd7d20344b3296112d47189bee77c534b23e9f',4,110825151,'RESTORE_EXACT.py'),
 'cp12':('ee4603a255ee76c5cc01f1268d71aaa65cbd6e255b034cd8fa6dd4d0bb92ce5f',4,111404919,'RESTORE_EXACT.py'),
 'cp19':('ca9d0b68c31fad35a47f5a88c70fc1aae6bb52939af2288a0e26331283cc99c4',8,221927589,'RESTORE_EXACT.py'),
 'cp20':('ad6b4deb15c2cf7285b1c373c5bf92a428e3f2a6193cef1c198f5c9a02cb5d70',7,167185297,'RESTORE_EXACT_CP20.py'),
}
EXPECTED_TOTAL_ORIGINALS=23
EXPECTED_SOURCE_BYTES=611342956
EXPECTED_ZIP_MEMBERS=1322
def hash_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def restore_all(packs,output,live_roots=None):
 target=pathlib.Path(output)
 if target.is_symlink() or target.exists():raise ValueError('OUTPUT_MUST_NOT_EXIST; never overwrite')
 if not target.parent.exists() or not target.parent.is_dir():raise ValueError('OUTPUT_PARENT_NOT_DIRECTORY')
 if not shutil.which('zstd'):raise ValueError('ZSTD_NOT_INSTALLED')
 # All provider parents must pass exact whitelisted SHA before ANY output is written.
 for group,(expected,n,b,script) in PINS.items():
  p=pathlib.Path(packs[group])
  if p.is_symlink() or not p.is_file() or hash_file(p)!=expected:raise ValueError('SOURCE_COLD_SHA_MISMATCH:'+group)
  with zipfile.ZipFile(p) as z:
   if z.testzip() is not None or script not in z.namelist():raise ValueError('PACK_FILE_CRC_OR_SCRIPT_MISSING:'+group)
 if live_roots:
  for name in PINS:
   p=pathlib.Path(live_roots[name])
   if not p.is_dir() or p.is_symlink():raise ValueError('LIBRARY_SNAPSHOT_DIRECTORY_MISSING:'+name)
 receipts=[]
 with tempfile.TemporaryDirectory(prefix='jm-cold-portfolio-',dir=str(target.parent)) as td:
  stage=pathlib.Path(td)/'all';stage.mkdir()
  total=0;number=0;members=0
  for group,(expected,n,totalbytes,script) in PINS.items():
   dest=stage/group; p=pathlib.Path(packs[group]); script_path=pathlib.Path(td)/(group+'-RESTORE.py')
   with zipfile.ZipFile(p) as z:script_path.write_bytes(z.read(script))
   process=subprocess.run([sys.executable,str(script_path),str(p),'--out',str(dest)],capture_output=True,text=True)
   if process.returncode:raise ValueError('RESTORE_REJECTED:'+group+':'+process.stderr[-500:])
   try:obj=json.loads(process.stdout)
   except Exception as e:raise ValueError('RESTORE_RECEIPT_INVALID:'+group) from e
   files=sorted(dest.glob('*.zip'))
   if len(files)!=n or any(x.is_symlink() for x in files):raise ValueError('EXACT_EDITION_COUNT_FAILED:'+group)
   actual=sum(x.stat().st_size for x in files)
   if actual!=totalbytes:raise ValueError('SOURCE_TOTAL_BYTES_INVALID:'+group)
   for f in files:
    with zipfile.ZipFile(f) as z:
     if z.testzip() is not None:raise ValueError('ZIP_CRC_FAILED:'+f.name)
     members+=len(z.infolist())
    if live_roots:
     src=pathlib.Path(live_roots[group])/f.name
     if src.is_symlink() or not src.is_file() or hash_file(src)!=hash_file(f):raise ValueError('INDEPENDENT_LIBRARY_ORIGINAL_MISMATCH:'+f.name)
   receipts.append({'group':group,'originals':n,'source_bytes':actual,'source_sha256_pinned':expected,'status':'PASS','live_library_comparison':bool(live_roots)})
   number+=n;total+=actual
  if number!=EXPECTED_TOTAL_ORIGINALS or total!=EXPECTED_SOURCE_BYTES or members!=EXPECTED_ZIP_MEMBERS:raise ValueError('WHOLE_PORTFOLIO_COUNT_MISMATCH')
  receipt={'schema':'JM.M001.ColdPortfolio/CP20.1','state':'PASS','independent_source_release_zips':number,
   'source_bytes':total,'zip_members':members,'groups':receipts,'native_mutations':0,'new_library_savings_bytes':0,
   'role_boundary':'NO_HOT_LIBRARY_RETIREMENT_AUTHORISED; PRESERVE EVERY ORIGINAL DOWNLOAD ID'}
  (stage/'JM_PORTFOLIO_RESTORE_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
  # Commit only if ALL four donors succeed, all sources verify, output did not pre-exist.
  stage.rename(target)
 return receipt
if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__)
 for key in PINS:ap.add_argument('--'+key,required=True)
 for key in PINS:ap.add_argument('--live-'+key,help='optional source-snapshot folder for fresh byte readback')
 ap.add_argument('--out',required=True)
 a=ap.parse_args()
 live={k:getattr(a,'live_'+k) for k in PINS} if all(getattr(a,'live_'+k) for k in PINS) else None
 try:print(json.dumps(restore_all({k:getattr(a,k) for k in PINS},a.out,live),indent=2))
 except Exception as e:print(json.dumps({'state':'HOLD','error':str(e)}),file=sys.stderr);sys.exit(2)
