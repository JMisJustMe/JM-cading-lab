# RouteOS JM-Native v1.6A — DispatchRoute Operational Receipt

Status: **CONSTRUCTION MACHINE PASS — FROZEN-HEAD REVALIDATION PENDING**

- Frozen parent: `3c759841606244876e57140254e896c9de7e927b`
- Construction head: `f26b743ec1fcc8a3e274628732dffa66f5846a31`
- Draft PR: `#75`
- Run: `30682582738`
- Job: `91322383209`
- Artifact ID: `8812796639`
- Artifact size: `3,342,995 bytes`
- Artifact digest: `sha256:dfcef8a486a1bceb0d572f50ccb8b9497ec21b10c928a9f68f5c08e5d952a32a`
- Artifact ledger: **26/26 PASS**
- Machine exit: `0`

## Stable authority

- Source: `50a58585fab1ee1bbcd34e76ce99e4878c82a56118531144a5131f6f2c070a80`
- Generated unit: `83c74d882ccceaa812c0818e21519c7947acfdb2932f0b659e77bc79f2545693`
- Generation record: `0ada972e3152f6ad8a3c1927065167f96091a00388221b2176b465877bd7cbcf`
- Integrated C: `6d15597e224115e41ffd09136bcf9f7056d7eac9c4554bf87b87fbfd46c60a5c`
- Linked ELF: `48f054a2434f85e41ae27324c2fe1c174ddf9ce1cf8ac7631305404d9c0adcef`
- Construction ISO: `8975007d6d455b3fbf5df60d0c5e45755a699aabce47281d43e7cad9b477c128`
- Construction trace: `8a1c978362985ac0e0a24ecbe3181b20bbe4ba98538652e2a317c52f10dd1d7f`
- Removed handwritten dispatcher: `ebab73f38573aff538fef848718c676f9113a4918957e15fdd645f3d699ddd45`

## Exact executable boundaries

- `jm_generated_dispatchroute_announce` at `0x1023d0`
- `jm_generated_dispatchroute` at `0x1024d0`
- `routeos_interrupt_dispatch` at `0x103330`

The old fixed-vector dispatcher body is absent. DispatchRoute and PrimitiveRoute identities each appeared once. FaultHold and RecoveryBody each activated once. Body 1 completed `110,479` safe TRACE_READ calls after recovery.

## Claim boundary

Proves the fixed timer, controlled syscall, invalid-opcode and unhandled-vector dispatch policy used by this kernel, including legacy PIC EOI and scheduler handoff. It does not prove arbitrary vector policies, nested interrupt safety, SMP dispatch, APIC routing or every exception family.
