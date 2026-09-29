# JM RouteCore Native64 — BlockFS Phase-Aware Recovery Matrix Gate v0.19

Parent: **BlockFS v0.18 bounded crash / rollback recovery**, merged on main as `8d9441fdc4de05004d3c6ff4963bec6590ceba13`.

## Purpose

Advance recovery semantics above the already-proved filesystem and storage-carrier boundary without reopening v0.18.

v0.19 evolves the bounded recovery journal into a checksummed phase-aware record. It distinguishes rollback intent from durable COMMITTING intent, exposes separate crash points, supports either exact rollback to the old committed body or forward completion to the staged shadow body, and rejects a deliberately damaged journal rather than guessing.

## Construction and runtime status

Local recovered-descendant replay:

- **265 / 265 PASS**
- deterministic same-host rebuild: **PASS**
- raw v0.19 patch SHA-256: `bbb4d46dc6cd9a331f57b66ce9161bd26dabd759beb48bbde749e5653634c2a7`
- normalized Base64 carrier SHA-256: `fe5c2498116fdcaebc3ae70a7327cfd3f3a56df81c800f17de289534577934da`

Construction is not runtime contact. The QEMU matrix returned on Actions run `36507274226`: rollback, forward commit, and torn-journal rejection all PASS. The formal contact receipt carries the earned scope.

## Crown gate

One clean baseline is forked into three courts:

1. **Rollback:** arm rollback intent → stage shadow data → persist DATA_READY → crash → reboot → old body returns → exact baseline carrier hash restored.
2. **Forward commit:** arm commit intent → stage shadow data → persist COMMITTING → crash → reboot → forward-complete shadow body → second clean reboot preserves committed carrier bytes.
3. **Torn journal:** corrupt the journal checksum → boot → mount rejects the record → no user-mode entry → raw carrier remains byte-identical to the preboot torn image.

**NO RETURNED MATRIX, NO DING.**
