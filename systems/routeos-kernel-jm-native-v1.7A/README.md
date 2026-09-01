# RouteOS Kernel JM-Native v1.7A — EntryRoute

Status: **FROZEN — MAX DING pending frozen-head revalidation**

Frozen parent: `989d204383ad7e3ea03c749aa0472d6f3c10b199`

EntryRoute removes the final handwritten C kernel-entry wrapper and deterministically generates the fixed Multiboot magic/info handoff into the inherited IgnitionBody. Its split head/tail carriers preserve both runtime source identity and the assembly-visible global entry symbol.

Construction proof: chained rebuild and QEMU PASS, five adversarial tests PASS, artifact ledger 28/28 PASS, machine exit 0, two exact ELF boundaries, one exact wrapper removal and safe post-recovery continuation.

Claim boundary: the fixed two-argument C handoff used by this kernel; not arbitrary boot protocols, UEFI/firmware paths or alternate calling conventions.
