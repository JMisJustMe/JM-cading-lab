# JM RouteCore Native64 — BlockFS Fragmentation / Free-Space Pressure Gate v0.21

**Parent:** BlockFS v0.20 interrupted-recovery re-entry, DING earned on Actions run `36510188647`.

## Purpose

v0.21 advances the filesystem above the already-proved carrier and recovery boundaries:

`contiguous extents → mapped non-contiguous blocks → hole reuse → full free-space pressure → clean no-space rejection → reboot persistence`

BlockFS advances to on-disk **v6** for this proof body. The node table remains bounded; block-map metadata is carried separately and maps logical file blocks to physical data blocks.

## Pressure court

A fresh v6 carrier must prove one deliberately awkward allocation route:

1. create/grow `frag.bin` and `pin.bin` in an interleaved pattern;
2. delete `pin.bin` to open holes;
3. continue growing `frag.bin` so it reuses those non-contiguous holes;
4. end with the exact 12-block `frag.bin` map:
   `[8,10,12,14,16,18,9,11,13,15,17,19]`;
5. consume every remaining data block with `fill.bin`;
6. require one further growth to fail cleanly with the bounded no-space result rather than overlap/corrupt another file;
7. delete `fill.bin`;
8. reboot the same carrier and prove `frag.bin` bytes + map persist;
9. reboot once more and require byte-stable carrier persistence.

## Construction status

Exact-parent local replay from the proved v0.20 Actions artifact returned:

- **281 / 281 PASS**
- deterministic same-host rebuild: **PASS**
- disk image SHA-256: `b3af71ab92316d165dbae93786ecbd0052d68e3f384e14d26d1bfadddde7fef1`
- kernel ELF SHA-256: `ccafcb750876596a2a1b460a20113f7f5a9f5db86a6822d154821014b2d79b8e`

Exact-parent descendant custody:

- decoded patch SHA-256: `e790f04f5de87d18f5250d153abe412ddbe485cdfa6c68cbbd971fd5ae5b7ace`
- normalized Base64 carrier SHA-256: `bc4d1cb30835ba59e7ab7850a610c4a4020104948405d524b64f2c17ad526738`
- carrier length: **27,688 bytes**, split into four bounded GitHub parts solely to avoid connector truncation.

Construction is not runtime contact. Local QEMU was unavailable, so no runtime claim is made from the local court.

## Explicitly not yet claimed

v0.21 does not, by construction alone, claim:

- runtime fragmentation/pressure contact;
- crash-safe transactional updates of the new BlockFS v6 map;
- recovery from interrupted fragmented-map mutation;
- arbitrary filesystem scale;
- concurrent mutation;
- production-grade filesystem completeness;
- NVMe / modern virtio / physical-owner-device storage contact.

## Crown gate

**NO RETURNED FRAGMENTATION / PRESSURE / REBOOT MATRIX, NO DING.**
