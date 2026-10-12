# JM × REA — COMBOUND extended consequence replay (pre-private-REA stage)

**Authority:** protected COMBOUND v2.3 11-Oct FLAZ, SHA-256 `53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428`. Corrected separate candidate, SHA-256 `66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1`. Neither file changed or committed.

## Actual tested run — not merely a proposal

Headless Chromium executed the exact original and corrected game with the same seeded RNG, 430×932 simulated mobile viewport, deterministic virtual-clock `performance.now`, and disabled background `requestAnimationFrame`. The browser's automated pause state was explicitly cleared; the identical player pull/aim/release shot and `Runtime.step(1/120)` were then delivered to each body for 2,400 simulated steps.

**Four original-versus-candidate scenarios:** CLASSIC/BLOOM_RING, CLASSIC/TOXIC_GARDEN, ARCADE/BLOOM_RING, ARCADE/TOXIC_GARDEN. All **84/84** recorded state-and-effect checkpoints (21 each: frame 0 and frames 120…2400) were equal across original and corrected bodies.

The compared state projections contained player/enemy turn ownership, AI plan/timer, turn number, full move phase, shot details and contacts, the frame-by-frame combatant position/velocity/HP/alive/shield and speciality indicators, stats, crew cycles, memory and tension nodes, and the exact sequence of original runtime receipt types.

**Consequence milestones in every scenario:** player shot → moving/collisions → enemy AI preview → committed enemy movement/shot → return to player aim on turn 2. The visual-scope error `creature21 is not defined` remained limited to the **original** body; corrected candidate had zero JavaScript exceptions. Parent and candidate SHA-256 values were verified again after the run.

This extends v0.8's **14/14 independent shot-power/velocity predictions**. The longer replay is an **original-versus-corrected parity test**, not an independently generated long-horizon physics model, not a completed match, and not true physical phone/owner play.

## Reproducibility without laptop today

The isolated draft PR adds `jm_rea_combound_multiturn_parity_v0_9.py`, which accepts two *existing private* absolute file paths and a **NEW** absolute JSON receipt path, and does not keep or commit HTML:

```sh
python3 agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_combound_multiturn_parity_v0_9.py \
  --original /absolute/path/to/EXISTING_PROTECTED_v2_3.html \
  --candidate /absolute/path/to/EXISTING_CORRECTED_v2_3.html \
  --receipt /absolute/path/to/NEW_MULTITURN_RECEIPT.json
```

The CI file `test_jm_rea_combound_multiturn_parity_v0_9.py` uses **synthetic** state fixtures to reject altered HP, skipped AI preview, missing enemy shot, lost return-to-player, wrongly reported match completion, and incomplete checkpoints. Actual private-source browser parity was run separately in the local controlled environment; public CI cannot silently re-run private game bytes.

## Separate remaining gates

1. **Direct REA 6.1.0 analysis of the exact private COMBOUND JavaScript**: still HOLD until the supported Node and actual REA executable are available on an authorized private host. v0.9 private preflight has already verified 32/32 scripts and five original method anchors.
2. **Independent automatic executable reconstruction of long-horizon behaviour from REA semantics**: not yet earned; REA static graph projection and source-guided physics calculation are separate proofs.
3. **Complete matches** including win/lose, sustained status/projectile consequences, AI policies across rounds, rendering/animation, full compiler/Target Bridge recipients and phone/laptop device contact remain unproved.
4. **Promotion:** draft only, no `main` merge, no protected FLAZ rewrite, no redundant permanent private-game copy.

**Keeper:** direct executable proof advances the integration, but a scoped browser parity receipt cannot crown real-REA, full-match or owner-device capabilities.
