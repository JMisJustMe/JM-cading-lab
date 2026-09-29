# JM RouteCore Native64 — BlockFS Phase-Aware Recovery Matrix Contact Receipt v0.19

**Date:** 2026-09-29  
**State:** DING EARNED · BLOCKFS v5 PHASE-AWARE RECOVERY MATRIX PASS  
**Parent:** JM RouteCore Native64 BlockFS Bounded Crash / Rollback Recovery Contact v0.18  
**Parent main:** `8d9441fdc4de05004d3c6ff4963bec6590ceba13`  
**Contact branch:** `routecore-blockfs-v0-19-phase-recovery-contact`  
**Successful contact head:** `32e8d0de110d2b686ada943aaf0576489a8830ca`  
**Successful Actions run:** `36507274226` (run #9)  
**Successful job:** `109211417686`

## Governing advance

The already-proved storage route remains unchanged:

`Ring-3 → VFS → BlockFS v5 → write-back cache → generic block device → proved legacy/transitional virtio-blk carrier → persistent data image`

v0.19 advances the recovery semantics above that boundary.

v0.18 proved one durable PREPARED rollback point. v0.19 asks a stronger question:

`durable phase → interrupted mutation → reboot policy must follow the recorded phase, while damaged recovery state must be rejected rather than guessed`

The bounded matrix contains three independent courts:

1. DATA_READY rollback;
2. COMMITTING forward completion;
3. torn/checksum-invalid journal rejection.

## Descendant custody

The v0.19 descendant is preserved in four Base64 carrier parts under:

`routecore/blockfs-v0-19/package/`

The exact carrier was regenerated against the **proved v0.18 Actions work body**, not a cousin reconstruction.

Normalized combined Base64 SHA-256:

`fe5c2498116fdcaebc3ae70a7327cfd3f3a56df81c800f17de289534577934da`

Decoded raw patch SHA-256:

`bbb4d46dc6cd9a331f57b66ce9161bd26dabd759beb48bbde749e5653634c2a7`

The successful workflow first recovered the exact v0.18 Actions artifact from run `36503335581`, verified its `265 / 265 PASS` proof and deterministic rebuild flag, then applied this exact-parent v0.19 descendant.

## Construction court

GitHub Actions returned:

- **265 / 265 PASS**
- deterministic same-host rebuild: **PASS**
- boot image SHA-256: `6b0dad9363a6983321888e3c8cde9f41d4691428e297015cd82de1764885f75d`
- kernel ELF SHA-256: `f66616e25933b9925e84aa4c3bb9f096fc3854ddc131f5218063bf978669934c`

Construction remained explicitly insufficient for a Ding until the QEMU matrix returned.

## Runtime court — clean baseline

Fresh v5 baseline:

- runtime verifier: **PASS**
- raw BlockFS v5 clean-old inspection: **PASS**
- baseline persistent carrier SHA-256:
  `2e8d24dfbfb7a6ea6c95a12912463a1e1df18a67fb131969487be50eb95b11d5`
- bitmap: `0x800000ff`
- authoritative `long.bin` body: old committed body

Boot 1 serial SHA-256:

`d9ef4cccb4ca7a438265d015808a413a927ecd3642d0ecac0ea304890b5222fe`

## Runtime court A — DATA_READY rollback

The rollback lane armed rollback intent, staged the shadow extent, persisted the phase-aware journal, and returned the rollback crash point.

Prepared/crashed carrier SHA-256:

`b87d6f2fbd900480ec173dd2c0a864d95fa7216dbcd1376f08da380ef7d9cd49`

Raw inspection returned:

- journal state: `3` / DATA_READY
- mode: `1` / rollback
- old extent: `5 + 3`
- shadow extent: `8 + 3`
- old body remained authoritative

Boot 2 rollback-crash log SHA-256:

`f28979f7475d645f63194145165b965c2f2f914d939b9cd7acf43b373bd73d00`

On reboot:

- rollback recovery verifier: **PASS**
- raw clean-old inspection: **PASS**
- recovered carrier SHA-256:
  `2e8d24dfbfb7a6ea6c95a12912463a1e1df18a67fb131969487be50eb95b11d5`

The recovered carrier is byte-identical to the clean baseline.

Boot 3 rollback-recovery log SHA-256:

`0272cf6e0336999124427f8088e1c35f531dc783554b2b49d1b592e85d794284`

A further clean-old boot also passed.

Boot 4 clean-old log SHA-256:

`0c9b3fe174a503e9de5d9b3c3f77695105c08752ad53150a35777bab029da7bd`

## Runtime court B — COMMITTING forward recovery

The commit lane armed commit intent, staged the same bounded shadow body, durably advanced the journal to COMMITTING, and returned the commit crash point.

COMMITTING/crashed carrier SHA-256:

`1e1fcff8c2ea4ed93612640ee76f12fad9550ab53788b0381534cf96772aba23`

Raw inspection returned:

- journal state: `4` / COMMITTING
- mode: `2` / forward commit
- old extent: `5 + 3`
- shadow extent: `8 + 3`

Boot 5 commit-crash log SHA-256:

`40df22d3eaa33d8aa89eb9f9a46556e5dd7e07b52bb85a372b3b2627ab60658c`

On reboot:

- forward-commit recovery verifier: **PASS**
- raw clean-shadow inspection: **PASS**
- committed-shadow carrier SHA-256:
  `8437b936c66499a919aa6eaaf77e84d38fddfd1fd34dffbc54bfeb65ede26bac`
- bitmap: `0x8000071f`
- `long.bin` body: shadow committed body

Boot 6 forward-recovery log SHA-256:

`06857f66bb17b58ce490cadffc8565711129c0df32c6b82d952d69f9a717ff68`

A further clean-shadow reboot passed without reverting or re-entering recovery.

Boot 7 clean-shadow log SHA-256:

`45f0682f3244edbf0902d2344224a7aab7633fd4892b3aa40a244ad9c61704fe`

This distinguishes rollback semantics from forward-completion semantics rather than treating every interrupted transaction as the same state.

## Runtime court C — torn journal rejection

A clean baseline carrier had its recovery record deliberately corrupted so the journal was nonzero but checksum-invalid.

Preboot torn carrier SHA-256:

`cb67e2be7180152f9e2fa84568d12f67e28acde09f137816ad7cbd085a496e86`

Raw torn-state inspection: **PASS**.

On boot:

- torn-journal rejection verifier: **PASS**
- mount rejected the invalid record;
- user-mode entry was forbidden / absent;
- the carrier was not repaired by guessing.

Post-rejection carrier SHA-256 remained:

`cb67e2be7180152f9e2fa84568d12f67e28acde09f137816ad7cbd085a496e86`

The preboot and post-rejection carrier are byte-identical.

Boot 8 torn-reject log SHA-256:

`b367243e7f2bb416030868c6e1bb13fc4bf1d1f58e502fb81c60c9b7d7284b8d`

## Actions custody

Successful artifact:

- name: `jm-routecore-blockfs-v0-19-phase-recovery-contact`
- artifact ID: `11007512618`
- size: `966588` bytes
- digest: `sha256:f1417e3c7ba49001fcd73b627b5499d9b01f37bdd317cc6170fe1ab2508fdcab`
- run: `36507274226`
- job: `109211417686`

The artifact contains the exact proved v0.18 parent, exact-parent v0.19 patch carrier, transformed source, construction proof, runtime serial logs, phase-specific carrier states, and raw inspections.

## Correction trace

Contact failures remain visible.

1. Initial v0.19 branch court recovered the proved v0.18 Actions body correctly, but the first v0.19 patch had been generated against a locally reconstructed cousin. Patch application failed before runtime. **No filesystem Ding was claimed.**
2. The descendant was regenerated against the exact proved v0.18 Actions work body. This changed custody only; the recovery matrix gates were not weakened.
3. Run `36507274226` then returned exact-parent patch application PASS, **265/265 construction PASS**, DATA_READY rollback PASS, COMMITTING forward-recovery PASS, clean post-commit reboot PASS, torn-journal rejection PASS, raw carrier inspections PASS, and artifact upload PASS.

## Earned conclusion

**PASS:** at the stated QEMU legacy/transitional virtio-blk scope, RouteCore BlockFS v5 can distinguish two durable interrupted-mutation phases and recover according to the recorded phase:

- DATA_READY / rollback intent returns the exact prior committed carrier;
- COMMITTING / commit intent forward-completes the shadow body and preserves it across a subsequent clean boot;
- checksum-invalid torn journal state is rejected without entering user mode or mutating the carrier by guesswork.

**DING EARNED at the declared phase-aware recovery-matrix scope.**

## Explicitly not claimed

This receipt does **not** claim:

- exhaustive crash points between every individual sector write;
- general ACID transactions;
- concurrent filesystem mutation;
- arbitrary journal length / transaction count;
- hardware power-loss atomicity;
- fragmented/non-contiguous allocation;
- production-grade filesystem completeness;
- NVMe contact;
- modern virtio PCI capability transport;
- physical-owner-device storage contact.

## Forward frontier

The next filesystem pressure is now narrower and stronger:

`phase-aware recovery → wider interruption-point matrix / metadata-write boundaries → idempotent repeated recovery → fragmented allocation / free-space pressure`

Separate transport frontiers remain:

`NVMe / modern virtio / physical owner-device contact`

These are advancement choices, not completion debt for v0.19.

## Keeper

> PREPARED IS NOT COMMITTED.  
> COMMITTING IS NOT PREPARED.  
> RECOVERY MUST FOLLOW THE DURABLE PHASE.  
> A DAMAGED RECORD MUST BE REJECTED RATHER THAN GUESSED.  
> ROLLBACK MUST RETURN THE OLD BODY; COMMIT RECOVERY MUST RETURN THE NEW BODY.  
> NO RETURNED MATRIX, NO DING.  
> THE MATRIX RETURNED.

**DING EARNED · v0.19 CONTACT CLOSED AT DECLARED RUNTIME SCOPE.**
