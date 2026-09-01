# RouteOS JM-Native Kernel v1.3A — SerialRoute Operational Receipt

## Status

**ROUTEOS JM-NATIVE SERIALROUTE — CONSTRUCTION MACHINE PASS**

This receipt records the machine-proven v1.3A construction head before frozen-head revalidation.

## Proven source and lineage

- Frozen v1.2A parent: `5ccde5f1c8f1692cbffcc87595fecddf7b25b349`
- Machine-tested v1.3A construction head: `10ee0efd49370901056a5aaa92bb38d2dc487bbe`
- Draft proof PR: `#69`
- Proof branch: `agent/routeos-kernel-jm-native-serialroute-v1-3a`
- Complete construction-head lineage: **14/14 workflows PASS**

## Open machine proof

- GitHub Actions run: `30676813931`
- Decisive job: `91305701078`
- Artifact ID: `8810763647`
- Artifact: `routeos-kernel-jm-native-v1.3A-serialroute-receipt`
- Artifact size: `3,333,633 bytes`
- Artifact digest: `sha256:7d77fb52ed274bfd7586a811da1d804aaeb21742cc5558086c6c376a29c05192`
- Machine step outcome: `success`
- Machine exit status: `0`
- Artifact checksum ledger: **23/23 files PASS**

## Exact machine hashes

- JM source SHA-256: `7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190`
- Generated SerialRoute C office SHA-256: `7c0a1b5ef42702a035832e9e375444206bb559d031c4810f316b54d9883aff14`
- Generated SerialRoute record SHA-256: `f54dd057ee56c88603083617f8b76b09065d5671412912740def643a096eda06`
- Integrated `routeos_kernel.c` SHA-256: `cbf672e44025a04ef77732d90fc075020cd591c98568386c80838b55ccf8e103`
- Linked kernel ELF SHA-256: `a184c20bec51734238f1172d0ec8627a2ffcfbed228cc624076e944328593b4e`
- Bootable GRUB ISO SHA-256: `e102ca5f664630ec7a5be1838853289bf40a5564634cf0258516942dc5bce437`
- QEMU boot trace SHA-256: `751fbe86b1a4bf5dbaa023659dcd66ad6b2bd0f1aa4afdc0c8e3d8c2ebf8d3cb`

## Singular integration proof

The integration receipt records:

- removed handwritten serial block SHA-256: `25143fc965bdb66140825eb1c26c94b902b2d226e436de68cedae0e287e2dc6c`;
- generated SerialRoute count: `1`;
- handwritten `serial_init` residue: `0`;
- integrated kernel SHA-256: `cbf672e44025a04ef77732d90fc075020cd591c98568386c80838b55ccf8e103`.

## Executable symbol proof

The linked ELF contains live generated symbols:

- `jm_generated_serialroute_init` at `0x101270`;
- `jm_generated_serialroute_write` at `0x101330`;
- `jm_generated_serialroute_char` at `0x101390`;
- `jm_generated_serialroute_u64` at `0x1013b0`;
- `jm_generated_serialroute_receipt` at `0x101460`;
- `jm_generated_serialroute_source` at `0x1041f0`.

## Runtime machine proof

The QEMU trace proved:

1. The generated source identity was emitted exactly once:
   `[JM] SERIALROUTE GENERATED v1.3A SOURCE 7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190 ACTIVE`.
2. Both generated user bodies entered CPL3 and crossed PermissionGate.
3. User Body 2 completed exactly three controlled TRACE_READ calls and then issued its deliberate invalid opcode.
4. FaultHold caught the invalid opcode exactly once.
5. RecoveryBody blocked only the faulting body and selected the safe body exactly once.
6. User Body 1 continued through PermissionGate **116,479 times** before the proof timeout ended QEMU.

## Carrier-recovery provenance

The branch was initially recovered as a zero-diff placeholder. Several archive and chunk transport attempts then failed before compilation. Those attempts remain preserved as provenance. They are not machine proof and are not executable authority.

The successful construction uses ordinary readable repository files for the v1.3A source, deterministic compiler, generated office, generation record, singular-seam integrator, eight adversarial tests, preparation gate and machine enforcement. The archive experiments no longer control execution.

## Proven stack

`ImageCarrier → BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → FrameCarrier → InterruptEntry → UserProgram Body 1 / Body 2 → PermissionGate → SerialRoute → FaultHold → RecoveryBody → safe Body 1 continuation`

## Claim boundary

This machine PASS proves deterministic JM generation of the bounded COM1 SerialRoute used by this RouteOS proof body: UART setup, transmit-ready polling, CRLF newline normalization, unsigned decimal formatting, receipt framing and live source-identity emission. It proves exact removal of the inherited handwritten serial function block and survival of the complete inherited fault/recovery route in QEMU.

It does **not** prove a general device-driver generator, arbitrary UART hardware support, interrupt-driven serial I/O, buffering, concurrency-safe logging, filesystems, storage, networking, every CPU exception family, a general-purpose operating system or a wholly JM-generated kernel.

This is a construction receipt. A final DING additionally requires a freeze lock, permanent anchor and **14/14 frozen-head revalidation**. The PR remains draft and unmerged.