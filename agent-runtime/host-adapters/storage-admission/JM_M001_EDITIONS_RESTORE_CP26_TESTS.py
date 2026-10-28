#!/usr/bin/env python3
"""CP26 synthetic source and adversarial restoration tests; no private originals."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('jm_m001_existing_cp26',HERE/'JM_M001_EDITIONS_RESTORE_CP26.py')
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
PASS={}
def check(label,result):
    PASS[label]=bool(result)
    if not result:raise AssertionError(label)
def hold(label,call):
    try:call()
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile):check(label,True)
    else:check(label,False)

assert shutil.which('zstd'), 'zstd CLI required'
LABEL={1:'SIX_BODY_CP01',2:'SONGBOOK_CP02',3:'AUDIO_CONTACT_CP03',4:'MIX_FORGE_CP04',5:'DEVICE_CONTACT_CP05',6:'TRACK_FORGE_CP06',7:'ANDROID_CARRIAGE_CP07',8:'ANDROID_OUTBOX_CP08_SOURCE'}
with tempfile.TemporaryDirectory(prefix='jm-m001-cp26-tests-') as td:
    root=Path(td)
    originals={}
    for i in range(1,9):
        p=root/f'JM_LYRICS_MUSIC_{LABEL[i]}_FLAZ_2026-10-27.zip'
        with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:
            z.writestr('identity.txt',('synthetic-jm-identity/'+str(i)+'\n')*20)
            z.writestr('shared.txt',('JM OWNED SOURCE PRESERVE\n'*2000)+str(i))
        originals[f'CP{i:02}']=p
    info=lambda path:{'bytes':path.stat().st_size,'sha256':m.digest(path),
                      'filename':path.name,'zip_members':len(zipfile.ZipFile(path).namelist())}
    base={'CP01':info(originals['CP01']),'CP04':info(originals['CP04'])}
    changes={}
    patches={}
    for i in (2,3,5,6,7,8):
        name=f'CP{i:02}'
        key='CP01' if i==2 else 'CP04'
        patch=root/f'{name}.zstpatch'
        p=subprocess.run(['zstd','-q','--patch-from',str(originals[key]),str(originals[name]),'-o',str(patch)],capture_output=True)
        check('patch_created_'+name,p.returncode==0 and patch.is_file())
        patches[name]=patch
        changes[name]={'base':key,'edition_label':LABEL[i],
                       'purpose':'DISTINCT_PROTECTED_EDITION',
                       'target':info(originals[name]),
                       'delta_member':f'PATCHES/{name}.zstpatch',
                       'delta':{'bytes':patch.stat().st_size,'sha256':m.digest(patch)}}
    manifest={'schema':m.SCHEMA,'retirement_authorised':False,
              'quota_savings_claimed_bytes':0,'anchors':base,'derived':changes}
    def writepack(path,data=manifest,broken=None,extra=None):
        with zipfile.ZipFile(path,'w',zipfile.ZIP_STORED) as z:
            z.writestr('MANIFEST_CP26.json',json.dumps(data,sort_keys=True))
            z.writestr('README_CP26.md','synthetic\n')
            z.writestr('JM_M001_EXACT_DELTA_RESTORE_CP25.py','synthetic link: actual code on host\n')
            z.writestr('JM_M001_EDITIONS_RESTORE_CP26.py','synthetic code link\n')
            for key,patch in patches.items():
                payload=patch.read_bytes()
                if key==broken:payload=payload[:-1]+bytes([payload[-1]^1])
                z.writestr(f'PATCHES/{key}.zstpatch',payload)
            if extra:z.writestr(extra,'bad')
    pack=root/'pack.zip';writepack(pack)
    output=root/'restored'
    result=m.restore_all(pack,originals['CP01'],originals['CP04'],output, HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py')
    check('eight_exact_restored',result['edition_count']==8 and len(list(output.glob('*.zip')))==8)
    check('six_delta_editions',result['restored_delta_count']==6)
    check('zero_mutation_or_quota',result['native_library_mutations']==0 and result['account_quota_savings_claimed_bytes']==0)
    check('all_original_hashes',all(m.digest(output/p.name)==m.digest(p) for p in originals.values()))
    check('all_original_archive_members',all(zipfile.ZipFile(output/p.name).testzip() is None for p in originals.values()))
    hold('refuse_existing_output',lambda:m.restore_all(pack,originals['CP01'],originals['CP04'],output,HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    hold('refuse_wrong_anchor',lambda:m.restore_all(pack,originals['CP04'],originals['CP04'],root/'bad_anchor',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    corrupt=root/'corrupt_pack.zip';writepack(corrupt,broken='CP07')
    hold('refuse_tampered_delta',lambda:m.restore_all(corrupt,originals['CP01'],originals['CP04'],root/'corrupt_output',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    forged=copy.deepcopy(manifest);forged['retirement_authorised']=True
    tamper=root/'forged_authority.zip';writepack(tamper,forged)
    hold('refuse_fake_authority',lambda:m.restore_all(tamper,originals['CP01'],originals['CP04'],root/'forged_output',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    unsafe=copy.deepcopy(manifest);unsafe['derived']['CP07']['purpose']='SUPERSEDED_DELETE_OK'
    unsafe_pack=root/'forged_role.zip';writepack(unsafe_pack,unsafe)
    hold('refuse_role_collapse',lambda:m.restore_all(unsafe_pack,originals['CP01'],originals['CP04'],root/'role_output',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    extra=root/'extra.zip';writepack(extra,extra='../forged.txt')
    hold('refuse_extra_archive_member',lambda:m.restore_all(extra,originals['CP01'],originals['CP04'],root/'extra_output',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    wrong_sha=copy.deepcopy(manifest);wrong_sha['derived']['CP02']['target']['sha256']='0'*64
    wrong_sha_pack=root/'sha.zip';writepack(wrong_sha_pack,wrong_sha)
    hold('refuse_forged_original_digest',lambda:m.restore_all(wrong_sha_pack,originals['CP01'],originals['CP04'],root/'sha_output',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    link=root/'symlink.zip';link.symlink_to(pack)
    hold('refuse_symlink_pack',lambda:m.restore_all(link,originals['CP01'],originals['CP04'],root/'link_output',HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py'))
    check('no_failed_partial_output',not any((root/name).exists() for name in ('bad_anchor','corrupt_output','forged_output','role_output','extra_output','sha_output','link_output')))
print(json.dumps({'schema':'JM.M001.CP26.Tests/1','pass':all(PASS.values()),'checks':len(PASS),'cases':PASS},indent=2,sort_keys=True))
if not all(PASS.values()):raise SystemExit(2)