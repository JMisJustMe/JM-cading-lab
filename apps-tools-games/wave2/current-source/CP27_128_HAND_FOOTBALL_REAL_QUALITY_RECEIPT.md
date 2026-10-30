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
