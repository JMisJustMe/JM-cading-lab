#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, lzma, tarfile, shutil

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'reconstructed'
ARCHIVE=ROOT/'JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1_PUBLIC_SOURCE.tar.xz'
EXPECTED_BYTES=433440
EXPECTED_SHA='c821e3fad085291d35113c9d0543aee1b1fc58435b574a1a134398824c42b283'
BRIDGE=['part-001.b64','part-002.b64','part-003.b64','part-004a.b64','part-004b.b64','part-005.b64','part-006.b64','part-007.b64','part-008.b64']

def names(d, pattern): return sorted(p.name for p in (ROOT/d).glob(pattern))
def strict_b64(paths): return base64.b64decode(''.join(p.read_text(encoding='ascii') for p in paths),validate=True)

def decode_packed(paths):
    acc=bits=0; out=bytearray()
    for p in paths:
        for ch in p.read_text(encoding='utf-8'):
            v=ord(ch)-0x4E00
            if not 0 <= v < 16384: raise SystemExit(f'packed value out of range: {p}')
            acc=(acc<<14)|v; bits+=14
            while bits>=8:
                bits-=8; out.append((acc>>bits)&255)
                acc &= (1<<bits)-1 if bits else 0
    if bits: raise SystemExit(f'packed tail not byte-aligned: {bits} bits')
    return bytes(out)

def main():
    exp_prefix=[f'part-{i:03d}.b64' for i in range(1,38)]
    exp_packed=[f'packed-{i:03d}.txt' for i in range(1,20)]
    exp_ascii=[f'part-{i:03d}.b64' for i in range(1,34)]
    if names('prefix','*.b64') != exp_prefix: raise SystemExit('prefix set mismatch')
    if names('bridge','*.b64') != sorted(BRIDGE): raise SystemExit('bridge set mismatch')
    if names('packed','*.txt') != exp_packed: raise SystemExit('packed set mismatch')
    if names('ascii','*.b64') != exp_ascii: raise SystemExit('ascii set mismatch')
    prefix=strict_b64([ROOT/'prefix'/n for n in exp_prefix])
    bridge=strict_b64([ROOT/'bridge'/n for n in BRIDGE])
    packed=decode_packed([ROOT/'packed'/n for n in exp_packed])
    ascii_tail=strict_b64([ROOT/'ascii'/n for n in exp_ascii])
    expected=(286875,11250,86450,48865)
    got=tuple(map(len,(prefix,bridge,packed,ascii_tail)))
    if got != expected: raise SystemExit(f'segment byte mismatch: {got} != {expected}')
    data=prefix+bridge+packed+ascii_tail
    sha=hashlib.sha256(data).hexdigest()
    if len(data)!=EXPECTED_BYTES or sha!=EXPECTED_SHA: raise SystemExit(f'archive identity FAIL bytes={len(data)} sha256={sha}')
    ARCHIVE.write_bytes(data)
    with lzma.open(ARCHIVE,'rb') as xz, tarfile.open(fileobj=xz,mode='r:') as tf:
        members=tf.getmembers()
        if len(members)!=35 or any(not m.isfile() for m in members): raise SystemExit('member contract FAIL')
        root=OUT.resolve()
        if OUT.exists(): shutil.rmtree(OUT)
        OUT.mkdir()
        for m in members:
            target=(OUT/m.name).resolve()
            if root not in target.parents: raise SystemExit(f'unsafe tar path: {m.name}')
        tf.extractall(OUT,filter='data')
    print(f'Navigator reconstruction PASS: {len(data)} bytes sha256={sha} members=35')
if __name__=='__main__': main()
