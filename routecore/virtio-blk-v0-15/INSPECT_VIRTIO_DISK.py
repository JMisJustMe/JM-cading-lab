#!/usr/bin/env python3
from pathlib import Path
import argparse, struct, sys, hashlib
BLOCK=512
BASE=256
COUNT=32
MAGIC=0x4A4D424C
PAYLOAD=b'JM BLOCK DEVICE ROUTE\n'
ap=argparse.ArgumentParser(description='Inspect JM RouteCore v0.15 separate virtio-blk BlockFS data carrier')
ap.add_argument('image', type=Path)
ap.add_argument('--expect-payload', action='store_true')
a=ap.parse_args()
data=a.image.read_bytes()
need=(BASE+COUNT)*BLOCK
if len(data)<need:
    print(f'FAIL image too small: {len(data)} < {need}'); sys.exit(1)
def blk(n): return data[(BASE+n)*BLOCK:(BASE+n+1)*BLOCK]
smagic,ver,bsize,bcount=struct.unpack_from('<IIII',blk(0),0)
mmagic,owner,size,dblock,reserved=struct.unpack_from('<IIQII',blk(1),0)
errors=[]
if (smagic,ver,bsize,bcount)!=(MAGIC,1,BLOCK,COUNT): errors.append(f'super={smagic:#x},{ver},{bsize},{bcount}')
if mmagic!=MAGIC or owner!=1 or dblock!=2 or size>BLOCK: errors.append(f'meta={mmagic:#x},owner={owner},size={size},data={dblock}')
if a.expect_payload:
    if size!=len(PAYLOAD): errors.append(f'payload-size={size}, expected={len(PAYLOAD)}')
    if blk(dblock)[:len(PAYLOAD)]!=PAYLOAD: errors.append('payload bytes mismatch')
if errors:
    print('FAIL — ' + '; '.join(errors)); sys.exit(1)
print('PASS — raw virtio-blk BlockFS data region')
print('image sha256:', hashlib.sha256(data).hexdigest())
print('superblock: magic=JM_BLOCKFS version=1 block_size=512 blocks=32')
print(f'metadata: owner={owner} size={size} data_block={dblock}')
if a.expect_payload: print('payload:', PAYLOAD.decode().rstrip())
