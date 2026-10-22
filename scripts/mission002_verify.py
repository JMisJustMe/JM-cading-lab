#!/usr/bin/env python3
"""Re-run bounded Mission 002 contacts on recovered sources; never clones/deploys.
python3 scripts/mission002_verify.py --lane 4 --repo mesh=/path/to/pr377
Missing source/changed code earns HOLD. Outputs go outside the repo by default.
"""
import argparse, hashlib, json, pathlib, subprocess, tempfile, time
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--lane',type=int,action='append');p.add_argument('--repo',action='append',default=[]);p.add_argument('--output',type=pathlib.Path)
a=p.parse_args();plan=json.loads((ROOT/'estate-integration/mission-002/dependency-plan.json').read_text())
output=(a.output or pathlib.Path(tempfile.mkdtemp(prefix='jm-m002-proof-'))).resolve();output.mkdir(parents=True,exist_ok=True)
roots={k:(ROOT/v['default_path']).resolve() for k,v in plan['repositories'].items()}
for pair in a.repo:
 k,v=pair.split('=',1)
 if k not in roots:p.error('Unknown repo alias: '+k)
 roots[k]=pathlib.Path(v).resolve()
lanes=[x for x in plan['lanes'] if not a.lane or x['id'] in a.lane]
if a.lane and len(lanes)!=len(set(a.lane)):p.error('Unknown or duplicated lane selection')
checks={};commands={};lane_results=[]
for lane in lanes:
 errors=[]
 for src in lane['sources']:
  f=roots[src['repo']]/src['path']
  if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=src['sha256']:errors.append('SOURCE_HOLD:'+src['repo']+':'+src['path'])
 # Guard the complete recovered tracked tree, including imported dependencies.
 for repo in {plan['commands'][key]['repo'] for key in lane['commands']}:
  if repo not in checks:
   cwd=roots[repo];head=plan['repositories'][repo]['commit']
   try:
    d=subprocess.run(['git','diff','--name-only',head,'--'],cwd=cwd,text=True,capture_output=True,check=True)
    changes=[s for s in d.stdout.splitlines() if not (repo=='lab' and (s.startswith('estate-integration/mission-002/') or s=='scripts/mission002_verify.py'))]
    checks[repo]={'status':'HOLD' if changes else 'PASS','unexpected_changed_files':changes}
   except (OSError,subprocess.CalledProcessError) as e:checks[repo]={'status':'HOLD','reason':'Exact recovered commit unavailable: '+str(e)}
  if checks[repo]['status']!='PASS':errors.append('DEPENDENCY_TREE_HOLD:'+repo)
 if not errors:
  for key in lane['commands']:
   if key in commands:continue
   spec=plan['commands'][key];argv=[s.replace('{output}',str(output)) for s in spec['argv']];t=time.monotonic()
   try:
    c=subprocess.run(argv,cwd=roots[spec['repo']],capture_output=True,text=True,timeout=240)
    text=c.stdout+c.stderr;code=c.returncode
   except (OSError,subprocess.TimeoutExpired) as e:text=str(e);code=124
   raw=text.encode();(output/(key+'.log')).write_text(text)
   commands[key]={'repo':spec['repo'],'argv':argv,'exit':code,'status':'PASS' if code==0 else 'HOLD','seconds':round(time.monotonic()-t,2),'output_bytes':len(raw),'output_sha256':hashlib.sha256(raw).hexdigest(),'output':text if len(text)<3000 else text[:400]+'\n[bounded log excerpt; full digest above]\n'+text[-1800:]}
   print(key,commands[key]['status'],flush=True)
  errors.extend('COMMAND_HOLD:'+k for k in lane['commands'] if commands[k]['exit']!=0)
 lane_results.append({'id':lane['id'],'contact_status':'HOLD' if errors else 'PASS','declared_workstream_status':lane['status'],'errors':errors,'remaining_holds':lane['holds']})
receipt={'schema':'jm.mission002.work-receipt/1','date':plan['date'],'operation':plan['operation'],'source_head':plan['source_head'],'repositories':plan['repositories'],'dependency_checks':checks,'commands':commands,'lanes':lane_results,'boundary':'These are bounded host/source contacts. PASS here does not close the lane holds. Browser/Android CI, live readbacks and physical device evidence are separately recorded. No deploy, merge, release, external provider activation or private data deletion.'}
(output/'WORK_RECEIPT.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print('RECEIPT',output/'WORK_RECEIPT.json',flush=True)
raise SystemExit(1 if any(x['contact_status']=='HOLD' for x in lane_results) else 0)
