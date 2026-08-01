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

- base64 carrier SHA-256: `2a5e2dcbe0361873e0500cbfa16df636ed7d6695cd1b053ac0ec5429d8ed81b3`
- decoded tar.gz SHA-256: `cbb703375e33a0e65d430884e537d28246106e1ad02685dc0d65ae4af2d166ff`
- part 00 SHA-256: `7cfcf11fa1329d2a2893f5ecf52ecb008f792370b193fbf4ac0d49b25c3f0f86`
- part 01 SHA-256: `0efaabae47a7527d8a5c2956e5e8309c5bd68d15967500cc6396aad506c7af65`
- part 02 SHA-256: `bc4e079366de8968abd65a3bfd9ae591c962fd2688f8047fb1fb277a928ed224`
