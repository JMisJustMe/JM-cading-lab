# RouteOS JM-Native Kernel v1.1A — BootCarrier + PageRoute + LongModeRoute + PrivilegeLoader Operational Receipt

## Status

**ROUTEOS JM-NATIVE BOOTCARRIER + LONGMODEROUTE DING: PASS**

## Proven source and lineage

- Frozen v1.0A parent: `276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96`
- Machine-tested v1.1A source head: `5a41ebe50aff114bffa3bcfd1b83d65f3be77eee`
- Draft proof PR: `#66`
- Proof branch: `agent/routeos-kernel-jm-native-bootroute-v1-1a`

## Open machine proof

- GitHub Actions run: `30598111649`
- Decisive job: `91054821552`
- Artifact ID: `8780897813`
- Artifact: `routeos-kernel-jm-native-v1.1A-bootcarrier-longmoderoute-receipt`
- Artifact size: `3,310,103 bytes`
- Artifact digest: `sha256:4c90aa933d91d6b57b7d19ac3c0d051db07c2259c097215f50c9f05b87480184`
- Machine step outcome: `success`
- Machine exit status: `0`
- Artifact checksum ledger: **25/25 files PASS**
- Complete source-head lineage: **12/12 workflows PASS**

## Exact machine hashes

- JM source SHA-256: `b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638`
- Generated boot head SHA-256: `bee4f7c6e12a27c0de82ebc6369d7bc6e11e918b4f07a6b80fb57e3b40a027f2`
- Generated boot storage SHA-256: `a5b6f66d9f4d98973432bb1b7bc2525c5a1ebaf81466915ac6e0349e6799694b`
- Integrated `boot.S` SHA-256: `0a5b4ba6ba2b3dd02d71e41897f674b5c9eca67946ce82cc262e352a527865c8`
- Linked kernel ELF SHA-256: `2ad774cbbcbe0db7626ee951e2a559daf5068d892ae40466461fac527d258f9e`
- GRUB ISO SHA-256: `218914aed669f7afcca1d9d735fddd1089079fdf5ec30c55a254d752f5855253`
- QEMU boot trace SHA-256: `e1509118f3fead726da5e302b071440ec17aa49d2258870b3eda1d57ea2334ab`

## Singular integration proof

The integration receipt records:

- handwritten assembly before SHA-256: `93f3372a30da7c3d0739504da807e123dfdde66a59e6cb84e13d514d7e9f4c69`;
- generated assembly after SHA-256: `0a5b4ba6ba2b3dd02d71e41897f674b5c9eca67946ce82cc262e352a527865c8`;
- handwritten boot head remaining: `0`;
- generated boot head count: `1`;
- generated boot-storage count: `1`;
- inherited v1.0A FrameCarrier / InterruptEntry count: `1`;
- inherited user-program byte carrier count: `1`.

## Executable machine proof

The linked ELF contains the generated source identity and live generated symbols:

- `_start`;
- `long_mode_entry`;
- `routeos_load_gdt`;
- `routeos_load_tr`;
- `routeos_reload_cr3`;
- `boot_pml4`, `boot_pdpt`, `boot_pd`, `boot_pts`;
- `jm_generated_bootroute_source`.

Disassembly enforcement proved the early processor route:

`Multiboot2 → _start → clear page-table storage → construct 64 MiB identity map → CR4.PAE → EFER.LME → CR3 → CR0.PG → LGDT → far jump → code64 → routeos_kernel_entry`

It separately proved the live privilege helpers:

`LGDT + far return`, `LTR`, and `CR3 read/reload`.

Because serial is not active before the generated early route reaches the kernel, BootRoute identity is embedded and enforced in the linked ELF rather than falsely claimed as an early serial trace. QEMU reaching the inherited generated kernel body proves that the generated boot route successfully performed the handoff.

## Surviving runtime route

The same QEMU trace proved:

1. IgnitionBody activated.
2. MemoryBody allocated and released correctly.
3. DescriptorBody, BodyRegistry, UserBoundary and InterruptRoute activated.
4. FrameCarrier and InterruptEntry crossed into CPL3 and back.
5. RouteScheduler and PermissionGate remained operational.
6. User Body 2 deliberately triggered invalid opcode.
7. FaultHold contained only the faulting body.
8. RecoveryBody selected the safe body.
9. User Body 1 continued crossing the syscall gate after recovery.

## Proven stack

`BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → PermissionGate → FaultHold → RecoveryBody → FrameCarrier → InterruptEntry`

## Claim boundary

This DING proves deterministic JM-generated executable early boot, bootstrap page-table construction, x86-64 long-mode transition and live GDT/TR/CR3 helper carriers inside the inherited RouteOS hard-body proof.

It does **not** claim generated linker scripts, generated GRUB configuration, generated user-program instruction bytes, dynamic page allocation beyond the frozen 64 MiB bootstrap map, every CPU exception family, elimination of every handwritten carrier, or a wholly generated kernel.

The PR remains draft and unmerged. Proof and merging are separate decisions.
