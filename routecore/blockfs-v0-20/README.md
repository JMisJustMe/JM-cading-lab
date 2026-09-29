# JM RouteCore Native64 — BlockFS Interrupted Recovery Re-entry Matrix Gate v0.20

Parent: **BlockFS v0.19 phase-aware recovery matrix runtime contact**, merged on main through PR #262.

## Purpose

Pressure the recovery algorithm itself rather than adding another storage carrier.

v0.20 deliberately interrupts already-started recovery at three durable boundaries:

1. rollback recovery after the staged shadow extent has been durably zeroed;
2. forward recovery after the node table + bitmap have durably switched to the new extent;
3. forward recovery after the old extent has also been durably zeroed, while COMMITTING is still present.

Each test injection is checksummed and one-shot: the injection code is durably cleared before the deliberate crash so the next boot must re-enter normal recovery rather than loop on the test hook.

## Construction status

Exact-parent local replay against the proved v0.19 Actions work body:

- **272 / 272 PASS**
- deterministic same-host rebuild: **PASS**
- boot image SHA-256: `71f688d9bbcf8fdd31bf8e91dc350ca182a5c37057a910beaa5987e125530ac4`
- kernel ELF SHA-256: `bf89592a76d276a5a1a4df67f1a617a5fa42eecf64efba3b1d34586b6a549607`
- raw v0.20 patch SHA-256: `b87cbc70bf02b8e2e6710b2e38bf34c01dfe6d94e87da8454d37b6a149632cb9`
- normalized Base64 carrier SHA-256: `2c93daca0917c0ff42513598adca2a9cdd2e0a511558b25eb2d1feb23b7873d6`

Construction is not runtime contact. The crown gate is the returned QEMU re-entry matrix.

## Crown gate

- rollback recovery can be interrupted, rebooted, and still restore the exact byte-identical old baseline;
- forward recovery interrupted after the metadata switch must re-enter through the already-switched **new shape** branch;
- forward recovery interrupted after old-extent zeroing must also re-enter safely through the new shape branch;
- both forward paths must converge to the same final committed carrier bytes;
- one further clean reboot must not mutate any recovered carrier.

**NO RETURNED RE-ENTRY MATRIX, NO DING.**
