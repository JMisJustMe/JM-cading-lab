#!/usr/bin/env python3
"""CP02 CI: receiver real-original contact using explicitly synthetic donor metadata.

This proves receiving execution only. It MUST NOT report fresh donor execution
or a full end-to-end DING without the separately held original JM LLM archives.
"""
import copy, hashlib, json, sys, tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import jm_ai_federation_cp02 as cp

def fixture():
    value='elephants mooing'
    trace=[
      {'stage':'source','state':'PASS','archive_count':2},
      {'stage':'jm-llm2','state':'DING','result':value,
       'result_sha256':hashlib.sha256(value.encode()).hexdigest(),
       'decoder':'original shared learned direct content'},
      {'stage':'jm-llm-core','state':'DING','result':value,
       'route':'selector-aware-retrieval-executor','input_is_previous_original_output':True}
    ]
    return {'schema':cp.UPSTREAM_SCHEMA,'state':'DING','merge':False,
            'proof_transfer':False,'result':value,
            'verified_original_archives':{'llm2_v21':cp.LLM2_SHA,'core_v116':cp.CORE_SHA},
            'trace':trace,
            'receipt_sha256':hashlib.sha256(json.dumps(trace,sort_keys=True).encode()).hexdigest()}
def run():
    root=Path(__file__).resolve().parents[1]
    f=fixture()
    cp.validate_upstream(f)
    failures=[]
    for name,change in [
        ('wrong_version',lambda x:x['verified_original_archives'].update(llm2_v21='wrong')),
        ('old_llm2',lambda x:x['verified_original_archives'].update(llm2_v21='v2.0')),
        ('tampered_result',lambda x:x.update(result='different')),
        ('tampered_history',lambda x:x['trace'][1].update(result='different')),
        ('wrong_route',lambda x:x['trace'][2].update(route='simulated')),
        ('fake_decoder',lambda x:x['trace'][1].update(decoder='invented')),
        ('missing_ding',lambda x:x.update(state='HOLD')),
        ('merge',lambda x:x.update(merge=True)),
        ('proof_transfer',lambda x:x.update(proof_transfer=True)),
        ('receipt_changed',lambda x:x.update(receipt_sha256='wrong')),
    ]:
        r=copy.deepcopy(f);change(r)
        try:cp.validate_upstream(r)
        except ValueError:pass
        else:failures.append(name)
    assert not failures,'false DINGs admitted: '+str(failures)
    class Args:pass
    a=Args();a.estate_root=root;a.live=False
    with tempfile.TemporaryDirectory(prefix='jm-cp02-test-') as d:
        p=Path(d)/'synthetic-contract-fixture.json'
        p.write_text(json.dumps(f))
        a.receipt=p
        o=cp.run(a)
    assert o['state']=='HOLD',o
    assert o['original_sender_executed_in_this_run'] is False,o
    assert o.get('receiver_contact')=='PASS',json.dumps(o,indent=2)
    assert o['hold_reason']=='UPSTREAM_RECEIPT_ONLY_NOT_FRESH_ORIGINAL_RUNTIME_REPROOF',o
    assert set(o['receivers'])=={'ailatheo_rod','teo_os','jm_ai_lab_v2','jm_agi_lab'},o
    assert all(x['status']=='PASS' for x in o['receivers'].values()),o
    assert o['receivers']['ailatheo_rod']['coding_spine']==14,o
    assert o['receivers']['teo_os']['trace_readback'],o
    assert o['receivers']['jm_ai_lab_v2']['actual_route']=='grounded-generate',o
    assert o['receivers']['jm_agi_lab']['distinct_node_processes'],o
    assert all(o['receivers']['jm_agi_lab']['readback_checks'].values()),o
    print(json.dumps({'schema':'JM.IntelligenceFederation.CP02.CI/1',
       'state':'PASS_RECEIVER_ONLY','negative_gates':len(failures)+10,
       'receiver_offices':list(o['receivers']),'source_freshly_rerun':False,
       'end_to_end_ding':'HOLD_UNTIL_OWNER_ORIGINALS_REPROVE',
       'scope':'Real original GitHub receiver code; synthetic donor envelope is not fresh sender proof'},indent=2))
if __name__=='__main__':run()
