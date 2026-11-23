# JM × REA v0.9 — exact protected COMBOUND real-REA handoff

**Purpose:** Complete the next privacy-safe prerequisite for direct REA analysis of the protected COMBOUND v2.3 source, without copying the game into this public repository.

**Precise observed status (12 October 2026):** SOURCE PREFLIGHT PASS; **REAL PRIVATE REA ANALYSIS HOLD**. Do not upgrade a syntax run or successful public-source REA workflow into proof that REA inspected the protected game.

## Executed against the exact FLAZ source

- Protected original COMBOUND v2.3 SHA-256 `53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428` verified byte-for-byte.
- Python HTMLParser extracted **32 inline JavaScript modules** to a temporary local directory. All **32/32** passed actual Node `--check` syntax validation.
- Zero external `src` scripts were discovered; no missing script source was silently skipped.
- One unambiguous original `Runtime` source module located: `combound_inline_000.js`.
- Five direct real-game method anchors found: `beginDrag`, `moveDrag`, `releaseDrag`, `commitShot`, `registerCrewUse`.
- Temporary JS source automatically removed; protected FLAZ unchanged. Preflight JSON contains digests/counts/identities only, not private code.

## Why direct REA did not run in this environment

- Real REA CLI not installed (`rea` unavailable).
- Present Node runtime is **v22.16.0**, below the REA support floor `^22.19.0 || ^24.11.0 || >=26.0.0`.
- npm registry DNS resolution fails; installation cannot be completed inside the current container.
- Attempting `--run-rea` correctly FAILS before writing a false REA receipt.

## Current operational command (private host)

Run the following on a computer already equipped with Node **24.11+** and Python 3, with actual `rea-agents@6.1.0` installed. Use your existing exact protected FLAZ file in place; do not upload it to GitHub:

```sh
npm install -g rea-agents@6.1.0
python3 agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_private_combound_preflight_v0_9.py \
  --protected /absolute/path/to/existing/COMBOUND_v2_3_BIG_FORM_MOTION_LANGUAGE_FULL_PASS_FLAZ.html \
  --run-rea --output /absolute/path/to/NEW_PRIVATE_REA_JM_CONTACT.json
```

The v0.9 entry validates the exact source, all 32 scripts, the gameplay anchor module and Node compatibility, then delegates to the inherited v0.8 runner. That runner executes actual `rea analyze-javascript-application`, actual `rea evidence-import`, and the existing **JM32/TraceBox** semantic projector. It writes **one compact, write-once result**, deletes temporary extracted JS/raw REA graph and rechecks the original source SHA-256. It HOLDS when the named original methods are not recognized in REA's graph.

## Existing tests and integrity

- `test_jm_rea_private_combound_preflight_v0_9.py`: synthetic private-source gate tests for valid extraction, duplicate runtime identity, wrong original digest, missing methods, omitted external JS and invalid JS syntax.
- Original v0.1–v0.8 public-source REA/JM integration CI stays inherited; no main merge or private game source upload.
- `jm_rea_combound_source_ir_v0_8.mjs` and the original Chromium replay still provide separate **TypeScript-AST**, **14/14** game-shot evidence; they are **not** direct REA evidence.

## Pre-laptop evidence contract confirmed (12 October 2026)

Real **REA 6.1.0** ran in GitHub Actions on an **entirely synthetic, public-safe** JavaScript module shaped like the protected COMBOUND `const Runtime = { ... }` game object. REA identified all five desired method labels as distinct semantic function nodes in module `combound_inline_000.js`. This rules out a basic REA method-discovery/identity mismatch **without exposing private game source**. The tested REA subject digest equals the semantic graph root artifact digest, and the semantic method's `identity.artifact_sha256` equals the actual SHA-256 of the staged JS file.

The inherited **private-only** REA runner now enforces all those identity links before accepting results: protected HTML SHA → extracted temporary module SHA → genuine REA function-node artifact SHA, with subject-to-graph digest equality and exact unique method roots. Wrong, ambiguous, omitted or substituted method evidence becomes HOLD. Eight synthetic **negative/positive** provenance tests run in CI; no fake fixture is represented as actual private-code REA contact.

The real REA graph did **not** produce method-to-method call edges from this synthetic shape; the independent protected COMBOUND source/physics analysis remains a separate, honestly labelled TypeScript-AST/Chromium proof. Automatic REA-derived behaviour is not earned yet.

## Outstanding gate

**HOLD:** Run the actual REA 6.1.0 binary on this exact staged private COMBOUND source and validate its Evidence. Next, inspect the candidate/resolved edges and compare its generated JM representation against the already measured gameplay relationships. Full automatic executable game reconstruction, full JM32-1DA v2.2.1 compiler and JM Target Bridge recipient, physical owner-device continuity and release promotion remain separate gates.

**Law:** PRESERVE FLAZ; recover rather than rebuild; no Ding without direct REA/source/recipient execution proof.
