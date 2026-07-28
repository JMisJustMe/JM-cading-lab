#!/usr/bin/env python3
import hashlib, json, pathlib, re, subprocess, sys

if len(sys.argv) != 3:
    raise SystemExit('usage: verify_two_generated_bodies.py ROOT ELF')
root = pathlib.Path(sys.argv[1])
elf = pathlib.Path(sys.argv[2])
build = root / 'build' / 'generated'
def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
def load(body_id: int):
    source_p = root / 'source' / f'generated_user_body_{body_id}.jm.cading'
    ir_p = build / f'generated_user_body_{body_id}.onebody.json'
    asm_p = build / f'generated_user_body_{body_id}.S'
    receipt_p = build / f'generated_user_body_{body_id}.lowering_receipt.json'
    source = source_p.read_bytes(); ir = json.loads(ir_p.read_text()); asm = asm_p.read_text(); receipt = json.loads(receipt_p.read_text())
    assert ir['schema'] == 'jm.onebody.routeos-user/v1'
    assert ir['identity']['bodyId'] == body_id
    assert ir['abi']['privilege'] == 'CPL3' and ir['abi']['gate'] == 'int 0x80'
    assert ir['provenance']['sourceSha256'] == sha(source)
    ir_hash = ir['provenance'].pop('oneBodySha256')
    core = (json.dumps(ir, indent=2) + '\n').encode()
    ir['provenance']['oneBodySha256'] = ir_hash
    assert ir_hash == sha(core), f'Body {body_id} OneBody core hash mismatch'
    assert receipt['bodyId'] == body_id
    assert receipt['sourceSha256'] == sha(source)
    assert receipt['oneBodySha256'] == ir_hash
    assert receipt['assemblySha256'] == sha(asm.encode())
    for symbol in (f'routeos_user{body_id}_blob_start', f'routeos_user{body_id}_blob_end', f'routeos_generated_body{body_id}_source_sha', f'routeos_generated_body{body_id}_ir_sha'):
        assert symbol in asm
    return source, ir, asm, receipt, ir_hash
source1, ir1, asm1, receipt1, ir_hash1 = load(1)
source2, ir2, asm2, receipt2, ir_hash2 = load(2)
assert source1 != source2 and sha(source1) != sha(source2)
assert ir_hash1 != ir_hash2
assert ir1['identity']['module'] != ir2['identity']['module']
assert ir1['control']['deliberateFaultOwner'] is False
assert ir2['control']['deliberateFaultOwner'] is True
assert [op['name'] for op in ir1['program']] == ['TRACE_READ', 'ROUTE_STATE', 'YIELD']
assert [op['name'] for op in ir2['program']] == ['TRACE_READ', 'ROUTE_STATE', 'FAULT_UD_AFTER', 'YIELD']
assert ir1['program'][1]['argument'] == 1
assert ir2['program'][1]['argument'] == 2
assert ir2['program'][2]['afterRuns'] == 3
assert 'ud2' not in asm1 and asm2.count('ud2') == 1
assert receipt1['deliberateFaultOwner'] is False and receipt2['deliberateFaultOwner'] is True
boot = (root / 'arch/x86_64/boot.S').read_text()
for forbidden in ('routeos_user1_blob_start', 'routeos_user2_blob_start', '.usertext', 'ud2', 'int $0x80'):
    assert forbidden not in boot, f'hand-authored user carrier remains in boot.S: {forbidden}'
elf_data = elf.read_bytes()
for value in (sha(source1), sha(source2), ir_hash1, ir_hash2):
    assert value.encode() in elf_data, f'provenance hash not embedded in ELF: {value}'
syms = subprocess.check_output(['nm', '-n', str(elf)], text=True)
for body_id in (1, 2):
    for symbol in (f'routeos_user{body_id}_blob_start', f'routeos_user{body_id}_blob_end', f'routeos_generated_body{body_id}_source_sha', f'routeos_generated_body{body_id}_ir_sha'):
        assert re.search(rf'\b{re.escape(symbol)}$', syms, re.M), f'missing {symbol}'
print('TWO_DISTINCT_CADING_SOURCES_GATE PASS')
print('TWO_ONEBODY_IDENTITIES_GATE PASS')
print('TWO_CPL3_ASSEMBLY_LOWERINGS_GATE PASS')
print('NO_HAND_AUTHORED_USER_BLOB_GATE PASS')
print('BODY_2_SOURCE_OWNS_FAULT_GATE PASS')
print('TWO_BODY_PROVENANCE_EMBED_GATE PASS')
print(f'BODY_1_SOURCE_SHA256 {sha(source1)}')
print(f'BODY_1_ONEBODY_SHA256 {ir_hash1}')
print(f'BODY_1_ASSEMBLY_SHA256 {sha(asm1.encode())}')
print(f'BODY_2_SOURCE_SHA256 {sha(source2)}')
print(f'BODY_2_ONEBODY_SHA256 {ir_hash2}')
print(f'BODY_2_ASSEMBLY_SHA256 {sha(asm2.encode())}')
