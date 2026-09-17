#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil,tarfile
from pathlib import Path
from typing import Any

def stable(v:Any)->str:return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v:Any)->str:
 t=v if isinstance(v,str) else stable(v);return hashlib.sha256(t.encode()).hexdigest()
def write_json(path:Path,v:Any)->None:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(v,ensure_ascii=False,indent=2,sort_keys=True)+"\n")
def file_sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()

def deterministic_tar(source:Path,target:Path)->None:
 with tarfile.open(target,"w") as archive:
  for path in sorted(source.rglob("*"),key=lambda p:p.as_posix()):
   rel=path.relative_to(source);info=archive.gettarinfo(str(path),arcname=str(Path("JM_EVERYKERNEL_ONECONTAINER")/rel));info.mtime=0;info.uid=0;info.gid=0;info.uname="";info.gname=""
   if path.is_file():
    with path.open("rb") as handle:archive.addfile(info,handle)
   else:archive.addfile(info)

def selector_text()->str:
 return '''#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument("--root",type=Path,required=True);p.add_argument("--body",required=True);a=p.parse_args();r=json.loads((a.root/"REGISTRY.json").read_text());item=next((x for x in r["bodies"] if x["body_id"]==a.body),None)
if not item:raise SystemExit(2)
k=a.root/item["kernel_path"]
if hashlib.sha256(k.read_bytes()).hexdigest()!=item["kernel_sha256"]:raise SystemExit(3)
print(json.dumps(item,sort_keys=True))
'''

def build(qemu_root:Path,out:Path)->dict[str,Any]:
 if out.exists():shutil.rmtree(out)
 qemu=json.loads((qemu_root/"QEMU_100_BODY_KERNEL_MANIFEST.json").read_text())
 if qemu.get("body_count")!=100 or not qemu.get("all_qemu_passed"):raise ValueError("100-body QEMU pass required")
 bodies=[]
 for receipt in sorted(qemu["receipts"],key=lambda x:x["body_id"]):
  body_id=receipt["body_id"];src=qemu_root/body_id;dst=out/"kernels"/body_id;dst.mkdir(parents=True,exist_ok=True)
  for name in ("kernel.elf","semantic-profile.json","MACHINE_RECEIPT.json","qemu.log"):shutil.copy2(src/name,dst/name)
  bodies.append({"body_id":body_id,"namespace":receipt["namespace"],"semantic_signature":receipt["semantic_signature"],"compiler_namespace":receipt["compiler_namespace"],"kernel_path":f"kernels/{body_id}/kernel.elf","kernel_sha256":receipt["kernel_sha256"],"machine_status":receipt["status"]})
 handoffs=[]
 for left,right in zip(bodies,bodies[1:]):
  token=sha({"from":left["semantic_signature"],"to":right["semantic_signature"],"left_kernel":left["kernel_sha256"],"right_kernel":right["kernel_sha256"]})
  handoffs.append({"from":left["body_id"],"to":right["body_id"],"token":token,"identity_preserved":left["body_id"]!=right["body_id"]})
 registry={"schema":"jm.everykernel-onecontainer-registry/0.4","body_count":len(bodies),"bodies":bodies,"selection_law":"select a sovereign kernel by exact body ID and verify its frozen hash before launch"}
 write_json(out/"REGISTRY.json",registry);write_json(out/"HANDOFFS.json",{"count":len(handoffs),"handoffs":handoffs});(out/"select.py").write_text(selector_text(),encoding="utf-8")
 selections=[]
 for item in bodies:
  selected=next(x for x in registry["bodies"] if x["body_id"]==item["body_id"]);kernel=out/selected["kernel_path"]
  if file_sha(kernel)!=selected["kernel_sha256"]:raise ValueError(f"selection hash mismatch {item['body_id']}")
  selections.append({"body_id":item["body_id"],"selected_kernel_sha256":selected["kernel_sha256"],"pass":True})
 package=out.parent/"JM_EVERYKERNEL_ONECONTAINER_v0.4.0.tar";deterministic_tar(out,package)
 manifest={"schema":"jm.everykernel-onecontainer-manifest/0.4","body_count":100,"status":"ONECONTAINER_100_SELECTION_AND_HANDOFF_PASS_NOT_SINGLE_BOOT_IMAGE_CROWN","unique_kernel_hashes":len({x['kernel_sha256'] for x in bodies}),"unique_namespaces":len({x['namespace'] for x in bodies}),"selection_count":len(selections),"handoff_count":len(handoffs),"all_selection_passed":all(x["pass"] for x in selections),"all_handoffs_preserve_identity":all(x["identity_preserved"] for x in handoffs),"container_tar":package.name,"container_tar_sha256":file_sha(package),"selections":selections,"claim_boundary":"One recoverable package registers and selects 100 separately QEMU-proven kernels and proves identity-preserving handoffs. It is not yet one bootable multi-kernel image, simultaneous federation, exact native self-hosting or final crown."}
 write_json(out/"ONECONTAINER_MANIFEST.json",manifest);return manifest

def main()->int:
 p=argparse.ArgumentParser();p.add_argument("--qemu-root",type=Path,required=True);p.add_argument("--out",type=Path,required=True);a=p.parse_args();m=build(a.qemu_root.resolve(),a.out.resolve());print(stable({"status":m["status"],"body_count":m["body_count"]}));return 0
if __name__=="__main__":raise SystemExit(main())
