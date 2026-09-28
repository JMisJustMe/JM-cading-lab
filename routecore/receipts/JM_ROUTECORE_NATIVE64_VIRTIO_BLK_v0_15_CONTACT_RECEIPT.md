# JM RouteCore Native64 Virtio Block v0.15 — Contact Receipt

**Status:** DING EARNED · QEMU LEGACY VIRTIO-BLK CONTACT PASS · TWO-BOOT PERSISTENCE PASS  
**Date:** 2026-09-28  
**Parent:** JM RouteCore Native64 AHCI Storage Contact v0.14  
**Contact branch:** `routecore-virtio-blk-v0-15-contact`  
**Successful contact head:** `423059a92c57c569dc305c5a635440bb964900e4`  
**Successful Actions run:** `36481801826`  
**Successful job:** `109128980161`

## Governing claim

The already-proved upper storage route was preserved:

`Ring-3 file call → VFS → BlockFS → 4-line write-back cache → generic block-device interface → carrier`

v0.15 changes the carrier boundary to a QEMU-emulated **legacy/transitional PCI virtio-blk transport** with a separate data carrier. It does not rebuild VFS, BlockFS, the write-back cache, or process/file semantics.

**Law:** STORAGE IS A ROUTE, NOT A BYTE ARRAY.  
**Law:** CARRIER SWAP != FILESYSTEM REBUILD.  
**Law:** SOURCE CONSTRUCTION IS NOT DEVICE CONTACT.  
**Law:** NO RETURNED SECTOR, NO DING.

## Construction court

Fresh construction on the successful court:

- `228 / 228 PASS`
- deterministic rebuild: PASS
- boot image SHA-256: `26fa185e8cbc4e3c0477c77bf277f18e5cd4103e75bec52fd7d895e865039c19`
- zeroed data-carrier seed SHA-256: `30e14955ebf1352266dc2ff8067e68104607e750abb9d3b36582b8af909fcb58`
- kernel ELF SHA-256: `4593e18bf918317882909feb7199699117fe12b1c36be595c9df7beaddc15897`
- deterministic pre-contact package SHA-256: `6140a077e8964b9710e44a5a4886bcf1927fa75431e2ac03c2d563fd00cae8bf`
- package size: `128956` bytes

## Runtime court

QEMU court shape:

- BIOS boot carrier remains separate and is isolated with a temporary QEMU snapshot.
- Persistent storage under test is a separate `virtio-blk-pci` data carrier.
- Modern virtio transport is disabled for this court; the driver proves the bounded legacy I/O transport used by this v0.15 body.
- Queue 0 accepts the observed 256-entry device queue.
- One outstanding request is used per operation.

### Boot 1 — fresh carrier

Returned markers include:

- `JM_ROUTECORE_NATIVE64_ENTER`
- `JM_VIRTIO_BLK_PCI_DISCOVERED`
- `JM_VIRTIO_BLK_QUEUE_READY`
- `JM_VIRTIO_BLK_READ_CONTACT`
- `JM_VIRTIO_BLK_WRITE_CONTACT`
- `JM_VIRTIO_BLK_FLUSH_CONTACT`
- `JM_VIRTIO_BLK_READY`
- `JM_BLOCK_DEVICE_READY`
- `JM_BLOCK_CACHE_READY`
- `JM_BLOCKFS_MOUNTED`
- `JM_BLOCKFS_FORMATTED_NEW`
- `JM_BLOCKFS_OPEN_T1`
- `JM_BLOCKFS_WRITE_T1`
- `JM_BLOCK_CACHE_SYNC_T1`
- `JM_BLOCK_DEVICE_BACKING_VERIFIED_T1`
- `JM_BLOCK_CACHE_INVALIDATE_T1`
- `JM_BLOCKFS_SEEK_T1`
- `JM_BLOCKFS_READ_T1`
- `JM_BLOCKFS_CLOSE_T1`
- `JM_BLOCKFS_USER_CONTENT_VERIFIED_T1`
- `JM_PROCESS_EXIT_POOL_RESTORED_64`
- `JM_PROCESS_EXIT_SURVIVOR_T0`

Runtime verifier: PASS.  
Mount mode: `JM_BLOCKFS_FORMATTED_NEW`.

### Boot 2 — same persistent data carrier

Returned markers include:

- `JM_ROUTECORE_NATIVE64_ENTER`
- `JM_VIRTIO_BLK_PCI_DISCOVERED`
- `JM_VIRTIO_BLK_QUEUE_READY`
- `JM_VIRTIO_BLK_READ_CONTACT`
- `JM_VIRTIO_BLK_READY`
- `JM_BLOCK_DEVICE_READY`
- `JM_BLOCK_CACHE_READY`
- `JM_BLOCKFS_MOUNTED`
- `JM_BLOCKFS_MOUNT_EXISTING`
- the same Ring-3 BlockFS write/sync/backing-verify/invalidate/read/content-verification route
- normal process exit/reclaim

Runtime verifier: PASS.  
Mount mode: `JM_BLOCKFS_MOUNT_EXISTING`.

## Independent raw-carrier court

The separate virtio data carrier was inspected directly after runtime:

- final data-carrier SHA-256: `f871cbab4386f9d1b544e47716d06df1613cd9a55059c9307f6f20946d2d6fa1`
- superblock: `magic=JM_BLOCKFS version=1 block_size=512 blocks=32`
- metadata: `owner=1 size=22 data_block=2`
- payload: `JM BLOCK DEVICE ROUTE`

Serial evidence hashes:

- boot 1 log SHA-256: `757a4856d10fca713d01710b802ee237b2d402e32465fe4caa1ac63460ad880c`
- boot 2 log SHA-256: `086bcd9a64317ab35b623892606cdf094e07d3af9b3e85de3aa09f10d98d1145`

## Actions custody

Successful artifact:

- name: `jm-routecore-virtio-blk-v0-15-contact`
- artifact ID: `10995774799`
- size: `451786` bytes
- artifact digest: `sha256:d6715890c7d5168c82f7956b8c9c962ba2924c3ecdda90f14cf8b78598d969e0`
- successful run: `36481801826`

## Correction trace

The court preserved failed contact attempts instead of erasing them:

1. Run 1: harness rejected a read-only IDE boot node before JM contact.
2. Run 2: JM entered; virtio queue-size gate rejected the device queue.
3. Runs 3–4: the 256-entry queue correction exposed a stale construction-proof literal.
4. Run 5: runtime/device route returned, but verifier incorrectly ordered first WRITE/FLUSH markers after the user write even though fresh BlockFS formatting legitimately emits the first writes earlier.
5. Run 6: verifier edit contained a literal `\n` syntax defect and correctly failed before judging runtime.
6. Run 7: construction, package, boot 1, raw-carrier inspection, boot 2, raw-carrier inspection, and artifact upload all PASS.

The verifier was corrected without weakening the device evidence: READ/WRITE/FLUSH remain mandatory markers; only the invalid first-occurrence ordering constraint was removed. The user-file route still requires write → cache sync → direct backing verification → cache invalidation → reread → Ring-3 content verification.

## Earned conclusion

At **QEMU-emulated legacy/transitional PCI virtio-blk scope**, the same JM upper storage body successfully reached a third carrier:

`VFS → BlockFS → write-back cache → generic block device → virtio-blk → separate persistent data carrier`

The carrier returned sector data, accepted writes, completed flushes, preserved the 22-byte VFS-originated payload across separate boots, remounted the existing BlockFS on boot 2, and passed independent raw-carrier inspection.

**DING EARNED at the stated QEMU virtio-blk scope.**

## Explicitly not claimed

This receipt does **not** claim:

- physical-owner-device storage contact;
- modern virtio PCI capability transport;
- NVMe contact;
- AHCI/ATA equivalence beyond the already-proved generic block-device boundary;
- production-grade filesystem completeness;
- hardware durability guarantees.

## Keeper

> STORAGE IS A ROUTE, NOT A BYTE ARRAY.  
> ONE UPPER ROUTE, MULTIPLE CARRIERS.  
> CARRIER SWAP != FILESYSTEM REBUILD.  
> SOURCE CONSTRUCTION IS NOT DEVICE CONTACT.  
> NO RETURNED SECTOR, NO DING.  
> At QEMU legacy virtio-blk scope, the sector returned. Ding earned.
