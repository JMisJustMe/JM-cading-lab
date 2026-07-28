#!/usr/bin/env python3
import hashlib,json,pathlib,re,struct,subprocess,sys
if len(sys.argv)!=4: raise SystemExit('usage: verify_generated_kernel.py ROOT BASE ELF')
root,base,elf=map(pathlib.Path,sys.argv[1:]); genk=root/'build'/'generated_kernel'; genu=root/'build'/'generated_users'
def sha(b): return hashlib.sha256(b).hexdigest()
data=elf.read_bytes(); assert data[:4]==b'\x7fELF' and data[4]==2 and data[5]==1
magic=struct.pack('<I',0xE85250D6); pos=data[:32768].find(magic); assert pos>=0; fields=struct.unpack_from('<IIII',data,pos); assert fields[1]==0 and sum(fields)&0xffffffff==0
source=(root/'source'/'routeos_kernel_blueprint.jm.cading').read_bytes(); ir=json.loads((genk/'routeos_kernel.onebody.json').read_text()); receipt=json.loads((genk/'routeos_kernel.lowering_receipt.json').read_text()); boot=(genk/'boot.S').read_bytes(); kernel=(genk/'routeos_kernel.c').read_bytes(); linker=(genk/'linker.ld').read_bytes()
assert ir['schema']=='jm.onebody.routeos-kernel/v1' and ir['provenance']['sourceSha256']==sha(source); irh=ir['provenance'].pop('kernelIrSha256'); assert irh==sha((json.dumps(ir,indent=2)+'\n').encode()); ir['provenance']['kernelIrSha256']=irh
assert receipt['status']=='KERNEL LOWERING PASS' and receipt['sourceMaintainedTargets'] is False and receipt['blueprintSha256']==sha(source) and receipt['kernelIrSha256']==irh and receipt['bootAssemblySha256']==sha(boot) and receipt['kernelCSha256']==sha(kernel) and receipt['linkerSha256']==sha(linker)
for b,n in ((boot,'boot.S'),(kernel,'routeos_kernel.c'),(linker,'linker.ld')): assert b'GENERATED FROM JM KERNEL BLUEPRINT' in b,n
for maintained in (root/'kernel'/'routeos_kernel.c',root/'arch'/'x86_64'/'boot.S',root/'linker.ld'): assert not maintained.exists(),maintained
required_offices={'IGNITIONBODY','CORESTATE','MEMORYBODY','INTERRUPTBODY','ROUTESCHEDULER','PERMISSIONGATE','FAULTHOLD','RECOVERYBODY'}; assert required_offices.issubset(ir['offices'])
user_hashes=[]
for body_id in (1,2):
 s=(base/'source'/f'generated_user_body_{body_id}.jm.cading').read_bytes(); uir=json.loads((genu/f'generated_user_body_{body_id}.onebody.json').read_text()); asm=(genu/f'generated_user_body_{body_id}.S').read_bytes(); ur=json.loads((genu/f'generated_user_body_{body_id}.lowering_receipt.json').read_text()); assert uir['identity']['bodyId']==body_id and uir['provenance']['sourceSha256']==sha(s); uh=uir['provenance'].pop('oneBodySha256'); assert uh==sha((json.dumps(uir,indent=2)+'\n').encode()); uir['provenance']['oneBodySha256']=uh; assert ur['sourceSha256']==sha(s) and ur['oneBodySha256']==uh and ur['assemblySha256']==sha(asm); user_hashes += [sha(s),uh]
 if body_id==1: assert b'ud2' not in asm
 else: assert asm.count(b'ud2')==1 and ur['deliberateFaultOwner'] is True
syms=subprocess.check_output(['nm','-n',str(elf)],text=True); req=['_start','routeos_kernel_entry','routeos_interrupt_dispatch','routeos_isr_timer','routeos_isr_syscall','routeos_isr_ud','routeos_enter_frame','routeos_kernel_blueprint_sha','routeos_kernel_ir_sha','routeos_boot_blueprint_sha','routeos_user1_blob_start','routeos_user1_blob_end','routeos_user2_blob_start','routeos_user2_blob_end','routeos_generated_body1_source_sha','routeos_generated_body1_ir_sha','routeos_generated_body2_source_sha','routeos_generated_body2_ir_sha']
for x in req: assert re.search(rf'\b{re.escape(x)}$',syms,re.M),x
entry=subprocess.check_output(['objdump','-d','--disassemble=routeos_kernel_entry',str(elf)],text=True); assert not re.search(r'\bsti\b',entry); dis=subprocess.check_output(['objdump','-d',str(elf)],text=True); assert 'iretq' in dis and 'int    $0x80' in dis and dis.count('ud2')==1
for v in [sha(source),irh,*user_hashes]: assert v.encode() in data,v
print('JM_KERNEL_BLUEPRINT_PROVENANCE_GATE PASS');print('KERNEL_ONEBODY_IR_GATE PASS');print('GENERATED_BOOT_ASSEMBLY_GATE PASS');print('GENERATED_KERNEL_C_GATE PASS');print('GENERATED_LINKER_LAYOUT_GATE PASS');print('NO_MAINTAINED_TARGET_KERNEL_SOURCE_GATE PASS');print('TWO_DISTINCT_GENERATED_USER_BODIES_GATE PASS');print('GENERATED_KERNEL_PROVENANCE_EMBED_GATE PASS');print('STATIC_MACHINE_GATE PASS');print(f'KERNEL_BLUEPRINT_SHA256 {sha(source)}');print(f'KERNEL_ONEBODY_SHA256 {irh}');print(f'GENERATED_BOOT_SHA256 {sha(boot)}');print(f'GENERATED_KERNEL_C_SHA256 {sha(kernel)}');print(f'GENERATED_LINKER_SHA256 {sha(linker)}')
