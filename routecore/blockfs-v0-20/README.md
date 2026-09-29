# JM RouteCore Native64 — BlockFS Recovery Boundary / Idempotence Matrix Gate v0.20

Parent: **BlockFS v0.19 phase-aware recovery matrix contact**, proved on Actions run `36507274226`.

## Purpose

v0.20 widens the crash/recovery court without reopening the already-proved carrier boundary or v0.19 semantics.

The matrix adds four stronger contacts around the existing checksummed BlockFS v5 journal:

1. durable **PREPARE** → crash before shadow-data write → reboot must roll back to the exact old carrier;
2. retain the **DATA_READY** rollback regression;
3. durable **COMMITTING** → begin recovery → make metadata switch durable → crash recovery itself → reboot must recognize the already-switched new shape and idempotently finish;
4. separately, durable COMMITTING → make metadata switch durable → zero the old extent durably → crash before journal clear → reboot must idempotently finish and preserve the same committed shadow body.

Torn/checksum-invalid journal rejection remains in the matrix as a regression guard.

Each artificial recovery interruption is one-shot: its test selector is durably disarmed before the crash. The next boot therefore exercises resumability rather than simply replaying the harness trigger.

## Construction status

Recovered exact-parent local construction:

- **270 / 270 PASS**
- deterministic same-host rebuild: **PASS**
- decoded v0.20 patch SHA-256: `dd51e74945f1885449794a5e3bdad633bfdd98942f9674db991541e541161811`
- normalized Base64 carrier SHA-256: `062e9d7de6a55235a321a07a4a2d6f91e3e6da677ff6a2e4ca1d11c385b03333`

Construction is not runtime contact. The QEMU matrix must return before a v0.20 Ding is earned.

## Crown gate

**NO RETURNED BOUNDARY MATRIX, NO DING.**
