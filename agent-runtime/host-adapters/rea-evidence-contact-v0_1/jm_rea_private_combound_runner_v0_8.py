#!/usr/bin/env python3
"""Local-only REA 6.1+ contact for an exact protected COMBOUND HTML.
Stages inline JS into a disposable directory, executes the REAL local REA CLI
and REA's own evidence-import, writes only a compact JM graph receipt.
NEVER uploads, commits, archives or prints game source. REA not bundled.
"""
import argparse, hashlib, json, pathlib, shutil, subprocess, tempfile
from html.parser import HTMLParser

EXPECTED="53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428"
def sha(data):return hashlib.sha256(data).hexdigest()
def hold(ok,code):
 if not ok:raise RuntimeError("JM_REA_PRIVATE_HOLD:"+code)
class InlineScripts(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=False)
  self.inside=False
  self.scripts=[]
 def handle_starttag(self,tag,attrs):
  if tag=="script":
   self.inside=not any(k=="src" for k,_ in attrs)
   if self.inside:self.scripts.append("")
 def handle_endtag(self,tag):
  if tag=="script":self.inside=False
 def handle_data(self,data):
  if self.inside:self.scripts[-1]+=data
def run(cmd,timeout=240):
 result=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                       encoding="utf8",timeout=timeout,check=False)
 hold(result.returncode==0,"REA_EXIT_"+str(result.returncode)+":"+
      result.stderr[-160:].replace("\n"," "))
 return result.stdout
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--protected",required=True,type=pathlib.Path)
 p.add_argument("--output",required=True,type=pathlib.Path)
 p.add_argument("--rea",default="rea")
 p.add_argument("--node",default="node")
 p.add_argument("--roots",default="releaseDrag,commitShot")
 p.add_argument("--module",default="combound_inline_000.js")
 args=p.parse_args()
 hold(args.protected.is_file() and args.output.is_absolute() and not args.output.exists(),
      "EXACT_SOURCE_AND_NEW_ABSOLUTE_RECEIPT_REQUIRED")
 body=args.protected.read_bytes()
 hold(sha(body)==EXPECTED,"NOT_PROTECTED_SOURCE_SHA")
 hold(shutil.which(args.rea) is not None,"REAL_REA_CLI_NOT_INSTALLED")
 hold(shutil.which(args.node) is not None,"NODE_REQUIRED")
 parser=InlineScripts();parser.feed(body.decode("utf8"))
 hold(len(parser.scripts)>0,"NO_INLINE_SOURCE")
 root=pathlib.Path(__file__).resolve().parent
 projector=root/"jm_rea_auto_relation_cli_v0_8.mjs"
 hold(projector.is_file(),"JM_PROJECTOR_ABSENT")
 with tempfile.TemporaryDirectory(prefix="jm-combound-rea-") as temporary:
  stage=pathlib.Path(temporary)
  scripts=stage/"scripts";scripts.mkdir()
  manifest=[]
  for i,code in enumerate(parser.scripts):
   name=f"combound_inline_{i:03d}.js"
   data=code.encode("utf8")
   (scripts/name).write_bytes(data)
   manifest.append({"module":name,"sha256":sha(data),"bytes":len(data)})
  record=json.loads(run([args.rea,"analyze-javascript-application",str(scripts),"--json"]))
  hold(record.get("evidence_id","").startswith("ev_"),"NOT_GENUINE_REA_EVIDENCE")
  hold(record.get("provider",{}).get("id"),"NO_REA_PROVIDER")
  subject=record["subject"]
  bundle={"artifacts":[{"digest":subject["digest"],"format":subject["format"],
            "architecture":subject["architecture"]}],
          "providers":[record["provider"]],
          "environments":[record["environment"]] if record.get("environment") else [],
          "scenarios":[],"captures":[],"unknowns":[],"records":[record]}
  evidence=stage/"REA_Evidence.json";evidence.write_text(json.dumps(record))
  bundle_path=stage/"REA_Bundle.json";bundle_path.write_text(json.dumps(bundle))
  run([args.rea,"evidence-import",str(bundle_path)])
  generated=stage/"JM_Projected_Contact.json"
  run([args.node,str(projector),"--rea",str(evidence),"--module",args.module,
       "--roots",args.roots,"--source",str(args.protected.resolve()),
       "--output",str(generated)])
  projection=json.loads(generated.read_text())
  report={"schema":"JM.REA.COMBOUND.PrivateRealREAContact/0.8",
          "original_sha256":EXPECTED,"original_body_changed":False,
          "staged_inline_modules":len(manifest),
          "staged_module_digests":manifest,
          "rea_evidence_import_pass":True,
          "projected_jm_graph":projection,
          "boundary":"REAL_REA_INSPECTED_TEMPORARY_EXTRACTED_JS__NOT_BINARY_DECOMPILATION_OR_OWNER_DEVICE"}
  hold(sha(args.protected.read_bytes())==EXPECTED,"PROTECTED_BODY_MUTATED")
  with args.output.open("x",encoding="utf8") as f:json.dump(report,f,indent=2)
  print("JM_V08_REAL_PRIVATE_REA_PASS:",len(manifest),"staged script modules;",
       projection["selected_census"]["nodes"],"JM nodes,",
       projection["selected_census"]["edges"],"static edges")
if __name__=="__main__":main()
