#!/usr/bin/env python3
"""Synthetic CP24 process-family regression, no private Estate data."""
import copy, hashlib, importlib.util, json, subprocess, sys, tempfile
from pathlib import Path

SOURCE=Path(__file__).with_name('JM_M001_PROCESS_CAPTURE_FAMILY_CP24.py')
spec=importlib.util.spec_from_file_location('jm_cp24',SOURCE)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
checks={}
def t(k,ok):
    checks[k]=bool(ok)
    if not ok:raise AssertionError(k)

m27='''# Synthetic M27
23 images / 4,570,243 B
CANDIDATE RETIRE / STORAGE OPERATIONAL TRACE
No deletion executed.
Owner approval is still required before mutation.
'''
m28='''# Synthetic M28
16 / 4,658,335 B
8 / 3,586,066 B
4 / 3,473,856 B
8 / 3,214,600 B
NO DELETION
'''
with tempfile.TemporaryDirectory() as td:
    d=Path(td); originals=copy.deepcopy(m.DONORS)
    donors={'m27':m27,'m28':m28}
    try:
        pins={}
        for k,(name,_) in originals.items():
            raw=donors[k].encode()
            (d/name).write_bytes(raw)
            pins[k]=(name,hashlib.sha256(raw).hexdigest())
        m.DONORS=pins
        actual=m.read_donors(d)
        t('both_pinned_sources',actual==donors)
        out=m.compile_family_receipt(actual,['STORAGE_PROOF__one.jpg','CLOUD_PROOF__two.png'])
        t('five_families',len(out['families'])==5)
        t('39_historical_candidates',out['historic_candidate_count']==39)
        t('historical_pressure_not_savings',out['historic_candidate_pressure_bytes_not_savings']==9228578)
        t('20_protected_originals',out['protected_source_and_visual_count']==20)
        t('protected_bytes',out['protected_source_bytes']==10274522)
        t('unapproved_release_refused',not out['retirement_authorised'] and out['native_mutations']==0)
        t('quota_zero',out['quota_savings_claimed_bytes']==0)
        t('provided_observation_not_authority',all(not f['current_native_residency_proven'] for f in out['families']))
        t('unmatched_family_zero_not_deleted',m.compile_family_receipt(actual,[])['families'][0]['provided_root_filename_observations']==0)
        t('two_prefixes_recorded',out['families'][0]['provided_root_filename_observations']==1 and out['families'][1]['provided_root_filename_observations']==1)
        t('protect_handwritten',out['families'][2]['historical_decision']=='PROTECT_PRIMARY_HANDWRITTEN_SOURCE')
        t('protect_gameplay_evidence',out['families'][3]['role']=='preserve_independent_original_or_evidence')
        t('protect_atlas',out['families'][4]['role']=='preserve_independent_original_or_evidence')
        bad=copy.deepcopy(actual);bad['m27']=bad['m27'].replace('23 images','22 images')
        try:m.compile_family_receipt(bad);t('false_source_count_rejected',False)
        except ValueError:t('false_source_count_rejected',True)
        try:m.compile_family_receipt(actual,['',False]);t('invalid_list_refused',False)
        except ValueError:t('invalid_list_refused',True)
        p=d/pins['m28'][0];old=p.read_bytes();p.write_bytes(old+b'altered')
        try:m.read_donors(d);t('tampered_source_refused',False)
        except ValueError:t('tampered_source_refused',True)
        p.write_bytes(old)
        symlink=d/'danger';symlink.symlink_to(p)
        m.DONORS={**pins,'m28':('danger',pins['m28'][1])}
        try:m.read_donors(d);t('symlink_source_refused',False)
        except ValueError:t('symlink_source_refused',True)
    finally:m.DONORS=originals
print(json.dumps({'schema':'JM.M001.CP24.Tests/1','checks':len(checks),
                  'pass':all(checks.values()),'cases':checks},sort_keys=True,indent=2))
if not all(checks.values()):raise SystemExit(2)
