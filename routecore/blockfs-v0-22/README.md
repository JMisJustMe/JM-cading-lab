# JM RouteCore Native64 — BlockFS Fragment-Aware Recovery & Re-entry Gate v0.22

Parent: **JM RouteCore Native64 BlockFS v0.21 fragmentation-pressure runtime contact**, successful Actions run `36596217966`, artifact `jm-routecore-blockfs-v0-21-fragmentation-contact`.

## Purpose

Advance the already-proved BlockFS v6 fragmented layout without reopening carrier independence or clean fragmentation persistence.

v0.22 reinterprets the existing bounded 64-byte recovery journal's `old_start` / `new_start` fields as packed four-slot physical-block maps, changes the recovery guard from `REC5` to `REC6`, and requires recovery semantics to operate on fragmented maps rather than pretending each file is one contiguous extent.

## Crown court

1. Start from the proved fragmented logical file shape (`long.bin` non-contiguous, interior hole already reused by `reuse.bin`).
2. Stage a second, disjoint **fragmented** shadow map.
3. DATA_READY rollback must restore the exact byte-identical fragmented baseline.
4. COMMITTING forward recovery must switch to the shadow map and preserve the shadow bytes.
5. Interrupt rollback recovery after shadow-map zeroing and require safe re-entry.
6. Interrupt forward recovery after metadata switch and after old-map zeroing; both routes must re-enter and converge to the same final carrier bytes.
7. One further clean reboot must not mutate either recovered result.
8. A checksum-damaged journal must be rejected without entering user mode or modifying the carrier.

## Construction status

Exact-parent local replay:

- **283 / 283 PASS**
- deterministic same-host rebuild: **PASS**
- boot image SHA-256: `b4074cd9648525a5e283a56b1f4a950bc43a38fcfbfa03c018f515f7013e86b9`
- kernel ELF SHA-256: `6b301b3e5cb5ab734065b115ae4c347e916d8b8fc3acca6679578fd5d82b04f0`
- runtime contact: **OPEN until QEMU returns**

## Exact descendant custody

- decoded raw patch SHA-256: `fff4b3c4fc474b38453aaa211d6113e040e675bde0120a0e859f586715e3a8e4`
- normalized Base64 carrier SHA-256: `8cc52baa6650fa06f98db22fd85dd65829d4cde96bf8c091a180ce5e13ec3a5c`

The connector-seated GitHub copy was re-read in full before workflow creation and returned the same normalized Base64 SHA-256.

## Scope ceiling

This does not claim general ACID transactions, concurrent mutation, arbitrary journal length, more than four mapped blocks per file, physical power-loss atomicity, NVMe, modern virtio PCI transport, or physical-owner-device storage contact.

**NO RETURNED FRAGMENT-AWARE RECOVERY MATRIX, NO DING.**
