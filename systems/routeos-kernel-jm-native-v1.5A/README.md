# RouteOS Kernel JM-Native v1.5A — PrimitiveRoute

Status: **FROZEN — MAX DING pending frozen-head revalidation**

Frozen parent: `78a82f77e41ff0983597e5d900369a004c4eb9de`

PrimitiveRoute removes the remaining handwritten freestanding primitive island: port output, port input, I/O wait, byte copy and byte set. The generated offices are retained as exact ELF symbols and survive the complete inherited QEMU user/fault/recovery route.

Construction proof: full workflow matrix PASS, seven adversarial tests PASS, artifact checksum ledger 25/25 PASS, machine exit 0, six exact ELF symbols, zero handwritten residue, and safe post-recovery continuation.

Claim boundary: fixed x86 port-I/O and bytewise memory primitives used by this proof kernel; not general libc, DMA, MMIO, vectorized memory, arbitrary architectures or a wholly generated kernel.
