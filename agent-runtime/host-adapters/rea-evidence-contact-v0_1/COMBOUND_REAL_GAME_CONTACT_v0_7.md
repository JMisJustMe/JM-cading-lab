# JM × REA v0.7 — COMBOUND real-game contact, visual-scope correction and controlled gameplay parity

**Experimental evidence recipient:** existing JM × REA draft PR #356, branch \`experiment/rea-evidence-contact-20261010\`. No merge, no modification to protected Library source, and no persistent GitHub copy of game HTML.

## Authoritative body recovered BEFORE modifying anything

- Preserved Library: \`/JM Estate/Games & Playable Systems/COMBOUND/FLAZ/Full Lineage Through v2.3 2026-10-11/\`.
- Protected exact HTML: \`COMBOUND_v2_3_BIG_FORM_MOTION_LANGUAGE_FULL_PASS_FLAZ.html\`; SHA-256 \`53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428\`; 685,040 bytes.
- FLAZ receipt records full v2.3 as the latest **preserved source head**, while *fresh owner game contact only on v1.5*. It does not crown v2.3 for physical-device gameplay.
- Protected v0.9 Classic / Arcade safety ancestor exists separately; it was not changed or relabelled as a new game. The v2.3 source includes v0.9 Classic/Arcade and later roster/visual descendants.

## Actual owner-source recovery defect

Running the exact protected v2.3 HTML in headless Chromium reproduced a startup \`ReferenceError: creature21 is not defined\`. Its v2.1 \`creature21\` renderer lives in a separate immediately-invoked function scope; the later v2.3 script attempts \`const creature23=creature21\` from outside that scope. **The base match still launches, but the intended v2.3 motion patch aborts before registration.**

This is a source-level scope error, not a claim that all of COMBOUND is broken.

## Narrow, reversible **descendant-only** repair

Guarded substitution, exactly once:

\`\`\`diff
-const creature23=creature21;
-creature21=function(u){
+const creature23=drawUnit;
+drawUnit=function(u){
   motionUnder23(u);
   motionTransform23(u,()=>creature23(u));
 };
\`\`\`

The outer \`drawUnit\` route exists in the inherited game and calls the locally scoped v2.1 renderer. The v2.3 visual wrapper now hooks that accessible route. **Only this small binding changes**; physics/combat/rules/control sections remain byte-identical. Candidate in-memory SHA-256: \`66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1\`; 685,036 bytes. Protected source SHA rechecked after execution.

## Actual headless Chromium comparison: PASS, scope precisely bounded

The source-locked \`jm_rea_combound_browser_probe_v0_7.py\` loads the exact protected HTML supplied at runtime. For each of **CLASSIC and ARCADE**, it launches two browser contexts: protected original and in-memory corrected descendant, with deterministic test RNG and phone-sized 430×932 viewport.

For **both modes**:
- Original raises exactly the relevant \`creature21\` scope exception; corrected descendant has **zero** page script exceptions.
- Original gameplay boots; corrected game also boots with v2.3 motion metadata active, \`physicsChanged=false\`, \`controlsChanged=false\`.
- **24/24** combat bodies render without exception, using original \`drawUnit\` and original fighter models.
- Initial game roster, selected crew, combat rules and complete captured match state are identical.
- Runtime pull/aim/release produced exactly the same contact: shot power **0.429**, vector \`{x:0.862,y:-0.507}\`, velocities **[606.6175715047993, -356.8338655910584]**, one SHOT_COMMIT receipt.
- Simulated touchscreen canvas **pointerdown → pointermove → pointerup** followed the real input handlers and produced the same shot power **0.459**, vector \`{x:0.853,y:-0.521}\`, one shot receipt. **This is browser PointerEvent contact, not physical owner-phone contact.**
- No changes to protected source, no duplicate asset import, no storage-backed transformed game in GitHub or Library.

Read-only browser receipt: \`COMBOUND_REAL_GAME_CONTACT_v0_7_RECEIPT.json\`.

## Existing JM coding bodies really participate

The new \`jm_rea_combound_real_game_v0_7.mjs\` validates the exact source/candidate identities, the protected seam correction and the local browser receipt. It invokes **original JM Sovereign Ten JM32** policy and **original JM TraceBoxRuntime** append/query/replay on both mode contact records. It explicitly denies owner-device and REA-authenticity promotion.

The JavaScript tests \`test_jm_rea_combound_real_game_v0_7.mjs\` reject wrong source identity, duplicate seams, incorrect visual counts, lost pointer input proof, fabricated owner status, and unobserved error. Original v0.1–v0.6 workflows and previous author bodies remain intact.

## Re-entry

From this repo checkout with a copy of **your already-protected** v2.3 source accessible (not added to GitHub), Python Playwright installed and Chromium available:

\`\`\`sh
python3 agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_combound_browser_probe_v0_7.py \
 --body /absolute/existing/protected/COMBOUND_v2_3_BIG_FORM_MOTION_LANGUAGE_FULL_PASS_FLAZ.html \
 --receipt /absolute/NEW_COMBOUND_CONTACT_RECEIPT.json
\`\`\`

Only a new JSON receipt is created. The candidate HTML is transformed in memory; the script does **not** archive, upload, replace or delete the original. A single separately delivered HTML test carrier can be used for owner-device feedback, then retired post-use when the verified surviving source and off-site recovery remain intact.

## Explicit gates still HOLD

1. **Exact REA analysis of private v2.3 HTML** is not performed by the upstream CI (which only sees public JM source); the real-game browser evidence is local source contact, **not REA's own decompiler/autonomous reconstruction**.
2. Full playable-match / AI-turn, combo chains, KO/win-loss, statuscraft/projectile consequences, story, audio, visual quality and frame-rate parity are not covered by this short controlled shot.
3. Actual physical phone / foldable / laptop owner-device gameplay, cross-device input continuity and screen/visual judgement are untested.
4. Full original JM32-1DA v2.2.1 compiler, GameCore recipient and JM Target Bridge have not been hooked into this **particular protected COMBOUND** runtime. JM32/TraceBox evidence processing is proven, not an engine replacement.
5. Final release promotion, native APK embodiment, version selection beyond the protected v2.3 snapshot, independent custody and merge to main are **HOLD**.

**Keeper:** one protected authority, one isolated candidate, one source-locked read-only comparator, scoped actual runtime contact, no duplicate permanent game body, no Ding beyond proof.
