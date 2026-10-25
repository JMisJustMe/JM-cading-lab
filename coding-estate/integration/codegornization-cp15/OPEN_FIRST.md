# JM SLINGFALL CP15 — playable JourMaze route deck

**Draft PR #464** · New child of the proven CP11 live KO gameplay / CP12 converged JudgeMaker line. **Not a replacement** of original player experience. Main unchanged.

## Gameplay (new actual native controls)

The Godot match now displays **JM ROUTES · TOUCH TO ACT**, three 45px+ buttons in a compact Fold-aware deck. The existing KO LIVE auto button and KO TRACE remain independently available and unchanged.

- **BRACE · 8 energy:** touch to add **3 seconds to grounded blue ally shield** (capped); native ripple and returned before/after energy + shield state.
- **RALLY · 9 energy:** with a wounded grounded blue ally, touch to **heal 12 HP**; native ripple, enemy unaffected.
- **TRAP · 10 energy:** with a grounded nearby red rival, touch to **stun 1.25 sec and deal 4 HP of damage**; native ripple, blue allies unaffected.

Real player selection, not just a dashboard. No effects without a valid match, source-sealed route, enough energy, eligible targets or cooldown. Three route contacts maximum per match, four-second native cooldown, saved state/return, press feedback and visible HOLDs.

## Provenance/identity

- Frozen **original** `JM_JourMaze.html`, exact 28 Aug founding SHA-256 `56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db`, copied from verified CP14 lineage. Build-stage Node VM executes **real original** `jourmaze()` per card to choose between two authored paths based on explicitly illustrative `lowest_risk` policy, executes 5/5 founding self-tests and verifies different `avoid` outcome.
- Typed `jm.jourmaze-native-tactics.transport/1` packet seals original donor SHA, compiled KO11 policy SHA and selected routes. Godot checks exact source envelope, distinct identities and bounded effect semantics at runtime. It executes typed consequences in native Godot. **JourMaze JS does not run inside Android.**
- Inherited actual KO Kocodifying/Codifying/JMLogic build executors and native Godot auto AEGIS/TRIAGE/COUNTER unchanged.
- Existing original JudgeMaker evaluation from PR #463 and separate JangleMonitor/JourMaze CI route from PRs #460/#462 remain separate proofs; CP15 does **not** claim those JS bodies now run in-app.

## Proof boundaries

`.github/workflows/jm-cp15-player-tactics-native.yml` reruns original CP11 native tests + gameplay input/recovery, CP15 actual native button-effects, Fold portrait/landscape control fit, source integrity, and signed ARM64 Godot debug Android APK (16 KB ELF/ZIP, signature). Artifact includes APK, Godot runtime receipts, original JourMaze build trace. Android APK **construction** does not prove installation or physical Fold controls.

**HOLD until owner plays on actual Samsung Fold**, with attention to thumbs, visibility, camera, battle feel and avoiding UI overlaps. Keep draft; no merge or release without scope-specific proof.
