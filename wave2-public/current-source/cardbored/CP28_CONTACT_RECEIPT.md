# JM cardBORED CP28 — Original House / Board Contact

**Date:** 30 October 2026  
**Status:** Original source and browser contact PASS; **owner-device acceptance, independent public deployment and merge HOLD**.  
**Candidate authority:** Draft PR #657, branch `feat/jm-cardbored-native-quality-cp28-20261030`.  
**Original authority:** v0.5 House Decks / Pressure Boards, reconstructed **exactly** from the original three LZMA source segments (no source overwrite), **53,434 bytes**, SHA-256 `963ccc11699a72d6a6f06d2d84688265cdcd661fcfd8c5892a005405195091cb`.

## Actual native recipient improvement

The source-owned build script `cp28_inspect_and_build.py` verifies original bytes before invoking `cp28_native_patch.py` to generate one portable HTML file. It preserves original cardBORED v0.5 `state`, `render`, `legalTargets`, `selectCard`, `selectTarget`, `commit`, `driveShift`, `nextTurn`, `applyCard`, `combat`, CPU, House/Pressure-Board variants, and local progression.

- Keyboard **1–9** selects affordable source-native cards. **Left/Right** changes legal hand choice; **Up/Down** selects legal board target; **Enter/Space** confirms through the original resolver. **D** Drive shifts when earned; **K** keeps/backs out; **H** opens original House selection; **T** opens Trace.
- Standard Gamepad API: D-pad/stick chooses cards/targets, A confirms, B cancels/keeps, X Drive, Y House; shoulder buttons cycle, Select opens Trace. Buttons trigger only on pressed edge; disconnect and background contact are respected.
- Original on-board visual grammar is enriched through the actual `pressure('player')`, `state.drive`, selected/legally targetable slots and existing `state.phase`; no new game logic or hidden-state spoofing.
- 44px House controls, visible selection focus, accessible browser zoom and preserved reduced-motion behaviour.
- Opening-deck resilience: if the original randomized first hand has no affordable card with a legal target on an empty board, **swap** an affordable GOER from the selected existing House deck into the hand, returning the displaced card to the draw pile. Card count, existing units and original legality stay authoritative. This addresses a genuine first-turn gameplay softlock rather than merely changing tests.

## Proof receipt

**GitHub Actions run 41073506213:** source check and original game boot SUCCESS; **10/10 Playwright gameplay tests PASS** in mobile- and desktop-sized Chromium contexts (5 tests each). Source gate: **PASS**. Candidate: **60,819 bytes**, SHA-256 `498c9ad34806a0714f1f43bd503fd85d8de48238c5cab3fe9e3a877e9e71f571`.  Single temporary [playable candidate artifact](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/41073506213/artifacts/12985557606), 14-day retention, downloadable ZIP contains HTML. Original and candidate hashes belong to distinct authority scopes.

**HOLD:** Physical Samsung Fold/touch, actual controller hardware, owner laptop feel, sustained performance, aesthetic owner review, deploy/publish/merge. Browser-sized mobile proof is not physical device proof. No public release or permanent second game authority is claimed.

**No Ding No Claim. Integration ≠ Replacement. The exact original and independent candidate are recoverable without leaving unbounded redundant descendants.**
