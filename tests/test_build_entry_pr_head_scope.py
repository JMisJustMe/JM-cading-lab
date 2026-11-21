import importlib.util,json,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('entry',root/'scripts/jm_build_entry_gate.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
policy=json.loads((root/'registry/build-routes/JM_BUILD_ENTRY_POLICY_v0.1.json').read_text())
with tempfile.TemporaryDirectory() as d:
 repo=Path(d);mod.ROOT=repo
 def git(*args):return subprocess.check_output(['git',*args],cwd=repo,text=True,stderr=subprocess.DEVNULL).strip()
 def write(path,text):
  p=repo/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
 def commit(message):
  git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m',message);return git('rev-parse','HEAD')
 git('init','-b','base')
 write('theory/existing.js','base');base=commit('base')
 git('checkout','-b','pr')
 write('theory/existing.js','repaired');head=commit('candidate repair')
 git('checkout','base')
 write('games-beyond/crewbound-321/index.html','<html>main-only donor</html>');main=commit('unrelated current main body')
 git('checkout','-b','merge')
 git('-c','user.name=Test','-c','user.email=test@example.invalid','merge','pr','--no-ff','-m','synthetic merge')
 merge=git('rev-parse','HEAD')
 def signals(ref):
  rows=mod.parse_diff(base,ref)
  def exists(path):return subprocess.run(['git','cat-file','-e',base+':'+path],cwd=repo,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
  return mod.classify_added_paths([p for s,p in rows if s=='A'],policy,exists)
 old=signals(merge);fixed=signals(head)
 assert old and old[0]['new_boundary']=='games-beyond/crewbound-321'
 assert fixed==[]
 print(json.dumps({'synthetic_merge_false_signals':old,'explicit_pr_head_signals':fixed,'main_only_body_still_subject_to_gate_in_its_own_pr':signals(main)},indent=2))

