# JM RouteCore Native64 — ATA PIO Contact Receipt v0.13

**Date:** 2026-09-28  
**State:** DING EARNED · QEMU ATA/IDE CONTACT PASS · TWO-BOOT PERSISTENCE PASS  
**Parent:** JM RouteCore Native64 Block Device, Cache & BlockFS Adapter v0.12  
**Contact branch:** `routecore-ata-pio-v0-13-contact`  
**Proved workflow commit:** `4877cd4f092e77392732c25a53c3597978b43dab`  
**GitHub Actions run:** `36465295968` (run #4, SUCCESS)

## Governing boundary

The higher storage route was preserved:

`Ring-3 file call → VFS → BlockFS → 4-line write-back cache → generic block-device interface → carrier`

v0.13 changes the carrier from RAM-backed sectors to legacy primary-master ATA PIO. The earned claim is therefore about ATA-backed device contact under the QEMU-emulated IDE controller, not a rebuilt filesystem and not physical-hardware ATA contact.

**Law preserved:** controller source exists ≠ disk I/O happened.  
**Ding condition:** returned sector/device evidence had to come back through the route.

## Custody / construction

Recovered release Base64 SHA-256:

`613232f9c88cdcdd833941011c2183a48353c40831e75e749c841ae726b2d59a`

Recovered release ZIP:

`JM_ROUTECORE_NATIVE64_ATA_PIO_v0_13.zip`

ZIP SHA-256:

`2ee8e512520030359083e9bf60585f404001adac226d7621e167a5a259116c55`

Frozen disk image SHA-256:

`8db9cc0b5efc552866554a7d5939ae978164bde95dbccf6610a8ba4c31a90ddd`

Frozen kernel ELF SHA-256:

`c98637383055d4f315e9d7986020ea4dcee831877f5c2850e1f5ab08e553652b`

Fresh source construction under the Actions host returned:

`216 / 216 PASS`

and `checks.deterministic_rebuild == true`.

The current Actions host produced a fresh-build binary that was deterministic within that host run but not byte-identical to the originally frozen binary. The court therefore preserved both proofs: fresh source construction was checked independently, then the exact frozen hash-locked disk was restored for runtime contact.

## Transport recovery

The staged `part01.b64` carrier had one injected character. Known-good fragment custody uniquely recovered it:

- bad length: 14,409 Base64 characters
- recovered length: 14,408
- removed character: `4`
- zero-based index: `3330`
- recovered fragment SHA-256: `8f67a481669e7b318d95fb5ffa7adf979455284d1daa6005cd4196d8adb59f81`

The source fragment itself was repaired in commit `4877cd4f092e77392732c25a53c3597978b43dab`; the successful court did not rely on silently changing expected package hashes.

## Runtime contact — boot 1

Boot 1 returned, in the live serial route:

- `JM_ROUTECORE_NATIVE64_ENTER`
- `JM_ATA_PIO_READ_CONTACT`
- `JM_ATA_PIO_WRITE_CONTACT`
- `JM_ATA_PIO_FLUSH_CONTACT`
- `JM_ATA_PIO_IDENTIFY_READY`
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

Boot 1 serial log SHA-256:

`12d375186c24985c73e338718fc17b6eb484c4b9c1264de8b7b23ed15d3fea75`

## Runtime persistence — boot 2

The same runtime disk was booted again. Boot 2 returned:

- `JM_ATA_PIO_READ_CONTACT`
- `JM_ATA_PIO_IDENTIFY_READY`
- `JM_BLOCKFS_MOUNT_EXISTING`
- `JM_ATA_PIO_WRITE_CONTACT`
- `JM_ATA_PIO_FLUSH_CONTACT`
- `JM_BLOCK_DEVICE_BACKING_VERIFIED_T1`
- `JM_BLOCK_CACHE_INVALIDATE_T1`
- `JM_BLOCKFS_USER_CONTENT_VERIFIED_T1`
- `JM_PROCESS_EXIT_POOL_RESTORED_64`
- `JM_PROCESS_EXIT_SURVIVOR_T0`

Boot 2 serial log SHA-256:

`5b67af4633260e5627844e613a03fc28b1d246754e751620e41d132ad3eef967`

The second boot mounted the existing BlockFS rather than formatting a new one. This establishes persistence across separate QEMU boots of the same ATA/IDE disk image at the earned emulator scope.

## Independent raw-disk court

Final raw-disk inspection returned:

- `PASS — raw ATA BlockFS region`
- superblock: `magic=JM_BLOCKFS version=1 block_size=512 blocks=32`
- metadata: `owner=1 size=22 data_block=2`
- payload: `JM BLOCK DEVICE ROUTE`

Final runtime disk SHA-256:

`f5360fa5e101802d72f92d6e2cd96fa09d69836371da64fa83c23b7da6a50103`

This independently confirms the 22-byte file payload existed in the reserved on-disk ATA BlockFS region after the two-boot court.

## Actions artifact custody

Artifact ID:

`10989642274`

Actions artifact digest:

`sha256:2d4836e452a51973669967a1f6099a35416ad9c69dc1ac206563fb2db380a7f4`

The artifact contains the reconstructed exact release, frozen binaries, fresh-build outputs/proof, both boot serial logs, and the final mutated runtime disk.

## Earned claim

**PASS:** the existing JM storage route reached a QEMU-emulated legacy ATA/IDE device through PIO, returned sectors through the generic block-device interface, persisted a VFS-originated 22-byte payload to the disk image, directly verified backing bytes, invalidated and reloaded through the cache/BlockFS route, verified content in Ring-3, survived process exit/reclaim, and mounted the persisted filesystem on a second boot.

## Explicitly not claimed

- physical ATA/SATA hardware contact
- AHCI/NVMe/virtio-blk contact
- production-grade filesystem completeness
- hardware durability guarantees
- controller contact outside the QEMU-emulated legacy IDE/ATA scope

## Keeper

**STORAGE IS A ROUTE, NOT A BYTE ARRAY.**  
**SOURCE CONSTRUCTION IS NOT DEVICE CONTACT.**  
**NO RETURNED SECTOR, NO DING.**

At QEMU ATA/IDE scope, the sector returned. **Ding earned.**
