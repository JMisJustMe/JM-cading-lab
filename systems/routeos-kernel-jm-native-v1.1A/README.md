# RouteOS Kernel JM-Native v1.1A — BootCarrier + PageRoute + LongModeRoute + PrivilegeLoader

Frozen parent: `276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96`

This version moves the complete early executable boot route from handwritten assembly into deterministic JM-generated assembly while preserving the frozen v1.0A FrameCarrier / InterruptEntry body byte-for-route.

## Generated offices

- **BootCarrier** — Multiboot2 header, `_start`, boot parameter capture, bootstrap stack and controlled halt fallback.
- **PageRoute** — 35-page table-storage clear, 32 page-table links and 16,384 4 KiB leaves for a 64 MiB identity map.
- **LongModeRoute** — CR4.PAE, EFER.LME, CR3 load, CR0.PG, bootstrap GDT load, far jump, 64-bit segment/stack setup and kernel-entry handoff.
- **PrivilegeLoader** — live GDT refresh, task-register load and CR3 reload helpers used by the generated descriptor and user-boundary offices.

## Explicitly outside this crown

- linker script generation;
- GRUB configuration / ISO carrier generation;
- user-program instruction bytes;
- dynamic page allocation beyond the frozen 64 MiB bootstrap identity map;
- every CPU exception family;
- removal of the already-generated v1.0A FrameCarrier / InterruptEntry assembly.

## Construction hashes

- JM source: `b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638`
- generated head: `bee4f7c6e12a27c0de82ebc6369d7bc6e11e918b4f07a6b80fb57e3b40a027f2`
- generated tail: `a5b6f66d9f4d98973432bb1b7bc2525c5a1ebaf81466915ac6e0349e6799694b`
- local integrated assembly preview: `0a5b4ba6ba2b3dd02d71e41897f674b5c9eca67946ce82cc262e352a527865c8`

A machine PASS requires the generated Multiboot section and all generated symbols to survive in the linked ELF, the exact control-register and descriptor-transition opcodes to remain present, QEMU to reach the inherited twelve-office route, the deliberate user fault to be contained, and the safe body to continue.
