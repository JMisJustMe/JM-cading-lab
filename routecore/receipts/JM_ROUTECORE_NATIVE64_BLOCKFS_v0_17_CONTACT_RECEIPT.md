# JM RouteCore Native64 — BlockFS Multi-Block & Deeper-Path Contact Receipt v0.17

**Date:** 2026-09-29  
**State:** DING EARNED · BLOCKFS v3 MULTI-BLOCK EXTENT/REUSE PASS · TWO-BOOT PERSISTENCE PASS  
**Parent:** JM RouteCore Native64 BlockFS Growth Contact v0.16 / Storage Carrier Independence FLAZ v1.0  
**Contact branch:** `routecore-blockfs-v0-17-contact`  
**Successful contact head before receipt:** `69e4c05ac99f96b52f0a9659c0525823fc3fd728`  
**Successful Actions run:** `36497465213`  
**Successful job:** `109180262796`

## Governing advance

The already-proved lower storage route remains unchanged:

`Ring-3 → VFS → BlockFS v3 → 4-line write-back cache → generic block device → proved legacy/transitional virtio-blk carrier → persistent data image`

v0.17 advances the filesystem body above that carrier boundary.

The v0.16 allocation/unlink/reuse behavior remains under regression while v0.17 adds:

- persistent BlockFS version 3 metadata;
- nested traversal through `/blk/docs/archive`;
- bounded contiguous extents up to four 512-byte blocks;
- cross-block reads and writes through the existing cache/device path;
- a deterministic 1200-byte file spanning exactly three blocks;
- unlink/free of the complete three-block temporary extent;
- exact node + complete three-block extent reuse by its replacement;
- independent raw backing inspection of the full 1200-byte payload;
- boot-2 existing-mount verification with no filesystem mutation;
- byte-identical persistent carrier across the read-only second boot.

## Construction court

Successful GitHub Actions construction returned:

- **245 / 245 PASS**
- deterministic same-host rebuild: **PASS**
- BlockFS v3 extent reuse construction gate: **PASS**
- raw multi-block probe construction gate: **PASS**
- Actions boot image SHA-256: `db197b5e097ec7fa11c77b60dc1052f4375c81472f4965a8c269020c32c3e307`
- Actions kernel ELF SHA-256: `1ab0643b930e0e270f2c38856c23744690acc8197eee9f3274ed820a7ecff8dd`
- zeroed data seed SHA-256: `30e14955ebf1352266dc2ff8067e68104607e750abb9d3b36582b8af909fcb58`

The deterministic pre-contact package is:

- `JM_ROUTECORE_NATIVE64_BLOCKFS_v0_17.zip`
- SHA-256: `42119fd0373f56ab16c8b1caf2dc8a29a896d7d080d93e97ae8c1438c5186bfd`
- bytes: `158077`

The deterministic descendant patch carrier is preserved as four repository Base64 parts:

- raw patch SHA-256: `9411d3f234084bbf2ec6fe50b170ae0d372634cec563cd779201777097134d58`
- normalized concatenated Base64 SHA-256: `04ebec2c8f835afdc2841c94b4d69002852e38b6975d6935ff7afcc5ca12a7c7`

The successful workflow reconstructs the exact earlier lineage, rebuilds the proved v0.16 parent, validates it at 237/237, applies the hash-locked v0.17 descendant, and then executes the v0.17 build/runtime court.

## Runtime court — boot 1

Fresh boot returned the complete required route.

Verifier result:

- mount mode: `JM_BLOCKFS_FORMATTED_NEW`
- required markers: **33 / 33**
- ordered route: **24 / 24**
- result: **PASS**

The filesystem lifecycle returned, including:

- the v0.16 A → C exact one-block reuse regression;
- `JM_BLOCKFS_V3_ARCHIVE_DIR_CREATED_T1`;
- `JM_BLOCKFS_V3_CREATE_OLD_T1`;
- a 1200-byte three-block `old.bin`;
- `JM_BLOCKFS_V3_UNLINK_OLD_T1`;
- `JM_BLOCKFS_V3_CREATE_LONG_T1`;
- `JM_BLOCKFS_V3_EXTENT_REUSE_VERIFIED_T1`;
- `JM_BLOCK_CACHE_SYNC_T1`;
- `JM_BLOCKFS_V3_RAW_BACKING_VERIFIED_T1`;
- `JM_BLOCK_CACHE_INVALIDATE_T1`;
- Ring-3 B/C verification;
- `JM_BLOCKFS_V3_USER_LONG_VERIFIED_T1`;
- `JM_BLOCKFS_V3_FRESH_LIFECYCLE_VERIFIED_T1`;
- normal process exit, frame/data reclaim, full page-pool restoration, and survivor return.

Boot 1 serial SHA-256:

`d9ef4cccb4ca7a438265d015808a413a927ecd3642d0ecac0ea304890b5222fe`

## Multi-block extent proof

The pressure body deliberately crosses the single-block boundary rather than merely enlarging an API length field.

The final raw BlockFS v3 state independently returned:

- superblock: `magic=JM_BLOCKFS version=3 blocks=32 nodes=8 data_start=3`
- allocation bitmap: `0x000000ff`
- docs node: **1**
- archive node: **4**
- C node: **2**, data block **3**
- B node: **3**, data block **4**
- long node: **5**
- long extent: **block 5 + 3 contiguous blocks**
- long size: **1200 bytes**
- full long payload pattern: **byte i = i & 0xff**
- result: `PASS — raw BlockFS v3 persistent region`

The temporary three-block `old.bin` extent was freed, then `long.bin` was required to reuse the exact old node and complete three-block extent before the reuse marker could return.

## Runtime persistence — boot 2

The same persistent data carrier was booted again.

Verifier result:

- mount mode: `JM_BLOCKFS_MOUNT_EXISTING`
- required markers: **17 / 17**
- ordered route: **14 / 14**
- filesystem mutation markers: **absent**
- result: **PASS**

Boot 2 returned B, C, and the complete 1200-byte multi-block long file to Ring-3 without reformatting, recreating, unlinking, reusing, or writing the filesystem.

Boot 2 serial SHA-256:

`0c9b3fe174a503e9de5d9b3c3f77695105c08752ad53150a35777bab029da7bd`

## Read-only reboot proof

Persistent carrier after boot 1:

`72e1d6451fc7e128b4e53b67be0fe94257e10b96acbb781780e353bdd6613d72`

Persistent carrier after boot 2:

`72e1d6451fc7e128b4e53b67be0fe94257e10b96acbb781780e353bdd6613d72`

**Byte-identical.**

The second boot therefore read the existing multi-block filesystem body without mutating its raw persistent carrier.

## Actions custody

Successful artifact:

- name: `jm-routecore-blockfs-v0-17-contact`
- artifact ID: `11003399640`
- artifact size: `611385` bytes
- artifact digest: `sha256:6260856c594c650b610d114076c5c4f1c6a11be3fca88d108093b387c2417f80`
- run: `36497465213`
- job: `109180262796`

The artifact contains the recovered lineage, v0.17 descendant carrier, transformed source body, 245/245 proof, deterministic package, boot/data images, both serial logs, raw-carrier hashes, and final persistent carrier.

## Correction trace

Contact failures were preserved rather than erased:

1. **Run 36488932031:** v0.17 patch application stopped because its cleanup expected the generated v0.16 proof JSON, but the recovered parent had not yet been rebuilt in that court. Correction: explicitly build and verify the exact v0.16 parent before applying v0.17.
2. **Run 36489113029:** the parent-build workflow edit did not produce an executable job. The workflow syntax was corrected without changing the filesystem crown gate.
3. **Run 36489170055:** exact parent recovery and v0.17 application succeeded; **245/245 construction PASS** returned. The court then falsely required GitHub's compiler/toolchain output hashes to equal hashes produced on a different host. GitHub returned deterministic same-host disk `db197b5e...` and ELF `1ab0643b...`. Correction: retain same-host deterministic rebuild as mandatory and record, rather than cross-host prescribe, compiler-derived hashes.
4. **Run 36497465213:** recovery, 245/245 construction, deterministic rebuild, package creation, boot 1, raw multi-block inspection, boot 2, byte-identical read-only carrier check, and artifact upload all **PASS**.

No runtime evidence gate was weakened by these corrections.

## Earned conclusion

**PASS:** at the stated QEMU legacy/transitional virtio-blk scope, RouteCore BlockFS now traverses a deeper nested path, persists a file across multiple storage blocks, frees a complete multi-block extent on unlink, reuses the exact freed node and full extent, verifies the complete 1200-byte body independently from raw storage and again through Ring-3 after cache invalidation, reboots, mounts the existing filesystem, and returns the same surviving multi-block body without rewriting the persistent carrier.

This is a filesystem-body advance above the already-proved generic block-device/carrier boundary.

**DING EARNED at the declared v0.17 scope.**

## Explicitly not claimed

This receipt does **not** claim:

- fragmented/non-contiguous extent allocation;
- arbitrary-depth or production-scale directory trees;
- journaling or transactional metadata;
- crash/power-loss recovery;
- concurrent filesystem mutation;
- production-grade filesystem completeness;
- physical-owner-device storage contact;
- NVMe contact;
- modern virtio PCI capability transport;
- hardware power-loss durability.

## Forward frontier

The strongest next filesystem pressure is no longer “can a file cross a block?”

That has returned.

The next frontier is:

`working multi-block persistence → ordered metadata/data mutation → deliberately interrupted mutation → bounded detection/recovery → preserved prior valid state or explicit recoverable state`

Only after that need the separate NVMe / modern virtio / physical-device carrier gates return to the front.

## Keeper

> ONE BLOCK WAS NOT THE FILESYSTEM.  
> THE FILE CROSSED THE BLOCK.  
> DELETE FREED THE WHOLE EXTENT.  
> REUSE RETURNED THE WHOLE EXTENT.  
> REBOOT READ THE MULTI-BLOCK BODY WITHOUT REWRITING IT.  
> NO DING WITHOUT THE RETURN; THE RETURN IS PRESENT.

**DING EARNED · v0.17 CONTACT CLOSED AT DECLARED RUNTIME SCOPE.**
