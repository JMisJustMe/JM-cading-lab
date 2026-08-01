# RouteOS Kernel JM-Native v1.5A — PrimitiveRoute

Status: **CONSTRUCTION**

Frozen parent: `78a82f77e41ff0983597e5d900369a004c4eb9de`

This lane removes the remaining handwritten freestanding primitive island: port output, port input, I/O wait, byte copy and byte set. The generated offices are retained as exact ELF symbols and must survive the complete inherited QEMU user/fault/recovery route.

Claim boundary: fixed x86 port-I/O and bytewise memory primitives used by this proof kernel; not general libc, DMA, MMIO, vectorized memory, arbitrary architectures or a wholly generated kernel.
