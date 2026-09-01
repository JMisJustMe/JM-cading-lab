# OPEN FIRST — RouteOS JM-Native v1.2A OneBody

Parent freeze: `b4e8299597c7c00e8f9f9200254f02dda49362ed`

This body is mounted atomically as one base archive plus two explicit correction overlays. The failed attempts remain readable rather than being silently rewritten.

## Mounted authority

- Base OneBody text SHA-256: `5f364d15567327a60b0d8a03ed6b78479bae313ba82b229d0a87013b2cd5c5ec`
- Base decoded archive SHA-256: `0be9af24c7fe7de2b0efb004a88393f23509903df2b13660afc8894517135316`
- Pre-IDT ABI overlay text SHA-256: `6f83905abdbc6f6e438f27187a9d394e784499d5dcb727b658873f4752d6b730`
- Pre-IDT ABI decoded archive SHA-256: `9274ad896d84951856def1ac339d4d5d6ccc9246f642beb849941bd20f52aff3`
- Symbol-range proof overlay text SHA-256: `8c88a35eb8f01f2190107a79db6e3a9f4337a43d347cd8f730398bd270d17e98`
- Symbol-range proof decoded archive SHA-256: `e38a984c1fdd658796b355a897e3b998f3ea44f56b5983bb3a7bbe65c6d1e1ff`
- Governing JM source SHA-256: `1ab1556c2e674a42d85089b1235e353c5a694d4bdce9eafa6668efcc40845bb1`

The mounted tree contains **UserProgram**, **LinkRoute**, and **ImageCarrier**. A DING requires deterministic generation, nine adversarial tests, exact-seam integration, ELF/ISO construction, a vector/MMX-free pre-IDT executable, and the complete QEMU fault → recovery → safe-continuation route.

## Correction trace

### 1. Pre-IDT execution boundary

The first machine attempt built and booted, then exposed that an unconstrained compiler emitted `movaps` while initialising the TSS before the IDT and SIMD state existed. The source now locks `KERNEL_SIMD_POLICY general-registers-only`; generated compilation uses `-mgeneral-regs-only`, tests reject policy drift, and ELF enforcement rejects XMM/YMM/ZMM/MMX use.

### 2. ELF symbol-range proof

The corrected machine body completed QEMU successfully. Its first final gate nevertheless searched for an empty end symbol as a printed GNU objdump heading. The symbol existed in `nm`, but objdump was not required to display that heading. Enforcement now reads both exact symbol addresses and disassembles their numeric interval. This correction changes proof reading only; it does not alter the successful executable body.

This construction remains draft and unmerged until a separate merge decision is made.
