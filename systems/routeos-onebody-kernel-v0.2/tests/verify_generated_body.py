#!/usr/bin/env python3
import hashlib, json, pathlib, re, subprocess, sys

if len(sys.argv) != 6:
    raise SystemExit('usage: verify_generated_body.py ELF SOURCE IR ASM RECEIPT')
elf, source_p, ir_p, asm_p, receipt_p = map(pathlib.Path, sys.argv[1:])
source = source_p.read_bytes()
ir = json.loads(ir_p.read_text())
asm = asm_p.read_text()
receipt = json.loads(receipt_p.read_text())

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

assert ir['schema'] == 'jm.onebody.routeos-user/v1'
assert ir['identity']['bodyId'] == 1
assert ir['abi']['privilege'] == 'CPL3'
assert ir['abi']['gate'] == 'int 0x80'
assert ir['provenance']['sourceSha256'] == sha(source)

ir_hash = ir['provenance'].pop('oneBodySha256')
core = (json.dumps(ir, indent=2) + '\n').encode()
ir['provenance']['oneBodySha256'] = ir_hash
assert ir_hash == sha(core), 'OneBody core hash mismatch'
assert receipt['sourceSha256'] == sha(source)
assert receipt['oneBodySha256'] == ir_hash
assert receipt['assemblySha256'] == sha(asm.encode())

names = [op['name'] for op in ir['program']]
assert names == ['TRACE_READ', 'ROUTE_STATE', 'YIELD'], names
assert re.search(r'movq \$1, %rax.*?int \$0x80.*?movq \$3, %rax.*?movq \$1, %rdi.*?int \$0x80.*?movq \$2, %rax.*?int \$0x80', asm, re.S)

elf_data = elf.read_bytes()
assert sha(source).encode() in elf_data, 'source hash not embedded in ELF'
assert ir_hash.encode() in elf_data, 'OneBody hash not embedded in ELF'
syms = subprocess.check_output(['nm', '-n', str(elf)], text=True)
for symbol in (
    'routeos_user1_blob_start', 'routeos_user1_blob_end',
    'routeos_user2_blob_start', 'routeos_user2_blob_end',
    'routeos_generated_body_source_sha', 'routeos_generated_body_ir_sha'
):
    assert re.search(rf'\b{re.escape(symbol)}$', syms, re.M), f'missing {symbol}'

print('ONEBODY_PROVENANCE_GATE PASS')
print('CADING_TO_ONEBODY_GATE PASS')
print('ONEBODY_TO_CPL3_ASSEMBLY_GATE PASS')
print('GENERATED_BODY_EMBED_GATE PASS')
