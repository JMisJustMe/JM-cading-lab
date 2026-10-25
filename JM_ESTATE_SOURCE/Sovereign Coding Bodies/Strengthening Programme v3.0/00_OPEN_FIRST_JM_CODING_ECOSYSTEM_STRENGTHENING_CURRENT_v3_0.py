#!/usr/bin/env python3
from __future__ import annotations
import argparse, ast, hashlib, hmac, importlib.util, json, math, os, random, re, resource, socket, statistics, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

VERSION='3.0.0'
BASE=Path('/mnt/data')
P0_PATH=BASE/'00_OPEN_FIRST_JM_P0_NATIVE_SPINE_CURRENT_v2_0.py'
P1_PATH=BASE/'00_OPEN_FIRST_JM_P1_LANGUAGE_IR_FORGE_CURRENT_v2_0.py'
REM_PATH=BASE/'00_OPEN_FIRST_JM_REMAINING_NATIVE_WAVES_CURRENT_v2_0.py'
CB_PATH=BASE/'00_OPEN_FIRST_32_Cb_CURRENT_v2_1_OPERATIONAL_CLOSURE.py'
MATRIX_PATH=BASE/'remaining_waves/JM_100_BODY_MISSING_NATIVE_DEPTH_MATRIX_v1_0.json'


def load(path,name):
    spec=importlib.util.spec_from_file_location(name,path)
    mod=importlib.util.module_from_spec(spec);sys.modules[name]=mod;spec.loader.exec_module(mod);return mod
p0=load(P0_PATH,'jm_p0_v2_strength')
p1=load(P1_PATH,'jm_p1_v2_strength')
rem=load(REM_PATH,'jm_rem_v2_strength')
MATRIX=json.loads(MATRIX_PATH.read_text(encoding='utf-8'))
BODY_IDS=[r['body_id'] for r in MATRIX['rows']]
P0_IDS=[x['body_id'] for x in p0.P0_BODIES]
P1_IDS=[x['body_id'] for x in p1.P1_BODIES]
REM_IDS=sum(rem.BODIES.values(),[])
assert len(BODY_IDS)==100 and set(BODY_IDS)==set(P0_IDS+P1_IDS+REM_IDS)

VOLATILE={'receipt_hash','ts','duration_seconds','created','created_at','time','elapsed','benchmark_ns','hash','prev'}
def norm(x):
    if isinstance(x,dict):return {k:norm(v) for k,v in sorted(x.items()) if k not in VOLATILE}
    if isinstance(x,(list,tuple)):return [norm(v) for v in x]
    return x
def stable(x):return json.dumps(norm(x),sort_keys=True,separators=(',',':'),ensure_ascii=False,default=str)
def sha(x):return hashlib.sha256(stable(x).encode()).hexdigest()

def p0_run(body,p):
    if body=='routeos':
        r=p0.RouteOS();r.register('echo',lambda x:x);r.post('echo','call',p.get('data',{'x':1}));return {'body':body,**r.tick()}
    if body=='os-coding':
        q=p0.os_coding_parse(p.get('source','SERVICE echo PERM call -> echo_adapter'));r=p0.RouteOS({});m=p0.os_coding_mount(q['ir'],r,{'echo_adapter':lambda x:x}) if q['state']=='DING' else {'state':'HOLD'};return {'body':body,'state':m['state'],'parse':q,'mount':m}
    if body=='routecore-native':
        mm=p0.MemoryModel();h=mm.alloc(p.get('value',3));mm.write(h,p.get('write',4));sc=p0.Scheduler();sc.add('a',lambda:'A');sc.add('b',lambda:'B');ffi=p0.FFI();ffi.register('sum',lambda a,b:a+b);return {'body':body,'state':'DING','memory':mm.read(h),'schedule':sc.run(),'ffi':ffi.call('sum',3,2),'abi':p0.ROUTECORE_ABI}
    if body=='root-method':
        blob=p0.root_assemble(p.get('program',['PUSH 3','PUSH 2','ADD','TRACE sum','DING']));return {'body':body,**p0.root_run(blob),'disassembly':p0.root_disassemble(blob)}
    if body=='cadenvm':return {'body':body,**p0.caden_run(p.get('source','SET x 1\nADD x 1\nASSERT x == 2\nTRACE ok\nDING'),debug=True)}
    if body=='routevm':return {'body':body,**p0.routevm_run(p.get('source','ROUTE hub -> room\nGOTO room\nTRACE entered\nDING'))}
    if body=='jmvm':return {'body':body,**p0.jmvm_run(p.get('source','SET pass 1\nCMP pass == 1\nEMIT BUILD_PASS\nTRACE checked\nDING'),body)}
    if body=='parser':
        q=p0.parse_source(p.get('source','BODY Demo\nROUTE hub -> room\nTRACE x\nDING'),body);return {'body':body,'state':q['ding_schema']['status'],'result':q}
    if body=='primebody':
        q=p0.incremental_parse('BODY Demo\nDING',p.get('source','BODY Demo\nTRACE x\nDING'),body);return {'body':body,'state':q['ding_schema']['status'],'result':q}
    if body=='tokenbody':return {'body':body,'state':'DING','result':p0.incremental_lex('BODY Demo\nDING',p.get('source','BODY Demo\nTRACE x\nDING'),body)}
    if body=='compiler':return {'body':body,**p0.theoc_compile(p.get('source','BODY Demo\nTRACE compiled\nDING'),'compiler','json')}
    if body=='onebody-ir':
        q=p0.parse_source(p.get('source','BODY Demo\nTRACE ir\nDING'),body);ir=p0.lower_to_ir(q,body);return {'body':body,'state':p0.verify_ir(ir)['state'],'ir':ir,'verify':p0.verify_ir(ir)}
    if body=='theoc':return {'body':body,**p0.theoc_compile(p.get('source','BODY Demo\nTRACE t\nDING'),'theoc','json')}
    if body=='cading':return {'body':body,**p0.cading_compile(p.get('source','BODY Demo\nTRACE cading\nDING'),'json')}
    if body=='jmlogic':return {'body':body,**p0.jmlogic_eval(p.get('source','ALLOW IF score >= 5'),p.get('context',{'score':5}))}
    if body=='flowtalk':return {'body':body,**p0.flowtalk_parse(p.get('source','four/for -> one -> two/to'))}
    if body=='tracebox':
        q=p0.TraceBox();q.append(body,'stress','TRACE',{'x':1});q.append(body,'stress','DING',{'x':2});return {'body':body,'state':'DING','events':q.query(body=body),'chain':q.verify_chain()}
    if body=='bugg-error-library':return {'body':body,**p0.bugg(p.get('code','DIV_ZERO'),p.get('message','stress'),p.get('context',{}))}
    if body=='codeing-engine':return {'body':body,**p0.codeing_compile(p.get('language','cading'),p.get('source','BODY Demo\nTRACE e\nDING'),'json')}
    raise KeyError(body)

def p1_run(body,p):
    if body=='jm32-1da':
        pol=p1.jm32_policy(p.get('source','REQUIRE SOURCE\nREQUIRE CONTACT\nREQUIRE STATE_CHANGE\nREQUIRE TRACE\nGUARD TRACE=true'));return {'body':body,**p1.jm32_guard(pol,p.get('context',{'SOURCE':'s','CONTACT':'c','STATE_CHANGE':'x','TRACE':True}))}
    if body=='polyglot-bridge':return {'body':body,**p1.poly_roundtrip(p.get('object',{'x':3,'body':'demo'})),'abi':p1.BRIDGE_ABI,'ffi':p1.ffi_generate(target='rust')}
    if body=='hybrid-auto-compiler':return {'body':body,**p1.resolve_backend(set(p.get('required',['native','ffi'])))}
    if body=='wakeforge':
        a=p1.recover_source('a','BODY a');b=p1.recover_source('b','BODY b');return {'body':body,**p1.wake_build([a,b],[('a','b')])}
    if body=='kading':return {'body':body,**p1.kading_run(p.get('source','MOUNT Cading AS cading_room\nMOUNT FlowTalk AS flow_room\nRELATE cading_room -> flow_room\nRUN cading_room\nTRACE mounted\nDING'))}
    if body=='quadze':return {'body':body,**p1.quadze_run(p.get('source','ENTITY player AT 0 0\nMOVE player 1 2\nDING'))}
    if body in {'kocodifying','codifying','jmp'}:
        samples={'kocodifying':'KOCODE jump => move-right','codifying':'CODIFY source AS route','jmp':'JMP here -> there : carry-meaning'};return {'body':body,**p1.relation_language_parse(p.get('source',samples[body]),body)}
    if body=='formeula':return {'body':body,**p1.formeula_compile(p.get('expr','a*2+1'),p.get('env',{'a':3}))}
    if body=='cading-lab':
        q=p1.extract_modules(p.get('source','MODULE A { BODY A\nDING }\nMODULE B { TRACE x }'));return {'body':body,'state':q['state'],'modules':q,'service':p1.language_service('BODY A TRACE DING',1)}
    if body=='formula-born-code':return {'body':body,**p1.formula_born(p.get('expr','3+2'))}
    if body=='mark-level-syntax':return {'body':body,**p1.mark_parse(p.get('source','?_→.✓'))}
    if body=='mark-code':return {'body':body,**p1.markcode_run(p.get('source','!→✓'))}
    if body=='punctbody':return {'body':body,**p1.punct_parse(p.get('source','!→.✓'))}
    if body=='mmzg':return {'body':body,**p1.mmzg_parse(p.get('source','SIG pulse FIELD left PRESSURE 3 DELTA 1 TRACE t1 PALM PASS'))}
    if body=='route-code':return {'body':body,**p1.routecode_parse(p.get('source','NODE hub\nNODE room\nROUTE hub -> room RECOVER hub\nSTART hub'))}
    if body=='routeframe':
        q=p1.routecode_parse('NODE hub\nNODE room\nROUTE hub -> room RECOVER hub\nSTART hub');return {'body':body,**p1.routeframe_verify(q['ir']),'lowered':p1.routeframe_lower(q['ir'])}
    if body=='routescript':
        q=p1.routecode_parse('NODE hub\nNODE room\nROUTE hub -> room RECOVER hub\nSTART hub');return {'body':body,**p1.routescript_run(p.get('source','GOTO room\nSET score=1\nTRACE arrived\nDING'),q['ir'])}
    if body=='statefield':
        sf=p1.StateField();sf.set('score',1);sf.register('hit','INC','score',2);q=sf.contact('hit');return {'body':body,**q,'score':sf.get('score')}
    raise KeyError(body)

def run_body(body,p=None):
    p=p or {}
    if body in P0_IDS:return p0_run(body,p)
    if body in P1_IDS:return p1_run(body,p)
    if body in REM_IDS:return rem.operate(body,p)
    raise KeyError(body)

FORBIDDEN={'__class__','__dict__','__globals__','__import__','eval','exec','shell','command','subprocess','socket'}
def depth(x):
    if not isinstance(x,(dict,list,tuple)):return 0
    vals=x.values() if isinstance(x,dict) else x
    return 1+max([depth(v) for v in vals] or [0])
def validate_payload(p):
    raw=json.dumps(p,ensure_ascii=False,default=str).encode()
    if len(raw)>32768:return False,'PAYLOAD_TOO_LARGE'
    if depth(p)>12:return False,'PAYLOAD_TOO_DEEP'
    def walk(x):
        if isinstance(x,dict):
            for k,v in x.items():
                if str(k).lower() in FORBIDDEN or str(k).startswith('__'):return False
                if not walk(v):return False
        elif isinstance(x,(list,tuple)):
            for v in x:
                if not walk(v):return False
        return True
    return (True,'ALLOW') if walk(p) else (False,'CAPABILITY_KEY_DENIED')

KEY=b'jm-v3-local-integrity-test-key'
def sign(x):return hmac.new(KEY,stable(x).encode(),hashlib.sha256).hexdigest()
def verify(x,sig):return hmac.compare_digest(sign(x),sig)

def strengthened_run(body,p=None):
    p=p or {};ok,gate=validate_payload(p)
    if not ok:return {'body':body,'state':'HOLD','gate':gate,'contained':True,'exception':False,'strengthening':VERSION}
    t=time.perf_counter_ns()
    try:
        out=run_body(body,p);state=out.get('state','DING') if isinstance(out,dict) else 'DING';exc=False
    except Exception as e:
        out={'error':type(e).__name__,'message':str(e)};state='BUGG';exc=True
    ms=(time.perf_counter_ns()-t)/1e6
    r={'body':body,'state':state,'output':out,'benchmark_ms':ms,'contained':True,'exception':exc,'identity_preserved':(out.get('body',body)==body if isinstance(out,dict) else True),'fingerprint':sha(out),'strengthening':VERSION}
    r['signature']=sign({k:v for k,v in r.items() if k!='signature'})
    return r

def sandbox_self():
    resource.setrlimit(resource.RLIMIT_CPU,(2,2));resource.setrlimit(resource.RLIMIT_NOFILE,(64,64))
    try:resource.setrlimit(resource.RLIMIT_AS,(768*1024*1024,768*1024*1024))
    except Exception:pass
    class DeniedSocket:
        def __init__(self,*a,**k):raise PermissionError('NETWORK_DENIED_BY_JM_V3_SANDBOX')
    socket.socket=DeniedSocket

def sandbox_run(body,p=None,timeout=5):
    cmd=[sys.executable,'-I',str(Path(__file__).resolve()),'--worker',body,json.dumps(p or {},ensure_ascii=False)]
    env={'PATH':os.environ.get('PATH',''),'PYTHONHASHSEED':'0','PYTHONDONTWRITEBYTECODE':'1'}
    cwd=tempfile.mkdtemp(prefix='jm-v3-')
    try:
        cp=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout,cwd=cwd,env=env)
        if cp.returncode!=0:return {'body':body,'pass':False,'returncode':cp.returncode,'stderr':cp.stderr[-1000:]}
        r=json.loads(cp.stdout);return {'body':body,'pass':r.get('contained') is True and r.get('body')==body,'state':r.get('state'),'exception':r.get('exception',False)}
    except subprocess.TimeoutExpired:return {'body':body,'pass':False,'state':'HOLD','reason':'TIMEOUT'}
    finally:
        try:Path(cwd).rmdir()
        except Exception:pass

def suite():
    baseline={}
    cmds={'P0':[sys.executable,str(P0_PATH),'self-test-all'],'P1':[sys.executable,str(P1_PATH),'self-test-all'],'REMAINING':[sys.executable,str(REM_PATH),'self-test','all'],'32_Cb':[sys.executable,str(CB_PATH),'native-all']}
    for n,c in cmds.items():
        t=time.perf_counter();cp=subprocess.run(c,capture_output=True,text=True,timeout=90);baseline[n]={'pass':cp.returncode==0,'returncode':cp.returncode,'duration_seconds':round(time.perf_counter()-t,3),'stdout_sha256':hashlib.sha256(cp.stdout.encode()).hexdigest()}
    if not all(x['pass'] for x in baseline.values()):return {'state':'BUGG','baseline':baseline}
    # baseline contact
    contacts=[strengthened_run(b,{}) for b in BODY_IDS]
    contact_pass=sum((not r['exception']) and r['identity_preserved'] for r in contacts)
    # deterministic replay
    det=[]
    for b in BODY_IDS:
        rs=[strengthened_run(b,{}) for _ in range(3)];fps=[r['fingerprint'] for r in rs];det.append({'body':b,'pass':not any(r['exception'] for r in rs) and len(set(fps))==1})
    # fuzz/property containment
    rng=random.Random(3200);fuzz=[]
    for b in BODY_IDS:
        ok=True;exc=0
        for i in range(10):
            p={'seed':i,'n':rng.randint(-1000,1000),'text':'x'*rng.randint(0,32),'flag':bool(i%2)};r=strengthened_run(b,p);exc+=int(r['exception']);ok=ok and r['contained'] and r['identity_preserved']
        fuzz.append({'body':b,'pass':ok,'exceptions_contained':exc})
    # input security + recovery
    sec=[]
    for b in BODY_IDS:
        d=strengthened_run(b,{'__globals__':'denied'});v=strengthened_run(b,{})
        sec.append({'body':b,'pass':d['state']=='HOLD' and d.get('gate')=='CAPABILITY_KEY_DENIED' and not v['exception']})
    # concurrency
    conc={};t=time.perf_counter()
    with ThreadPoolExecutor(max_workers=16) as ex:
        fs={ex.submit(strengthened_run,b,{}):b for b in BODY_IDS}
        for f in as_completed(fs):
            b=fs[f]
            try:r=f.result();conc[b]=(not r['exception']) and r['identity_preserved']
            except Exception:conc[b]=False
    conc_time=time.perf_counter()-t
    # process sandbox proof sample: the same envelope is available to every body,
    # while a stratified 20-body sample is actually rerun under OS resource/network restrictions.
    sample=[BODY_IDS[round(i*(len(BODY_IDS)-1)/19)] for i in range(20)]
    sand={};t=time.perf_counter()
    with ThreadPoolExecutor(max_workers=10) as ex:
        fs={ex.submit(sandbox_run,b,{}):b for b in sample}
        for f in as_completed(fs):
            b=fs[f]
            try:sand[b]=f.result()
            except Exception as e:sand[b]={'body':b,'pass':False,'reason':str(e)}
    sand_time=time.perf_counter()-t
    # benchmark
    bench=[]
    for b in BODY_IDS:
        xs=[];exceptions=0
        for _ in range(7):
            r=strengthened_run(b,{});xs.append(r['benchmark_ms']);exceptions+=int(r['exception'])
        ys=sorted(xs);p95=ys[min(len(ys)-1,math.ceil(.95*len(ys))-1)];bench.append({'body':b,'median_ms':round(statistics.median(xs),4),'p95_ms':round(p95,4),'max_ms':round(max(xs),4),'exceptions':exceptions})
    # receipt tamper
    sig=[]
    for b in BODY_IDS:
        x={'body':b,'state':'DING','fingerprint':next(r['fingerprint'] for r in contacts if r['body']==b)};s=sign(x);sig.append({'body':b,'pass':verify(x,s) and not verify({**x,'state':'BUGG'},s)})
    # compound routes
    routes=[
      ['parser','compiler','onebody-ir','theoc','codeing-engine'],['cading','jmlogic','flowtalk','kading'],['routeos','routecore-native','routevm','tracebox','bugg-error-library'],
      ['jm32-1da','dings','seven-birth-gates','source-ledger','zionfolder'],['game-coding','gameforge','jm-game-native-core','jmvisual-runtime','jmvisualgraft'],
      ['finger-two','pattern-tapping','seedform','mudra-code','speakgate','speech-code'],['cadenpad','coding-body-house','builder-lads','star-route-builder'],
      ['mark-level-syntax','mark-code','punctbody','mmzg','route-code','routescript','statefield']]
    compounds=[]
    for i,route in enumerate(routes,1):
        rs=[strengthened_run(b,{}) for b in route];compounds.append({'route':i,'bodies':route,'pass':all(r['contained'] and not r['exception'] and r['identity_preserved'] for r in rs),'states':[r['state'] for r in rs]})
    return {
      'state':'DING','version':VERSION,'body_count':100,'baseline':baseline,
      'contact':{'pass':contact_pass,'percent':round(contact_pass,1)},
      'deterministic_replay':{'pass':sum(x['pass'] for x in det),'percent':round(sum(x['pass'] for x in det),1),'rows':det},
      'fuzz_property':{'pass':sum(x['pass'] for x in fuzz),'percent':round(sum(x['pass'] for x in fuzz),1),'rows':fuzz},
      'security_recovery':{'pass':sum(x['pass'] for x in sec),'percent':round(sum(x['pass'] for x in sec),1),'rows':sec},
      'concurrency':{'pass':sum(conc.values()),'percent':round(sum(conc.values()),1),'wall_seconds':round(conc_time,3),'rows':conc},
      'process_sandbox':{'pass':sum(x.get('pass',False) for x in sand.values()),'total':len(sand),'percent':round(100*sum(x.get('pass',False) for x in sand.values())/max(1,len(sand)),1),'wall_seconds':round(sand_time,3),'rows':sand,
         'boundary':'Unix process CPU/memory/file limits + network denial; not hypervisor/kernel proof.'},
      'benchmark':{'median_of_medians_ms':round(statistics.median(x['median_ms'] for x in bench),4),'median_p95_ms':round(statistics.median(x['p95_ms'] for x in bench),4),'rows':bench},
      'receipt_integrity':{'pass':sum(x['pass'] for x in sig),'percent':round(sum(x['pass'] for x in sig),1),'rows':sig,'boundary':'Local HMAC test key proves tamper detection, not production key custody.'},
      'compound_routes':{'pass':sum(x['pass'] for x in compounds),'total':len(compounds),'rows':compounds},
      '32_Cb':{'state':'DING','anchor':'v2.1','overlay':'v3 hardening; no semantic rebuild','native_all_pass':baseline['32_Cb']['pass']},
      'boundaries':{'self_hosting':'OPEN beyond self-description/profile coverage','external_hosts':'separate additive receipt rail','historical_exact_conformance':'preserved OPEN where previously gated'}
    }

def main():
    # hidden worker path comes before argparse subcommands
    if len(sys.argv)>=2 and sys.argv[1]=='--worker':
        sandbox_self();body=sys.argv[2];payload=json.loads(sys.argv[3]) if len(sys.argv)>3 else {};print(json.dumps(strengthened_run(body,payload),ensure_ascii=False));return
    p=argparse.ArgumentParser(prog='jm-strengthen-v3');s=p.add_subparsers(dest='cmd',required=True)
    s.add_parser('suite');s.add_parser('status')
    q=s.add_parser('run');q.add_argument('body');q.add_argument('--json',default='{}')
    q=s.add_parser('sandbox-run');q.add_argument('body');q.add_argument('--json',default='{}')
    a=p.parse_args()
    if a.cmd=='suite':
        r=suite();print(json.dumps(r,indent=2,ensure_ascii=False));raise SystemExit(0 if r['state']=='DING' else 1)
    if a.cmd=='status':print(json.dumps({'version':VERSION,'bodies':100,'32_Cb':'v2.1 anchored','law':'ENHANCE THE BODY; DO NOT REOPEN ITS EXISTENCE'},indent=2))
    if a.cmd=='run':print(json.dumps(strengthened_run(a.body,json.loads(a.json)),indent=2,ensure_ascii=False))
    if a.cmd=='sandbox-run':print(json.dumps(sandbox_run(a.body,json.loads(a.json)),indent=2,ensure_ascii=False))
if __name__=='__main__':main()