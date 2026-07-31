#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
from typing import Any

def stable(v:Any)->str:return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v:Any)->str:
 t=v if isinstance(v,str) else stable(v);return hashlib.sha256(t.encode()).hexdigest()
def write_json(path:Path,v:Any)->None:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(v,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")
def write(path:Path,text:str)->None:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding="utf-8")

def build(semantic_root:Path,qemu_root:Path,container_root:Path,bootable_root:Path,out:Path)->dict[str,Any]:
 semantic=json.loads((semantic_root/"SEMANTIC_DEPTH_MANIFEST.json").read_text())
 qemu=json.loads((qemu_root/"QEMU_100_BODY_KERNEL_MANIFEST.json").read_text())
 container=json.loads((container_root/"ONECONTAINER_MANIFEST.json").read_text())
 registry=json.loads((container_root/"REGISTRY.json").read_text())
 bootable=json.loads((bootable_root/"BOOTABLE_ONECONTAINER_RECEIPT.json").read_text())
 if semantic.get("body_count")!=100 or not semantic.get("all_capabilities_executed") or not semantic.get("all_isolated_processes_passed"):raise ValueError("semantic-depth pass required")
 if qemu.get("body_count")!=100 or not qemu.get("all_qemu_passed"):raise ValueError("100 QEMU machine pass required")
 if container.get("body_count")!=100 or not container.get("all_selection_passed") or not container.get("all_handoffs_preserve_identity"):raise ValueError("OneContainer selection/handoff pass required")
 if bootable.get("body_count")!=100 or bootable.get("menu_entry_count")!=100 or bootable.get("status")!="BOOTABLE_ONECONTAINER_ISO_DEFAULT_MACHINE_PASS_ALL_100_ENTRIES_STATICALLY_VALIDATED":raise ValueError("bootable OneContainer ISO pass required")
 s={item["body_id"]:item for item in semantic["receipts"]};q={item["body_id"]:item for item in qemu["receipts"]};c={item["body_id"]:item for item in registry["bodies"]}
 if set(s)!=set(q) or set(s)!=set(c) or len(s)!=100:raise ValueError("body census mismatch across completion layers")
 bodies=[]
 for body_id in sorted(s):
  sr,qr,cr=s[body_id],q[body_id],c[body_id]
  if sr["semantic_signature"]!=qr["semantic_signature"] or qr["semantic_signature"]!=cr["semantic_signature"]:raise ValueError(f"{body_id}: semantic signature mismatch")
  bodies.append({"body_id":body_id,"semantic_signature":sr["semantic_signature"],"kernel_sha256":qr["kernel_sha256"],"compiler_namespace":qr["compiler_namespace"],"earned":["REGISTERED_IDENTITY","CURRENT_CANON_BODY_SOURCE","BODY_SPECIFIC_SEMANTICS_ALL_DECLARED_CAPABILITIES","ISOLATED_PROCESS_RUNTIME","FAULT_HOLD_AND_RECOVERY","SEPARATE_QEMU_KERNEL_BOOT","BODY_OPERATION_AND_POST_RECOVERY_CONTINUATION","ONECONTAINER_EXACT_SELECTION","IDENTITY_PRESERVING_HANDOFF_PARTICIPATION","MEMBERSHIP_IN_SINGLE_BOOTABLE_ONECONTAINER_ISO"],"open_external_or_authority_gates":["EXACT_HISTORICAL_OR_AUTHORITATIVE_NATIVE_SOURCE_CONFORMANCE","BODY_IMPLEMENTED_INDEPENDENT_TOOLCHAIN_NOT_SHARED_PYTHON_GCC_CARRIER","SELF_HOSTING_OR_ROLE_EQUIVALENT","REAL_DEVICE_SENSOR_SPEECH_GESTURE_OR_ANDROID_PROOF_AS_APPLICABLE","PRODUCTION_APPLICATION_OR_GAME_AUTHORED_PRIMARILY_THROUGH_THIS_BODY","AUTOMATED_GRUB_BOOT_SELECTION_FOR_ALL_100_AND_SIMULTANEOUS_MULTI_KERNEL_FEDERATION","FINAL_BODY_SPECIFIC_FREEZE_CROWN"]})
 frozen_core={"schema":"jm.everybody-current-scope-freeze/1.1","body_count":100,"status":"CURRENT_CONSTRUCTIBLE_SCOPE_FROZEN_EXTERNAL_AUTHORITY_GATES_OPEN","semantic_manifest_sha256":sha(semantic),"qemu_manifest_sha256":sha(qemu),"onecontainer_manifest_sha256":sha(container),"onecontainer_tar_sha256":container["container_tar_sha256"],"bootable_onecontainer_receipt_sha256":sha(bootable),"bootable_onecontainer_iso_sha256":bootable["iso_sha256"],"unique_semantic_signatures":len({x['semantic_signature'] for x in bodies}),"unique_kernel_hashes":len({x['kernel_sha256'] for x in bodies}),"unique_compiler_namespaces":len({x['compiler_namespace'] for x in bodies}),"all_current_constructible_gates_passed":True,"final_crown":False,"stop_boundary":"The repository can construct, execute, boot, recover, select, hand off and package all 100 current-canon bodies inside one bootable ISO. It cannot honestly manufacture unrecovered historical native authority, body-authored self-hosting, all-entry GRUB automation, simultaneous federation, real hardware/device contact or production-use evidence from registry summaries alone.","bodies":bodies}
 frozen_core["freeze_sha256"]=sha(frozen_core);write_json(out/"CURRENT_SCOPE_FREEZE_RECEIPT.json",frozen_core)
 lines=["# JM 100 Bodies — Current Constructible Scope Freeze v1.1","","Status: **CURRENT CONSTRUCTIBLE SCOPE FROZEN — FINAL CROWN NOT CLAIMED**","","> All 100 current-canon bodies now execute body-specific semantics, run in isolated processes, boot as separate QEMU kernels, reject invalid action, recover, continue, enter OneContainer through exact hash-checked selection and identity-preserving handoff, and reside together inside one bootable GRUB ISO.","","## Earned across all 100","","- registered identity and law;","- current-canon body source, AST and specialist IR;","- every declared capability executed with body-specific consequence;","- isolated runtime process;","- held fault and recovery route;","- separate QEMU kernel image and machine trace;","- body operation and post-recovery continuation;","- OneContainer selection by exact body ID and kernel hash;","- participation in the 99-link identity-preserving handoff chain;","- membership in one bootable OneContainer ISO with 100 validated GRUB entries.","","## Honest completion wall","","The remaining gates cannot be inferred or fabricated from registry summaries:","","1. exact historical or newly authorised native source and conformance per body;","2. a toolchain materially authored through that body rather than the shared Python/GCC carrier;","3. self-hosting or a role-appropriate equivalent;","4. real device, sensor, speech, gesture, Android or other physical proof where applicable;","5. a substantial app, tool or game authored primarily through each body;","6. automated GRUB machine selection of all 100 entries and simultaneous multi-kernel federation;","7. final body-specific freeze and crown.","","## Governing boundary","",frozen_core["stop_boundary"],"",f"Freeze SHA-256: `{frozen_core['freeze_sha256']}`","","> No fake finish. No denied achievement. The current constructible route is complete; authority, hardware and sustained-use gates remain open."]
 write(out/"COMPLETION_BOUNDARY.md","\n".join(lines)+"\n");return frozen_core

def main()->int:
 p=argparse.ArgumentParser();p.add_argument("--semantic-root",type=Path,required=True);p.add_argument("--qemu-root",type=Path,required=True);p.add_argument("--container-root",type=Path,required=True);p.add_argument("--bootable-root",type=Path,required=True);p.add_argument("--out",type=Path,required=True);a=p.parse_args();m=build(a.semantic_root.resolve(),a.qemu_root.resolve(),a.container_root.resolve(),a.bootable_root.resolve(),a.out.resolve());print(stable({"status":m["status"],"freeze_sha256":m["freeze_sha256"]}));return 0
if __name__=="__main__":raise SystemExit(main())
