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
 lines=[
  "set timeout=0",
  f"set default={default_body}",
  "set pager=1",
  "insmod multiboot",
  "insmod fat",
  "insmod search_fs_file",
  "search --no-floppy --file --set=jm_selector_root /jm-select.cfg",
  "if [ -n \"$jm_selector_root\" ]; then",
  "  source ($jm_selector_root)/jm-select.cfg",
  "fi",
  "",
 ]
 for item in bodies:
  body_id=str(item["body_id"]).replace("'","_")
  lines += [f"menuentry 'JM Sovereign Body — {body_id}' --id '{body_id}' {{",f"  multiboot /boot/jm-kernels/{body_id}.elf", "  boot", "}", ""]
 return "\n".join(lines)

def make_selector_image(out:Path)->Path:
 image=out/"JM_ONECONTAINER_SELECTOR.img"
 create=run(["dd","if=/dev/zero",f"of={image}","bs=1M","count=2","status=none"],out)
 if create.returncode:raise ValueError(f"selector image allocation failed: {create.stderr}")
 fmt=run(["mkfs.vfat",str(image)],out)
 if fmt.returncode:raise ValueError(f"selector image format failed: {fmt.stderr}")
 return image

def set_selector(image:Path,out:Path,body_id:str)->None:
 cfg=out/"jm-select.cfg";write(cfg,f"set default={body_id}\n")
 copied=run(["mcopy","-o","-i",str(image),str(cfg),"::jm-select.cfg"],out)
 if copied.returncode:raise ValueError(f"selector write failed for {body_id}: {copied.stderr}")

def boot_selection(iso:Path,selector:Path,out:Path,item:dict[str,Any])->dict[str,Any]:
 body_id=item["body_id"];set_selector(selector,out,body_id)
 result=run(["qemu-system-i386","-cdrom",str(iso),"-drive",f"file={selector},format=raw,if=ide","-boot","d","-display","none","-serial","stdio","-monitor","none","-no-reboot","-device","isa-debug-exit,iobase=0xf4,iosize=0x04"],out,40)
 log=result.stdout+result.stderr;log_path=out/"selection-logs"/f"{body_id}.log";write(log_path,log)
 required=[f"JM_BODY_BOOT:{body_id}",f"JM_COMPILER_NS:{item['compiler_namespace']}","JM_PERMISSIONGATE_REJECT","JM_FAULTHOLD:INVALID_ACTION","JM_RECOVERYBODY_RESTORE","JM_POST_RECOVERY_CONTINUE","JM_MACHINE_DING:PASS"]
 missing=[mark for mark in required if mark not in log]
 if missing:raise ValueError(f"ISO selection {body_id} missing {missing}; rc={result.returncode}; log={log}")
 return {"body_id":body_id,"menu_id":body_id,"qemu_exit_code":result.returncode,"qemu_log_sha256":sha_text(log),"kernel_sha256":item["kernel_sha256"],"status":"GRUB_ISO_MACHINE_SELECTION_PASS"}

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
  copied.append({"body_id":item["body_id"],"kernel_sha256":item["kernel_sha256"],"compiler_namespace":item["compiler_namespace"],"iso_path":f"/boot/jm-kernels/{item['body_id']}.elf"})
 config=grub_config(bodies);write(iso_root/"boot/grub/grub.cfg",config)
 if config.count("menuentry '")!=100:raise ValueError("GRUB menu count mismatch")
 iso=out/"JM_EVERYKERNEL_ONECONTAINER_v0.5.1.iso";mk=run(["grub-mkrescue","-o",str(iso),str(iso_root)],out,180)
 if mk.returncode:raise ValueError(f"grub-mkrescue failed: {mk.stderr or mk.stdout}")
 selections=[];selector_sha=None
 if run_qemu:
  selector=make_selector_image(out)
  for item in copied:selections.append(boot_selection(iso,selector,out,item))
  selector_sha=file_sha(selector)
 receipt={"schema":"jm.bootable-onecontainer-iso/0.5.1","status":"BOOTABLE_ONECONTAINER_ISO_ALL_100_MENU_MACHINE_SELECTIONS_PASS" if run_qemu else "BOOTABLE_ONECONTAINER_ISO_BUILD_PASS_ALL_MENU_BOOTS_OPEN","body_count":100,"menu_entry_count":100,"default_body":"cading","machine_selection_count":len(selections),"all_menu_entries_machine_booted":run_qemu and len(selections)==100 and all(x["status"]=="GRUB_ISO_MACHINE_SELECTION_PASS" for x in selections),"all_kernel_hashes_verified":True,"all_kernels_multiboot_validated":True,"iso_path":iso.name,"iso_sha256":file_sha(iso),"selector_image_sha256":selector_sha,"grub_config_sha256":sha_text(config),"kernels":copied,"machine_selections":selections,"claim_boundary":"One unchanged ISO contains all 100 separately proven kernels. A writable selector disk drove GRUB to every menu ID, and all 100 entries machine-booted to their matching body identity, compiler namespace, fault, recovery, continuation and Ding. Simultaneous multi-kernel execution is not claimed."}
 if run_qemu and not receipt["all_menu_entries_machine_booted"]:raise ValueError("not all ISO menu entries machine-booted")
 write_json(out/"BOOTABLE_ONECONTAINER_RECEIPT.json",receipt);return receipt

def main()->int:
 p=argparse.ArgumentParser();p.add_argument("--onecontainer-root",type=Path,required=True);p.add_argument("--out",type=Path,required=True);p.add_argument("--build-only",action="store_true");a=p.parse_args();r=build(a.onecontainer_root.resolve(),a.out.resolve(),not a.build_only);print(stable({"status":r["status"],"iso_sha256":r["iso_sha256"],"machine_selection_count":r["machine_selection_count"]}));return 0
if __name__=="__main__":raise SystemExit(main())
