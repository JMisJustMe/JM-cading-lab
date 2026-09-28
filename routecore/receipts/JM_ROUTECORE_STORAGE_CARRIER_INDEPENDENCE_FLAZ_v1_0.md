# JM RouteCore — Storage Carrier Independence FLAZ v1.0

**Date:** 2026-09-28  
**State:** FLAZ COMPLETE · FROZEN · LOCKED · ANCHORED · REPO-SEATED  
**Scope:** QEMU-emulated storage-carrier independence of the already-proved upper RouteCore storage path  
**Parents:** Native64 ATA PIO v0.13 · Native64 AHCI/SATA v0.14 · Native64 legacy virtio-blk v0.15

## Closed body

The same upper storage route has now returned successful runtime and persistence evidence across three materially distinct carrier implementations:

`Ring-3 file call → VFS → BlockFS → 4-line write-back cache → generic block-device interface → carrier`

| Carrier | Earned contact | Persistence | Independent backing inspection |
| --- | --- | --- | --- |
| ATA PIO / legacy IDE — v0.13 | PASS | two-boot PASS | PASS |
| PCI AHCI / SATA — v0.14 | PASS | two-boot PASS | PASS |
| PCI legacy/transitional virtio-blk — v0.15 | PASS | two-boot PASS | PASS |

The carrier changed below the generic block-device boundary. VFS, BlockFS, the write-back cache, Ring-3 file semantics, and the persisted 22-byte user payload route remained the governing upper body.

## Evidence anchors

### v0.13 — ATA PIO

- construction: **216 / 216 PASS**
- successful Actions run: **36465295968**
- final runtime disk SHA-256: `f5360fa5e101802d72f92d6e2cd96fa09d69836371da64fa83c23b7da6a50103`
- raw payload: `JM BLOCK DEVICE ROUTE`
- receipt: `routecore/receipts/JM_ROUTECORE_NATIVE64_ATA_PIO_v0_13_CONTACT_RECEIPT.md`

### v0.14 — AHCI/SATA

- construction: **224 / 224 PASS**
- successful Actions run: **36472188494**
- final runtime disk SHA-256: `f87e53dc47b978e0da6b0c69430ab493b075933d94db743c09a7dc3e5cda6ab8`
- raw payload: `JM BLOCK DEVICE ROUTE`
- receipt: `routecore/receipts/JM_ROUTECORE_NATIVE64_AHCI_v0_14_CONTACT_RECEIPT.md`

### v0.15 — virtio-blk

- construction: **228 / 228 PASS**
- successful Actions run: **36481801826**
- final persistent data-carrier SHA-256: `f871cbab4386f9d1b544e47716d06df1613cd9a55059c9307f6f20946d2d6fa1`
- raw payload: `JM BLOCK DEVICE ROUTE`
- receipt: `routecore/receipts/JM_ROUTECORE_NATIVE64_VIRTIO_BLK_v0_15_CONTACT_RECEIPT.md`

## Earned conclusion

At the stated QEMU-emulated scopes, **carrier independence is demonstrated for the bounded RouteCore upper storage route**.

This is stronger than three unrelated storage demos. The relevant invariant is that the same higher file/storage body survived replacement of the lower carrier across:

1. programmed-I/O legacy ATA,
2. memory-mapped AHCI/SATA controller operation, and
3. paravirtual virtio queue transport.

**CARRIER SWAP ≠ FILESYSTEM REBUILD** is therefore closed as an earned architectural result at this bounded scope.

## What this closure does not claim

This FLAZ does **not** claim:

- physical owner-device storage contact;
- NVMe contact;
- modern virtio PCI capability transport;
- production-grade filesystem completeness;
- hardware power-loss durability;
- that every possible block carrier will satisfy the generic boundary.

Those remain advancement frontiers rather than completion debt for the three-carrier result.

## Forward route

The carrier-independence question is now sufficiently closed to stop spending the next build merely swapping controllers.

The next engineering body is the filesystem above that boundary:

`single bounded BlockFS file → multiple persistent objects → allocation/free/reuse → directory/path traversal → reboot persistence → recovery pressure`

NVMe and physical-device contact remain later independent contact gates.

## Keeper

> STORAGE IS A ROUTE, NOT A BYTE ARRAY.  
> ONE UPPER ROUTE, MULTIPLE CARRIERS.  
> CARRIER SWAP != FILESYSTEM REBUILD.  
> THREE DISTINCT CARRIERS RETURNED THROUGH ONE UPPER STORAGE BODY.  
> ADVANCE THE BODY ABOVE THE BOUNDARY.

**FLAZ COMPLETE at QEMU three-carrier independence scope.**
