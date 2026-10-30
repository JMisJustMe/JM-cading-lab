# JM THIRD COURT — CP29 Native Controller Contact

**30 October 2026.** Source-owned original JM birthday basketball, 3v3, unchanged mechanics/renderers. **Candidate / browser verification pending; physical owner-device HOLD.**

## Parent and provenance
- Latest working parent: genuine `family-gifts/third-court-preview/cp11-ball-contact-candidate.html`, **from the existing held-input-recovery branch** `fix/third-court-cp11-hidden-input-release-20261029` (draft PR #625).
- CP29 is a **stacked source branch**, with PR base #625's branch rather than an independent duplicate of CP11. The native renderer and original 3v3 actions remain intact: JM AFTERHOURS-derived raw WebGL2 matrices, distinct athlete geometry, Broadcast Canvas2D perspective and classic overhead fallback; off-ball reads, pick-and-roll, cut, real physical rim and rebound, fatigue, score, shot clock, crown, record import/export.
- CP29 adds source-native Gamepad API input; **no parallel basketball model** and **no control remapping of touchscreen gestures**.

## Gameplay changes to the original code
- Left analog stick moves the real controlled athlete via `setJoy` (deadzone and progressive stick magnitude), deferring to active touchscreen stick contact.
- Gamepad **A held/released** calls existing `pressShot()`/`releaseShot()` for shot timing; once-per-press, not autofire.
- **B** calls real `pass()` (defender selection on defence); **X** real `switchPlayer()` (dribble/drive/steal); **Y** real `callCut()`; **LB** real `callScreen()`; **RB held** real `setGuard(true/false)`; **Back** switches real camera; **Start** tips off or pauses/resumes using real game state.
- Press transitions are edge-triggered and background/blur/disconnection clears pending charge and guard **without awarding a phantom shot**.
- Controller instructions added to original THE PLAYBOOK. Keyboard and touch controls remain as established in CP11/PR #625.

## Verification gates
- New tests: `games-beyond/tests/jm-third-court-cp29.spec.mjs` (6 actual tests × 2 browser contexts = 12). Real roster, left-stick movement, earned shot, cut/screen calls, guard/shot interrupted without false action, pause/resume, original touch UI still accessible.
- New workflow: `.github/workflows/jm-third-court-cp29-gamepad.yml` using existing Games&Beyond Chromium harness.
- Unmerged PR. **No Ding No Claim** until workflow success. Full existing CP11 suite must also remain green. Phone-shaped Chromium is *not* Samsung Fold hardware proof; mock Gamepad API is *not* physical controller proof.

## Merge order and lineage
**First:** Review/admit draft PR #625 (CP11 input-recovery parent), **then:** CP29 controller feature after its own checks and owner acceptance. Do not retarget CP29 to main or publish a new canonical door until source lineage is reconciled. Never retire the original without proof and explicit authority.
