# JM RouteCore Native64 — BlockFS Fragmented Allocation / Free-Space Pressure Gate v0.21

Parent: **proved v0.20 interrupted-recovery re-entry contact**, merged through PR #263 at main commit `2636673e5fd614a8ef3926de74677fd98e8ad516`.

## Purpose

v0.21 advances the filesystem above the already-proved storage-carrier boundary.

BlockFS v6 preserves the existing contiguous representation and adds a map-backed fragmented representation without enlarging the node body.

The fresh runtime court deliberately fills free space until only blocks **9, 12, 15 and 18** remain available. `frag.bin` must therefore fail contiguous 3-block growth and convert to map-backed storage. After deletion, `reuse.bin` must independently reuse the exact same scattered map/data route.

The pressure file is then removed, cache state is invalidated, the replacement is reread, and a second boot must preserve the fragmented mapping and content.

The same v6 body then runs the inherited v0.20 interrupted-recovery re-entry matrix against contiguous `long.bin`, proving the new allocation route did not silently replace the existing recovery route.

## Exact-parent construction custody

The descendant was produced from the exact successful v0.20 Actions work body.

- **288 / 288 PASS**
- deterministic same-host rebuild: **PASS**
- local boot image SHA-256: `7477d46394c1d97b34485b173d7d316247a279c83a0f6a2357d6eafed61d068c`
- local kernel ELF SHA-256: `cc5b8e62c85f69e9adc2487b349926195836c8246757c2213d405d04a78a9765`
- raw v0.21 patch SHA-256: `7538aa09ea674a1edbcb850ec109dd277744afa75c7bc985b2accf49e4848494`
- normalized Base64 carrier SHA-256: `91f2dcff9a2b2f7919fe99b65601c5941ff1e81ce2b1313871ebad42d3a80120`

Construction proof is **not** runtime proof. Local binary hashes are custody evidence only and are not required to equal hosted-runner hashes across different toolchains.

## Crown gate

The QEMU runtime court must return all of the following:

1. free-space pressure consumes every data block except the four intentionally isolated free blocks;
2. `frag.bin` is forced into map-backed non-contiguous storage;
3. deleting `frag.bin` frees its map + scattered data blocks;
4. `reuse.bin` independently reuses the exact same scattered route;
5. raw block-device inspection verifies the map, data blocks, payload pattern and full-pressure bitmap;
6. pressure is released, cache is invalidated, and `reuse.bin` rereads correctly;
7. a second boot mounts the existing BlockFS v6 body and preserves `reuse.bin` mapping/content;
8. the inherited v0.20 interrupted-recovery re-entry matrix still passes against contiguous `long.bin`.

**NO RETURNED FRAGMENTATION + REUSE + PERSISTENCE + RECOVERY MATRIX, NO DING.**
