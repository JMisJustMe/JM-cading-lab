# JM Games CP27 — 128 Hand Football: Source-Native Quality Contact

**Status:** Unmerged candidate; receiver proof must pass independent browser CI before advancement.  
**Protected original:** `128_HAND_FOOTBALL_v0_8_SQUAD_ROLES_MATCH_SHAPES.html`, 30,949 bytes, source SHA-256 `fe1c9fba29a8676352aeec3ab05dcf33082d6ec4be196e4666c1691c3d724991`.  
**Only new playable candidate:** `128_HAND_FOOTBALL_v0_8_1_REAL_INPUT_AND_IDENTITY_CP27.html`. No duplicate platform, storefront or public front door, and no modification of original authority.

## Verified source-owned architecture

The candidate is patched from the strongest directly readable public v0.8 football source, preserving original `hand`, `ally`, `keeper`, `def`, `ball`, `control`, `updateBall`, `goal`, `choose`, role/shape selections, local `jm128.v08` save and 3-goal match loop. This is not a ping-pong replacement, UI demo or second physics engine.

- **Keyboard:** Arrow keys or WASD move MAKO through original collision and possession; J/K/L/I (or 1/2/3/4) use the original PASS, SHOOT, TACKLE and DEFEND; R resets only through the existing reset route.
- **Gamepad:** left stick moves the original actor; A/B/X/Y fire the actual four football actions on button *edges*, never every frame. The original Gamepad API discovers and disconnects controllers. Physical PS5/Android controller contact remains unproven.
- **Touch:** original drag and individual PASS/SHOOT/TACKLE/DEFEND action buttons preserved; a second field pointer cannot steal the current drag; blur/visibility neutralise held input.
- **Field shape:** all four named football bodies are more individually embodied, with distinct authored silhouettes and movement-sensitive details: MAKO pivot/lead shoulders, AYA winged support, BRASS blocking goalkeeper, LATCH defensive plated form. Original goal, collision and movement identities remain. These are additive *rendering* parts; not proven photorealism or full 3D.
- **Device fit:** minimum 44px actual action contacts including landscape, keyboard button activation, accessible viewport zoom and visible focus, reduced-motion alternative.
- **Source QA:** `games-beyond/tests/jm-128hand-football-cp27.spec.mjs` checks original parent exact SHA, original engine boot, live player movement, action transitions, reset, pointer contact loss, mocked Gamepad API and phone portrait/landscape. Separate CP27 workflow avoids interference with CP24/#650, CP25/#651 and CP26/#652 QA.

## Boundaries

Browser tests simulate mobile and desktop configurations. No physical device, owner gameplay feel, GPU FPS soak or public deployment is claimed. cardBORED v0.5 was discovered as exact compressed original source-carriage and protected; not silently recreated, bypassed or modified. The next cardBORED candidate requires a verified extracted live source and its own code-level action proof.

**No Ding No Claim — CP27 preserves v0.8 frozen parent, all game identity and estate quality governance.**


## 31 October continuation — squad setup must hold the actual simulation

Original source head `c98b9596c29a11d44a12edd26774108c9b411022` retained the inherited setup/serve-pause defect: `update()` processed the goal serve countdown while the squad gate was open, and `resetBall()` released `paused` before TAKE THE PITCH. Regression commit `f5f86070004b8f7f16e562818d2a59728db1948f`, existing PR #654, real Chromium CI run `41213687993`, reproduced it on both mobile and desktop: 12 inherited tests PASS, two new setup tests FAIL (`paused` expected true, actual false). Failure traces/screenshots remain in artifact `13047691024`; no earlier failure is erased.

The correction adds a gate-specific early return to the existing `update(dt)` before input, actor/ball integration, score and serve handling. It preserves the ordinary goal/serve countdown after actual start. The regression holds the original ball and 0–0 score for 1.1 seconds during setup, selects FINISHER / TIGHT BOX, then requires TAKE THE PITCH to start live ball movement without page errors. No new physics implementation, save namespace, launcher, donor replacement or protected-v0.8 mutation. Exact parent SHA remains `fe1c9fba29a8676352aeec3ab05dcf33082d6ec4be196e4666c1691c3d724991`.

Corrected-head browser CI must pass before this correction is called verified. Branch remains draft/unmerged; owner physical phone/controller, gameplay feel, offline/independent-save-return and deployment gates remain separate. Cloud Browser could not reach workspace localhost (`ERR_CONNECTION_REFUSED`); the repository's existing mobile/desktop Chromium CI is the rendered proof route.


### Corrected-head contact and origin-local return continuation

Source correction commit `7906776248d9d2a570d9a0ace87675374ccfd99b`, original Chromium run `41213819584`, job `124574091587`: **14/14 PASS** (mobile + desktop); log read back. The earlier failing run is retained.

Added a separate original-browser lifecycle test: select SHIELD / BREAK LANE through actual setup controls, start (original `jm128.v08` save), reload, then open a fresh document in the same browser context/origin; require exact stored JSON equality, restored active role/shape, 0–0 new-match state and setup remaining paused until explicit start. This verifies the game's existing preference/stat payload return, not resumable mid-match state, cross-origin migration, external backup import, AI Studio execution or physical offline handling. No save code/schema or storage authority changed. New test-head Chromium result must be checked separately.
