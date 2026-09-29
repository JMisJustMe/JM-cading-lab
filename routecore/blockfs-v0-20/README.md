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
- boot image SHA-256: `3e7bff02b6e5128d442f2f9aa4e43fa2cc7517a52708b76535ad651a04a3ade5`
- kernel ELF SHA-256: `15cd7cb420eb1ce7abd7703d102948593e13d39227d8e729b0bfbdd83e936cd6`
- raw v0.20 patch SHA-256: `b4df7eb528945cc430018b4258a7e1bfc34e6b685ee0e344e812a2a1308b4ec5`
- normalized Base64 carrier SHA-256: `d2bd78220aea96d66869250e26cc473f18dfde1cf15e18f79b48956fe2a0ddcf`

Construction is not runtime contact. The crown gate is the returned QEMU re-entry matrix.

## Crown gate

- rollback recovery can be interrupted, rebooted, and still restore the exact byte-identical old baseline;
- forward recovery interrupted after the metadata switch must re-enter through the already-switched **new shape** branch;
- forward recovery interrupted after old-extent zeroing must also re-enter safely through the new shape branch;
- both forward paths must converge to the same final committed carrier bytes;
- one further clean reboot must not mutate any recovered carrier.

**NO RETURNED RE-ENTRY MATRIX, NO DING.**
