# RouteOS JM-Native Kernel v1.0A — AssemblyEntry + FrameCarrier

v1.0A forks only from the frozen v0.9A crown at:

`a05b26b3901460cfa5623cbb3063d961a9952214`

It moves the remaining handwritten CPL3 frame-entry seam into JM-authored, deterministically generated x86-64 assembly.

## New generated offices

1. **AssemblyEntry** — consumes a `BodyRegistry` CPU frame and enters/restores execution through `iretq`.
2. **FrameCarrier** — constructs the exact 22-qword frame for #UD, PIT timer and `int 0x80`, dispatches through `routeos_interrupt_dispatch`, switches to the returned frame and restores it.

The frame contract is inherited without reordering from v0.9A:

`r15..rax → vector → error → rip → cs → rflags → rsp → ss`

The source also fixes the proven register save/restore order, vectors, synthetic-error policy, metadata width and ABI symbol names. The compiler emits:

- `generated/assemblyentry_framecarrier.S`
- `generated/assemblyentry_framecarrier.json`

## Proof route

`JM source → deterministic compiler → generated carrier → singular handwritten-seam replacement → clang/ELF → GRUB/QEMU → timer/syscall/fault/recovery runtime → disassembly enforcement → receipt`

The integration tool discovers the one assembly source containing all four frozen symbols and replaces only that carrier block. It does not rewrite boot, paging, user bytes or the C dispatch offices.

## Claim boundary

v1.0A aims to prove generated assembly entry and frame carrying for the already-proven #UD, timer and `int 0x80` routes. It does not claim generated bootloader entry, long-mode setup, page-table storage, user-code bytes, CPU-error-code exception families or a wholly generated kernel.
