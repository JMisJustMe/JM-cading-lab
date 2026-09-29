# JM RouteCore Native64 — BlockFS Fragmentation Pressure Contact Receipt v0.21

**Date:** 2026-09-29  
**State:** DING EARNED · BLOCKFS v0.21 FRAGMENTATION PRESSURE PASS  
**Parent:** JM RouteCore Native64 BlockFS Interrupted Recovery Re-entry Contact v0.20  
**Parent main closure:** `2636673e5fd614a8ef3926de74677fd98e8ad516`  
**Contact branch:** `routecore-blockfs-v0-21-fragmentation-contact`  
**Successful contact head:** `7dae67d70d11f0392c0f484d6bdcfaca8584b863`  
**Successful Actions run:** `36596217966` (run #3)  
**Successful job:** `109501685926`

## Governing advance

v0.20 closed interrupted recovery re-entry for the bounded contiguous-extent BlockFS v5 body.

v0.21 asks the next filesystem question:

`contiguous extent → deliberate allocation obstruction → non-contiguous logical file → interior-hole reuse → clean reboot persistence`

The on-disk BlockFS version advances from **v5 → v6**.

v6 keeps the existing 56-byte node body, but file `data_block` is now a bounded packed map of up to four physical block IDs. `reserved` remains the logical block count. Logical file order therefore no longer requires physical adjacency.

## Exact-parent custody

The v0.21 descendant was generated against the exact successful v0.20 Actions work body recovered from:

- run: `36510188647`
- artifact: `jm-routecore-blockfs-v0-20-recovery-reentry-contact`

The v0.21 workflow independently recovered that parent, required the parent proof to return **272 / 272 PASS** with deterministic same-host rebuild, then applied the fixed descendant.

Descendant custody:

- normalized Base64 carrier SHA-256:  
  `e76421bd62b9f75d5a3c3ed47d451434ac597fb1a2aedad88f43160757aeab2c`
- decoded raw patch SHA-256:  
  `9643b88346da5f5283424680443fc7c7f2beb61f3d28944f7aa97526712dff07`

The Base64 carrier is seated as five numbered parts. Lexical concatenation is hash-gated before decode.

## Construction court

Local exact-parent replay returned:

- **277 / 277 PASS**
- deterministic same-host rebuild: **PASS**

GitHub Actions independently returned:

- **277 / 277 PASS**
- deterministic same-host rebuild: **PASS**
- Actions boot image SHA-256:  
  `b7a157797402c9b5681ec39151579cff45599920e73944525cd142cca4301ff0`
- Actions kernel ELF SHA-256:  
  `72e183ee9474d4881e3760ef13af90113b20f16567f0ffc630ff139f9ffc1396`

Cross-toolchain byte identity between local and Actions builds is not claimed. Same-host determinism remains mandatory.

## Runtime fragmentation pressure court

### Boot 1 — fresh mutation

QEMU returned:

- `PASS — BlockFS v0.21 runtime mode: fresh fragmentation pressure`
- `PASS — raw BlockFS v6 fragmented persistent layout`

The deliberate pressure route produced:

- `long.bin` logical size: **1600 bytes**
- `long.bin` physical blocks: **[5, 6, 7, 9]**
- deleted pin hole: **block 8**
- `reuse.bin` allocation: **block 8**
- bitmap: `0x800003ff`

Therefore the fourth logical block of `long.bin` was forced past the live pin, producing a genuinely non-contiguous map, and the freed interior hole was subsequently reused by `reuse.bin`.

Independent raw inspection verified the logical contents, node map, bitmap, deletion state, and clean journal.

Persistent data-carrier SHA-256 after Boot 1:

`c6592cb38755060c5e82225a5cc58aa59e3dee49f0b4ab593eb2900402c690f1`

### Boot 2 — existing fragmented persistence

QEMU returned:

- `PASS — BlockFS v0.21 runtime mode: existing fragmented persistence`
- raw layout PASS
- `long_blocks=[5, 6, 7, 9]`
- `reuse_block=8`

Carrier SHA-256 remained:

`c6592cb38755060c5e82225a5cc58aa59e3dee49f0b4ab593eb2900402c690f1`

### Boot 3 — second clean remount

QEMU again returned the existing-fragmented-persistence PASS and the same raw mapping.

Carrier SHA-256 again remained:

`c6592cb38755060c5e82225a5cc58aa59e3dee49f0b4ab593eb2900402c690f1`

The court therefore returned:

`PASS — fragmented long.bin mapping + interior-hole reuse survived two clean remounts with byte-stable carrier.`

## Recovery boundary

The v0.20 v5 journal/re-entry source remains preserved as parent lineage, but it is **not applied to v6 fragmented maps**.

A non-zero journal encountered under the v6 mount path is rejected with:

`JM_BLOCKFS_V6_FRAGMENT_RECOVERY_OPEN`

This is deliberate scope control, not a hidden omission. v0.21 earns fragmentation + reuse + clean persistence; it does not silently inherit contiguous-journal correctness for fragmented files.

## Actions custody

Successful artifact:

- name: `jm-routecore-blockfs-v0-21-fragmentation-contact`
- artifact ID: `11045897917`
- size: `1,472,628` bytes
- digest:  
  `sha256:0d12caf4564f8121caf642070315b4e2bc7ec9a37d6d3cc3c39d06079a940374`
- run: `36596217966`
- job: `109501685926`

## Earned conclusion

**PASS:** at the existing QEMU legacy/transitional virtio-blk scope, RouteCore BlockFS v6 now supports a bounded non-contiguous four-block file map and has dynamically demonstrated:

- deliberate fragmentation under live free-space pressure;
- correct logical read/write across the fragmented map;
- unlink of the obstructing pin;
- reuse of the freed interior hole by a new file;
- independently inspected raw node-map + bitmap agreement;
- preservation of the fragmented layout and file contents across two clean remounts;
- byte-identical persistent carrier across both remounts.

**DING EARNED at the declared v0.21 fragmentation-pressure scope.**

## Explicitly not claimed

This receipt does **not** claim:

- fragment-aware rollback / forward crash recovery;
- interrupted recovery re-entry over fragmented maps;
- more than four physical blocks per file;
- scalable or arbitrary fragmentation;
- general ACID transactions;
- concurrent filesystem mutation;
- production-grade filesystem completeness;
- physical-media power-loss atomicity;
- NVMe contact;
- modern virtio PCI capability transport;
- physical-owner-device storage contact.

## Forward frontier

The strongest next filesystem advance is:

`fragmented files → fragment-aware transaction journal → rollback/forward recovery → interrupted recovery re-entry → convergence in raw bytes`

That should be treated as the next BlockFS gate rather than being folded retroactively into v0.21.

Separate transport frontiers remain:

`NVMe / modern virtio / physical owner-device contact`

## Keeper

> CONTIGUOUS ORDER IS NOT LOGICAL ORDER.  
> A HOLE MUST BE SURVIVABLE BEFORE IT IS REUSABLE.  
> REUSE MUST RETURN IN THE BITMAP AND THE BYTES.  
> CLEAN REMOUNT MUST NOT REWRITE A STABLE CARRIER.  
> OLD RECOVERY RULES DO NOT EARN NEW LAYOUTS FOR FREE.  
> NO RETURNED FRAGMENTED PERSISTENCE COURT, NO DING.  
> THE COURT RETURNED.

**DING EARNED · v0.21 CONTACT CLOSED AT DECLARED RUNTIME SCOPE.**
