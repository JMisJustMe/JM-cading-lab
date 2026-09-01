# RouteOS JM-Native Kernel v1.4A — ProtectionRoute Operational Receipt

## Status

**ROUTEOS JM-NATIVE PROTECTIONROUTE — MAX-STRENGTH CONSTRUCTION MACHINE PASS**

This receipt records the machine-proven v1.4A construction head before frozen-head revalidation.

## Proven lineage

- Frozen v1.3A parent: `e6f037ac3f3d42c4b56218307b5f738f0c6a4b70`
- Machine-tested v1.4A construction head: `8c280d679635942355c156cc835b0f7761eeaee0`
- Draft proof PR: `#72`
- Proof branch: `agent/routeos-kernel-jm-native-protectionroute-v1-4a`
- Complete construction-head lineage: **15/15 workflows PASS**

## Open machine proof

- GitHub Actions run: `30680557264`
- Decisive job: `91316591352`
- Artifact ID: `8812057330`
- Artifact: `routeos-kernel-jm-native-v1.4A-protectionroute-receipt`
- Artifact size: `3,315,889 bytes`
- Artifact digest: `sha256:c9fb4171ed6b27fa7078656335e14ffa35ef335cc2b35f83400367c0cb8cbc3a`
- Machine step outcome: `success`
- Machine exit status: `0`
- Artifact checksum ledger: **28/28 files PASS**

## Generated offices

1. **DescriptorInstall** — GDT entries, TSS descriptor, ring-0 interrupt stack and GDTR/TR activation.
2. **VectorRoute** — IDT entry encoding and installation for invalid opcode, PIT timer and controlled `int 0x80`.
3. **InterruptController** — PIC remap/mask preservation and PIT channel-0 programming.
4. **UserMapRoute** — user permission propagation through the frozen page-table hierarchy and CR3 reload.
5. **BodyFrameInstall** — user image copy, stack clearing and initial CPU-frame construction for both bodies.

## Exact machine hashes

- JM source SHA-256: `50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14`
- DescriptorInstall generated unit: `1933b4545d34f6c9b34c963f82e25ea85ecc273a6e3c81d3f1bd1cd99a5a84c9`
- VectorRoute generated unit: `e39bb94a00ddd4b46ebf2cbcabd36bd6c090ec192d0c3d54a3b2f33a197b5824`
- InterruptController generated unit: `2489b9a30311b023de78a12cc5e2912d7c982444c45f4929cf52ee9eb8f72302`
- UserMapRoute + BodyFrameInstall generated unit: `a5eb4d25d272d2349fe64f2e01cf19e56409249740ca4a558bfd123e2c25aa7e`
- Generation record: `d6862304754cd3eff5f330751c965226f4bb5256ebaf7835f53469ae4def312a`
- Exact ELF office-retention contract: `772a54aa7c64ed9c25b94f6af901cf7cc0e01c2d65ca4c7f147f969288d9939f`
- Integrated `routeos_kernel.c`: `b7493d6c6a3e9b517df567cb078c25b32aeda0fc26ef1a89fa4dad54ff7e1425`
- Linked kernel ELF: `80437b5bc55ae614c38c935365800d438ae62165f05043e033c848df2a95e6f0`
- Bootable GRUB ISO: `d6eea5dc55d29f7c0d79ab09e5d5116badfe0ee8d59d18726b177ab1059807b2`
- QEMU trace: `b399b3f70f71e5713e3d5e4dfc82c5d20c4e31d3f76c26e26dc3ae06bb6be137`

## Singular seam removal

The integration receipt records four exact removed handwritten blocks:

- DescriptorInstall seam: `930dedc597eac858b9923127df4e485f17bf8676895a47785dcedaf9d07ccc88`
- VectorRoute seam: `36676cb36bffcf857957655bb3157a0fb52533d607a041ec59e954a144a3f0d8`
- InterruptController seam: `866fbaadc85e5d7d25e5e8a548c9e7fcb0c2dc205c696f575fb94b1cdcdf846a`
- UserMapRoute + BodyFrameInstall seam: `641a562950998492d42c759866a9f473820925d664f253bc507a9d5252d62cb7`

Generated marker counts are one each, and handwritten residue is zero for:

- `gdt_install`
- `idt_set`
- `idt_install`
- `pic_pit_install`
- `mark_user_page`
- `user_boundary_install`

## Exact executable office boundaries

The max-strength retention contract forces each generated office to remain an independently addressable ELF symbol while permitting small internal helpers to inline:

- `jm_generated_descriptorinstall` at `0x101540`
- `jm_generated_vectorroute_install` at `0x101850`
- `jm_generated_interruptcontroller_install` at `0x1019e0`
- `jm_generated_usermaproute_install` at `0x102830`
- `jm_generated_bodyframeinstall` at `0x102a60`
- `jm_generated_protectionroute_user_install` at `0x102ef0`

The five source-identity objects also survive in the linked ELF:

- `jm_generated_descriptorinstall_source` at `0x104260`
- `jm_generated_vectorroute_source` at `0x1042e0`
- `jm_generated_interruptcontroller_source` at `0x104360`
- `jm_generated_usermaproute_source` at `0x1043e0`
- `jm_generated_bodyframeinstall_source` at `0x104460`

## Runtime machine proof

The QEMU trace proved:

1. each of the five new generated-office identities was emitted exactly once;
2. the inherited generated SerialRoute identity was emitted exactly once;
3. both generated user bodies entered CPL3 and crossed PermissionGate;
4. Body 2 completed exactly three controlled TRACE_READ calls and then issued its deliberate invalid opcode;
5. FaultHold caught the invalid opcode exactly once;
6. RecoveryBody blocked only the faulting body and selected the safe body exactly once;
7. Body 1 continued through PermissionGate **72,165 times** after recovery before the proof timeout ended QEMU.

## Preserved correction trace

The failed routes remain provenance:

1. the first v1.4A attempt omitted the frozen v1.2A carrier and stopped before integration;
2. the next attempt booted successfully but used an over-broad substring symbol assertion;
3. a later proof correction distinguished office symbols from optimizable helpers but still allowed `.announced` suffix symbols to satisfy substring checks;
4. the max-strength correction added a hashed `noinline, used` retention contract, three additional adversarial tests and exact parsed `nm` symbol-name enforcement.

No failed route is represented as machine authority.

## Proven stack

`ImageCarrier → BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → DescriptorInstall → VectorRoute → InterruptController → BodyRegistry → UserBoundary → UserMapRoute → BodyFrameInstall → InterruptRoute → RouteScheduler → FrameCarrier → InterruptEntry → UserProgram Body 1 / Body 2 → PermissionGate → SerialRoute → FaultHold → RecoveryBody → safe Body 1 continuation`

## Claim boundary

This construction PASS proves deterministic JM generation of the fixed descriptor-installation, vector-table, legacy PIC/PIT, user-page permission and two-body initial-frame contracts used by this RouteOS proof body. It proves exact removal of four inherited handwritten authority seams, exact standalone ELF office boundaries, live activation of all five offices and preservation of the complete inherited user/fault/recovery route in QEMU.

It does **not** prove arbitrary GDT/TSS or IDT generation, every exception vector, APIC/IOAPIC support, SMP-safe installation, dynamic virtual memory, demand paging, a general process loader, arbitrary applications, filesystems, storage, networking, a general-purpose operating system or a wholly JM-generated kernel.

This is a construction receipt. A final DING additionally requires a freeze lock, permanent anchor and **15/15 frozen-head revalidation**. PR `#72` remains draft and unmerged.