#!/usr/bin/env python3
"""JM M001 CP23 synthetic integration tests. No private Estate records."""
import copy, hashlib, importlib.util, json, subprocess, sys, tempfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
SOURCE=HERE/'JM_M001_REAL_EVIDENCE_BRIDGE_CP23.py'
SPEC=importlib.util.spec_from_file_location('jm_cp23',SOURCE)
m=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(m)
CP22=HERE/'JM_M001_POSTPROCESS_RETENTION_CP22.py'
H=hashlib.sha256(b'JM synthetic').hexdigest()
checks={}
def t(name, condition):
    checks[name]=bool(condition)
    if not condition:raise AssertionError(name)

def donor_fixture():
    cases=[]
    for i in range(5):
        r='synthetic-root-'+str(i);h='synthetic-house-'+str(i)
        n=20000000+(21982683 if i==4 else 0)
        cases.append({'project':'SyntheticProject'+str(i),'root_id':r,'house_id':h,
          'root_bytes':n,'expected_sha256':H,
          'root_contact':{'sha256':H,'bytes':n,'status':'FRESH_VERIFIED'},
          'house_contact':{'status':'FRESH_VERIFIED'},'byte_relationship':'FRESH_BYTE_EQUAL',
          'roles':[{'kind':'root_delivery','carrier_id':r,'status':'NOT_RELEASED'},
                   {'kind':'house_lineage','carrier_id':h,'status':'PROTECTED'},
                   {'kind':'reserved_or_unobserved','carrier_id':r,'status':'OPEN_WORLD'}],
          'retirement_eligible':False,'reclaim_credit_bytes':0,
          'verdict':'HOLD_PROTECTED_INDEPENDENT_PURPOSE'})
    g={'protocol':'JM.MagnifyingGlass.PurposeGraph/1.0','results':cases,
       'total_protected_bytes':121982683,'retirement_eligible_count':0}
    g['graph_sha256']=hashlib.sha256(json.dumps(g,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    images=[{'project':'Synthetic%d'%(i%7),'name':'image_%02d.png'%i,
       'original_bytes':2800000+(1586381 if i==24 else 0),
       'original_sha256':hashlib.sha256(str(i).encode()).hexdigest(),
       'original_format':'PNG','pixel_sha256':H} for i in range(25)]
    media={'checkpoint':'JM_MEDIA_CP02_LOSSLESS_CONTACT_2026-10-27',
       'image_count':25,'project_count':7,'actual_library_reclaimed_bytes':0,
       'entries':images}
    editions=[{'library_original_id':'test-edition-'+str(i),'name':'edition%d.zip'%i,
       'bytes':27000000+(3404919 if i==3 else 0),'sha256':H,
       'protected_role':'Synthetic historical website edition',
       'zip_members':20,'recovered_from_drive_exact_sha256':True} for i in range(4)]
    cold={'schema':'JM.MEDIA.CP12.FullRuns/1.0','originals':editions,
      'economics':{'this_run_library_reclaimed_bytes':0}}
    return {'graph':g,'media':media,'cold':cold}

with tempfile.TemporaryDirectory() as td:
    root=Path(td)
    donors=donor_fixture()
    pins=copy.deepcopy(m.PINS)
    try:
        modified={}
        for k,(name,_) in pins.items():
            b=json.dumps(donors[k],sort_keys=True).encode()
            (root/name).write_bytes(b)
            modified[k]=(name,hashlib.sha256(b).hexdigest())
        m.PINS=modified
        result=m.run(root,CP22)
        data=result['cp22']
        t('39_carriers',data['carrier_count']==39)
        t('16_body_edition_families',data['lineage_count']==16)
        t('25_original_media',sum(x['kind']=='image' for x in data['carriers'])==25)
        t('39_unique_ids',len({x['carrier_id'] for x in data['carriers']})==39)
        t('independent_uses_preserved',all(x['separate_uses'] for x in data['carriers']))
        t('all_keep_roles',all(x['decision']=='KEEP_SEPARATE_USE_OR_SOURCE' for x in data['carriers']))
        t('no_retirement_review',data['review_count']==0)
        t('no_deletion_or_quota',result['native_mutations']==0 and result['quota_savings_claimed_bytes']==0)
        t('three_pinned_donors',len(result['source_pins'])==3)
        p=root/pins['media'][0];original=p.read_bytes();p.write_bytes(original+b'garbage')
        try:m.pin_read(root);t('tampering_refused',False)
        except ValueError:t('tampering_refused',True)
        p.write_bytes(original)
        bad=copy.deepcopy(donors);bad['graph']['results'][0]['roles'][0]['carrier_id']='impostor'
        try:m.make_manifest(bad);t('carrier_role_spoof_refused',False)
        except ValueError:t('carrier_role_spoof_refused',True)
        bad=copy.deepcopy(donors);bad['media']['actual_library_reclaimed_bytes']=1
        try:m.make_manifest(bad);t('false_quota_refused',False)
        except ValueError:t('false_quota_refused',True)
        bad=copy.deepcopy(donors);bad['cold']['originals'][0]['bytes']-=1
        try:m.make_manifest(bad);t('changed_cold_bytes_refused',False)
        except ValueError:t('changed_cold_bytes_refused',True)
        receipt=root/'receipt.json'
        cmd=[sys.executable,str(SOURCE),'--sources',str(root),'--cp22',str(CP22),
             '--output',str(receipt)]
        a=subprocess.run(cmd,capture_output=True)
        t('cli_new_receipt',a.returncode==0 and receipt.is_file())
        before=receipt.read_bytes()
        b=subprocess.run(cmd,capture_output=True)
        t('cli_existing_receipt_protected',b.returncode==2 and before==receipt.read_bytes())
    finally:m.PINS=pins
print(json.dumps({'schema':'JM.M001.CP23.Tests/1',
 'checks':len(checks),'pass':all(checks.values()),'cases':checks},sort_keys=True,indent=2))
if not all(checks.values()):raise SystemExit(2)
