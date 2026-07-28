#!/usr/bin/env python3
import pathlib, re, struct, subprocess, sys

p = pathlib.Path(sys.argv[1])
data = p.read_bytes()
assert data[:4] == b'\x7fELF', 'not ELF'
assert data[4] == 2, 'not ELF64'
assert data[5] == 1, 'not little-endian ELF'
magic = struct.pack('<I', 0xE85250D6)
pos = data[:32768].find(magic)
assert pos >= 0, 'Multiboot2 header missing from first 32 KiB'
fields = struct.unpack_from('<IIII', data, pos)
assert fields[1] == 0, 'Multiboot2 architecture is not i386 protected-mode entry'
assert sum(fields) & 0xffffffff == 0, 'Multiboot2 checksum invalid'
syms = subprocess.check_output(['nm', '-n', str(p)], text=True)
required = [
    '_start','routeos_kernel_entry','routeos_interrupt_dispatch',
    'routeos_isr_timer','routeos_isr_syscall','routeos_isr_ud',
    'routeos_enter_frame','routeos_user1_blob_start','routeos_user1_blob_end',
    'routeos_user2_blob_start','routeos_user2_blob_end',
    'routeos_generated_body1_source_sha','routeos_generated_body1_ir_sha',
    'routeos_generated_body2_source_sha','routeos_generated_body2_ir_sha',
]
for symbol in required:
    assert re.search(rf'\b{re.escape(symbol)}$', syms, re.M), f'missing symbol {symbol}'
entry_dis = subprocess.check_output(['objdump', '-d', '--disassemble=routeos_kernel_entry', str(p)], text=True)
assert not re.search(r'\bsti\b', entry_dis), 'premature STI remains in routeos_kernel_entry'
all_dis = subprocess.check_output(['objdump', '-d', str(p)], text=True)
for instruction in ('iretq', 'int    $0x80', 'ud2'):
    assert instruction in all_dis, f'missing privileged proof instruction: {instruction}'
assert all_dis.count('ud2') == 1, 'exactly one deliberate generated fault instruction is required'
print('STATIC_VERIFY PASS')
print(f'ELF_BYTES {len(data)}')
print(f'MULTIBOOT2_HEADER_OFFSET {pos}')
print('ENTRY_INTERRUPT_RACE_GATE PASS')
print('PRIVILEGED_INSTRUCTION_GATE PASS')
print('TWO_GENERATED_SYMBOL_GATE PASS')
print('SINGLE_FAULT_OWNER_INSTRUCTION_GATE PASS')
