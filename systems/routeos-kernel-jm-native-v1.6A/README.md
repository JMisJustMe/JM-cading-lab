# RouteOS Kernel JM-Native v1.6A — DispatchRoute

Status: **FROZEN — MAX DING pending frozen-head revalidation**

Frozen parent: `3c759841606244876e57140254e896c9de7e927b`

DispatchRoute removes the standalone handwritten interrupt dispatcher and deterministically generates the fixed timer, controlled syscall, fault and unhandled-vector routing office while preserving PrimitiveRoute and every inherited scheduler, gate and recovery body.

Construction proof: chained rebuild and QEMU PASS, five adversarial tests PASS, artifact ledger 26/26 PASS, machine exit 0, three exact ELF boundaries, zero old-dispatch residue, and safe post-recovery continuation.

Claim boundary: fixed vectors and legacy PIC EOI path used by this proof kernel; not arbitrary vector policies, nested interrupt safety, SMP dispatch or all exception families.
