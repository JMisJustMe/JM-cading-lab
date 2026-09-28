# JM RouteCore Native64 — BlockFS Growth Gate v0.16

Parent: **JM RouteCore Storage Carrier Independence FLAZ v1.0** and the exact proved **Native64 virtio-blk v0.15** runtime body.

## Purpose

Advance the filesystem above the now-proved generic block-device boundary instead of spending the next stage on another carrier swap.

v0.16 changes the bounded BlockFS body from one fixed file into a persistent v2 layout with:

- 8 persistent node slots;
- a persistent 32-block allocation bitmap;
- hierarchical path traversal under `/blk`;
- runtime directory creation;
- multiple one-block files;
- unlink/free;
- exact lowest-free node and data-block reuse;
- independent raw metadata/bitmap/payload inspection;
- cache invalidation and full Ring-3 readback;
- a separate boot-2 existing-mount path that verifies surviving files without recreating or rewriting them.

The carrier remains the already-proved QEMU legacy/transitional PCI virtio-blk path. **Carrier work is not being rebuilt.**

## Descendant carrier

`v016.patch.gz.b64` is a compact, deterministic descendant patch applied to the recovered v0.15 source body.

- raw patch SHA-256: `4a73b2e9414dd799939747959ae72154d73c2a9085bd74de7226e57e181af92c`
- Base64 carrier SHA-256: `99c6a14d33d369c47f76be1b0e365f66df5141ee33f10e2e10f8ccf5c2f7a422`
- local reapplication court: **237 / 237 PASS**
- runtime claim: **OPEN until QEMU returns the required contact evidence**

## Runtime crown gate

No Ding unless all of this returns:

`fresh format → /blk/docs → create A+B → unlink A → create C → exact node+block reuse → write B+C → sync → raw backing verification → invalidate → Ring-3 B+C verification → normal exit → reboot → existing mount → B+C verification with no recreate/write lifecycle → raw carrier byte-identical during boot 2`

## Keeper

**THE CARRIER IS CLOSED ENOUGH TO ADVANCE THE BODY ABOVE IT.**  
**ALLOCATION MUST RETURN THROUGH PERSISTENT METADATA.**  
**DELETE MUST FREE. REUSE MUST BE OBSERVED. REBOOT MUST READ WHAT THE FIRST BOOT LEFT.**
