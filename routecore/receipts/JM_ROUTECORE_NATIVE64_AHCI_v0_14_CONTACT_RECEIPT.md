# JM RouteCore Native64 — AHCI Storage Carrier Contact Receipt v0.14

**Date:** 2026-09-28  
**State:** DING EARNED · QEMU q35 AHCI/SATA CONTACT PASS · TWO-BOOT PERSISTENCE PASS  
**Parent:** JM RouteCore Native64 ATA PIO Contact v0.13  
**Contact branch:** `routecore-ahci-v0-14-contact`  
**Proved workflow commit:** `f4aea27f04b5c5637a14a7389576906ae84781b0`  
**GitHub Actions run:** `36472188494` (run #4, SUCCESS)

## Governing route

The upper storage path remained the same:

`Ring-3 → VFS → BlockFS → 4-line write-back cache → route_block_device → carrier`

v0.14 replaces only the carrier below `route_block_device`:

`ATA PIO / legacy IDE → PCI-discovered AHCI / SATA`

The logical BlockFS region remains 32 × 512-byte blocks at LBA 256..287.

**Keeper:** ONE UPPER ROUTE, MULTIPLE CARRIERS.  
**Law:** SOURCE CONSTRUCTION IS NOT DEVICE CONTACT. NO RETURNED SECTOR, NO DING.

## Contact-exposed q35 correction

The first AHCI contact attempt reached `223/223 PASS` construction but produced a zero-byte boot serial log under QEMU q35. A controlled split then showed:

- the same v0.14 image on the legacy `pc` machine reached `JM_ROUTECORE_NATIVE64_ENTER`
- q35 with the v0.14 image did not reach kernel serial
- q35 with explicit SATA attachment still did not reach kernel serial
- the frozen v0.13-size carrier also failed the q35 pre-kernel route

This localized the failure below the AHCI driver itself.

QEMU's own x86 boot-sector test carries a q35 minimum raw-disk extent of `0x7e000` bytes. The inherited RouteCore disk was only 147,456 bytes (`0x24000`). The bounded correction therefore enlarged only the **outer raw disk carrier** to 1 MiB / 2048 sectors. BlockFS geometry and its LBA region did not move.

The q35 correction is preserved as a separate descendant patch:

`routecore/ahci-v0-14/q35fix.patch.gz.b64`

This keeps the contact history visible rather than rewriting the initial v0.14 attempt.

## Construction custody

Corrected construction result:

`224 / 224 PASS`

Corrected deterministic build disk SHA-256:

`489bd7e3b8bb8eddf25c5ac35aef2482e09e1ac3198056ea0f759b7473faf1cb`

Rebuild disk returned the same SHA-256.

Kernel ELF SHA-256:

`c53fe12ffcfa37eb4cfdab5a861e797240d240ae59e9dff73060800b06a17260`

Deterministic pre-contact package:

`JM_ROUTECORE_NATIVE64_AHCI_v0_14.zip`

Package SHA-256:

`bc7ae550dce8b91c76e57a654ae11938654be87c3442d2db7b6ddf93747e9621`

Package bytes:

`149578`

The package manifest correctly records:

- schema `jm.routecore.native64-ahci/0.14`
- carrier `PCI-discovered AHCI/SATA`
- qemu machine `q35`
- outer disk size `1048576` bytes
- unchanged logical block region: LBA 256, 32 blocks, 512 bytes/block

The package manifest intentionally says `runtime_contact: OPEN`: it is a pre-contact artifact. Runtime closure is supplied by this separate contact receipt.

## Runtime contact — boot 1

Boot 1 returned the live controller/device chain:

- `JM_ROUTECORE_NATIVE64_ENTER`
- `JM_AHCI_PCI_DISCOVERED`
- `JM_AHCI_PORT_READY`
- `JM_AHCI_READ_CONTACT`
- `JM_AHCI_WRITE_CONTACT`
- `JM_AHCI_FLUSH_CONTACT`
- `JM_AHCI_IDENTIFY_READY`
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

Boot 1 serial SHA-256:

`45e860f1a63729f63e46be965e19dae3da9c6bb234c42c481b07c0a38e608942`

## Runtime persistence — boot 2

The same AHCI-backed runtime disk was booted again. Boot 2 returned:

- `JM_ROUTECORE_NATIVE64_ENTER`
- `JM_AHCI_PCI_DISCOVERED`
- `JM_AHCI_PORT_READY`
- `JM_AHCI_READ_CONTACT`
- `JM_AHCI_IDENTIFY_READY`
- `JM_BLOCKFS_MOUNT_EXISTING`
- `JM_AHCI_WRITE_CONTACT`
- `JM_AHCI_FLUSH_CONTACT`
- `JM_BLOCK_DEVICE_BACKING_VERIFIED_T1`
- `JM_BLOCK_CACHE_INVALIDATE_T1`
- `JM_BLOCKFS_USER_CONTENT_VERIFIED_T1`
- `JM_PROCESS_EXIT_POOL_RESTORED_64`
- `JM_PROCESS_EXIT_SURVIVOR_T0`

Boot 2 serial SHA-256:

`41407607dfa8b6bd52038558b93b6fb614994db89c38e74266b95e0c61dfea6b`

The second boot mounted the existing BlockFS rather than formatting another one.

## Independent raw-disk court

Final raw-disk inspection returned:

- `PASS — raw AHCI BlockFS region`
- superblock: `magic=JM_BLOCKFS version=1 block_size=512 blocks=32`
- metadata: `owner=1 size=22 data_block=2`
- payload: `JM BLOCK DEVICE ROUTE`

Final runtime disk SHA-256:

`f87e53dc47b978e0da6b0c69430ab493b075933d94db743c09a7dc3e5cda6ab8`

The outer image is 1 MiB, while the logical BlockFS region remains at LBA 256..287. The additional outer extent exists only to satisfy the q35 boot carrier requirement; it does not enlarge or relocate the filesystem body.

## Actions artifact custody

Artifact ID:

`10992336554`

Actions artifact digest:

`sha256:d4b5f75553523669aa3d5c28eea73eafa857235ab6c642825f6223420431e54e`

The artifact contains the exact reconstructed v0.13 parent, original v0.14 patch, q35 correction patch, corrected v0.14 source/body, 224/224 proof, deterministic package, both boot serial logs, and final mutated runtime disk.

## Earned claim

**PASS:** the existing JM Ring-3/VFS/BlockFS/cache/generic-block route operated over a second distinct storage carrier: QEMU q35's emulated ICH9 AHCI/SATA controller. PCI AHCI discovery returned, a SATA port returned, IDENTIFY completed, sector reads returned, writes and FLUSH CACHE EXT completed, direct backing bytes verified, cache invalidation forced later device reload, Ring-3 verified the content, process reclaim completed, and the same filesystem persisted across a second boot.

Together with v0.13, this demonstrates the same upper storage body operating over both:

1. legacy ATA PIO / IDE
2. PCI AHCI / SATA

at their earned QEMU-emulated scopes.

## Explicitly not claimed

- physical SATA/AHCI hardware contact
- NVMe contact
- virtio-blk contact
- production-grade filesystem completeness
- hardware power-loss durability
- driver completeness beyond the bounded controller/port/command path tested here

## Keeper

**STORAGE IS A ROUTE, NOT A BYTE ARRAY.**  
**ONE UPPER ROUTE, MULTIPLE CARRIERS.**  
**CARRIER SWAP ≠ FILESYSTEM REBUILD.**  
**NO RETURNED SECTOR, NO DING.**

At QEMU q35 AHCI/SATA scope, the sector returned. **Ding earned.**
