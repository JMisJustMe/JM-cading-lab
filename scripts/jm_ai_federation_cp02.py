#!/usr/bin/env python3
"""JM CP02 — proof-aware return of two original JM LLMs into existing AI offices.

Execution must use a checkout of the existing JMisJustMe/JM-cading-lab.
No frozen model bytes are bundled, no Estate body is merged or replaced.
A supplied JSON receipt is contract-only; a fresh original runtime reproof
is required before a CP02 end-to-end DING may be claimed.
"""
from __future__ import annotations
import argparse, hashlib, json, subprocess, sys, tempfile
from pathlib import Path

SCHEMA = 'JM.IntelligenceFederation.CP02/1'
UPSTREAM_SCHEMA = 'JM.IntelligenceFederation.OriginalLLMCrossContact/1'
LLM2_SHA = '28016904da6a44dabc6e49688090452fde98e7da73541a5daa2003c8c51d38b0'
CORE_SHA = '950ff031a695cbf93677bfc27d4307bc64ed3af12fce40c15f922645013f8dee'
LAB_GIT_BLOB = '2b3243cdd2a65e76e7a2bc27f48d875fca89a06a'
AGI_CORE_SHA = 'fefb51860eb4520ea4fcd2b1ad09c6b149be6500da40ba9aba1e029d213e8d26'

def digest(obj): return hashlib.sha256(json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def file_sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git_blob(p):
    b=p.read_bytes()
    return hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()

def validate_upstream(r):
    if not isinstance(r,dict) or r.get('schema')!=UPSTREAM_SCHEMA or r.get('state')!='DING':
        raise ValueError('UPSTREAM_DING_SCHEMA_REQUIRED')
    if r.get('merge') is not False or r.get('proof_transfer') is not False:
        raise ValueError('IDENTITY_AND_PROOF_BOUNDARY_REQUIRED')
    a=r.get('verified_original_archives',{})
    if a.get('llm2_v21')!=LLM2_SHA or a.get('core_v116')!=CORE_SHA:
        raise ValueError('CURRENT_ORIGINAL_ARCHIVE_DIGESTS_REQUIRED')
    if r.get('result')!='elephants mooing':
        raise ValueError('BOUNDED_DONOR_FIXTURE_MISMATCH')
    t=r.get('trace',[])
    if [x.get('stage') for x in t]!=['source','jm-llm2','jm-llm-core']:
        raise ValueError('UPSTREAM_TRACE_CHAIN_MISMATCH')
    if any(x.get('state') not in ('PASS','DING') for x in t):
        raise ValueError('UPSTREAM_TRACE_IS_NOT_CLEAN')
    if t[1].get('result')!=r['result'] or t[2].get('result')!=r['result']:
        raise ValueError('UPSTREAM_CONSEQUENCE_MISMATCH')
    if t[1].get('result_sha256') != hashlib.sha256(r['result'].encode()).hexdigest():
        raise ValueError('UPSTREAM_RESULT_HASH_MISMATCH')
    if not t[2].get('input_is_previous_original_output'):
        raise ValueError('PRODUCER_CONSUMER_PROOF_REQUIRED')
    if not t[1].get('decoder','').startswith('original'):
        raise ValueError('ORIGINAL_MODEL_EXECUTION_PATH_REQUIRED')
    if t[2].get('route')!='selector-aware-retrieval-executor':
        raise ValueError('ORIGINAL_CORE_ROUTE_REQUIRED')
    historical=hashlib.sha256(json.dumps(t,sort_keys=True).encode()).hexdigest()
    if r.get('receipt_sha256')!=historical:
        raise ValueError('UPSTREAM_HISTORY_DIGEST_MISMATCH')
    return digest(r)

def fresh_sender(args):
    keys=['llm2_root','core_root','llm2_archive','core_archive','first_run_adapter']
    if not all(getattr(args,k,None) for k in keys):
        raise ValueError('FRESH_SENDER_REQUIRES_ORIGINAL_PATHS_AND_CP01_ADAPTER')
    cmd=[sys.executable,str(args.first_run_adapter.resolve())]
    for k in keys[:-1]: cmd.extend(['--'+k.replace('_','-'),str(getattr(args,k).resolve())])
    p=subprocess.run(cmd,capture_output=True,text=True,timeout=150)
    if p.returncode!=0: raise ValueError('ORIGINAL_SENDER_REPROOF_FAILED')
    try: r=json.loads(p.stdout)
    except json.JSONDecodeError: raise ValueError('ORIGINAL_SENDER_RECEIPT_UNREADABLE') from None
    validate_upstream(r)
    return r

def run_ailatheo(root,raw):
    scripts=(root/'scripts').resolve()
    if not (scripts/'jm_ailatheo_unified_circuit.py').is_file():
        raise ValueError('ORIGINAL_AILATHEO_MISSING')
    sys.path.insert(0,str(scripts))
    try:
        import jm_ailatheo_unified_circuit as circuit
        registry=json.loads((root/'registry/rod-bodies-v0-1.json').read_text())
        a=circuit.run({'raw_contact':raw},registry)
        b=circuit.run({'raw_contact':raw},registry,prior=a)
    finally:
        sys.path.remove(str(scripts))
    for x in (a,b):
        if x.get('ding')!='AILATHEO_UNIFIED_CIRCUIT_DING' or x.get('coding_spine',{}).get('executed')!=14:
            raise ValueError('AILATHEO_ORIGINAL_CONTACT_HOLD')
        rod=x.get('rod',{})
        if rod.get('claim_ceiling')!='REENTRY_CHANGE' or not {'TraceBox','Interactors Interacting'}.issubset(set(rod.get('trace',{}).get('carry',[]))):
            raise ValueError('ROD_GROUNDED_CONTACT_HOLD')
    return {'status':'PASS','office':'AILatheo / ROD','coding_spine':14,'opportunity_ceiling':a['rod']['claim_ceiling'],
            'relation_carry':a['rod']['trace']['carry'],'reentry':'PASS','identity_separate':True}

def run_teo(root,upstream_sha):
    sys.path.insert(0,str((root/'scripts').resolve()))
    try:
        from jm_teo_os_recovered_runtime import TeoKernel
        k=TeoKernel().boot(); k.add_librarian()
        receipt=k.ding('ding:make-receipt',source='body:teo-kernel-operator',
          payload={'event':'cp02-original-llm-return','upstream_receipt_sha256':upstream_sha},target='body:teo-librarian')
        k.ding('ding:query-trace',payload={'event':'receipt'},target='body:teo-librarian')
        returned=k.bodies['body:teo-librarian']['memory'].get('lastResult',[])
    finally: sys.path.pop(0)
    if receipt.get('receipt_event')!='cp02-original-llm-return' or not returned:
        raise ValueError('TEO_TRACE_NOT_RETURNED')
    return {'status':'PASS','office':'Teo OS recovered-spec runtime','receipt':receipt['receipt_event'],
            'trace_readback':True,'historical_byte_identity':False}

LAB_NODE = r'''const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');
const m=s.match(/classify\(task\)\{([\s\S]*?)\n  \},\n\n  plan\(task\)/);
if(!m)throw Error('EXACT_AI_LAB_CLASSIFIER_MISSING');
const JM={Knowledge:{ensure:()=>({docs:[{id:'cp02-verified-source-contact'}]})}};
const classify=new Function('JM','task',m[1]);
const text=fs.readFileSync(0,'utf8');console.log(JSON.stringify({route:classify(JM,text)}));'''

def run_lab(root,raw):
    p=root/'ai-federation/jm-ai-lab-v2.0/00_OPEN_FIRST_JM_AI_LAB_v2_0_FULL_COMPLETE.html'
    if not p.is_file() or git_blob(p)!=LAB_GIT_BLOB:
        raise ValueError('EXACT_JM_AI_LAB_V2_BLOB_REQUIRED')
    done=subprocess.run(['node','-e',LAB_NODE,str(p)],input=raw,text=True,capture_output=True,timeout=20)
    if done.returncode: raise ValueError('EXACT_JM_AI_LAB_CLASSIFIER_FAILED')
    x=json.loads(done.stdout)
    if x.get('route') not in ('grounded','grounded-generate'): raise ValueError('LAB_DID_NOT_CLASSIFY_GROUNDED_CONTACT')
    return {'status':'PASS','office':'JM AI Lab v2.0','original_source_blob':LAB_GIT_BLOB,
            'actual_route':x['route'],'model_training_in_this_contact':False}

AGI_NODE = r'''import fs from 'node:fs';import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [corePath,witnessPath,packetSha,mode]=process.argv.slice(1);
const m=await import(pathToFileURL(corePath).href);
if(mode==='arm'){
 let s=m.newState();s=m.applyCommand(s,{type:'OBSERVE',key:'cp02-source-sha256',value:packetSha});
 s=m.applyCommand(s,{type:'CONSEQUENCE',label:'verified federation contact accepted'});
 s=m.applyCommand(s,{type:'ARM_SETTLE'});
 for(let i=0;i<m.SETTLE_TICKS;i++) s=m.applyCommand(s,{type:'TICK_SETTLE'});
 const c=m.makeReloadChallenge(s,{token:packetSha.slice(0,16),loadId:'node-'+process.pid,priorProbe:'cp02-prior'});
 fs.writeFileSync(witnessPath,JSON.stringify({s,c,probe:c.expectedProbe,armedPid:process.pid,sha:crypto.createHash('sha256').update(m.canonical(s)).digest('hex')}));
 console.log(JSON.stringify({status:'ARMED',revision:s.revision,settled:s.durability.status==='SETTLED',heartbeat:s.durability.heartbeat}));
}else if(mode==='return'){
 const x=JSON.parse(fs.readFileSync(witnessPath,'utf8'));
 if(x.armedPid===process.pid)throw Error('NOT_A_DISTINCT_PROCESS');
 const sha=crypto.createHash('sha256').update(m.canonical(x.s)).digest('hex');
 if(sha!==x.sha)throw Error('STATE_SHA_MISMATCH');
 if(x.s.facts['cp02-source-sha256']?.value!==packetSha)throw Error('WRONG_DONOR_PACKET');
 const r=m.verifyReloadChallenge(x.s,x.c,{loadId:'node-'+process.pid,probeValue:x.probe});
 if(r.state!=='PASS')throw Error('REENTRY_HOLD');
 console.log(JSON.stringify({status:'PASS',distinctProcess:true,checks:r.checks,sourceSha:packetSha,settle:'STATE_MACHINE_TICKS_ONLY_NOT_REAL_12_SECOND_WAIT'}));
}else throw Error('INVALID_MODE');'''

def run_agi(root,source_sha):
    p=root/'apps/jm-agi-lab-runtime-console-v1/runtime-core.mjs'
    if not p.is_file() or file_sha(p)!=AGI_CORE_SHA:
        raise ValueError('EXACT_AGI_LAB_RUNTIME_CORE_REQUIRED')
    with tempfile.TemporaryDirectory(prefix='jm-cp02-agi-') as temp:
        witness=str(Path(temp)/'witness.json')
        results=[]
        for mode in ('arm','return'):
            done=subprocess.run(['node','--input-type=module','-e',AGI_NODE,str(p),witness,source_sha,mode],
                text=True,capture_output=True,timeout=25)
            if done.returncode: raise ValueError('AGI_LAB_'+mode.upper()+'_HOLD:'+done.stderr[-180:])
            results.append(json.loads(done.stdout))
    if results[0].get('settled') is not True or results[1].get('status')!='PASS':
        raise ValueError('AGI_LAB_PERSISTENCE_OR_SETTLE_HOLD')
    return {'status':'PASS','office':'JM AGI Lab runtime carrier','distinct_node_processes':True,
            'readback_checks':results[1]['checks'],'input_packet_sha256':source_sha,
            'scope':'12 STATE MACHINE TICKS; NO REAL-TIME 12 SECOND SETTLE, OS REBOOT, DEVICE OR AGI CLAIM'}

def run(args):
    out={'schema':SCHEMA,'state':'HOLD','scope':'original JM LLM source -> original Estate receiving offices',
         'merge':False,'proof_transfer':False,'new_ai_created':False,'receivers':{},'boundaries':[]}
    try:
        root=args.estate_root.resolve()
        if not (root/'scripts/jm_ailatheo_unified_circuit.py').is_file():
            raise ValueError('ORIGINAL_ESTATE_CHECKOUT_REQUIRED')
        if args.live:
            donor=fresh_sender(args)
            reproof=True
        else:
            if not args.receipt: raise ValueError('RECEIPT_REQUIRED_FOR_CONTRACT_PROBE')
            donor=json.loads(args.receipt.read_text())
            reproof=False
        upstream_sha=validate_upstream(donor)
        raw=('The stored evidence says JM LLM #2 v2.1 generated '+donor['result']+
             ' and JM LLM Core v1.16 returned the same verified source. '
             'The route produced a consequence, left a trace, persisted, and re-entry changed the next action.')
        out['upstream_receipt_sha256']=upstream_sha
        out['original_sender_executed_in_this_run']=reproof
        out['receivers']['ailatheo_rod']=run_ailatheo(root,raw)
        out['receivers']['teo_os']=run_teo(root,upstream_sha)
        out['receivers']['jm_ai_lab_v2']=run_lab(root,raw)
        out['receivers']['jm_agi_lab']=run_agi(root,upstream_sha)
        out['receiver_contact']='PASS'
        out['state']='DING' if reproof else 'HOLD'
        if not reproof: out['hold_reason']='UPSTREAM_RECEIPT_ONLY_NOT_FRESH_ORIGINAL_RUNTIME_REPROOF'
        out['boundaries']=['Receiver offices executed using original working source files, not a fused model',
           'ROD is an inner organ, Teo OS a recovered-spec descendant, and AGI Lab only a bounded runtime carrier',
           'Adaptive ECOSTATE separately proven by historical CI but not a recipient of this new payload',
           'No new native Fold/Oppo proof; no exact Ehilatheo executable source; no live Build Mesh registry write']
    except (ValueError,OSError,RuntimeError,subprocess.TimeoutExpired,json.JSONDecodeError,AssertionError,ImportError) as exc:
        out['hold_reason']=str(exc)
    return out

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--estate-root',type=Path,required=True)
    p.add_argument('--receipt',type=Path)
    p.add_argument('--live',action='store_true')
    for k in ('first_run_adapter','llm2_root','core_root','llm2_archive','core_archive'):
        p.add_argument('--'+k.replace('_','-'),type=Path)
    p.add_argument('--out',type=Path)
    a=p.parse_args();v=run(a)
    b=json.dumps(v,indent=2,ensure_ascii=False)+'\n'
    if a.out:a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(b)
    print(b,end='')
    return 0 if v['state']=='DING' or v.get('receiver_contact')=='PASS' else 2

if __name__=='__main__':raise SystemExit(main())
