# JM RouteCore Native64 — BlockFS Multi-Block & Deeper-Path Gate v0.17

Parent: **JM RouteCore Native64 BlockFS v0.16 runtime contact**, merged on main as `7abcd7a1d2ed7221298828de093763e238869a85`.

## Purpose

Advance the filesystem body again without reopening the already-proved carrier boundary.

v0.17 preserves the full v0.16 one-block allocation/unlink/reuse regression and adds:

- BlockFS on-disk version 3;
- nested path `/blk/docs/archive`;
- bounded contiguous file extents up to 4 × 512-byte blocks;
- cross-block reads and writes through the existing cache/device route;
- a deterministic 1200-byte three-block file payload;
- unlink/free of an entire three-block temporary extent;
- exact node + full three-block extent reuse by the replacement file;
- independent raw inspection of the complete 1200-byte payload and live allocation bitmap;
- reboot mounting and Ring-3 verification of B, C, and the multi-block file;
- a boot-2 court that forbids filesystem mutation and requires the raw carrier to remain byte-identical.

The lower carrier remains the already-proved **QEMU legacy/transitional PCI virtio-blk** path.

## Descendant carrier

The four `package/part*.b64` files concatenate (after whitespace normalization) into the deterministic v0.17 descendant carrier for the exact successful v0.16 body.

- raw patch SHA-256: `9411d3f234084bbf2ec6fe50b170ae0d372634cec563cd779201777097134d58`
- normalized concatenated Base64 carrier SHA-256: `04ebec2c8f835afdc2841c94b4d69002852e38b6975d6935ff7afcc5ca12a7c7`
- clean reapplication construction court: **245 / 245 PASS**
- clean disk SHA-256: `e86d98977c031fae1371a2740c5c5161609b776b2175d741fafd99ae2493d275`
- clean kernel ELF SHA-256: `aaafdf1787bc01c33f670d050376cb18d636fb3b5a5e7cae1ad5f8ee2fb42da2`
- runtime claim: **OPEN until QEMU returns the required contact evidence**

Superseded v0.16 proof JSON and the v2-only raw inspector are deliberately retired from the v0.17 descendant package. Their authoritative lineage remains in the merged v0.16 receipt/repo history.

## Runtime crown gate

No Ding unless the runtime returns this whole pressure route:

`fresh v3 format → v0.16 A→C exact reuse regression → /blk/docs/archive → create old.bin → grow old.bin to 1200 bytes / 3 blocks → unlink old.bin → create long.bin → grow long.bin to 1200 bytes → exact old node + full 3-block extent reuse → sync → independent raw backing verification → invalidate → Ring-3 B/C/long verification → normal exit → reboot → existing mount → B/C/long verification with no filesystem mutation → raw carrier byte-identical across boot 2`

## Explicit boundary

v0.17 does not claim crash/power-loss recovery, journaling/transactions, arbitrary fragmentation handling, concurrent mutation, production-grade filesystem completeness, NVMe, modern virtio PCI, or physical-owner-device storage contact.

## Keeper

**ONE BLOCK WAS NOT THE FILESYSTEM.**  
**DELETE MUST FREE THE WHOLE EXTENT.**  
**REUSE MUST RETURN THE WHOLE EXTENT.**  
**REBOOT MUST READ THE MULTI-BLOCK BODY WITHOUT REWRITING IT.**
