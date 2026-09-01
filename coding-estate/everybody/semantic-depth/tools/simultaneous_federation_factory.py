#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil,socket,struct,subprocess,time
from pathlib import Path
from typing import Any
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
try:
 from .semantic_core import load_bodies,profile,sha,stable
 from .qemu_kernel_factory import boot_source,linker_source
except ImportError:
 from semantic_core import load_bodies,profile,sha,stable
 from qemu_kernel_factory import boot_source,linker_source

VERSION="0.6.0"

def file_sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path:Path,text:str)->None:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding="utf-8")
def write_json(path:Path,value:Any)->None:write(path,json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n")
def run(cmd:list[str],cwd:Path,timeout:int=60)->subprocess.CompletedProcess[str]:return subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,timeout=timeout)
def token32(value:Any)->int:return int(sha(value)[:8],16)

def federation_source(current:dict[str,Any],incoming:int,outgoing:int,ordinal:int,total:int)->str:
 body=current["body"]
 return f'''#include <stdint.h>
#define BODY_ID {json.dumps(body["id"])}
#define SEMANTIC_SHA {json.dumps(current["semantic_signature"])}
#define COMPILER_NS {json.dumps(current["namespace"]+".semantic-to-x86-federation-v0.6")}
#define INCOMING_TOKEN 0x{incoming:08x}u
#define OUTGOING_TOKEN 0x{outgoing:08x}u
#define BODY_ORDINAL {ordinal}u
#define BODY_TOTAL {total}u
static inline void outb(uint16_t p,uint8_t v){{__asm__ volatile("outb %0,%1"::"a"(v),"Nd"(p));}}
static inline uint8_t inb(uint16_t p){{uint8_t r;__asm__ volatile("inb %1,%0":"=a"(r):"Nd"(p));return r;}}
static inline void outl(uint16_t p,uint32_t v){{__asm__ volatile("outl %0,%1"::"a"(v),"Nd"(p));}}
static void serial_init(void){{outb(0x3f9,0);outb(0x3fb,0x80);outb(0x3f8,3);outb(0x3f9,0);outb(0x3fb,3);outb(0x3fa,0xc7);outb(0x3fc,0x0b);}}
static void putc(char c){{while((inb(0x3fd)&0x20)==0){{}}outb(0x3f8,(uint8_t)c);}}
static void puts(const char*s){{while(*s)putc(*s++);putc('\\n');}}
static void hex32(uint32_t v){{const char*h="0123456789abcdef";char b[9];for(int i=7;i>=0;i--){{b[i]=h[v&15];v>>=4;}}b[8]=0;puts(b);}}
static uint8_t read_byte(void){{while((inb(0x3fd)&1)==0){{}}return inb(0x3f8);}}
static uint32_t read_u32(void){{uint32_t v=0;v|=(uint32_t)read_byte();v|=(uint32_t)read_byte()<<8;v|=(uint32_t)read_byte()<<16;v|=(uint32_t)read_byte()<<24;return v;}}
void kernel_main(uint32_t magic,uint32_t mbi){{
 (void)mbi;serial_init();puts("JM_FED_BOOT:" BODY_ID);puts("JM_FED_SEMANTIC:" SEMANTIC_SHA);puts("JM_FED_COMPILER_NS:" COMPILER_NS);
 if(magic!=0x2BADB002u){{puts("JM_FED_BOOT_MAGIC_FAIL");outl(0xf4,0x31);for(;;){{}}}}
 puts("JM_FED_READY:" BODY_ID);puts("JM_FED_ORDINAL");hex32(BODY_ORDINAL);puts("JM_FED_TOTAL");hex32(BODY_TOTAL);
 uint32_t received=read_u32();
 if(received!=INCOMING_TOKEN){{puts("JM_FED_PERMISSIONGATE_REJECT");puts("JM_FED_FAULTHOLD:TOKEN_MISMATCH");outl(0xf4,0x32);for(;;){{}}}}
 puts("JM_FED_ACCEPT:" BODY_ID);puts("JM_FED_IN_TOKEN");hex32(received);puts("JM_FED_OUT_TOKEN");hex32(OUTGOING_TOKEN);puts("JM_FED_RECOVERYBODY:ROUTE_CONTINUES");puts("JM_FED_MACHINE_DING:PASS");outl(0xf4,0x10);for(;;){{}}
}}
'''

def build_kernels(repo:Path,out:Path)->tuple[list[dict[str,Any]],list[int]]:
 bodies=load_bodies(repo);profiles=[profile(body) for body in bodies]
 links=[token32({"edge":"GENESIS","to":profiles[0]["semantic_signature"]})]
 for left,right in zip(profiles,profiles[1:]):links.append(token32({"from":left["semantic_signature"],"to":right["semantic_signature"]}))
 links.append(token32({"from":profiles[-1]["semantic_signature"],"edge":"TERMINUS"}))
 built=[]
 for index,(body,current) in enumerate(zip(bodies,profiles)):
  root=out/"kernels"/body["id"];write(root/"boot.S",boot_source());write(root/"linker.ld",linker_source());write(root/"kernel.c",federation_source(current,links[index],links[index+1],index+1,len(bodies)));write_json(root/"profile.json",current)
  commands=[(["gcc","-m32","-c","boot.S","-o","boot.o"],"boot"),(["gcc","-m32","-std=c11","-ffreestanding","-fno-pie","-fno-stack-protector","-Wall","-Wextra","-c","kernel.c","-o","kernel.o"],"compile"),(["ld","-m","elf_i386","-T","linker.ld","-o","kernel.elf","boot.o","kernel.o"],"link")]
  for cmd,label in commands:
   result=run(cmd,root)
   if result.returncode:raise ValueError(f"{body['id']} federation {label} failed: {result.stderr}")
  built.append({"body_id":body["id"],"semantic_signature":current["semantic_signature"],"compiler_namespace":current["namespace"]+".semantic-to-x86-federation-v0.6","kernel_path":str((root/"kernel.elf").relative_to(out)),"kernel_sha256":file_sha(root/"kernel.elf"),"incoming_token":f"{links[index]:08x}","outgoing_token":f"{links[index+1]:08x}","ordinal":index+1})
 return built,links

def connect_with_retry(port:int,timeout:float=15.0)->socket.socket:
 deadline=time.time()+timeout;last=None
 while time.time()<deadline:
  try:
   sock=socket.create_connection(("127.0.0.1",port),timeout=1);sock.settimeout(15);return sock
  except OSError as exc:last=exc;time.sleep(.05)
 raise TimeoutError(f"serial connection {port} unavailable: {last}")

def recv_until(sock:socket.socket,marker:bytes,initial:bytes=b"",timeout:float=20.0)->bytes:
 data=bytearray(initial);deadline=time.time()+timeout
 while marker not in data:
  if time.time()>deadline:raise TimeoutError(f"missing marker {marker!r}; got {bytes(data)!r}")
  chunk=sock.recv(4096)
  if not chunk:break
  data.extend(chunk)
 if marker not in data:raise ValueError(f"connection closed before {marker!r}; got {bytes(data)!r}")
 return bytes(data)

def run_federation(out:Path,built:list[dict[str,Any]],links:list[int],base_port:int)->dict[str,Any]:
 processes=[];sockets=[];buffers=[b"" for _ in built]
 try:
  for index,item in enumerate(built):
   port=base_port+index;kernel=out/item["kernel_path"]
   proc=subprocess.Popen(["qemu-system-i386","-kernel",str(kernel),"-m","8M","-display","none","-serial",f"tcp:127.0.0.1:{port},server=on,wait=on","-monitor","none","-no-reboot","-device","isa-debug-exit,iobase=0xf4,iosize=0x04"],cwd=out,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=False)
   processes.append(proc)
  for index in range(len(built)):sockets.append(connect_with_retry(base_port+index))
  for index,(sock,item) in enumerate(zip(sockets,built)):
   buffers[index]=recv_until(sock,f"JM_FED_READY:{item['body_id']}".encode())
  ready_count=len(built)
  transitions=[];current=links[0]
  for index,(sock,item) in enumerate(zip(sockets,built)):
   if current!=int(item["incoming_token"],16):raise ValueError(f"{item['body_id']}: incoming chain mismatch")
   sock.sendall(struct.pack("<I",current))
   data=recv_until(sock,b"JM_FED_MACHINE_DING:PASS",buffers[index]);text=data.decode("utf-8","replace");buffers[index]=data
   required=[f"JM_FED_ACCEPT:{item['body_id']}","JM_FED_RECOVERYBODY:ROUTE_CONTINUES","JM_FED_MACHINE_DING:PASS",item["outgoing_token"]]
   missing=[mark for mark in required if mark not in text]
   if missing:raise ValueError(f"{item['body_id']}: federation markers missing {missing}; log={text}")
   write(out/"logs"/f"{item['body_id']}.log",text)
   transitions.append({"from":"GENESIS" if index==0 else built[index-1]["body_id"],"to":item["body_id"],"incoming_token":f"{current:08x}","outgoing_token":item["outgoing_token"],"status":"HANDOFF_ACCEPTED"})
   current=int(item["outgoing_token"],16)
  if current!=links[-1]:raise ValueError("terminus token mismatch")
  exit_codes=[]
  for proc in processes:
   try:exit_codes.append(proc.wait(timeout=10))
   except subprocess.TimeoutExpired:proc.kill();exit_codes.append(proc.wait(timeout=5))
  if any(code is None for code in exit_codes):raise ValueError("federation process did not exit")
  return {"simultaneous_ready_count":ready_count,"accepted_body_count":len(transitions),"handoff_count":len(transitions)-1,"genesis_token":f"{links[0]:08x}","terminus_token":f"{links[-1]:08x}","transitions":transitions,"qemu_exit_codes":exit_codes,"status":"SIMULTANEOUS_100_KERNEL_SERIAL_HANDOFF_PASS"}
 finally:
  for sock in sockets:
   try:sock.close()
   except OSError:pass
  for proc in processes:
   if proc.poll() is None:
    proc.kill()

def build(repo:Path,out:Path,run_qemu:bool=True,base_port:int=18200)->dict[str,Any]:
 if out.exists():shutil.rmtree(out)
 built,links=build_kernels(repo,out)
 if len({x["kernel_sha256"] for x in built})!=100 or len({x["compiler_namespace"] for x in built})!=100:raise ValueError("federation kernel identity collapse")
 federation=run_federation(out,built,links,base_port) if run_qemu else {"simultaneous_ready_count":0,"accepted_body_count":0,"handoff_count":0,"status":"FEDERATION_KERNEL_BUILD_PASS_MACHINE_OPEN"}
 receipt={"schema":"jm.simultaneous-kernel-federation/0.6","body_count":100,"status":federation["status"],"unique_kernel_hashes":len({x['kernel_sha256'] for x in built}),"unique_compiler_namespaces":len({x['compiler_namespace'] for x in built}),"simultaneous_ready_count":federation["simultaneous_ready_count"],"accepted_body_count":federation["accepted_body_count"],"handoff_count":federation["handoff_count"],"all_100_simultaneously_ready":run_qemu and federation["simultaneous_ready_count"]==100,"all_100_handoffs_accepted":run_qemu and federation["accepted_body_count"]==100,"genesis_token":federation.get("genesis_token"),"terminus_token":federation.get("terminus_token"),"kernels":built,"transitions":federation.get("transitions",[]),"claim_boundary":"All 100 QEMU kernels were alive and serial-ready before the genesis token. OneContainer then carried a validated token through the ordered 100-body chain to terminus. The host coordinator and TCP serial channels are shared federation carriers; direct peer networking, real hardware and body-native self-hosting are not claimed."}
 if run_qemu and (not receipt["all_100_simultaneously_ready"] or not receipt["all_100_handoffs_accepted"]):raise ValueError("simultaneous federation gate incomplete")
 write_json(out/"SIMULTANEOUS_FEDERATION_RECEIPT.json",receipt);return receipt

def main()->int:
 p=argparse.ArgumentParser();p.add_argument("--repo",type=Path,default=Path("."));p.add_argument("--out",type=Path,required=True);p.add_argument("--build-only",action="store_true");p.add_argument("--base-port",type=int,default=18200);a=p.parse_args();r=build(a.repo.resolve(),a.out.resolve(),not a.build_only,a.base_port);print(stable({"status":r["status"],"body_count":r["body_count"],"simultaneous_ready_count":r["simultaneous_ready_count"],"accepted_body_count":r["accepted_body_count"]}));return 0
if __name__=="__main__":raise SystemExit(main())
