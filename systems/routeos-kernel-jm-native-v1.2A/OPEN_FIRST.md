# OPEN FIRST — RouteOS JM-Native v1.2A OneBody

Parent freeze: `b4e8299597c7c00e8f9f9200254f02dda49362ed`

This folder stores the complete v1.2A source/compiler/generated/test/proof tree as one deterministic archive for atomic mounting by GitHub Actions.

- Body archive SHA-256: `67a7817dd5fb18451b85420c80a4ae0f36f11afe46407936d231d1f615553426`
- Decoded tar.gz SHA-256: `7bca0f2634787c2e55851224028b24519c99ea2952685782dff27e8bf87014fd`
- JM source SHA-256: `1ab1556c2e674a42d85089b1235e353c5a694d4bdce9eafa6668efcc40845bb1`

The mounted tree contains **UserProgram**, **LinkRoute**, and **ImageCarrier**. It must pass generation checks, eight adversarial tests, exact-seam integration, ELF/ISO construction and the complete QEMU fault→recovery→safe-continuation route before any DING is written.

## Corrected pre-IDT execution boundary

The first machine attempt built and booted, then exposed that an unconstrained compiler could emit `movaps` while initialising the TSS before the IDT and SIMD state existed. The v1.2A source now explicitly locks `KERNEL_SIMD_POLICY general-registers-only`; generated build output uses `-mgeneral-regs-only`, tests reject policy drift, and ELF enforcement rejects vector/MMX register use.

This construction remains draft and unmerged.
