# RouteOS Kernel JM-Native v1.4A — ProtectionRoute

Status: **FROZEN — DING pending frozen-head revalidation**

Frozen parent: `e6f037ac3f3d42c4b56218307b5f738f0c6a4b70`

Machine-tested construction head: `8c280d679635942355c156cc835b0f7761eeaee0`

This version moves the largest coherent remaining privileged C boundary after SerialRoute into deterministic JM-generated authority: descriptor installation, vector-table installation, interrupt-controller/timer programming, user-page permission mutation and initial user-body frame construction.

## Generated offices

- **DescriptorInstall** — GDT entries, TSS descriptor, ring-0 interrupt stack and GDTR/TR activation.
- **VectorRoute** — IDT entry encoding and installation for invalid opcode, PIT timer and controlled `int 0x80`.
- **InterruptController** — PIC remap/mask preservation and PIT channel-0 programming.
- **UserMapRoute** — user permission propagation across the frozen page-table hierarchy and CR3 reload.
- **BodyFrameInstall** — user image copy, stack clearing and initial CPU-frame construction for both bodies.

## Construction machine result

- Complete workflow lineage: **15/15 PASS**
- GitHub Actions run: `30680557264`
- Decisive job: `91316591352`
- Artifact ID: `8812057330`
- Artifact digest: `sha256:c9fb4171ed6b27fa7078656335e14ffa35ef335cc2b35f83400367c0cb8cbc3a`
- Machine exit: `0`
- Artifact checksum ledger: **28/28 PASS**
- ProtectionRoute adversarial tests: **15/15 PASS**
- Safe Body 1 continuations after recovery: `72,165`

## Frozen hashes

- JM source: `50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14`
- DescriptorInstall: `1933b4545d34f6c9b34c963f82e25ea85ecc273a6e3c81d3f1bd1cd99a5a84c9`
- VectorRoute: `e39bb94a00ddd4b46ebf2cbcabd36bd6c090ec192d0c3d54a3b2f33a197b5824`
- InterruptController: `2489b9a30311b023de78a12cc5e2912d7c982444c45f4929cf52ee9eb8f72302`
- UserMapRoute + BodyFrameInstall: `a5eb4d25d272d2349fe64f2e01cf19e56409249740ca4a558bfd123e2c25aa7e`
- Generation record: `d6862304754cd3eff5f330751c965226f4bb5256ebaf7835f53469ae4def312a`
- Exact ELF retention contract: `772a54aa7c64ed9c25b94f6af901cf7cc0e01c2d65ca4c7f147f969288d9939f`
- Integrated kernel C: `b7493d6c6a3e9b517df567cb078c25b32aeda0fc26ef1a89fa4dad54ff7e1425`
- Linked ELF: `80437b5bc55ae614c38c935365800d438ae62165f05043e033c848df2a95e6f0`
- Bootable ISO: `d6eea5dc55d29f7c0d79ab09e5d5116badfe0ee8d59d18726b177ab1059807b2`
- QEMU trace: `b399b3f70f71e5713e3d5e4dfc82c5d20c4e31d3f76c26e26dc3ae06bb6be137`

## Exact executable boundaries

The proof body retains these exact ELF symbols:

- `jm_generated_descriptorinstall`
- `jm_generated_vectorroute_install`
- `jm_generated_interruptcontroller_install`
- `jm_generated_usermaproute_install`
- `jm_generated_bodyframeinstall`
- `jm_generated_protectionroute_user_install`

Internal helpers remain free to inline; their source is locked by generated-output hashes.

## Operational route

`ImageCarrier → BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → DescriptorInstall → VectorRoute → InterruptController → BodyRegistry → UserBoundary → UserMapRoute → BodyFrameInstall → InterruptRoute → RouteScheduler → FrameCarrier → InterruptEntry → UserProgram Body 1 / Body 2 → PermissionGate → SerialRoute → FaultHold → RecoveryBody → safe Body 1 continuation`

## Explicitly outside this crown

- arbitrary GDT/TSS or IDT generation;
- every CPU exception vector;
- APIC, IOAPIC or SMP-safe installation;
- dynamic virtual memory or demand paging;
- a general process loader or arbitrary applications;
- filesystems, storage or networking;
- removal of every handwritten carrier;
- a general-purpose or wholly JM-generated operating system.

## Provenance rule

Failed parent-carrier and symbol-proof routes remain preserved as provenance but are not executable authority. The max-strength route requires exact parsed `nm` names, a hashed `noinline, used` office-retention contract and fifteen adversarial ProtectionRoute tests.

The final DING requires this freeze head to pass all fifteen workflows again and the permanent anchor to point to that exact commit. PR `#72` remains draft and unmerged.