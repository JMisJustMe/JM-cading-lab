#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,shutil,subprocess,sys,tempfile
from pathlib import Path
from typing import Any
try:
 from .semantic_core import EXPECTED_BODY_COUNT,load_bodies,lower,parse,profile,proof_source,sha,stable
 from .semantic_runtime import execute,receipt
except ImportError:
 from semantic_core import EXPECTED_BODY_COUNT,load_bodies,lower,parse,profile,proof_source,sha,stable
 from semantic_runtime import execute,receipt

def runner_text(current:dict[str,Any],source:str)->str:
 p=repr(json.dumps(current,ensure_ascii=False,sort_keys=True)); s=repr(source)
 return f'''#!/usr/bin/env python3
import hashlib,json
P=json.loads({p}); S={s}
def stable(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v):
 t=v if isinstance(v,str) else stable(v); return hashlib.sha256(t.encode()).hexdigest()
def main():
 lines=[x.strip() for x in S.splitlines() if x.strip()]
 if lines[0]!=f"BODY {{P['body']['id']}}" or lines[1]!=f"LAW_SHA {{P['law_sha256']}}" or lines[-1]!="RECEIPT": return 2
 allowed={{x['verb'] for x in P['capability_effects']}}|{{'fault','recover'}}; caps={{}}; faults=[]; recoveries=0; trace=[]; output=None
 for tick,line in enumerate(lines[2:-1],1):
  if not line.startswith(P['source_prefix']): return 3
  raw=line[len(P['source_prefix']):]; verb,_,text=raw.partition(' ')
  if verb not in allowed: return 4
  payload=json.loads(text)
  if verb in {{x['verb'] for x in P['capability_effects']}}: caps[verb]=payload; output={{verb:payload['token']}}
  elif verb=='fault': faults.append(payload)
  elif verb=='recover':
   if not faults: return 5
   recoveries+=1; output={{'recovered':True,'route':payload}}
  trace.append({{'tick':tick,'verb':verb,'output_sha256':sha(output)}})
 if set(caps)!={{x['verb'] for x in P['capability_effects']}} or not faults or recoveries<1: return 6
 print(stable({{'body_id':P['body']['id'],'namespace':P['namespace'],'semantic_signature':P['semantic_signature'],'capability_count':len(caps),'trace_count':len(trace),'fault_count':len(faults),'recovery_count':recoveries,'output_sha256':sha(output),'status':'ISOLATED_PROCESS_PASS'}})); return 0
if __name__=='__main__': raise SystemExit(main())
'''

def write_text(path:Path,text:str)->None:
 path.parent.mkdir(parents=True,exist_ok=True); path.write_text(text,encoding="utf-8")
def write_json(path:Path,value:Any)->None: write_text(path,json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n")

def build_body(out:Path,body:dict[str,Any])->dict[str,Any]:
 current=profile(body); source=proof_source(current); ast=parse(current,source); ir=lower(current,ast); state=execute(current,ir); local=receipt(current,source,ast,ir,state); root=out/"bodies"/str(body["id"])
 write_json(root/"profile.json",current); write_text(root/"source/proof.jmdeep",source); write_json(root/"ast/proof.ast.json",ast); write_json(root/"ir/proof.ir.json",ir); write_json(root/"run/state.json",state)
 runner=root/"runtime/runner.py"; write_text(runner,runner_text(current,source)); result=subprocess.run([sys.executable,str(runner)],capture_output=True,text=True,timeout=20)
 if result.returncode: raise ValueError(f"{body['id']}: isolated runtime failed: {result.stderr or result.stdout}")
 isolated=json.loads(result.stdout.strip())
 if isolated["semantic_signature"]!=current["semantic_signature"]: raise ValueError(f"{body['id']}: isolated signature mismatch")
 write_json(root/"runtime/isolated-process-receipt.json",isolated); local["isolated_process_status"]=isolated["status"]; local["isolated_process_receipt_sha256"]=sha(isolated); write_json(root/"receipt.json",local); return local

def build(repo:Path,out:Path)->dict[str,Any]:
 if out.exists(): shutil.rmtree(out)
 receipts=[build_body(out,body) for body in load_bodies(repo)]
 manifest={"schema":"jm.body-specific-semantic-depth-manifest/0.2","body_count":len(receipts),"status":"BODY_SPECIFIC_SEMANTIC_DEPTH_AND_ISOLATED_PROCESS_PASS_NOT_NATIVE_CROWN","unique_namespaces":len({r['namespace'] for r in receipts}),"unique_semantic_signatures":len({r['semantic_signature'] for r in receipts}),"all_capabilities_executed":all(r['capability_count']==r['declared_capability_count'] for r in receipts),"all_fault_recovery_passed":all(r['fault_count']>=1 and r['recovery_count']>=1 for r in receipts),"all_isolated_processes_passed":all(r['isolated_process_status']=='ISOLATED_PROCESS_PASS' for r in receipts),"machine_kernel_ding":"OPEN_PER_BODY","receipts":receipts,"claim_boundary":"All first-100 bodies have body-specific capability effects and isolated process runtimes. Shared Python carrier remains; exact native forms, independent kernels, self-hosting and crowns remain open."}
 if manifest["unique_namespaces"]!=EXPECTED_BODY_COUNT or manifest["unique_semantic_signatures"]!=EXPECTED_BODY_COUNT: raise ValueError("identity or semantic collapse")
 if not all((manifest["all_capabilities_executed"],manifest["all_fault_recovery_passed"],manifest["all_isolated_processes_passed"])): raise ValueError("semantic depth gate incomplete")
 write_json(out/"SEMANTIC_DEPTH_MANIFEST.json",manifest); return manifest

def deterministic(repo:Path)->None:
 with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
  if sha(build(repo,Path(a)))!=sha(build(repo,Path(b))): raise ValueError("non-deterministic semantic-depth build")

def main()->int:
 p=argparse.ArgumentParser(); p.add_argument("--repo",type=Path,default=Path(".")); p.add_argument("--out",type=Path,required=True); p.add_argument("--deterministic",action="store_true"); args=p.parse_args(); m=build(args.repo.resolve(),args.out.resolve())
 if args.deterministic: deterministic(args.repo.resolve())
 print(stable({"status":m["status"],"body_count":m["body_count"]})); return 0
if __name__=="__main__": raise SystemExit(main())
