#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
from typing import Any

def stable(v:Any)->str:return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha_text(v:Any)->str:
 t=v if isinstance(v,str) else stable(v);return hashlib.sha256(t.encode()).hexdigest()
def file_sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path:Path,text:str)->None:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding="utf-8")
def write_json(path:Path,value:Any)->None:write(path,json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n")
def run(cmd:list[str],cwd:Path,timeout:int=60)->subprocess.CompletedProcess[str]:return subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,timeout=timeout)

def grub_config(bodies:list[dict[str,Any]],default_body:str="cading")->str:
 ids=[x["body_id"] for x in bodies]
 if default_body not in ids:raise ValueError(f"default body absent: {default_body}")
 lines=["set timeout=1",f"set default={ids.index(default_body)}","set pager=1","insmod multiboot",""]
 for item in bodies:
  title=str(item["body_id"]).replace("'","_")
  lines += [f"menuentry 'JM Sovereign Body — {title}' --id '{title}' {{",f"  multiboot /boot/jm-kernels/{title}.elf", "  boot", "}", ""]
 return "\n".join(lines)

def build(onecontainer_root:Path,out:Path,run_qemu:bool=True)->dict[str,Any]:
 registry=json.loads((onecontainer_root/"REGISTRY.json").read_text())
 container=json.loads((onecontainer_root/"ONECONTAINER_MANIFEST.json").read_text())
 bodies=sorted(registry["bodies"],key=lambda x:x["body_id"])
 if len(bodies)!=100 or container.get("body_count")!=100 or not container.get("all_selection_passed"):raise ValueError("OneContainer 100 selection pass required")
 if out.exists():shutil.rmtree(out)
 iso_root=out/"iso-root";kernel_dir=iso_root/"boot/jm-kernels";kernel_dir.mkdir(parents=True,exist_ok=True)
 copied=[]
 for item in bodies:
  source=onecontainer_root/item["kernel_path"];target=kernel_dir/f"{item['body_id']}.elf";shutil.copy2(source,target)
  if file_sha(target)!=item["kernel_sha256"]:raise ValueError(f"{item['body_id']}: copied kernel hash mismatch")
  check=run(["grub-file","--is-x86-multiboot",str(target)],out)
  if check.returncode:raise ValueError(f"{item['body_id']}: not a multiboot kernel: {check.stderr}")
  copied.append({"body_id":item["body_id"],"kernel_sha256":item["kernel_sha256"],"iso_path":f"/boot/jm-kernels/{item['body_id']}.elf"})
 config=grub_config(bodies);write(iso_root/"boot/grub/grub.cfg",config)
 if config.count("menuentry '")!=100:raise ValueError("GRUB menu count mismatch")
 iso=out/"JM_EVERYKERNEL_ONECONTAINER_v0.5.0.iso";mk=run(["grub-mkrescue","-o",str(iso),str(iso_root)],out,180)
 if mk.returncode:raise ValueError(f"grub-mkrescue failed: {mk.stderr or mk.stdout}")
 log="";qemu_rc=None
 if run_qemu:
  result=run(["qemu-system-i386","-cdrom",str(iso),"-boot","d","-display","none","-serial","stdio","-monitor","none","-no-reboot","-device","isa-debug-exit,iobase=0xf4,iosize=0x04"],out,40);qemu_rc=result.returncode;log=result.stdout+result.stderr;write(out/"ONECONTAINER_ISO_QEMU.log",log)
  required=["JM_BODY_BOOT:cading","JM_COMPILER_NS:jm.body.cading.semantic-to-x86-v0.3","JM_PERMISSIONGATE_REJECT","JM_FAULTHOLD:INVALID_ACTION","JM_RECOVERYBODY_RESTORE","JM_POST_RECOVERY_CONTINUE","JM_MACHINE_DING:PASS"]
  missing=[item for item in required if item not in log]
  if missing:raise ValueError(f"bootable OneContainer default proof missing {missing}; rc={qemu_rc}; log={log}")
 receipt={"schema":"jm.bootable-onecontainer-iso/0.5","status":"BOOTABLE_ONECONTAINER_ISO_DEFAULT_MACHINE_PASS_ALL_100_ENTRIES_STATICALLY_VALIDATED" if run_qemu else "BOOTABLE_ONECONTAINER_ISO_BUILD_PASS_DEFAULT_BOOT_OPEN","body_count":100,"menu_entry_count":100,"default_body":"cading","all_kernel_hashes_verified":True,"all_kernels_multiboot_validated":True,"iso_path":iso.name,"iso_sha256":file_sha(iso),"grub_config_sha256":sha_text(config),"qemu_exit_code":qemu_rc,"qemu_log_sha256":sha_text(log) if run_qemu else None,"kernels":copied,"claim_boundary":"One ISO contains all 100 separately proven kernels and boots the Cading default through GRUB. Every kernel has direct QEMU proof outside the ISO and every menu target/hash is validated; this pass does not claim automated GRUB boot of all 100 menu entries or simultaneous multi-kernel execution."}
 write_json(out/"BOOTABLE_ONECONTAINER_RECEIPT.json",receipt);return receipt

def main()->int:
 p=argparse.ArgumentParser();p.add_argument("--onecontainer-root",type=Path,required=True);p.add_argument("--out",type=Path,required=True);p.add_argument("--build-only",action="store_true");a=p.parse_args();r=build(a.onecontainer_root.resolve(),a.out.resolve(),not a.build_only);print(stable({"status":r["status"],"iso_sha256":r["iso_sha256"]}));return 0
if __name__=="__main__":raise SystemExit(main())
