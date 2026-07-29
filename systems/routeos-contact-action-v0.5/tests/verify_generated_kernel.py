#!/usr/bin/env python3
import hashlib,json,pathlib,re,struct,subprocess,sys
if len(sys.argv)!=5: raise SystemExit('usage: verify_generated_kernel.py ROOT USER_BASE KERNEL_BASE ELF')
root,user_base,kernel_base,elf=map(pathlib.Path,sys.argv[1:]); genk=root/'build'/'generated_kernel'; genu=root/'build'/'generated_users'
def sha(b): return hashlib.sha256(b).hexdigest()
data=elf.read_bytes(); assert data[:4]==b'\x7fELF' and data[4]==2 and data[5]==1
magic=struct.pack('<I',0xE85250D6); pos=data[:32768].find(magic); assert pos>=0; fields=struct.unpack_from('<IIII',data,pos); assert fields[1]==0 and sum(fields)&0xffffffff==0
base_source=(kernel_base/'source/routeos_kernel_blueprint.jm.cading').read_bytes(); base_ir=json.loads((genk/'routeos_kernel.onebody.json').read_text()); assert base_ir['provenance']['sourceSha256']==sha(base_source)
overlay_source=(root/'source/contact_action_overlay.jm.cading').read_bytes(); overlay=json.loads((genk/'routeos_contact_action.overlay.onebody.json').read_text()); overlay_receipt=json.loads((genk/'routeos_contact_action.overlay_receipt.json').read_text()); assert overlay['schema']=='jm.onebody.routeos-kernel-contact-overlay/v1' and overlay['provenance']['sourceSha256']==sha(overlay_source); oh=overlay['provenance'].pop('overlayIrSha256'); assert oh==sha((json.dumps(overlay,indent=2)+'\n').encode()); overlay['provenance']['overlayIrSha256']=oh; assert overlay_receipt['status']=='CONTACT ACTION OVERLAY LOWERING PASS' and overlay_receipt['overlayIrSha256']==oh and overlay_receipt['generatedTargetsMaintained'] is False
for maintained in (root/'kernel/routeos_kernel.c',root/'arch/x86_64/boot.S',root/'linker.ld'): assert not maintained.exists(),maintained
for body_id in (1,2):
 s=(user_base/'source'/f'generated_user_body_{body_id}.jm.cading').read_bytes(); uir=json.loads((genu/f'generated_user_body_{body_id}.onebody.json').read_text()); asm=(genu/f'generated_user_body_{body_id}.S').read_bytes(); assert uir['identity']['bodyId']==body_id and uir['provenance']['sourceSha256']==sha(s); assert (b'ud2' not in asm) if body_id==1 else (asm.count(b'ud2')==1)
syms=subprocess.check_output(['nm','-n',str(elf)],text=True)
for x in ['_start','routeos_kernel_entry','routeos_interrupt_dispatch','routeos_isr_timer','routeos_isr_keyboard','routeos_isr_syscall','routeos_isr_ud','routeos_enter_frame','routeos_contact_action_overlay_source_sha','routeos_contact_action_overlay_sha']:
 assert re.search(rf'\b{re.escape(x)}$',syms,re.M),x
dis=subprocess.check_output(['objdump','-d',str(elf)],text=True); assert 'iretq' in dis and 'int    $0x80' in dis and dis.count('ud2')==1
for value in [sha(base_source),sha(overlay_source),oh]: assert value.encode() in data,value
for marker in [b'AUTO-GATE / BORING OS',b'KICPLAY OS',b'NO-ERASURE CONTACT LEDGER',b'INOUT-16 ORIGIN']: assert marker in data,marker
print('BASE_GENERATED_KERNEL_REUSE_GATE PASS');print('CONTACT_ACTION_OVERLAY_PROVENANCE_GATE PASS');print('AUTO_GATE_KICPLAY_STATIC_GATE PASS');print('KEYBOARD_IRQ1_STATIC_GATE PASS');print('NO_ERASURE_CONTACT_LEDGER_STATIC_GATE PASS');print('TWO_GENERATED_USER_BODIES_RETAINED PASS');print('STATIC_MACHINE_GATE PASS');print(f'CONTACT_OVERLAY_SOURCE_SHA256 {sha(overlay_source)}');print(f'CONTACT_OVERLAY_ONEBODY_SHA256 {oh}')
