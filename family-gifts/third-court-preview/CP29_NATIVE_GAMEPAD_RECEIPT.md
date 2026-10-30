# THIRD COURT — CP29 Real Gamepad / Court Contact

**Identity:** original JM birthday 3v3 basketball **THIRD COURT**, original CP11 parent `cp11-ball-contact-candidate.html`, preserved unchanged.  
**Candidate:** `cp12-gamepad-contact-candidate.html`, derived directly from CP11 original source, not an invented game.  
**Status:** CANDIDATE. CI/browser contact must pass before promotion; physical device and owner gameplay hold.

## Source-owned capability
- Original CPU software depth renderer, authored JM AFTERHOURS-derived WebGL2 native basketball renderer, original overhead fallback retained byte-equivalent in receiving source sections, not replaced or bypassed.
- Controller left analogue stick / D-pad call original `setJoy()`, which drives original `updatePlayers()` and `pass()` direction.
- A calls `pass()`; B calls `switchPlayer()` to preserve native drive or defence; X holds/releases `setGuard()`; Y holds original `pressShot()` and physically releasing calls original `releaseShot()`; LB calls `callCut()`; RB calls `callScreen()`; Start launches, pauses or resumes the original game. Button edges prevent repeats.
- Cancelling the original physical shoot touch or losing pointer capture no longer treats interrupted shot as a legitimately released attempt. Losing focus/visibility or disconnecting the controller similarly neutralises held guard, shot and analogue movement without earning phantom points.
- The in-game controller panel reflects real possession, athlete role, Crown Run, guarded state and original shot-clock; optional gamepad haptics only follow existing rim contact and body-collision counters. Unsupported vibration produces no penalty or claim.
- Original keyboard, phone touch, 3v3 roles, on-court running, stamina, passing/interception, rim and rebound contact, progressive skill modes and local stats remain.
- This is **not** a claim of finished AAA-quality modelling. Canvas/WebGL visual acceptance remains owner-held.

## Proof and admission
- `family-gifts/third-court-preview/tests/cp29-native-gamepad-contact.spec.cjs`: 12 assertions on two actual Chromium viewport contexts: 390x844 and 1280x844. Real original athlete movement, timed shot (before/after shot count), guard hold/release, interrupted shot does not commit, disconnection, original keyboard continuity, original 6-actor game identity, zero page errors.
- `.github/workflows/jm-third-court-cp29.yml` executes these tests against actual source from repo-local HTTP server.
- Physical Samsung Fold landscape/portrait, physical controller, WebGL2 GPU performance, owner play/feel and public publishing are independent HOLD gates. Do not promote an unmerged branch to public current release.
- Independent QA workflow avoids collateral edits to concurrently active CP24/25/26/27/28 workflows.

**Integration ≠ Replacement. No Ding No Claim. Exact original CP11 remains frozen.**
