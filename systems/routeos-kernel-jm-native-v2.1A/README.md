# RouteOS JM-Native DynamicBodyRegistryRoute v2.1A

Parent crown: `dde65a281dd3eddea36f165ff6549a6ea113e8c7` — frozen ObservatoryContinuityRoute v2.0A.

## Machine body

v2.1A replaces the fixed two-entry storage ceiling with a bounded four-slot registry while preserving the inherited two-body boot contract.

- Bodies 1 and 2 register during user-boundary installation.
- Body 2 retains the deliberate invalid-opcode containment route.
- Body 3 registers at timer tick 50 and enters the inherited trace/yield program.
- Body 4 registers at tick 100 with a generated retire-self program and exits through controlled syscall 3.
- A fifth registration at tick 150 is rejected because v2.1A does not recycle retired slots.
- Bodies 1 and 3 must continue after Body 2 quarantine and Body 4 retirement.

## New offices

- `jm_generated_bodyregistry_register`
- `jm_generated_bodyregistry_retire_current`
- `jm_generated_dynamicbodyregistry_tick`
- `jm_generated_dynamicbodyregistry_health`
- `jm_generated_dynamicbodyregistry_capability_emit`

## Package body

The live workflow emits a Zionfolder containing ELF, ISO, raw QEMU trace, decoded JSON, symbols, disassembly, integrated source, JM source, generated office, responsive registry observatory, lifecycle SVG, SPDX SBOM, checksum ledger, QEMU/GDB launchers and governance documents.

## Boundary

This is runtime descriptor/frame registration into pre-reserved pages. It is not dynamic virtual-memory allocation, executable-file loading, slot recycling, persistent process storage or an arbitrary process model.

## Transport carrier

The connected repository write route has bounded request bodies, so the readable source body is transported in one checksum-locked archive while the governing JM source, machine gate and crown description remain directly readable.

- base64 carrier SHA-256: `9790f6c1456744aa13e8cfc2be1232552430f0d9d2f25a8cbb205405c188a11f`
- decoded tar.gz SHA-256: `1776bbc467fc6b0a44b5f300d84b7b9228d2b19ad96a58fdda4f1049bd8069db`
- part 00 SHA-256: `6b15d998f9fe5e4108bcde7c7f7e522b931669f3d52d620915e5e7b66ef3adcf`
- part 01 SHA-256: `28fcf0a100a69947e7081f31d6459772728a5d70f7b6f97411b6ec22c2e212d0`
- part 02 SHA-256: `dfde2216a4efd956043e11401bb65afa7cb9a61e088986a4e476ae88c2500207`
- part 03 SHA-256: `1d863fbe536578daaa7f18ded69ebce4ef43a01c0d6453a54fb9ea74a38ae1e2`
