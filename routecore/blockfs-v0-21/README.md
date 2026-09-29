# JM RouteCore Native64 — BlockFS Fragmentation Pressure Gate v0.21

Parent: **JM RouteCore Native64 BlockFS v0.20 interrupted-recovery re-entry runtime contact**, closed on main at commit `2636673e5fd614a8ef3926de74677fd98e8ad516`.

## Purpose

Advance the filesystem above the closed v0.20 recovery-reentry result by removing the current contiguous-extent-only allocation assumption.

BlockFS v6 keeps the 56-byte node body but changes file `data_block` semantics into a bounded packed map of up to four physical block IDs. Logical file order therefore no longer requires physical adjacency.

## Pressure route

The runtime court must return this exact shape:

1. preserve the earlier single-block reuse and three-block `old.bin → long.bin` reuse lineage;
2. create `long.bin` at 1200 bytes / three blocks;
3. create `pin.bin` so the immediately next free block is occupied;
4. append 400 bytes to `long.bin`, forcing its fourth logical block to be allocated past the pin;
5. prove the resulting `long.bin` physical map is non-contiguous while its 1600-byte logical content remains exact;
6. unlink `pin.bin` and create `reuse.bin`, requiring the newly freed interior hole to be reused;
7. inspect raw backing bytes + bitmap independently;
8. reboot twice without recreation and require the persistent carrier to remain byte-identical.

## Recovery boundary

The v0.20 v5 journal/re-entry implementation is retained as parent source evidence but is **not executed against BlockFS v6 fragmented maps**. A non-zero journal on a v6 mount is rejected with `JM_BLOCKFS_V6_FRAGMENT_RECOVERY_OPEN`.

Fragment-aware rollback/forward/re-entry is therefore the next gate, not a claim bundled into v0.21.

## Construction status

Local exact-parent descendant build:

- **277 / 277 PASS**
- deterministic same-host rebuild: **PASS**
- runtime contact: **OPEN until QEMU returns**

## Crown gate

**NO RETURNED FRAGMENTED PERSISTENCE COURT, NO DING.**

## Descendant carrier

The exact-parent descendant patch is stored as five numbered Base64 carrier parts for connector-safe repo seating. Concatenating them in lexical order yields normalized Base64 SHA-256 `e76421bd62b9f75d5a3c3ed47d451434ac597fb1a2aedad88f43160757aeab2c`; decoding + gunzip yields raw patch SHA-256 `9643b88346da5f5283424680443fc7c7f2beb61f3d28944f7aa97526712dff07`.
