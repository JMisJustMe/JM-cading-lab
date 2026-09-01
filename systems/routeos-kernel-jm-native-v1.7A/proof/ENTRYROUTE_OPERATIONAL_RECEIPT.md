# RouteOS JM-Native v1.7A — EntryRoute Operational Receipt

Status: **CONSTRUCTION MACHINE PASS — FROZEN-HEAD REVALIDATION PENDING**

- Frozen parent: `989d204383ad7e3ea03c749aa0472d6f3c10b199`
- Construction head: `dad3bde2672f4f8c230dd5e5c8939fee32636f59`
- Draft PR: `#76`
- Run: `30683045053`
- Job: `91323617676`
- Artifact ID: `8812947549`
- Artifact size: `3,316,480 bytes`
- Artifact digest: `sha256:3c6375dc2ba59343bd8dcf69f4632a22542bcc383437e2c485000cdeda3b4970`
- Artifact ledger: **28/28 PASS**
- Machine exit: `0`

## Stable authority

- Source: `b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647`
- Generated head: `37cda9b49c9f481517d74f5bcd0361fabf11e847f43dab9b8e2327e0817db068`
- Generated tail: `014c792c9d29b07612f09879ae03d66a3ea73f77ee6b225afc3ec598f4a88077`
- Generation record: `bd501c1fa6bbc263a76cee219f4155018e9db323c5336d21cafd897c99003aae`
- Integrated C: `9f313d3ccd098fae80db6c8ffadc72887f582ba0d4e6726655d362cebba00ca0`
- Linked ELF: `d4b242e3febdbfeb66d78a7eda63ac7f6281ea3efb5cc81491be771a1d82a879`
- Construction ISO: `ffbb26485a3607fc3f777c62131a5bbad404cd3960b4f6d176e215b7737e5bc2`
- Construction trace: `a85be2803d6d53228a00c321714d1d2e4f8053a9898d7b875025af1258c6eb4b`
- Removed handwritten wrapper: `9e66413db782f711c9784db2f9ed252ce3e161edd6407b6a5821da960ec9f080`

## Exact executable boundaries

- `jm_generated_entryroute_announce` at `0x103b20`
- `routeos_kernel_entry` at `0x103c20`

EntryRoute, DispatchRoute and PrimitiveRoute identities appeared once. The deliberate invalid opcode and RecoveryBody selection each occurred once. Body 1 completed `64,478` safe TRACE_READ calls after recovery.

## Claim boundary

Proves the fixed two-argument C Multiboot handoff into the inherited IgnitionBody, exact replacement of the handwritten C entry wrapper, exact ELF boundaries and preservation of the complete inherited route. It does not prove arbitrary boot protocols, UEFI/firmware entry, alternate calling conventions or every loader.
