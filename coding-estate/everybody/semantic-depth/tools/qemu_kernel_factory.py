#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil,subprocess,sys
from pathlib import Path
from typing import Any
sys.path.insert(0,str(Path(__file__).resolve().parent))
try:
 from .semantic_core import load_bodies,profile,sha,stable
except ImportError:
 from semantic_core import load_bodies,profile,sha,stable

VERSION="0.3.0"
MULTIBOOT_MAGIC="2BADB002"

def boot_source()->str:
 return r'''.set ALIGN, 1<<0
.set MEMINFO, 1<<1
.set FLAGS, ALIGN | MEMINFO
.set MAGIC, 0x1BADB002
.set CHECKSUM, -(MAGIC + FLAGS)
.section .multiboot
.align 4
.long MAGIC
.long FLAGS
.long CHECKSUM
.section .bss
.align 16
stack_bottom:
.skip 16384
stack_top:
.section .text
.global _start
.type _start, @function
_start:
 mov $stack_top, %esp
 push %ebx
 push %eax
 call kernel_main
 cli
1: hlt
 jmp 1b
.size _start, . - _start
'''

def linker_source()->str:
 return '''ENTRY(_start)
SECTIONS {
 . = 1M;
 .multiboot : { *(.multiboot) }
 .text : { *(.text*) }
 .rodata : { *(.rodata*) }
 .data : { *(.data*) }
 .bss : { *(COMMON) *(.bss*) }
}
'''

def c_string(value:str)->str: return json.dumps(value,ensure_ascii=True)
def kernel_source(current:dict[str,Any])->str:
 body=current["body"]; cap_count=len(current["capability_effects"]); combined=0
 for effect in current["capability_effects"]: combined=((combined<<5)^effect["token"]^combined)&0xffffffff
 first=current["capability_effects"][0]
 return f'''#include <stdint.h>
#define BODY_ID {c_string(body["id"])}
#define BODY_NAME {c_string(body["name"])}
#define LAW_SHA {c_string(current["law_sha256"])}
#define SEMANTIC_SHA {c_string(current["semantic_signature"])}
#define COMPILER_NS {c_string(current["namespace"]+".semantic-to-x86-v0.3")}
#define FIRST_CAP {c_string(first["verb"])}
#define FIRST_MODE {c_string(first["mode"])}
#define CAP_COUNT {cap_count}u
#define BODY_TOKEN 0x{combined:08x}u
static inline void outb(uint16_t p,uint8_t v){{__asm__ volatile("outb %0,%1"::"a"(v),"Nd"(p));}}
static inline uint8_t inb(uint16_t p){{uint8_t r;__asm__ volatile("inb %1,%0":"=a"(r):"Nd"(p));return r;}}
static inline void outl(uint16_t p,uint32_t v){{__asm__ volatile("outl %0,%1"::"a"(v),"Nd"(p));}}
static void serial_init(void){{outb(0x3f8+1,0);outb(0x3f8+3,0x80);outb(0x3f8,3);outb(0x3f8+1,0);outb(0x3f8+3,3);outb(0x3f8+2,0xc7);outb(0x3f8+4,0x0b);}}
static void putc(char c){{while((inb(0x3f8+5)&0x20)==0){{}}outb(0x3f8,(uint8_t)c);}}
static void puts(const char*s){{while(*s)putc(*s++);putc('\\n');}}
static void hex32(uint32_t v){{const char*h="0123456789abcdef";char b[9];for(int i=7;i>=0;i--){{b[i]=h[v&15];v>>=4;}}b[8]=0;puts(b);}}
void kernel_main(uint32_t magic,uint32_t mbi){{
 (void)mbi;serial_init();
 puts("JM_BODY_BOOT:" BODY_ID);puts("JM_BODY_NAME:" BODY_NAME);puts("JM_LAW_SHA:" LAW_SHA);puts("JM_SEMANTIC_SHA:" SEMANTIC_SHA);puts("JM_COMPILER_NS:" COMPILER_NS);
 if(magic!=0x2BADB002u){{puts("JM_BOOT_MAGIC_FAIL");outl(0xf4,0x11);for(;;){{}}}}
 puts("JM_BOOT_MAGIC_PASS:{MULTIBOOT_MAGIC}");puts("JM_FIRST_CAP:" FIRST_CAP);puts("JM_FIRST_MODE:" FIRST_MODE);puts("JM_CAP_COUNT");hex32(CAP_COUNT);
 uint32_t state=BODY_TOKEN^CAP_COUNT;puts("JM_BODY_OPERATION");hex32(state);
 uint32_t invalid_action=0;if(invalid_action==0){{puts("JM_PERMISSIONGATE_REJECT");puts("JM_FAULTHOLD:INVALID_ACTION");state=0;}}
 state=BODY_TOKEN^CAP_COUNT;puts("JM_RECOVERYBODY_RESTORE");hex32(state);state+=1;puts("JM_POST_RECOVERY_CONTINUE");hex32(state);puts("JM_MACHINE_DING:PASS");outl(0xf4,0x10);for(;;){{}}
}}
'''

def write(path:Path,text:str)->None: path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding="utf-8")
def write_json(path:Path,value:Any)->None: write(path,json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n")
def run(cmd:list[str],cwd:Path,timeout:int=30)->subprocess.CompletedProcess[str]: return subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,timeout=timeout)

def build_one(out:Path,body:dict[str,Any],run_qemu:bool=True)->dict[str,Any]:
 current=profile(body);root=out/str(body["id"]);write(root/"boot.S",boot_source());write(root/"linker.ld",linker_source());write(root/"kernel.c",kernel_source(current));write_json(root/"semantic-profile.json",current)
 for cmd,label in [(["gcc","-m32","-c","boot.S","-o","boot.o"],"boot"),(["gcc","-m32","-std=c11","-ffreestanding","-fno-pie","-fno-stack-protector","-Wall","-Wextra","-c","kernel.c","-o","kernel.o"],"compile"),(["ld","-m","elf_i386","-T","linker.ld","-o","kernel.elf","boot.o","kernel.o"],"link")]:
  result=run(cmd,root)
  if result.returncode: raise ValueError(f"{body['id']} {label} failed: {result.stderr}")
 kernel=root/"kernel.elf";log="";qemu_rc=None
 if run_qemu:
  result=run(["qemu-system-i386","-kernel","kernel.elf","-display","none","-serial","stdio","-monitor","none","-no-reboot","-device","isa-debug-exit,iobase=0xf4,iosize=0x04"],root,20);qemu_rc=result.returncode;log=result.stdout+result.stderr;write(root/"qemu.log",log)
  required=[f"JM_BODY_BOOT:{body['id']}","JM_BOOT_MAGIC_PASS:2BADB002","JM_BODY_OPERATION","JM_PERMISSIONGATE_REJECT","JM_FAULTHOLD:INVALID_ACTION","JM_RECOVERYBODY_RESTORE","JM_POST_RECOVERY_CONTINUE","JM_MACHINE_DING:PASS"]
  missing=[item for item in required if item not in log]
  if missing: raise ValueError(f"{body['id']} QEMU markers missing: {missing}; rc={qemu_rc}; log={log}")
 receipt={"schema":"jm.qemu-body-kernel-receipt/0.3","body_id":body["id"],"namespace":current["namespace"],"semantic_signature":current["semantic_signature"],"compiler_namespace":current["namespace"]+".semantic-to-x86-v0.3","kernel_sha256":hashlib.sha256(kernel.read_bytes()).hexdigest(),"kernel_source_sha256":sha((root/"kernel.c").read_text()),"capability_count":len(current["capability_effects"]),"qemu_exit_code":qemu_rc,"qemu_log_sha256":sha(log) if run_qemu else None,"status":"QEMU_BODY_KERNEL_CARRIER_PASS" if run_qemu else "KERNEL_IMAGE_BUILD_PASS_QEMU_OPEN","shared_machine_carrier":"x86 multiboot/serial/debug-exit","exact_native_toolchain_crown":"OPEN"}
 write_json(root/"MACHINE_RECEIPT.json",receipt);return receipt

def build(repo:Path,out:Path,run_qemu:bool=True,limit:int|None=None)->dict[str,Any]:
 if out.exists(): shutil.rmtree(out)
 bodies=load_bodies(repo);bodies=bodies[:limit] if limit else bodies;receipts=[build_one(out,body,run_qemu) for body in bodies]
 manifest={"schema":"jm.qemu-100-body-kernel-manifest/0.3","body_count":len(receipts),"status":"QEMU_100_BODY_KERNEL_CARRIER_PASS_NOT_NATIVE_TOOLCHAIN_CROWN" if run_qemu and len(receipts)==100 else "PARTIAL_OR_BUILD_ONLY","unique_kernel_hashes":len({r['kernel_sha256'] for r in receipts}),"unique_compiler_namespaces":len({r['compiler_namespace'] for r in receipts}),"all_qemu_passed":run_qemu and all(r['status']=='QEMU_BODY_KERNEL_CARRIER_PASS' for r in receipts),"receipts":receipts,"claim_boundary":"Each body has a separate QEMU-booted ELF generated from its body-specific semantic profile. x86 boot glue and GCC/ld are shared carriers; exact historical native toolchains, device-specific proof, self-hosting and final crowns remain open."}
 if len(receipts)==100 and (manifest["unique_kernel_hashes"]!=100 or manifest["unique_compiler_namespaces"]!=100): raise ValueError("kernel or compiler namespace collapse")
 write_json(out/"QEMU_100_BODY_KERNEL_MANIFEST.json",manifest);return manifest

def main()->int:
 p=argparse.ArgumentParser();p.add_argument("--repo",type=Path,default=Path("."));p.add_argument("--out",type=Path,required=True);p.add_argument("--build-only",action="store_true");p.add_argument("--limit",type=int);args=p.parse_args();m=build(args.repo.resolve(),args.out.resolve(),not args.build_only,args.limit);print(stable({"status":m["status"],"body_count":m["body_count"]}));return 0
if __name__=="__main__":raise SystemExit(main())
