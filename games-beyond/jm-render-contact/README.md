# JM RENDER CONTACT v0.1 — renderer integration boundary

**Owner:** JM / JMISJUSTME. **Status:** isolated engineering contact branch, not production promotion.

This module is a **new, optional interface for existing JM WebGL renderers**. It does not replace MEGALITH, Shatter Halo, GameCore, GameForge, COMBOUND or any sovereign game body.

## CP2 donor integrity
- Reported source body: `JM_ONE_ON_ONE_v0_6_0_EVOLUTION.html`
- Owner-supplied final SHA-256: `d393e381db46bae9b3c758b72c8c82e380857cd7ab1ccab70b25a17f86c0c385`
- Reported performance: 492 → 208 → 73 draw calls; original-to-CP2 CPU work 1.8 → 0.4 ms, no demonstrated FPS increase.
- **The CP2 ZIP binary is currently not accessible to the execution runtime.** This module is a separate contact layer, **NOT** copied CP2 shader/mesh source, and cannot earn CP2 source-inheritance proof until exact bytes and source hash are verified.

## Reusable operations actually implemented here
- Draw provider hook: existing renderer must supply real `draw(item)` and, optionally, `drawInstanced(items)` functions.
- WebGL2 and ANGLE/WebGL1 capability detection with direct fallback.
- Consecutive opaque-instance grouping by mesh/material/shader/state, never reordering translucent or order-sensitive draws.
- 3×3 inverse-transpose normal matrix for nonuniform scales and arbitrary nonsingular shears.
- Stable static-scene cache keyed by body-owned revision, disposal on replacement.
- Per-frame provider-submission counts and CPU timing probes.
- Explicit `beginFrame`, `submit`, `endFrame` contact boundary. Gameplay/input remains in the host game.

## Exact donor integration still held
1. Read CP2 original, compare hash and shaders; do not recreate/rewrite from prose.
2. Pass the correct original CP2 `draw` / `drawInstanced` mechanisms into this bridge **without changing their source authority**.
3. Test in ONE ON ONE and one other actual 3D recipient with real rendering; check visual equivalence and real GPU metrics.
4. Only then prepare separate game-specific improvements for COMBOUND / UNTETHERED / WRESTLEFORM / AFTERHOURS.
5. Owner Android/fold tactile and thermal Ding remains its own gate.

## Test
Run `node games-beyond/jm-render-contact/JM_RENDER_CONTACT_v0_1.test.mjs`.
Tests run on provider mocks and verify ordering, fallback, normal matrix and static cache; they do **not** establish pixel quality or physical GPU performance.
