# RouteOS JM-Native v1.5A — PrimitiveRoute Operational Receipt

Status: **CONSTRUCTION MACHINE PASS — FROZEN-HEAD REVALIDATION PENDING**

## Authority

- Frozen parent: `78a82f77e41ff0983597e5d900369a004c4eb9de`
- Machine-tested construction head: `5ac6334f4ad2d6fb57d47974a39ee9375ae1b4e2`
- Draft PR: `#74`
- Decisive construction run: `30682080580`
- Decisive job: `91321003591`
- Artifact ID: `8812623291`
- Artifact size: `3,333,102 bytes`
- Artifact digest: `sha256:f6cfa4ddca727e6d8e08db357690d1f6d2e56a39166082b05489176997e4b6d8`
- Artifact checksum audit: **25/25 PASS**
- Machine exit: `0`

## Frozen source and construction executable

- JM source: `62476361bed4398041d8005dd242d0344809a893a6ca5e85618f3495ca77ccbb`
- Generated PrimitiveRoute unit: `d2c30dec658a22d1e329162ac3bcff28b2974dcbb47f0f8f21ba2f10746040fc`
- Generation record: `cb41607fc6b98392dd67bc0ed9186793e1c79edf9203e30d3ec081844cc15d2a`
- Integrated `routeos_kernel.c`: `597db6bf16471cc3134301ada72e38db24776332039dd7277039f1339812042c`
- Linked kernel ELF: `b65f9a5c0363590e81b5fede432485c2ba0831889b75b5d987e4a4f4e1dee4a8`
- Construction ISO: `c8fac463859ed24251321abb2d9386cdd9a827c76992fb0693f794d8735a52bd`
- Construction trace: `143aaf8044cc322fc82609db2dd6ddc4e51052aac4be7c1a3957b1a0f2818c9e`

## Exact seam removal

The inherited handwritten port-I/O and byte-memory primitive block was removed once with SHA-256:

`a77fcd52805ee5fba4f5178ccee0094346e6464d7cf977e98106ca3cde249754`

Residue is zero for handwritten `outb`, `inb`, `io_wait`, `jm_memcpy`, and `jm_memset` implementations.

## Exact executable boundaries

- `jm_generated_portout` at `0x101270`
- `jm_generated_portin` at `0x101280`
- `jm_generated_iowait` at `0x101290`
- `jm_generated_memorycopy` at `0x1012a0`
- `jm_generated_memoryset` at `0x101340`
- `jm_generated_primitiveroute_announce` at `0x1013c0`

## Operational result

PrimitiveRoute announced once. Body 2 issued its deliberate invalid opcode once; FaultHold caught it once; RecoveryBody selected the safe body once; Body 1 completed `96,819` controlled TRACE_READ calls after recovery before timeout.

## Claim boundary

Proven: deterministic fixed x86 byte-port output/input, fixed I/O wait, bytewise copy/set primitives used by this kernel; exact seam removal; exact standalone ELF boundaries; and preservation of the complete inherited user/fault/recovery route in QEMU.

Not proven: general libc semantics, overlapping-copy `memmove`, vectorized memory operations, DMA, MMIO, arbitrary architectures, arbitrary device drivers, or a wholly JM-generated kernel.
