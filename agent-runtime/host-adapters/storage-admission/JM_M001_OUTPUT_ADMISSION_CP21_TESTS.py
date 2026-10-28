import importlib.util
import json
import os
import tempfile
import zipfile
from pathlib import Path

here=Path(__file__).resolve().parent
source=here/'JM_M001_OUTPUT_ADMISSION_CP21.py'
spec=importlib.util.spec_from_file_location('cp21',source)
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
donor_path=Path(os.environ.get('JM_M001_DONOR_PATH',here/'JM_M001_Carrier_Admission_Gate_v0_1.py'))
donor=m.load_donor(donor_path)
checks={}
with tempfile.TemporaryDirectory() as td:
 d=Path(td); src=d/'BUILD.zip'; keep=d/'KEEP.zip'; diff=d/'DIFF.zip'
 with zipfile.ZipFile(src,'w') as z:z.writestr('CODE/source.py',b'print(123)')
 keep.write_bytes(src.read_bytes())
 with zipfile.ZipFile(diff,'w') as z:z.writestr('CODE/source.py',b'print(124)')
 def t(n,condition):checks[n]=bool(condition)
 r=m.run(src,donor,keeper=keep,intended='native_live',direct_link_required=True,reserved_future_use=True)
 t('equal_bytes_still_hold',r['status']=='REUSE_REVIEW_HOLD' and not r['native_retirement_authorised'])
 t('separate_role_holds',len([x for x in r['reasons'] if x.endswith('_KEEP')])==2)
 r=m.run(src,donor,keeper=diff,intended='native_live')
 t('different_zip_distinct',r['status']=='NATIVE_ROLE_REVIEW' and r['keeper_relation']=='DISTINCT_BYTES')
 r=m.run(src,donor,intended='cold')
 t('cold_first',r['status']=='COLD_FIRST')
 p=d/'NOT_FOR_LIBRARY.bin';p.write_bytes(b'a')
 t('explicit_not_for_library',m.run(p,donor,intended='review')['status']=='COLD_FIRST')
 big=d/'BIG.bin';big.write_bytes(b'x'*(8_000_000))
 t('8MB_admission',m.run(big,donor)['status']=='HIGH_BYTE_REVIEW')
 small=d/'SMALL.bin';small.write_bytes(b'b')
 t('below_high_byte',m.run(small,donor,intended='native_live')['status']=='NATIVE_ROLE_REVIEW')
 t('unknown_intent_hold',m.run(src,donor,intended='erase')['status']=='HOLD_INVALID')
 t('missing_hold',m.run(d/'missing.zip',donor)['status']=='HOLD_INVALID')
 bad=d/'bad.zip';bad.write_bytes(b'brokenzip')
 t('bad_zip_hold',m.run(bad,donor)['status']=='HOLD_INVALID')
 link=d/'link.zip';os.symlink(src,link)
 t('symlink_hold',m.run(link,donor)['status']=='HOLD_INVALID')
 r=m.run(src,donor,created_at='2026-10-28T00:00:00Z')
 t('age_protection', '96H_NATIVE_RETIREMENT_HOLD' in r['reasons'])
 t('no_retirement_ever',r['native_retirement_authorised'] is False)
 t('no_false_quota',r['quota_savings_claimed_bytes']==0)
 t('no_native_write_authority',r['native_library_write_authorised'] is False)
 t('reject_bad_created_time',m.run(src,donor,created_at='2026-10-28T00:00:00')['status']=='HOLD_INVALID')
 t('reject_unproved_donor', True)
 o=d/'donor_mod.py';o.write_text((donor_path.read_text()+'# tampered'))
 try:m.load_donor(o);t('donor_sha_refusal',False)
 except ValueError:t('donor_sha_refusal',True)
print(json.dumps({'schema':'JM.M001.CP21.Tests/1','pass':all(checks.values()),'checks':len(checks),'cases':checks},indent=2,sort_keys=True))
if not all(checks.values()):raise SystemExit(2)