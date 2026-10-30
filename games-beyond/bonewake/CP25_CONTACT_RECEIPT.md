# JM HUMANIMALS: BONEWAKE ARENA — CP25 REAL CONTROL CONTACT

**Parent:** v1.12 ORIGINAL JM Bonewake files under `games-beyond/bonewake/`.  
**Status:** Candidate, original renderer and gameplay intact. Browser CI and physical owner-device evidence must be recorded separately.  
**Canonical door preserved:** `games-beyond/bonewake/index.html → 00_OPEN_FIRST.html`. Do not promote a duplicate site or front door.

## Actual change, not external furniture
- Adds laptop keyboard input to the real `holdLever()` → `releaseLever()` → `finishReel()` game state, preserving weighted 15-piece Bone Reel probability.
- Enter calls original `beginAim()`, arrows or W/S/A/D adjust a visible `state.aim` trajectory and Enter/Space calls original `releaseAim()`. No parallel launch system is created.
- During live play, left/right arrows or A/D call the original `setReflex()` for charged Reflex Arms; Q/E call original `fireInstinct()` for Deep Call/Breathgate.
- Interrupted gestures do not grant phantom Wakeflicks, flipper flicks or Bone Reel events; blur and visibility loss neutralise held contact without changing completed game-state consequences.
- Existing source-only Canvas renderer and game-specific Museum Bone Room visuals are untouched. Focus indicators and phone tap floors are a presentation enhancement, not a substitute renderer.
- Existing portrait, landscape, touch, pointer, pool, leader, fossils, bodypaths, sediments, side organs, persistence and PWA stay present.
- Explicit keyboard help exists in the original OPEN_FIRST document; original project files remain individually editable and hosted in the same folder.

## Test
`games-beyond/tests/bonewake-contact.spec.mjs` exercises the ORIGINAL multi-file game from `./bonewake/`: launch, no overflow, key/real-source Reel/Wakeflick/Reflex transitions, interrupted keys and touch/mouse lever. Runs under mobile and desktop Chromium through the **existing** Games&Beyond QA workflow. Test results are authoritative only after actual CI completion.

**HOLD:** Physical Fold portrait/landscape touch feel, RTX-class hardware FPS/contact and automatic visual quality judgment. Owner acceptance required before promotion or canonical release.

## Governance
This PR is a separate CP25 candidate independent of unmerged CP24 PR #650 (which changes other game bodies and the same existing QA workflow). Reconcile workflow modifications during merge; preserve both test lanes. Do not overwrite either frozen source ancestor or merge automatically. No permanent throwaway build carriers.
