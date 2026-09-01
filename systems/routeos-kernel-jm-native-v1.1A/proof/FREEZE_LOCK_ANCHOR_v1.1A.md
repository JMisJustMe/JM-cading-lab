# FREEZE LOCK ANCHOR — RouteOS JM-Native Kernel v1.1A

## Crown

**BootCarrier + PageRoute + LongModeRoute + PrivilegeLoader — DING PASS**

This lock extends the frozen v1.0A body. It does not rewrite, flatten, rename or weaken FrameCarrier + InterruptEntry.

## Authority chain

- v1.0A frozen parent: `276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96`
- v1.1A machine-tested source head: `5a41ebe50aff114bffa3bcfd1b83d65f3be77eee`
- Draft PR: `#66`
- Proof run: `30598111649`
- Decisive job: `91054821552`
- Receipt artifact ID: `8780897813`
- Receipt checksum audit: `25/25 PASS`
- Tested-head workflow result: `12/12 PASS`

## Frozen source identity

- Source: `systems/routeos-kernel-jm-native-v1.1A/source/bootcarrier_longmoderoute.jmroute`
- Source SHA-256: `b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638`
- Generated head SHA-256: `bee4f7c6e12a27c0de82ebc6369d7bc6e11e918b4f07a6b80fb57e3b40a027f2`
- Generated storage SHA-256: `a5b6f66d9f4d98973432bb1b7bc2525c5a1ebaf81466915ac6e0349e6799694b`
- Integrated assembly SHA-256: `0a5b4ba6ba2b3dd02d71e41897f674b5c9eca67946ce82cc262e352a527865c8`
- Linked ELF SHA-256: `2ad774cbbcbe0db7626ee951e2a559daf5068d892ae40466461fac527d258f9e`
- QEMU trace SHA-256: `e1509118f3fead726da5e302b071440ec17aa49d2258870b3eda1d57ea2334ab`
- Artifact digest: `sha256:4c90aa933d91d6b57b7d19ac3c0d051db07c2259c097215f50c9f05b87480184`

## Frozen operational body

`BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → PermissionGate → FaultHold → RecoveryBody → FrameCarrier → InterruptEntry`

The generated body is responsible for Multiboot2 entry, the frozen 64 MiB bootstrap identity map, processor transition into x86-64 long mode, the 64-bit kernel handoff and live descriptor/task/page-root helper carriers. The inherited generated offices then enter CPL3, handle syscalls and scheduling, contain the deliberate fault and preserve safe-body continuation.

## Locks

1. The v1.1A source and generated outputs above are the authoritative BootCarrier / PageRoute / LongModeRoute / PrivilegeLoader body.
2. Register-control order, page-map dimensions, selectors, GDT entries, helper symbols and handoff target may not change under the v1.1A name.
3. Any such change requires a new version and new machine proof.
4. The frozen v1.0A FrameCarrier / InterruptEntry body remains independently authoritative and intact.
5. Early source identity is enforced through the linked ELF; it must not be falsely recast as a serial message emitted before serial activation.
6. PR `#66` remains draft and unmerged unless merging is chosen separately.

## Claim boundary

Frozen as proven: deterministic JM-generated executable Multiboot2 entry, bootstrap page-table construction, long-mode transition, kernel handoff and GDT/TR/CR3 helper carriers, surviving the complete inherited QEMU route.

Not frozen as proven: linker-script generation, GRUB configuration generation, user-program byte generation, dynamic mapping beyond the frozen bootstrap map, every CPU exception family, removal of every handwritten carrier or a wholly generated kernel.

## Anchor branch

`anchor/routeos-kernel-jm-native-v1-1a-bootcarrier-longmoderoute-ding-pass`

Any continuation begins from this locked body or explicitly declares why it diverges.
