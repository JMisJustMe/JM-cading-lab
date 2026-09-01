# FREEZE LOCK ANCHOR — RouteOS JM-Native Kernel v1.2A

## Crown

**UserProgram + LinkRoute + ImageCarrier — DING PASS**

This lock extends the frozen v1.1A body. It does not rewrite, flatten, rename or weaken any earlier generated office.

## Authority chain

- v1.1A frozen parent: `b4e8299597c7c00e8f9f9200254f02dda49362ed`
- v1.2A machine-tested pre-freeze head: `becf0c36edb9179329880136a4906920b05d8803`
- Draft PR: `#67`
- Proof run: `30602053620`
- Decisive job: `91066673332`
- Workflow crown: `JM_GENERATED_USERPROGRAM_LINKROUTE_IMAGECARRIER DING: PASS`
- Machine crown: `QEMU_HARD_BODY_DING PASS (capture_status=124)`
- Receipt artifact ID: `8782261230`
- Receipt artifact name: `routeos-kernel-jm-native-v1.2A-userprogram-linkroute-imagecarrier-receipt`
- Receipt size: `3308012` bytes
- Receipt checksum audit: `31/31 PASS`
- Tested-head workflow result: `13/13 PASS`

## Frozen mounted authority

- Base OneBody text SHA-256: `5f364d15567327a60b0d8a03ed6b78479bae313ba82b229d0a87013b2cd5c5ec`
- Base decoded archive SHA-256: `0be9af24c7fe7de2b0efb004a88393f23509903df2b13660afc8894517135316`
- Pre-IDT correction text SHA-256: `6f83905abdbc6f6e438f27187a9d394e784499d5dcb727b658873f4752d6b730`
- Pre-IDT correction decoded SHA-256: `9274ad896d84951856def1ac339d4d5d6ccc9246f642beb849941bd20f52aff3`
- Symbol-range correction text SHA-256: `8c88a35eb8f01f2190107a79db6e3a9f4337a43d347cd8f730398bd270d17e98`
- Symbol-range correction decoded SHA-256: `e38a984c1fdd658796b355a897e3b998f3ea44f56b5983bb3a7bbe65c6d1e1ff`
- Governing JM source SHA-256: `1ab1556c2e674a42d85089b1235e353c5a694d4bdce9eafa6668efcc40845bb1`

## Frozen generated outputs and machine carrier

- Generated UserProgram SHA-256: `1cd32c761b192bf9800951f319bb4c84a1e9e6e2bea906431217a82bd19af6a7`
- Generated LinkRoute SHA-256: `2589031cc47859a37779e476bb9cfe4cbeb56e775a46879741743c6c43757ad2`
- Generated GRUB configuration SHA-256: `5b6a51f4ab6148a2efa3ea0c90195687469be5336e4741519d387772aa5f5db6`
- Generated ImageCarrier build route SHA-256: `8e94572140b3d298258f1a35ef9d569f9bed09b3146e2df70a7227d3a6a0a58b`
- Generated manifest SHA-256: `86cfe8cdc98e89604e8502a3a9e4ed93dab7e1e430dd5a4881565ef721eb2d7c`
- Integrated assembly SHA-256: `aa6e753aa1ebe73cec05518ff5cfaab6ee58ea8eab30b86f4d192b49bb1147fa`
- Linked ELF SHA-256: `643636cec90118a4b2a267821588eae685292c3dc2da0328320fce25e88b9e1b`
- Bootable ISO SHA-256: `d2334eb6c7503d5a319b9bf353a21b4d3adfcf2de89e83ab5043e2846839de35`
- QEMU trace SHA-256: `6002af6e540ace1b64cd6590a7f78e35a578ff6c733beaeef6765ff3d54cd66c`
- Machine-run log SHA-256: `922eb4e3e77527b368b17be600e2a2ae64557db57d70b73a4d4cc858d6b287fc`
- Artifact digest / downloaded ZIP SHA-256: `92f743b484a2452b10c7a623734ad45e7faec957f3a42daecb2eec2ea23d0511`

## Frozen operational route

`ImageCarrier → BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → FrameCarrier → InterruptEntry → UserProgram Body 1 / UserProgram Body 2 → PermissionGate → FaultHold → RecoveryBody → safe Body 1 continuation`

The generated v1.2A authority supplies the ring-3 user-program instruction body, its bounded ELF placement and collision guards, and the deterministic clang/LLD/GRUB image-building route. The complete inherited generated stack boots under QEMU, enters both generated user bodies, routes their `TRACE_READ` calls through PermissionGate, catches Body 2's deliberate invalid opcode, blocks the faulting body and preserves continuing Body 1 execution.

## Preserved correction trace

1. **Pre-IDT boundary:** `KERNEL_SIMD_POLICY general-registers-only`, generated `-mgeneral-regs-only`, adversarial drift rejection and ELF rejection of XMM/YMM/ZMM/MMX instructions prevent unsafe SIMD use before IDT/SIMD state exists.
2. **Symbol-range proof:** exact start/end addresses are read from `nm -n`; `objdump` is bounded by those numeric addresses rather than depending on an empty end symbol being printed as a heading.

The failed attempts and both corrections remain explicit lineage. They are not silently rewritten out of the body.

## Locks

1. The v1.2A JM source, generated UserProgram, LinkRoute, ImageCarrier outputs and hashes above are authoritative for this version.
2. User instruction order, deliberate Body 2 fault, user-blob bounds, linker floor, section placement, Multiboot2 search bound, page alignment, collision guard, SIMD policy, GRUB carrier and image-build route may not change under the v1.2A name.
3. Any change to those facts requires a new version, new branch, new machine run, new receipt and new anchor.
4. All earlier frozen generated offices remain independently authoritative and intact.
5. PR `#67` remains open, draft and unmerged unless merging is chosen separately.
6. This anchor is a proof boundary, not a claim that all remaining kernel or operating-system capability has been generated.

## Claim boundary

Frozen as proven: deterministic JM generation of the bounded ring-3 UserProgram, LinkRoute and ImageCarrier; exact removal of the previous handwritten user-program seam; construction of a valid Multiboot2 ELF and bootable GRUB ISO; vector/MMX-free pre-IDT executable enforcement; live entry into both generated user bodies; controlled PermissionGate crossings; real Body 2 invalid-opcode containment; RecoveryBody selection; and continued safe Body 1 execution through the complete inherited QEMU route.

Not frozen as proven: a general-purpose userspace compiler, arbitrary applications, filesystems, storage, device drivers, networking, dynamic linking, dynamic memory mapping beyond the frozen route, every CPU exception family, removal of every handwritten carrier, a complete general-purpose operating system, or a wholly JM-generated kernel.

## Anchor branch

`anchor/routeos-kernel-jm-native-v1-2a-userprogram-linkroute-imagecarrier-ding-pass`

Any continuation begins from this locked body or explicitly declares why it diverges.
