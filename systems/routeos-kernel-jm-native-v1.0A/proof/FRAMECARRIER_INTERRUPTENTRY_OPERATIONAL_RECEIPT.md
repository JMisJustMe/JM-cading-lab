# RouteOS JM-Native Kernel v1.0A — FrameCarrier + InterruptEntry Operational Receipt

## Status

**ROUTEOS JM-NATIVE FRAMECARRIER + INTERRUPTENTRY DING: PASS**

This receipt supersedes the earlier construction-only wording at this path. The machine proof completed after that preliminary receipt was written.

## Proven source and lineage

- Machine-tested source commit: `13a938d14afc2e3a31073c174291533c5f95a1aa`
- Frozen v0.9A proof parent: `a05b26b3901460cfa5623cbb3063d961a9952214`
- Proven v0.9A machine parent: `dfa52b8e42f2511eeb3082f14fc2eb0584843e27`
- Draft proof PR: `#63`
- Proof branch: `agent/routeos-kernel-jm-native-framecarrier-v1-0a`

## Open machine proof

- GitHub Actions run: `30592988658`
- Decisive job: `91039091870`
- Artifact ID: `8779037867`
- Artifact: `routeos-v1.0A-framecarrier-interruptentry-receipt.zip`
- Machine exit status: `0`
- Artifact checksum audit: **22/22 files PASS**
- Full lineage workflows at the tested head: **11/11 PASS**

## Exact frozen hashes

- JM source SHA-256: `50d69fff36da19ef9073b54e87727696fb8181efa49f4d0a724100c96983e6a9`
- Generated header SHA-256: `cae653be486572a23983fee6943a3423edfc88fd59db58e4ceb3e3008f149ab9`
- Generated frame include SHA-256: `b752b49c044a8022d76fc9f656464266dda522375d428d12bc011e87f6de4161`
- Integration receipt SHA-256: `d37257011d72c2daaf05dca9f37b81cf01f9911e0be7c36239226d2ffe886c3e`
- Linked kernel ELF SHA-256: `f8572bf42cd314912671cf405f628a3e7bc7dc54dec990727fd0119717dcdd16`
- QEMU boot trace SHA-256: `13b5e9d2e66577e0e833662a3e42f9ed8ddd56ca1d328ecaebbdfea62681fa1f`

## Integration receipt

- C source before SHA-256: `f4312f3074db73da586b39aac962d6c2572a229f090dae8a26ae6ccac5313943`
- C source after SHA-256: `29a3fe55cc2696205e44bf52ac513a4b1f749e8d379e76c425d2300be9738aff`
- Assembly source remained unchanged: `b04f8c383184e84a893d5e26ba65f0d91855c65ed0e151af393ecb6939fdc816`
- Handwritten ISR blocks: `3 → 0`
- Handwritten push-register bodies after integration: `0`
- Handwritten pop-register bodies after integration: `0`
- Generated header include count: `1`
- Generated frame include count: `1`
- Generated marker count: `1`

## Operational proof route

`JM source → framecarrierc → generated header/include → singular kernel integration → clang/ELF → GRUB/QEMU → generated timer/syscall/#UD entry → dispatch → returned-frame restore → FaultHold → RecoveryBody → safe-body continuation → receipt`

The trace proves, in order:

1. Generated FrameCarrier identity became active.
2. Generated InterruptEntry identity became active.
3. User body 2 crossed `int 0x80` through PermissionGate and returned.
4. Generated `#UD` entry caught body 2's invalid opcode.
5. FaultHold blocked only the faulting body.
6. RecoveryBody preserved the safe body.
7. RouteScheduler resumed user body 1.
8. User body 1 crossed `int 0x80` and returned after recovery.

## Proven stack

`IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → PermissionGate → FaultHold → RecoveryBody → FrameCarrier → InterruptEntry`

## Frame contract

The v0.9A 22-qword / 176-byte CPU-frame ABI remains preserved:

`r15 → r14 → r13 → r12 → r11 → r10 → r9 → r8 → rsi → rdi → rbp → rdx → rcx → rbx → rax → vector → error → rip → cs → rflags → rsp → ss`

Generated vectors:

- `routeos_isr_ud` → `6`
- `routeos_isr_timer` → `32`
- `routeos_isr_syscall` → `128`

The generated restore sequence is `r15` through `rax`, followed by the 16-byte vector/error skip and `iretq`.

## Claim boundary

This DING proves executable JM-generated shared frame restoration and generated interrupt-entry carriers for the already-proven `#UD`, PIT timer and `int 0x80` routes. It does **not** claim generated early boot, long-mode transition, page-table construction, compiled user-code bytes, every CPU exception family, elimination of all handwritten assembly, or a wholly generated kernel.

The PR remains draft and unmerged. Proof is frozen; integration into `main` is a separate decision.
