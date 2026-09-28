#!/usr/bin/env python3
from pathlib import Path
import argparse, json, sys
ROOT=Path(__file__).resolve().parent
ap=argparse.ArgumentParser(description='Verify JM RouteCore v0.15 virtio-blk serial evidence')
ap.add_argument('log', type=Path)
g=ap.add_mutually_exclusive_group(required=True)
g.add_argument('--expect-format', action='store_true')
g.add_argument('--expect-existing', action='store_true')
a=ap.parse_args()
text=a.log.read_text(errors='replace') if a.log.exists() else ''
proof=json.loads((ROOT/'JM_ROUTECORE_NATIVE64_VIRTIO_BLK_v0_15_PROOF.json').read_text())
required=list(proof['expected_runtime_markers'])
missing=[m for m in required if m not in text]
mode='JM_BLOCKFS_FORMATTED_NEW' if a.expect_format else 'JM_BLOCKFS_MOUNT_EXISTING'
other='JM_BLOCKFS_MOUNT_EXISTING' if a.expect_format else 'JM_BLOCKFS_FORMATTED_NEW'
if mode not in text: missing.append(mode)
if other in text:
    print(f'FAIL unexpected mount-mode marker: {other}'); sys.exit(1)
critical=[
'JM_ROUTECORE_NATIVE64_ENTER','JM_VIRTIO_BLK_PCI_DISCOVERED','JM_VIRTIO_BLK_QUEUE_READY','JM_VIRTIO_BLK_READ_CONTACT',
'JM_BLOCKFS_MOUNTED',mode,'JM_USERMODE_CONTACT_T1','JM_BLOCKFS_OPEN_T1','JM_BLOCKFS_WRITE_T1',
'JM_BLOCK_CACHE_SYNC_T1','JM_BLOCK_DEVICE_BACKING_VERIFIED_T1','JM_BLOCK_CACHE_INVALIDATE_T1','JM_BLOCKFS_SEEK_T1','JM_BLOCKFS_READ_T1',
'JM_BLOCKFS_CLOSE_T1','JM_BLOCKFS_USER_CONTENT_VERIFIED_T1','JM_PROCESS_EXIT_T1','JM_PROCESS_EXIT_POOL_RESTORED_64','JM_PROCESS_EXIT_SURVIVOR_T0']
pos=-1; order_fail=[]
for m in critical:
    n=text.find(m,pos+1)
    if n<0: order_fail.append(m)
    else: pos=n
if missing or order_fail:
    print('FAIL')
    if missing: print('missing:', ', '.join(dict.fromkeys(missing)))
    if order_fail: print('route-order:', ', '.join(order_fail))
    sys.exit(1)
print('PASS — virtio-blk runtime route')
print('mount mode:', mode)
print('required markers:', len(required)+1)
print('critical ordered route:', len(critical))\nprint('device write/flush markers required independently of first-occurrence order')
