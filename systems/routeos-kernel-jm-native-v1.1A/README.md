# RouteOS Kernel JM-Native v1.1A — BootCarrier + PageRoute + LongModeRoute + PrivilegeLoader

Status: **ROUTEOS JM-NATIVE BOOTCARRIER + LONGMODEROUTE DING: PASS**

Frozen parent: `276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96`

Machine-tested source head: `5a41ebe50aff114bffa3bcfd1b83d65f3be77eee`

This version moves the complete early executable boot route from handwritten assembly into deterministic JM-generated assembly while preserving the frozen v1.0A FrameCarrier / InterruptEntry body byte-for-route.

## Generated offices

- **BootCarrier** — Multiboot2 header, `_start`, boot parameter capture, bootstrap stack and controlled halt fallback.
- **PageRoute** — 35-page table-storage clear, 32 page-table links and 16,384 4 KiB leaves for a 64 MiB identity map.
- **LongModeRoute** — CR4.PAE, EFER.LME, CR3 load, CR0.PG, bootstrap GDT load, far jump, 64-bit segment/stack setup and kernel-entry handoff.
- **PrivilegeLoader** — live GDT refresh, task-register load and CR3 reload helpers used by the generated descriptor and user-boundary offices.

## Machine result

- GitHub Actions run: `30598111649`
- Decisive job: `91054821552`
- Artifact ID: `8780897813`
- Machine exit: `0`
- Artifact checksum ledger: **25/25 PASS**
- Complete tested-head lineage: **12/12 workflows PASS**

## Frozen hashes

- JM source: `b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638`
- generated head: `bee4f7c6e12a27c0de82ebc6369d7bc6e11e918b4f07a6b80fb57e3b40a027f2`
- generated tail: `a5b6f66d9f4d98973432bb1b7bc2525c5a1ebaf81466915ac6e0349e6799694b`
- integrated assembly: `0a5b4ba6ba2b3dd02d71e41897f674b5c9eca67946ce82cc262e352a527865c8`
- linked ELF: `2ad774cbbcbe0db7626ee951e2a559daf5068d892ae40466461fac527d258f9e`
- GRUB ISO: `218914aed669f7afcca1d9d735fddd1089079fdf5ec30c55a254d752f5855253`
- QEMU trace: `e1509118f3fead726da5e302b071440ec17aa49d2258870b3eda1d57ea2334ab`
- artifact digest: `sha256:4c90aa933d91d6b57b7d19ac3c0d051db07c2259c097215f50c9f05b87480184`

## Explicitly outside this crown

- linker script generation;
- GRUB configuration / ISO carrier generation;
- user-program instruction bytes;
- dynamic page allocation beyond the frozen 64 MiB bootstrap identity map;
- every CPU exception family;
- a wholly generated kernel.
