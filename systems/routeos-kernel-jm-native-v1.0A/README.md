# RouteOS Kernel JM-Native v1.0A — FrameCarrier + InterruptEntry

Frozen parent: `a05b26b3901460cfa5623cbb3063d961a9952214`

This version generates the bounded x86-64 assembly route that consumes the CPU-frame contract already proved by v0.9A.

## Generated offices

- **FrameCarrier** — the 15-register push/pop contract, two-qword vector/error skip, first-frame activation receipt and `routeos_enter_frame → iretq` CPL3 handoff.
- **InterruptEntry** — invalid-opcode, PIT timer and INT `0x80` entry stubs; normalized vector/error frame; C dispatcher handoff; returned-frame stack switch; `iretq` return.

## Explicitly outside this crown

- Multiboot2 `_start`;
- early page-table storage and long-mode transition;
- GDT/TR/CR3 loader helpers;
- user-code bytes;
- linker and GRUB carriers.

## Authority hashes

- JM source: `50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914`
- generated assembly: `79e7171f56c84c135731eaa2bc069093b53d465b449a58a179f9ee65f042621e`
- generated record: `b8dd64afe5c74d8e9e38e53a236dd2adafa796c01f5dc0149203e0f49727bd4f`
- integrated assembly preview: `93f3372a30da7c3d0739504da807e123dfdde66a59e6cb84e13d514d7e9f4c69`

A PASS requires both generated assembly markers to appear exactly once in the live QEMU trace, all four generated entry symbols to remain present in the ELF, and the complete inherited ten-office route to survive.
